package services

import (
	"context"
	"testing"

	"github.com/bpmn-explorer/server/internal/models"
	"github.com/bpmn-explorer/server/internal/parser"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupDebugExecutorTest(t *testing.T) *DebugExecutor {
	logger := zerolog.Nop()
	return NewDebugExecutor(&logger)
}

func createTestWorkflowDefinition() *models.WorkflowDefinition {
	startNode := models.Node{
		Id:                     "StartEvent_1",
		Name:                   "Start",
		Type:                   parser.NodeTypeStartEvent,
		OutgoingSequenceFlowIds: []string{"Flow_1"},
	}
	taskNode := models.Node{
		Id:                     "ServiceTask_1",
		Name:                   "Task 1",
		Type:                   parser.NodeTypeServiceTask,
		IncomingSequenceFlowIds: []string{"Flow_1"},
		OutgoingSequenceFlowIds: []string{"Flow_2"},
	}
	endNode := models.Node{
		Id:                     "EndEvent_1",
		Name:                   "End",
		Type:                   parser.NodeTypeEndEvent,
		IncomingSequenceFlowIds: []string{"Flow_2"},
	}
	
	flow1 := models.SequenceFlow{
		Id:            "Flow_1",
		SourceNodeId:  "StartEvent_1",
		TargetNodeId:  "ServiceTask_1",
	}
	flow2 := models.SequenceFlow{
		Id:            "Flow_2",
		SourceNodeId:  "ServiceTask_1",
		TargetNodeId:  "EndEvent_1",
	}

	return &models.WorkflowDefinition{
		StartEvents: []string{"StartEvent_1"},
		Nodes: map[string]models.Node{
			"StartEvent_1":  startNode,
			"ServiceTask_1": taskNode,
			"EndEvent_1":    endNode,
		},
		SequenceFlows: map[string]models.SequenceFlow{
			"Flow_1": flow1,
			"Flow_2": flow2,
		},
	}
}

func TestDebugExecutor_ExecuteStep(t *testing.T) {
	executor := setupDebugExecutorTest(t)
	ctx := context.Background()

	t.Run("start from beginning", func(t *testing.T) {
		wd := createTestWorkflowDefinition()
		session := &models.DebugSession{
			Id:            "test-session",
			WorkflowId:    "Process_1",
			Status:        models.DebugStatusPending,
			CurrentNodeId: "",
			Variables:     make(map[string]interface{}),
			Breakpoints:   []string{},
			CallStack:     []models.CallStackFrame{},
		}

		err := executor.ExecuteStep(ctx, session, wd)
		require.NoError(t, err)
		assert.Equal(t, models.DebugStatusRunning, session.Status)
		// ExecuteStep will advance to next node immediately, so it should be ServiceTask_1
		assert.Equal(t, "ServiceTask_1", session.CurrentNodeId)
		assert.NotEmpty(t, session.CallStack)
	})

	t.Run("advance to next node", func(t *testing.T) {
		wd := createTestWorkflowDefinition()
		session := &models.DebugSession{
			Id:            "test-session",
			WorkflowId:    "Process_1",
			Status:        models.DebugStatusRunning,
			CurrentNodeId: "StartEvent_1",
			Variables:     make(map[string]interface{}),
			Breakpoints:   []string{},
			CallStack:     []models.CallStackFrame{},
		}

		err := executor.ExecuteStep(ctx, session, wd)
		require.NoError(t, err)
		assert.Equal(t, "ServiceTask_1", session.CurrentNodeId)
	})

	t.Run("complete at end event", func(t *testing.T) {
		wd := createTestWorkflowDefinition()
		session := &models.DebugSession{
			Id:            "test-session",
			WorkflowId:    "Process_1",
			Status:        models.DebugStatusRunning,
			CurrentNodeId: "EndEvent_1",
			Variables:     make(map[string]interface{}),
			Breakpoints:   []string{},
			CallStack:     []models.CallStackFrame{},
		}

		err := executor.ExecuteStep(ctx, session, wd)
		require.NoError(t, err)
		assert.Equal(t, models.DebugStatusCompleted, session.Status)
		assert.Empty(t, session.CurrentNodeId)
	})

	t.Run("pause at breakpoint", func(t *testing.T) {
		wd := createTestWorkflowDefinition()
		session := &models.DebugSession{
			Id:            "test-session",
			WorkflowId:    "Process_1",
			Status:        models.DebugStatusRunning,
			CurrentNodeId: "StartEvent_1",
			Variables:     make(map[string]interface{}),
			Breakpoints:   []string{"ServiceTask_1"},
			CallStack:     []models.CallStackFrame{},
		}

		err := executor.ExecuteStep(ctx, session, wd)
		require.NoError(t, err)
		assert.Equal(t, models.DebugStatusPaused, session.Status)
		assert.Equal(t, "ServiceTask_1", session.CurrentNodeId)
	})
}

func TestDebugExecutor_ContinueExecution(t *testing.T) {
	executor := setupDebugExecutorTest(t)
	ctx := context.Background()

	t.Run("continue until breakpoint", func(t *testing.T) {
		wd := createTestWorkflowDefinition()
		session := &models.DebugSession{
			Id:            "test-session",
			WorkflowId:    "Process_1",
			Status:        models.DebugStatusPaused,
			CurrentNodeId: "StartEvent_1",
			Variables:     make(map[string]interface{}),
			Breakpoints:   []string{"ServiceTask_1"},
			CallStack:     []models.CallStackFrame{},
		}

		err := executor.ContinueExecution(ctx, session, wd)
		require.NoError(t, err)
		assert.Equal(t, models.DebugStatusPaused, session.Status)
		assert.Equal(t, "ServiceTask_1", session.CurrentNodeId)
	})

	t.Run("continue until completion", func(t *testing.T) {
		wd := createTestWorkflowDefinition()
		session := &models.DebugSession{
			Id:            "test-session",
			WorkflowId:    "Process_1",
			Status:        models.DebugStatusRunning,
			CurrentNodeId: "StartEvent_1",
			Variables:     make(map[string]interface{}),
			Breakpoints:   []string{},
			CallStack:     []models.CallStackFrame{},
		}

		err := executor.ContinueExecution(ctx, session, wd)
		require.NoError(t, err)
		assert.Equal(t, models.DebugStatusCompleted, session.Status)
	})
}

func TestDebugExecutor_IsBreakpoint(t *testing.T) {
	executor := setupDebugExecutorTest(t)

	t.Run("node is breakpoint", func(t *testing.T) {
		session := &models.DebugSession{
			Breakpoints: []string{"Node_1", "Node_2"},
		}

		assert.True(t, executor.isBreakpoint(session, "Node_1"))
		assert.True(t, executor.isBreakpoint(session, "Node_2"))
		assert.False(t, executor.isBreakpoint(session, "Node_3"))
	})
}

