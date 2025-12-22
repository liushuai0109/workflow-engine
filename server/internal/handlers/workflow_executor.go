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
		logger: logger,
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
		FromNodeId     string                 `json:"fromNodeId"` // Optional: removed "binding:required"
		BusinessParams map[string]interface{} `json:"businessParams,omitempty"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			fmt.Sprintf("Invalid request body: %v", err),
		))
		return
	}

	// 调用执行引擎
	result, err := h.engineService.ExecuteFromNode(
		c.Request.Context(),
		workflowInstanceId,
		req.FromNodeId,
		req.BusinessParams,
	)

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
			"Failed to execute workflow for unknown reason",
		))
		return
	}

	// 返回成功响应
	c.JSON(http.StatusOK, models.NewSuccessResponse(result))
}
