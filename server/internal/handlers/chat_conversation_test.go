package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/bpmn-explorer/server/internal/models"
	"github.com/bpmn-explorer/server/pkg/database"
	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupChatConversationHandlerTest(t *testing.T) (*ChatConversationHandler, sqlmock.Sqlmock, func()) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)

	logger := zerolog.Nop()
	database := database.NewDatabase(&logger)
	database.DB = db

	handler := NewChatConversationHandler(database, &logger)

	cleanup := func() {
		db.Close()
	}

	return handler, mock, cleanup
}

func TestChatConversationHandler_CreateConversation_Success(t *testing.T) {
	handler, mock, cleanup := setupChatConversationHandlerTest(t)
	defer cleanup()

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/api/chat/conversations", handler.CreateConversation)

	// Mock database insert
	mock.ExpectQuery(`INSERT INTO chat_conversations`).
		WillReturnRows(sqlmock.NewRows([]string{"id", "title", "created_at", "updated_at", "last_message_at"}).
			AddRow("test-id", "Test Conversation", nil, nil, nil))

	reqBody := map[string]interface{}{
		"title": "Test Conversation",
	}
	body, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest("POST", "/api/chat/conversations", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
	var response models.APIResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.True(t, response.Success)
	assert.NotNil(t, response.Data)
}

func TestChatConversationHandler_CreateConversation_NoTitle(t *testing.T) {
	handler, mock, cleanup := setupChatConversationHandlerTest(t)
	defer cleanup()

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/api/chat/conversations", handler.CreateConversation)

	// Mock database insert with default title
	mock.ExpectQuery(`INSERT INTO chat_conversations`).
		WillReturnRows(sqlmock.NewRows([]string{"id", "title", "created_at", "updated_at", "last_message_at"}).
			AddRow("test-id", "新对话", nil, nil, nil))

	req, _ := http.NewRequest("POST", "/api/chat/conversations", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
}

func TestChatConversationHandler_GetConversations_Success(t *testing.T) {
	handler, mock, cleanup := setupChatConversationHandlerTest(t)
	defer cleanup()

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/api/chat/conversations", handler.GetConversations)

	// Mock count query
	mock.ExpectQuery(`SELECT COUNT\(\*\)`).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

	// Mock list query
	mock.ExpectQuery(`SELECT id, title, created_at, updated_at, last_message_at`).
		WillReturnRows(sqlmock.NewRows([]string{"id", "title", "created_at", "updated_at", "last_message_at"}).
			AddRow("test-id", "Test Conversation", nil, nil, nil))

	req, _ := http.NewRequest("GET", "/api/chat/conversations?page=1&pageSize=20", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var response models.APIResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.True(t, response.Success)
	assert.NotNil(t, response.Data)
	assert.NotNil(t, response.Metadata)
}

func TestChatConversationHandler_GetConversation_Success(t *testing.T) {
	handler, mock, cleanup := setupChatConversationHandlerTest(t)
	defer cleanup()

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/api/chat/conversations/:id", handler.GetConversation)

	// Mock conversation query
	mock.ExpectQuery(`SELECT id, title, created_at, updated_at, last_message_at`).
		WithArgs("test-id").
		WillReturnRows(sqlmock.NewRows([]string{"id", "title", "created_at", "updated_at", "last_message_at"}).
			AddRow("test-id", "Test Conversation", nil, nil, nil))

	// Mock messages query
	mock.ExpectQuery(`SELECT id, conversation_id, role, content, metadata, sequence, created_at`).
		WithArgs("test-id").
		WillReturnRows(sqlmock.NewRows([]string{"id", "conversation_id", "role", "content", "metadata", "sequence", "created_at"}).
			AddRow("msg-id", "test-id", "user", "Hello", "{}", 1, nil))

	req, _ := http.NewRequest("GET", "/api/chat/conversations/test-id", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var response models.APIResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.True(t, response.Success)
}

func TestChatConversationHandler_GetConversation_NotFound(t *testing.T) {
	handler, mock, cleanup := setupChatConversationHandlerTest(t)
	defer cleanup()

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/api/chat/conversations/:id", handler.GetConversation)

	// Mock conversation query returning no rows
	mock.ExpectQuery(`SELECT id, title, created_at, updated_at, last_message_at`).
		WithArgs("non-existent-id").
		WillReturnRows(sqlmock.NewRows([]string{"id", "title", "created_at", "updated_at", "last_message_at"}))

	req, _ := http.NewRequest("GET", "/api/chat/conversations/non-existent-id", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
	var response models.APIResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.False(t, response.Success)
}

func TestChatConversationHandler_UpdateConversation_Success(t *testing.T) {
	handler, mock, cleanup := setupChatConversationHandlerTest(t)
	defer cleanup()

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.PUT("/api/chat/conversations/:id", handler.UpdateConversation)

	// Mock update query
	mock.ExpectExec(`UPDATE chat_conversations`).
		WithArgs("New Title", "test-id").
		WillReturnResult(sqlmock.NewResult(1, 1))

	// Mock select query after update
	mock.ExpectQuery(`SELECT id, title, created_at, updated_at, last_message_at`).
		WithArgs("test-id").
		WillReturnRows(sqlmock.NewRows([]string{"id", "title", "created_at", "updated_at", "last_message_at"}).
			AddRow("test-id", "New Title", nil, nil, nil))

	reqBody := map[string]interface{}{
		"title": "New Title",
	}
	body, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest("PUT", "/api/chat/conversations/test-id", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var response models.APIResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.True(t, response.Success)
}

func TestChatConversationHandler_DeleteConversation_Success(t *testing.T) {
	handler, mock, cleanup := setupChatConversationHandlerTest(t)
	defer cleanup()

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.DELETE("/api/chat/conversations/:id", handler.DeleteConversation)

	// Mock delete query
	mock.ExpectExec(`DELETE FROM chat_conversations`).
		WithArgs("test-id").
		WillReturnResult(sqlmock.NewResult(1, 1))

	req, _ := http.NewRequest("DELETE", "/api/chat/conversations/test-id", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestChatConversationHandler_AddMessage_Success(t *testing.T) {
	handler, mock, cleanup := setupChatConversationHandlerTest(t)
	defer cleanup()

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/api/chat/conversations/:id/messages", handler.AddMessage)

	// Mock conversation exists check
	mock.ExpectQuery(`SELECT id, title, created_at, updated_at, last_message_at`).
		WithArgs("test-id").
		WillReturnRows(sqlmock.NewRows([]string{"id", "title", "created_at", "updated_at", "last_message_at"}).
			AddRow("test-id", "Test Conversation", nil, nil, nil))

	// Mock get next sequence
	mock.ExpectQuery(`SELECT COALESCE\(MAX\(sequence\), 0\)`).
		WithArgs("test-id").
		WillReturnRows(sqlmock.NewRows([]string{"max"}).AddRow(0))

	// Mock message insert
	mock.ExpectQuery(`INSERT INTO chat_messages`).
		WillReturnRows(sqlmock.NewRows([]string{"id", "conversation_id", "role", "content", "metadata", "sequence", "created_at"}).
			AddRow("msg-id", "test-id", "user", "Hello", "{}", 1, nil))

	// Mock update last_message_at
	mock.ExpectExec(`UPDATE chat_conversations SET last_message_at`).
		WithArgs("test-id").
		WillReturnResult(sqlmock.NewResult(1, 1))

	reqBody := map[string]interface{}{
		"role":    "user",
		"content": "Hello",
	}
	body, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest("POST", "/api/chat/conversations/test-id/messages", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
	var response models.APIResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.True(t, response.Success)
}

func TestChatConversationHandler_AddMessage_InvalidRole(t *testing.T) {
	handler, _, cleanup := setupChatConversationHandlerTest(t)
	defer cleanup()

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/api/chat/conversations/:id/messages", handler.AddMessage)

	reqBody := map[string]interface{}{
		"role":    "invalid",
		"content": "Hello",
	}
	body, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest("POST", "/api/chat/conversations/test-id/messages", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestChatConversationHandler_BatchAddMessages_Success(t *testing.T) {
	handler, mock, cleanup := setupChatConversationHandlerTest(t)
	defer cleanup()

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/api/chat/conversations/:id/messages/batch", handler.BatchAddMessages)

	// Mock conversation exists check
	mock.ExpectQuery(`SELECT id, title, created_at, updated_at, last_message_at`).
		WithArgs("test-id").
		WillReturnRows(sqlmock.NewRows([]string{"id", "title", "created_at", "updated_at", "last_message_at"}).
			AddRow("test-id", "Test Conversation", nil, nil, nil))

	// Mock get next sequence
	mock.ExpectQuery(`SELECT COALESCE\(MAX\(sequence\), 0\)`).
		WithArgs("test-id").
		WillReturnRows(sqlmock.NewRows([]string{"max"}).AddRow(0))

	// Mock transaction begin
	mock.ExpectBegin()

	// Mock batch insert
	mock.ExpectExec(`INSERT INTO chat_messages`).
		WillReturnResult(sqlmock.NewResult(2, 2))

	// Mock transaction commit
	mock.ExpectCommit()

	// Mock update last_message_at
	mock.ExpectExec(`UPDATE chat_conversations SET last_message_at`).
		WithArgs("test-id").
		WillReturnResult(sqlmock.NewResult(1, 1))

	// Mock select messages after insert
	mock.ExpectQuery(`SELECT id, conversation_id, role, content, metadata, sequence, created_at`).
		WithArgs("test-id").
		WillReturnRows(sqlmock.NewRows([]string{"id", "conversation_id", "role", "content", "metadata", "sequence", "created_at"}).
			AddRow("msg-1", "test-id", "user", "Hello", "{}", 1, nil).
			AddRow("msg-2", "test-id", "assistant", "Hi", "{}", 2, nil))

	reqBody := map[string]interface{}{
		"messages": []map[string]interface{}{
			{"role": "user", "content": "Hello"},
			{"role": "assistant", "content": "Hi"},
		},
	}
	body, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest("POST", "/api/chat/conversations/test-id/messages/batch", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
	var response models.APIResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.True(t, response.Success)
}

