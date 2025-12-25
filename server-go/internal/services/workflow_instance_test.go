package services

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"github.com/bpmn-explorer/server/internal/models"
	"github.com/bpmn-explorer/server/pkg/database"
	"github.com/DATA-DOG/go-sqlmock"
	"github.com/lib/pq"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupWorkflowInstanceServiceTest(t *testing.T) (*WorkflowInstanceService, sqlmock.Sqlmock, func()) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)

	logger := zerolog.Nop()
	database := database.NewDatabase(&logger)
	database.DB = db

	service := NewWorkflowInstanceService(database, &logger)

	cleanup := func() {
		db.Close()
	}

	return service, mock, cleanup
}

func TestWorkflowInstanceService_CreateWorkflowInstance_Success(t *testing.T) {
	service, mock, cleanup := setupWorkflowInstanceServiceTest(t)
	defer cleanup()

	ctx := context.Background()
	workflowId := "test-workflow-id"
	name := "Test Instance"
	now := time.Now()

	mock.ExpectQuery(`INSERT INTO workflow_instances`).
		WithArgs(sqlmock.AnyArg(), workflowId, name, models.InstanceStatusPending, pq.Array([]string{}), 1, sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"id", "workflow_id", "name", "status", "current_node_ids", "instance_version", "created_at", "updated_at"}).
		AddRow("test-instance-id", workflowId, name, models.InstanceStatusPending, pq.Array([]string{}), 1, now, now))

	instance, err := service.CreateWorkflowInstance(ctx, workflowId, name)

	require.NoError(t, err)
	assert.NotNil(t, instance)
	assert.Equal(t, workflowId, instance.WorkflowId)
	assert.Equal(t, name, instance.Name)
	assert.Equal(t, models.InstanceStatusPending, instance.Status)
	assert.Equal(t, 1, instance.InstanceVersion)
	assert.Empty(t, instance.CurrentNodeIds)

	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

func TestWorkflowInstanceService_GetWorkflowInstanceByID_Success(t *testing.T) {
	service, mock, cleanup := setupWorkflowInstanceServiceTest(t)
	defer cleanup()

	ctx := context.Background()
	instanceID := "test-instance-id"
	workflowId := "test-workflow-id"
	name := "Test Instance"
	now := time.Now()

	mock.ExpectQuery(`SELECT id, workflow_id, name, status, current_node_ids, instance_version, created_at, updated_at`).
		WithArgs(instanceID).
		WillReturnRows(sqlmock.NewRows([]string{"id", "workflow_id", "name", "status", "current_node_ids", "instance_version", "created_at", "updated_at"}).
			AddRow(instanceID, workflowId, name, models.InstanceStatusRunning, pq.Array([]string{"node1", "node2"}), 2, now, now))

	instance, err := service.GetWorkflowInstanceByID(ctx, instanceID)

	require.NoError(t, err)
	assert.NotNil(t, instance)
	assert.Equal(t, instanceID, instance.Id)
	assert.Equal(t, workflowId, instance.WorkflowId)
	assert.Len(t, instance.CurrentNodeIds, 2)

	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

func TestWorkflowInstanceService_GetWorkflowInstanceByID_NotFound(t *testing.T) {
	service, mock, cleanup := setupWorkflowInstanceServiceTest(t)
	defer cleanup()

	ctx := context.Background()
	instanceID := "nonexistent-id"

	mock.ExpectQuery(`SELECT id, workflow_id, name, status, current_node_ids, instance_version, created_at, updated_at`).
		WithArgs(instanceID).
		WillReturnError(sql.ErrNoRows)

	instance, err := service.GetWorkflowInstanceByID(ctx, instanceID)

	assert.Nil(t, instance)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), models.ErrWorkflowInstanceNotFound)

	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

func TestWorkflowInstanceService_UpdateWorkflowInstance_Success(t *testing.T) {
	service, mock, cleanup := setupWorkflowInstanceServiceTest(t)
	defer cleanup()

	ctx := context.Background()
	instanceID := "test-instance-id"
	newStatus := models.InstanceStatusRunning
	newNodeIds := []string{"node1", "node2"}
	now := time.Now()

	mock.ExpectQuery(`UPDATE workflow_instances`).
		WithArgs(sqlmock.AnyArg(), newStatus, pq.Array(newNodeIds), instanceID).
		WillReturnRows(sqlmock.NewRows([]string{"id", "workflow_id", "name", "status", "current_node_ids", "instance_version", "created_at", "updated_at"}).
			AddRow(instanceID, "workflow-id", "Test", newStatus, pq.Array(newNodeIds), 2, now, now))

	instance, err := service.UpdateWorkflowInstance(ctx, instanceID, newStatus, newNodeIds)

	require.NoError(t, err)
	assert.NotNil(t, instance)
	assert.Equal(t, newStatus, instance.Status)
	assert.Equal(t, 2, instance.InstanceVersion) // Should be incremented
	assert.Len(t, instance.CurrentNodeIds, 2)

	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

