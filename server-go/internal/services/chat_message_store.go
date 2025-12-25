package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/bpmn-explorer/server/internal/models"
	"github.com/bpmn-explorer/server/pkg/database"
	"github.com/google/uuid"
	"github.com/rs/zerolog"
)

// ChatMessageStore handles chat message database operations
type ChatMessageStore struct {
	db     *database.Database
	logger *zerolog.Logger
}

// NewChatMessageStore creates a new ChatMessageStore
func NewChatMessageStore(db *database.Database, logger *zerolog.Logger) *ChatMessageStore {
	return &ChatMessageStore{
		db:     db,
		logger: logger,
	}
}

// CreateMessage creates a new message
func (s *ChatMessageStore) CreateMessage(ctx context.Context, conversationID, role, content string, metadata map[string]interface{}) (*models.ChatMessage, error) {
	if s.db.DB == nil {
		return nil, fmt.Errorf("database not available")
	}

	// Get next sequence number
	sequence, err := s.getNextSequence(ctx, conversationID)
	if err != nil {
		return nil, fmt.Errorf("failed to get next sequence: %w", err)
	}

	// Serialize metadata
	metadataJSON := "{}"
	if metadata != nil {
		metadataBytes, err := json.Marshal(metadata)
		if err != nil {
			s.logger.Error().Err(err).Msg("Failed to marshal metadata")
			return nil, fmt.Errorf("failed to marshal metadata: %w", err)
		}
		metadataJSON = string(metadataBytes)
	}

	id := uuid.New().String()
	query := `
		INSERT INTO chat_messages (id, conversation_id, role, content, metadata, sequence, created_at)
		VALUES ($1, $2, $3, $4, $5::jsonb, $6, NOW())
		RETURNING id, conversation_id, role, content, metadata, sequence, created_at
	`

	var msg models.ChatMessage
	var metadataBytes []byte

	err = s.db.QueryRowContext(ctx, query, id, conversationID, role, content, metadataJSON, sequence).Scan(
		&msg.Id,
		&msg.ConversationId,
		&msg.Role,
		&msg.Content,
		&metadataBytes,
		&msg.Sequence,
		&msg.CreatedAt,
	)

	if err != nil {
		s.logger.Error().Err(err).Msg("Failed to create message")
		return nil, fmt.Errorf("failed to create message: %w", err)
	}

	// Unmarshal metadata
	if len(metadataBytes) > 0 {
		if err := json.Unmarshal(metadataBytes, &msg.Metadata); err != nil {
			s.logger.Warn().Err(err).Msg("Failed to unmarshal metadata, using empty map")
			msg.Metadata = make(map[string]interface{})
		}
	} else {
		msg.Metadata = make(map[string]interface{})
	}

	return &msg, nil
}

// BatchCreateMessages creates multiple messages in a transaction
func (s *ChatMessageStore) BatchCreateMessages(ctx context.Context, conversationID string, messages []struct {
	Role     string
	Content  string
	Metadata map[string]interface{}
}) ([]*models.ChatMessage, error) {
	if s.db.DB == nil {
		return nil, fmt.Errorf("database not available")
	}

	// Start transaction
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Get current max sequence
	var maxSequence int
	err = tx.QueryRowContext(ctx, `SELECT COALESCE(MAX(sequence), 0) FROM chat_messages WHERE conversation_id = $1`, conversationID).Scan(&maxSequence)
	if err != nil {
		return nil, fmt.Errorf("failed to get max sequence: %w", err)
	}

	var createdMessages []*models.ChatMessage

	for i, msgData := range messages {
		sequence := maxSequence + i + 1

		// Serialize metadata
		metadataJSON := "{}"
		if msgData.Metadata != nil {
			metadataBytes, err := json.Marshal(msgData.Metadata)
			if err != nil {
				return nil, fmt.Errorf("failed to marshal metadata: %w", err)
			}
			metadataJSON = string(metadataBytes)
		}

		id := uuid.New().String()
		query := `
			INSERT INTO chat_messages (id, conversation_id, role, content, metadata, sequence, created_at)
			VALUES ($1, $2, $3, $4, $5::jsonb, $6, NOW())
			RETURNING id, conversation_id, role, content, metadata, sequence, created_at
		`

		var msg models.ChatMessage
		var metadataBytes []byte

		err = tx.QueryRowContext(ctx, query, id, conversationID, msgData.Role, msgData.Content, metadataJSON, sequence).Scan(
			&msg.Id,
			&msg.ConversationId,
			&msg.Role,
			&msg.Content,
			&metadataBytes,
			&msg.Sequence,
			&msg.CreatedAt,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to create message: %w", err)
		}

		// Unmarshal metadata
		if len(metadataBytes) > 0 {
			if err := json.Unmarshal(metadataBytes, &msg.Metadata); err != nil {
				msg.Metadata = make(map[string]interface{})
			}
		} else {
			msg.Metadata = make(map[string]interface{})
		}

		createdMessages = append(createdMessages, &msg)
	}

	// Commit transaction
	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return createdMessages, nil
}

// GetMessagesByConversationID retrieves all messages for a conversation
func (s *ChatMessageStore) GetMessagesByConversationID(ctx context.Context, conversationID string) ([]*models.ChatMessage, error) {
	if s.db.DB == nil {
		return nil, fmt.Errorf("database not available")
	}

	query := `
		SELECT id, conversation_id, role, content, metadata, sequence, created_at
		FROM chat_messages
		WHERE conversation_id = $1
		ORDER BY sequence ASC
	`

	rows, err := s.db.QueryContext(ctx, query, conversationID)
	if err != nil {
		s.logger.Error().Err(err).Str("conversationId", conversationID).Msg("Failed to get messages")
		return nil, fmt.Errorf("failed to get messages: %w", err)
	}
	defer rows.Close()

	var messages []*models.ChatMessage
	for rows.Next() {
		var msg models.ChatMessage
		var metadataBytes []byte

		err := rows.Scan(
			&msg.Id,
			&msg.ConversationId,
			&msg.Role,
			&msg.Content,
			&metadataBytes,
			&msg.Sequence,
			&msg.CreatedAt,
		)
		if err != nil {
			s.logger.Error().Err(err).Msg("Failed to scan message")
			return nil, fmt.Errorf("failed to scan message: %w", err)
		}

		// Unmarshal metadata
		if len(metadataBytes) > 0 {
			if err := json.Unmarshal(metadataBytes, &msg.Metadata); err != nil {
				s.logger.Warn().Err(err).Msg("Failed to unmarshal metadata, using empty map")
				msg.Metadata = make(map[string]interface{})
			}
		} else {
			msg.Metadata = make(map[string]interface{})
		}

		messages = append(messages, &msg)
	}

	if err = rows.Err(); err != nil {
		s.logger.Error().Err(err).Msg("Failed to iterate messages")
		return nil, fmt.Errorf("failed to iterate messages: %w", err)
	}

	return messages, nil
}

// getNextSequence gets the next sequence number for a conversation
func (s *ChatMessageStore) getNextSequence(ctx context.Context, conversationID string) (int, error) {
	var maxSequence sql.NullInt64
	err := s.db.QueryRowContext(ctx, `SELECT MAX(sequence) FROM chat_messages WHERE conversation_id = $1`, conversationID).Scan(&maxSequence)
	if err != nil && err != sql.ErrNoRows {
		return 0, fmt.Errorf("failed to get max sequence: %w", err)
	}

	if !maxSequence.Valid {
		return 1, nil
	}

	return int(maxSequence.Int64) + 1, nil
}

