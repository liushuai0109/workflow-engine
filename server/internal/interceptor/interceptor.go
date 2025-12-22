package interceptor

import (
	"context"
	"encoding/json"
	"fmt"
	"time"
)

// InterceptMode represents the interception mode
type InterceptMode string

const (
	// InterceptModeDisabled disables interception, executes real function
	InterceptModeDisabled InterceptMode = "disabled"
	// InterceptModeEnabled enables interception, returns mock data if available
	InterceptModeEnabled InterceptMode = "enabled"
	// InterceptModeRecord records mode, executes real function and stores result as mock data
	InterceptModeRecord InterceptMode = "record"
)

// contextKey is the type for context keys
type contextKey string

const (
	// InterceptSessionKey is the context key for InterceptSession
	InterceptSessionKey contextKey = "intercept_session"
	// CallRecorderKey is the context key for call recorder callback
	CallRecorderKey contextKey = "call_recorder"
)

// InterceptSession represents an interception session
type InterceptSession struct {
	ID           string               `json:"id"`
	InstanceID   string               `json:"instanceId"`
	Mode         InterceptMode        `json:"mode"`
	DataStore    *InterceptDataStore  `json:"-"`
	ExecutionLog []ExecutionLogEntry  `json:"executionLog"`
	CreatedAt    time.Time            `json:"createdAt"`
}

// ExecutionLogEntry represents a single execution log entry
type ExecutionLogEntry struct {
	Timestamp time.Time   `json:"timestamp"`
	Operation string      `json:"operation"`
	Input     interface{} `json:"input,omitempty"`
	Output    interface{} `json:"output,omitempty"`
	IsMocked  bool        `json:"isMocked"`
	Error     string      `json:"error,omitempty"`
}

// CallRecorderFunc is a function type for recording interceptor calls
type CallRecorderFunc func(name string, input, output map[string]interface{})

// Intercept is the core interceptor function that intercepts function calls
// and returns mock data or executes the real function based on the mode
func Intercept[T any](
	ctx context.Context,
	operation string,
	realFn func(context.Context) (T, error),
) (T, error) {
	var zero T

	// Helper function to record call if recorder is present
	recordCall := func(input, output interface{}, isMocked bool) {
		if recorder, ok := ctx.Value(CallRecorderKey).(CallRecorderFunc); ok && recorder != nil {
			inputMap := toMapInterface(input)
			outputMap := toMapInterface(output)
			recorder(operation, inputMap, outputMap)
		}
	}

	// Get intercept session from context
	session := GetInterceptSession(ctx)
	if session == nil || session.Mode == InterceptModeDisabled {
		// No session or disabled mode, execute real function
		result, err := realFn(ctx)
		recordCall(nil, result, false)
		return result, err
	}

	// Record mode: execute real function and store result
	if session.Mode == InterceptModeRecord {
		result, err := realFn(ctx)
		if err == nil {
			session.DataStore.Set(operation, result)
			session.LogExecution(operation, nil, result, false, "")
			recordCall(nil, result, false)
		} else {
			session.LogExecution(operation, nil, nil, false, err.Error())
			recordCall(nil, nil, false)
		}
		return result, err
	}

	// Enabled mode: try to get mock data first
	if session.Mode == InterceptModeEnabled {
		mockData, exists := session.DataStore.Get(operation)
		if exists {
			// Mock data found
			result, ok := mockData.(T)
			if !ok {
				err := fmt.Errorf("mock data type mismatch for operation: %s", operation)
				session.LogExecution(operation, nil, nil, true, err.Error())
				recordCall(nil, nil, true)
				return zero, err
			}

			session.LogExecution(operation, nil, result, true, "")
			recordCall(nil, result, true)
			return result, nil
		}

		// Mock data not found, fallback to real function
		result, err := realFn(ctx)
		errMsg := ""
		if err != nil {
			errMsg = err.Error()
		}
		session.LogExecution(operation, nil, result, false, errMsg)
		recordCall(nil, result, false)
		return result, err
	}

	// Default: execute real function
	result, err := realFn(ctx)
	recordCall(nil, result, false)
	return result, err
}

// toMapInterface converts any value to map[string]interface{} for recording
func toMapInterface(v interface{}) map[string]interface{} {
	if v == nil {
		return nil
	}

	// Try direct type assertion first
	if m, ok := v.(map[string]interface{}); ok {
		return m
	}

	// Try JSON marshaling/unmarshaling as fallback
	data, err := json.Marshal(v)
	if err != nil {
		return map[string]interface{}{"_value": fmt.Sprintf("%v", v)}
	}

	var result map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		return map[string]interface{}{"_value": fmt.Sprintf("%v", v)}
	}

	return result
}

// WithInterceptSession creates a new context with the given InterceptSession
func WithInterceptSession(ctx context.Context, session *InterceptSession) context.Context {
	return context.WithValue(ctx, InterceptSessionKey, session)
}

// GetInterceptSession retrieves the InterceptSession from context
func GetInterceptSession(ctx context.Context) *InterceptSession {
	session, ok := ctx.Value(InterceptSessionKey).(*InterceptSession)
	if !ok {
		return nil
	}
	return session
}

// IsInterceptMode checks if the context is in intercept mode
func IsInterceptMode(ctx context.Context) bool {
	session := GetInterceptSession(ctx)
	return session != nil && session.Mode == InterceptModeEnabled
}

// LogExecution adds an execution log entry to the session
func (s *InterceptSession) LogExecution(operation string, input, output interface{}, isMocked bool, errMsg string) {
	s.ExecutionLog = append(s.ExecutionLog, ExecutionLogEntry{
		Timestamp: time.Now(),
		Operation: operation,
		Input:     input,
		Output:    output,
		IsMocked:  isMocked,
		Error:     errMsg,
	})
}
