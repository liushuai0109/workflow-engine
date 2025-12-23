package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/bpmn-explorer/server/internal/interceptor"
	"github.com/bpmn-explorer/server/internal/models"
	"github.com/bpmn-explorer/server/internal/parser"
	"github.com/bpmn-explorer/server/pkg/database"
	"github.com/expr-lang/expr"
	"github.com/rs/zerolog"
)

// WorkflowEngineService handles workflow execution engine logic
type WorkflowEngineService struct {
	db           *database.Database
	logger       *zerolog.Logger
	workflowSvc  *WorkflowService
	instanceSvc  *WorkflowInstanceService
	executionSvc *WorkflowExecutionService
	httpClient   *http.Client
	mockCaller   *MockServiceCaller
}

// --- Parameter Structs for Interceptor (New Architecture) ---

// UpdateInstanceParams holds parameters for UpdateInstance interceptor calls
type UpdateInstanceParams struct {
	InstanceID string   `json:"instanceId" intercept:"id"`
	Status     string   `json:"status"`
	NextNodes  []string `json:"nextNodes"` // Updated from Variables
}

// ExecuteServiceTaskParams holds parameters for ServiceTask execution
type ExecuteServiceTaskParams struct {
	NodeID         string                 `json:"nodeId" intercept:"id"`
	BusinessApiUrl string                 `json:"businessApiUrl"`
	BusinessParams map[string]interface{} `json:"businessParams"`
	Variables      map[string]interface{} `json:"variables"`
}

// ExecuteNodeParams holds parameters for ExecuteNode interceptor calls
type ExecuteNodeParams struct {
	Node           *models.Node           `json:"node" intercept:"id"`
	BusinessParams map[string]interface{} `json:"businessParams"`
	Variables      map[string]interface{} `json:"variables"`
}

// CreateExecutionParams holds parameters for CreateExecution interceptor calls
type CreateExecutionParams struct {
	InstanceID string                 `json:"instanceId" intercept:"id"`
	WorkflowID string                 `json:"workflowId"`
	Variables  map[string]interface{} `json:"variables"`
}

// UpdateExecutionParams holds parameters for UpdateExecution interceptor calls
type UpdateExecutionParams struct {
	ExecutionID  string                 `json:"executionId" intercept:"id"`
	Status       string                 `json:"status"`
	Variables    map[string]interface{} `json:"variables"`
	ErrorMessage string                 `json:"errorMessage"`
}

// NewWorkflowEngineService creates a new WorkflowEngineService
func NewWorkflowEngineService(
	db *database.Database,
	logger *zerolog.Logger,
	workflowSvc *WorkflowService,
	instanceSvc *WorkflowInstanceService,
	executionSvc *WorkflowExecutionService,
) *WorkflowEngineService {
	return &WorkflowEngineService{
		db:           db,
		logger:       logger,
		workflowSvc:  workflowSvc,
		instanceSvc:  instanceSvc,
		executionSvc: executionSvc,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		mockCaller: NewMockServiceCaller(logger),
	}
}

// ExecuteResult represents the result of workflow execution
type ExecuteResult struct {
	BusinessResponse *BusinessResponse      `json:"businessResponse,omitempty"`
	EngineResponse   *EngineResponse        `json:"engineResponse"`
	InterceptorCalls []InterceptorCall      `json:"interceptorCalls,omitempty"`
	RequestParams    map[string]interface{} `json:"requestParams,omitempty"`
}

// InterceptorCall represents a single interceptor call record
type InterceptorCall struct {
	Name      string                 `json:"name"`
	Order     int                    `json:"order"`
	Timestamp string                 `json:"timestamp"`
	Input     map[string]interface{} `json:"input"`
	Output    map[string]interface{} `json:"output"`
}

// BusinessResponse represents the response from business API
type BusinessResponse struct {
	StatusCode int               `json:"statusCode"`
	Body       interface{}       `json:"body"`
	Headers    map[string]string `json:"headers,omitempty"`
}

// EngineResponse represents the response from workflow engine
type EngineResponse struct {
	InstanceId     string                 `json:"instanceId"`
	CurrentNodeIds []string               `json:"currentNodeIds"`
	NextNodeIds    []string               `json:"nextNodeIds,omitempty"`
	Status         string                 `json:"status"`
	ExecutionId    string                 `json:"executionId"`
	Variables      map[string]interface{} `json:"variables"`
}

// ExecuteFromNode executes workflow from a specific node
// workflow and instance data must be provided by the caller (from request body or database)
// This method focuses solely on execution logic without data fetching
func (s *WorkflowEngineService) ExecuteFromNode(
	ctx context.Context,
	workflow *models.Workflow,
	instance *models.WorkflowInstance,
	fromNodeId string,
	businessParams map[string]interface{},
) (*ExecuteResult, error) {
	// Create interceptor call recorder and add to context
	recorder := NewInterceptorCallRecorder()
	ctx = WithInterceptorRecorder(ctx, recorder)

	// Add call recorder callback to context for interceptor package
	recorderFunc := interceptor.CallRecorderFunc(func(name string, input, output map[string]interface{}) {
		recorder.Record(name, input, output)
	})
	ctx = context.WithValue(ctx, interceptor.CallRecorderKey, recorderFunc)

	// Store request params for later inclusion in response
	requestParams := map[string]interface{}{
		"workflowId":     workflow.Id,
		"instanceId":     instance.Id,
		"fromNodeId":     fromNodeId,
		"businessParams": businessParams,
	}

	// 3. 解析 BPMN XML
	wd, err := parser.ParseBPMN(workflow.BpmnXml)
	if err != nil {
		s.logger.Error().Err(err).Str("workflowId", workflow.Id).Msg("Failed to parse BPMN XML")
		return nil, fmt.Errorf("failed to parse BPMN XML: %w", err)
	}

	// 3.5 处理空 fromNodeId：使用 current_node_ids
	if fromNodeId == "" {
		if len(instance.CurrentNodeIds) == 0 {
			return nil, fmt.Errorf("%s: No current nodes in workflow instance", models.ErrInvalidRequest)
		}
		// 使用第一个当前节点作为起始节点
		fromNodeId = instance.CurrentNodeIds[0]
		s.logger.Info().
			Str("instanceId", instance.Id).
			Str("fromNodeId", fromNodeId).
			Msg("Empty fromNodeId provided, using first current node")
	}

	// 3.6 补全 current_node_ids（如果为空且 fromNodeId 已提供）
	if len(instance.CurrentNodeIds) == 0 {
		if len(wd.StartEvents) == 0 {
			return nil, fmt.Errorf("workflow has no start events")
		}

		s.logger.Info().
			Str("instanceId", instance.Id).
			Strs("startEvents", wd.StartEvents).
			Msg("Initializing current_node_ids with start events")

		// 更新实例的 current_node_ids (使用拦截器)
		instance, err = interceptor.Intercept(ctx,
			"UpdateInstance",
			s.updateInstance,
			UpdateInstanceParams{
				InstanceID: instance.Id,
				Status:     instance.Status,
				NextNodes:  wd.StartEvents,
			},
		)
		if err != nil {
			return nil, fmt.Errorf("failed to initialize current_node_ids: %w", err)
		}
	}

	// 4. 验证 fromNodeId 是否存在
	node, exists := wd.Nodes[fromNodeId]
	if !exists {
		return nil, fmt.Errorf("%s: node %s not found in workflow definition", models.ErrInvalidNodeId, fromNodeId)
	}

	// 4.5 检查是否需要回滚
	rollbackAction, err := s.CheckAndHandleRollback(wd, &node, instance.CurrentNodeIds)
	if err != nil {
		s.logger.Error().Err(err).
			Str("fromNodeId", fromNodeId).
			Strs("currentNodeIds", instance.CurrentNodeIds).
			Msg("Rollback check failed")
		return nil, fmt.Errorf("rollback check failed: %w", err)
	}
	if rollbackAction.NeedsRollback {
		s.logger.Info().
			Str("fromNodeId", fromNodeId).
			Strs("currentNodeIds", instance.CurrentNodeIds).
			Strs("targetNodeIds", rollbackAction.TargetNodeIds).
			Msg("Rollback needed, updating current node IDs")
		// 更新实例的当前节点 ID 为回滚目标节点
		instance.CurrentNodeIds = rollbackAction.TargetNodeIds
	}

	// 5. 获取或创建执行记录 (使用拦截器)
	variables := make(map[string]interface{})
	if businessParams != nil {
		variables = businessParams
	}
	execution, err := interceptor.Intercept(ctx,
		"CreateExecution",
		s.createExecution,
		CreateExecutionParams{
			InstanceID: instance.Id,
			WorkflowID: workflow.Id,
			Variables:  variables,
		},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create execution: %w", err)
	}
	// Immediately update to Running status (使用拦截器)
	execution, err = interceptor.Intercept(ctx,
		"UpdateExecution",
		s.updateExecution,
		UpdateExecutionParams{
			ExecutionID:  execution.Id,
			Status:       models.ExecutionStatusRunning,
			Variables:    nil, // Don't override variables yet
			ErrorMessage: "",
		},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to update execution to running status: %w", err)
	}
	s.logger.Info().Str("executionId", execution.Id).Msg("Created execution record with Running status")

	// 6. 执行节点并持续推进，直到遇到需要等待的节点
	var businessResponse *BusinessResponse
	var nextNodeIds []string
	currentNode := &node
	currentNodeId := fromNodeId

	// 循环执行节点，直到遇到不能自动推进的节点
	for {
		s.logger.Info().
			Str("nodeId", currentNodeId).
			Uint32("nodeType", currentNode.Type).
			Msg("Executing node")

		// 6.1 执行当前节点（使用拦截器）
		nodeResult, err := interceptor.Intercept(ctx,
			"ExecuteNode",
			s.ExecuteNode,
			ExecuteNodeParams{
				Node:           currentNode,
				BusinessParams: businessParams,
				Variables:      execution.Variables,
			},
		)
		if err != nil {
			s.logger.Error().Err(err).Str("nodeId", currentNodeId).Msg("Failed to execute node")
			// Update execution status to failed
			s.updateExecutionStatus(ctx, execution, models.ExecutionStatusFailed, err.Error())
			return nil, fmt.Errorf("failed to execute node: %w", err)
		}

		// Extract businessResponse from nodeResult
		if nodeResult != nil && nodeResult.BusinessResponse != nil {
			businessResponse = nodeResult.BusinessResponse
		}

		// 6.2 检查是否应该自动推进到下一个节点
		if !s.shouldAutoAdvance(currentNode.Type) {
			// 对于 UserTask、IntermediateCatchEvent、EventBasedGateway，保持当前节点
			nextNodeIds = []string{currentNodeId}
			s.logger.Info().
				Str("nodeId", currentNodeId).
				Uint32("nodeType", currentNode.Type).
				Msg("Node type does not auto-advance, staying at current node")
			break
		}

		// 6.3 推进到下一个节点
		nextNodeIds, err = s.advanceToNextNode(ctx, wd, currentNode, execution.Variables)
		if err != nil {
			s.logger.Error().Err(err).Str("nodeId", currentNodeId).Msg("Failed to advance to next node")
			s.updateExecutionStatus(ctx, execution, models.ExecutionStatusFailed, err.Error())
			return nil, fmt.Errorf("failed to advance to next node: %w", err)
		}

		// 6.4 检查是否有下一个节点
		if len(nextNodeIds) == 0 {
			s.logger.Info().Str("nodeId", currentNodeId).Msg("No next node, workflow may be completed")
			break
		}

		// 6.5 检查下一个节点是否是 EndEvent
		nextNodeFromMap, exists := wd.Nodes[nextNodeIds[0]]
		if !exists {
			s.logger.Error().Str("nextNodeId", nextNodeIds[0]).Msg("Next node not found in workflow definition")
			return nil, fmt.Errorf("next node %s not found in workflow definition", nextNodeIds[0])
		}

		if nextNodeFromMap.Type == parser.NodeTypeEndEvent {
			s.logger.Info().
				Str("currentNodeId", currentNodeId).
				Str("nextNodeId", nextNodeIds[0]).
				Msg("Next node is EndEvent, stopping execution loop")
			break
		}

		// 6.6 继续执行下一个节点
		s.logger.Info().
			Str("fromNodeId", currentNodeId).
			Str("toNodeId", nextNodeIds[0]).
			Msg("Auto-advancing to next node")

		currentNode = &nextNodeFromMap
		currentNodeId = nextNodeIds[0]
		// 清空 businessParams，后续节点不需要外部参数
		businessParams = nil
	}

	// 7. 检查是否到达 EndEvent 并更新执行状态
	instanceStatus := instance.Status
	executionStatus := models.ExecutionStatusRunning

	// Check if current node is EndEvent (when executing from EndEvent directly)
	if currentNode.Type == parser.NodeTypeEndEvent {
		instanceStatus = models.InstanceStatusCompleted
		executionStatus = models.ExecutionStatusCompleted
		nextNodeIds = []string{} // 清空当前节点
	} else if len(nextNodeIds) > 0 {
		// Check if next node is EndEvent (when advancing to EndEvent)
		nextNode := wd.Nodes[nextNodeIds[0]]
		if nextNode.Type == parser.NodeTypeEndEvent {
			instanceStatus = models.InstanceStatusCompleted
			executionStatus = models.ExecutionStatusCompleted
			nextNodeIds = []string{} // 清空当前节点
		}
	}

	// 8. 更新执行状态为 Completed/Failed (使用拦截器)
	_, err = interceptor.Intercept(ctx,
		"UpdateExecution",
		s.updateExecution,
		UpdateExecutionParams{
			ExecutionID:  execution.Id,
			Status:       executionStatus,
			Variables:    execution.Variables,
			ErrorMessage: "",
		},
	)
	if err != nil {
		s.logger.Error().Err(err).
			Str("executionId", execution.Id).
			Str("status", executionStatus).
			Msg("Failed to update execution status")
		// Don't return error, continue to update instance
	} else {
		s.logger.Info().
			Str("executionId", execution.Id).
			Str("status", executionStatus).
			Msg("Updated execution status")
	}

	// 9. 更新实例状态 (使用拦截器)
	updatedInstance, err := interceptor.Intercept(ctx,
		"UpdateInstance",
		s.updateInstance,
		UpdateInstanceParams{
			InstanceID: instance.Id,
			Status:     instanceStatus,
			NextNodes:  nextNodeIds,
		},
	)

	if err != nil {
		s.logger.Error().Err(err).Str("instanceId", instance.Id).Msg("Failed to update instance")
		return nil, fmt.Errorf("failed to update instance: %w", err)
	}

	// 10. 构建响应
	result := &ExecuteResult{
		BusinessResponse: businessResponse,
		EngineResponse: &EngineResponse{
			InstanceId:     updatedInstance.Id,
			CurrentNodeIds: updatedInstance.CurrentNodeIds,
			NextNodeIds:    nextNodeIds,
			Status:         updatedInstance.Status,
			ExecutionId:    execution.Id,
			Variables:      execution.Variables,
		},
		InterceptorCalls: recorder.GetCalls(),
		RequestParams:    requestParams,
	}

	return result, nil
}

// executeServiceTask executes a ServiceTask node by calling business API
func (s *WorkflowEngineService) executeServiceTask(
	ctx context.Context,
	node *models.Node,
	businessParams map[string]interface{},
	variables map[string]interface{},
) (*BusinessResponse, error) {
	// Use new interceptor architecture with struct parameters
	return interceptor.Intercept(ctx,
		"ServiceTask",
		s.executeServiceTaskWithParams,
		ExecuteServiceTaskParams{
			NodeID:         node.Id,
			BusinessApiUrl: node.BusinessApiUrl,
			BusinessParams: businessParams,
			Variables:      variables,
		},
	)
}

// ExecuteNode executes a workflow node based on its type
// This method encapsulates all node execution logic and can be intercepted for testing and debugging
// It focuses purely on node execution without managing workflow execution state
// Returns ExecuteResult to maintain consistency with ExecuteFromNode
func (s *WorkflowEngineService) ExecuteNode(
	ctx context.Context,
	params ExecuteNodeParams,
) (*ExecuteResult, error) {
	nodeId := params.Node.Id

	// Execute node based on type
	switch params.Node.Type {
	case parser.NodeTypeServiceTask:
		businessResponse, err := s.executeServiceTask(ctx, params.Node, params.BusinessParams, params.Variables)
		if err != nil {
			s.logger.Error().Err(err).Str("nodeId", nodeId).Msg("Failed to execute ServiceTask")
			return nil, fmt.Errorf("failed to execute ServiceTask: %w", err)
		}
		return &ExecuteResult{
			BusinessResponse: businessResponse,
		}, nil

	case parser.NodeTypeUserTask:
		// UserTask returns pending status, no actual operation
		s.logger.Info().Str("nodeId", nodeId).Msg("UserTask encountered, returning pending status")
		return &ExecuteResult{}, nil

	case parser.NodeTypeIntermediateCatchEvent:
		// IntermediateCatchEvent waits for external event, no actual operation
		s.logger.Info().Str("nodeId", nodeId).Msg("IntermediateCatchEvent encountered, waiting for external event")
		return &ExecuteResult{}, nil

	case parser.NodeTypeEventBasedGateway:
		// EventBasedGateway waits for event branch, no actual operation
		s.logger.Info().Str("nodeId", nodeId).Msg("EventBasedGateway encountered, waiting for event branch")
		return &ExecuteResult{}, nil

	case parser.NodeTypeExclusiveGateway:
		// Gateway logic is handled in advance logic
		s.logger.Info().Str("nodeId", nodeId).Msg("ExclusiveGateway encountered, evaluating conditions")
		return &ExecuteResult{}, nil

	case parser.NodeTypeEndEvent:
		// EndEvent marks workflow completion
		s.logger.Info().Str("nodeId", nodeId).Msg("EndEvent encountered, workflow completed")
		return &ExecuteResult{}, nil

	default:
		s.logger.Info().Str("nodeId", nodeId).Uint32("nodeType", params.Node.Type).Msg("Node type not requiring special execution")
		return &ExecuteResult{}, nil
	}
}

// advanceToNextNode advances workflow to the next node based on sequence flows and conditions
func (s *WorkflowEngineService) advanceToNextNode(
	ctx context.Context,
	wd *models.WorkflowDefinition,
	currentNode *models.Node,
	variables map[string]interface{},
) ([]string, error) {
	if len(currentNode.OutgoingSequenceFlowIds) == 0 {
		// 没有出边，可能是 EndEvent
		return []string{}, nil
	}

	var nextNodeIds []string

	switch currentNode.Type {
	case parser.NodeTypeExclusiveGateway:
		// 对于排他网关，需要评估条件表达式
		for _, flowId := range currentNode.OutgoingSequenceFlowIds {
			flow, exists := wd.SequenceFlows[flowId]
			if !exists {
				continue
			}

			// 如果没有条件表达式，作为默认流
			if flow.ConditionExpression == "" {
				nextNodeIds = append(nextNodeIds, flow.TargetNodeId)
				break
			}

			// 评估条件表达式
			matched, err := s.evaluateCondition(flow.ConditionExpression, variables)
			if err != nil {
				return nil, fmt.Errorf("failed to evaluate condition: %w", err)
			}

			if matched {
				nextNodeIds = append(nextNodeIds, flow.TargetNodeId)
				break
			}
		}

		if len(nextNodeIds) == 0 {
			return nil, fmt.Errorf("no matching sequence flow found for ExclusiveGateway %s", currentNode.Id)
		}

	default:
		// 对于其他节点类型，直接选择第一个出边
		if len(currentNode.OutgoingSequenceFlowIds) > 0 {
			flowId := currentNode.OutgoingSequenceFlowIds[0]
			flow, exists := wd.SequenceFlows[flowId]
			if exists {
				nextNodeIds = append(nextNodeIds, flow.TargetNodeId)
			}
		}
	}

	return nextNodeIds, nil
}

// evaluateCondition evaluates a condition expression using workflow variables
func (s *WorkflowEngineService) evaluateCondition(
	conditionExpr string,
	variables map[string]interface{},
) (bool, error) {
	if conditionExpr == "" {
		return true, nil
	}

	// 使用 expr 库评估表达式
	program, err := expr.Compile(conditionExpr, expr.Env(variables))
	if err != nil {
		return false, fmt.Errorf("failed to compile condition expression: %w", err)
	}

	result, err := expr.Run(program, variables)
	if err != nil {
		return false, fmt.Errorf("failed to evaluate condition expression: %w", err)
	}

	// 转换为布尔值
	if boolResult, ok := result.(bool); ok {
		return boolResult, nil
	}

	return false, fmt.Errorf("condition expression did not return a boolean value")
}

// updateExecutionStatus updates execution status and error message in database (使用拦截器)
func (s *WorkflowEngineService) updateExecutionStatus(
	ctx context.Context,
	execution *models.WorkflowExecution,
	status string,
	errorMessage string,
) {
	_, err := interceptor.Intercept(ctx,
		"UpdateExecution",
		s.updateExecution,
		UpdateExecutionParams{
			ExecutionID:  execution.Id,
			Status:       status,
			Variables:    nil,
			ErrorMessage: errorMessage,
		},
	)
	if err != nil {
		s.logger.Error().Err(err).Str("executionId", execution.Id).Msg("Failed to update execution status")
	}
}

// shouldAutoAdvance checks if the node type should automatically advance to the next node
// UserTask, IntermediateCatchEvent, EventBasedGateway should NOT auto-advance
// They need to wait for external events or user actions
func (s *WorkflowEngineService) shouldAutoAdvance(nodeType uint32) bool {
	switch nodeType {
	case parser.NodeTypeUserTask,
		parser.NodeTypeIntermediateCatchEvent,
		parser.NodeTypeEventBasedGateway:
		return false
	default:
		return true
	}
}

// RollbackAction represents the action to take after rollback check
type RollbackAction struct {
	NeedsRollback bool     // 是否需要回滚
	TargetNodeIds []string // 回滚目标节点 ID 列表
}

// CheckAndHandleRollback checks if rollback is needed based on from_node type and current state
// Returns RollbackAction indicating whether rollback is needed and to which nodes
func (s *WorkflowEngineService) CheckAndHandleRollback(
	wd *models.WorkflowDefinition,
	fromNode *models.Node,
	currentNodeIds []string,
) (*RollbackAction, error) {
	switch fromNode.Type {
	case parser.NodeTypeBoundaryEvent:
		return s.handleBoundaryEventRollback(wd, fromNode, currentNodeIds)
	case parser.NodeTypeIntermediateCatchEvent:
		return s.handleIntermediateCatchEventRollback(wd, fromNode, currentNodeIds)
	default:
		return s.handleOtherNodeRollback(wd, fromNode, currentNodeIds)
	}
}

// handleBoundaryEventRollback handles rollback logic for BoundaryEvent nodes
// 边界事件规则：
// 1. attached_node_id 不能为空
// 2. 如果 attached_node_id 在 current_node_ids 中，不需要回滚（正常触发边界事件）
// 3. 否则需要回滚（无论是前进还是后退都需要回滚）
func (s *WorkflowEngineService) handleBoundaryEventRollback(
	wd *models.WorkflowDefinition,
	fromNode *models.Node,
	currentNodeIds []string,
) (*RollbackAction, error) {
	// 检查 attached_node_id 是否为空
	if fromNode.AttachedNodeId == "" {
		return nil, fmt.Errorf("%s: boundary event %s has no attached node",
			models.ErrBoundaryEventNoAttachment, fromNode.Id)
	}

	// 检查 attached_node_id 是否在 current_node_ids 中
	for _, nodeId := range currentNodeIds {
		if nodeId == fromNode.AttachedNodeId {
			// attached_node 是当前节点，不需要回滚
			return &RollbackAction{NeedsRollback: false}, nil
		}
	}

	// 需要回滚：检查 can_fallback
	if !fromNode.CanFallback {
		return nil, fmt.Errorf("%s: node %s does not allow fallback",
			models.ErrFallbackNotAllowed, fromNode.Id)
	}

	// 边界事件回滚到 attached_node
	return &RollbackAction{
		NeedsRollback: true,
		TargetNodeIds: []string{fromNode.AttachedNodeId},
	}, nil
}

// handleIntermediateCatchEventRollback handles rollback logic for IntermediateCatchEvent nodes
// 中间捕获事件规则：
// 1. 如果 from_node_id 在 current_node_ids 中，不需要回滚
// 2. 检查前置节点是否为 EVENT_BASED_GATEWAY 且在 current_node_ids 中，如果是则不回滚
// 3. 否则需要回滚
// 4. 检查是否跳步骤（from_node 在 current_nodes 之后）
func (s *WorkflowEngineService) handleIntermediateCatchEventRollback(
	wd *models.WorkflowDefinition,
	fromNode *models.Node,
	currentNodeIds []string,
) (*RollbackAction, error) {
	// 检查 from_node_id 是否在 current_node_ids 中
	for _, nodeId := range currentNodeIds {
		if nodeId == fromNode.Id {
			// from_node 是当前节点，不需要回滚
			return &RollbackAction{NeedsRollback: false}, nil
		}
	}

	// 检查前置节点是否为 EVENT_BASED_GATEWAY 且在 current_node_ids 中
	predecessors := wd.ReverseAdjacencyList[fromNode.Id]
	for _, predId := range predecessors {
		predNode, exists := wd.Nodes[predId]
		if !exists {
			continue
		}
		if predNode.Type == parser.NodeTypeEventBasedGateway {
			// 前置节点是 EVENT_BASED_GATEWAY，检查是否在 current_node_ids 中
			for _, nodeId := range currentNodeIds {
				if nodeId == predId {
					// EVENT_BASED_GATEWAY 是当前节点，不需要回滚
					return &RollbackAction{NeedsRollback: false}, nil
				}
			}
		}
	}

	// 检查是否跳步骤：from_node 是否在 current_nodes 之后
	if s.isNodeAfterCurrentNodes(wd, fromNode.Id, currentNodeIds) {
		return nil, fmt.Errorf("%s: cannot skip from current nodes to node %s",
			models.ErrSkippedStep, fromNode.Id)
	}

	// 需要回滚：检查 can_fallback
	if !fromNode.CanFallback {
		return nil, fmt.Errorf("%s: node %s does not allow fallback",
			models.ErrFallbackNotAllowed, fromNode.Id)
	}

	// 回滚到 from_node
	return &RollbackAction{
		NeedsRollback: true,
		TargetNodeIds: []string{fromNode.Id},
	}, nil
}

// handleOtherNodeRollback handles rollback logic for other node types
// 普通节点规则：
// 1. 如果 from_node_id 在 current_node_ids 中，不需要回滚
// 2. 否则需要回滚
// 3. 检查是否跳步骤（from_node 在 current_nodes 之后）
func (s *WorkflowEngineService) handleOtherNodeRollback(
	wd *models.WorkflowDefinition,
	fromNode *models.Node,
	currentNodeIds []string,
) (*RollbackAction, error) {
	// 检查 from_node_id 是否在 current_node_ids 中
	for _, nodeId := range currentNodeIds {
		if nodeId == fromNode.Id {
			// from_node 是当前节点，不需要回滚
			return &RollbackAction{NeedsRollback: false}, nil
		}
	}

	// 检查是否跳步骤：from_node 是否在 current_nodes 之后
	if s.isNodeAfterCurrentNodes(wd, fromNode.Id, currentNodeIds) {
		return nil, fmt.Errorf("%s: cannot skip from current nodes to node %s",
			models.ErrSkippedStep, fromNode.Id)
	}

	// 需要回滚：检查 can_fallback
	if !fromNode.CanFallback {
		return nil, fmt.Errorf("%s: node %s does not allow fallback",
			models.ErrFallbackNotAllowed, fromNode.Id)
	}

	// 回滚到 from_node
	return &RollbackAction{
		NeedsRollback: true,
		TargetNodeIds: []string{fromNode.Id},
	}, nil
}

// isNodeAfterCurrentNodes checks if the target node is after all current nodes in the workflow
// 使用 BFS 从 current_nodes 向前遍历，如果能到达 target_node，说明 target_node 在 current_nodes 之后
func (s *WorkflowEngineService) isNodeAfterCurrentNodes(
	wd *models.WorkflowDefinition,
	targetNodeId string,
	currentNodeIds []string,
) bool {
	// 从 current_nodes 使用 BFS 向前遍历
	visited := make(map[string]bool)
	queue := make([]string, 0)

	// 初始化队列
	for _, nodeId := range currentNodeIds {
		queue = append(queue, nodeId)
		visited[nodeId] = true
	}

	// BFS 遍历
	for len(queue) > 0 {
		currentId := queue[0]
		queue = queue[1:]

		// 获取后继节点
		successors := wd.AdjacencyList[currentId]
		for _, succId := range successors {
			if succId == targetNodeId {
				// 找到目标节点，说明它在 current_nodes 之后
				return true
			}
			if !visited[succId] {
				visited[succId] = true
				queue = append(queue, succId)
			}
		}
	}

	return false
}

// --- Helper Methods for New Interceptor Architecture ---

// updateInstance updates a workflow instance in database
// This method uses struct parameters for the new interceptor architecture
func (s *WorkflowEngineService) updateInstance(ctx context.Context, params UpdateInstanceParams) (*models.WorkflowInstance, error) {
	return s.instanceSvc.UpdateWorkflowInstance(
		ctx,
		params.InstanceID,
		params.Status,
		params.NextNodes,
	)
}

// createExecution creates a workflow execution in database
// This method uses struct parameters for the new interceptor architecture
func (s *WorkflowEngineService) createExecution(ctx context.Context, params CreateExecutionParams) (*models.WorkflowExecution, error) {
	return s.executionSvc.CreateWorkflowExecution(ctx, params.InstanceID, params.WorkflowID, params.Variables)
}

// updateExecution updates a workflow execution in database
// This method uses struct parameters for the new interceptor architecture
func (s *WorkflowEngineService) updateExecution(ctx context.Context, params UpdateExecutionParams) (*models.WorkflowExecution, error) {
	return s.executionSvc.UpdateWorkflowExecution(
		ctx,
		params.ExecutionID,
		params.Status,
		params.Variables,
		params.ErrorMessage,
	)
}

// executeServiceTaskWithParams executes a ServiceTask with struct parameters
// This method uses struct parameters for the new interceptor architecture
func (s *WorkflowEngineService) executeServiceTaskWithParams(ctx context.Context, params ExecuteServiceTaskParams) (*BusinessResponse, error) {
	// Check if in old Mock mode for backward compatibility
	if IsMockMode(ctx) {
		s.logger.Info().
			Str("nodeId", params.NodeID).
			Msg("Executing ServiceTask in legacy Mock mode")

		mockData, err := s.mockCaller.Call(ctx, params.NodeID)
		if err != nil {
			return nil, fmt.Errorf("failed to get mock data for node %s: %w", params.NodeID, err)
		}

		return &BusinessResponse{
			StatusCode: mockData.StatusCode,
			Body:       mockData.Body,
			Headers:    mockData.Headers,
		}, nil
	}

	// Real service call
	if params.BusinessApiUrl == "" {
		return nil, fmt.Errorf("business API URL not configured for ServiceTask %s", params.NodeID)
	}

	// Prepare request body
	var requestBody []byte
	var err error
	if params.BusinessParams != nil {
		requestBody, err = json.Marshal(params.BusinessParams)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal business params: %w", err)
		}
	} else {
		requestBody = []byte("{}")
	}

	// Create HTTP request
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, params.BusinessApiUrl, bytes.NewReader(requestBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create HTTP request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	// Send request
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to call business API: %w", err)
	}
	defer resp.Body.Close()

	// Read response body
	var responseBody interface{}
	if err := json.NewDecoder(resp.Body).Decode(&responseBody); err != nil {
		// If not valid JSON, read as string
		bodyBytes, _ := io.ReadAll(resp.Body)
		responseBody = string(bodyBytes)
	}

	// Extract headers
	headers := make(map[string]string)
	for k, v := range resp.Header {
		if len(v) > 0 {
			headers[k] = v[0]
		}
	}

	return &BusinessResponse{
		StatusCode: resp.StatusCode,
		Body:       responseBody,
		Headers:    headers,
	}, nil
}
