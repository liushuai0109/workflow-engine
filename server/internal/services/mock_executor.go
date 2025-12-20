package services

import (
	"context"
	"fmt"
	"time"

	"github.com/bpmn-explorer/server/internal/models"
	"github.com/bpmn-explorer/server/internal/parser"
	"github.com/bpmn-explorer/server/pkg/database"
	"github.com/rs/zerolog"
)

// MockExecutor handles mock workflow execution
type MockExecutor struct {
	db          *database.Database
	logger      *zerolog.Logger
	workflowSvc *WorkflowService
	store       *MockExecutionStore
}

// NewMockExecutor creates a new MockExecutor
func NewMockExecutor(db *database.Database, logger *zerolog.Logger, workflowSvc *WorkflowService) *MockExecutor {
	return &MockExecutor{
		db:          db,
		logger:      logger,
		workflowSvc: workflowSvc,
		store:       NewMockExecutionStore(logger),
	}
}

// MockExecution represents a mock execution state
type MockExecution struct {
	Id            string                 `json:"id"`
	WorkflowId    string                 `json:"workflowId"`
	Status        string                 `json:"status"`
	CurrentNodeId string                 `json:"currentNodeId"`
	Variables     map[string]interface{} `json:"variables"`
	ExecutedNodes []string               `json:"executedNodes"`
	CreatedAt     time.Time              `json:"createdAt"`
	UpdatedAt     time.Time              `json:"updatedAt"`
}

// MockExecutionStatus constants
const (
	MockExecutionStatusPending   = "pending"
	MockExecutionStatusRunning  = "running"
	MockExecutionStatusPaused   = "paused"
	MockExecutionStatusCompleted = "completed"
	MockExecutionStatusFailed   = "failed"
	MockExecutionStatusStopped  = "stopped"
)

// ExecuteWorkflow executes a workflow with mock configuration
func (m *MockExecutor) ExecuteWorkflow(
	ctx context.Context,
	workflowId string,
	mockConfig *models.MockConfig,
	initialVariables map[string]interface{},
	bpmnXml string, // 可选的 BPMN XML，如果提供则优先使用
) (*MockExecution, error) {
	// 1. 获取工作流定义
	var workflow *models.Workflow
	var err error
	
	if bpmnXml != "" {
		// 如果提供了 BPMN XML，直接使用
		workflow = &models.Workflow{
			Id:      workflowId,
			Name:    workflowId,
			BpmnXml: bpmnXml,
		}
		// 保存到内存存储以便后续使用
		if m.workflowSvc != nil {
			// 通过反射或添加公共方法访问 store
			// 暂时先不保存，直接使用
		}
	} else {
		workflow, err = m.workflowSvc.GetWorkflowByID(ctx, workflowId)
		if err != nil {
			return nil, fmt.Errorf("%s: %w", models.ErrWorkflowNotFound, err)
		}
	}

	// 2. 解析 BPMN XML
	wd, err := parser.ParseBPMN(workflow.BpmnXml)
	if err != nil {
		m.logger.Error().Err(err).Str("workflowId", workflowId).Msg("Failed to parse BPMN XML")
		return nil, fmt.Errorf("failed to parse BPMN XML: %w", err)
	}

	// 3. 创建 Mock 执行
	execution := &MockExecution{
		Id:            fmt.Sprintf("mock-%d", time.Now().UnixNano()),
		WorkflowId:    workflowId,
		Status:        MockExecutionStatusRunning,
		Variables:     initialVariables,
		ExecutedNodes: []string{},
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if execution.Variables == nil {
		execution.Variables = make(map[string]interface{})
	}

	// 4. 找到开始节点
	if len(wd.StartEvents) == 0 {
		return nil, fmt.Errorf("no start event found in workflow")
	}
	startNodeId := wd.StartEvents[0]
	execution.CurrentNodeId = startNodeId

	// 5. 执行工作流（简化版本：单步执行）
	// 实际实现中，这里应该是一个循环，直到到达 EndEvent
	err = m.executeNode(ctx, wd, execution, mockConfig)
	if err != nil {
		execution.Status = MockExecutionStatusFailed
		return execution, err
	}

	// 6. 检查是否完成
	if execution.CurrentNodeId == "" {
		execution.Status = MockExecutionStatusCompleted
	}

	// 7. 保存执行状态
	m.store.SaveExecution(execution)

	return execution, nil
}

// executeNode executes a single node with mock configuration
func (m *MockExecutor) executeNode(
	ctx context.Context,
	wd *models.WorkflowDefinition,
	execution *MockExecution,
	mockConfig *models.MockConfig,
) error {
	nodeId := execution.CurrentNodeId
	node, exists := wd.Nodes[nodeId]
	if !exists {
		return fmt.Errorf("node %s not found", nodeId)
	}

	// 获取节点 Mock 配置
	var nodeConfig *models.NodeConfig
	if mockConfig != nil && mockConfig.NodeConfigs != nil {
		if config, ok := mockConfig.NodeConfigs[nodeId]; ok {
			nodeConfig = &config
		}
	}

	// 模拟延迟
	if nodeConfig != nil && nodeConfig.Delay > 0 {
		time.Sleep(time.Duration(nodeConfig.Delay) * time.Millisecond)
	}

	// 检查是否应该失败
	if nodeConfig != nil && nodeConfig.ShouldFail {
		return fmt.Errorf("mock failure: %s", nodeConfig.ErrorMessage)
	}

	// 执行节点逻辑
	switch node.Type {
	case parser.NodeTypeStartEvent:
		// StartEvent 直接推进到下一个节点
		execution.ExecutedNodes = append(execution.ExecutedNodes, nodeId)
		if len(node.OutgoingSequenceFlowIds) > 0 {
			flowId := node.OutgoingSequenceFlowIds[0]
			flow, exists := wd.SequenceFlows[flowId]
			if exists {
				execution.CurrentNodeId = flow.TargetNodeId
			}
		}
		return nil
	case parser.NodeTypeServiceTask, parser.NodeTypeUserTask:
		// 使用 Mock 响应
		if nodeConfig != nil && nodeConfig.MockResponse != nil {
			execution.Variables["mockResponse"] = nodeConfig.MockResponse
		}
	case parser.NodeTypeExclusiveGateway:
		// 处理网关分支选择
		if mockConfig != nil && mockConfig.GatewayConfigs != nil {
			if gatewayConfig, ok := mockConfig.GatewayConfigs[nodeId]; ok {
				// 使用配置的路径
				flow, exists := wd.SequenceFlows[gatewayConfig.SelectedPath]
				if exists {
					execution.CurrentNodeId = flow.TargetNodeId
					execution.ExecutedNodes = append(execution.ExecutedNodes, nodeId)
					return nil
				}
			}
		}
		// 默认选择第一个出边
		if len(node.OutgoingSequenceFlowIds) > 0 {
			flowId := node.OutgoingSequenceFlowIds[0]
			flow, exists := wd.SequenceFlows[flowId]
			if exists {
				execution.CurrentNodeId = flow.TargetNodeId
			}
		}
	case parser.NodeTypeEndEvent:
		// 到达结束节点
		execution.CurrentNodeId = ""
		execution.Status = MockExecutionStatusCompleted
		return nil
	}

	// 推进到下一个节点（对于其他节点类型）
	if execution.CurrentNodeId != "" && execution.CurrentNodeId != nodeId {
		execution.ExecutedNodes = append(execution.ExecutedNodes, nodeId)
		// 查找下一个节点
		if len(node.OutgoingSequenceFlowIds) > 0 {
			flowId := node.OutgoingSequenceFlowIds[0]
			flow, exists := wd.SequenceFlows[flowId]
			if exists {
				execution.CurrentNodeId = flow.TargetNodeId
			}
		}
	} else if execution.CurrentNodeId == nodeId {
		// 如果 CurrentNodeId 仍然是当前节点（没有被 switch 中的逻辑修改），尝试推进
		execution.ExecutedNodes = append(execution.ExecutedNodes, nodeId)
		if len(node.OutgoingSequenceFlowIds) > 0 {
			flowId := node.OutgoingSequenceFlowIds[0]
			flow, exists := wd.SequenceFlows[flowId]
			if exists {
				execution.CurrentNodeId = flow.TargetNodeId
			}
		}
	}

	return nil
}

// GetExecution retrieves a mock execution by ID
func (m *MockExecutor) GetExecution(ctx context.Context, executionId string) (*MockExecution, error) {
	return m.store.GetExecution(executionId)
}

// StepExecution executes a single step in mock execution
func (m *MockExecutor) StepExecution(
	ctx context.Context,
	execution *MockExecution,
	mockConfig *models.MockConfig,
) error {
	// 获取工作流定义
	workflow, err := m.workflowSvc.GetWorkflowByID(ctx, execution.WorkflowId)
	if err != nil {
		return fmt.Errorf("%s: %w", models.ErrWorkflowNotFound, err)
	}

	// 解析 BPMN XML
	wd, err := parser.ParseBPMN(workflow.BpmnXml)
	if err != nil {
		return fmt.Errorf("failed to parse BPMN XML: %w", err)
	}

	// 执行当前节点
	err = m.executeNode(ctx, wd, execution, mockConfig)
	if err != nil {
		execution.Status = MockExecutionStatusFailed
		return err
	}

	execution.UpdatedAt = time.Now()

	// 检查是否完成
	if execution.CurrentNodeId == "" {
		execution.Status = MockExecutionStatusCompleted
	}

	// 保存执行状态
	m.store.SaveExecution(execution)

	return nil
}

// ContinueExecution continues mock execution until next breakpoint or completion
func (m *MockExecutor) ContinueExecution(
	ctx context.Context,
	executionId string,
	mockConfig *models.MockConfig,
) (*MockExecution, error) {
	// 获取执行状态
	execution, err := m.store.GetExecution(executionId)
	if err != nil {
		return nil, err
	}

	// 获取工作流定义
	workflow, err := m.workflowSvc.GetWorkflowByID(ctx, execution.WorkflowId)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", models.ErrWorkflowNotFound, err)
	}

	// 解析 BPMN XML
	wd, err := parser.ParseBPMN(workflow.BpmnXml)
	if err != nil {
		return nil, fmt.Errorf("failed to parse BPMN XML: %w", err)
	}

	// 继续执行直到遇到断点或完成
	for execution.Status == MockExecutionStatusRunning || execution.Status == MockExecutionStatusPaused {
		// 检查断点
		if mockConfig != nil && len(mockConfig.NodeConfigs) > 0 {
			// 如果有断点配置，检查当前节点是否有断点
			// 这里简化处理，实际应该检查 debug session 的断点
		}

		// 执行当前节点
		err = m.executeNode(ctx, wd, execution, mockConfig)
		if err != nil {
			execution.Status = MockExecutionStatusFailed
			m.store.SaveExecution(execution)
			return execution, err
		}

		// 检查是否完成
		if execution.CurrentNodeId == "" {
			execution.Status = MockExecutionStatusCompleted
			break
		}

		// 更新状态
		execution.UpdatedAt = time.Now()
		m.store.SaveExecution(execution)

		// 单步执行，每次只执行一个节点
		break
	}

	return execution, nil
}

// StopExecution stops a mock execution
func (m *MockExecutor) StopExecution(executionId string) error {
	return m.store.UpdateExecutionStatus(executionId, MockExecutionStatusStopped)
}

