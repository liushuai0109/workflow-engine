package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/bpmn-explorer/server/internal/models"
	"github.com/bpmn-explorer/server/internal/parser"
	"github.com/bpmn-explorer/server/pkg/database"
	"github.com/DATA-DOG/go-sqlmock"
	"github.com/lib/pq"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupWorkflowEngineServiceTest(t *testing.T) (*WorkflowEngineService, sqlmock.Sqlmock, func()) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)

	logger := zerolog.Nop()
	database := database.NewDatabase(&logger)
	database.DB = db

	workflowSvc := NewWorkflowService(database, &logger)
	instanceSvc := NewWorkflowInstanceService(database, &logger)
	executionSvc := NewWorkflowExecutionService(database, &logger)

	engineSvc := NewWorkflowEngineService(database, &logger, workflowSvc, instanceSvc, executionSvc)

	cleanup := func() {
		db.Close()
	}

	return engineSvc, mock, cleanup
}

// createTestBPMN creates a simple test BPMN XML
func createTestBPMN() string {
	return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="Process_1" name="Test Process">
    <bpmn:startEvent id="StartEvent_1" name="Start">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:serviceTask id="ServiceTask_1" name="Service Task">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
      <bpmn:extensionElements>
        <xflow:url xmlns:xflow="http://example.com/bpmn/xflow-extension" value="http://example.com/api/test"/>
      </bpmn:extensionElements>
    </bpmn:serviceTask>
    <bpmn:endEvent id="EndEvent_1" name="End">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="ServiceTask_1"/>
    <bpmn:sequenceFlow id="Flow_2" sourceRef="ServiceTask_1" targetRef="EndEvent_1"/>
  </bpmn:process>
</bpmn:definitions>`
}

func TestWorkflowEngineService_ExecuteFromNode_ServiceTask_Success(t *testing.T) {
	engineSvc, mock, cleanup := setupWorkflowEngineServiceTest(t)
	defer cleanup()

	// Create a test HTTP server to mock business API
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"result": "success",
			"data":   "test data",
		})
	}))
	defer server.Close()

	// Update BPMN to use test server URL
	bpmnXML := `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="Process_1" name="Test Process">
    <bpmn:startEvent id="StartEvent_1" name="Start">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:serviceTask id="ServiceTask_1" name="Service Task">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
      <bpmn:extensionElements>
        <xflow:url xmlns:xflow="http://example.com/bpmn/xflow-extension" value="` + server.URL + `"/>
      </bpmn:extensionElements>
    </bpmn:serviceTask>
    <bpmn:endEvent id="EndEvent_1" name="End">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="ServiceTask_1"/>
    <bpmn:sequenceFlow id="Flow_2" sourceRef="ServiceTask_1" targetRef="EndEvent_1"/>
  </bpmn:process>
</bpmn:definitions>`

	ctx := context.Background()
	instanceId := "test-instance-id"
	workflowId := "test-workflow-id"
	fromNodeId := "ServiceTask_1"
	now := time.Now()

	// Mock: Get workflow instance (with ServiceTask_1 in current_node_ids)
	mock.ExpectQuery(`SELECT id, workflow_id, name, status, current_node_ids, instance_version, created_at, updated_at`).
		WithArgs(instanceId).
		WillReturnRows(sqlmock.NewRows([]string{"id", "workflow_id", "name", "status", "current_node_ids", "instance_version", "created_at", "updated_at"}).
			AddRow(instanceId, workflowId, "Test Instance", models.InstanceStatusRunning, pq.Array([]string{"ServiceTask_1"}), 1, now, now))

	// Mock: Get workflow definition
	mock.ExpectQuery(`SELECT id, name, description, bpmn_xml, version, status, created_by, created_at, updated_at`).
		WithArgs(workflowId).
		WillReturnRows(sqlmock.NewRows([]string{"id", "name", "description", "bpmn_xml", "version", "status", "created_by", "created_at", "updated_at"}).
			AddRow(workflowId, "Test Workflow", "", bpmnXML, "1.0.0", models.StatusDraft, sql.NullString{}, now, now))

	// Mock: Get instance version (for CreateWorkflowExecution)
	mock.ExpectQuery(`SELECT instance_version FROM workflow_instances WHERE id`).
		WithArgs(instanceId).
		WillReturnRows(sqlmock.NewRows([]string{"instance_version"}).AddRow(1))

	// Mock: Create execution
	mock.ExpectQuery(`INSERT INTO workflow_executions`).
		WithArgs(sqlmock.AnyArg(), instanceId, workflowId, models.ExecutionStatusPending, sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"id", "instance_id", "workflow_id", "status", "variables", "execution_version", "started_at", "completed_at", "error_message"}).
			AddRow("exec-1", instanceId, workflowId, models.ExecutionStatusPending, []byte("{}"), 1, now, sql.NullTime{Valid: false}, sql.NullString{Valid: false}))

	// Mock: Update execution to Running
	mock.ExpectQuery(`UPDATE workflow_executions`).
		WithArgs(sqlmock.AnyArg(), models.ExecutionStatusRunning, sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"id", "instance_id", "workflow_id", "status", "variables", "execution_version", "started_at", "completed_at", "error_message"}).
			AddRow("exec-1", instanceId, workflowId, models.ExecutionStatusRunning, []byte("{}"), 1, now, sql.NullTime{}, sql.NullString{}))

	// Mock: Update execution to Completed
	mock.ExpectQuery(`UPDATE workflow_executions`).
		WithArgs(sqlmock.AnyArg(), models.ExecutionStatusCompleted, sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"id", "instance_id", "workflow_id", "status", "variables", "execution_version", "started_at", "completed_at", "error_message"}).
			AddRow("exec-1", instanceId, workflowId, models.ExecutionStatusCompleted, []byte("{}"), 1, now, sql.NullTime{Valid: true, Time: now}, sql.NullString{}))

	// Mock: Update instance to Completed (workflow reaches EndEvent)
	// Args: updated_at, status, current_node_ids (empty when completed), instance_id
	mock.ExpectQuery(`UPDATE workflow_instances`).
		WithArgs(sqlmock.AnyArg(), models.InstanceStatusCompleted, sqlmock.AnyArg(), instanceId).
		WillReturnRows(sqlmock.NewRows([]string{"id", "workflow_id", "name", "status", "current_node_ids", "instance_version", "created_at", "updated_at"}).
			AddRow(instanceId, workflowId, "Test Instance", models.InstanceStatusCompleted, pq.Array([]string{}), 2, now, now))

	// Execute
	result, err := engineSvc.ExecuteFromNode(ctx, instanceId, fromNodeId, map[string]interface{}{"param": "value"})

	require.NoError(t, err)
	assert.NotNil(t, result)
	assert.NotNil(t, result.BusinessResponse)
	assert.Equal(t, http.StatusOK, result.BusinessResponse.StatusCode)
	assert.NotNil(t, result.EngineResponse)
	assert.Equal(t, instanceId, result.EngineResponse.InstanceId)
	assert.Equal(t, models.InstanceStatusCompleted, result.EngineResponse.Status)
	assert.Empty(t, result.EngineResponse.CurrentNodeIds)

	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

func TestWorkflowEngineService_ExecuteFromNode_InvalidNodeId(t *testing.T) {
	engineSvc, mock, cleanup := setupWorkflowEngineServiceTest(t)
	defer cleanup()

	ctx := context.Background()
	instanceId := "test-instance-id"
	workflowId := "test-workflow-id"
	fromNodeId := "InvalidNode"
	now := time.Now()

	// Mock: Get workflow instance
	mock.ExpectQuery(`SELECT id, workflow_id, name, status, current_node_ids, instance_version, created_at, updated_at`).
		WithArgs(instanceId).
		WillReturnRows(sqlmock.NewRows([]string{"id", "workflow_id", "name", "status", "current_node_ids", "instance_version", "created_at", "updated_at"}).
			AddRow(instanceId, workflowId, "Test Instance", models.InstanceStatusRunning, pq.Array([]string{}), 1, now, now))

	// Mock: Get workflow definition
	mock.ExpectQuery(`SELECT id, name, description, bpmn_xml, version, status, created_by, created_at, updated_at`).
		WithArgs(workflowId).
		WillReturnRows(sqlmock.NewRows([]string{"id", "name", "description", "bpmn_xml", "version", "status", "created_by", "created_at", "updated_at"}).
			AddRow(workflowId, "Test Workflow", "", createTestBPMN(), "1.0.0", models.StatusDraft, sql.NullString{}, now, now))

	// Mock: Update instance to initialize current_node_ids (auto-initialization will happen before node validation)
	// Args: updated_at, status, current_node_ids, instance_id
	mock.ExpectQuery(`UPDATE workflow_instances`).
		WithArgs(sqlmock.AnyArg(), models.InstanceStatusRunning, sqlmock.AnyArg(), instanceId).
		WillReturnRows(sqlmock.NewRows([]string{"id", "workflow_id", "name", "status", "current_node_ids", "instance_version", "created_at", "updated_at"}).
			AddRow(instanceId, workflowId, "Test Instance", models.InstanceStatusRunning, pq.Array([]string{"StartEvent_1"}), 2, now, now))

	// Execute
	result, err := engineSvc.ExecuteFromNode(ctx, instanceId, fromNodeId, nil)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), models.ErrInvalidNodeId)

	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

func TestWorkflowEngineService_ExecuteFromNode_EndEvent(t *testing.T) {
	engineSvc, mock, cleanup := setupWorkflowEngineServiceTest(t)
	defer cleanup()

	bpmnXML := `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="Process_1" name="Test Process">
    <bpmn:startEvent id="StartEvent_1" name="Start">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:endEvent id="EndEvent_1" name="End">
      <bpmn:incoming>Flow_1</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="EndEvent_1"/>
  </bpmn:process>
</bpmn:definitions>`

	ctx := context.Background()
	instanceId := "test-instance-id"
	workflowId := "test-workflow-id"
	fromNodeId := "EndEvent_1"
	now := time.Now()

	// Mock: Get workflow instance
	mock.ExpectQuery(`SELECT id, workflow_id, name, status, current_node_ids, instance_version, created_at, updated_at`).
		WithArgs(instanceId).
		WillReturnRows(sqlmock.NewRows([]string{"id", "workflow_id", "name", "status", "current_node_ids", "instance_version", "created_at", "updated_at"}).
			AddRow(instanceId, workflowId, "Test Instance", models.InstanceStatusRunning, pq.Array([]string{"EndEvent_1"}), 1, now, now))

	// Mock: Get workflow definition
	mock.ExpectQuery(`SELECT id, name, description, bpmn_xml, version, status, created_by, created_at, updated_at`).
		WithArgs(workflowId).
		WillReturnRows(sqlmock.NewRows([]string{"id", "name", "description", "bpmn_xml", "version", "status", "created_by", "created_at", "updated_at"}).
			AddRow(workflowId, "Test Workflow", "", bpmnXML, "1.0.0", models.StatusDraft, sql.NullString{}, now, now))

	// Mock: Get instance version (for CreateWorkflowExecution)
	mock.ExpectQuery(`SELECT instance_version FROM workflow_instances WHERE id`).
		WithArgs(instanceId).
		WillReturnRows(sqlmock.NewRows([]string{"instance_version"}).AddRow(1))

	// Mock: Create execution
	mock.ExpectQuery(`INSERT INTO workflow_executions`).
		WithArgs(sqlmock.AnyArg(), instanceId, workflowId, models.ExecutionStatusPending, sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"id", "instance_id", "workflow_id", "status", "variables", "execution_version", "started_at", "completed_at", "error_message"}).
			AddRow("exec-1", instanceId, workflowId, models.ExecutionStatusPending, []byte("{}"), 1, now, sql.NullTime{Valid: false}, sql.NullString{Valid: false}))

	// Mock: Update execution to Running (3 params)
	mock.ExpectQuery(`UPDATE workflow_executions`).
		WithArgs(sqlmock.AnyArg(), models.ExecutionStatusRunning, sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"id", "instance_id", "workflow_id", "status", "variables", "execution_version", "started_at", "completed_at", "error_message"}).
			AddRow("exec-1", instanceId, workflowId, models.ExecutionStatusRunning, []byte("{}"), 1, now, sql.NullTime{Valid: false}, sql.NullString{Valid: false}))

	// Mock: Update execution to Completed (5 params: updated_at, status, completed_at, variables, execution_id)
	mock.ExpectQuery(`UPDATE workflow_executions`).
		WithArgs(sqlmock.AnyArg(), models.ExecutionStatusCompleted, sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"id", "instance_id", "workflow_id", "status", "variables", "execution_version", "started_at", "completed_at", "error_message"}).
			AddRow("exec-1", instanceId, workflowId, models.ExecutionStatusCompleted, []byte("{}"), 1, now, sql.NullTime{Valid: true, Time: now}, sql.NullString{Valid: false}))

	// Mock: Update instance (4 params: updated_at, status, current_node_ids, instance_id)
	mock.ExpectQuery(`UPDATE workflow_instances`).
		WithArgs(sqlmock.AnyArg(), models.InstanceStatusCompleted, sqlmock.AnyArg(), instanceId).
		WillReturnRows(sqlmock.NewRows([]string{"id", "workflow_id", "name", "status", "current_node_ids", "instance_version", "created_at", "updated_at"}).
			AddRow(instanceId, workflowId, "Test Instance", models.InstanceStatusCompleted, pq.Array([]string{}), 2, now, now))

	// Execute
	result, err := engineSvc.ExecuteFromNode(ctx, instanceId, fromNodeId, nil)

	require.NoError(t, err)
	assert.NotNil(t, result)
	assert.NotNil(t, result.EngineResponse)
	assert.Equal(t, models.InstanceStatusCompleted, result.EngineResponse.Status)
	assert.Empty(t, result.EngineResponse.CurrentNodeIds)

	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

func TestWorkflowEngineService_EvaluateCondition(t *testing.T) {
	engineSvc, _, cleanup := setupWorkflowEngineServiceTest(t)
	defer cleanup()

	tests := []struct {
		name      string
		condition string
		variables map[string]interface{}
		expected  bool
		hasError  bool
	}{
		{
			name:      "Simple true condition",
			condition: "x > 5",
			variables: map[string]interface{}{"x": 10},
			expected:  true,
			hasError:  false,
		},
		{
			name:      "Simple false condition",
			condition: "x > 5",
			variables: map[string]interface{}{"x": 3},
			expected:  false,
			hasError:  false,
		},
		{
			name:      "String comparison",
			condition: "status == 'active'",
			variables: map[string]interface{}{"status": "active"},
			expected:  true,
			hasError:  false,
		},
		{
			name:      "Empty condition",
			condition: "",
			variables: map[string]interface{}{},
			expected:  true,
			hasError:  false,
		},
		{
			name:      "Invalid condition",
			condition: "x >",
			variables: map[string]interface{}{"x": 10},
			expected:  false,
			hasError:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := engineSvc.evaluateCondition(tt.condition, tt.variables)
			if tt.hasError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expected, result)
			}
		})
	}
}

func TestWorkflowEngineService_AdvanceToNextNode_ExclusiveGateway(t *testing.T) {
	engineSvc, _, cleanup := setupWorkflowEngineServiceTest(t)
	defer cleanup()

	// Create a workflow definition with ExclusiveGateway
	bpmnXML := `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="Process_1" name="Test Process">
    <bpmn:exclusiveGateway id="Gateway_1" name="Decision">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
      <bpmn:outgoing>Flow_3</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:userTask id="Task_1" name="Task 1">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:userTask>
    <bpmn:userTask id="Task_2" name="Task 2">
      <bpmn:incoming>Flow_3</bpmn:incoming>
    </bpmn:userTask>
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Gateway_1" targetRef="Task_1">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">x > 5</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="Flow_3" sourceRef="Gateway_1" targetRef="Task_2"/>
  </bpmn:process>
</bpmn:definitions>`

	wd, err := parser.ParseBPMN(bpmnXML)
	require.NoError(t, err)

	// Manually add condition expression to Flow_2
	if flow, exists := wd.SequenceFlows["Flow_2"]; exists {
		flow.ConditionExpression = "x > 5"
		wd.SequenceFlows["Flow_2"] = flow
	}

	gateway := wd.Nodes["Gateway_1"]
	variables := map[string]interface{}{"x": 10}

	ctx := context.Background()
	nextNodeIds, err := engineSvc.advanceToNextNode(ctx, wd, &gateway, variables)

	require.NoError(t, err)
	assert.NotEmpty(t, nextNodeIds)
	// Should select Flow_2 because condition is true
	assert.Equal(t, "Task_1", nextNodeIds[0])
}

func TestWorkflowEngineService_CheckAndHandleRollback_OtherNode_NoRollback(t *testing.T) {
	engineSvc, _, cleanup := setupWorkflowEngineServiceTest(t)
	defer cleanup()

	// Create a simple workflow definition
	wd := &models.WorkflowDefinition{
		Nodes: map[string]models.Node{
			"ServiceTask_1": {
				Id:          "ServiceTask_1",
				Type:        parser.NodeTypeServiceTask,
				CanFallback: true,
			},
		},
		AdjacencyList:        make(map[string][]string),
		ReverseAdjacencyList: make(map[string][]string),
	}

	node := wd.Nodes["ServiceTask_1"]
	currentNodeIds := []string{"ServiceTask_1"}

	action, err := engineSvc.CheckAndHandleRollback(wd, &node, currentNodeIds)

	require.NoError(t, err)
	assert.NotNil(t, action)
	assert.False(t, action.NeedsRollback)
}

func TestWorkflowEngineService_CheckAndHandleRollback_OtherNode_NeedsRollback(t *testing.T) {
	engineSvc, _, cleanup := setupWorkflowEngineServiceTest(t)
	defer cleanup()

	// Create a workflow definition where fromNode is before currentNodes
	wd := &models.WorkflowDefinition{
		Nodes: map[string]models.Node{
			"ServiceTask_1": {
				Id:          "ServiceTask_1",
				Type:        parser.NodeTypeServiceTask,
				CanFallback: true,
			},
			"ServiceTask_2": {
				Id:          "ServiceTask_2",
				Type:        parser.NodeTypeServiceTask,
				CanFallback: true,
			},
		},
		AdjacencyList: map[string][]string{
			"ServiceTask_1": {"ServiceTask_2"},
		},
		ReverseAdjacencyList: map[string][]string{
			"ServiceTask_2": {"ServiceTask_1"},
		},
	}

	// fromNode is ServiceTask_1, but current is at ServiceTask_2 (after ServiceTask_1)
	node := wd.Nodes["ServiceTask_1"]
	currentNodeIds := []string{"ServiceTask_2"}

	action, err := engineSvc.CheckAndHandleRollback(wd, &node, currentNodeIds)

	require.NoError(t, err)
	assert.NotNil(t, action)
	assert.True(t, action.NeedsRollback)
	assert.Equal(t, []string{"ServiceTask_1"}, action.TargetNodeIds)
}

func TestWorkflowEngineService_CheckAndHandleRollback_OtherNode_SkippedStep(t *testing.T) {
	engineSvc, _, cleanup := setupWorkflowEngineServiceTest(t)
	defer cleanup()

	// Create a workflow definition where fromNode is after currentNodes (skip step)
	wd := &models.WorkflowDefinition{
		Nodes: map[string]models.Node{
			"ServiceTask_1": {
				Id:          "ServiceTask_1",
				Type:        parser.NodeTypeServiceTask,
				CanFallback: true,
			},
			"ServiceTask_2": {
				Id:          "ServiceTask_2",
				Type:        parser.NodeTypeServiceTask,
				CanFallback: true,
			},
		},
		AdjacencyList: map[string][]string{
			"ServiceTask_1": {"ServiceTask_2"},
		},
		ReverseAdjacencyList: map[string][]string{
			"ServiceTask_2": {"ServiceTask_1"},
		},
	}

	// fromNode is ServiceTask_2, but current is at ServiceTask_1 (before ServiceTask_2) - skip step!
	node := wd.Nodes["ServiceTask_2"]
	currentNodeIds := []string{"ServiceTask_1"}

	action, err := engineSvc.CheckAndHandleRollback(wd, &node, currentNodeIds)

	assert.Error(t, err)
	assert.Nil(t, action)
	assert.Contains(t, err.Error(), models.ErrSkippedStep)
}

func TestWorkflowEngineService_CheckAndHandleRollback_BoundaryEvent_NoRollback(t *testing.T) {
	engineSvc, _, cleanup := setupWorkflowEngineServiceTest(t)
	defer cleanup()

	// Create a workflow definition with BoundaryEvent
	wd := &models.WorkflowDefinition{
		Nodes: map[string]models.Node{
			"UserTask_1": {
				Id:          "UserTask_1",
				Type:        parser.NodeTypeUserTask,
				CanFallback: true,
			},
			"BoundaryEvent_1": {
				Id:             "BoundaryEvent_1",
				Type:           parser.NodeTypeBoundaryEvent,
				AttachedNodeId: "UserTask_1",
				CanFallback:    true,
			},
		},
		AdjacencyList:        make(map[string][]string),
		ReverseAdjacencyList: make(map[string][]string),
	}

	// Attached node is current node - no rollback needed
	node := wd.Nodes["BoundaryEvent_1"]
	currentNodeIds := []string{"UserTask_1"}

	action, err := engineSvc.CheckAndHandleRollback(wd, &node, currentNodeIds)

	require.NoError(t, err)
	assert.NotNil(t, action)
	assert.False(t, action.NeedsRollback)
}

func TestWorkflowEngineService_CheckAndHandleRollback_BoundaryEvent_NeedsRollback(t *testing.T) {
	engineSvc, _, cleanup := setupWorkflowEngineServiceTest(t)
	defer cleanup()

	// Create a workflow definition with BoundaryEvent
	wd := &models.WorkflowDefinition{
		Nodes: map[string]models.Node{
			"UserTask_1": {
				Id:          "UserTask_1",
				Type:        parser.NodeTypeUserTask,
				CanFallback: true,
			},
			"UserTask_2": {
				Id:          "UserTask_2",
				Type:        parser.NodeTypeUserTask,
				CanFallback: true,
			},
			"BoundaryEvent_1": {
				Id:             "BoundaryEvent_1",
				Type:           parser.NodeTypeBoundaryEvent,
				AttachedNodeId: "UserTask_1",
				CanFallback:    true,
			},
		},
		AdjacencyList:        make(map[string][]string),
		ReverseAdjacencyList: make(map[string][]string),
	}

	// Attached node is not current node - rollback to attached node
	node := wd.Nodes["BoundaryEvent_1"]
	currentNodeIds := []string{"UserTask_2"}

	action, err := engineSvc.CheckAndHandleRollback(wd, &node, currentNodeIds)

	require.NoError(t, err)
	assert.NotNil(t, action)
	assert.True(t, action.NeedsRollback)
	assert.Equal(t, []string{"UserTask_1"}, action.TargetNodeIds)
}

func TestWorkflowEngineService_CheckAndHandleRollback_BoundaryEvent_NoAttachment(t *testing.T) {
	engineSvc, _, cleanup := setupWorkflowEngineServiceTest(t)
	defer cleanup()

	// Create a workflow definition with BoundaryEvent without attachment
	wd := &models.WorkflowDefinition{
		Nodes: map[string]models.Node{
			"BoundaryEvent_1": {
				Id:             "BoundaryEvent_1",
				Type:           parser.NodeTypeBoundaryEvent,
				AttachedNodeId: "", // No attachment!
				CanFallback:    true,
			},
		},
		AdjacencyList:        make(map[string][]string),
		ReverseAdjacencyList: make(map[string][]string),
	}

	node := wd.Nodes["BoundaryEvent_1"]
	currentNodeIds := []string{"SomeNode"}

	action, err := engineSvc.CheckAndHandleRollback(wd, &node, currentNodeIds)

	assert.Error(t, err)
	assert.Nil(t, action)
	assert.Contains(t, err.Error(), models.ErrBoundaryEventNoAttachment)
}

func TestWorkflowEngineService_CheckAndHandleRollback_IntermediateCatchEvent_NoRollback(t *testing.T) {
	engineSvc, _, cleanup := setupWorkflowEngineServiceTest(t)
	defer cleanup()

	// Create a workflow definition with IntermediateCatchEvent
	wd := &models.WorkflowDefinition{
		Nodes: map[string]models.Node{
			"IntermediateCatchEvent_1": {
				Id:          "IntermediateCatchEvent_1",
				Type:        parser.NodeTypeIntermediateCatchEvent,
				CanFallback: true,
			},
		},
		AdjacencyList:        make(map[string][]string),
		ReverseAdjacencyList: make(map[string][]string),
	}

	// fromNode is current node - no rollback needed
	node := wd.Nodes["IntermediateCatchEvent_1"]
	currentNodeIds := []string{"IntermediateCatchEvent_1"}

	action, err := engineSvc.CheckAndHandleRollback(wd, &node, currentNodeIds)

	require.NoError(t, err)
	assert.NotNil(t, action)
	assert.False(t, action.NeedsRollback)
}

func TestWorkflowEngineService_CheckAndHandleRollback_IntermediateCatchEvent_FromEventBasedGateway(t *testing.T) {
	engineSvc, _, cleanup := setupWorkflowEngineServiceTest(t)
	defer cleanup()

	// Create a workflow definition with EventBasedGateway -> IntermediateCatchEvent
	wd := &models.WorkflowDefinition{
		Nodes: map[string]models.Node{
			"EventBasedGateway_1": {
				Id:          "EventBasedGateway_1",
				Type:        parser.NodeTypeEventBasedGateway,
				CanFallback: true,
			},
			"IntermediateCatchEvent_1": {
				Id:          "IntermediateCatchEvent_1",
				Type:        parser.NodeTypeIntermediateCatchEvent,
				CanFallback: true,
			},
		},
		AdjacencyList: map[string][]string{
			"EventBasedGateway_1": {"IntermediateCatchEvent_1"},
		},
		ReverseAdjacencyList: map[string][]string{
			"IntermediateCatchEvent_1": {"EventBasedGateway_1"},
		},
	}

	// EventBasedGateway is current node, executing from IntermediateCatchEvent - no rollback needed
	node := wd.Nodes["IntermediateCatchEvent_1"]
	currentNodeIds := []string{"EventBasedGateway_1"}

	action, err := engineSvc.CheckAndHandleRollback(wd, &node, currentNodeIds)

	require.NoError(t, err)
	assert.NotNil(t, action)
	assert.False(t, action.NeedsRollback)
}

func TestWorkflowEngineService_ShouldAutoAdvance(t *testing.T) {
	engineSvc, _, cleanup := setupWorkflowEngineServiceTest(t)
	defer cleanup()

	tests := []struct {
		name     string
		nodeType uint32
		expected bool
	}{
		{
			name:     "UserTask should not auto-advance",
			nodeType: parser.NodeTypeUserTask,
			expected: false,
		},
		{
			name:     "IntermediateCatchEvent should not auto-advance",
			nodeType: parser.NodeTypeIntermediateCatchEvent,
			expected: false,
		},
		{
			name:     "EventBasedGateway should not auto-advance",
			nodeType: parser.NodeTypeEventBasedGateway,
			expected: false,
		},
		{
			name:     "ServiceTask should auto-advance",
			nodeType: parser.NodeTypeServiceTask,
			expected: true,
		},
		{
			name:     "ExclusiveGateway should auto-advance",
			nodeType: parser.NodeTypeExclusiveGateway,
			expected: true,
		},
		{
			name:     "StartEvent should auto-advance",
			nodeType: parser.NodeTypeStartEvent,
			expected: true,
		},
		{
			name:     "EndEvent should auto-advance",
			nodeType: parser.NodeTypeEndEvent,
			expected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := engineSvc.shouldAutoAdvance(tt.nodeType)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestWorkflowEngineService_CheckAndHandleRollback_FallbackNotAllowed(t *testing.T) {
	engineSvc, _, cleanup := setupWorkflowEngineServiceTest(t)
	defer cleanup()

	// Create a workflow definition where rollback is not allowed
	wd := &models.WorkflowDefinition{
		Nodes: map[string]models.Node{
			"ServiceTask_1": {
				Id:          "ServiceTask_1",
				Type:        parser.NodeTypeServiceTask,
				CanFallback: false, // Fallback not allowed!
			},
			"ServiceTask_2": {
				Id:          "ServiceTask_2",
				Type:        parser.NodeTypeServiceTask,
				CanFallback: true,
			},
		},
		AdjacencyList: map[string][]string{
			"ServiceTask_1": {"ServiceTask_2"},
		},
		ReverseAdjacencyList: map[string][]string{
			"ServiceTask_2": {"ServiceTask_1"},
		},
	}

	// fromNode is ServiceTask_1, but current is at ServiceTask_2 - would need rollback but not allowed
	node := wd.Nodes["ServiceTask_1"]
	currentNodeIds := []string{"ServiceTask_2"}

	action, err := engineSvc.CheckAndHandleRollback(wd, &node, currentNodeIds)

	assert.Error(t, err)
	assert.Nil(t, action)
	assert.Contains(t, err.Error(), models.ErrFallbackNotAllowed)
}


// ========================================
// Current Node IDs Auto-Initialization Tests
// ========================================

// TestExecuteFromNode_AutoInitializeCurrentNodeIds tests that current_node_ids
// is automatically initialized with start events when empty
func TestExecuteFromNode_AutoInitializeCurrentNodeIds(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	logger := zerolog.Nop()
	database := database.NewDatabase(&logger)
	database.DB = db

	workflowSvc := NewWorkflowService(database, &logger)
	instanceSvc := NewWorkflowInstanceService(database, &logger)
	executionSvc := NewWorkflowExecutionService(database, &logger)
	engineSvc := NewWorkflowEngineService(database, &logger, workflowSvc, instanceSvc, executionSvc)

	ctx := context.Background()
	instanceId := "test-instance-id"
	workflowId := "test-workflow-id"
	fromNodeId := "StartEvent_1"
	now := time.Now()

	bpmnXML := `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="Process_1" name="Test Process">
    <bpmn:startEvent id="StartEvent_1" name="Start">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:endEvent id="EndEvent_1" name="End">
      <bpmn:incoming>Flow_1</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="EndEvent_1"/>
  </bpmn:process>
</bpmn:definitions>`

	// Mock: Get workflow instance with EMPTY current_node_ids
	mock.ExpectQuery(`SELECT id, workflow_id, name, status, current_node_ids, instance_version, created_at, updated_at`).
		WithArgs(instanceId).
		WillReturnRows(sqlmock.NewRows([]string{"id", "workflow_id", "name", "status", "current_node_ids", "instance_version", "created_at", "updated_at"}).
			AddRow(instanceId, workflowId, "Test Instance", models.InstanceStatusRunning, pq.Array([]string{}), 1, now, now))

	// Mock: Get workflow definition
	mock.ExpectQuery(`SELECT id, name, description, bpmn_xml, version, status, created_by, created_at, updated_at`).
		WithArgs(workflowId).
		WillReturnRows(sqlmock.NewRows([]string{"id", "name", "description", "bpmn_xml", "version", "status", "created_by", "created_at", "updated_at"}).
			AddRow(workflowId, "Test Workflow", "", bpmnXML, "1.0.0", models.StatusDraft, sql.NullString{}, now, now))

	// Mock: Update instance to initialize current_node_ids
	// Args: updated_at, status, current_node_ids, instance_id
	mock.ExpectQuery(`UPDATE workflow_instances`).
		WithArgs(sqlmock.AnyArg(), models.InstanceStatusRunning, sqlmock.AnyArg(), instanceId).
		WillReturnRows(sqlmock.NewRows([]string{"id", "workflow_id", "name", "status", "current_node_ids", "instance_version", "created_at", "updated_at"}).
			AddRow(instanceId, workflowId, "Test Instance", models.InstanceStatusRunning, pq.Array([]string{"StartEvent_1"}), 2, now, now))

	// Mock: Get instance version (for CreateWorkflowExecution)
	mock.ExpectQuery(`SELECT instance_version FROM workflow_instances WHERE id`).
		WithArgs(instanceId).
		WillReturnRows(sqlmock.NewRows([]string{"instance_version"}).AddRow(2))

	// Mock: Create execution
	mock.ExpectQuery(`INSERT INTO workflow_executions`).
		WithArgs(sqlmock.AnyArg(), instanceId, workflowId, models.ExecutionStatusPending, sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"id", "instance_id", "workflow_id", "status", "variables", "execution_version", "started_at", "completed_at", "error_message"}).
			AddRow("exec-1", instanceId, workflowId, models.ExecutionStatusPending, []byte("{}"), 1, now, sql.NullTime{}, sql.NullString{}))

	// Mock: Update execution to Running
	// Args: updated_at, status, execution_id (3 params, no variables, no error)
	mock.ExpectQuery(`UPDATE workflow_executions`).
		WithArgs(sqlmock.AnyArg(), models.ExecutionStatusRunning, sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"id", "instance_id", "workflow_id", "status", "variables", "execution_version", "started_at", "completed_at", "error_message"}).
			AddRow("exec-1", instanceId, workflowId, models.ExecutionStatusRunning, []byte("{}"), 1, now, sql.NullTime{}, sql.NullString{}))

	// Mock: Update execution to Completed
	// Args: updated_at, status, completed_at, variables, execution_id (5 params)
	mock.ExpectQuery(`UPDATE workflow_executions`).
		WithArgs(sqlmock.AnyArg(), models.ExecutionStatusCompleted, sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"id", "instance_id", "workflow_id", "status", "variables", "execution_version", "started_at", "completed_at", "error_message"}).
			AddRow("exec-1", instanceId, workflowId, models.ExecutionStatusCompleted, []byte("{}"), 1, now, sql.NullTime{Valid: true, Time: now}, sql.NullString{}))

	// Mock: Update instance to Completed
	// Args: updated_at, status, current_node_ids (empty for completed), instance_id
	mock.ExpectQuery(`UPDATE workflow_instances`).
		WithArgs(sqlmock.AnyArg(), models.InstanceStatusCompleted, sqlmock.AnyArg(), instanceId).
		WillReturnRows(sqlmock.NewRows([]string{"id", "workflow_id", "name", "status", "current_node_ids", "instance_version", "created_at", "updated_at"}).
			AddRow(instanceId, workflowId, "Test Instance", models.InstanceStatusCompleted, pq.Array([]string{}), 3, now, now))

	// Execute
	result, err := engineSvc.ExecuteFromNode(ctx, instanceId, fromNodeId, nil)

	require.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, models.InstanceStatusCompleted, result.EngineResponse.Status)

	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

// TestExecuteFromNode_NoStartEvents_ReturnsError tests that an error is returned
// when workflow has no start events and current_node_ids is empty
func TestExecuteFromNode_NoStartEvents_ReturnsError(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	logger := zerolog.Nop()
	database := database.NewDatabase(&logger)
	database.DB = db

	workflowSvc := NewWorkflowService(database, &logger)
	instanceSvc := NewWorkflowInstanceService(database, &logger)
	executionSvc := NewWorkflowExecutionService(database, &logger)
	engineSvc := NewWorkflowEngineService(database, &logger, workflowSvc, instanceSvc, executionSvc)

	ctx := context.Background()
	instanceId := "test-instance-id"
	workflowId := "test-workflow-id"
	fromNodeId := "ServiceTask_1"
	now := time.Now()

	// BPMN with NO start events
	bpmnXML := `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="Process_1" name="Test Process">
    <bpmn:serviceTask id="ServiceTask_1" name="Service Task">
      <bpmn:extensionElements>
        <xflow:url xmlns:xflow="http://example.com/bpmn/xflow-extension" value="http://example.com/api/test"/>
      </bpmn:extensionElements>
    </bpmn:serviceTask>
    <bpmn:endEvent id="EndEvent_1" name="End"/>
  </bpmn:process>
</bpmn:definitions>`

	// Mock: Get workflow instance with EMPTY current_node_ids
	mock.ExpectQuery(`SELECT id, workflow_id, name, status, current_node_ids, instance_version, created_at, updated_at`).
		WithArgs(instanceId).
		WillReturnRows(sqlmock.NewRows([]string{"id", "workflow_id", "name", "status", "current_node_ids", "instance_version", "created_at", "updated_at"}).
			AddRow(instanceId, workflowId, "Test Instance", models.InstanceStatusRunning, pq.Array([]string{}), 1, now, now))

	// Mock: Get workflow definition
	mock.ExpectQuery(`SELECT id, name, description, bpmn_xml, version, status, created_by, created_at, updated_at`).
		WithArgs(workflowId).
		WillReturnRows(sqlmock.NewRows([]string{"id", "name", "description", "bpmn_xml", "version", "status", "created_by", "created_at", "updated_at"}).
			AddRow(workflowId, "Test Workflow", "", bpmnXML, "1.0.0", models.StatusDraft, sql.NullString{}, now, now))

	// Execute
	result, err := engineSvc.ExecuteFromNode(ctx, instanceId, fromNodeId, nil)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "workflow has no start events")

	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}
