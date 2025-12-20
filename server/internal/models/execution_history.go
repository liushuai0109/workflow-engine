package models

import (
	"encoding/json"
	"time"
)

// ExecutionHistory represents a history record of node execution
type ExecutionHistory struct {
	Id              string                 `json:"id" db:"id"`
	ExecutionId     string                 `json:"executionId" db:"execution_id"`
	NodeId          string                 `json:"nodeId" db:"node_id"`
	NodeName        string                 `json:"nodeName" db:"node_name"`
	NodeType        int                    `json:"nodeType" db:"node_type"`
	InputData       map[string]interface{} `json:"inputData" db:"input_data"`
	OutputData      map[string]interface{} `json:"outputData" db:"output_data"`
	VariablesBefore map[string]interface{} `json:"variablesBefore" db:"variables_before"`
	VariablesAfter  map[string]interface{} `json:"variablesAfter" db:"variables_after"`
	ExecutionTimeMs int                   `json:"executionTimeMs" db:"execution_time_ms"`
	ErrorMessage    string                 `json:"errorMessage,omitempty" db:"error_message"`
	ExecutedAt      time.Time              `json:"executedAt" db:"executed_at"`
}

// MarshalInputData converts input data map to JSON bytes
func (e *ExecutionHistory) MarshalInputData() ([]byte, error) {
	if e.InputData == nil {
		return []byte("{}"), nil
	}
	return json.Marshal(e.InputData)
}

// UnmarshalInputData converts JSON bytes to input data map
func (e *ExecutionHistory) UnmarshalInputData(data []byte) error {
	if len(data) == 0 {
		e.InputData = make(map[string]interface{})
		return nil
	}
	return json.Unmarshal(data, &e.InputData)
}

// MarshalOutputData converts output data map to JSON bytes
func (e *ExecutionHistory) MarshalOutputData() ([]byte, error) {
	if e.OutputData == nil {
		return []byte("{}"), nil
	}
	return json.Marshal(e.OutputData)
}

// UnmarshalOutputData converts JSON bytes to output data map
func (e *ExecutionHistory) UnmarshalOutputData(data []byte) error {
	if len(data) == 0 {
		e.OutputData = make(map[string]interface{})
		return nil
	}
	return json.Unmarshal(data, &e.OutputData)
}

// MarshalVariablesBefore converts variables before map to JSON bytes
func (e *ExecutionHistory) MarshalVariablesBefore() ([]byte, error) {
	if e.VariablesBefore == nil {
		return []byte("{}"), nil
	}
	return json.Marshal(e.VariablesBefore)
}

// UnmarshalVariablesBefore converts JSON bytes to variables before map
func (e *ExecutionHistory) UnmarshalVariablesBefore(data []byte) error {
	if len(data) == 0 {
		e.VariablesBefore = make(map[string]interface{})
		return nil
	}
	return json.Unmarshal(data, &e.VariablesBefore)
}

// MarshalVariablesAfter converts variables after map to JSON bytes
func (e *ExecutionHistory) MarshalVariablesAfter() ([]byte, error) {
	if e.VariablesAfter == nil {
		return []byte("{}"), nil
	}
	return json.Marshal(e.VariablesAfter)
}

// UnmarshalVariablesAfter converts JSON bytes to variables after map
func (e *ExecutionHistory) UnmarshalVariablesAfter(data []byte) error {
	if len(data) == 0 {
		e.VariablesAfter = make(map[string]interface{})
		return nil
	}
	return json.Unmarshal(data, &e.VariablesAfter)
}

