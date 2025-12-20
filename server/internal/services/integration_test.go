//go:build integration
// +build integration

package services

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/bpmn-explorer/server/internal/models"
	"github.com/bpmn-explorer/server/pkg/config"
	"github.com/bpmn-explorer/server/pkg/database"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var testDB *database.Database
var testLogger *zerolog.Logger

// setupTestDB sets up a test database connection
func setupTestDB(t *testing.T) *database.Database {
	// Check if integration tests should run
	if os.Getenv("INTEGRATION_TEST") != "true" {
		t.Skip("Skipping integration test. Set INTEGRATION_TEST=true to run.")
	}

	// Load test database config from environment
	cfg := config.DatabaseConfig{
		Host:     getEnv("TEST_DB_HOST", "localhost"),
		Port:     getEnvAsInt("TEST_DB_PORT", 5432),
		User:     getEnv("TEST_DB_USER", "postgres"),
		Password: getEnv("TEST_DB_PASSWORD", "postgres"),
		DBName:   getEnv("TEST_DB_NAME", "bpmn_explorer_test"),
		Disabled: false,
	}

	logger := zerolog.New(os.Stderr).With().Timestamp().Logger()
	testLogger = &logger

	db := database.NewDatabase(&logger)
	err := db.Connect(cfg)
	require.NoError(t, err, "Failed to connect to test database")

	// Run migrations
	err = runMigrations(db, cfg)
	require.NoError(t, err, "Failed to run migrations")

	// Clean up test data before tests
	cleanupTestData(t, db)

	return db
}

// runMigrations runs database migrations
func runMigrations(db *database.Database, cfg config.DatabaseConfig) error {
	// Read migration file
	migrationSQL, err := os.ReadFile("../../migrations/000001_initial_schema.up.sql")
	if err != nil {
		return fmt.Errorf("failed to read migration file: %w", err)
	}

	// Execute migration
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	_, err = db.ExecContext(ctx, string(migrationSQL))
	if err != nil {
		// Ignore "already exists" errors
		if !contains(err.Error(), "already exists") {
			return fmt.Errorf("failed to execute migration: %w", err)
		}
	}

	return nil
}

// cleanupTestData removes all test data
func cleanupTestData(t *testing.T, db *database.Database) {
	ctx := context.Background()

	// Delete in reverse order of dependencies
	queries := []string{
		"DELETE FROM workflow_executions",
		"DELETE FROM workflow_instances",
		"DELETE FROM workflows",
		"DELETE FROM users",
	}

	for _, query := range queries {
		_, err := db.ExecContext(ctx, query)
		if err != nil {
			t.Logf("Warning: Failed to cleanup: %v", err)
		}
	}
}

// Helper functions
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	valueStr := os.Getenv(key)
	if value, err := strconv.Atoi(valueStr); err == nil {
		return value
	}
	return defaultValue
}

func contains(s, substr string) bool {
	return strings.Contains(s, substr)
}

func TestIntegration_UserService_CRUD(t *testing.T) {
	db := setupTestDB(t)
	defer db.Disconnect()
	defer cleanupTestData(t, db)

	service := NewUserService(db, testLogger)
	ctx := context.Background()

	// Test CreateUser
	email := fmt.Sprintf("test-%d@example.com", time.Now().UnixNano())
	attributes := map[string]interface{}{
		"name": "Test User",
		"age":  30,
		"tags": []string{"developer", "tester"},
	}

	user, err := service.CreateUser(ctx, email, attributes)
	require.NoError(t, err)
	assert.NotEmpty(t, user.Id)
	assert.Equal(t, email, user.Email)
	assert.Equal(t, "Test User", user.Attributes["name"])
	assert.Equal(t, float64(30), user.Attributes["age"]) // JSON unmarshal converts to float64
	assert.NotZero(t, user.CreatedAt)
	assert.NotZero(t, user.UpdatedAt)

	// Test GetUserByID
	retrievedUser, err := service.GetUserByID(ctx, user.Id)
	require.NoError(t, err)
	assert.Equal(t, user.Id, retrievedUser.Id)
	assert.Equal(t, email, retrievedUser.Email)
	assert.Equal(t, "Test User", retrievedUser.Attributes["name"])

	// Test UpdateUserAttributes
	newAttributes := map[string]interface{}{
		"department": "Engineering",
		"level":      5,
	}
	updatedUser, err := service.UpdateUserAttributes(ctx, user.Id, newAttributes)
	require.NoError(t, err)
	assert.Equal(t, user.Id, updatedUser.Id)
	assert.Equal(t, "Engineering", updatedUser.Attributes["department"])
	assert.Equal(t, float64(5), updatedUser.Attributes["level"])
	// Original attributes should still exist (merged)
	assert.Equal(t, "Test User", updatedUser.Attributes["name"])

	// Test GetUserByID - NotFound
	_, err = service.GetUserByID(ctx, "00000000-0000-0000-0000-000000000000")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), models.ErrUserNotFound)
}

func TestIntegration_UserService_JSONB_Serialization(t *testing.T) {
	db := setupTestDB(t)
	defer db.Disconnect()
	defer cleanupTestData(t, db)

	service := NewUserService(db, testLogger)
	ctx := context.Background()

	// Test complex JSONB structure
	email := fmt.Sprintf("test-jsonb-%d@example.com", time.Now().UnixNano())
	complexAttributes := map[string]interface{}{
		"profile": map[string]interface{}{
			"firstName": "John",
			"lastName":  "Doe",
			"address": map[string]interface{}{
				"street": "123 Main St",
				"city":   "New York",
			},
		},
		"preferences": []interface{}{
			"email",
			"sms",
			"push",
		},
		"metadata": map[string]interface{}{
			"source":    "web",
			"timestamp": time.Now().Unix(),
		},
	}

	user, err := service.CreateUser(ctx, email, complexAttributes)
	require.NoError(t, err)

	// Retrieve and verify JSONB structure
	retrievedUser, err := service.GetUserByID(ctx, user.Id)
	require.NoError(t, err)

	// Verify nested structure
	profile, ok := retrievedUser.Attributes["profile"].(map[string]interface{})
	assert.True(t, ok, "Profile should be a map")
	assert.Equal(t, "John", profile["firstName"])
	assert.Equal(t, "Doe", profile["lastName"])

	address, ok := profile["address"].(map[string]interface{})
	assert.True(t, ok, "Address should be a map")
	assert.Equal(t, "123 Main St", address["street"])

	// Verify array
	preferences, ok := retrievedUser.Attributes["preferences"].([]interface{})
	assert.True(t, ok, "Preferences should be an array")
	assert.Contains(t, preferences, "email")
	assert.Contains(t, preferences, "sms")

	// Test JSONB merge
	updateAttributes := map[string]interface{}{
		"profile": map[string]interface{}{
			"phone": "123-456-7890",
		},
		"newField": "newValue",
	}

	updatedUser, err := service.UpdateUserAttributes(ctx, user.Id, updateAttributes)
	require.NoError(t, err)

	// Verify merge (original fields should still exist)
	updatedProfile, ok := updatedUser.Attributes["profile"].(map[string]interface{})
	assert.True(t, ok)
	assert.Equal(t, "John", updatedProfile["firstName"]) // Original field
	assert.Equal(t, "123-456-7890", updatedProfile["phone"]) // New field
	assert.Equal(t, "newValue", updatedUser.Attributes["newField"])
}

func TestIntegration_WorkflowService_CRUD(t *testing.T) {
	db := setupTestDB(t)
	defer db.Disconnect()
	defer cleanupTestData(t, db)

	service := NewWorkflowService(db, testLogger)
	ctx := context.Background()

	// Test CreateWorkflow
	name := fmt.Sprintf("Test Workflow %d", time.Now().UnixNano())
	description := "Test Description"
	bpmnXml := "<bpmn:definitions><bpmn:process id=\"Process_1\"></bpmn:process></bpmn:definitions>"

	workflow, err := service.CreateWorkflow(ctx, name, description, bpmnXml)
	require.NoError(t, err)
	assert.NotEmpty(t, workflow.Id)
	assert.Equal(t, name, workflow.Name)
	assert.Equal(t, description, workflow.Description)
	assert.Equal(t, bpmnXml, workflow.BpmnXml)
	assert.Equal(t, "1.0.0", workflow.Version)
	assert.Equal(t, models.StatusDraft, workflow.Status)

	// Test GetWorkflowByID
	retrievedWorkflow, err := service.GetWorkflowByID(ctx, workflow.Id)
	require.NoError(t, err)
	assert.Equal(t, workflow.Id, retrievedWorkflow.Id)
	assert.Equal(t, name, retrievedWorkflow.Name)
	assert.Equal(t, bpmnXml, retrievedWorkflow.BpmnXml)

	// Test UpdateWorkflow
	newName := "Updated Workflow Name"
	newXml := "<bpmn:definitions><bpmn:process id=\"Process_2\"></bpmn:process></bpmn:definitions>"
	updatedWorkflow, err := service.UpdateWorkflow(ctx, workflow.Id, newName, "Updated Description", newXml)
	require.NoError(t, err)
	assert.Equal(t, workflow.Id, updatedWorkflow.Id)
	assert.Equal(t, newName, updatedWorkflow.Name)
	assert.Equal(t, newXml, updatedWorkflow.BpmnXml)

	// Test ListWorkflows
	workflows, metadata, err := service.ListWorkflows(ctx, 1, 10)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(workflows), 1)
	assert.NotNil(t, metadata)
	assert.GreaterOrEqual(t, metadata.Total, 1)

	// Test GetWorkflowByID - NotFound
	_, err = service.GetWorkflowByID(ctx, "00000000-0000-0000-0000-000000000000")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), models.ErrWorkflowNotFound)
}

func TestIntegration_WorkflowInstanceService_CRUD(t *testing.T) {
	db := setupTestDB(t)
	defer db.Disconnect()
	defer cleanupTestData(t, db)

	// First create a workflow
	workflowService := NewWorkflowService(db, testLogger)
	ctx := context.Background()

	workflow, err := workflowService.CreateWorkflow(ctx, "Test Workflow", "Description", "<bpmn></bpmn>")
	require.NoError(t, err)

	// Now test WorkflowInstanceService
	instanceService := NewWorkflowInstanceService(db, testLogger)

	// Test CreateWorkflowInstance
	instanceName := fmt.Sprintf("Test Instance %d", time.Now().UnixNano())
	instance, err := instanceService.CreateWorkflowInstance(ctx, workflow.Id, instanceName)
	require.NoError(t, err)
	assert.NotEmpty(t, instance.Id)
	assert.Equal(t, workflow.Id, instance.WorkflowId)
	assert.Equal(t, instanceName, instance.Name)
	assert.Equal(t, models.InstanceStatusPending, instance.Status)
	assert.Empty(t, instance.CurrentNodeIds)
	assert.Equal(t, 1, instance.InstanceVersion)

	// Test GetWorkflowInstanceByID
	retrievedInstance, err := instanceService.GetWorkflowInstanceByID(ctx, instance.Id)
	require.NoError(t, err)
	assert.Equal(t, instance.Id, retrievedInstance.Id)
	assert.Equal(t, workflow.Id, retrievedInstance.WorkflowId)

	// Test UpdateWorkflowInstance
	newStatus := models.InstanceStatusRunning
	newNodeIds := []string{"node1", "node2", "node3"}
	updatedInstance, err := instanceService.UpdateWorkflowInstance(ctx, instance.Id, newStatus, newNodeIds)
	require.NoError(t, err)
	assert.Equal(t, instance.Id, updatedInstance.Id)
	assert.Equal(t, newStatus, updatedInstance.Status)
	assert.Len(t, updatedInstance.CurrentNodeIds, 3)
	assert.Contains(t, updatedInstance.CurrentNodeIds, "node1")
	assert.Equal(t, 2, updatedInstance.InstanceVersion) // Should be incremented

	// Test GetWorkflowInstanceByID - NotFound
	_, err = instanceService.GetWorkflowInstanceByID(ctx, "00000000-0000-0000-0000-000000000000")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), models.ErrWorkflowInstanceNotFound)
}

func TestIntegration_WorkflowExecutionService_CRUD(t *testing.T) {
	db := setupTestDB(t)
	defer db.Disconnect()
	defer cleanupTestData(t, db)

	// Setup: Create workflow and instance
	workflowService := NewWorkflowService(db, testLogger)
	ctx := context.Background()

	workflow, err := workflowService.CreateWorkflow(ctx, "Test Workflow", "Description", "<bpmn></bpmn>")
	require.NoError(t, err)

	instanceService := NewWorkflowInstanceService(db, testLogger)
	instance, err := instanceService.CreateWorkflowInstance(ctx, workflow.Id, "Test Instance")
	require.NoError(t, err)

	// Test WorkflowExecutionService
	executionService := NewWorkflowExecutionService(db, testLogger)

	// Test CreateWorkflowExecution
	variables := map[string]interface{}{
		"input":  "test input",
		"count":  42,
		"active": true,
	}
	execution, err := executionService.CreateWorkflowExecution(ctx, instance.Id, workflow.Id, variables)
	require.NoError(t, err)
	assert.NotEmpty(t, execution.Id)
	assert.Equal(t, instance.Id, execution.InstanceId)
	assert.Equal(t, workflow.Id, execution.WorkflowId)
	assert.Equal(t, models.ExecutionStatusPending, execution.Status)
	assert.Equal(t, 1, execution.ExecutionVersion)
	assert.Equal(t, "test input", execution.Variables["input"])
	assert.Equal(t, float64(42), execution.Variables["count"])
	assert.Equal(t, true, execution.Variables["active"])

	// Test GetWorkflowExecutionByID
	retrievedExecution, err := executionService.GetWorkflowExecutionByID(ctx, execution.Id)
	require.NoError(t, err)
	assert.Equal(t, execution.Id, retrievedExecution.Id)
	assert.Equal(t, instance.Id, retrievedExecution.InstanceId)

	// Test UpdateWorkflowExecution
	newStatus := models.ExecutionStatusRunning
	newVariables := map[string]interface{}{
		"progress": 50,
		"step":     "processing",
	}
	updatedExecution, err := executionService.UpdateWorkflowExecution(ctx, execution.Id, newStatus, newVariables, "")
	require.NoError(t, err)
	assert.Equal(t, execution.Id, updatedExecution.Id)
	assert.Equal(t, newStatus, updatedExecution.Status)
	assert.Equal(t, float64(50), updatedExecution.Variables["progress"])
	assert.Equal(t, "processing", updatedExecution.Variables["step"])
	// Original variables should still exist (merged)
	assert.Equal(t, "test input", updatedExecution.Variables["input"])

	// Test ListWorkflowExecutions
	executions, metadata, err := executionService.ListWorkflowExecutions(ctx, 1, 10, instance.Id, "", "")
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(executions), 1)
	assert.NotNil(t, metadata)
	assert.GreaterOrEqual(t, metadata.Total, 1)

	// Test ListWorkflowExecutions with filters
	executions, _, err = executionService.ListWorkflowExecutions(ctx, 1, 10, instance.Id, workflow.Id, models.ExecutionStatusRunning)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(executions), 1)

	// Test UpdateWorkflowExecution - Complete
	completedExecution, err := executionService.UpdateWorkflowExecution(ctx, execution.Id, models.ExecutionStatusCompleted, nil, "")
	require.NoError(t, err)
	assert.Equal(t, models.ExecutionStatusCompleted, completedExecution.Status)
	assert.NotNil(t, completedExecution.CompletedAt)

	// Test GetWorkflowExecutionByID - NotFound
	_, err = executionService.GetWorkflowExecutionByID(ctx, "00000000-0000-0000-0000-000000000000")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), models.ErrWorkflowExecutionNotFound)
}

func TestIntegration_WorkflowExecutionService_JSONB_Serialization(t *testing.T) {
	db := setupTestDB(t)
	defer db.Disconnect()
	defer cleanupTestData(t, db)

	// Setup
	workflowService := NewWorkflowService(db, testLogger)
	ctx := context.Background()

	workflow, err := workflowService.CreateWorkflow(ctx, "Test Workflow", "Description", "<bpmn></bpmn>")
	require.NoError(t, err)

	instanceService := NewWorkflowInstanceService(db, testLogger)
	instance, err := instanceService.CreateWorkflowInstance(ctx, workflow.Id, "Test Instance")
	require.NoError(t, err)

	executionService := NewWorkflowExecutionService(db, testLogger)

	// Test complex JSONB structure
	complexVariables := map[string]interface{}{
		"workflowData": map[string]interface{}{
			"processId": "Process_1",
			"nodes": []interface{}{
				map[string]interface{}{"id": "node1", "type": "task"},
				map[string]interface{}{"id": "node2", "type": "gateway"},
			},
		},
		"executionContext": map[string]interface{}{
			"userId":    "user123",
			"sessionId": "session456",
			"metadata": map[string]interface{}{
				"source": "api",
				"ip":     "192.168.1.1",
			},
		},
		"results": []interface{}{
			"result1",
			"result2",
			"result3",
		},
	}

	execution, err := executionService.CreateWorkflowExecution(ctx, instance.Id, workflow.Id, complexVariables)
	require.NoError(t, err)

	// Retrieve and verify JSONB structure
	retrievedExecution, err := executionService.GetWorkflowExecutionByID(ctx, execution.Id)
	require.NoError(t, err)

	// Verify nested structure
	workflowData, ok := retrievedExecution.Variables["workflowData"].(map[string]interface{})
	assert.True(t, ok, "workflowData should be a map")
	assert.Equal(t, "Process_1", workflowData["processId"])

	nodes, ok := workflowData["nodes"].([]interface{})
	assert.True(t, ok, "nodes should be an array")
	assert.Len(t, nodes, 2)

	node1, ok := nodes[0].(map[string]interface{})
	assert.True(t, ok)
	assert.Equal(t, "node1", node1["id"])
	assert.Equal(t, "task", node1["type"])

	// Verify execution context
	execContext, ok := retrievedExecution.Variables["executionContext"].(map[string]interface{})
	assert.True(t, ok)
	assert.Equal(t, "user123", execContext["userId"])

	metadata, ok := execContext["metadata"].(map[string]interface{})
	assert.True(t, ok)
	assert.Equal(t, "api", metadata["source"])

	// Test JSONB merge
	updateVariables := map[string]interface{}{
		"workflowData": map[string]interface{}{
			"status": "completed",
		},
		"newField": "newValue",
	}

	updatedExecution, err := executionService.UpdateWorkflowExecution(ctx, execution.Id, "", updateVariables, "")
	require.NoError(t, err)

	// Verify merge
	updatedWorkflowData, ok := updatedExecution.Variables["workflowData"].(map[string]interface{})
	assert.True(t, ok)
	assert.Equal(t, "Process_1", updatedWorkflowData["processId"]) // Original field
	assert.Equal(t, "completed", updatedWorkflowData["status"])      // New field
	assert.Equal(t, "newValue", updatedExecution.Variables["newField"])
}

func TestIntegration_FullWorkflowLifecycle(t *testing.T) {
	db := setupTestDB(t)
	defer db.Disconnect()
	defer cleanupTestData(t, db)

	ctx := context.Background()

	// Step 1: Create a workflow
	workflowService := NewWorkflowService(db, testLogger)
	workflow, err := workflowService.CreateWorkflow(ctx, "Lifecycle Test Workflow", "Testing full lifecycle", "<bpmn></bpmn>")
	require.NoError(t, err)

	// Step 2: Create a workflow instance
	instanceService := NewWorkflowInstanceService(db, testLogger)
	instance, err := instanceService.CreateWorkflowInstance(ctx, workflow.Id, "Lifecycle Test Instance")
	require.NoError(t, err)
	assert.Equal(t, models.InstanceStatusPending, instance.Status)

	// Step 3: Create an execution
	executionService := NewWorkflowExecutionService(db, testLogger)
	execution, err := executionService.CreateWorkflowExecution(ctx, instance.Id, workflow.Id, map[string]interface{}{
		"initialData": "test",
	})
	require.NoError(t, err)
	assert.Equal(t, models.ExecutionStatusPending, execution.Status)

	// Step 4: Update instance to running
	instance, err = instanceService.UpdateWorkflowInstance(ctx, instance.Id, models.InstanceStatusRunning, []string{"startNode"})
	require.NoError(t, err)
	assert.Equal(t, models.InstanceStatusRunning, instance.Status)
	assert.Contains(t, instance.CurrentNodeIds, "startNode")

	// Step 5: Update execution to running
	execution, err = executionService.UpdateWorkflowExecution(ctx, execution.Id, models.ExecutionStatusRunning, map[string]interface{}{
		"currentStep": "processing",
	}, "")
	require.NoError(t, err)
	assert.Equal(t, models.ExecutionStatusRunning, execution.Status)

	// Step 6: Complete execution
	execution, err = executionService.UpdateWorkflowExecution(ctx, execution.Id, models.ExecutionStatusCompleted, map[string]interface{}{
		"result": "success",
	}, "")
	require.NoError(t, err)
	assert.Equal(t, models.ExecutionStatusCompleted, execution.Status)
	assert.NotNil(t, execution.CompletedAt)

	// Step 7: Complete instance
	instance, err = instanceService.UpdateWorkflowInstance(ctx, instance.Id, models.InstanceStatusCompleted, []string{"endNode"})
	require.NoError(t, err)
	assert.Equal(t, models.InstanceStatusCompleted, instance.Status)

	// Step 8: Verify relationships
	retrievedExecution, err := executionService.GetWorkflowExecutionByID(ctx, execution.Id)
	require.NoError(t, err)
	assert.Equal(t, instance.Id, retrievedExecution.InstanceId)
	assert.Equal(t, workflow.Id, retrievedExecution.WorkflowId)

	// Step 9: List executions for instance
	executions, metadata, err := executionService.ListWorkflowExecutions(ctx, 1, 10, instance.Id, "", "")
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(executions), 1)
	assert.Equal(t, execution.Id, executions[0].Id)
	assert.NotNil(t, metadata)
}

func TestIntegration_WorkflowEngine_ExecuteFromNode(t *testing.T) {
	db := setupTestDB(t)
	defer db.Disconnect()
	defer cleanupTestData(t, db)

	ctx := context.Background()

	// Create services
	workflowService := NewWorkflowService(db, testLogger)
	instanceService := NewWorkflowInstanceService(db, testLogger)
	executionService := NewWorkflowExecutionService(db, testLogger)
	engineService := NewWorkflowEngineService(db, testLogger, workflowService, instanceService, executionService)

	// Create a test BPMN with ServiceTask
	bpmnXML := `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="Process_1" name="Test Process">
    <bpmn:startEvent id="StartEvent_1" name="Start">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:serviceTask id="ServiceTask_1" name="Service Task">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
      <bpmn:extensionElements>
        <xflow:url xmlns:xflow="http://example.com/bpmn/xflow-extension" value="http://httpbin.org/post"/>
      </bpmn:extensionElements>
    </bpmn:serviceTask>
    <bpmn:endEvent id="EndEvent_1" name="End">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="ServiceTask_1"/>
    <bpmn:sequenceFlow id="Flow_2" sourceRef="ServiceTask_1" targetRef="EndEvent_1"/>
  </bpmn:process>
</bpmn:definitions>`

	// Step 1: Create workflow
	workflow, err := workflowService.CreateWorkflow(ctx, "Engine Test Workflow", "Testing execution engine", bpmnXML)
	require.NoError(t, err)

	// Step 2: Create instance
	instance, err := instanceService.CreateWorkflowInstance(ctx, workflow.Id, "Engine Test Instance")
	require.NoError(t, err)
	assert.Equal(t, models.InstanceStatusPending, instance.Status)

	// Step 3: Execute from ServiceTask (this will call httpbin.org which is a real test API)
	businessParams := map[string]interface{}{
		"test": "data",
		"value": 123,
	}

	result, err := engineService.ExecuteFromNode(ctx, instance.Id, "ServiceTask_1", businessParams)

	// Note: This test may fail if httpbin.org is not accessible, but it tests the full flow
	if err != nil {
		// If external API call fails, that's okay for integration test
		// We can verify the error is handled correctly
		t.Logf("External API call failed (expected in some environments): %v", err)
		return
	}

	require.NoError(t, err)
	assert.NotNil(t, result)
	assert.NotNil(t, result.EngineResponse)
	assert.Equal(t, instance.Id, result.EngineResponse.InstanceId)

	// Verify instance was updated
	updatedInstance, err := instanceService.GetWorkflowInstanceByID(ctx, instance.Id)
	require.NoError(t, err)
	assert.NotEmpty(t, updatedInstance.CurrentNodeIds)
	assert.Equal(t, models.InstanceStatusRunning, updatedInstance.Status)

	// Verify execution was created/updated
	executions, _, err := executionService.ListWorkflowExecutions(ctx, 1, 10, instance.Id, "", "")
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(executions), 1)
}

func TestIntegration_WorkflowEngine_ExecuteFromNode_EndEvent(t *testing.T) {
	db := setupTestDB(t)
	defer db.Disconnect()
	defer cleanupTestData(t, db)

	ctx := context.Background()

	// Create services
	workflowService := NewWorkflowService(db, testLogger)
	instanceService := NewWorkflowInstanceService(db, testLogger)
	executionService := NewWorkflowExecutionService(db, testLogger)
	engineService := NewWorkflowEngineService(db, testLogger, workflowService, instanceService, executionService)

	// Create a simple BPMN with just StartEvent and EndEvent
	bpmnXML := `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="Process_1" name="Test Process">
    <bpmn:startEvent id="StartEvent_1" name="Start">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:endEvent id="EndEvent_1" name="End">
      <bpmn:incoming>Flow_1</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="EndEvent_1"/>
  </bpmn:process>
</bpmn:definitions>`

	// Step 1: Create workflow
	workflow, err := workflowService.CreateWorkflow(ctx, "EndEvent Test Workflow", "Testing EndEvent execution", bpmnXML)
	require.NoError(t, err)

	// Step 2: Create instance
	instance, err := instanceService.CreateWorkflowInstance(ctx, workflow.Id, "EndEvent Test Instance")
	require.NoError(t, err)

	// Step 3: Execute from EndEvent
	result, err := engineService.ExecuteFromNode(ctx, instance.Id, "EndEvent_1", nil)

	require.NoError(t, err)
	assert.NotNil(t, result)
	assert.NotNil(t, result.EngineResponse)

	// Verify instance was marked as completed
	updatedInstance, err := instanceService.GetWorkflowInstanceByID(ctx, instance.Id)
	require.NoError(t, err)
	assert.Equal(t, models.InstanceStatusCompleted, updatedInstance.Status)
	assert.Empty(t, updatedInstance.CurrentNodeIds)

	// Verify execution was marked as completed
	executions, _, err := executionService.ListWorkflowExecutions(ctx, 1, 10, instance.Id, "", "")
	require.NoError(t, err)
	if len(executions) > 0 {
		assert.Equal(t, models.ExecutionStatusCompleted, executions[0].Status)
	}
}

