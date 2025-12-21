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

// MockHandler handles mock execution requests
type MockHandler struct {
	mockExecutor       *services.MockExecutor
	mockConfigService  *services.MockConfigService
	mockInstanceSvc    *services.MockInstanceService
	workflowSvc        *services.WorkflowService
	engineService      *services.WorkflowEngineService
	logger             *zerolog.Logger
}

// NewMockHandler creates a new MockHandler
func NewMockHandler(
	db *database.Database,
	logger *zerolog.Logger,
	workflowSvc *services.WorkflowService,
	instanceSvc *services.WorkflowInstanceService,
	executionSvc *services.WorkflowExecutionService,
) *MockHandler {
	// Create shared MockInstanceService to ensure same in-memory store
	mockInstanceSvc := services.NewMockInstanceService(db, logger, workflowSvc)

	return &MockHandler{
		mockExecutor:      services.NewMockExecutor(db, logger, workflowSvc),
		mockConfigService: services.NewMockConfigService(db, logger),
		mockInstanceSvc:   mockInstanceSvc,
		workflowSvc:       workflowSvc,
		engineService:     services.NewWorkflowEngineServiceWithMockInstance(db, logger, workflowSvc, instanceSvc, executionSvc, mockInstanceSvc),
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
		StartNodeId      string                              `json:"startNodeId,omitempty"`
		InitialVariables map[string]interface{}              `json:"initialVariables,omitempty"`
		NodeMockData     map[string]*services.NodeMockData   `json:"nodeMockData,omitempty"`
		BpmnXml          string                              `json:"bpmnXml,omitempty"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			fmt.Sprintf("Invalid request body: %v", err),
		))
		return
	}

	// Save BPMN XML to in-memory storage if provided
	var bpmnXml string
	if req.BpmnXml != "" {
		bpmnXml = req.BpmnXml
		workflow := &models.Workflow{
			Id:      workflowId,
			Name:    workflowId,
			BpmnXml: req.BpmnXml,
		}
		h.workflowSvc.SetWorkflowInMemory(workflow)
	}

	// If no startNodeId provided, find the StartEvent from BPMN
	startNodeId := req.StartNodeId
	if startNodeId == "" {
		// Get BPMN XML for parsing
		if bpmnXml == "" {
			// Get workflow from database if BPMN not provided in request
			workflow, err := h.workflowSvc.GetWorkflowByID(c.Request.Context(), workflowId)
			if err != nil {
				h.logger.Error().Err(err).Str("workflowId", workflowId).Msg("Failed to get workflow")
				c.JSON(http.StatusNotFound, models.NewErrorResponse(
					models.ErrInvalidRequest,
					fmt.Sprintf("Workflow not found: %v", err),
				))
				return
			}
			bpmnXml = workflow.BpmnXml
		}

		// Parse BPMN to find StartEvent
		wd, err := parser.ParseBPMN(bpmnXml)
		if err != nil {
			h.logger.Error().Err(err).Str("workflowId", workflowId).Msg("Failed to parse BPMN")
			c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
				models.ErrInternalError,
				fmt.Sprintf("Failed to parse BPMN: %v", err),
			))
			return
		}

		// Find StartEvent
		for _, node := range wd.Nodes {
			if node.Type == parser.NodeTypeStartEvent {
				startNodeId = node.Id
				h.logger.Info().Str("startNodeId", startNodeId).Msg("Auto-detected StartEvent")
				break
			}
		}

		if startNodeId == "" {
			c.JSON(http.StatusBadRequest, models.NewErrorResponse(
				models.ErrInvalidRequest,
				"No StartEvent found in workflow",
			))
			return
		}
	}

	// Create Mock instance with start node
	mockInstance, err := h.mockInstanceSvc.CreateMockInstanceWithStartNode(
		c.Request.Context(),
		workflowId,
		startNodeId,
		req.InitialVariables,
	)

	if err != nil {
		h.logger.Error().Err(err).Str("workflowId", workflowId).Msg("Failed to create mock instance")
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrInternalError,
			fmt.Sprintf("Failed to create mock instance: %v", err),
		))
		return
	}

	// Prepare Mock mode context
	mockConfig := &services.MockExecutionConfig{
		WorkflowInstanceId: mockInstance.Id,
		FromNodeId:         startNodeId,
		NodeMockData:       req.NodeMockData,
	}
	ctx := services.WithMockMode(c.Request.Context(), mockConfig)

	// Execute using real workflow engine with Mock mode
	result, err := h.engineService.ExecuteFromNode(
		ctx,
		mockInstance.Id,
		startNodeId,
		req.InitialVariables,
	)

	if err != nil {
		h.logger.Error().Err(err).
			Str("workflowId", workflowId).
			Str("instanceId", mockInstance.Id).
			Msg("Failed to execute mock workflow")
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrInternalError,
			fmt.Sprintf("Failed to execute mock workflow: %v", err),
		))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(result))
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
	instanceId := c.Param("instanceId")
	if instanceId == "" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"instanceId is required",
		))
		return
	}

	var req struct {
		BusinessParams map[string]interface{}              `json:"businessParams,omitempty"`
		NodeMockData   map[string]*services.NodeMockData   `json:"nodeMockData,omitempty"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			fmt.Sprintf("Invalid request body: %v", err),
		))
		return
	}

	// Get Mock instance
	mockInstance, err := h.mockInstanceSvc.GetMockInstance(c.Request.Context(), instanceId)
	if err != nil {
		c.JSON(http.StatusNotFound, models.NewErrorResponse(
			models.ErrInvalidRequest,
			fmt.Sprintf("Mock instance not found: %v", err),
		))
		return
	}

	// Get the next node to execute from currentNodeIds
	if len(mockInstance.CurrentNodeIds) == 0 {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"Mock instance has no current nodes to execute",
		))
		return
	}
	fromNodeId := mockInstance.CurrentNodeIds[0]

	// Prepare Mock mode context
	mockConfig := &services.MockExecutionConfig{
		WorkflowInstanceId: instanceId,
		FromNodeId:         fromNodeId,
		BusinessParams:     req.BusinessParams,
		NodeMockData:       req.NodeMockData,
	}
	ctx := services.WithMockMode(c.Request.Context(), mockConfig)

	// Execute using real workflow engine with Mock mode
	result, err := h.engineService.ExecuteFromNode(
		ctx,
		instanceId,
		fromNodeId,
		req.BusinessParams,
	)

	if err != nil {
		h.logger.Error().Err(err).
			Str("instanceId", instanceId).
			Str("fromNodeId", fromNodeId).
			Msg("Failed to step mock execution")
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrInternalError,
			fmt.Sprintf("Failed to step mock execution: %v", err),
		))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(result))
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


// GetMockInstance gets a mock instance by ID
func (h *MockHandler) GetMockInstance(c *gin.Context) {
	instanceId := c.Param("instanceId")
	if instanceId == "" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"instanceId is required",
		))
		return
	}

	instance, err := h.mockInstanceSvc.GetMockInstance(c.Request.Context(), instanceId)
	if err != nil {
		c.JSON(http.StatusNotFound, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"Mock instance not found",
		))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(instance))
}

// CreateMockInstance creates a new mock instance
func (h *MockHandler) CreateMockInstance(c *gin.Context) {
	var req struct {
		WorkflowId       string                 `json:"workflowId"`
		StartNodeId      string                 `json:"startNodeId,omitempty"`
		InitialVariables map[string]interface{} `json:"initialVariables,omitempty"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			fmt.Sprintf("Invalid request body: %v", err),
		))
		return
	}

	if req.WorkflowId == "" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"workflowId is required",
		))
		return
	}

	var instance *services.MockWorkflowInstance
	var err error

	if req.StartNodeId != "" {
		instance, err = h.mockInstanceSvc.CreateMockInstanceWithStartNode(
			c.Request.Context(),
			req.WorkflowId,
			req.StartNodeId,
			req.InitialVariables,
		)
	} else {
		instance, err = h.mockInstanceSvc.CreateMockInstance(
			c.Request.Context(),
			req.WorkflowId,
			req.InitialVariables,
		)
	}

	if err != nil {
		h.logger.Error().Err(err).Str("workflowId", req.WorkflowId).Msg("Failed to create mock instance")
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrInternalError,
			fmt.Sprintf("Failed to create mock instance: %v", err),
		))
		return
	}

	c.JSON(http.StatusCreated, models.NewSuccessResponse(instance))
}

// UpdateMockInstance updates a mock instance
func (h *MockHandler) UpdateMockInstance(c *gin.Context) {
	instanceId := c.Param("instanceId")
	if instanceId == "" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"instanceId is required",
		))
		return
	}

	var req struct {
		Status         string                 `json:"status,omitempty"`
		CurrentNodeIds []string               `json:"currentNodeIds,omitempty"`
		Variables      map[string]interface{} `json:"variables,omitempty"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			fmt.Sprintf("Invalid request body: %v", err),
		))
		return
	}

	instance, err := h.mockInstanceSvc.UpdateMockInstance(
		c.Request.Context(),
		instanceId,
		req.Status,
		req.CurrentNodeIds,
		req.Variables,
	)

	if err != nil {
		h.logger.Error().Err(err).Str("instanceId", instanceId).Msg("Failed to update mock instance")
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrInternalError,
			fmt.Sprintf("Failed to update mock instance: %v", err),
		))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(instance))
}

// ListMockInstances lists all mock instances
func (h *MockHandler) ListMockInstances(c *gin.Context) {
	instances, err := h.mockInstanceSvc.ListMockInstances(c.Request.Context())
	if err != nil {
		h.logger.Error().Err(err).Msg("Failed to list mock instances")
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrInternalError,
			"Failed to list mock instances",
		))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(instances))
}
