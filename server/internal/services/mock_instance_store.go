package services

import (
	"fmt"
	"sync"
	"time"

	"github.com/rs/zerolog"
)

// MockWorkflowInstance represents a mock workflow instance
type MockWorkflowInstance struct {
	Id              string                 `json:"id"`
	WorkflowId      string                 `json:"workflowId"`
	Status          string                 `json:"status"`
	CurrentNodeIds  []string               `json:"currentNodeIds"`
	Variables       map[string]interface{} `json:"variables"`
	InstanceVersion int                    `json:"instanceVersion"`
	CreatedAt       time.Time              `json:"createdAt"`
	UpdatedAt       time.Time              `json:"updatedAt"`
}

// MockInstanceStore provides in-memory storage for mock workflow instances
type MockInstanceStore struct {
	instances map[string]*MockWorkflowInstance
	mu        sync.RWMutex
	logger    *zerolog.Logger
}

// NewMockInstanceStore creates a new MockInstanceStore
func NewMockInstanceStore(logger *zerolog.Logger) *MockInstanceStore {
	return &MockInstanceStore{
		instances: make(map[string]*MockWorkflowInstance),
		logger:    logger,
	}
}

// Create creates a new mock workflow instance
func (s *MockInstanceStore) Create(instance *MockWorkflowInstance) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.instances[instance.Id]; exists {
		return fmt.Errorf("mock instance with id %s already exists", instance.Id)
	}

	instance.CreatedAt = time.Now()
	instance.UpdatedAt = time.Now()
	s.instances[instance.Id] = instance

	s.logger.Info().
		Str("instanceId", instance.Id).
		Str("workflowId", instance.WorkflowId).
		Msg("Mock instance created")

	return nil
}

// Get retrieves a mock workflow instance by ID
func (s *MockInstanceStore) Get(instanceId string) (*MockWorkflowInstance, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	instance, exists := s.instances[instanceId]
	if !exists {
		return nil, fmt.Errorf("mock instance with id %s not found", instanceId)
	}

	return instance, nil
}

// Update updates an existing mock workflow instance
func (s *MockInstanceStore) Update(instance *MockWorkflowInstance) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.instances[instance.Id]; !exists {
		return fmt.Errorf("mock instance with id %s not found", instance.Id)
	}

	instance.UpdatedAt = time.Now()
	s.instances[instance.Id] = instance

	s.logger.Info().
		Str("instanceId", instance.Id).
		Str("status", instance.Status).
		Interface("currentNodeIds", instance.CurrentNodeIds).
		Msg("Mock instance updated")

	return nil
}

// Delete deletes a mock workflow instance by ID
func (s *MockInstanceStore) Delete(instanceId string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.instances[instanceId]; !exists {
		return fmt.Errorf("mock instance with id %s not found", instanceId)
	}

	delete(s.instances, instanceId)

	s.logger.Info().
		Str("instanceId", instanceId).
		Msg("Mock instance deleted")

	return nil
}

// List returns all mock workflow instances
func (s *MockInstanceStore) List() ([]*MockWorkflowInstance, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	instances := make([]*MockWorkflowInstance, 0, len(s.instances))
	for _, instance := range s.instances {
		instances = append(instances, instance)
	}

	return instances, nil
}

// Exists checks if a mock instance exists
func (s *MockInstanceStore) Exists(instanceId string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()

	_, exists := s.instances[instanceId]
	return exists
}
