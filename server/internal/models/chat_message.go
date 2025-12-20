package models

import (
	"encoding/json"
	"time"
)

// ChatMessage represents a chat message
type ChatMessage struct {
	Id             string                 `json:"id" db:"id"`
	ConversationId string                 `json:"conversationId" db:"conversation_id"`
	Role           string                 `json:"role" db:"role"`
	Content        string                 `json:"content" db:"content"`
	Metadata       map[string]interface{} `json:"metadata,omitempty" db:"metadata"`
	Sequence       int                    `json:"sequence" db:"sequence"`
	CreatedAt      time.Time              `json:"createdAt" db:"created_at"`
}

// MarshalMetadata converts metadata map to JSON bytes
func (m *ChatMessage) MarshalMetadata() ([]byte, error) {
	if m.Metadata == nil {
		return []byte("{}"), nil
	}
	return json.Marshal(m.Metadata)
}

// UnmarshalMetadata converts JSON bytes to metadata map
func (m *ChatMessage) UnmarshalMetadata(data []byte) error {
	if len(data) == 0 {
		m.Metadata = make(map[string]interface{})
		return nil
	}
	return json.Unmarshal(data, &m.Metadata)
}

