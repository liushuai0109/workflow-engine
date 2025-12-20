package services

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"github.com/bpmn-explorer/server/internal/models"
	"github.com/bpmn-explorer/server/pkg/database"
	"github.com/DATA-DOG/go-sqlmock"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupWorkflowServiceTest(t *testing.T) (*WorkflowService, sqlmock.Sqlmock, func()) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)

	logger := zerolog.Nop()
	database := database.NewDatabase(&logger)
	database.DB = db

	service := NewWorkflowService(database, &logger)

	cleanup := func() {
		db.Close()
	}

	return service, mock, cleanup
}

func TestWorkflowService_CreateWorkflow_Success(t *testing.T) {
	service, mock, cleanup := setupWorkflowServiceTest(t)
	defer cleanup()

	ctx := context.Background()
	name := "Test Workflow"
	description := "Test Description"
	xml := "<bpmn>...</bpmn>"
	now := time.Now()

	mock.ExpectQuery(`INSERT INTO workflows`).
		WithArgs(sqlmock.AnyArg(), name, description, xml, "1.0.0", models.StatusDraft, sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"id", "name", "description", "bpmn_xml", "version", "status", "created_by", "created_at", "updated_at"}).
			AddRow("test-id", name, description, xml, "1.0.0", models.StatusDraft, sql.NullString{}, now, now))

	workflow, err := service.CreateWorkflow(ctx, name, description, xml)

	require.NoError(t, err)
	assert.NotNil(t, workflow)
	assert.Equal(t, name, workflow.Name)
	assert.Equal(t, description, workflow.Description)
	assert.Equal(t, xml, workflow.BpmnXml)
	assert.Equal(t, models.StatusDraft, workflow.Status)

	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

func TestWorkflowService_GetWorkflowByID_Success(t *testing.T) {
	service, mock, cleanup := setupWorkflowServiceTest(t)
	defer cleanup()

	ctx := context.Background()
	workflowID := "test-workflow-id"
	name := "Test Workflow"
	xml := "<bpmn>...</bpmn>"
	now := time.Now()

	mock.ExpectQuery(`SELECT id, name, description, bpmn_xml, version, status, created_by, created_at, updated_at`).
		WithArgs(workflowID).
		WillReturnRows(sqlmock.NewRows([]string{"id", "name", "description", "bpmn_xml", "version", "status", "created_by", "created_at", "updated_at"}).
			AddRow(workflowID, name, "", xml, "1.0.0", models.StatusDraft, sql.NullString{}, now, now))

	workflow, err := service.GetWorkflowByID(ctx, workflowID)

	require.NoError(t, err)
	assert.NotNil(t, workflow)
	assert.Equal(t, workflowID, workflow.Id)
	assert.Equal(t, name, workflow.Name)
	assert.Equal(t, xml, workflow.BpmnXml)

	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

func TestWorkflowService_GetWorkflowByID_NotFound(t *testing.T) {
	service, mock, cleanup := setupWorkflowServiceTest(t)
	defer cleanup()

	ctx := context.Background()
	workflowID := "nonexistent-id"

	mock.ExpectQuery(`SELECT id, name, description, bpmn_xml, version, status, created_by, created_at, updated_at`).
		WithArgs(workflowID).
		WillReturnError(sql.ErrNoRows)

	workflow, err := service.GetWorkflowByID(ctx, workflowID)

	assert.Nil(t, workflow)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), models.ErrWorkflowNotFound)

	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

func TestWorkflowService_UpdateWorkflow_Success(t *testing.T) {
	service, mock, cleanup := setupWorkflowServiceTest(t)
	defer cleanup()

	ctx := context.Background()
	workflowID := "test-workflow-id"
	newName := "Updated Workflow"
	newXml := "<bpmn>updated</bpmn>"
	now := time.Now()

	mock.ExpectQuery(`UPDATE workflows`).
		WithArgs(sqlmock.AnyArg(), newName, newXml, workflowID).
		WillReturnRows(sqlmock.NewRows([]string{"id", "name", "description", "bpmn_xml", "version", "status", "created_by", "created_at", "updated_at"}).
			AddRow(workflowID, newName, "", newXml, "1.0.0", models.StatusDraft, sql.NullString{}, now, now))

	workflow, err := service.UpdateWorkflow(ctx, workflowID, newName, "", newXml)

	require.NoError(t, err)
	assert.NotNil(t, workflow)
	assert.Equal(t, newName, workflow.Name)
	assert.Equal(t, newXml, workflow.BpmnXml)

	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

func TestWorkflowService_ListWorkflows_Success(t *testing.T) {
	service, mock, cleanup := setupWorkflowServiceTest(t)
	defer cleanup()

	ctx := context.Background()
	page := 1
	pageSize := 20
	now := time.Now()

	// Mock count query
	mock.ExpectQuery(`SELECT COUNT\(\*\) FROM workflows`).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))

	// Mock list query
	mock.ExpectQuery(`SELECT id, name, description, bpmn_xml, version, status, created_by, created_at, updated_at`).
		WithArgs(pageSize, 0).
		WillReturnRows(sqlmock.NewRows([]string{"id", "name", "description", "bpmn_xml", "version", "status", "created_by", "created_at", "updated_at"}).
			AddRow("id1", "Workflow 1", "", "<bpmn>1</bpmn>", "1.0.0", models.StatusDraft, sql.NullString{}, now, now).
			AddRow("id2", "Workflow 2", "", "<bpmn>2</bpmn>", "1.0.0", models.StatusActive, sql.NullString{}, now, now))

	workflows, metadata, err := service.ListWorkflows(ctx, page, pageSize)

	require.NoError(t, err)
	assert.NotNil(t, workflows)
	assert.Len(t, workflows, 2)
	assert.NotNil(t, metadata)
	assert.Equal(t, page, metadata.Page)
	assert.Equal(t, pageSize, metadata.PageSize)
	assert.Equal(t, 2, metadata.Total)

	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

