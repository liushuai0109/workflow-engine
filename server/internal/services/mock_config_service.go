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
	"github.com/rs/zerolog"
)

// MockConfigService handles mock configuration business logic
type MockConfigService struct {
	db     *database.Database
	logger *zerolog.Logger
}

// NewMockConfigService creates a new MockConfigService
func NewMockConfigService(db *database.Database, logger *zerolog.Logger) *MockConfigService {
	return &MockConfigService{
		db:     db,
		logger: logger,
	}
}

// CreateMockConfig creates a new mock configuration
func (s *MockConfigService) CreateMockConfig(
	ctx context.Context,
	workflowId string,
	name string,
	description string,
	nodeConfigs map[string]models.NodeConfig,
	gatewayConfigs map[string]models.GatewayConfig,
) (*models.MockConfig, error) {
	if s.db.DB == nil {
		return nil, fmt.Errorf("database not available")
	}

	id := uuid.New().String()
	now := time.Now()

	// Marshal node configs
	nodeConfigsJSON, err := json.Marshal(nodeConfigs)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal node configs: %w", err)
	}

	// Marshal gateway configs
	gatewayConfigsJSON, err := json.Marshal(gatewayConfigs)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal gateway configs: %w", err)
	}

	query := `
		INSERT INTO mock_configs (id, workflow_id, name, description, node_configs, gateway_configs, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8)
		RETURNING id, workflow_id, name, description, node_configs, gateway_configs, created_at, updated_at
	`

	var config models.MockConfig
	var nodeConfigsBytes []byte
	var gatewayConfigsBytes []byte

	err = s.db.QueryRowContext(ctx, query,
		id, workflowId, name, description, string(nodeConfigsJSON), string(gatewayConfigsJSON), now, now,
	).Scan(
		&config.Id,
		&config.WorkflowId,
		&config.Name,
		&config.Description,
		&nodeConfigsBytes,
		&gatewayConfigsBytes,
		&config.CreatedAt,
		&config.UpdatedAt,
	)

	if err != nil {
		s.logger.Error().Err(err).Msg("Failed to create mock config")
		return nil, fmt.Errorf("failed to create mock config: %w", err)
	}

	// Unmarshal configs
	if err := config.UnmarshalNodeConfigs(nodeConfigsBytes); err != nil {
		return nil, fmt.Errorf("failed to unmarshal node configs: %w", err)
	}
	if err := config.UnmarshalGatewayConfigs(gatewayConfigsBytes); err != nil {
		return nil, fmt.Errorf("failed to unmarshal gateway configs: %w", err)
	}

	return &config, nil
}

// GetMockConfigByID retrieves a mock configuration by ID
func (s *MockConfigService) GetMockConfigByID(ctx context.Context, configId string) (*models.MockConfig, error) {
	if s.db.DB == nil {
		return nil, fmt.Errorf("database not available")
	}

	query := `
		SELECT id, workflow_id, name, description, node_configs, gateway_configs, created_at, updated_at
		FROM mock_configs
		WHERE id = $1
	`

	var config models.MockConfig
	var nodeConfigsBytes []byte
	var gatewayConfigsBytes []byte

	err := s.db.QueryRowContext(ctx, query, configId).Scan(
		&config.Id,
		&config.WorkflowId,
		&config.Name,
		&config.Description,
		&nodeConfigsBytes,
		&gatewayConfigsBytes,
		&config.CreatedAt,
		&config.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("mock config not found")
		}
		s.logger.Error().Err(err).Str("configId", configId).Msg("Failed to get mock config")
		return nil, fmt.Errorf("failed to get mock config: %w", err)
	}

	// Unmarshal configs
	if err := config.UnmarshalNodeConfigs(nodeConfigsBytes); err != nil {
		return nil, fmt.Errorf("failed to unmarshal node configs: %w", err)
	}
	if err := config.UnmarshalGatewayConfigs(gatewayConfigsBytes); err != nil {
		return nil, fmt.Errorf("failed to unmarshal gateway configs: %w", err)
	}

	return &config, nil
}

// GetMockConfigsByWorkflowID retrieves all mock configurations for a workflow
func (s *MockConfigService) GetMockConfigsByWorkflowID(ctx context.Context, workflowId string) ([]models.MockConfig, error) {
	if s.db.DB == nil {
		return nil, fmt.Errorf("database not available")
	}

	query := `
		SELECT id, workflow_id, name, description, node_configs, gateway_configs, created_at, updated_at
		FROM mock_configs
		WHERE workflow_id = $1
		ORDER BY created_at DESC
	`

	rows, err := s.db.QueryContext(ctx, query, workflowId)
	if err != nil {
		s.logger.Error().Err(err).Str("workflowId", workflowId).Msg("Failed to list mock configs")
		return nil, fmt.Errorf("failed to list mock configs: %w", err)
	}
	defer rows.Close()

	var configs []models.MockConfig
	for rows.Next() {
		var config models.MockConfig
		var nodeConfigsBytes []byte
		var gatewayConfigsBytes []byte

		err := rows.Scan(
			&config.Id,
			&config.WorkflowId,
			&config.Name,
			&config.Description,
			&nodeConfigsBytes,
			&gatewayConfigsBytes,
			&config.CreatedAt,
			&config.UpdatedAt,
		)
		if err != nil {
			s.logger.Error().Err(err).Msg("Failed to scan mock config")
			return nil, fmt.Errorf("failed to scan mock config: %w", err)
		}

		// Unmarshal configs
		if err := config.UnmarshalNodeConfigs(nodeConfigsBytes); err != nil {
			return nil, fmt.Errorf("failed to unmarshal node configs: %w", err)
		}
		if err := config.UnmarshalGatewayConfigs(gatewayConfigsBytes); err != nil {
			return nil, fmt.Errorf("failed to unmarshal gateway configs: %w", err)
		}

		configs = append(configs, config)
	}

	return configs, nil
}

// UpdateMockConfig updates a mock configuration
func (s *MockConfigService) UpdateMockConfig(
	ctx context.Context,
	configId string,
	name string,
	description string,
	nodeConfigs map[string]models.NodeConfig,
	gatewayConfigs map[string]models.GatewayConfig,
) (*models.MockConfig, error) {
	if s.db.DB == nil {
		return nil, fmt.Errorf("database not available")
	}

	now := time.Now()

	// Marshal configs
	nodeConfigsJSON, err := json.Marshal(nodeConfigs)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal node configs: %w", err)
	}

	gatewayConfigsJSON, err := json.Marshal(gatewayConfigs)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal gateway configs: %w", err)
	}

	query := `
		UPDATE mock_configs
		SET name = $1, description = $2, node_configs = $3::jsonb, gateway_configs = $4::jsonb, updated_at = $5
		WHERE id = $6
		RETURNING id, workflow_id, name, description, node_configs, gateway_configs, created_at, updated_at
	`

	var config models.MockConfig
	var nodeConfigsBytes []byte
	var gatewayConfigsBytes []byte

	err = s.db.QueryRowContext(ctx, query,
		name, description, string(nodeConfigsJSON), string(gatewayConfigsJSON), now, configId,
	).Scan(
		&config.Id,
		&config.WorkflowId,
		&config.Name,
		&config.Description,
		&nodeConfigsBytes,
		&gatewayConfigsBytes,
		&config.CreatedAt,
		&config.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("mock config not found")
		}
		s.logger.Error().Err(err).Str("configId", configId).Msg("Failed to update mock config")
		return nil, fmt.Errorf("failed to update mock config: %w", err)
	}

	// Unmarshal configs
	if err := config.UnmarshalNodeConfigs(nodeConfigsBytes); err != nil {
		return nil, fmt.Errorf("failed to unmarshal node configs: %w", err)
	}
	if err := config.UnmarshalGatewayConfigs(gatewayConfigsBytes); err != nil {
		return nil, fmt.Errorf("failed to unmarshal gateway configs: %w", err)
	}

	return &config, nil
}

// DeleteMockConfig deletes a mock configuration
func (s *MockConfigService) DeleteMockConfig(ctx context.Context, configId string) error {
	if s.db.DB == nil {
		return fmt.Errorf("database not available")
	}

	query := `DELETE FROM mock_configs WHERE id = $1`

	result, err := s.db.ExecContext(ctx, query, configId)
	if err != nil {
		s.logger.Error().Err(err).Str("configId", configId).Msg("Failed to delete mock config")
		return fmt.Errorf("failed to delete mock config: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("mock config not found")
	}

	return nil
}

