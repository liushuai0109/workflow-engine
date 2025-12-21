package services

import (
	"context"
	"fmt"
	"time"

	"github.com/bpmn-explorer/server/internal/models"
	"github.com/bpmn-explorer/server/internal/parser"
	"github.com/bpmn-explorer/server/pkg/database"
	"github.com/rs/zerolog"
)

// MockInstanceService manages mock workflow instances
type MockInstanceService struct {
	db          *database.Database
	logger      *zerolog.Logger
	store       *MockInstanceStore
	workflowSvc *WorkflowService
}

// NewMockInstanceService creates a new MockInstanceService
func NewMockInstanceService(
	db *database.Database,
	logger *zerolog.Logger,
	workflowSvc *WorkflowService,
) *MockInstanceService {
	return &MockInstanceService{
		db:          db,
		logger:      logger,
		store:       NewMockInstanceStore(logger),
		workflowSvc: workflowSvc,
	}
}

// CreateMockInstance creates a new mock workflow instance
func (s *MockInstanceService) CreateMockInstance(
	ctx context.Context,
	workflowId string,
	initialVariables map[string]interface{},
) (*MockWorkflowInstance, error) {
	// Verify workflow exists
	_, err := s.workflowSvc.GetWorkflowByID(ctx, workflowId)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", models.ErrWorkflowNotFound, err)
	}

	// Generate mock instance ID
	instanceId := fmt.Sprintf("mock-instance-%d", time.Now().UnixNano())

	// Create mock instance
	instance := &MockWorkflowInstance{
		Id:              instanceId,
		WorkflowId:      workflowId,
		Status:          models.InstanceStatusRunning,
		CurrentNodeIds:  []string{},
		Variables:       initialVariables,
		InstanceVersion: 1,
	}

	if instance.Variables == nil {
		instance.Variables = make(map[string]interface{})
	}

	err = s.store.Create(instance)
	if err != nil {
		return nil, fmt.Errorf("failed to create mock instance: %w", err)
	}

	s.logger.Info().
		Str("instanceId", instanceId).
		Str("workflowId", workflowId).
		Msg("Mock workflow instance created")

	return instance, nil
}

// CreateMockInstanceWithStartNode creates a mock instance and sets the start node
func (s *MockInstanceService) CreateMockInstanceWithStartNode(
	ctx context.Context,
	workflowId string,
	startNodeId string,
	initialVariables map[string]interface{},
) (*MockWorkflowInstance, error) {
	// Verify workflow exists and get start node
	workflow, err := s.workflowSvc.GetWorkflowByID(ctx, workflowId)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", models.ErrWorkflowNotFound, err)
	}

	// Parse BPMN to verify start node
	wd, err := parser.ParseBPMN(workflow.BpmnXml)
	if err != nil {
		return nil, fmt.Errorf("failed to parse BPMN XML: %w", err)
	}

	// If no startNodeId provided, find the start event
	if startNodeId == "" {
		// Find start event
		for _, node := range wd.Nodes {
			if node.Type == parser.NodeTypeStartEvent {
				startNodeId = node.Id
				break
			}
		}
		if startNodeId == "" {
			return nil, fmt.Errorf("no start event found in workflow")
		}
	} else {
		// Verify startNodeId exists in workflow
		if _, exists := wd.Nodes[startNodeId]; !exists {
			return nil, fmt.Errorf("%s: node %s not found", models.ErrInvalidNodeId, startNodeId)
		}
	}

	// Create mock instance
	instance, err := s.CreateMockInstance(ctx, workflowId, initialVariables)
	if err != nil {
		return nil, err
	}

	// Set current node to start node
	instance.CurrentNodeIds = []string{startNodeId}
	err = s.store.Update(instance)
	if err != nil {
		return nil, fmt.Errorf("failed to update mock instance: %w", err)
	}

	return instance, nil
}

// GetMockInstance retrieves a mock instance by ID
func (s *MockInstanceService) GetMockInstance(ctx context.Context, instanceId string) (*MockWorkflowInstance, error) {
	instance, err := s.store.Get(instanceId)
	if err != nil {
		return nil, fmt.Errorf("mock instance not found: %w", err)
	}
	return instance, nil
}

// UpdateMockInstance updates a mock instance
func (s *MockInstanceService) UpdateMockInstance(
	ctx context.Context,
	instanceId string,
	status string,
	currentNodeIds []string,
	variables map[string]interface{},
) (*MockWorkflowInstance, error) {
	instance, err := s.store.Get(instanceId)
	if err != nil {
		return nil, fmt.Errorf("mock instance not found: %w", err)
	}

	// Update fields
	if status != "" {
		instance.Status = status
	}
	if currentNodeIds != nil {
		instance.CurrentNodeIds = currentNodeIds
	}
	if variables != nil {
		instance.Variables = variables
	}

	// Increment version
	instance.InstanceVersion++

	err = s.store.Update(instance)
	if err != nil {
		return nil, fmt.Errorf("failed to update mock instance: %w", err)
	}

	return instance, nil
}

// DeleteMockInstance deletes a mock instance
func (s *MockInstanceService) DeleteMockInstance(ctx context.Context, instanceId string) error {
	err := s.store.Delete(instanceId)
	if err != nil {
		return fmt.Errorf("failed to delete mock instance: %w", err)
	}
	return nil
}

// ListMockInstances lists all mock instances
func (s *MockInstanceService) ListMockInstances(ctx context.Context) ([]*MockWorkflowInstance, error) {
	instances, err := s.store.List()
	if err != nil {
		return nil, fmt.Errorf("failed to list mock instances: %w", err)
	}
	return instances, nil
}

// MockInstanceExists checks if a mock instance exists
func (s *MockInstanceService) MockInstanceExists(instanceId string) bool {
	return s.store.Exists(instanceId)
}
