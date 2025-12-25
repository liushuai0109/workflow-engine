package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/bpmn-explorer/server/internal/models"
	"github.com/bpmn-explorer/server/pkg/database"
	"github.com/google/uuid"
	"github.com/rs/zerolog"
)

// ExecutionHistoryService handles execution history business logic
type ExecutionHistoryService struct {
	db     *database.Database
	logger *zerolog.Logger
}

// NewExecutionHistoryService creates a new ExecutionHistoryService
func NewExecutionHistoryService(db *database.Database, logger *zerolog.Logger) *ExecutionHistoryService {
	return &ExecutionHistoryService{
		db:     db,
		logger: logger,
	}
}

// CreateExecutionHistory creates a new execution history record
func (s *ExecutionHistoryService) CreateExecutionHistory(
	ctx context.Context,
	executionId string,
	nodeId string,
	nodeName string,
	nodeType int,
	inputData map[string]interface{},
	outputData map[string]interface{},
	variablesBefore map[string]interface{},
	variablesAfter map[string]interface{},
	executionTimeMs int,
	errorMessage string,
) (*models.ExecutionHistory, error) {
	if s.db.DB == nil {
		return nil, fmt.Errorf("database not available")
	}

	id := uuid.New().String()
	now := time.Now()

	if inputData == nil {
		inputData = make(map[string]interface{})
	}
	if outputData == nil {
		outputData = make(map[string]interface{})
	}
	if variablesBefore == nil {
		variablesBefore = make(map[string]interface{})
	}
	if variablesAfter == nil {
		variablesAfter = make(map[string]interface{})
	}

	// Marshal data
	inputDataJSON, err := json.Marshal(inputData)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal input data: %w", err)
	}

	outputDataJSON, err := json.Marshal(outputData)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal output data: %w", err)
	}

	variablesBeforeJSON, err := json.Marshal(variablesBefore)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal variables before: %w", err)
	}

	variablesAfterJSON, err := json.Marshal(variablesAfter)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal variables after: %w", err)
	}

	query := `
		INSERT INTO execution_histories (
			id, execution_id, node_id, node_name, node_type,
			input_data, output_data, variables_before, variables_after,
			execution_time_ms, error_message, executed_at
		)
		VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11, $12)
		RETURNING id, execution_id, node_id, node_name, node_type,
		          input_data, output_data, variables_before, variables_after,
		          execution_time_ms, error_message, executed_at
	`

	var history models.ExecutionHistory
	var inputDataBytes []byte
	var outputDataBytes []byte
	var variablesBeforeBytes []byte
	var variablesAfterBytes []byte

	err = s.db.QueryRowContext(ctx, query,
		id, executionId, nodeId, nodeName, nodeType,
		string(inputDataJSON), string(outputDataJSON), string(variablesBeforeJSON), string(variablesAfterJSON),
		executionTimeMs, errorMessage, now,
	).Scan(
		&history.Id,
		&history.ExecutionId,
		&history.NodeId,
		&history.NodeName,
		&history.NodeType,
		&inputDataBytes,
		&outputDataBytes,
		&variablesBeforeBytes,
		&variablesAfterBytes,
		&history.ExecutionTimeMs,
		&history.ErrorMessage,
		&history.ExecutedAt,
	)

	if err != nil {
		s.logger.Error().Err(err).Msg("Failed to create execution history")
		return nil, fmt.Errorf("failed to create execution history: %w", err)
	}

	// Unmarshal data
	if err := history.UnmarshalInputData(inputDataBytes); err != nil {
		return nil, fmt.Errorf("failed to unmarshal input data: %w", err)
	}
	if err := history.UnmarshalOutputData(outputDataBytes); err != nil {
		return nil, fmt.Errorf("failed to unmarshal output data: %w", err)
	}
	if err := history.UnmarshalVariablesBefore(variablesBeforeBytes); err != nil {
		return nil, fmt.Errorf("failed to unmarshal variables before: %w", err)
	}
	if err := history.UnmarshalVariablesAfter(variablesAfterBytes); err != nil {
		return nil, fmt.Errorf("failed to unmarshal variables after: %w", err)
	}

	return &history, nil
}

// GetExecutionHistories retrieves execution histories by execution ID
func (s *ExecutionHistoryService) GetExecutionHistories(
	ctx context.Context,
	executionId string,
	limit int,
	offset int,
) ([]models.ExecutionHistory, int, error) {
	if s.db.DB == nil {
		return nil, 0, fmt.Errorf("database not available")
	}

	// Get total count
	countQuery := `SELECT COUNT(*) FROM execution_histories WHERE execution_id = $1`
	var total int
	err := s.db.QueryRowContext(ctx, countQuery, executionId).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count execution histories: %w", err)
	}

	// Get histories
	query := `
		SELECT id, execution_id, node_id, node_name, node_type,
		       input_data, output_data, variables_before, variables_after,
		       execution_time_ms, error_message, executed_at
		FROM execution_histories
		WHERE execution_id = $1
		ORDER BY executed_at ASC
		LIMIT $2 OFFSET $3
	`

	rows, err := s.db.QueryContext(ctx, query, executionId, limit, offset)
	if err != nil {
		s.logger.Error().Err(err).Str("executionId", executionId).Msg("Failed to get execution histories")
		return nil, 0, fmt.Errorf("failed to get execution histories: %w", err)
	}
	defer rows.Close()

	var histories []models.ExecutionHistory
	for rows.Next() {
		var history models.ExecutionHistory
		var inputDataBytes []byte
		var outputDataBytes []byte
		var variablesBeforeBytes []byte
		var variablesAfterBytes []byte

		err := rows.Scan(
			&history.Id,
			&history.ExecutionId,
			&history.NodeId,
			&history.NodeName,
			&history.NodeType,
			&inputDataBytes,
			&outputDataBytes,
			&variablesBeforeBytes,
			&variablesAfterBytes,
			&history.ExecutionTimeMs,
			&history.ErrorMessage,
			&history.ExecutedAt,
		)
		if err != nil {
			s.logger.Error().Err(err).Msg("Failed to scan execution history")
			return nil, 0, fmt.Errorf("failed to scan execution history: %w", err)
		}

		// Unmarshal data
		if err := history.UnmarshalInputData(inputDataBytes); err != nil {
			return nil, 0, fmt.Errorf("failed to unmarshal input data: %w", err)
		}
		if err := history.UnmarshalOutputData(outputDataBytes); err != nil {
			return nil, 0, fmt.Errorf("failed to unmarshal output data: %w", err)
		}
		if err := history.UnmarshalVariablesBefore(variablesBeforeBytes); err != nil {
			return nil, 0, fmt.Errorf("failed to unmarshal variables before: %w", err)
		}
		if err := history.UnmarshalVariablesAfter(variablesAfterBytes); err != nil {
			return nil, 0, fmt.Errorf("failed to unmarshal variables after: %w", err)
		}

		histories = append(histories, history)
	}

	return histories, total, nil
}

