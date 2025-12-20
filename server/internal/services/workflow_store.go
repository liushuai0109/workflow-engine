package services

import (
	"fmt"
	"sync"

	"github.com/bpmn-explorer/server/internal/models"
	"github.com/rs/zerolog"
)

// WorkflowStore manages in-memory workflow definitions
type WorkflowStore struct {
	workflows map[string]*models.Workflow
	mu        sync.RWMutex
	logger    *zerolog.Logger
}

// NewWorkflowStore creates a new WorkflowStore
func NewWorkflowStore(logger *zerolog.Logger) *WorkflowStore {
	return &WorkflowStore{
		workflows: make(map[string]*models.Workflow),
		logger:    logger,
	}
}

// SaveWorkflow saves or updates a workflow in the store
func (s *WorkflowStore) SaveWorkflow(workflow *models.Workflow) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.workflows[workflow.Id] = workflow
	s.logger.Debug().Str("workflowId", workflow.Id).Str("name", workflow.Name).Msg("Workflow saved to memory")
}

// GetWorkflow retrieves a workflow by ID
func (s *WorkflowStore) GetWorkflow(id string) (*models.Workflow, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if workflow, ok := s.workflows[id]; ok {
		return workflow, nil
	}
	return nil, fmt.Errorf("workflow %s not found in memory store", id)
}

// HasWorkflow checks if a workflow exists
func (s *WorkflowStore) HasWorkflow(id string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	_, exists := s.workflows[id]
	return exists
}

