package services

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/bpmn-explorer/server/internal/models"
	"github.com/bpmn-explorer/server/pkg/database"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupChatConversationServiceTest(t *testing.T) (*ChatConversationService, *ChatConversationStore, *ChatMessageStore, sqlmock.Sqlmock, func()) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)

	logger := zerolog.Nop()
	database := database.NewDatabase(&logger)
	database.DB = db

	convStore := NewChatConversationStore(database, &logger)
	msgStore := NewChatMessageStore(database, &logger)
	service := NewChatConversationService(convStore, msgStore, &logger)

	cleanup := func() {
		db.Close()
	}

	return service, convStore, msgStore, mock, cleanup
}

func TestChatConversationService_CreateConversation_Success(t *testing.T) {
	service, _, _, mock, cleanup := setupChatConversationServiceTest(t)
	defer cleanup()

	ctx := context.Background()
	title := "Test Conversation"
	now := time.Now()

	mock.ExpectQuery(`INSERT INTO chat_conversations`).
		WithArgs(sqlmock.AnyArg(), title, sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"id", "title", "created_at", "updated_at", "last_message_at"}).
			AddRow("test-id", title, now, now, now))

	conv, err := service.CreateConversation(ctx, title)
	require.NoError(t, err)
	assert.Equal(t, title, conv.Title)
	assert.NotEmpty(t, conv.Id)
}

func TestChatConversationService_CreateConversation_DefaultTitle(t *testing.T) {
	service, _, _, mock, cleanup := setupChatConversationServiceTest(t)
	defer cleanup()

	ctx := context.Background()
	now := time.Now()

	mock.ExpectQuery(`INSERT INTO chat_conversations`).
		WithArgs(sqlmock.AnyArg(), "新对话", sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"id", "title", "created_at", "updated_at", "last_message_at"}).
			AddRow("test-id", "新对话", now, now, now))

	conv, err := service.CreateConversation(ctx, "")
	require.NoError(t, err)
	assert.Equal(t, "新对话", conv.Title)
}

func TestChatConversationService_GetConversation_Success(t *testing.T) {
	service, _, _, mock, cleanup := setupChatConversationServiceTest(t)
	defer cleanup()

	ctx := context.Background()
	conversationID := "test-conv-id"
	now := time.Now()

	// Mock conversation query
	mock.ExpectQuery(`SELECT id, title, created_at, updated_at, last_message_at FROM chat_conversations`).
		WithArgs(conversationID).
		WillReturnRows(sqlmock.NewRows([]string{"id", "title", "created_at", "updated_at", "last_message_at"}).
			AddRow(conversationID, "Test", now, now, now))

	// Mock messages query
	mock.ExpectQuery(`SELECT id, conversation_id, role, content, metadata, sequence, created_at FROM chat_messages`).
		WithArgs(conversationID).
		WillReturnRows(sqlmock.NewRows([]string{"id", "conversation_id", "role", "content", "metadata", "sequence", "created_at"}).
			AddRow("msg-1", conversationID, "user", "Hello", "{}", 1, now).
			AddRow("msg-2", conversationID, "assistant", "Hi", "{}", 2, now))

	conv, messages, err := service.GetConversation(ctx, conversationID)
	require.NoError(t, err)
	assert.NotNil(t, conv)
	assert.Equal(t, conversationID, conv.Id)
	assert.Len(t, messages, 2)
	assert.Equal(t, 2, conv.MessageCount)
}

func TestChatConversationService_GetConversation_NotFound(t *testing.T) {
	service, _, _, mock, cleanup := setupChatConversationServiceTest(t)
	defer cleanup()

	ctx := context.Background()
	conversationID := "non-existent-id"

	mock.ExpectQuery(`SELECT id, title, created_at, updated_at, last_message_at FROM chat_conversations`).
		WithArgs(conversationID).
		WillReturnError(sql.ErrNoRows)

	conv, messages, err := service.GetConversation(ctx, conversationID)
	assert.Error(t, err)
	assert.Nil(t, conv)
	assert.Nil(t, messages)
}

func TestChatConversationService_ListConversations_Success(t *testing.T) {
	service, _, _, mock, cleanup := setupChatConversationServiceTest(t)
	defer cleanup()

	ctx := context.Background()
	now := time.Now()

	// Mock count query
	mock.ExpectQuery(`SELECT COUNT\(\*\) FROM chat_conversations`).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))

	// Mock list query
	mock.ExpectQuery(`SELECT id, title, created_at, updated_at, last_message_at FROM chat_conversations`).
		WillReturnRows(sqlmock.NewRows([]string{"id", "title", "created_at", "updated_at", "last_message_at"}).
			AddRow("conv-1", "Conversation 1", now, now, now).
			AddRow("conv-2", "Conversation 2", now, now, now))

	conversations, total, err := service.ListConversations(ctx, 1, 10, "updated_at", "DESC")
	require.NoError(t, err)
	assert.Equal(t, 2, total)
	assert.Len(t, conversations, 2)
}

func TestChatConversationService_UpdateConversation_Success(t *testing.T) {
	service, _, _, mock, cleanup := setupChatConversationServiceTest(t)
	defer cleanup()

	ctx := context.Background()
	conversationID := "test-conv-id"
	newTitle := "Updated Title"
	now := time.Now()

	mock.ExpectQuery(`UPDATE chat_conversations SET title = \$1, updated_at = NOW\(\)`).
		WithArgs(newTitle, conversationID).
		WillReturnRows(sqlmock.NewRows([]string{"id", "title", "created_at", "updated_at", "last_message_at"}).
			AddRow(conversationID, newTitle, now, now, now))

	conv, err := service.UpdateConversation(ctx, conversationID, newTitle)
	require.NoError(t, err)
	assert.Equal(t, newTitle, conv.Title)
}

func TestChatConversationService_DeleteConversation_Success(t *testing.T) {
	service, _, _, mock, cleanup := setupChatConversationServiceTest(t)
	defer cleanup()

	ctx := context.Background()
	conversationID := "test-conv-id"

	mock.ExpectExec(`DELETE FROM chat_conversations WHERE id = \$1`).
		WithArgs(conversationID).
		WillReturnResult(sqlmock.NewResult(0, 1))

	err := service.DeleteConversation(ctx, conversationID)
	require.NoError(t, err)
}

