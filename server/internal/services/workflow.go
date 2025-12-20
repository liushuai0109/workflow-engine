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

// WorkflowService handles workflow business logic
type WorkflowService struct {
	db      *database.Database
	logger  *zerolog.Logger
	store   *WorkflowStore
	useStore bool
}

// NewWorkflowService creates a new WorkflowService
func NewWorkflowService(db *database.Database, logger *zerolog.Logger) *WorkflowService {
	useStore := db == nil || db.DB == nil
	return &WorkflowService{
		db:       db,
		logger:   logger,
		store:    NewWorkflowStore(logger),
		useStore: useStore,
	}
}

// CreateWorkflow creates a new workflow
func (s *WorkflowService) CreateWorkflow(ctx context.Context, name, description, xml string) (*models.Workflow, error) {
	if s.db.DB == nil {
		return nil, fmt.Errorf("database not available")
	}

	// Generate UUID
	id := uuid.New().String()

	// Insert into database
	query := `
		INSERT INTO workflows (id, name, description, bpmn_xml, version, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, name, description, bpmn_xml, version, status, created_by, created_at, updated_at
	`

	now := time.Now()
	var workflow models.Workflow
	var createdBy sql.NullString

	err := s.db.QueryRowContext(ctx, query,
		id, name, description, xml, "1.0.0", models.StatusDraft, now, now,
	).Scan(
		&workflow.Id,
		&workflow.Name,
		&workflow.Description,
		&workflow.BpmnXml,
		&workflow.Version,
		&workflow.Status,
		&createdBy,
		&workflow.CreatedAt,
		&workflow.UpdatedAt,
	)

	if createdBy.Valid {
		workflow.CreatedBy = createdBy.String
	}

	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok {
			if pqErr.Code == "23503" { // foreign_key_violation
				s.logger.Error().Err(err).Msg("Foreign key violation")
				return nil, fmt.Errorf("%s: %s", models.ErrForeignKeyViolation, pqErr.Message)
			}
		}
		s.logger.Error().Err(err).Msg("Failed to create workflow")
		return nil, fmt.Errorf("failed to create workflow: %w", err)
	}

	s.logger.Info().Str("workflowId", workflow.Id).Str("name", name).Msg("Workflow created")
	return &workflow, nil
}

// GetWorkflowByID retrieves a workflow by ID
func (s *WorkflowService) GetWorkflowByID(ctx context.Context, workflowID string) (*models.Workflow, error) {
	// Use in-memory store if database is not available
	if s.useStore || s.db == nil || s.db.DB == nil {
		return s.store.GetWorkflow(workflowID)
	}

	query := `
		SELECT id, name, description, bpmn_xml, version, status, created_by, created_at, updated_at
		FROM workflows
		WHERE id = $1
	`

	var workflow models.Workflow
	var createdBy sql.NullString

	err := s.db.QueryRowContext(ctx, query, workflowID).Scan(
		&workflow.Id,
		&workflow.Name,
		&workflow.Description,
		&workflow.BpmnXml,
		&workflow.Version,
		&workflow.Status,
		&createdBy,
		&workflow.CreatedAt,
		&workflow.UpdatedAt,
	)

	if createdBy.Valid {
		workflow.CreatedBy = createdBy.String
	}

	if err != nil {
		if err == sql.ErrNoRows {
			s.logger.Warn().Str("workflowId", workflowID).Msg("Workflow not found")
			return nil, fmt.Errorf("%s: %s", models.ErrWorkflowNotFound, "workflow not found")
		}
		s.logger.Error().Err(err).Str("workflowId", workflowID).Msg("Failed to get workflow")
		return nil, fmt.Errorf("failed to get workflow: %w", err)
	}

	return &workflow, nil
}

// UpdateWorkflow updates a workflow
func (s *WorkflowService) UpdateWorkflow(ctx context.Context, workflowID, name, description, xml string) (*models.Workflow, error) {
	if s.db.DB == nil {
		return nil, fmt.Errorf("database not available")
	}

	// Build update query dynamically based on provided fields
	query := `
		UPDATE workflows
		SET updated_at = $1
	`
	args := []interface{}{time.Now()}
	argIndex := 2

	if name != "" {
		query += fmt.Sprintf(", name = $%d", argIndex)
		args = append(args, name)
		argIndex++
	}
	if description != "" {
		query += fmt.Sprintf(", description = $%d", argIndex)
		args = append(args, description)
		argIndex++
	}
	if xml != "" {
		query += fmt.Sprintf(", bpmn_xml = $%d", argIndex)
		args = append(args, xml)
		argIndex++
	}

	query += fmt.Sprintf(`
		WHERE id = $%d
		RETURNING id, name, description, bpmn_xml, version, status, created_by, created_at, updated_at
	`, argIndex)
	args = append(args, workflowID)

	var workflow models.Workflow
	var createdBy sql.NullString

	err := s.db.QueryRowContext(ctx, query, args...).Scan(
		&workflow.Id,
		&workflow.Name,
		&workflow.Description,
		&workflow.BpmnXml,
		&workflow.Version,
		&workflow.Status,
		&createdBy,
		&workflow.CreatedAt,
		&workflow.UpdatedAt,
	)

	if createdBy.Valid {
		workflow.CreatedBy = createdBy.String
	}

	if err != nil {
		if err == sql.ErrNoRows {
			s.logger.Warn().Str("workflowId", workflowID).Msg("Workflow not found")
			return nil, fmt.Errorf("%s: %s", models.ErrWorkflowNotFound, "workflow not found")
		}
		s.logger.Error().Err(err).Str("workflowId", workflowID).Msg("Failed to update workflow")
		return nil, fmt.Errorf("failed to update workflow: %w", err)
	}

	s.logger.Info().Str("workflowId", workflowID).Msg("Workflow updated")
	return &workflow, nil
}

// ListWorkflows lists all workflows with pagination
func (s *WorkflowService) ListWorkflows(ctx context.Context, page, pageSize int) ([]models.Workflow, *models.Metadata, error) {
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

	// Get total count
	countQuery := `SELECT COUNT(*) FROM workflows`
	var total int
	err := s.db.QueryRowContext(ctx, countQuery).Scan(&total)
	if err != nil {
		s.logger.Error().Err(err).Msg("Failed to count workflows")
		return nil, nil, fmt.Errorf("failed to count workflows: %w", err)
	}

	// Get workflows
	query := `
		SELECT id, name, description, bpmn_xml, version, status, created_by, created_at, updated_at
		FROM workflows
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`

	rows, err := s.db.QueryContext(ctx, query, pageSize, offset)
	if err != nil {
		s.logger.Error().Err(err).Msg("Failed to list workflows")
		return nil, nil, fmt.Errorf("failed to list workflows: %w", err)
	}
	defer rows.Close()

	var workflows []models.Workflow
	for rows.Next() {
		var workflow models.Workflow
		var createdBy sql.NullString
		err := rows.Scan(
			&workflow.Id,
			&workflow.Name,
			&workflow.Description,
			&workflow.BpmnXml,
			&workflow.Version,
			&workflow.Status,
			&createdBy,
			&workflow.CreatedAt,
			&workflow.UpdatedAt,
		)
		if createdBy.Valid {
			workflow.CreatedBy = createdBy.String
		}
		if err != nil {
			s.logger.Error().Err(err).Msg("Failed to scan workflow")
			return nil, nil, fmt.Errorf("failed to scan workflow: %w", err)
		}
		workflows = append(workflows, workflow)
	}

	if err = rows.Err(); err != nil {
		s.logger.Error().Err(err).Msg("Failed to iterate workflows")
		return nil, nil, fmt.Errorf("failed to iterate workflows: %w", err)
	}

	// Calculate metadata
	hasMore := (page * pageSize) < total
	metadata := &models.Metadata{
		Page:     page,
		PageSize: pageSize,
		Total:    total,
		HasMore:  hasMore,
	}

	return workflows, metadata, nil
}

// SetWorkflowInMemory saves a workflow to memory store (for use when database is unavailable)
func (s *WorkflowService) SetWorkflowInMemory(workflow *models.Workflow) {
	s.store.SaveWorkflow(workflow)
}
