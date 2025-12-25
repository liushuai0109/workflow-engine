package models

import "time"

// WorkflowInstance represents a workflow instance
type WorkflowInstance struct {
	Id              string    `json:"id" db:"id"`
	WorkflowId      string    `json:"workflowId" db:"workflow_id"`
	Name            string    `json:"name" db:"name"`
	Status          string    `json:"status" db:"status"`
	CurrentNodeIds []string  `json:"currentNodeIds" db:"current_node_ids"`
	InstanceVersion int       `json:"instanceVersion" db:"instance_version"`
	CreatedAt       time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt       time.Time `json:"updatedAt" db:"updated_at"`
}

// WorkflowInstanceStatus constants
const (
	InstanceStatusPending   = "pending"
	InstanceStatusRunning   = "running"
	InstanceStatusCompleted = "completed"
	InstanceStatusFailed    = "failed"
	InstanceStatusCancelled = "cancelled"
)

