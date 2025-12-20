package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/bpmn-explorer/server/internal/models"
	"github.com/bpmn-explorer/server/internal/parser"
	"github.com/bpmn-explorer/server/pkg/database"
	"github.com/expr-lang/expr"
	"github.com/rs/zerolog"
)

// WorkflowEngineService handles workflow execution engine logic
type WorkflowEngineService struct {
	db            *database.Database
	logger        *zerolog.Logger
	workflowSvc   *WorkflowService
	instanceSvc   *WorkflowInstanceService
	executionSvc  *WorkflowExecutionService
	httpClient    *http.Client
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
	}
}

// ExecuteResult represents the result of workflow execution
type ExecuteResult struct {
	BusinessResponse *BusinessResponse `json:"businessResponse,omitempty"`
	EngineResponse   *EngineResponse   `json:"engineResponse"`
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
	// 1. 获取工作流实例
	instance, err := s.instanceSvc.GetWorkflowInstanceByID(ctx, instanceId)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", models.ErrWorkflowInstanceNotFound, err)
	}

	// 2. 获取工作流定义
	workflow, err := s.workflowSvc.GetWorkflowByID(ctx, instance.WorkflowId)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", models.ErrWorkflowNotFound, err)
	}

	// 3. 解析 BPMN XML
	wd, err := parser.ParseBPMN(workflow.BpmnXml)
	if err != nil {
		s.logger.Error().Err(err).Str("workflowId", workflow.Id).Msg("Failed to parse BPMN XML")
		return nil, fmt.Errorf("failed to parse BPMN XML: %w", err)
	}

	// 4. 验证 fromNodeId 是否存在
	node, exists := wd.Nodes[fromNodeId]
	if !exists {
		return nil, fmt.Errorf("%s: node %s not found in workflow definition", models.ErrInvalidNodeId, fromNodeId)
	}

	// 5. 获取或创建执行记录
	execution, err := s.getOrCreateExecution(ctx, instanceId, workflow.Id, instance.InstanceVersion)
	if err != nil {
		return nil, fmt.Errorf("failed to get or create execution: %w", err)
	}

	// 6. 执行节点
	var businessResponse *BusinessResponse
	switch node.Type {
	case parser.NodeTypeServiceTask:
		businessResponse, err = s.executeServiceTask(ctx, &node, businessParams, execution.Variables)
		if err != nil {
			s.logger.Error().Err(err).Str("nodeId", fromNodeId).Msg("Failed to execute ServiceTask")
			// 更新执行状态为失败
			s.updateExecutionStatus(ctx, execution.Id, models.ExecutionStatusFailed, err.Error())
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
		s.logger.Info().Str("nodeId", fromNodeId).Msg("UserTask encountered, returning pending status")
	case parser.NodeTypeExclusiveGateway:
		// Gateway 在推进逻辑中处理
	case parser.NodeTypeEndEvent:
		// EndEvent 在推进逻辑中处理
	default:
		s.logger.Info().Str("nodeId", fromNodeId).Uint32("nodeType", node.Type).Msg("Node type not requiring special execution")
	}

	// 7. 推进到下一个节点
	nextNodeIds, err := s.advanceToNextNode(ctx, wd, &node, execution.Variables)
	if err != nil {
		s.logger.Error().Err(err).Str("nodeId", fromNodeId).Msg("Failed to advance to next node")
		s.updateExecutionStatus(ctx, execution.Id, models.ExecutionStatusFailed, err.Error())
		return nil, fmt.Errorf("failed to advance to next node: %w", err)
	}

	// 8. 更新执行记录
	updatedExecution, err := s.executionSvc.UpdateWorkflowExecution(
		ctx,
		execution.Id,
		models.ExecutionStatusRunning,
		execution.Variables,
		"",
	)
	if err != nil {
		s.logger.Error().Err(err).Str("executionId", execution.Id).Msg("Failed to update execution")
		return nil, fmt.Errorf("failed to update execution: %w", err)
	}

	// 9. 检查是否到达 EndEvent
	instanceStatus := instance.Status
	if len(nextNodeIds) > 0 {
		nextNode := wd.Nodes[nextNodeIds[0]]
		if nextNode.Type == parser.NodeTypeEndEvent {
			instanceStatus = models.InstanceStatusCompleted
			nextNodeIds = []string{} // 清空当前节点
			// 更新执行状态为完成
			_, err = s.executionSvc.UpdateWorkflowExecution(
				ctx,
				execution.Id,
				models.ExecutionStatusCompleted,
				nil,
				"",
			)
			if err != nil {
				s.logger.Error().Err(err).Msg("Failed to mark execution as completed")
			}
		}
	}

	// 10. 更新实例状态
	updatedInstance, err := s.instanceSvc.UpdateWorkflowInstance(
		ctx,
		instanceId,
		instanceStatus,
		nextNodeIds,
	)
	if err != nil {
		s.logger.Error().Err(err).Str("instanceId", instanceId).Msg("Failed to update instance")
		return nil, fmt.Errorf("failed to update instance: %w", err)
	}

	// 11. 构建响应
	result := &ExecuteResult{
		BusinessResponse: businessResponse,
		EngineResponse: &EngineResponse{
			InstanceId:     updatedInstance.Id,
			CurrentNodeIds: updatedInstance.CurrentNodeIds,
			NextNodeIds:    nextNodeIds,
			Status:         updatedInstance.Status,
			ExecutionId:    updatedExecution.Id,
			Variables:      updatedExecution.Variables,
		},
	}

	return result, nil
}

// getOrCreateExecution gets existing execution or creates a new one
func (s *WorkflowEngineService) getOrCreateExecution(
	ctx context.Context,
	instanceId string,
	workflowId string,
	instanceVersion int,
) (*models.WorkflowExecution, error) {
	// 尝试获取最新的执行记录
	executions, _, err := s.executionSvc.ListWorkflowExecutions(ctx, 1, 1, instanceId, "", "")
	if err != nil {
		return nil, err
	}

	if len(executions) > 0 {
		// 使用最新的执行记录
		return &executions[0], nil
	}

	// 创建新的执行记录
	return s.executionSvc.CreateWorkflowExecution(ctx, instanceId, workflowId, make(map[string]interface{}))
}

// executeServiceTask executes a ServiceTask node by calling business API
func (s *WorkflowEngineService) executeServiceTask(
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
func (s *WorkflowEngineService) updateExecutionStatus(
	ctx context.Context,
	executionId string,
	status string,
	errorMessage string,
) {
	_, err := s.executionSvc.UpdateWorkflowExecution(ctx, executionId, status, nil, errorMessage)
	if err != nil {
		s.logger.Error().Err(err).Str("executionId", executionId).Msg("Failed to update execution status")
	}
}

