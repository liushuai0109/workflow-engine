package services

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/bpmn-explorer/server/internal/models"
	"github.com/bpmn-explorer/server/pkg/database"
	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/rs/zerolog"
)

// WorkflowInstanceService handles workflow instance business logic
type WorkflowInstanceService struct {
	db     *database.Database
	logger *zerolog.Logger
}

// NewWorkflowInstanceService creates a new WorkflowInstanceService
func NewWorkflowInstanceService(db *database.Database, logger *zerolog.Logger) *WorkflowInstanceService {
	return &WorkflowInstanceService{
		db:     db,
		logger: logger,
	}
}

// CreateWorkflowInstance creates a new workflow instance
func (s *WorkflowInstanceService) CreateWorkflowInstance(ctx context.Context, workflowId, name string) (*models.WorkflowInstance, error) {
	if s.db.DB == nil {
		return nil, fmt.Errorf("database not available")
	}

	// Generate UUID
	id := uuid.New().String()

	// Insert into database
	query := `
		INSERT INTO workflow_instances (id, workflow_id, name, status, current_node_ids, instance_version, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, workflow_id, name, status, current_node_ids, instance_version, created_at, updated_at
	`

	now := time.Now()
	var instance models.WorkflowInstance

	err := s.db.QueryRowContext(ctx, query,
		id, workflowId, name, models.InstanceStatusPending, pq.Array([]string{}), 1, now, now,
	).Scan(
		&instance.Id,
		&instance.WorkflowId,
		&instance.Name,
		&instance.Status,
		pq.Array(&instance.CurrentNodeIds),
		&instance.InstanceVersion,
		&instance.CreatedAt,
		&instance.UpdatedAt,
	)

	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok {
			switch pqErr.Code {
			case "23503": // foreign_key_violation
				s.logger.Error().Err(err).Str("workflowId", workflowId).Msg("Foreign key violation")
				return nil, fmt.Errorf("%s: %s", models.ErrForeignKeyViolation, pqErr.Message)
			}
		}
		s.logger.Error().Err(err).Msg("Failed to create workflow instance")
		return nil, fmt.Errorf("failed to create workflow instance: %w", err)
	}

	s.logger.Info().Str("instanceId", instance.Id).Str("workflowId", workflowId).Msg("Workflow instance created")
	return &instance, nil
}

// GetWorkflowInstanceByID retrieves a workflow instance by ID
func (s *WorkflowInstanceService) GetWorkflowInstanceByID(ctx context.Context, instanceID string) (*models.WorkflowInstance, error) {
	if s.db.DB == nil {
		return nil, fmt.Errorf("database not available")
	}

	query := `
		SELECT id, workflow_id, name, status, current_node_ids, instance_version, created_at, updated_at
		FROM workflow_instances
		WHERE id = $1
	`

	var instance models.WorkflowInstance

	err := s.db.QueryRowContext(ctx, query, instanceID).Scan(
		&instance.Id,
		&instance.WorkflowId,
		&instance.Name,
		&instance.Status,
		pq.Array(&instance.CurrentNodeIds),
		&instance.InstanceVersion,
		&instance.CreatedAt,
		&instance.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			s.logger.Warn().Str("instanceId", instanceID).Msg("Workflow instance not found")
			return nil, fmt.Errorf("%s: %s", models.ErrWorkflowInstanceNotFound, "workflow instance not found")
		}
		s.logger.Error().Err(err).Str("instanceId", instanceID).Msg("Failed to get workflow instance")
		return nil, fmt.Errorf("failed to get workflow instance: %w", err)
	}

	return &instance, nil
}

// UpdateWorkflowInstance updates a workflow instance
func (s *WorkflowInstanceService) UpdateWorkflowInstance(ctx context.Context, instanceID string, status string, currentNodeIds []string) (*models.WorkflowInstance, error) {
	if s.db.DB == nil {
		return nil, fmt.Errorf("database not available")
	}

	// Build update query
	query := `
		UPDATE workflow_instances
		SET instance_version = instance_version + 1,
		    updated_at = $1
	`
	args := []interface{}{time.Now()}
	argIndex := 2

	if status != "" {
		query += fmt.Sprintf(", status = $%d", argIndex)
		args = append(args, status)
		argIndex++
	}
	if currentNodeIds != nil {
		query += fmt.Sprintf(", current_node_ids = $%d", argIndex)
		args = append(args, pq.Array(currentNodeIds))
		argIndex++
	}

	query += fmt.Sprintf(`
		WHERE id = $%d
		RETURNING id, workflow_id, name, status, current_node_ids, instance_version, created_at, updated_at
	`, argIndex)
	args = append(args, instanceID)

	var instance models.WorkflowInstance

	err := s.db.QueryRowContext(ctx, query, args...).Scan(
		&instance.Id,
		&instance.WorkflowId,
		&instance.Name,
		&instance.Status,
		pq.Array(&instance.CurrentNodeIds),
		&instance.InstanceVersion,
		&instance.CreatedAt,
		&instance.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			s.logger.Warn().Str("instanceId", instanceID).Msg("Workflow instance not found")
			return nil, fmt.Errorf("%s: %s", models.ErrWorkflowInstanceNotFound, "workflow instance not found")
		}
		s.logger.Error().Err(err).Str("instanceId", instanceID).Msg("Failed to update workflow instance")
		return nil, fmt.Errorf("failed to update workflow instance: %w", err)
	}

	s.logger.Info().Str("instanceId", instanceID).Msg("Workflow instance updated")
	return &instance, nil
}

