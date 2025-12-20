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

	// Mock: Get workflow instance
	mock.ExpectQuery(`SELECT id, workflow_id, name, status, current_node_ids, instance_version, created_at, updated_at`).
		WithArgs(instanceId).
		WillReturnRows(sqlmock.NewRows([]string{"id", "workflow_id", "name", "status", "current_node_ids", "instance_version", "created_at", "updated_at"}).
			AddRow(instanceId, workflowId, "Test Instance", models.InstanceStatusRunning, pq.Array([]string{}), 1, now, now))

	// Mock: Get workflow definition
	mock.ExpectQuery(`SELECT id, name, description, bpmn_xml, version, status, created_by, created_at, updated_at`).
		WithArgs(workflowId).
		WillReturnRows(sqlmock.NewRows([]string{"id", "name", "description", "bpmn_xml", "version", "status", "created_by", "created_at", "updated_at"}).
			AddRow(workflowId, "Test Workflow", "", bpmnXML, "1.0.0", models.StatusDraft, sql.NullString{}, now, now))

	// Mock: List executions - COUNT query (no executions found, will create new)
	mock.ExpectQuery(`SELECT COUNT\(\*\) FROM workflow_executions WHERE 1=1 AND instance_id = \$1`).
		WithArgs(instanceId).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))

	// Mock: Create execution
	mock.ExpectQuery(`INSERT INTO workflow_executions`).
		WithArgs(sqlmock.AnyArg(), instanceId, workflowId, models.ExecutionStatusPending, sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"id", "instance_id", "workflow_id", "status", "variables", "execution_version", "started_at", "completed_at", "error_message"}).
			AddRow("exec-1", instanceId, workflowId, models.ExecutionStatusPending, []byte("{}"), 1, now, sql.NullTime{Valid: false}, sql.NullString{Valid: false}))

	// Mock: Get instance version
	mock.ExpectQuery(`SELECT instance_version FROM workflow_instances WHERE id = \$1`).
		WithArgs(instanceId).
		WillReturnRows(sqlmock.NewRows([]string{"instance_version"}).AddRow(1))

	// Mock: Update execution
	mock.ExpectQuery(`UPDATE workflow_executions`).
		WithArgs(sqlmock.AnyArg(), models.ExecutionStatusRunning, sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"id", "instance_id", "workflow_id", "status", "variables", "execution_version", "started_at", "completed_at", "error_message"}).
			AddRow("exec-1", instanceId, workflowId, models.ExecutionStatusRunning, []byte(`{"businessResponse":{"statusCode":200,"body":{"result":"success","data":"test data"},"headers":{}}}`), 1, now, sql.NullTime{}, sql.NullString{}))

	// Mock: Update instance
	mock.ExpectQuery(`UPDATE workflow_instances`).
		WithArgs(sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"id", "workflow_id", "name", "status", "current_node_ids", "instance_version", "created_at", "updated_at"}).
			AddRow(instanceId, workflowId, "Test Instance", models.InstanceStatusRunning, pq.Array([]string{"EndEvent_1"}), 2, now, now))

	// Execute
	result, err := engineSvc.ExecuteFromNode(ctx, instanceId, fromNodeId, map[string]interface{}{"param": "value"})

	require.NoError(t, err)
	assert.NotNil(t, result)
	assert.NotNil(t, result.BusinessResponse)
	assert.Equal(t, http.StatusOK, result.BusinessResponse.StatusCode)
	assert.NotNil(t, result.EngineResponse)
	assert.Equal(t, instanceId, result.EngineResponse.InstanceId)
	assert.Equal(t, []string{"EndEvent_1"}, result.EngineResponse.CurrentNodeIds)

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

	// Mock: List executions - COUNT query (no executions found, will create new)
	mock.ExpectQuery(`SELECT COUNT\(\*\) FROM workflow_executions WHERE 1=1 AND instance_id = \$1`).
		WithArgs(instanceId).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))

	// Mock: List executions - SELECT query (returns empty)
	mock.ExpectQuery(`SELECT id, instance_id, workflow_id, status, variables, execution_version, started_at, completed_at, error_message`).
		WithArgs(instanceId, 1, 0).
		WillReturnRows(sqlmock.NewRows([]string{"id", "instance_id", "workflow_id", "status", "variables", "execution_version", "started_at", "completed_at", "error_message"}))

	// Mock: Get instance version (for CreateWorkflowExecution)
	mock.ExpectQuery(`SELECT instance_version FROM workflow_instances WHERE id = \$1`).
		WithArgs(instanceId).
		WillReturnRows(sqlmock.NewRows([]string{"instance_version"}).AddRow(1))

	// Mock: Create execution
	mock.ExpectQuery(`INSERT INTO workflow_executions`).
		WithArgs(sqlmock.AnyArg(), instanceId, workflowId, models.ExecutionStatusPending, sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"id", "instance_id", "workflow_id", "status", "variables", "execution_version", "started_at", "completed_at", "error_message"}).
			AddRow("exec-1", instanceId, workflowId, models.ExecutionStatusPending, []byte("{}"), 1, now, sql.NullTime{Valid: false}, sql.NullString{Valid: false}))

	// Mock: Update execution (first update to running)
	mock.ExpectQuery(`UPDATE workflow_executions`).
		WithArgs(sqlmock.AnyArg(), models.ExecutionStatusRunning, sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"id", "instance_id", "workflow_id", "status", "variables", "execution_version", "started_at", "completed_at", "error_message"}).
			AddRow("exec-1", instanceId, workflowId, models.ExecutionStatusRunning, []byte("{}"), 1, now, sql.NullTime{Valid: false}, sql.NullString{Valid: false}))

	// Mock: Update execution (completed - when reaching EndEvent)
	mock.ExpectQuery(`UPDATE workflow_executions`).
		WithArgs(sqlmock.AnyArg(), models.ExecutionStatusCompleted, sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"id", "instance_id", "workflow_id", "status", "variables", "execution_version", "started_at", "completed_at", "error_message"}).
			AddRow("exec-1", instanceId, workflowId, models.ExecutionStatusCompleted, []byte("{}"), 1, now, sql.NullTime{Valid: true, Time: now}, sql.NullString{Valid: false}))

	// Mock: Update instance (completed)
	mock.ExpectQuery(`UPDATE workflow_instances`).
		WithArgs(sqlmock.AnyArg(), sqlmock.AnyArg()).
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

