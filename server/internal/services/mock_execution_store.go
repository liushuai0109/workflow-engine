package services

import (
	"fmt"
	"sync"
	"time"

	"github.com/rs/zerolog"
)

// MockExecutionStore manages mock execution state in memory
type MockExecutionStore struct {
	mu         sync.RWMutex
	executions map[string]*MockExecution
	logger     *zerolog.Logger
}

// NewMockExecutionStore creates a new MockExecutionStore
func NewMockExecutionStore(logger *zerolog.Logger) *MockExecutionStore {
	return &MockExecutionStore{
		executions: make(map[string]*MockExecution),
		logger:     logger,
	}
}

// SaveExecution saves a mock execution to memory
func (s *MockExecutionStore) SaveExecution(execution *MockExecution) {
	s.mu.Lock()
	defer s.mu.Unlock()
	execution.UpdatedAt = time.Now()
	s.executions[execution.Id] = execution
}

// GetExecution retrieves a mock execution from memory
func (s *MockExecutionStore) GetExecution(executionId string) (*MockExecution, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	execution, exists := s.executions[executionId]
	if !exists {
		return nil, fmt.Errorf("mock execution not found")
	}
	return execution, nil
}

// DeleteExecution deletes a mock execution from memory
func (s *MockExecutionStore) DeleteExecution(executionId string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.executions, executionId)
}

// UpdateExecutionStatus updates execution status
func (s *MockExecutionStore) UpdateExecutionStatus(executionId string, status string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	execution, exists := s.executions[executionId]
	if !exists {
		return fmt.Errorf("mock execution not found")
	}
	execution.Status = status
	execution.UpdatedAt = time.Now()
	return nil
}

