package models

import (
	"encoding/json"
	"time"
)

// UserProfile represents a user profile
type UserProfile struct {
	ID         string                 `json:"id" db:"id"`
	Email      string                 `json:"email" db:"email"`
	Attributes map[string]interface{} `json:"attributes" db:"attributes"`
	CreatedAt  time.Time              `json:"createdAt" db:"created_at"`
	UpdatedAt  time.Time              `json:"updatedAt" db:"updated_at"`
}

// MarshalAttributes converts attributes map to JSON bytes
func (u *UserProfile) MarshalAttributes() ([]byte, error) {
	return json.Marshal(u.Attributes)
}

// UnmarshalAttributes converts JSON bytes to attributes map
func (u *UserProfile) UnmarshalAttributes(data []byte) error {
	return json.Unmarshal(data, &u.Attributes)
}
