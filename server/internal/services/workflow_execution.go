package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/bpmn-explorer/server/internal/models"
	"github.com/bpmn-explorer/server/pkg/database"
	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/rs/zerolog"
)

// WorkflowExecutionService handles workflow execution business logic
type WorkflowExecutionService struct {
	db     *database.Database
	logger *zerolog.Logger
}

// NewWorkflowExecutionService creates a new WorkflowExecutionService
func NewWorkflowExecutionService(db *database.Database, logger *zerolog.Logger) *WorkflowExecutionService {
	return &WorkflowExecutionService{
		db:     db,
		logger: logger,
	}
}

// CreateWorkflowExecution creates a new workflow execution
func (s *WorkflowExecutionService) CreateWorkflowExecution(ctx context.Context, instanceId, workflowId string, variables map[string]interface{}) (*models.WorkflowExecution, error) {
	if s.db.DB == nil {
		return nil, fmt.Errorf("database not available")
	}

	// Generate UUID
	id := uuid.New().String()

	// Serialize variables to JSON
	variablesJSON, err := json.Marshal(variables)
	if err != nil {
		s.logger.Error().Err(err).Msg("Failed to marshal variables")
		return nil, fmt.Errorf("failed to marshal variables: %w", err)
	}

	// Get instance version for execution version
	var instanceVersion int
	instanceQuery := `SELECT instance_version FROM workflow_instances WHERE id = $1`
	err = s.db.QueryRowContext(ctx, instanceQuery, instanceId).Scan(&instanceVersion)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("%s: %s", models.ErrWorkflowInstanceNotFound, "workflow instance not found")
		}
		return nil, fmt.Errorf("failed to get instance version: %w", err)
	}

	// Insert into database
	query := `
		INSERT INTO workflow_executions (id, instance_id, workflow_id, status, variables, execution_version, started_at)
		VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
		RETURNING id, instance_id, workflow_id, status, variables, execution_version, started_at, completed_at, error_message
	`

	now := time.Now()
	var execution models.WorkflowExecution
	var variablesBytes []byte
	var completedAt sql.NullTime
	var errorMessage sql.NullString

	err = s.db.QueryRowContext(ctx, query,
		id, instanceId, workflowId, models.ExecutionStatusPending, string(variablesJSON), instanceVersion, now,
	).Scan(
		&execution.Id,
		&execution.InstanceId,
		&execution.WorkflowId,
		&execution.Status,
		&variablesBytes,
		&execution.ExecutionVersion,
		&execution.StartedAt,
		&completedAt,
		&errorMessage,
	)

	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok {
			switch pqErr.Code {
			case "23503": // foreign_key_violation
				s.logger.Error().Err(err).Msg("Foreign key violation")
				return nil, fmt.Errorf("%s: %s", models.ErrForeignKeyViolation, pqErr.Message)
			}
		}
		s.logger.Error().Err(err).Msg("Failed to create workflow execution")
		return nil, fmt.Errorf("failed to create workflow execution: %w", err)
	}

	// Unmarshal variables
	if len(variablesBytes) > 0 {
		if err := json.Unmarshal(variablesBytes, &execution.Variables); err != nil {
			s.logger.Error().Err(err).Msg("Failed to unmarshal variables")
			return nil, fmt.Errorf("failed to unmarshal variables: %w", err)
		}
	} else {
		execution.Variables = make(map[string]interface{})
	}

	// Handle completed_at
	if completedAt.Valid {
		execution.CompletedAt = &completedAt.Time
	}

	s.logger.Info().Str("executionId", execution.Id).Str("instanceId", instanceId).Msg("Workflow execution created")
	return &execution, nil
}

// GetWorkflowExecutionByID retrieves a workflow execution by ID
func (s *WorkflowExecutionService) GetWorkflowExecutionByID(ctx context.Context, executionID string) (*models.WorkflowExecution, error) {
	if s.db.DB == nil {
		return nil, fmt.Errorf("database not available")
	}

	query := `
		SELECT id, instance_id, workflow_id, status, variables, execution_version, started_at, completed_at, error_message
		FROM workflow_executions
		WHERE id = $1
	`

	var execution models.WorkflowExecution
	var variablesBytes []byte
	var completedAt sql.NullTime
	var errorMessage sql.NullString

	err := s.db.QueryRowContext(ctx, query, executionID).Scan(
		&execution.Id,
		&execution.InstanceId,
		&execution.WorkflowId,
		&execution.Status,
		&variablesBytes,
		&execution.ExecutionVersion,
		&execution.StartedAt,
		&completedAt,
		&errorMessage,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			s.logger.Warn().Str("executionId", executionID).Msg("Workflow execution not found")
			return nil, fmt.Errorf("%s: %s", models.ErrWorkflowExecutionNotFound, "workflow execution not found")
		}
		s.logger.Error().Err(err).Str("executionId", executionID).Msg("Failed to get workflow execution")
		return nil, fmt.Errorf("failed to get workflow execution: %w", err)
	}

	// Unmarshal variables
	if len(variablesBytes) > 0 {
		if err := json.Unmarshal(variablesBytes, &execution.Variables); err != nil {
			s.logger.Error().Err(err).Msg("Failed to unmarshal variables")
			return nil, fmt.Errorf("failed to unmarshal variables: %w", err)
		}
	} else {
		execution.Variables = make(map[string]interface{})
	}

	// Handle completed_at
	if completedAt.Valid {
		execution.CompletedAt = &completedAt.Time
	}

	// Handle error_message
	if errorMessage.Valid {
		execution.ErrorMessage = errorMessage.String
	}

	return &execution, nil
}

// UpdateWorkflowExecution updates a workflow execution
func (s *WorkflowExecutionService) UpdateWorkflowExecution(ctx context.Context, executionID string, status string, variables map[string]interface{}, errorMessage string) (*models.WorkflowExecution, error) {
	if s.db.DB == nil {
		return nil, fmt.Errorf("database not available")
	}

	// Build update query
	query := `
		UPDATE workflow_executions
		SET updated_at = $1
	`
	args := []interface{}{time.Now()}
	argIndex := 2

	if status != "" {
		query += fmt.Sprintf(", status = $%d", argIndex)
		args = append(args, status)
		argIndex++

		// Set completed_at if status is completed or failed
		if status == models.ExecutionStatusCompleted || status == models.ExecutionStatusFailed {
			query += fmt.Sprintf(", completed_at = $%d", argIndex)
			args = append(args, time.Now())
			argIndex++
		}
	}

	if variables != nil {
		variablesJSON, err := json.Marshal(variables)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal variables: %w", err)
		}
		query += fmt.Sprintf(", variables = variables || $%d::jsonb", argIndex)
		args = append(args, string(variablesJSON))
		argIndex++
	}

	if errorMessage != "" {
		query += fmt.Sprintf(", error_message = $%d", argIndex)
		args = append(args, errorMessage)
		argIndex++
	}

	query += fmt.Sprintf(`
		WHERE id = $%d
		RETURNING id, instance_id, workflow_id, status, variables, execution_version, started_at, completed_at, error_message
	`, argIndex)
	args = append(args, executionID)

	var execution models.WorkflowExecution
	var variablesBytes []byte
	var completedAt sql.NullTime
	var errorMessageNull sql.NullString

	err := s.db.QueryRowContext(ctx, query, args...).Scan(
		&execution.Id,
		&execution.InstanceId,
		&execution.WorkflowId,
		&execution.Status,
		&variablesBytes,
		&execution.ExecutionVersion,
		&execution.StartedAt,
		&completedAt,
		&errorMessageNull,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			s.logger.Warn().Str("executionId", executionID).Msg("Workflow execution not found")
			return nil, fmt.Errorf("%s: %s", models.ErrWorkflowExecutionNotFound, "workflow execution not found")
		}
		s.logger.Error().Err(err).Str("executionId", executionID).Msg("Failed to update workflow execution")
		return nil, fmt.Errorf("failed to update workflow execution: %w", err)
	}

	// Unmarshal variables
	if len(variablesBytes) > 0 {
		if err := json.Unmarshal(variablesBytes, &execution.Variables); err != nil {
			s.logger.Error().Err(err).Msg("Failed to unmarshal variables")
			return nil, fmt.Errorf("failed to unmarshal variables: %w", err)
		}
	} else {
		execution.Variables = make(map[string]interface{})
	}

	// Handle completed_at
	if completedAt.Valid {
		execution.CompletedAt = &completedAt.Time
	}

	// Handle error_message
	if errorMessageNull.Valid {
		execution.ErrorMessage = errorMessageNull.String
	}

	s.logger.Info().Str("executionId", executionID).Msg("Workflow execution updated")
	return &execution, nil
}

// ListWorkflowExecutions lists workflow executions with pagination and filters
func (s *WorkflowExecutionService) ListWorkflowExecutions(ctx context.Context, page, pageSize int, instanceId, workflowId, status string) ([]models.WorkflowExecution, *models.Metadata, error) {
	if s.db.DB == nil {
		return nil, nil, fmt.Errorf("database not available")
	}

	// Default pagination
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}

	offset := (page - 1) * pageSize

	// Build WHERE clause
	whereClause := "1=1"
	args := []interface{}{}
	argIndex := 1

	if instanceId != "" {
		whereClause += fmt.Sprintf(" AND instance_id = $%d", argIndex)
		args = append(args, instanceId)
		argIndex++
	}
	if workflowId != "" {
		whereClause += fmt.Sprintf(" AND workflow_id = $%d", argIndex)
		args = append(args, workflowId)
		argIndex++
	}
	if status != "" {
		whereClause += fmt.Sprintf(" AND status = $%d", argIndex)
		args = append(args, status)
		argIndex++
	}

	// Get total count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM workflow_executions WHERE %s", whereClause)
	var total int
	err := s.db.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		s.logger.Error().Err(err).Msg("Failed to count workflow executions")
		return nil, nil, fmt.Errorf("failed to count workflow executions: %w", err)
	}

	// Get executions
	query := fmt.Sprintf(`
		SELECT id, instance_id, workflow_id, status, variables, execution_version, started_at, completed_at, error_message
		FROM workflow_executions
		WHERE %s
		ORDER BY started_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIndex, argIndex+1)
	args = append(args, pageSize, offset)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		s.logger.Error().Err(err).Msg("Failed to list workflow executions")
		return nil, nil, fmt.Errorf("failed to list workflow executions: %w", err)
	}
	defer rows.Close()

	var executions []models.WorkflowExecution
	for rows.Next() {
		var execution models.WorkflowExecution
		var variablesBytes []byte
		var completedAt sql.NullTime
		var errorMessage sql.NullString

		err := rows.Scan(
			&execution.Id,
			&execution.InstanceId,
			&execution.WorkflowId,
			&execution.Status,
			&variablesBytes,
			&execution.ExecutionVersion,
			&execution.StartedAt,
			&completedAt,
			&errorMessage,
		)
		if err != nil {
			s.logger.Error().Err(err).Msg("Failed to scan workflow execution")
			return nil, nil, fmt.Errorf("failed to scan workflow execution: %w", err)
		}

		// Unmarshal variables
		if len(variablesBytes) > 0 {
			if err := json.Unmarshal(variablesBytes, &execution.Variables); err != nil {
				s.logger.Error().Err(err).Msg("Failed to unmarshal variables")
				return nil, nil, fmt.Errorf("failed to unmarshal variables: %w", err)
			}
		} else {
			execution.Variables = make(map[string]interface{})
		}

		// Handle completed_at
		if completedAt.Valid {
			execution.CompletedAt = &completedAt.Time
		}

		// Handle error_message
		if errorMessage.Valid {
			execution.ErrorMessage = errorMessage.String
		}

		executions = append(executions, execution)
	}

	if err = rows.Err(); err != nil {
		s.logger.Error().Err(err).Msg("Failed to iterate workflow executions")
		return nil, nil, fmt.Errorf("failed to iterate workflow executions: %w", err)
	}

	// Calculate metadata
	hasMore := (page * pageSize) < total
	metadata := &models.Metadata{
		Page:     page,
		PageSize: pageSize,
		Total:    total,
		HasMore:  hasMore,
	}

	return executions, metadata, nil
}

