package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"testing"
	"time"

	"github.com/bpmn-explorer/server/internal/models"
	"github.com/bpmn-explorer/server/pkg/database"
	"github.com/DATA-DOG/go-sqlmock"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupWorkflowExecutionServiceTest(t *testing.T) (*WorkflowExecutionService, sqlmock.Sqlmock, func()) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)

	logger := zerolog.Nop()
	database := database.NewDatabase(&logger)
	database.DB = db

	service := NewWorkflowExecutionService(database, &logger)

	cleanup := func() {
		db.Close()
	}

	return service, mock, cleanup
}

func TestWorkflowExecutionService_CreateWorkflowExecution_Success(t *testing.T) {
	service, mock, cleanup := setupWorkflowExecutionServiceTest(t)
	defer cleanup()

	ctx := context.Background()
	instanceId := "test-instance-id"
	workflowId := "test-workflow-id"
	variables := map[string]interface{}{"key": "value"}
	variablesJSON, _ := json.Marshal(variables)
	now := time.Now()

	// Mock instance version query
	mock.ExpectQuery(`SELECT instance_version FROM workflow_instances`).
		WithArgs(instanceId).
		WillReturnRows(sqlmock.NewRows([]string{"instance_version"}).AddRow(1))

	// Mock execution insert
	mock.ExpectQuery(`INSERT INTO workflow_executions`).
		WithArgs(sqlmock.AnyArg(), instanceId, workflowId, models.ExecutionStatusPending, string(variablesJSON), 1, sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"id", "instance_id", "workflow_id", "status", "variables", "execution_version", "started_at", "completed_at", "error_message"}).
			AddRow("test-execution-id", instanceId, workflowId, models.ExecutionStatusPending, variablesJSON, 1, now, nil, ""))

	execution, err := service.CreateWorkflowExecution(ctx, instanceId, workflowId, variables)

	require.NoError(t, err)
	assert.NotNil(t, execution)
	assert.Equal(t, instanceId, execution.InstanceId)
	assert.Equal(t, workflowId, execution.WorkflowId)
	assert.Equal(t, models.ExecutionStatusPending, execution.Status)
	assert.Equal(t, 1, execution.ExecutionVersion)

	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

func TestWorkflowExecutionService_GetWorkflowExecutionByID_Success(t *testing.T) {
	service, mock, cleanup := setupWorkflowExecutionServiceTest(t)
	defer cleanup()

	ctx := context.Background()
	executionID := "test-execution-id"
	instanceId := "test-instance-id"
	workflowId := "test-workflow-id"
	variables := map[string]interface{}{"key": "value"}
	variablesJSON, _ := json.Marshal(variables)
	now := time.Now()

	mock.ExpectQuery(`SELECT id, instance_id, workflow_id, status, variables, execution_version, started_at, completed_at, error_message`).
		WithArgs(executionID).
		WillReturnRows(sqlmock.NewRows([]string{"id", "instance_id", "workflow_id", "status", "variables", "execution_version", "started_at", "completed_at", "error_message"}).
			AddRow(executionID, instanceId, workflowId, models.ExecutionStatusRunning, variablesJSON, 1, now, nil, ""))

	execution, err := service.GetWorkflowExecutionByID(ctx, executionID)

	require.NoError(t, err)
	assert.NotNil(t, execution)
	assert.Equal(t, executionID, execution.Id)
	assert.Equal(t, instanceId, execution.InstanceId)
	assert.Equal(t, variables["key"], execution.Variables["key"])

	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

func TestWorkflowExecutionService_GetWorkflowExecutionByID_NotFound(t *testing.T) {
	service, mock, cleanup := setupWorkflowExecutionServiceTest(t)
	defer cleanup()

	ctx := context.Background()
	executionID := "nonexistent-id"

	mock.ExpectQuery(`SELECT id, instance_id, workflow_id, status, variables, execution_version, started_at, completed_at, error_message`).
		WithArgs(executionID).
		WillReturnError(sql.ErrNoRows)

	execution, err := service.GetWorkflowExecutionByID(ctx, executionID)

	assert.Nil(t, execution)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), models.ErrWorkflowExecutionNotFound)

	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

func TestWorkflowExecutionService_UpdateWorkflowExecution_Success(t *testing.T) {
	service, mock, cleanup := setupWorkflowExecutionServiceTest(t)
	defer cleanup()

	ctx := context.Background()
	executionID := "test-execution-id"
	newStatus := models.ExecutionStatusCompleted
	newVariables := map[string]interface{}{"newKey": "newValue"}
	newVariablesJSON, _ := json.Marshal(newVariables)
	now := time.Now()
	completedAt := now

	mock.ExpectQuery(`UPDATE workflow_executions`).
		WithArgs(sqlmock.AnyArg(), newStatus, sqlmock.AnyArg(), string(newVariablesJSON), executionID).
		WillReturnRows(sqlmock.NewRows([]string{"id", "instance_id", "workflow_id", "status", "variables", "execution_version", "started_at", "completed_at", "error_message"}).
			AddRow(executionID, "instance-id", "workflow-id", newStatus, newVariablesJSON, 1, now, completedAt, ""))

	execution, err := service.UpdateWorkflowExecution(ctx, executionID, newStatus, newVariables, "")

	require.NoError(t, err)
	assert.NotNil(t, execution)
	assert.Equal(t, newStatus, execution.Status)
	assert.NotNil(t, execution.CompletedAt) // Should be set when status is completed

	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

func TestWorkflowExecutionService_ListWorkflowExecutions_Success(t *testing.T) {
	service, mock, cleanup := setupWorkflowExecutionServiceTest(t)
	defer cleanup()

	ctx := context.Background()
	page := 1
	pageSize := 20
	instanceId := "test-instance-id"
	now := time.Now()

	// Mock count query - need to match the WHERE clause pattern
	// The query uses fmt.Sprintf, so we need to match the pattern
	mock.ExpectQuery(`SELECT COUNT\(\*\) FROM workflow_executions WHERE 1=1 AND instance_id`).
		WithArgs(instanceId).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))

	// Mock list query - need to match the WHERE clause and LIMIT/OFFSET pattern
	mock.ExpectQuery(`SELECT id, instance_id, workflow_id, status, variables, execution_version, started_at, completed_at, error_message`).
		WithArgs(instanceId, pageSize, 0).
		WillReturnRows(sqlmock.NewRows([]string{"id", "instance_id", "workflow_id", "status", "variables", "execution_version", "started_at", "completed_at", "error_message"}).
			AddRow("exec1", instanceId, "workflow1", models.ExecutionStatusCompleted, []byte("{}"), 1, now, sql.NullTime{Valid: true, Time: now}, "").
			AddRow("exec2", instanceId, "workflow1", models.ExecutionStatusRunning, []byte("{}"), 1, now, sql.NullTime{}, ""))

	executions, metadata, err := service.ListWorkflowExecutions(ctx, page, pageSize, instanceId, "", "")

	require.NoError(t, err)
	assert.NotNil(t, executions)
	assert.Len(t, executions, 2)
	assert.NotNil(t, metadata)
	assert.Equal(t, 2, metadata.Total)

	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

