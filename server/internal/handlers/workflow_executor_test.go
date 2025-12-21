package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/bpmn-explorer/server/internal/models"
	"github.com/bpmn-explorer/server/internal/services"
	"github.com/bpmn-explorer/server/pkg/database"
	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupWorkflowExecutorHandlerTest(t *testing.T) (*WorkflowExecutorHandler, *gin.Engine) {
	logger := zerolog.Nop()
	db := database.NewDatabase(&logger)

	workflowSvc := services.NewWorkflowService(db, &logger)
	instanceSvc := services.NewWorkflowInstanceService(db, &logger)
	executionSvc := services.NewWorkflowExecutionService(db, &logger)

	handler := NewWorkflowExecutorHandler(db, &logger, workflowSvc, instanceSvc, executionSvc)

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/api/execute/:workflowInstanceId", handler.ExecuteWorkflow)

	return handler, router
}

func TestWorkflowExecutorHandler_ExecuteWorkflow_InvalidRequest(t *testing.T) {
	_, router := setupWorkflowExecutorHandlerTest(t)

	// Test missing fromNodeId
	reqBody := map[string]interface{}{}
	body, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest("POST", "/api/execute/test-instance-id", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	var response models.APIResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.False(t, response.Success)
	assert.NotNil(t, response.Error)
	assert.Equal(t, models.ErrInvalidRequest, response.Error.Code)
}

func TestWorkflowExecutorHandler_ExecuteWorkflow_MissingInstanceId(t *testing.T) {
	_, router := setupWorkflowExecutorHandlerTest(t)

	reqBody := map[string]interface{}{
		"fromNodeId": "node1",
	}
	body, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest("POST", "/api/execute/", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Gin will return 404 for missing path parameter
	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestWorkflowExecutorHandler_ExecuteWorkflow_ValidRequest(t *testing.T) {
	_, router := setupWorkflowExecutorHandlerTest(t)

	reqBody := map[string]interface{}{
		"fromNodeId":     "ServiceTask_1",
		"businessParams": map[string]interface{}{"param": "value"},
	}
	body, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest("POST", "/api/execute/test-instance-id", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// This will fail because we don't have a real database, but we can verify the request is parsed correctly
	// The actual execution will fail with database error, which is expected in unit test
	assert.True(t, w.Code == http.StatusInternalServerError || w.Code == http.StatusNotFound)
}

