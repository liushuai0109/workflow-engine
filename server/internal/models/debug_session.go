package models

import (
	"encoding/json"
	"time"
)

// DebugSession represents a debug session for workflow execution
type DebugSession struct {
	Id            string                 `json:"id" db:"id"`
	WorkflowId    string                 `json:"workflowId" db:"workflow_id"`
	ExecutionId   string                 `json:"executionId" db:"execution_id"`
	Status        string                 `json:"status" db:"status"`
	CurrentNodeId string                `json:"currentNodeId" db:"current_node_id"`
	Variables     map[string]interface{} `json:"variables" db:"variables"`
	Breakpoints   []string               `json:"breakpoints" db:"breakpoints"`
	CallStack     []CallStackFrame       `json:"callStack" db:"call_stack"`
	CreatedAt     time.Time              `json:"createdAt" db:"created_at"`
	UpdatedAt     time.Time              `json:"updatedAt" db:"updated_at"`
}

// CallStackFrame represents a frame in the call stack
type CallStackFrame struct {
	NodeId      string                 `json:"nodeId"`
	NodeName    string                 `json:"nodeName"`
	NodeType    uint32                 `json:"nodeType"`
	Variables   map[string]interface{} `json:"variables"`
	EnteredAt   time.Time              `json:"enteredAt"`
}

// DebugSessionStatus constants
const (
	DebugStatusPending   = "pending"
	DebugStatusRunning   = "running"
	DebugStatusPaused    = "paused"
	DebugStatusCompleted = "completed"
	DebugStatusStopped   = "stopped"
	DebugStatusFailed    = "failed"
)

// MarshalVariables converts variables map to JSON bytes
func (d *DebugSession) MarshalVariables() ([]byte, error) {
	if d.Variables == nil {
		return []byte("{}"), nil
	}
	return json.Marshal(d.Variables)
}

// UnmarshalVariables converts JSON bytes to variables map
func (d *DebugSession) UnmarshalVariables(data []byte) error {
	if len(data) == 0 {
		d.Variables = make(map[string]interface{})
		return nil
	}
	return json.Unmarshal(data, &d.Variables)
}

// MarshalBreakpoints converts breakpoints slice to JSON bytes
func (d *DebugSession) MarshalBreakpoints() ([]byte, error) {
	if d.Breakpoints == nil {
		return []byte("[]"), nil
	}
	return json.Marshal(d.Breakpoints)
}

// UnmarshalBreakpoints converts JSON bytes to breakpoints slice
func (d *DebugSession) UnmarshalBreakpoints(data []byte) error {
	if len(data) == 0 {
		d.Breakpoints = []string{}
		return nil
	}
	return json.Unmarshal(data, &d.Breakpoints)
}

// MarshalCallStack converts call stack slice to JSON bytes
func (d *DebugSession) MarshalCallStack() ([]byte, error) {
	if d.CallStack == nil {
		return []byte("[]"), nil
	}
	return json.Marshal(d.CallStack)
}

// UnmarshalCallStack converts JSON bytes to call stack slice
func (d *DebugSession) UnmarshalCallStack(data []byte) error {
	if len(data) == 0 {
		d.CallStack = []CallStackFrame{}
		return nil
	}
	return json.Unmarshal(data, &d.CallStack)
}

