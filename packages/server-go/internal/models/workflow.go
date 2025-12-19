package models

import "time"

// Workflow represents a BPMN workflow
type Workflow struct {
	ID          string    `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	Description string    `json:"description,omitempty" db:"description"`
	BpmnXML     string    `json:"bpmnXml" db:"bpmn_xml"`
	Version     string    `json:"version" db:"version"`
	Status      string    `json:"status" db:"status"`
	CreatedBy   string    `json:"createdBy,omitempty" db:"created_by"`
	CreatedAt   time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt   time.Time `json:"updatedAt" db:"updated_at"`
}

// WorkflowStatus constants
const (
	StatusDraft    = "draft"
	StatusActive   = "active"
	StatusInactive = "inactive"
	StatusArchived = "archived"
)
