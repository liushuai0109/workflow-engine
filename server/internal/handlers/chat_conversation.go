package handlers

import (
	"net/http"
	"strconv"

	"github.com/bpmn-explorer/server/internal/models"
	"github.com/bpmn-explorer/server/internal/services"
	"github.com/bpmn-explorer/server/pkg/database"
	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
)

// ChatConversationHandler handles chat conversation-related requests
type ChatConversationHandler struct {
	convService *services.ChatConversationService
	msgService  *services.ChatMessageService
	logger      *zerolog.Logger
}

// NewChatConversationHandler creates a new ChatConversationHandler
func NewChatConversationHandler(db *database.Database, logger *zerolog.Logger) *ChatConversationHandler {
	convStore := services.NewChatConversationStore(db, logger)
	msgStore := services.NewChatMessageStore(db, logger)
	convService := services.NewChatConversationService(convStore, msgStore, logger)
	msgService := services.NewChatMessageService(msgStore, convStore, logger)

	return &ChatConversationHandler{
		convService: convService,
		msgService:  msgService,
		logger:      logger,
	}
}

// CreateConversation creates a new conversation
func (h *ChatConversationHandler) CreateConversation(c *gin.Context) {
	var req struct {
		Title string `json:"title"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		// If no JSON body, use empty title (will default to "新对话")
		req.Title = ""
	}

	conv, err := h.convService.CreateConversation(c.Request.Context(), req.Title)
	if err != nil {
		h.logger.Error().Err(err).Msg("Failed to create conversation")
		
		// 检查是否是数据库不可用错误
		if err.Error() == "database not available" || 
		   err.Error() == "failed to create conversation: database not available" {
			c.JSON(http.StatusServiceUnavailable, models.NewErrorResponse(
				models.ErrDatabaseError,
				"Database is not available. Please ensure PostgreSQL is running and configured.",
			))
			return
		}
		
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrInternalError,
			"Failed to create conversation",
		))
		return
	}

	c.JSON(http.StatusCreated, models.NewSuccessResponse(conv))
}

// GetConversations retrieves conversations with pagination
func (h *ChatConversationHandler) GetConversations(c *gin.Context) {
	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))
	orderBy := c.DefaultQuery("orderBy", "lastMessageAt")
	order := c.DefaultQuery("order", "desc")

	conversations, total, err := h.convService.ListConversations(c.Request.Context(), page, pageSize, orderBy, order)
	if err != nil {
		h.logger.Error().Err(err).Msg("Failed to list conversations")
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrInternalError,
			"Failed to list conversations",
		))
		return
	}

	hasMore := page*pageSize < total
	metadata := &models.Metadata{
		Page:     page,
		PageSize: pageSize,
		Total:    total,
		HasMore:  hasMore,
	}

	response := models.APIResponse{
		Success:  true,
		Data:     conversations,
		Metadata: metadata,
	}

	c.JSON(http.StatusOK, response)
}

// GetConversation retrieves a conversation with its messages
func (h *ChatConversationHandler) GetConversation(c *gin.Context) {
	conversationID := c.Param("id")

	conv, messages, err := h.convService.GetConversation(c.Request.Context(), conversationID)
	if err != nil {
		h.logger.Error().Err(err).Str("conversationId", conversationID).Msg("Failed to get conversation")
		c.JSON(http.StatusNotFound, models.NewErrorResponse(
			models.ErrConversationNotFound,
			"Conversation not found",
		))
		return
	}

	responseData := map[string]interface{}{
		"conversation": conv,
		"messages":     messages,
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(responseData))
}

// UpdateConversation updates a conversation
func (h *ChatConversationHandler) UpdateConversation(c *gin.Context) {
	conversationID := c.Param("id")

	var req struct {
		Title string `json:"title" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"Invalid request body",
		))
		return
	}

	conv, err := h.convService.UpdateConversation(c.Request.Context(), conversationID, req.Title)
	if err != nil {
		h.logger.Error().Err(err).Str("conversationId", conversationID).Msg("Failed to update conversation")
		c.JSON(http.StatusNotFound, models.NewErrorResponse(
			models.ErrConversationNotFound,
			"Conversation not found",
		))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(conv))
}

// DeleteConversation deletes a conversation
func (h *ChatConversationHandler) DeleteConversation(c *gin.Context) {
	conversationID := c.Param("id")

	err := h.convService.DeleteConversation(c.Request.Context(), conversationID)
	if err != nil {
		h.logger.Error().Err(err).Str("conversationId", conversationID).Msg("Failed to delete conversation")
		c.JSON(http.StatusNotFound, models.NewErrorResponse(
			models.ErrConversationNotFound,
			"Conversation not found",
		))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(nil))
}

// AddMessage adds a message to a conversation
func (h *ChatConversationHandler) AddMessage(c *gin.Context) {
	conversationID := c.Param("id")

	var req struct {
		Role     string                 `json:"role" binding:"required"`
		Content  string                 `json:"content" binding:"required"`
		Metadata map[string]interface{} `json:"metadata"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"Invalid request body",
		))
		return
	}

	// Validate role
	if req.Role != "user" && req.Role != "assistant" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"Role must be 'user' or 'assistant'",
		))
		return
	}

	msg, err := h.msgService.AddMessage(c.Request.Context(), conversationID, req.Role, req.Content, req.Metadata)
	if err != nil {
		h.logger.Error().Err(err).Str("conversationId", conversationID).Msg("Failed to add message")
		if err.Error() == "conversation not found" {
			c.JSON(http.StatusNotFound, models.NewErrorResponse(
				models.ErrConversationNotFound,
				"Conversation not found",
			))
		} else {
			c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
				models.ErrInternalError,
				"Failed to add message",
			))
		}
		return
	}

	c.JSON(http.StatusCreated, models.NewSuccessResponse(msg))
}

// BatchAddMessages adds multiple messages to a conversation
func (h *ChatConversationHandler) BatchAddMessages(c *gin.Context) {
	conversationID := c.Param("id")

	var req struct {
		Messages []struct {
			Role     string                 `json:"role" binding:"required"`
			Content  string                 `json:"content" binding:"required"`
			Metadata map[string]interface{} `json:"metadata"`
		} `json:"messages" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"Invalid request body",
		))
		return
	}

	// Validate roles
	for _, msg := range req.Messages {
		if msg.Role != "user" && msg.Role != "assistant" {
			c.JSON(http.StatusBadRequest, models.NewErrorResponse(
				models.ErrInvalidRequest,
				"Role must be 'user' or 'assistant'",
			))
			return
		}
	}

	// Convert to service expected type
	serviceMessages := make([]struct {
		Role     string
		Content  string
		Metadata map[string]interface{}
	}, len(req.Messages))
	for i, msg := range req.Messages {
		serviceMessages[i] = struct {
			Role     string
			Content  string
			Metadata map[string]interface{}
		}{
			Role:     msg.Role,
			Content:  msg.Content,
			Metadata: msg.Metadata,
		}
	}

	messages, err := h.msgService.BatchAddMessages(c.Request.Context(), conversationID, serviceMessages)
	if err != nil {
		h.logger.Error().Err(err).Str("conversationId", conversationID).Msg("Failed to batch add messages")
		if err.Error() == "conversation not found" {
			c.JSON(http.StatusNotFound, models.NewErrorResponse(
				models.ErrConversationNotFound,
				"Conversation not found",
			))
		} else {
			c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
				models.ErrInternalError,
				"Failed to batch add messages",
			))
		}
		return
	}

	c.JSON(http.StatusCreated, models.NewSuccessResponse(messages))
}

