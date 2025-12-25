package services

import (
	"context"
	"sync"
	"time"
)

// InterceptorCallRecorder records interceptor calls during execution
type InterceptorCallRecorder struct {
	calls []InterceptorCall
	mu    sync.RWMutex
	order int
}

// NewInterceptorCallRecorder creates a new InterceptorCallRecorder
func NewInterceptorCallRecorder() *InterceptorCallRecorder {
	return &InterceptorCallRecorder{
		calls: make([]InterceptorCall, 0),
		order: 0,
	}
}

// Record records an interceptor call
func (r *InterceptorCallRecorder) Record(name string, input, output map[string]interface{}) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.order++
	call := InterceptorCall{
		Name:      name,
		Order:     r.order,
		Timestamp: time.Now().Format(time.RFC3339),
		Input:     input,
		Output:    output,
	}
	r.calls = append(r.calls, call)
}

// GetCalls returns all recorded interceptor calls
func (r *InterceptorCallRecorder) GetCalls() []InterceptorCall {
	r.mu.RLock()
	defer r.mu.RUnlock()

	// Return a copy to avoid external modifications
	calls := make([]InterceptorCall, len(r.calls))
	copy(calls, r.calls)
	return calls
}

// Clear clears all recorded calls
func (r *InterceptorCallRecorder) Clear() {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.calls = make([]InterceptorCall, 0)
	r.order = 0
}

// Context key for interceptor call recorder
const interceptorRecorderKey contextKey = "interceptorRecorder"

// WithInterceptorRecorder adds an interceptor recorder to the context
func WithInterceptorRecorder(ctx context.Context, recorder *InterceptorCallRecorder) context.Context {
	return context.WithValue(ctx, interceptorRecorderKey, recorder)
}

// GetInterceptorRecorder retrieves the interceptor recorder from the context
func GetInterceptorRecorder(ctx context.Context) *InterceptorCallRecorder {
	if recorder, ok := ctx.Value(interceptorRecorderKey).(*InterceptorCallRecorder); ok {
		return recorder
	}
	return nil
}
