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

// WorkflowExecutorHandler handles workflow execution requests
type WorkflowExecutorHandler struct {
	engineService *services.WorkflowEngineService
	workflowSvc   *services.WorkflowService
	instanceSvc   *services.WorkflowInstanceService
	logger        *zerolog.Logger
}

// NewWorkflowExecutorHandler creates a new WorkflowExecutorHandler
func NewWorkflowExecutorHandler(
	db *database.Database,
	logger *zerolog.Logger,
	workflowSvc *services.WorkflowService,
	instanceSvc *services.WorkflowInstanceService,
	executionSvc *services.WorkflowExecutionService,
) *WorkflowExecutorHandler {
	return &WorkflowExecutorHandler{
		engineService: services.NewWorkflowEngineService(
			db,
			logger,
			workflowSvc,
			instanceSvc,
			executionSvc,
		),
		workflowSvc: workflowSvc,
		instanceSvc: instanceSvc,
		logger:      logger,
	}
}

// ExecuteWorkflow executes workflow from a specific node
func (h *WorkflowExecutorHandler) ExecuteWorkflow(c *gin.Context) {
	// 解析路径参数
	workflowInstanceId := c.Param("workflowInstanceId")
	if workflowInstanceId == "" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"workflowInstanceId is required",
		))
		return
	}

	// 解析请求体
	var req struct {
		FromNodeId       string                 `json:"fromNodeId"` // Optional: removed "binding:required"
		BusinessParams   map[string]interface{} `json:"businessParams,omitempty"`
		Workflow         *models.Workflow       `json:"workflow,omitempty"`         // Optional: for mock mode
		WorkflowInstance *models.WorkflowInstance `json:"workflowInstance,omitempty"` // Optional: for mock mode
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			fmt.Sprintf("Invalid request body: %v", err),
		))
		return
	}

	// 调用执行引擎
	var result *services.ExecuteResult
	var err error

	if req.Workflow != nil && req.WorkflowInstance != nil {
		// Mock mode: use provided data directly
		h.logger.Info().
			Str("workflowInstanceId", workflowInstanceId).
			Msg("Executing with provided data (mock mode)")

		result, err = h.engineService.ExecuteFromNode(
			c.Request.Context(),
			req.Workflow,
			req.WorkflowInstance,
			req.FromNodeId,
			req.BusinessParams,
		)
	} else {
		// Normal mode: fetch from database
		h.logger.Info().
			Str("workflowInstanceId", workflowInstanceId).
			Msg("Fetching workflow and instance from database")

		// 1. Get workflow instance from database
		instance, err := h.instanceSvc.GetWorkflowInstanceByID(c.Request.Context(), workflowInstanceId)
		if err != nil {
			h.logger.Error().Err(err).
				Str("workflowInstanceId", workflowInstanceId).
				Msg("Failed to get workflow instance")
			c.JSON(http.StatusNotFound, models.NewErrorResponse(
				models.ErrWorkflowInstanceNotFound,
				"Workflow instance not found",
			))
			return
		}

		// 2. Get workflow from database
		workflow, err := h.workflowSvc.GetWorkflowByID(c.Request.Context(), instance.WorkflowId)
		if err != nil {
			h.logger.Error().Err(err).
				Str("workflowId", instance.WorkflowId).
				Msg("Failed to get workflow")
			c.JSON(http.StatusNotFound, models.NewErrorResponse(
				models.ErrWorkflowNotFound,
				"Workflow not found",
			))
			return
		}

		// 3. Call execution engine with prepared data
		result, err = h.engineService.ExecuteFromNode(
			c.Request.Context(),
			workflow,
			instance,
			req.FromNodeId,
			req.BusinessParams,
		)
	}

	if err != nil {
		h.logger.Error().Err(err).
			Str("workflowInstanceId", workflowInstanceId).
			Str("fromNodeId", req.FromNodeId).
			Msg("Failed to execute workflow")

		// 根据错误类型返回不同的状态码
		if err.Error() == models.ErrWorkflowInstanceNotFound+": workflow instance not found" {
			c.JSON(http.StatusNotFound, models.NewErrorResponse(
				models.ErrWorkflowInstanceNotFound,
				"Workflow instance not found",
			))
			return
		}

		if err.Error() == models.ErrInvalidNodeId+": node "+req.FromNodeId+" not found in workflow definition" {
			c.JSON(http.StatusBadRequest, models.NewErrorResponse(
				models.ErrInvalidNodeId,
				fmt.Sprintf("Node %s not found in workflow definition", req.FromNodeId),
			))
			return
		}

		// 其他错误返回 500
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrInternalError,
			"Failed to execute workflow for unknown reason 2",
		))
		return
	}

	// 返回成功响应
	c.JSON(http.StatusOK, models.NewSuccessResponse(result))
}

// ExecuteWorkflowMock executes workflow in mock mode (workflow and instance from request body)
func (h *WorkflowExecutorHandler) ExecuteWorkflowMock(c *gin.Context) {
	// 解析请求体
	var req struct {
		FromNodeId       string                   `json:"fromNodeId"` // Optional
		BusinessParams   map[string]interface{}   `json:"businessParams,omitempty"`
		Workflow         *models.Workflow         `json:"workflow" binding:"required"`
		WorkflowInstance *models.WorkflowInstance `json:"workflowInstance" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			fmt.Sprintf("Invalid request body: %v", err),
		))
		return
	}

	// 验证 workflow 和 workflowInstance 必须提供
	if req.Workflow == nil || req.WorkflowInstance == nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"workflow and workflowInstance are required for mock mode",
		))
		return
	}

	// 使用 workflowInstance.Id 作为 instanceId
	workflowInstanceId := req.WorkflowInstance.Id

	h.logger.Info().
		Str("workflowInstanceId", workflowInstanceId).
		Str("workflowId", req.Workflow.Id).
		Msg("Executing workflow in mock mode (full data from request body)")

	// 调用执行引擎 (传递完整的 workflow 和 instance 数据)
	result, err := h.engineService.ExecuteFromNode(
		c.Request.Context(),
		req.Workflow,
		req.WorkflowInstance,
		req.FromNodeId,
		req.BusinessParams,
	)

	if err != nil {
		h.logger.Error().Err(err).
			Str("workflowInstanceId", workflowInstanceId).
			Str("fromNodeId", req.FromNodeId).
			Msg("Failed to execute workflow in mock mode")

		// 根据错误类型返回不同的状态码
		if err.Error() == models.ErrInvalidNodeId+": node "+req.FromNodeId+" not found in workflow definition" {
			c.JSON(http.StatusBadRequest, models.NewErrorResponse(
				models.ErrInvalidNodeId,
				fmt.Sprintf("Node %s not found in workflow definition", req.FromNodeId),
			))
			return
		}

		// 其他错误返回 500
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrInternalError,
			"Failed to execute workflow in mock mode",
		))
		return
	}

	// 返回成功响应
	c.JSON(http.StatusOK, models.NewSuccessResponse(result))
}
