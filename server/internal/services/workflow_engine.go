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
	db              *database.Database
	logger          *zerolog.Logger
	workflowSvc     *WorkflowService
	instanceSvc     *WorkflowInstanceService
	executionSvc    *WorkflowExecutionService
	httpClient      *http.Client
	mockCaller      *MockServiceCaller
	mockInstanceSvc *MockInstanceService
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
		db:              db,
		logger:          logger,
		workflowSvc:     workflowSvc,
		instanceSvc:     instanceSvc,
		executionSvc:    executionSvc,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		mockCaller:      NewMockServiceCaller(logger),
		mockInstanceSvc: NewMockInstanceService(db, logger, workflowSvc),
	}
}

// NewWorkflowEngineServiceWithMockInstance creates a new WorkflowEngineService with shared MockInstanceService
func NewWorkflowEngineServiceWithMockInstance(
	db *database.Database,
	logger *zerolog.Logger,
	workflowSvc *WorkflowService,
	instanceSvc *WorkflowInstanceService,
	executionSvc *WorkflowExecutionService,
	mockInstanceSvc *MockInstanceService,
) *WorkflowEngineService {
	return &WorkflowEngineService{
		db:              db,
		logger:          logger,
		workflowSvc:     workflowSvc,
		instanceSvc:     instanceSvc,
		executionSvc:    executionSvc,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		mockCaller:      NewMockServiceCaller(logger),
		mockInstanceSvc: mockInstanceSvc,
	}
}

// ExecuteResult represents the result of workflow execution
type ExecuteResult struct {
	BusinessResponse *BusinessResponse `json:"businessResponse,omitempty"`
	EngineResponse   *EngineResponse   `json:"engineResponse"`
	InterceptorCalls []InterceptorCall `json:"interceptorCalls,omitempty"`
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
	InstanceId    string                 `json:"instanceId"`
	CurrentNodeIds []string              `json:"currentNodeIds"`
	NextNodeIds   []string               `json:"nextNodeIds,omitempty"`
	Status        string                 `json:"status"`
	ExecutionId   string                 `json:"executionId"`
	Variables     map[string]interface{} `json:"variables"`
}

// ExecuteFromNode executes workflow from a specific node
func (s *WorkflowEngineService) ExecuteFromNode(
	ctx context.Context,
	instanceId string,
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
		"instanceId":     instanceId,
		"fromNodeId":     fromNodeId,
		"businessParams": businessParams,
	}

	// 1. 获取工作流实例 (使用拦截器支持 Mock 实例和真实实例)
	instance, err := interceptor.Intercept(ctx,
		fmt.Sprintf("GetInstance:%s", instanceId),
		func(ctx context.Context) (*models.WorkflowInstance, error) {
			// 检查是否为 Mock 实例
			session := interceptor.GetInterceptSession(ctx)
			if session != nil && session.InstanceID == instanceId {
				// Mock 实例：从 Mock 数据获取
				if s.mockInstanceSvc.MockInstanceExists(instanceId) {
					mockInstance, err := s.mockInstanceSvc.GetMockInstance(ctx, instanceId)
					if err != nil {
						return nil, err
					}
					// 转换为标准实例格式
					return convertMockInstanceToWorkflowInstance(mockInstance), nil
				}
			}

			// 真实实例：从数据库获取
			return s.instanceSvc.GetWorkflowInstanceByID(ctx, instanceId)
		},
	)

	if err != nil {
		return nil, fmt.Errorf("%s: %w", models.ErrWorkflowInstanceNotFound, err)
	}

	// Load Mock data from old mock config if available (backward compatibility)
	if isMockInstance(instanceId) {
		if mockConfig, ok := GetMockConfig(ctx); ok && mockConfig.NodeMockData != nil {
			s.mockCaller.SetMockData(mockConfig.NodeMockData)
			s.logger.Info().
				Int("nodeDataCount", len(mockConfig.NodeMockData)).
				Msg("Loaded Mock data configuration from context (legacy)")
		}
	}

	// 2. 获取工作流定义 (使用拦截器)
	workflow, err := interceptor.Intercept(ctx,
		fmt.Sprintf("GetWorkflow:%s", instance.WorkflowId),
		func(ctx context.Context) (*models.Workflow, error) {
			return s.workflowSvc.GetWorkflowByID(ctx, instance.WorkflowId)
		},
	)

	if err != nil {
		return nil, fmt.Errorf("%s: %w", models.ErrWorkflowNotFound, err)
	}

	// 3. 解析 BPMN XML
	wd, err := parser.ParseBPMN(workflow.BpmnXml)
	if err != nil {
		s.logger.Error().Err(err).Str("workflowId", workflow.Id).Msg("Failed to parse BPMN XML")
		return nil, fmt.Errorf("failed to parse BPMN XML: %w", err)
	}

	// 3.5 补全 current_node_ids（如果为空）
	if len(instance.CurrentNodeIds) == 0 {
		if len(wd.StartEvents) == 0 {
			return nil, fmt.Errorf("workflow has no start events")
		}

		s.logger.Info().
			Str("instanceId", instanceId).
			Strs("startEvents", wd.StartEvents).
			Msg("Initializing current_node_ids with start events")

		// 更新实例的 current_node_ids
		if isMockInstance(instanceId) {
			// 更新 Mock 实例
			mockInstance, err := s.mockInstanceSvc.UpdateMockInstance(
				ctx,
				instanceId,
				instance.Status,
				wd.StartEvents,
				nil, // 不更新 variables
			)
			if err != nil {
				return nil, fmt.Errorf("failed to initialize mock instance current_node_ids: %w", err)
			}
			instance = convertMockInstanceToWorkflowInstance(mockInstance)
		} else {
			// 更新真实实例
			instance, err = s.instanceSvc.UpdateWorkflowInstance(
				ctx,
				instanceId,
				instance.Status,
				wd.StartEvents,
			)
			if err != nil {
				return nil, fmt.Errorf("failed to initialize current_node_ids: %w", err)
			}
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

	// 5. 获取或创建执行记录
	var execution *models.WorkflowExecution
	if isMockInstance(instanceId) {
		// For Mock instances, create in-memory execution record (skip database)
		variables := make(map[string]interface{})
		if businessParams != nil {
			variables = businessParams
		}
		execution = &models.WorkflowExecution{
			Id:               fmt.Sprintf("mock-exec-%d", time.Now().UnixNano()),
			InstanceId:       instanceId,
			WorkflowId:       workflow.Id,
			Status:           models.ExecutionStatusRunning,
			Variables:        variables,
			ExecutionVersion: 1,
			StartedAt:        time.Now(),
		}
		s.logger.Debug().Str("executionId", execution.Id).Msg("Created in-memory execution for Mock instance")
	} else {
		// For real instances, create new execution record with Running status
		variables := make(map[string]interface{})
		if businessParams != nil {
			variables = businessParams
		}
		execution, err = s.executionSvc.CreateWorkflowExecution(ctx, instanceId, workflow.Id, variables)
		if err != nil {
			return nil, fmt.Errorf("failed to create execution: %w", err)
		}
		// Immediately update to Running status
		execution, err = s.executionSvc.UpdateWorkflowExecution(
			ctx,
			execution.Id,
			models.ExecutionStatusRunning,
			nil, // Don't override variables yet
			"",
		)
		if err != nil {
			return nil, fmt.Errorf("failed to update execution to running status: %w", err)
		}
		s.logger.Info().Str("executionId", execution.Id).Msg("Created execution record with Running status")
	}

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

		// 6.1 执行当前节点
		switch currentNode.Type {
		case parser.NodeTypeServiceTask:
			businessResponse, err = s.executeServiceTask(ctx, currentNode, businessParams, execution.Variables)
			if err != nil {
				s.logger.Error().Err(err).Str("nodeId", currentNodeId).Msg("Failed to execute ServiceTask")
				// 更新执行状态为失败
				s.updateExecutionStatus(ctx, execution, models.ExecutionStatusFailed, err.Error())
				return nil, fmt.Errorf("failed to execute ServiceTask: %w", err)
			}
			// 将业务接口响应存储到 variables
			if businessResponse != nil {
				if execution.Variables == nil {
					execution.Variables = make(map[string]interface{})
				}
				execution.Variables["businessResponse"] = businessResponse
			}
		case parser.NodeTypeUserTask:
			// UserTask 返回待处理状态，不执行实际操作
			s.logger.Info().Str("nodeId", currentNodeId).Msg("UserTask encountered, returning pending status")
		case parser.NodeTypeIntermediateCatchEvent:
			// IntermediateCatchEvent 等待外部事件，不执行实际操作
			s.logger.Info().Str("nodeId", currentNodeId).Msg("IntermediateCatchEvent encountered, waiting for external event")
		case parser.NodeTypeEventBasedGateway:
			// EventBasedGateway 等待事件分支，不执行实际操作
			s.logger.Info().Str("nodeId", currentNodeId).Msg("EventBasedGateway encountered, waiting for event branch")
		case parser.NodeTypeExclusiveGateway:
			// Gateway 在推进逻辑中处理
			s.logger.Info().Str("nodeId", currentNodeId).Msg("ExclusiveGateway encountered, evaluating conditions")
		case parser.NodeTypeEndEvent:
			// EndEvent 标记流程结束
			s.logger.Info().Str("nodeId", currentNodeId).Msg("EndEvent encountered, workflow completed")
		default:
			s.logger.Info().Str("nodeId", currentNodeId).Uint32("nodeType", currentNode.Type).Msg("Node type not requiring special execution")
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
		var err error
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

	// 8. 更新执行状态为 Completed/Failed
	if isMockInstance(instanceId) {
		// For Mock executions, update in-memory execution status
		execution.Status = executionStatus
		if executionStatus == models.ExecutionStatusCompleted {
			execution.CompletedAt = &[]time.Time{time.Now()}[0]
		}
		s.logger.Info().
			Str("executionId", execution.Id).
			Str("status", executionStatus).
			Msg("Updated Mock execution status")
	} else {
		// For real executions, update in database
		_, err = s.executionSvc.UpdateWorkflowExecution(
			ctx,
			execution.Id,
			executionStatus,
			execution.Variables,
			"",
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
	}

	// 9. 更新实例状态 (使用拦截器)
	updatedInstance, err := interceptor.Intercept(ctx,
		fmt.Sprintf("UpdateInstance:%s", instanceId),
		func(ctx context.Context) (*models.WorkflowInstance, error) {
			// 检查是否为 Mock 实例
			session := interceptor.GetInterceptSession(ctx)
			if session != nil && session.InstanceID == instanceId {
				// Mock 实例：更新内存数据
				if s.mockInstanceSvc.MockInstanceExists(instanceId) {
					mockInstance, err := s.mockInstanceSvc.UpdateMockInstance(
						ctx,
						instanceId,
						instanceStatus,
						nextNodeIds,
						nil, // Don't update variables here
					)
					if err != nil {
						return nil, err
					}
					return convertMockInstanceToWorkflowInstance(mockInstance), nil
				}
			}

			// 真实实例：更新数据库
			return s.instanceSvc.UpdateWorkflowInstance(
				ctx,
				instanceId,
				instanceStatus,
				nextNodeIds,
			)
		},
	)

	if err != nil {
		s.logger.Error().Err(err).Str("instanceId", instanceId).Msg("Failed to update instance")
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
	// Use interceptor to wrap service call
	return interceptor.Intercept(ctx,
		fmt.Sprintf("ServiceTask:%s", node.Id),
		func(ctx context.Context) (*BusinessResponse, error) {
			// Check if in old Mock mode for backward compatibility
			if IsMockMode(ctx) {
				s.logger.Info().
					Str("nodeId", node.Id).
					Msg("Executing ServiceTask in legacy Mock mode")

				mockData, err := s.mockCaller.Call(ctx, node.Id)
				if err != nil {
					return nil, fmt.Errorf("failed to get mock data for node %s: %w", node.Id, err)
				}

				return &BusinessResponse{
					StatusCode: mockData.StatusCode,
					Body:       mockData.Body,
					Headers:    mockData.Headers,
				}, nil
			}

			// Real service call
			return s.callRealService(ctx, node, businessParams, variables)
		},
	)
}

// callRealService performs the actual HTTP call to external service
func (s *WorkflowEngineService) callRealService(
	ctx context.Context,
	node *models.Node,
	businessParams map[string]interface{},
	variables map[string]interface{},
) (*BusinessResponse, error) {
	if node.BusinessApiUrl == "" {
		return nil, fmt.Errorf("business API URL not configured for ServiceTask %s", node.Id)
	}

	// 准备请求体
	var requestBody []byte
	var err error
	if businessParams != nil {
		requestBody, err = json.Marshal(businessParams)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal business params: %w", err)
		}
	} else {
		requestBody = []byte("{}")
	}

	// 创建 HTTP 请求
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, node.BusinessApiUrl, bytes.NewReader(requestBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create HTTP request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	// 发送请求
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to call business API: %w", err)
	}
	defer resp.Body.Close()

	// 读取响应体
	var responseBody interface{}
	if err := json.NewDecoder(resp.Body).Decode(&responseBody); err != nil {
		// 如果无法解析为 JSON，读取为字符串
		bodyBytes, _ := io.ReadAll(resp.Body)
		responseBody = string(bodyBytes)
	}

	// 提取响应头
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

// updateExecutionStatus updates execution status and error message
// For Mock executions, updates the in-memory execution object
// For real executions, updates in database
func (s *WorkflowEngineService) updateExecutionStatus(
	ctx context.Context,
	execution *models.WorkflowExecution,
	status string,
	errorMessage string,
) {
	// Update Mock execution in-memory
	if len(execution.Id) >= 10 && execution.Id[:10] == "mock-exec-" {
		execution.Status = status
		execution.ErrorMessage = errorMessage
		if status == models.ExecutionStatusFailed || status == models.ExecutionStatusCompleted {
			execution.CompletedAt = &[]time.Time{time.Now()}[0]
		}
		s.logger.Info().
			Str("executionId", execution.Id).
			Str("status", status).
			Msg("Updated Mock execution status")
		return
	}

	// Update real execution in database
	_, err := s.executionSvc.UpdateWorkflowExecution(ctx, execution.Id, status, nil, errorMessage)
	if err != nil {
		s.logger.Error().Err(err).Str("executionId", execution.Id).Msg("Failed to update execution status")
	}
}

// convertMockInstanceToWorkflowInstance converts a MockWorkflowInstance to models.WorkflowInstance
func convertMockInstanceToWorkflowInstance(mockInstance *MockWorkflowInstance) *models.WorkflowInstance {
	return &models.WorkflowInstance{
		Id:              mockInstance.Id,
		WorkflowId:      mockInstance.WorkflowId,
		Name:            mockInstance.Id, // Use ID as name for mock instances
		Status:          mockInstance.Status,
		CurrentNodeIds:  mockInstance.CurrentNodeIds,
		InstanceVersion: mockInstance.InstanceVersion,
		CreatedAt:       mockInstance.CreatedAt,
		UpdatedAt:       mockInstance.UpdatedAt,
	}
}

// isMockInstance checks if the instanceId belongs to a mock instance
func isMockInstance(instanceId string) bool {
	return len(instanceId) >= 14 && instanceId[:14] == "mock-instance-"
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

