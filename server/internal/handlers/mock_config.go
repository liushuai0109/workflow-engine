package handlers

import (
	"fmt"
	"net/http"

	"github.com/bpmn-explorer/server/internal/models"
	"github.com/bpmn-explorer/server/internal/services"
	"github.com/bpmn-explorer/server/pkg/database"
	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
)

// MockConfigHandler handles mock configuration requests
type MockConfigHandler struct {
	service *services.MockConfigService
	logger  *zerolog.Logger
}

// NewMockConfigHandler creates a new MockConfigHandler
func NewMockConfigHandler(db *database.Database, logger *zerolog.Logger) *MockConfigHandler {
	return &MockConfigHandler{
		service: services.NewMockConfigService(db, logger),
		logger:  logger,
	}
}

// CreateMockConfig creates a new mock configuration
func (h *MockConfigHandler) CreateMockConfig(c *gin.Context) {
	workflowId := c.Param("workflowId")
	if workflowId == "" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"workflowId is required",
		))
		return
	}

	var req struct {
		Name           string                            `json:"name" binding:"required"`
		Description    string                            `json:"description"`
		NodeConfigs    map[string]models.NodeConfig      `json:"nodeConfigs"`
		GatewayConfigs map[string]models.GatewayConfig  `json:"gatewayConfigs"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			fmt.Sprintf("Invalid request body: %v", err),
		))
		return
	}

	if req.NodeConfigs == nil {
		req.NodeConfigs = make(map[string]models.NodeConfig)
	}
	if req.GatewayConfigs == nil {
		req.GatewayConfigs = make(map[string]models.GatewayConfig)
	}

	config, err := h.service.CreateMockConfig(
		c.Request.Context(),
		workflowId,
		req.Name,
		req.Description,
		req.NodeConfigs,
		req.GatewayConfigs,
	)

	if err != nil {
		h.logger.Error().Err(err).Str("workflowId", workflowId).Msg("Failed to create mock config")
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrInternalError,
			"Failed to create mock config",
		))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(config))
}

// GetMockConfigs gets all mock configurations for a workflow
func (h *MockConfigHandler) GetMockConfigs(c *gin.Context) {
	workflowId := c.Param("workflowId")
	if workflowId == "" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"workflowId is required",
		))
		return
	}

	configs, err := h.service.GetMockConfigsByWorkflowID(c.Request.Context(), workflowId)
	if err != nil {
		h.logger.Error().Err(err).Str("workflowId", workflowId).Msg("Failed to get mock configs")
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrInternalError,
			"Failed to get mock configs",
		))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(configs))
}

// GetMockConfig gets a mock configuration by ID
func (h *MockConfigHandler) GetMockConfig(c *gin.Context) {
	configId := c.Param("configId")
	if configId == "" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"configId is required",
		))
		return
	}

	config, err := h.service.GetMockConfigByID(c.Request.Context(), configId)
	if err != nil {
		h.logger.Error().Err(err).Str("configId", configId).Msg("Failed to get mock config")
		c.JSON(http.StatusNotFound, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"Mock config not found",
		))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(config))
}

// UpdateMockConfig updates a mock configuration
func (h *MockConfigHandler) UpdateMockConfig(c *gin.Context) {
	configId := c.Param("configId")
	if configId == "" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"configId is required",
		))
		return
	}

	var req struct {
		Name           string                            `json:"name" binding:"required"`
		Description    string                            `json:"description"`
		NodeConfigs    map[string]models.NodeConfig      `json:"nodeConfigs"`
		GatewayConfigs map[string]models.GatewayConfig   `json:"gatewayConfigs"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			fmt.Sprintf("Invalid request body: %v", err),
		))
		return
	}

	if req.NodeConfigs == nil {
		req.NodeConfigs = make(map[string]models.NodeConfig)
	}
	if req.GatewayConfigs == nil {
		req.GatewayConfigs = make(map[string]models.GatewayConfig)
	}

	config, err := h.service.UpdateMockConfig(
		c.Request.Context(),
		configId,
		req.Name,
		req.Description,
		req.NodeConfigs,
		req.GatewayConfigs,
	)

	if err != nil {
		h.logger.Error().Err(err).Str("configId", configId).Msg("Failed to update mock config")
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrInternalError,
			"Failed to update mock config",
		))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(config))
}

// DeleteMockConfig deletes a mock configuration
func (h *MockConfigHandler) DeleteMockConfig(c *gin.Context) {
	configId := c.Param("configId")
	if configId == "" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"configId is required",
		))
		return
	}

	err := h.service.DeleteMockConfig(c.Request.Context(), configId)
	if err != nil {
		h.logger.Error().Err(err).Str("configId", configId).Msg("Failed to delete mock config")
		c.JSON(http.StatusNotFound, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"Mock config not found",
		))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(map[string]string{"message": "Mock config deleted"}))
}

