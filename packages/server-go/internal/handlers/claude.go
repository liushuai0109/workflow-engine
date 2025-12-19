package handlers

import (
	"bytes"
	"io"
	"net/http"

	"github.com/bpmn-explorer/server-go/internal/models"
	"github.com/bpmn-explorer/server-go/pkg/config"
	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
)

// ClaudeHandler handles Claude API proxy requests
type ClaudeHandler struct {
	config config.ClaudeConfig
	logger *zerolog.Logger
	client *http.Client
}

// NewClaudeHandler creates a new ClaudeHandler
func NewClaudeHandler(cfg config.ClaudeConfig, logger *zerolog.Logger) *ClaudeHandler {
	return &ClaudeHandler{
		config: cfg,
		logger: logger,
		client: &http.Client{},
	}
}

// ProxyMessages proxies requests to Claude API
func (h *ClaudeHandler) ProxyMessages(c *gin.Context) {
	if h.config.APIKey == "" {
		c.JSON(http.StatusServiceUnavailable, models.NewErrorResponse(
			"CLAUDE_API_NOT_CONFIGURED",
			"Claude API is not configured",
		))
		return
	}

	// Read request body
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		h.logger.Error().Err(err).Msg("Failed to read request body")
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"Failed to read request body",
		))
		return
	}

	// Create proxy request
	proxyURL := h.config.BaseURL + "/v1/messages"
	proxyReq, err := http.NewRequest("POST", proxyURL, bytes.NewReader(body))
	if err != nil {
		h.logger.Error().Err(err).Msg("Failed to create proxy request")
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrInternalError,
			"Failed to create proxy request",
		))
		return
	}

	// Copy headers
	proxyReq.Header.Set("Content-Type", "application/json")
	proxyReq.Header.Set("x-api-key", h.config.APIKey)
	proxyReq.Header.Set("anthropic-version", "2023-06-01")

	// Send request
	resp, err := h.client.Do(proxyReq)
	if err != nil {
		h.logger.Error().Err(err).Msg("Failed to send proxy request")
		c.JSON(http.StatusBadGateway, models.NewErrorResponse(
			models.ErrInternalError,
			"Failed to communicate with Claude API",
		))
		return
	}
	defer resp.Body.Close()

	// Read response
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		h.logger.Error().Err(err).Msg("Failed to read proxy response")
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrInternalError,
			"Failed to read Claude API response",
		))
		return
	}

	// Forward response
	c.Data(resp.StatusCode, resp.Header.Get("Content-Type"), respBody)
}
