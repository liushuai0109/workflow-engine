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

	result, err := Intercept(ctx, "test-op", realFn)

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

	result, err := Intercept(ctx, "test-op", realFn)

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

	result, err := Intercept(ctx, "test-op", realFn)

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

	result, err := Intercept(ctx, "test-op", realFn)

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

	_, err := Intercept(ctx, "test-op", realFn)

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

	_, err := Intercept(ctx, "test-op", realFn)

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
