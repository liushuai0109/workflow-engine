package handlers

import (
	"net/http"

	"github.com/bpmn-explorer/server/internal/models"
	"github.com/bpmn-explorer/server/internal/services"
	"github.com/bpmn-explorer/server/pkg/database"
	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
)

// WorkflowHandler handles workflow-related requests
type WorkflowHandler struct {
	service *services.WorkflowService
	logger  *zerolog.Logger
}

// NewWorkflowHandler creates a new WorkflowHandler
func NewWorkflowHandler(db *database.Database, logger *zerolog.Logger) *WorkflowHandler {
	return &WorkflowHandler{
		service: services.NewWorkflowService(db, logger),
		logger:  logger,
	}
}

// CreateWorkflow creates a new workflow
func (h *WorkflowHandler) CreateWorkflow(c *gin.Context) {
	var req struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
		XML         string `json:"xml" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"Invalid request body",
		))
		return
	}

	workflow, err := h.service.CreateWorkflow(c.Request.Context(), req.Name, req.Description, req.XML)
	if err != nil {
		h.logger.Error().Err(err).Msg("Failed to create workflow")
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrInternalError,
			"Failed to create workflow",
		))
		return
	}

	c.JSON(http.StatusCreated, models.NewSuccessResponse(workflow))
}

// GetWorkflow retrieves a workflow by ID
func (h *WorkflowHandler) GetWorkflow(c *gin.Context) {
	workflowID := c.Param("workflowId")

	workflow, err := h.service.GetWorkflowByID(c.Request.Context(), workflowID)
	if err != nil {
		h.logger.Error().Err(err).Str("workflowId", workflowID).Msg("Failed to get workflow")
		c.JSON(http.StatusNotFound, models.NewErrorResponse(
			models.ErrWorkflowNotFound,
			"Workflow not found",
		))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(workflow))
}

// UpdateWorkflow updates a workflow
func (h *WorkflowHandler) UpdateWorkflow(c *gin.Context) {
	workflowID := c.Param("workflowId")

	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		XML         string `json:"xml"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"Invalid request body",
		))
		return
	}

	workflow, err := h.service.UpdateWorkflow(c.Request.Context(), workflowID, req.Name, req.Description, req.XML)
	if err != nil {
		h.logger.Error().Err(err).Str("workflowId", workflowID).Msg("Failed to update workflow")
		c.JSON(http.StatusNotFound, models.NewErrorResponse(
			models.ErrWorkflowNotFound,
			"Workflow not found",
		))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(workflow))
}

// ListWorkflows lists all workflows
func (h *WorkflowHandler) ListWorkflows(c *gin.Context) {
	// TODO: Implement pagination
	workflows, err := h.service.ListWorkflows(c.Request.Context())
	if err != nil {
		h.logger.Error().Err(err).Msg("Failed to list workflows")
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrInternalError,
			"Failed to list workflows",
		))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(workflows))
}
