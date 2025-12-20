package services

import (
	"context"
	"fmt"

	"github.com/bpmn-explorer/server/internal/models"
	"github.com/rs/zerolog"
)

// ChatMessageService handles chat message business logic
type ChatMessageService struct {
	store      *ChatMessageStore
	convStore  *ChatConversationStore
	logger     *zerolog.Logger
}

// NewChatMessageService creates a new ChatMessageService
func NewChatMessageService(store *ChatMessageStore, convStore *ChatConversationStore, logger *zerolog.Logger) *ChatMessageService {
	return &ChatMessageService{
		store:     store,
		convStore: convStore,
		logger:    logger,
	}
}

// AddMessage adds a message to a conversation
func (s *ChatMessageService) AddMessage(ctx context.Context, conversationID, role, content string, metadata map[string]interface{}) (*models.ChatMessage, error) {
	// Verify conversation exists
	_, err := s.convStore.GetConversationByID(ctx, conversationID)
	if err != nil {
		return nil, fmt.Errorf("conversation not found: %w", err)
	}

	// Create message
	msg, err := s.store.CreateMessage(ctx, conversationID, role, content, metadata)
	if err != nil {
		return nil, fmt.Errorf("failed to create message: %w", err)
	}

	// Update conversation's last_message_at
	err = s.convStore.UpdateLastMessageAt(ctx, conversationID)
	if err != nil {
		s.logger.Warn().Err(err).Str("conversationId", conversationID).Msg("Failed to update last_message_at")
		// Don't fail the request if this fails
	}

	s.logger.Info().Str("conversationId", conversationID).Str("messageId", msg.Id).Msg("Message added")
	return msg, nil
}

// BatchAddMessages adds multiple messages to a conversation
func (s *ChatMessageService) BatchAddMessages(ctx context.Context, conversationID string, messages []struct {
	Role     string
	Content  string
	Metadata map[string]interface{}
}) ([]*models.ChatMessage, error) {
	// Verify conversation exists
	_, err := s.convStore.GetConversationByID(ctx, conversationID)
	if err != nil {
		return nil, fmt.Errorf("conversation not found: %w", err)
	}

	// Batch create messages
	createdMessages, err := s.store.BatchCreateMessages(ctx, conversationID, messages)
	if err != nil {
		return nil, fmt.Errorf("failed to batch create messages: %w", err)
	}

	// Update conversation's last_message_at
	err = s.convStore.UpdateLastMessageAt(ctx, conversationID)
	if err != nil {
		s.logger.Warn().Err(err).Str("conversationId", conversationID).Msg("Failed to update last_message_at")
		// Don't fail the request if this fails
	}

	s.logger.Info().Str("conversationId", conversationID).Int("count", len(createdMessages)).Msg("Messages batch added")
	return createdMessages, nil
}

// GetMessages retrieves messages for a conversation
func (s *ChatMessageService) GetMessages(ctx context.Context, conversationID string) ([]*models.ChatMessage, error) {
	messages, err := s.store.GetMessagesByConversationID(ctx, conversationID)
	if err != nil {
		return nil, fmt.Errorf("failed to get messages: %w", err)
	}

	return messages, nil
}

