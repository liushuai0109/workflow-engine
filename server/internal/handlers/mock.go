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

// MockHandler handles mock execution requests
type MockHandler struct {
	mockExecutor      *services.MockExecutor
	mockConfigService *services.MockConfigService
	workflowSvc       *services.WorkflowService
	logger            *zerolog.Logger
}

// NewMockHandler creates a new MockHandler
func NewMockHandler(
	db *database.Database,
	logger *zerolog.Logger,
	workflowSvc *services.WorkflowService,
) *MockHandler {
	return &MockHandler{
		mockExecutor:      services.NewMockExecutor(db, logger, workflowSvc),
		mockConfigService: services.NewMockConfigService(db, logger),
		workflowSvc:       workflowSvc,
		logger:            logger,
	}
}

// ExecuteMock executes a workflow with mock configuration
func (h *MockHandler) ExecuteMock(c *gin.Context) {
	workflowId := c.Param("workflowId")
	if workflowId == "" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"workflowId is required",
		))
		return
	}

	var req struct {
		ConfigId        string                 `json:"configId,omitempty"`
		InitialVariables map[string]interface{} `json:"initialVariables,omitempty"`
		BpmnXml         string                 `json:"bpmnXml,omitempty"` // 允许从请求中传递 BPMN XML
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			fmt.Sprintf("Invalid request body: %v", err),
		))
		return
	}

	// Get mock config if provided
	var mockConfig *models.MockConfig
	if req.ConfigId != "" {
		config, err := h.mockConfigService.GetMockConfigByID(c.Request.Context(), req.ConfigId)
		if err != nil {
			c.JSON(http.StatusNotFound, models.NewErrorResponse(
				models.ErrInvalidRequest,
				"Mock config not found",
			))
			return
		}
		mockConfig = config
	}

	// 如果提供了 BPMN XML，保存到内存存储
	if req.BpmnXml != "" {
		workflow := &models.Workflow{
			Id:      workflowId,
			Name:    workflowId, // 使用 workflowId 作为默认名称
			BpmnXml: req.BpmnXml,
		}
		h.workflowSvc.SetWorkflowInMemory(workflow)
	}

	// Execute workflow
	execution, err := h.mockExecutor.ExecuteWorkflow(
		c.Request.Context(),
		workflowId,
		mockConfig,
		req.InitialVariables,
		req.BpmnXml, // 传递 BPMN XML
	)

	if err != nil {
		h.logger.Error().Err(err).Str("workflowId", workflowId).Msg("Failed to execute mock workflow")
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrInternalError,
			"Failed to execute mock workflow",
		))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(execution))
}

// GetMockExecution gets a mock execution by ID
func (h *MockHandler) GetMockExecution(c *gin.Context) {
	executionId := c.Param("executionId")
	if executionId == "" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"executionId is required",
		))
		return
	}

	// Get execution from store (in-memory)
	// Note: This is a simplified implementation. In production, you might want to persist to database
	execution, err := h.mockExecutor.GetExecution(c.Request.Context(), executionId)
	if err != nil {
		c.JSON(http.StatusNotFound, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"Mock execution not found",
		))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(execution))
}

// StepMockExecution executes a single step in mock execution
func (h *MockHandler) StepMockExecution(c *gin.Context) {
	// executionId 可以从 URL 参数获取（不再需要 workflowId）
	executionId := c.Param("executionId")
	if executionId == "" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"executionId is required",
		))
		return
	}

	// Get execution
	execution, err := h.mockExecutor.GetExecution(c.Request.Context(), executionId)
	if err != nil {
		c.JSON(http.StatusNotFound, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"Mock execution not found",
		))
		return
	}

	// Get mock config if execution has configId
	var mockConfig *models.MockConfig
	// TODO: Retrieve mock config if stored with execution

	// Execute single step
	err = h.mockExecutor.StepExecution(c.Request.Context(), execution, mockConfig)
	if err != nil {
		h.logger.Error().Err(err).Str("executionId", executionId).Msg("Failed to step mock execution")
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrInternalError,
			fmt.Sprintf("Failed to step execution: %v", err),
		))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(execution))
}

// ContinueMockExecution continues mock execution
func (h *MockHandler) ContinueMockExecution(c *gin.Context) {
	executionId := c.Param("executionId")
	if executionId == "" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"executionId is required",
		))
		return
	}

	// Get mock config if provided
	var mockConfig *models.MockConfig
	// TODO: Retrieve mock config if stored with execution

	// Continue execution
	execution, err := h.mockExecutor.ContinueExecution(c.Request.Context(), executionId, mockConfig)
	if err != nil {
		h.logger.Error().Err(err).Str("executionId", executionId).Msg("Failed to continue mock execution")
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrInternalError,
			fmt.Sprintf("Failed to continue execution: %v", err),
		))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(execution))
}

// StopMockExecution stops mock execution
func (h *MockHandler) StopMockExecution(c *gin.Context) {
	executionId := c.Param("executionId")
	if executionId == "" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"executionId is required",
		))
		return
	}

	err := h.mockExecutor.StopExecution(executionId)
	if err != nil {
		h.logger.Error().Err(err).Str("executionId", executionId).Msg("Failed to stop mock execution")
		c.JSON(http.StatusNotFound, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"Mock execution not found",
		))
		return
	}

	// Get updated execution
	execution, err := h.mockExecutor.GetExecution(c.Request.Context(), executionId)
	if err != nil {
		c.JSON(http.StatusNotFound, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"Mock execution not found",
		))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(execution))
}

