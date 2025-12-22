package interceptor

import (
	"context"
	"errors"
	"testing"
)

func TestIntercept_DisabledMode(t *testing.T) {
	ctx := context.Background()
	realCalled := false

	realFn := func(ctx context.Context) (string, error) {
		realCalled = true
		return "real result", nil
	}

	result, err := InterceptLegacy(ctx, "test-op", realFn)

	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	if result != "real result" {
		t.Errorf("Expected 'real result', got '%s'", result)
	}
	if !realCalled {
		t.Error("Expected real function to be called")
	}
}

func TestIntercept_EnabledMode_WithMockData(t *testing.T) {
	session := &InterceptSession{
		ID:           "test-session",
		InstanceID:   "test-instance",
		Mode:         InterceptModeEnabled,
		DataStore:    NewInterceptDataStore(),
		ExecutionLog: []ExecutionLogEntry{},
	}

	// Set mock data
	session.DataStore.Set("test-op", "mock result")

	ctx := WithInterceptSession(context.Background(), session)
	realCalled := false

	realFn := func(ctx context.Context) (string, error) {
		realCalled = true
		return "real result", nil
	}

	result, err := InterceptLegacy(ctx, "test-op", realFn)

	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	if result != "mock result" {
		t.Errorf("Expected 'mock result', got '%s'", result)
	}
	if realCalled {
		t.Error("Expected real function NOT to be called")
	}
	if len(session.ExecutionLog) != 1 {
		t.Errorf("Expected 1 log entry, got %d", len(session.ExecutionLog))
	}
	if !session.ExecutionLog[0].IsMocked {
		t.Error("Expected log entry to be marked as mocked")
	}
}

func TestIntercept_EnabledMode_WithoutMockData(t *testing.T) {
	session := &InterceptSession{
		ID:           "test-session",
		InstanceID:   "test-instance",
		Mode:         InterceptModeEnabled,
		DataStore:    NewInterceptDataStore(),
		ExecutionLog: []ExecutionLogEntry{},
	}

	ctx := WithInterceptSession(context.Background(), session)
	realCalled := false

	realFn := func(ctx context.Context) (string, error) {
		realCalled = true
		return "real result", nil
	}

	result, err := InterceptLegacy(ctx, "test-op", realFn)

	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	if result != "real result" {
		t.Errorf("Expected 'real result', got '%s'", result)
	}
	if !realCalled {
		t.Error("Expected real function to be called (fallback)")
	}
	if len(session.ExecutionLog) != 1 {
		t.Errorf("Expected 1 log entry, got %d", len(session.ExecutionLog))
	}
	if session.ExecutionLog[0].IsMocked {
		t.Error("Expected log entry NOT to be marked as mocked")
	}
}

func TestIntercept_RecordMode(t *testing.T) {
	session := &InterceptSession{
		ID:           "test-session",
		InstanceID:   "test-instance",
		Mode:         InterceptModeRecord,
		DataStore:    NewInterceptDataStore(),
		ExecutionLog: []ExecutionLogEntry{},
	}

	ctx := WithInterceptSession(context.Background(), session)

	realFn := func(ctx context.Context) (string, error) {
		return "real result", nil
	}

	result, err := InterceptLegacy(ctx, "test-op", realFn)

	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	if result != "real result" {
		t.Errorf("Expected 'real result', got '%s'", result)
	}

	// Check if data was recorded
	mockData, exists := session.DataStore.Get("test-op")
	if !exists {
		t.Error("Expected mock data to be recorded")
	}
	if mockData != "real result" {
		t.Errorf("Expected recorded data to be 'real result', got '%v'", mockData)
	}

	if len(session.ExecutionLog) != 1 {
		t.Errorf("Expected 1 log entry, got %d", len(session.ExecutionLog))
	}
}

func TestIntercept_TypeMismatch(t *testing.T) {
	session := &InterceptSession{
		ID:           "test-session",
		InstanceID:   "test-instance",
		Mode:         InterceptModeEnabled,
		DataStore:    NewInterceptDataStore(),
		ExecutionLog: []ExecutionLogEntry{},
	}

	// Set mock data with wrong type (int instead of string)
	session.DataStore.Set("test-op", 123)

	ctx := WithInterceptSession(context.Background(), session)

	realFn := func(ctx context.Context) (string, error) {
		return "real result", nil
	}

	_, err := InterceptLegacy(ctx, "test-op", realFn)

	if err == nil {
		t.Error("Expected type mismatch error")
	}
	if len(session.ExecutionLog) != 1 {
		t.Errorf("Expected 1 log entry, got %d", len(session.ExecutionLog))
	}
	if session.ExecutionLog[0].Error == "" {
		t.Error("Expected error to be logged")
	}
}

func TestIntercept_RecordMode_WithError(t *testing.T) {
	session := &InterceptSession{
		ID:           "test-session",
		InstanceID:   "test-instance",
		Mode:         InterceptModeRecord,
		DataStore:    NewInterceptDataStore(),
		ExecutionLog: []ExecutionLogEntry{},
	}

	ctx := WithInterceptSession(context.Background(), session)

	realFn := func(ctx context.Context) (string, error) {
		return "", errors.New("test error")
	}

	_, err := InterceptLegacy(ctx, "test-op", realFn)

	if err == nil {
		t.Error("Expected error from real function")
	}

	// Check that data was NOT recorded on error
	_, exists := session.DataStore.Get("test-op")
	if exists {
		t.Error("Expected mock data NOT to be recorded on error")
	}

	if len(session.ExecutionLog) != 1 {
		t.Errorf("Expected 1 log entry, got %d", len(session.ExecutionLog))
	}
	if session.ExecutionLog[0].Error == "" {
		t.Error("Expected error to be logged")
	}
}

func TestWithInterceptSession(t *testing.T) {
	session := &InterceptSession{
		ID:         "test-session",
		InstanceID: "test-instance",
		Mode:       InterceptModeEnabled,
	}

	ctx := WithInterceptSession(context.Background(), session)
	retrieved := GetInterceptSession(ctx)

	if retrieved == nil {
		t.Fatal("Expected to retrieve session from context")
	}
	if retrieved.ID != session.ID {
		t.Errorf("Expected session ID '%s', got '%s'", session.ID, retrieved.ID)
	}
}

func TestGetInterceptSession_NoSession(t *testing.T) {
	ctx := context.Background()
	session := GetInterceptSession(ctx)

	if session != nil {
		t.Error("Expected nil session from empty context")
	}
}

func TestIsInterceptMode(t *testing.T) {
	// No session
	ctx := context.Background()
	if IsInterceptMode(ctx) {
		t.Error("Expected IsInterceptMode to be false with no session")
	}

	// Disabled mode
	session := &InterceptSession{
		Mode: InterceptModeDisabled,
	}
	ctx = WithInterceptSession(ctx, session)
	if IsInterceptMode(ctx) {
		t.Error("Expected IsInterceptMode to be false in disabled mode")
	}

	// Enabled mode
	session.Mode = InterceptModeEnabled
	ctx = WithInterceptSession(ctx, session)
	if !IsInterceptMode(ctx) {
		t.Error("Expected IsInterceptMode to be true in enabled mode")
	}
}

// --- Tests for New Struct-Based Interceptor Architecture ---

// Test parameter structs
type SimpleParams struct {
	ID string `json:"id" intercept:"id"`
}

type MultiIDParams struct {
	WorkflowID string `json:"workflowId" intercept:"id"`
	Version    int    `json:"version" intercept:"id"`
	Name       string `json:"name"` // Not tagged, should not be in ID
}

type NoIDParams struct {
	Name  string `json:"name"`
	Value int    `json:"value"`
}

type ComplexParams struct {
	InstanceID string                 `json:"instanceId" intercept:"id"`
	Data       map[string]interface{} `json:"data"`
	Tags       []string               `json:"tags"`
}

// Test helper function
func simpleOperation(ctx context.Context, params SimpleParams) (string, error) {
	return "simple-result-" + params.ID, nil
}

func multiIDOperation(ctx context.Context, params MultiIDParams) (string, error) {
	return "multi-result", nil
}

func complexOperation(ctx context.Context, params ComplexParams) (map[string]interface{}, error) {
	return map[string]interface{}{
		"instanceId": params.InstanceID,
		"processed":  true,
	}, nil
}

func errorOperation(ctx context.Context, params SimpleParams) (string, error) {
	return "", errors.New("operation failed")
}

// TestIntercept_StructParams_SimpleID tests basic struct parameter with single ID field
func TestIntercept_StructParams_SimpleID(t *testing.T) {
	ctx := context.Background()

	result, err := Intercept(ctx, "SimpleOp", simpleOperation, SimpleParams{ID: "test-123"})

	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	if result != "simple-result-test-123" {
		t.Errorf("Expected 'simple-result-test-123', got '%s'", result)
	}
}

// TestIntercept_StructParams_MultipleIDs tests struct with multiple ID fields
func TestIntercept_StructParams_MultipleIDs(t *testing.T) {
	ctx := context.Background()

	params := MultiIDParams{
		WorkflowID: "workflow-456",
		Version:    2,
		Name:       "Test Workflow", // Should not be in generated ID
	}

	result, err := Intercept(ctx, "MultiIDOp", multiIDOperation, params)

	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	if result != "multi-result" {
		t.Errorf("Expected 'multi-result', got '%s'", result)
	}
}

// TestIntercept_StructParams_NoIDTags tests struct without intercept:"id" tags
func TestIntercept_StructParams_NoIDTags(t *testing.T) {
	ctx := context.Background()

	noIDFn := func(ctx context.Context, params NoIDParams) (string, error) {
		return "no-id-result", nil
	}

	result, err := Intercept(ctx, "NoIDOp", noIDFn, NoIDParams{Name: "test", Value: 42})

	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	if result != "no-id-result" {
		t.Errorf("Expected 'no-id-result', got '%s'", result)
	}
}

// TestIntercept_StructParams_ComplexTypes tests struct with complex types
func TestIntercept_StructParams_ComplexTypes(t *testing.T) {
	ctx := context.Background()

	params := ComplexParams{
		InstanceID: "instance-789",
		Data: map[string]interface{}{
			"key1": "value1",
			"key2": 123,
		},
		Tags: []string{"tag1", "tag2"},
	}

	result, err := Intercept(ctx, "ComplexOp", complexOperation, params)

	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	if result["instanceId"] != "instance-789" {
		t.Errorf("Expected instanceId 'instance-789', got '%v'", result["instanceId"])
	}
	if result["processed"] != true {
		t.Error("Expected processed to be true")
	}
}

// TestIntercept_StructParams_EnabledMode_WithMock tests struct params with mock data
func TestIntercept_StructParams_EnabledMode_WithMock(t *testing.T) {
	session := &InterceptSession{
		ID:           "test-session",
		InstanceID:   "test-instance",
		Mode:         InterceptModeEnabled,
		DataStore:    NewInterceptDataStore(),
		ExecutionLog: []ExecutionLogEntry{},
	}

	// Set mock data for generated ID "SimpleOp:test-123"
	session.DataStore.Set("SimpleOp:test-123", "mocked-result")

	ctx := WithInterceptSession(context.Background(), session)

	realCalled := false
	mockableOp := func(ctx context.Context, params SimpleParams) (string, error) {
		realCalled = true
		return "real-result", nil
	}

	result, err := Intercept(ctx, "SimpleOp", mockableOp, SimpleParams{ID: "test-123"})

	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	if result != "mocked-result" {
		t.Errorf("Expected 'mocked-result', got '%s'", result)
	}
	if realCalled {
		t.Error("Expected real function NOT to be called (should use mock)")
	}
	if len(session.ExecutionLog) != 1 {
		t.Errorf("Expected 1 log entry, got %d", len(session.ExecutionLog))
	}
	if !session.ExecutionLog[0].IsMocked {
		t.Error("Expected log entry to be marked as mocked")
	}
}

// TestIntercept_StructParams_RecordMode tests record mode with struct params
func TestIntercept_StructParams_RecordMode(t *testing.T) {
	session := &InterceptSession{
		ID:           "test-session",
		InstanceID:   "test-instance",
		Mode:         InterceptModeRecord,
		DataStore:    NewInterceptDataStore(),
		ExecutionLog: []ExecutionLogEntry{},
	}

	ctx := WithInterceptSession(context.Background(), session)

	result, err := Intercept(ctx, "SimpleOp", simpleOperation, SimpleParams{ID: "record-123"})

	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	if result != "simple-result-record-123" {
		t.Errorf("Expected 'simple-result-record-123', got '%s'", result)
	}

	// Check if data was recorded with generated ID
	mockData, exists := session.DataStore.Get("SimpleOp:record-123")
	if !exists {
		t.Error("Expected mock data to be recorded with ID 'SimpleOp:record-123'")
	}
	if mockData != "simple-result-record-123" {
		t.Errorf("Expected recorded data to be 'simple-result-record-123', got '%v'", mockData)
	}
}

// TestIntercept_StructParams_ErrorHandling tests error handling with struct params
func TestIntercept_StructParams_ErrorHandling(t *testing.T) {
	session := &InterceptSession{
		ID:           "test-session",
		InstanceID:   "test-instance",
		Mode:         InterceptModeEnabled,
		DataStore:    NewInterceptDataStore(),
		ExecutionLog: []ExecutionLogEntry{},
	}

	ctx := WithInterceptSession(context.Background(), session)

	_, err := Intercept(ctx, "ErrorOp", errorOperation, SimpleParams{ID: "error-123"})

	if err == nil {
		t.Error("Expected error from operation")
	}
	if err.Error() != "operation failed" {
		t.Errorf("Expected error 'operation failed', got '%v'", err)
	}

	if len(session.ExecutionLog) != 1 {
		t.Errorf("Expected 1 log entry, got %d", len(session.ExecutionLog))
	}
	if session.ExecutionLog[0].Error == "" {
		t.Error("Expected error to be logged")
	}
}

// TestGenerateInterceptorID tests the ID generation logic
func TestGenerateInterceptorID(t *testing.T) {
	tests := []struct {
		name       string
		operation  string
		params     interface{}
		expectedID string
	}{
		{
			name:       "Single ID field",
			operation:  "GetInstance",
			params:     SimpleParams{ID: "instance-123"},
			expectedID: "GetInstance:instance-123",
		},
		{
			name:      "Multiple ID fields",
			operation: "UpdateWorkflow",
			params: MultiIDParams{
				WorkflowID: "workflow-456",
				Version:    2,
				Name:       "Test", // Should be ignored
			},
			expectedID: "UpdateWorkflow:workflow-456:2",
		},
		{
			name:       "No ID fields",
			operation:  "NoIDOp",
			params:     NoIDParams{Name: "test", Value: 42},
			expectedID: "NoIDOp",
		},
		{
			name:      "Complex types",
			operation: "ComplexOp",
			params: ComplexParams{
				InstanceID: "complex-789",
				Data:       map[string]interface{}{"key": "value"},
				Tags:       []string{"tag1"},
			},
			expectedID: "ComplexOp:complex-789",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			actualID := generateInterceptorID(tt.operation, tt.params)
			if actualID != tt.expectedID {
				t.Errorf("Expected ID '%s', got '%s'", tt.expectedID, actualID)
			}
		})
	}
}

// TestIntercept_StructParams_TypeMismatch tests type mismatch with mock data
func TestIntercept_StructParams_TypeMismatch(t *testing.T) {
	session := &InterceptSession{
		ID:           "test-session",
		InstanceID:   "test-instance",
		Mode:         InterceptModeEnabled,
		DataStore:    NewInterceptDataStore(),
		ExecutionLog: []ExecutionLogEntry{},
	}

	// Set mock data with wrong type (int instead of string)
	session.DataStore.Set("SimpleOp:mismatch-123", 12345)

	ctx := WithInterceptSession(context.Background(), session)

	_, err := Intercept(ctx, "SimpleOp", simpleOperation, SimpleParams{ID: "mismatch-123"})

	if err == nil {
		t.Error("Expected type mismatch error")
	}
	if len(session.ExecutionLog) != 1 {
		t.Errorf("Expected 1 log entry, got %d", len(session.ExecutionLog))
	}
	if session.ExecutionLog[0].Error == "" {
		t.Error("Expected error to be logged")
	}
}
