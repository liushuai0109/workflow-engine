package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/bpmn-explorer/server/internal/interceptor"
	"github.com/bpmn-explorer/server/internal/models"
	"github.com/bpmn-explorer/server/internal/parser"
	"github.com/bpmn-explorer/server/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
)

// InterceptorHandler handles interceptor-related HTTP requests
type InterceptorHandler struct {
	engineService   *services.WorkflowEngineService
	mockInstanceSvc *services.MockInstanceService
	workflowSvc     *services.WorkflowService
	sessionStore    interceptor.SessionStore
	logger          *zerolog.Logger
}

// NewInterceptorHandler creates a new InterceptorHandler
func NewInterceptorHandler(
	engineService *services.WorkflowEngineService,
	mockInstanceSvc *services.MockInstanceService,
	workflowSvc *services.WorkflowService,
	sessionStore interceptor.SessionStore,
	logger *zerolog.Logger,
) *InterceptorHandler {
	return &InterceptorHandler{
		engineService:   engineService,
		mockInstanceSvc: mockInstanceSvc,
		workflowSvc:     workflowSvc,
		sessionStore:    sessionStore,
		logger:          logger,
	}
}

// ExecuteIntercept initializes interceptor execution
// POST /api/interceptor/workflows/:workflowId/execute
func (h *InterceptorHandler) ExecuteIntercept(c *gin.Context) {
	workflowId := c.Param("workflowId")

	var req struct {
		StartNodeId      string                 `json:"startNodeId,omitempty"`
		InitialVariables map[string]interface{} `json:"initialVariables,omitempty"`
		MockData         map[string]interface{} `json:"mockData,omitempty"`
		BpmnXml          string                 `json:"bpmnXml,omitempty"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			err.Error(),
		))
		return
	}

	// 1. Save BPMN XML if provided
	if req.BpmnXml != "" {
		workflow := &models.Workflow{
			Id:      workflowId,
			Name:    workflowId,
			BpmnXml: req.BpmnXml,
		}
		h.workflowSvc.SetWorkflowInMemory(workflow)
	}

	// 2. Find start node if not provided
	if req.StartNodeId == "" {
		workflow, err := h.workflowSvc.GetWorkflowByID(c.Request.Context(), workflowId)
		if err != nil {
			c.JSON(http.StatusNotFound, models.NewErrorResponse(
				models.ErrInvalidRequest,
				"Workflow not found",
			))
			return
		}

		wd, err := parser.ParseBPMN(workflow.BpmnXml)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
				models.ErrInternalError,
				"Failed to parse BPMN",
			))
			return
		}

		if len(wd.StartEvents) == 0 {
			c.JSON(http.StatusBadRequest, models.NewErrorResponse(
				models.ErrInvalidRequest,
				"No start event found",
			))
			return
		}

		req.StartNodeId = wd.StartEvents[0]
	}

	// 3. Create Mock instance
	mockInstance, err := h.mockInstanceSvc.CreateMockInstanceWithStartNode(
		c.Request.Context(),
		workflowId,
		req.StartNodeId,
		req.InitialVariables,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrInternalError,
			err.Error(),
		))
		return
	}

	// 4. Create InterceptSession
	session := &interceptor.InterceptSession{
		ID:           fmt.Sprintf("session-%d", time.Now().UnixNano()),
		InstanceID:   mockInstance.Id,
		Mode:         interceptor.InterceptModeEnabled,
		DataStore:    interceptor.NewInterceptDataStore(),
		ExecutionLog: []interceptor.ExecutionLogEntry{},
		CreatedAt:    time.Now(),
	}

	// 5. Load Mock data
	if req.MockData != nil {
		session.DataStore.SetBatch(req.MockData)
	}

	// 6. Save Session
	h.sessionStore.Set(session.ID, session)

	// 7. Return initial state (do not execute)
	c.JSON(http.StatusOK, models.NewSuccessResponse(map[string]interface{}{
		"sessionId":      session.ID,
		"instanceId":     mockInstance.Id,
		"workflowId":     workflowId,
		"status":         mockInstance.Status,
		"currentNodeIds": mockInstance.CurrentNodeIds,
		"variables":      mockInstance.Variables,
	}))
}

// TriggerNode triggers node execution (for stopping points)
// POST /api/interceptor/instances/:instanceId/trigger
func (h *InterceptorHandler) TriggerNode(c *gin.Context) {
	instanceId := c.Param("instanceId")
	sessionId := c.Query("sessionId")

	var req struct {
		NodeId         string                 `json:"nodeId"`
		BusinessParams map[string]interface{} `json:"businessParams"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			err.Error(),
		))
		return
	}

	// 1. Get Session
	session, err := h.sessionStore.Get(sessionId)
	if err != nil {
		c.JSON(http.StatusNotFound, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"Session not found",
		))
		return
	}

	// 2. Create context with Session
	ctx := interceptor.WithInterceptSession(c.Request.Context(), session)

	// 3. Execute node
	result, err := h.engineService.ExecuteFromNode(
		ctx,
		instanceId,
		req.NodeId,
		req.BusinessParams,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrInternalError,
			err.Error(),
		))
		return
	}

	// 4. Save updated Session
	h.sessionStore.Set(sessionId, session)

	// 5. Return result
	c.JSON(http.StatusOK, models.NewSuccessResponse(map[string]interface{}{
		"result":       result,
		"executionLog": session.ExecutionLog,
	}))
}

// GetInterceptSession retrieves session information
// GET /api/interceptor/sessions/:sessionId
func (h *InterceptorHandler) GetInterceptSession(c *gin.Context) {
	sessionId := c.Param("sessionId")

	session, err := h.sessionStore.Get(sessionId)
	if err != nil {
		c.JSON(http.StatusNotFound, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"Session not found",
		))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(session))
}

// GetExecutionLog retrieves execution log
// GET /api/interceptor/sessions/:sessionId/log
func (h *InterceptorHandler) GetExecutionLog(c *gin.Context) {
	sessionId := c.Param("sessionId")

	session, err := h.sessionStore.Get(sessionId)
	if err != nil {
		c.JSON(http.StatusNotFound, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"Session not found",
		))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(session.ExecutionLog))
}

// ResetIntercept resets intercept execution
// POST /api/interceptor/sessions/:sessionId/reset
func (h *InterceptorHandler) ResetIntercept(c *gin.Context) {
	sessionId := c.Param("sessionId")

	session, err := h.sessionStore.Get(sessionId)
	if err != nil {
		c.JSON(http.StatusNotFound, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"Session not found",
		))
		return
	}

	// Delete Mock instance
	h.mockInstanceSvc.DeleteMockInstance(c.Request.Context(), session.InstanceID)

	// Delete Session
	h.sessionStore.Delete(sessionId)

	c.JSON(http.StatusOK, models.NewSuccessResponse(map[string]interface{}{
		"message": "Intercept execution reset successfully",
	}))
}
