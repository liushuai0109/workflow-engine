package interceptor

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"reflect"
	"strings"
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
	// InterceptConfigKey is the context key for InterceptConfig
	InterceptConfigKey contextKey = "intercept_config"
	// DryRunModeKey is the context key for dry-run mode flag
	DryRunModeKey contextKey = "dry_run_mode"
	// InterceptorCollectorKey is the context key for interceptor collector
	InterceptorCollectorKey contextKey = "interceptor_collector"
)

// ErrDryRunMode is returned when in dry-run mode
var ErrDryRunMode = errors.New("dry-run mode: operation not executed")

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

// InterceptConfig holds per-interceptor configuration
type InterceptConfig struct {
	configMap map[string]string      // interceptorId -> mode
	mockData  map[string]interface{} // interceptorId -> mock data
}

// NewInterceptConfig creates a new InterceptConfig
func NewInterceptConfig(configMap map[string]string) *InterceptConfig {
	if configMap == nil {
		configMap = make(map[string]string)
	}
	return &InterceptConfig{
		configMap: configMap,
		mockData:  make(map[string]interface{}),
	}
}

// GetMode returns the mode for the given interceptor ID
func (c *InterceptConfig) GetMode(interceptorID string) InterceptMode {
	if mode, exists := c.configMap[interceptorID]; exists {
		return InterceptMode(mode)
	}
	return InterceptModeRecord // default mode
}

// GetMockData returns mock data for the given interceptor ID
func (c *InterceptConfig) GetMockData(interceptorID string) (interface{}, bool) {
	data, exists := c.mockData[interceptorID]
	return data, exists
}

// SetMockData sets mock data for the given interceptor ID
func (c *InterceptConfig) SetMockData(interceptorID string, data interface{}) {
	c.mockData[interceptorID] = data
}

// InterceptorInfo holds information about an interceptor call
type InterceptorInfo struct {
	ID        string        `json:"id"`
	Operation string        `json:"operation"`
	Params    []interface{} `json:"params"`
}

// InterceptorCollector collects interceptor calls in dry-run mode
type InterceptorCollector struct {
	interceptors []InterceptorInfo
}

// NewInterceptorCollector creates a new InterceptorCollector
func NewInterceptorCollector() *InterceptorCollector {
	return &InterceptorCollector{
		interceptors: make([]InterceptorInfo, 0),
	}
}

// Add adds an interceptor call to the collector
func (c *InterceptorCollector) Add(id, operation string, params interface{}) {
	// Convert params to slice for JSON serialization
	paramsSlice := []interface{}{}
	if params != nil {
		paramsSlice = append(paramsSlice, params)
	}

	c.interceptors = append(c.interceptors, InterceptorInfo{
		ID:        id,
		Operation: operation,
		Params:    paramsSlice,
	})
}

// GetList returns the collected interceptor list
func (c *InterceptorCollector) GetList() []InterceptorInfo {
	return c.interceptors
}

// Intercept is the core interceptor function that intercepts function calls
// and returns mock data or executes the real function based on the mode
// T: return value type, P: parameter struct type
func Intercept[T any, P any](
	ctx context.Context,
	operation string,
	fn func(context.Context, P) (T, error),
	params P,
) (T, error) {
	var zero T

	// 1. Generate interceptor unique ID from struct parameters
	interceptorID := generateInterceptorID(operation, params)

	// 2. Check if in dry-run mode
	if IsDryRunMode(ctx) {
		// Dry-run: record interceptor info but don't execute
		RecordInterceptorCall(ctx, interceptorID, operation, params)
		return zero, ErrDryRunMode
	}

	// 3. Get interceptor config
	config := GetInterceptConfig(ctx)
	if config == nil {
		// No config, execute real function
		return fn(ctx, params)
	}

	mode := config.GetMode(interceptorID)

	// 4. Execute based on mode
	switch mode {
	case InterceptModeDisabled:
		// Disabled mode: execute directly without recording
		return fn(ctx, params)

	case InterceptModeEnabled:
		// Enabled mode: prioritize mock data
		mockData, exists := config.GetMockData(interceptorID)
		if exists {
			result, ok := mockData.(T)
			if ok {
				LogExecution(ctx, interceptorID, params, result, true, "")
				RecordCall(ctx, interceptorID, params, result)
				return result, nil
			}
		}
		// Mock data not found, fallback to real function
		result, err := fn(ctx, params)
		LogExecution(ctx, interceptorID, params, result, false, errString(err))
		RecordCall(ctx, interceptorID, params, result)
		return result, err

	case InterceptModeRecord:
		// Record mode: execute real function and record
		result, err := fn(ctx, params)
		if err == nil {
			config.SetMockData(interceptorID, result)
		}
		LogExecution(ctx, interceptorID, params, result, false, errString(err))
		RecordCall(ctx, interceptorID, params, result)
		return result, err

	default:
		// Default: record mode
		result, err := fn(ctx, params)
		LogExecution(ctx, interceptorID, params, result, false, errString(err))
		RecordCall(ctx, interceptorID, params, result)
		return result, err
	}
}

// InterceptLegacy is a backwards-compatible wrapper for the old closure-based approach
// DEPRECATED: Use Intercept with struct parameters instead
func InterceptLegacy[T any](
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

// generateInterceptorID generates a unique ID from operation and struct parameters
func generateInterceptorID(operation string, params interface{}) string {
	// 1. Get reflection value of params
	val := reflect.ValueOf(params)
	if val.Kind() == reflect.Ptr {
		val = val.Elem()
	}

	// 2. Ensure it's a struct
	if val.Kind() != reflect.Struct {
		// Non-struct (basic type), directly serialize
		return fmt.Sprintf("%s:%v", operation, params)
	}

	// 3. Iterate fields and extract those with intercept:"id" tag
	typ := val.Type()
	idParts := []string{operation}

	for i := 0; i < val.NumField(); i++ {
		field := typ.Field(i)
		tagValue := field.Tag.Get("intercept")

		// Only process fields with intercept:"id" tag
		if tagValue == "id" {
			fieldVal := val.Field(i)
			serialized := serializeField(fieldVal)
			idParts = append(idParts, serialized)
		}
	}

	return strings.Join(idParts, ":")
}

// serializeField serializes a reflect.Value to string
func serializeField(val reflect.Value) string {
	switch val.Kind() {
	case reflect.String:
		return val.String()
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return fmt.Sprintf("%d", val.Int())
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return fmt.Sprintf("%d", val.Uint())
	case reflect.Bool:
		return fmt.Sprintf("%t", val.Bool())
	case reflect.Float32, reflect.Float64:
		return fmt.Sprintf("%f", val.Float())
	default:
		// Complex type: JSON serialize and hash if too long
		data, err := json.Marshal(val.Interface())
		if err != nil {
			return "error"
		}
		if len(data) > 50 {
			// Too long, hash it
			hash := sha256.Sum256(data)
			return hex.EncodeToString(hash[:8]) // Use first 8 bytes
		}
		return string(data)
	}
}

// errString converts error to string
func errString(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
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

// WithInterceptConfig creates a new context with the given InterceptConfig
func WithInterceptConfig(ctx context.Context, config *InterceptConfig) context.Context {
	return context.WithValue(ctx, InterceptConfigKey, config)
}

// GetInterceptConfig retrieves the InterceptConfig from context
func GetInterceptConfig(ctx context.Context) *InterceptConfig {
	config, ok := ctx.Value(InterceptConfigKey).(*InterceptConfig)
	if !ok {
		return nil
	}
	return config
}

// WithDryRunMode creates a new context with dry-run mode enabled
func WithDryRunMode(ctx context.Context) context.Context {
	return context.WithValue(ctx, DryRunModeKey, true)
}

// IsDryRunMode checks if the context is in dry-run mode
func IsDryRunMode(ctx context.Context) bool {
	isDryRun, ok := ctx.Value(DryRunModeKey).(bool)
	return ok && isDryRun
}

// WithInterceptorCollector creates a new context with the given collector
func WithInterceptorCollector(ctx context.Context, collector *InterceptorCollector) context.Context {
	return context.WithValue(ctx, InterceptorCollectorKey, collector)
}

// GetInterceptorCollector retrieves the InterceptorCollector from context
func GetInterceptorCollector(ctx context.Context) *InterceptorCollector {
	collector, ok := ctx.Value(InterceptorCollectorKey).(*InterceptorCollector)
	if !ok {
		return nil
	}
	return collector
}

// RecordInterceptorCall records an interceptor call in dry-run mode
func RecordInterceptorCall(ctx context.Context, id, operation string, params interface{}) {
	collector := GetInterceptorCollector(ctx)
	if collector != nil {
		collector.Add(id, operation, params)
	}
}

// LogExecution logs the execution (used in new architecture)
func LogExecution(ctx context.Context, interceptorID string, input, output interface{}, isMocked bool, errMsg string) {
	// For now, just log to session if available (backwards compatibility)
	session := GetInterceptSession(ctx)
	if session != nil {
		session.LogExecution(interceptorID, input, output, isMocked, errMsg)
	}
}

// RecordCall records a call (used in new architecture)
func RecordCall(ctx context.Context, interceptorID string, input, output interface{}) {
	// For now, use the old CallRecorderFunc if available (backwards compatibility)
	if recorder, ok := ctx.Value(CallRecorderKey).(CallRecorderFunc); ok && recorder != nil {
		inputMap := toMapInterface(input)
		outputMap := toMapInterface(output)
		recorder(interceptorID, inputMap, outputMap)
	}
}
