package services

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/bpmn-explorer/server/internal/models"
	"github.com/bpmn-explorer/server/pkg/database"
	"github.com/google/uuid"
	"github.com/rs/zerolog"
)

// ChatConversationStore handles chat conversation database operations
type ChatConversationStore struct {
	db     *database.Database
	logger *zerolog.Logger
}

// NewChatConversationStore creates a new ChatConversationStore
func NewChatConversationStore(db *database.Database, logger *zerolog.Logger) *ChatConversationStore {
	return &ChatConversationStore{
		db:     db,
		logger: logger,
	}
}

// CreateConversation creates a new conversation
func (s *ChatConversationStore) CreateConversation(ctx context.Context, title string) (*models.ChatConversation, error) {
	if s.db.DB == nil {
		return nil, fmt.Errorf("database not available")
	}

	id := uuid.New().String()
	if title == "" {
		title = "新对话"
	}

	query := `
		INSERT INTO chat_conversations (id, title, created_at, updated_at, last_message_at)
		VALUES ($1, $2, NOW(), NOW(), NOW())
		RETURNING id, title, created_at, updated_at, last_message_at
	`

	var conv models.ChatConversation
	err := s.db.QueryRowContext(ctx, query, id, title).Scan(
		&conv.Id,
		&conv.Title,
		&conv.CreatedAt,
		&conv.UpdatedAt,
		&conv.LastMessageAt,
	)

	if err != nil {
		s.logger.Error().Err(err).Msg("Failed to create conversation")
		return nil, fmt.Errorf("failed to create conversation: %w", err)
	}

	return &conv, nil
}

// GetConversationByID retrieves a conversation by ID
func (s *ChatConversationStore) GetConversationByID(ctx context.Context, conversationID string) (*models.ChatConversation, error) {
	if s.db.DB == nil {
		return nil, fmt.Errorf("database not available")
	}

	query := `
		SELECT id, title, created_at, updated_at, last_message_at
		FROM chat_conversations
		WHERE id = $1
	`

	var conv models.ChatConversation
	err := s.db.QueryRowContext(ctx, query, conversationID).Scan(
		&conv.Id,
		&conv.Title,
		&conv.CreatedAt,
		&conv.UpdatedAt,
		&conv.LastMessageAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("conversation not found")
		}
		s.logger.Error().Err(err).Str("conversationId", conversationID).Msg("Failed to get conversation")
		return nil, fmt.Errorf("failed to get conversation: %w", err)
	}

	return &conv, nil
}

// ListConversations retrieves conversations with pagination
func (s *ChatConversationStore) ListConversations(ctx context.Context, page, pageSize int, orderBy, order string) ([]*models.ChatConversation, int, error) {
	if s.db.DB == nil {
		return nil, 0, fmt.Errorf("database not available")
	}

	// Validate and set defaults
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}
	// Map orderBy to valid column names
	validOrderBy := map[string]string{
		"created_at":      "c.created_at",
		"updated_at":      "c.updated_at",
		"last_message_at": "c.last_message_at",
		"title":           "c.title",
	}
	if orderBy == "" {
		orderBy = "last_message_at"
	}
	orderByColumn, ok := validOrderBy[orderBy]
	if !ok {
		orderByColumn = validOrderBy["last_message_at"]
	}
	if order != "asc" && order != "desc" {
		order = "desc"
	}

	offset := (page - 1) * pageSize

	// Get total count
	countQuery := `SELECT COUNT(*) FROM chat_conversations`
	var total int
	err := s.db.QueryRowContext(ctx, countQuery).Scan(&total)
	if err != nil {
		s.logger.Error().Err(err).Msg("Failed to count conversations")
		return nil, 0, fmt.Errorf("failed to count conversations: %w", err)
	}

	// Get conversations with message count
	query := fmt.Sprintf(`
		SELECT 
			c.id, 
			c.title, 
			c.created_at, 
			c.updated_at, 
			c.last_message_at,
			COALESCE(COUNT(m.id), 0) as message_count
		FROM chat_conversations c
		LEFT JOIN chat_messages m ON c.id = m.conversation_id
		GROUP BY c.id, c.title, c.created_at, c.updated_at, c.last_message_at
		ORDER BY %s %s
		LIMIT $1 OFFSET $2
	`, orderByColumn, order)

	rows, err := s.db.QueryContext(ctx, query, pageSize, offset)
	if err != nil {
		s.logger.Error().Err(err).Msg("Failed to list conversations")
		return nil, 0, fmt.Errorf("failed to list conversations: %w", err)
	}
	defer rows.Close()

	var conversations []*models.ChatConversation
	for rows.Next() {
		var conv models.ChatConversation
		err := rows.Scan(
			&conv.Id,
			&conv.Title,
			&conv.CreatedAt,
			&conv.UpdatedAt,
			&conv.LastMessageAt,
			&conv.MessageCount,
		)
		if err != nil {
			s.logger.Error().Err(err).Msg("Failed to scan conversation")
			return nil, 0, fmt.Errorf("failed to scan conversation: %w", err)
		}
		conversations = append(conversations, &conv)
	}

	if err = rows.Err(); err != nil {
		s.logger.Error().Err(err).Msg("Failed to iterate conversations")
		return nil, 0, fmt.Errorf("failed to iterate conversations: %w", err)
	}

	return conversations, total, nil
}

// UpdateConversation updates a conversation
func (s *ChatConversationStore) UpdateConversation(ctx context.Context, conversationID, title string) (*models.ChatConversation, error) {
	if s.db.DB == nil {
		return nil, fmt.Errorf("database not available")
	}

	query := `
		UPDATE chat_conversations
		SET title = $1, updated_at = NOW()
		WHERE id = $2
		RETURNING id, title, created_at, updated_at, last_message_at
	`

	var conv models.ChatConversation
	err := s.db.QueryRowContext(ctx, query, title, conversationID).Scan(
		&conv.Id,
		&conv.Title,
		&conv.CreatedAt,
		&conv.UpdatedAt,
		&conv.LastMessageAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("conversation not found")
		}
		s.logger.Error().Err(err).Str("conversationId", conversationID).Msg("Failed to update conversation")
		return nil, fmt.Errorf("failed to update conversation: %w", err)
	}

	return &conv, nil
}

// UpdateLastMessageAt updates the last_message_at timestamp
func (s *ChatConversationStore) UpdateLastMessageAt(ctx context.Context, conversationID string) error {
	if s.db.DB == nil {
		return fmt.Errorf("database not available")
	}

	query := `
		UPDATE chat_conversations
		SET last_message_at = NOW(), updated_at = NOW()
		WHERE id = $1
	`

	_, err := s.db.ExecContext(ctx, query, conversationID)
	if err != nil {
		s.logger.Error().Err(err).Str("conversationId", conversationID).Msg("Failed to update last_message_at")
		return fmt.Errorf("failed to update last_message_at: %w", err)
	}

	return nil
}

// DeleteConversation deletes a conversation
func (s *ChatConversationStore) DeleteConversation(ctx context.Context, conversationID string) error {
	if s.db.DB == nil {
		return fmt.Errorf("database not available")
	}

	query := `DELETE FROM chat_conversations WHERE id = $1`
	result, err := s.db.ExecContext(ctx, query, conversationID)
	if err != nil {
		s.logger.Error().Err(err).Str("conversationId", conversationID).Msg("Failed to delete conversation")
		return fmt.Errorf("failed to delete conversation: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("conversation not found")
	}

	return nil
}

