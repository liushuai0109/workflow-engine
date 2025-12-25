package models

import (
	"time"
)

// ChatConversation represents a chat conversation
type ChatConversation struct {
	Id            string    `json:"id" db:"id"`
	Title         string    `json:"title" db:"title"`
	CreatedAt     time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt     time.Time `json:"updatedAt" db:"updated_at"`
	LastMessageAt time.Time `json:"lastMessageAt" db:"last_message_at"`
	MessageCount  int       `json:"messageCount,omitempty" db:"-"` // 计算字段，不存储在数据库
}

