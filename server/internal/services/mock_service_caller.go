package services

import (
	"context"
	"sync"

	"github.com/rs/zerolog"
)

// Mock context keys
type contextKey string

const (
	MockModeKey     contextKey = "mock_mode"
	MockDataKey     contextKey = "mock_data"
)

// MockExecutionConfig contains configuration for mock execution
type MockExecutionConfig struct {
	ExecutionApi       string                       `json:"executionApi"`
	WorkflowInstanceId string                       `json:"workflowInstanceId"`
	FromNodeId         string                       `json:"fromNodeId"`
	BusinessParams     map[string]interface{}       `json:"businessParams"`
	NodeMockData       map[string]*NodeMockData     `json:"nodeMockData"`
}

// NodeMockData contains mock data for a specific node
type NodeMockData struct {
	StatusCode int                    `json:"statusCode"`
	Body       interface{}            `json:"body"`
	Headers    map[string]string      `json:"headers,omitempty"`
}

// MockServiceCaller handles mock service calls
type MockServiceCaller struct {
	mockDataStore *MockDataStore
	logger        *zerolog.Logger
}

// MockDataStore stores mock data for nodes
type MockDataStore struct {
	data map[string]*NodeMockData
	mu   sync.RWMutex
}

// NewMockDataStore creates a new MockDataStore
func NewMockDataStore() *MockDataStore {
	return &MockDataStore{
		data: make(map[string]*NodeMockData),
	}
}

// Set stores mock data for a node
func (s *MockDataStore) Set(nodeId string, mockData *NodeMockData) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data[nodeId] = mockData
}

// Get retrieves mock data for a node
func (s *MockDataStore) Get(nodeId string) (*NodeMockData, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	data, exists := s.data[nodeId]
	return data, exists
}

// SetBatch stores multiple mock data entries
func (s *MockDataStore) SetBatch(mockData map[string]*NodeMockData) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for nodeId, data := range mockData {
		s.data[nodeId] = data
	}
}

// Clear removes all mock data
func (s *MockDataStore) Clear() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data = make(map[string]*NodeMockData)
}

// NewMockServiceCaller creates a new MockServiceCaller
func NewMockServiceCaller(logger *zerolog.Logger) *MockServiceCaller {
	return &MockServiceCaller{
		mockDataStore: NewMockDataStore(),
		logger:        logger,
	}
}

// Call returns mock data for a node
func (c *MockServiceCaller) Call(ctx context.Context, nodeId string) (*NodeMockData, error) {
	mockData, exists := c.mockDataStore.Get(nodeId)
	if !exists {
		// Return default mock data if not configured
		c.logger.Warn().Str("nodeId", nodeId).Msg("No mock data configured for node, using default")
		return &NodeMockData{
			StatusCode: 200,
			Body:       map[string]interface{}{"message": "Mock response"},
			Headers:    make(map[string]string),
		}, nil
	}

	c.logger.Info().
		Str("nodeId", nodeId).
		Int("statusCode", mockData.StatusCode).
		Msg("Returning mock data for node")

	return mockData, nil
}

// SetMockData sets mock data for nodes
func (c *MockServiceCaller) SetMockData(mockData map[string]*NodeMockData) {
	c.mockDataStore.SetBatch(mockData)
}

// ClearMockData clears all mock data
func (c *MockServiceCaller) ClearMockData() {
	c.mockDataStore.Clear()
}

// IsMockMode checks if context is in mock mode
func IsMockMode(ctx context.Context) bool {
	if ctx == nil {
		return false
	}
	mockMode, ok := ctx.Value(MockModeKey).(bool)
	return ok && mockMode
}

// GetMockConfig retrieves mock configuration from context
func GetMockConfig(ctx context.Context) (*MockExecutionConfig, bool) {
	if ctx == nil {
		return nil, false
	}
	config, ok := ctx.Value(MockDataKey).(*MockExecutionConfig)
	return config, ok
}

// WithMockMode returns a context with mock mode enabled
func WithMockMode(ctx context.Context, config *MockExecutionConfig) context.Context {
	ctx = context.WithValue(ctx, MockModeKey, true)
	if config != nil {
		ctx = context.WithValue(ctx, MockDataKey, config)
	}
	return ctx
}
