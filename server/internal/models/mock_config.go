package models

import (
	"encoding/json"
	"time"
)

// MockConfig represents a mock configuration for workflow execution
type MockConfig struct {
	Id            string                 `json:"id" db:"id"`
	WorkflowId    string                 `json:"workflowId" db:"workflow_id"`
	Name          string                 `json:"name" db:"name"`
	Description   string                 `json:"description" db:"description"`
	NodeConfigs   map[string]NodeConfig  `json:"nodeConfigs" db:"node_configs"`
	GatewayConfigs map[string]GatewayConfig `json:"gatewayConfigs" db:"gateway_configs"`
	CreatedAt     time.Time              `json:"createdAt" db:"created_at"`
	UpdatedAt     time.Time              `json:"updatedAt" db:"updated_at"`
}

// NodeConfig represents mock configuration for a node
type NodeConfig struct {
	MockResponse interface{} `json:"mockResponse"`
	Delay        int         `json:"delay"`        // milliseconds
	ShouldFail   bool        `json:"shouldFail"`
	ErrorMessage string      `json:"errorMessage"`
}

// GatewayConfig represents mock configuration for a gateway
type GatewayConfig struct {
	SelectedPath string `json:"selectedPath"` // selected sequence flow ID
}

// MarshalNodeConfigs converts node configs map to JSON bytes
func (m *MockConfig) MarshalNodeConfigs() ([]byte, error) {
	if m.NodeConfigs == nil {
		return []byte("{}"), nil
	}
	return json.Marshal(m.NodeConfigs)
}

// UnmarshalNodeConfigs converts JSON bytes to node configs map
func (m *MockConfig) UnmarshalNodeConfigs(data []byte) error {
	if len(data) == 0 {
		m.NodeConfigs = make(map[string]NodeConfig)
		return nil
	}
	return json.Unmarshal(data, &m.NodeConfigs)
}

// MarshalGatewayConfigs converts gateway configs map to JSON bytes
func (m *MockConfig) MarshalGatewayConfigs() ([]byte, error) {
	if m.GatewayConfigs == nil {
		return []byte("{}"), nil
	}
	return json.Marshal(m.GatewayConfigs)
}

// UnmarshalGatewayConfigs converts JSON bytes to gateway configs map
func (m *MockConfig) UnmarshalGatewayConfigs(data []byte) error {
	if len(data) == 0 {
		m.GatewayConfigs = make(map[string]GatewayConfig)
		return nil
	}
	return json.Unmarshal(data, &m.GatewayConfigs)
}

