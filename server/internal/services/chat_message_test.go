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

func setupChatMessageServiceTest(t *testing.T) (*ChatMessageService, *ChatMessageStore, *ChatConversationStore, sqlmock.Sqlmock, func()) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)

	logger := zerolog.Nop()
	database := database.NewDatabase(&logger)
	database.DB = db

	msgStore := NewChatMessageStore(database, &logger)
	convStore := NewChatConversationStore(database, &logger)
	service := NewChatMessageService(msgStore, convStore, &logger)

	cleanup := func() {
		db.Close()
	}

	return service, msgStore, convStore, mock, cleanup
}

func TestChatMessageService_AddMessage_Success(t *testing.T) {
	service, _, _, mock, cleanup := setupChatMessageServiceTest(t)
	defer cleanup()

	ctx := context.Background()
	conversationID := "test-conv-id"
	role := "user"
	content := "Hello"
	now := time.Now()

	// Mock conversation exists check
	mock.ExpectQuery(`SELECT id, title, created_at, updated_at, last_message_at FROM chat_conversations`).
		WithArgs(conversationID).
		WillReturnRows(sqlmock.NewRows([]string{"id", "title", "created_at", "updated_at", "last_message_at"}).
			AddRow(conversationID, "Test", now, now, now))

	// Mock get next sequence
	mock.ExpectQuery(`SELECT COALESCE\(MAX\(sequence\), 0\) \+ 1 FROM chat_messages`).
		WithArgs(conversationID).
		WillReturnRows(sqlmock.NewRows([]string{"sequence"}).AddRow(1))

	// Mock message insert
	mock.ExpectQuery(`INSERT INTO chat_messages`).
		WithArgs(sqlmock.AnyArg(), conversationID, role, content, "{}", 1, sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"id", "conversation_id", "role", "content", "metadata", "sequence", "created_at"}).
			AddRow("msg-id", conversationID, role, content, "{}", 1, now))

	// Mock update last_message_at
	mock.ExpectExec(`UPDATE chat_conversations SET last_message_at = NOW\(\)`).
		WithArgs(conversationID).
		WillReturnResult(sqlmock.NewResult(0, 1))

	msg, err := service.AddMessage(ctx, conversationID, role, content, nil)
	require.NoError(t, err)
	assert.Equal(t, role, msg.Role)
	assert.Equal(t, content, msg.Content)
	assert.Equal(t, conversationID, msg.ConversationId)
}

func TestChatMessageService_AddMessage_ConversationNotFound(t *testing.T) {
	service, _, _, mock, cleanup := setupChatMessageServiceTest(t)
	defer cleanup()

	ctx := context.Background()
	conversationID := "non-existent-id"

	mock.ExpectQuery(`SELECT id, title, created_at, updated_at, last_message_at FROM chat_conversations`).
		WithArgs(conversationID).
		WillReturnError(sql.ErrNoRows)

	msg, err := service.AddMessage(ctx, conversationID, "user", "Hello", nil)
	assert.Error(t, err)
	assert.Nil(t, msg)
	assert.Contains(t, err.Error(), "conversation not found")
}

func TestChatMessageService_BatchAddMessages_Success(t *testing.T) {
	service, _, _, mock, cleanup := setupChatMessageServiceTest(t)
	defer cleanup()

	ctx := context.Background()
	conversationID := "test-conv-id"
	now := time.Now()

	// Mock conversation exists check
	mock.ExpectQuery(`SELECT id, title, created_at, updated_at, last_message_at FROM chat_conversations`).
		WithArgs(conversationID).
		WillReturnRows(sqlmock.NewRows([]string{"id", "title", "created_at", "updated_at", "last_message_at"}).
			AddRow(conversationID, "Test", now, now, now))

	// Mock begin transaction
	mock.ExpectBegin()

	// Mock get next sequence
	mock.ExpectQuery(`SELECT COALESCE\(MAX\(sequence\), 0\) \+ 1 FROM chat_messages`).
		WithArgs(conversationID).
		WillReturnRows(sqlmock.NewRows([]string{"sequence"}).AddRow(1))

	// Mock batch insert
	mock.ExpectExec(`INSERT INTO chat_messages`).
		WithArgs(sqlmock.AnyArg(), conversationID, "user", "Hello", "{}", 1, sqlmock.AnyArg()).
		WillReturnResult(sqlmock.NewResult(0, 1))

	mock.ExpectExec(`INSERT INTO chat_messages`).
		WithArgs(sqlmock.AnyArg(), conversationID, "assistant", "Hi", "{}", 2, sqlmock.AnyArg()).
		WillReturnResult(sqlmock.NewResult(0, 1))

	// Mock commit
	mock.ExpectCommit()

	// Mock update last_message_at
	mock.ExpectExec(`UPDATE chat_conversations SET last_message_at = NOW\(\)`).
		WithArgs(conversationID).
		WillReturnResult(sqlmock.NewResult(0, 1))

	messages := []struct {
		Role     string
		Content  string
		Metadata map[string]interface{}
	}{
		{Role: "user", Content: "Hello", Metadata: nil},
		{Role: "assistant", Content: "Hi", Metadata: nil},
	}

	createdMessages, err := service.BatchAddMessages(ctx, conversationID, messages)
	require.NoError(t, err)
	assert.Len(t, createdMessages, 2)
}

func TestChatMessageService_GetMessages_Success(t *testing.T) {
	service, _, _, mock, cleanup := setupChatMessageServiceTest(t)
	defer cleanup()

	ctx := context.Background()
	conversationID := "test-conv-id"
	now := time.Now()

	mock.ExpectQuery(`SELECT id, conversation_id, role, content, metadata, sequence, created_at FROM chat_messages`).
		WithArgs(conversationID).
		WillReturnRows(sqlmock.NewRows([]string{"id", "conversation_id", "role", "content", "metadata", "sequence", "created_at"}).
			AddRow("msg-1", conversationID, "user", "Hello", "{}", 1, now).
			AddRow("msg-2", conversationID, "assistant", "Hi", "{}", 2, now))

	messages, err := service.GetMessages(ctx, conversationID)
	require.NoError(t, err)
	assert.Len(t, messages, 2)
	assert.Equal(t, "user", messages[0].Role)
	assert.Equal(t, "assistant", messages[1].Role)
}

