package services

import (
	"context"
	"testing"

	"github.com/bpmn-explorer/server/internal/models"
	"github.com/bpmn-explorer/server/pkg/database"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupMockExecutorTest(t *testing.T) (*MockExecutor, *WorkflowService) {
	logger := zerolog.Nop()
	db := database.NewDatabase(&logger)
	workflowSvc := NewWorkflowService(db, &logger)
	executor := NewMockExecutor(db, &logger, workflowSvc)
	return executor, workflowSvc
}

func createSimpleBPMN() string {
	return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="Process_1" name="Test Process" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" name="Start">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:serviceTask id="ServiceTask_1" name="Task 1">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:endEvent id="EndEvent_1" name="End">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="ServiceTask_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="ServiceTask_1" targetRef="EndEvent_1" />
  </bpmn:process>
</bpmn:definitions>`
}

func TestMockExecutor_ExecuteWorkflow(t *testing.T) {
	executor, _ := setupMockExecutorTest(t)
	ctx := context.Background()

	t.Run("successful execution", func(t *testing.T) {
		bpmnXml := createSimpleBPMN()
		execution, err := executor.ExecuteWorkflow(ctx, "Process_1", nil, nil, bpmnXml)

		require.NoError(t, err)
		assert.NotNil(t, execution)
		assert.Equal(t, "Process_1", execution.WorkflowId)
		assert.Equal(t, MockExecutionStatusRunning, execution.Status)
		assert.NotEmpty(t, execution.Id)
		assert.NotEmpty(t, execution.CurrentNodeId)
	})

	t.Run("with initial variables", func(t *testing.T) {
		bpmnXml := createSimpleBPMN()
		initialVars := map[string]interface{}{
			"testVar": "testValue",
		}
		execution, err := executor.ExecuteWorkflow(ctx, "Process_1", nil, initialVars, bpmnXml)

		require.NoError(t, err)
		assert.NotNil(t, execution)
		assert.Equal(t, "testValue", execution.Variables["testVar"])
	})
}

func TestMockExecutor_StepExecution(t *testing.T) {
	executor, workflowSvc := setupMockExecutorTest(t)
	ctx := context.Background()

	t.Run("step execution advances node", func(t *testing.T) {
		bpmnXml := createSimpleBPMN()
		// Save workflow to memory store first
		workflow := &models.Workflow{
			Id:      "Process_1",
			Name:    "Process_1",
			BpmnXml: bpmnXml,
		}
		workflowSvc.SetWorkflowInMemory(workflow)
		
		execution, err := executor.ExecuteWorkflow(ctx, "Process_1", nil, nil, bpmnXml)
		require.NoError(t, err)

		initialNodeId := execution.CurrentNodeId
		assert.NotEmpty(t, initialNodeId, "Execution should have a current node")

		// Get execution again to ensure we have the latest state
		execution, err = executor.GetExecution(ctx, execution.Id)
		require.NoError(t, err)
		initialNodeId = execution.CurrentNodeId

		// Step execution - this should execute the current node and advance
		err = executor.StepExecution(ctx, execution, nil)
		require.NoError(t, err)

		// Get updated execution
		updatedExecution, err := executor.GetExecution(ctx, execution.Id)
		require.NoError(t, err)

		// The execution should either advance to next node or complete
		// Note: StartEvent nodes are typically executed immediately, so we might already be at ServiceTask
		// For StartEvent, executeNode should advance to the next node (ServiceTask_1)
		if initialNodeId == "StartEvent_1" {
			// If we started at StartEvent, executeNode should advance to ServiceTask_1
			// But the logic might not handle StartEvent specially, so we check if it advanced
			assert.True(t, updatedExecution.CurrentNodeId == "ServiceTask_1" || 
				updatedExecution.CurrentNodeId == "EndEvent_1" ||
				updatedExecution.Status == MockExecutionStatusCompleted ||
				updatedExecution.CurrentNodeId != initialNodeId,
				"Execution should advance from StartEvent, got: "+updatedExecution.CurrentNodeId)
		} else {
			// Otherwise, should advance or complete
			assert.True(t, updatedExecution.CurrentNodeId != initialNodeId || 
				updatedExecution.Status == MockExecutionStatusCompleted,
				"Execution should advance to next node or complete")
		}
	})
}

func TestMockExecutor_ContinueExecution(t *testing.T) {
	executor, workflowSvc := setupMockExecutorTest(t)
	ctx := context.Background()

	t.Run("continue execution", func(t *testing.T) {
		bpmnXml := createSimpleBPMN()
		// Save workflow to memory store first
		workflow := &models.Workflow{
			Id:      "Process_1",
			Name:    "Process_1",
			BpmnXml: bpmnXml,
		}
		workflowSvc.SetWorkflowInMemory(workflow)
		
		execution, err := executor.ExecuteWorkflow(ctx, "Process_1", nil, nil, bpmnXml)
		require.NoError(t, err)

		execution, err = executor.ContinueExecution(ctx, execution.Id, nil)
		require.NoError(t, err)
		assert.NotNil(t, execution)
	})
}

func TestMockExecutor_StopExecution(t *testing.T) {
	executor, _ := setupMockExecutorTest(t)
	ctx := context.Background()

	t.Run("stop execution", func(t *testing.T) {
		bpmnXml := createSimpleBPMN()
		execution, err := executor.ExecuteWorkflow(ctx, "Process_1", nil, nil, bpmnXml)
		require.NoError(t, err)

		err = executor.StopExecution(execution.Id)
		require.NoError(t, err)

		stoppedExecution, err := executor.GetExecution(ctx, execution.Id)
		require.NoError(t, err)
		assert.Equal(t, MockExecutionStatusStopped, stoppedExecution.Status)
	})
}

func TestMockExecutor_GetExecution(t *testing.T) {
	executor, _ := setupMockExecutorTest(t)
	ctx := context.Background()

	t.Run("get existing execution", func(t *testing.T) {
		bpmnXml := createSimpleBPMN()
		execution, err := executor.ExecuteWorkflow(ctx, "Process_1", nil, nil, bpmnXml)
		require.NoError(t, err)

		retrieved, err := executor.GetExecution(ctx, execution.Id)
		require.NoError(t, err)
		assert.Equal(t, execution.Id, retrieved.Id)
		assert.Equal(t, execution.WorkflowId, retrieved.WorkflowId)
	})

	t.Run("get non-existent execution", func(t *testing.T) {
		_, err := executor.GetExecution(ctx, "non-existent-id")
		assert.Error(t, err)
	})
}

