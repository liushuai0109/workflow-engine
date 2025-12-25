package handlers

import (
	"fmt"
	"net/http"

	"github.com/bpmn-explorer/server/internal/models"
	"github.com/bpmn-explorer/server/internal/parser"
	"github.com/bpmn-explorer/server/internal/services"
	"github.com/bpmn-explorer/server/pkg/database"
	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
)

// DebugHandler handles debug session requests
type DebugHandler struct {
	debugSessionService *services.DebugSessionService
	workflowService     *services.WorkflowService
	logger              *zerolog.Logger
}

// NewDebugHandler creates a new DebugHandler
func NewDebugHandler(db *database.Database, logger *zerolog.Logger) *DebugHandler {
	return &DebugHandler{
		debugSessionService: services.NewDebugSessionService(db, logger),
		workflowService:     services.NewWorkflowService(db, logger),
		logger:              logger,
	}
}

// StartDebug starts a new debug session
func (h *DebugHandler) StartDebug(c *gin.Context) {
	workflowId := c.Param("workflowId")
	if workflowId == "" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"workflowId is required",
		))
		return
	}

	var req struct {
		ExecutionId     string                 `json:"executionId,omitempty"`
		InitialVariables map[string]interface{} `json:"initialVariables,omitempty"`
		Breakpoints     []string               `json:"breakpoints,omitempty"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			fmt.Sprintf("Invalid request body: %v", err),
		))
		return
	}

	session, err := h.debugSessionService.CreateDebugSession(
		c.Request.Context(),
		workflowId,
		req.ExecutionId,
		req.InitialVariables,
		req.Breakpoints,
	)

	if err != nil {
		h.logger.Error().Err(err).Str("workflowId", workflowId).Msg("Failed to start debug session")
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrInternalError,
			"Failed to start debug session",
		))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(session))
}

// GetDebugSession gets a debug session by ID
func (h *DebugHandler) GetDebugSession(c *gin.Context) {
	sessionId := c.Param("sessionId")
	if sessionId == "" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"sessionId is required",
		))
		return
	}

	session, err := h.debugSessionService.GetDebugSessionByID(c.Request.Context(), sessionId)
	if err != nil {
		h.logger.Error().Err(err).Str("sessionId", sessionId).Msg("Failed to get debug session")
		c.JSON(http.StatusNotFound, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"Debug session not found",
		))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(session))
}

// StepDebug executes a single step in debug session
func (h *DebugHandler) StepDebug(c *gin.Context) {
	sessionId := c.Param("sessionId")
	if sessionId == "" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"sessionId is required",
		))
		return
	}

	// 获取 debug session
	session, err := h.debugSessionService.GetDebugSessionByID(c.Request.Context(), sessionId)
	if err != nil {
		h.logger.Error().Err(err).Str("sessionId", sessionId).Msg("Failed to get debug session")
		c.JSON(http.StatusNotFound, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"Debug session not found",
		))
		return
	}

	// 检查 session 状态
	if session.Status == models.DebugStatusCompleted {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"Debug session is already completed",
		))
		return
	}

	if session.Status == models.DebugStatusStopped {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"Debug session is stopped",
		))
		return
	}

	// 获取工作流定义
	workflow, err := h.workflowService.GetWorkflowByID(c.Request.Context(), session.WorkflowId)
	if err != nil {
		h.logger.Error().Err(err).Str("workflowId", session.WorkflowId).Msg("Failed to get workflow")
		c.JSON(http.StatusNotFound, models.NewErrorResponse(
			models.ErrWorkflowNotFound,
			"Workflow not found",
		))
		return
	}

	// 解析 BPMN XML
	wd, err := parser.ParseBPMN(workflow.BpmnXml)
	if err != nil {
		h.logger.Error().Err(err).Str("workflowId", session.WorkflowId).Msg("Failed to parse BPMN XML")
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrInternalError,
			"Failed to parse BPMN XML",
		))
		return
	}

	// 执行单步
	executor := services.NewDebugExecutor(h.logger)
	err = executor.ExecuteStep(c.Request.Context(), session, wd)
	if err != nil {
		h.logger.Error().Err(err).Str("sessionId", sessionId).Msg("Failed to execute step")
		session.Status = models.DebugStatusStopped
		// 更新 session 状态为停止
		_, updateErr := h.debugSessionService.UpdateDebugSession(
			c.Request.Context(),
			sessionId,
			models.DebugStatusStopped,
			session.CurrentNodeId,
			session.Variables,
			session.Breakpoints,
			session.CallStack,
		)
		if updateErr != nil {
			h.logger.Error().Err(updateErr).Msg("Failed to update session status")
		}
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrInternalError,
			fmt.Sprintf("Failed to execute step: %v", err),
		))
		return
	}

	// 更新 session
	updatedSession, err := h.debugSessionService.UpdateDebugSession(
		c.Request.Context(),
		sessionId,
		session.Status,
		session.CurrentNodeId,
		session.Variables,
		session.Breakpoints,
		session.CallStack,
	)
	if err != nil {
		h.logger.Error().Err(err).Str("sessionId", sessionId).Msg("Failed to update debug session")
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrInternalError,
			"Failed to update debug session",
		))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(updatedSession))
}

// ContinueDebug continues debug execution
func (h *DebugHandler) ContinueDebug(c *gin.Context) {
	sessionId := c.Param("sessionId")
	if sessionId == "" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"sessionId is required",
		))
		return
	}

	// 获取 debug session
	session, err := h.debugSessionService.GetDebugSessionByID(c.Request.Context(), sessionId)
	if err != nil {
		h.logger.Error().Err(err).Str("sessionId", sessionId).Msg("Failed to get debug session")
		c.JSON(http.StatusNotFound, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"Debug session not found",
		))
		return
	}

	// 检查 session 状态
	if session.Status == models.DebugStatusCompleted {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"Debug session is already completed",
		))
		return
	}

	if session.Status == models.DebugStatusStopped {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"Debug session is stopped",
		))
		return
	}

	// 获取工作流定义
	workflow, err := h.workflowService.GetWorkflowByID(c.Request.Context(), session.WorkflowId)
	if err != nil {
		h.logger.Error().Err(err).Str("workflowId", session.WorkflowId).Msg("Failed to get workflow")
		c.JSON(http.StatusNotFound, models.NewErrorResponse(
			models.ErrWorkflowNotFound,
			"Workflow not found",
		))
		return
	}

	// 解析 BPMN XML
	wd, err := parser.ParseBPMN(workflow.BpmnXml)
	if err != nil {
		h.logger.Error().Err(err).Str("workflowId", session.WorkflowId).Msg("Failed to parse BPMN XML")
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrInternalError,
			"Failed to parse BPMN XML",
		))
		return
	}

	// 继续执行
	executor := services.NewDebugExecutor(h.logger)
	err = executor.ContinueExecution(c.Request.Context(), session, wd)
	if err != nil {
		h.logger.Error().Err(err).Str("sessionId", sessionId).Msg("Failed to continue execution")
		session.Status = models.DebugStatusFailed
		// 更新 session 状态为失败
		_, updateErr := h.debugSessionService.UpdateDebugSession(
			c.Request.Context(),
			sessionId,
			models.DebugStatusFailed,
			session.CurrentNodeId,
			session.Variables,
			session.Breakpoints,
			session.CallStack,
		)
		if updateErr != nil {
			h.logger.Error().Err(updateErr).Msg("Failed to update session status")
		}
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrInternalError,
			fmt.Sprintf("Failed to continue execution: %v", err),
		))
		return
	}

	// 更新 session
	updatedSession, err := h.debugSessionService.UpdateDebugSession(
		c.Request.Context(),
		sessionId,
		session.Status,
		session.CurrentNodeId,
		session.Variables,
		session.Breakpoints,
		session.CallStack,
	)
	if err != nil {
		h.logger.Error().Err(err).Str("sessionId", sessionId).Msg("Failed to update debug session")
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrInternalError,
			"Failed to update debug session",
		))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(updatedSession))
}

// GetDebugVariables gets variables for a debug session
func (h *DebugHandler) GetDebugVariables(c *gin.Context) {
	sessionId := c.Param("sessionId")
	if sessionId == "" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"sessionId is required",
		))
		return
	}

	session, err := h.debugSessionService.GetDebugSessionByID(c.Request.Context(), sessionId)
	if err != nil {
		c.JSON(http.StatusNotFound, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"Debug session not found",
		))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(session.Variables))
}

// GetDebugNode gets node information for a debug session
func (h *DebugHandler) GetDebugNode(c *gin.Context) {
	sessionId := c.Param("sessionId")
	nodeId := c.Param("nodeId")

	if sessionId == "" || nodeId == "" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"sessionId and nodeId are required",
		))
		return
	}

	// TODO: Implement node information retrieval
	c.JSON(http.StatusNotImplemented, models.NewErrorResponse(
		models.ErrInternalError,
		"Node information retrieval not yet implemented",
	))
}

// SetBreakpoints sets breakpoints for a debug session
func (h *DebugHandler) SetBreakpoints(c *gin.Context) {
	sessionId := c.Param("sessionId")
	if sessionId == "" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"sessionId is required",
		))
		return
	}

	var req struct {
		Breakpoints []string `json:"breakpoints" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			fmt.Sprintf("Invalid request body: %v", err),
		))
		return
	}

	session, err := h.debugSessionService.GetDebugSessionByID(c.Request.Context(), sessionId)
	if err != nil {
		c.JSON(http.StatusNotFound, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"Debug session not found",
		))
		return
	}

	updatedSession, err := h.debugSessionService.UpdateDebugSession(
		c.Request.Context(),
		sessionId,
		session.Status,
		session.CurrentNodeId,
		session.Variables,
		req.Breakpoints,
		session.CallStack,
	)

	if err != nil {
		h.logger.Error().Err(err).Str("sessionId", sessionId).Msg("Failed to set breakpoints")
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrInternalError,
			"Failed to set breakpoints",
		))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(updatedSession))
}

// StopDebug stops a debug session
func (h *DebugHandler) StopDebug(c *gin.Context) {
	sessionId := c.Param("sessionId")
	if sessionId == "" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"sessionId is required",
		))
		return
	}

	session, err := h.debugSessionService.GetDebugSessionByID(c.Request.Context(), sessionId)
	if err != nil {
		c.JSON(http.StatusNotFound, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"Debug session not found",
		))
		return
	}

	updatedSession, err := h.debugSessionService.UpdateDebugSession(
		c.Request.Context(),
		sessionId,
		models.DebugStatusStopped,
		session.CurrentNodeId,
		session.Variables,
		session.Breakpoints,
		session.CallStack,
	)

	if err != nil {
		h.logger.Error().Err(err).Str("sessionId", sessionId).Msg("Failed to stop debug session")
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrInternalError,
			"Failed to stop debug session",
		))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(updatedSession))
}

