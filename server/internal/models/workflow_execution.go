package models

import (
	"encoding/json"
	"time"
)

// WorkflowExecution represents a workflow execution
type WorkflowExecution struct {
	Id               string                 `json:"id" db:"id"`
	InstanceId       string                 `json:"instanceId" db:"instance_id"`
	WorkflowId       string                 `json:"workflowId" db:"workflow_id"`
	Status           string                 `json:"status" db:"status"`
	Variables        map[string]interface{} `json:"variables" db:"variables"`
	ExecutionVersion int                    `json:"executionVersion" db:"execution_version"`
	StartedAt        time.Time              `json:"startedAt" db:"started_at"`
	CompletedAt      *time.Time             `json:"completedAt,omitempty" db:"completed_at"`
	ErrorMessage     string                 `json:"errorMessage,omitempty" db:"error_message"`
}

// WorkflowExecutionStatus constants
const (
	ExecutionStatusPending   = "pending"
	ExecutionStatusRunning   = "running"
	ExecutionStatusCompleted = "completed"
	ExecutionStatusFailed    = "failed"
	ExecutionStatusCancelled = "cancelled"
)

// MarshalVariables converts variables map to JSON bytes
func (e *WorkflowExecution) MarshalVariables() ([]byte, error) {
	if e.Variables == nil {
		return []byte("{}"), nil
	}
	return json.Marshal(e.Variables)
}

// UnmarshalVariables converts JSON bytes to variables map
func (e *WorkflowExecution) UnmarshalVariables(data []byte) error {
	if len(data) == 0 {
		e.Variables = make(map[string]interface{})
		return nil
	}
	return json.Unmarshal(data, &e.Variables)
}

