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

// ExecutionHistoryHandler handles execution history requests
type ExecutionHistoryHandler struct {
	historyService *services.ExecutionHistoryService
	logger         *zerolog.Logger
}

// NewExecutionHistoryHandler creates a new ExecutionHistoryHandler
func NewExecutionHistoryHandler(db *database.Database, logger *zerolog.Logger) *ExecutionHistoryHandler {
	return &ExecutionHistoryHandler{
		historyService: services.NewExecutionHistoryService(db, logger),
		logger:         logger,
	}
}

// GetExecutionHistories gets execution histories by execution ID
func (h *ExecutionHistoryHandler) GetExecutionHistories(c *gin.Context) {
	executionId := c.Param("executionId")
	if executionId == "" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"executionId is required",
		))
		return
	}

	// Parse pagination parameters
	limit := 100
	offset := 0
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
			limit = parsed
		}
	}
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if parsed, err := strconv.Atoi(offsetStr); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	histories, total, err := h.historyService.GetExecutionHistories(
		c.Request.Context(),
		executionId,
		limit,
		offset,
	)
	if err != nil {
		h.logger.Error().Err(err).Str("executionId", executionId).Msg("Failed to get execution histories")
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrInternalError,
			"Failed to get execution histories",
		))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(map[string]interface{}{
		"histories": histories,
		"total":     total,
		"limit":     limit,
		"offset":    offset,
	}))
}

