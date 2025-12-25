package services

import (
	"context"
	"fmt"

	"github.com/bpmn-explorer/server/internal/models"
	"github.com/rs/zerolog"
)

// ChatConversationService handles chat conversation business logic
type ChatConversationService struct {
	store  *ChatConversationStore
	msgStore *ChatMessageStore
	logger *zerolog.Logger
}

// NewChatConversationService creates a new ChatConversationService
func NewChatConversationService(store *ChatConversationStore, msgStore *ChatMessageStore, logger *zerolog.Logger) *ChatConversationService {
	return &ChatConversationService{
		store:    store,
		msgStore: msgStore,
		logger:   logger,
	}
}

// CreateConversation creates a new conversation
func (s *ChatConversationService) CreateConversation(ctx context.Context, title string) (*models.ChatConversation, error) {
	if title == "" {
		title = "新对话"
	}

	conv, err := s.store.CreateConversation(ctx, title)
	if err != nil {
		return nil, fmt.Errorf("failed to create conversation: %w", err)
	}

	s.logger.Info().Str("conversationId", conv.Id).Msg("Conversation created")
	return conv, nil
}

// GetConversation retrieves a conversation with its messages
func (s *ChatConversationService) GetConversation(ctx context.Context, conversationID string) (*models.ChatConversation, []*models.ChatMessage, error) {
	conv, err := s.store.GetConversationByID(ctx, conversationID)
	if err != nil {
		return nil, nil, fmt.Errorf("conversation not found: %w", err)
	}

	messages, err := s.msgStore.GetMessagesByConversationID(ctx, conversationID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get messages: %w", err)
	}

	conv.MessageCount = len(messages)
	return conv, messages, nil
}

// ListConversations retrieves conversations with pagination
func (s *ChatConversationService) ListConversations(ctx context.Context, page, pageSize int, orderBy, order string) ([]*models.ChatConversation, int, error) {
	conversations, total, err := s.store.ListConversations(ctx, page, pageSize, orderBy, order)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list conversations: %w", err)
	}

	return conversations, total, nil
}

// UpdateConversation updates a conversation
func (s *ChatConversationService) UpdateConversation(ctx context.Context, conversationID, title string) (*models.ChatConversation, error) {
	conv, err := s.store.UpdateConversation(ctx, conversationID, title)
	if err != nil {
		return nil, fmt.Errorf("failed to update conversation: %w", err)
	}

	s.logger.Info().Str("conversationId", conversationID).Msg("Conversation updated")
	return conv, nil
}

// DeleteConversation deletes a conversation
func (s *ChatConversationService) DeleteConversation(ctx context.Context, conversationID string) error {
	err := s.store.DeleteConversation(ctx, conversationID)
	if err != nil {
		return fmt.Errorf("failed to delete conversation: %w", err)
	}

	s.logger.Info().Str("conversationId", conversationID).Msg("Conversation deleted")
	return nil
}

