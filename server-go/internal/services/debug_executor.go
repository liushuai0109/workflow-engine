package services

import (
	"context"
	"fmt"
	"time"

	"github.com/bpmn-explorer/server/internal/models"
	"github.com/bpmn-explorer/server/internal/parser"
	"github.com/rs/zerolog"
)

// DebugExecutor handles debug execution logic
type DebugExecutor struct {
	logger *zerolog.Logger
}

// NewDebugExecutor creates a new DebugExecutor
func NewDebugExecutor(logger *zerolog.Logger) *DebugExecutor {
	return &DebugExecutor{
		logger: logger,
	}
}

// ExecuteStep executes a single step in debug session
func (d *DebugExecutor) ExecuteStep(
	ctx context.Context,
	session *models.DebugSession,
	wd *models.WorkflowDefinition,
) error {
	// 如果没有当前节点，从开始节点开始
	if session.CurrentNodeId == "" {
		if len(wd.StartEvents) == 0 {
			return fmt.Errorf("no start event found in workflow")
		}
		session.CurrentNodeId = wd.StartEvents[0]
		session.Status = models.DebugStatusRunning
	}

	nodeId := session.CurrentNodeId
	node, exists := wd.Nodes[nodeId]
	if !exists {
		return fmt.Errorf("node %s not found", nodeId)
	}

	// 添加到调用栈
	frame := models.CallStackFrame{
		NodeId:    node.Id,
		NodeName:  node.Name,
		NodeType:  node.Type,
		Variables: make(map[string]interface{}),
		EnteredAt: time.Now(),
	}
	// 复制当前变量到调用栈帧
	for k, v := range session.Variables {
		frame.Variables[k] = v
	}
	session.CallStack = append(session.CallStack, frame)

	// 执行节点逻辑（简化版本，不实际调用外部 API）
	switch node.Type {
	case parser.NodeTypeServiceTask, parser.NodeTypeUserTask:
		// 在 Debug 模式下，不实际调用外部 API，只是标记为已执行
		d.logger.Info().Str("nodeId", nodeId).Str("nodeType", fmt.Sprintf("%d", node.Type)).Msg("Executing node in debug mode")
	case parser.NodeTypeExclusiveGateway:
		// 网关需要评估条件，选择路径
		// 简化版本：选择第一个满足条件的路径，如果没有条件则选择第一个
		if len(node.OutgoingSequenceFlowIds) > 0 {
			flowId := node.OutgoingSequenceFlowIds[0]
			flow, exists := wd.SequenceFlows[flowId]
			if exists {
				// 如果有条件表达式，需要评估（这里简化处理）
				if flow.ConditionExpression == "" {
					session.CurrentNodeId = flow.TargetNodeId
				} else {
					// TODO: 评估条件表达式
					// 简化版本：选择第一个路径
					session.CurrentNodeId = flow.TargetNodeId
				}
			}
		}
	case parser.NodeTypeEndEvent:
		// 到达结束节点
		session.CurrentNodeId = ""
		session.Status = models.DebugStatusCompleted
		return nil
	}

	// 推进到下一个节点（如果还没有设置）
	if session.CurrentNodeId == nodeId {
		if len(node.OutgoingSequenceFlowIds) > 0 {
			flowId := node.OutgoingSequenceFlowIds[0]
			flow, exists := wd.SequenceFlows[flowId]
			if exists {
				session.CurrentNodeId = flow.TargetNodeId
			}
		} else {
			// 没有出边，可能是结束节点
			session.CurrentNodeId = ""
			session.Status = models.DebugStatusCompleted
		}
	}

	// 检查是否命中断点
	if d.isBreakpoint(session, session.CurrentNodeId) {
		session.Status = models.DebugStatusPaused
		d.logger.Info().Str("sessionId", session.Id).Str("nodeId", session.CurrentNodeId).Msg("Hit breakpoint, pausing execution")
	}

	session.UpdatedAt = time.Now()
	return nil
}

// isBreakpoint checks if a node is a breakpoint
func (d *DebugExecutor) isBreakpoint(session *models.DebugSession, nodeId string) bool {
	for _, bp := range session.Breakpoints {
		if bp == nodeId {
			return true
		}
	}
	return false
}

// ContinueExecution continues debug execution until next breakpoint or completion
func (d *DebugExecutor) ContinueExecution(
	ctx context.Context,
	session *models.DebugSession,
	wd *models.WorkflowDefinition,
) error {
	// 设置状态为运行中
	if session.Status == models.DebugStatusPaused {
		session.Status = models.DebugStatusRunning
	}

	// 继续执行直到遇到断点或完成
	for session.Status == models.DebugStatusRunning {
		// 执行单步
		err := d.ExecuteStep(ctx, session, wd)
		if err != nil {
			session.Status = models.DebugStatusFailed
			return err
		}

		// 如果已完成或停止，退出循环
		if session.Status == models.DebugStatusCompleted || session.Status == models.DebugStatusStopped {
			break
		}

		// 如果遇到断点，暂停执行
		if session.Status == models.DebugStatusPaused {
			d.logger.Info().Str("sessionId", session.Id).Str("nodeId", session.CurrentNodeId).Msg("Hit breakpoint, pausing execution")
			break
		}

		// 如果没有当前节点，说明已完成
		if session.CurrentNodeId == "" {
			session.Status = models.DebugStatusCompleted
			break
		}
	}

	session.UpdatedAt = time.Now()
	return nil
}

