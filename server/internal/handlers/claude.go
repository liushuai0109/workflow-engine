package handlers

import (
	"bytes"
	"io"
	"net/http"

	"github.com/bpmn-explorer/server/internal/models"
	"github.com/bpmn-explorer/server/pkg/config"
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
	h.logger.Info().
		Str("apiKey", maskAPIKey(h.config.APIKey)).
		Str("baseURL", h.config.BaseURL).
		Msg("Received Claude API request")

	if h.config.APIKey == "" {
		h.logger.Error().Msg("Claude API key is empty")
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
	// jiekou.ai uses /anthropic/v1/messages instead of /v1/messages
	endpoint := "/v1/messages"
	if h.config.BaseURL == "https://api.jiekou.ai" {
		endpoint = "/anthropic/v1/messages"
	}
	proxyURL := h.config.BaseURL + endpoint
	h.logger.Info().Str("proxyURL", proxyURL).Msg("Sending request to Claude API")

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

	h.logger.Info().
		Int("statusCode", resp.StatusCode).
		Str("responsePreview", string(respBody[:min(200, len(respBody))])).
		Msg("Received response from Claude API")

	// Forward response
	c.Data(resp.StatusCode, resp.Header.Get("Content-Type"), respBody)
}

// min returns the minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// maskAPIKey masks the API key for logging
func maskAPIKey(key string) string {
	if len(key) <= 8 {
		return "****"
	}
	return key[:4] + "****" + key[len(key)-4:]
}
