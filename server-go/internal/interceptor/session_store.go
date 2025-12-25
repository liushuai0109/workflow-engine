package interceptor

import (
	"fmt"
	"sync"
)

// SessionStore provides an interface for storing and retrieving InterceptSessions
type SessionStore interface {
	Set(id string, session *InterceptSession)
	Get(id string) (*InterceptSession, error)
	Delete(id string)
	Exists(id string) bool
}

// MemorySessionStore provides an in-memory implementation of SessionStore
type MemorySessionStore struct {
	sessions map[string]*InterceptSession
	mu       sync.RWMutex
}

// NewMemorySessionStore creates a new MemorySessionStore
func NewMemorySessionStore() *MemorySessionStore {
	return &MemorySessionStore{
		sessions: make(map[string]*InterceptSession),
	}
}

// Set stores a session with the given ID
func (s *MemorySessionStore) Set(id string, session *InterceptSession) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions[id] = session
}

// Get retrieves a session by ID
func (s *MemorySessionStore) Get(id string) (*InterceptSession, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	session, exists := s.sessions[id]
	if !exists {
		return nil, fmt.Errorf("session not found: %s", id)
	}

	return session, nil
}

// Delete removes a session by ID
func (s *MemorySessionStore) Delete(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.sessions, id)
}

// Exists checks if a session exists
func (s *MemorySessionStore) Exists(id string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	_, exists := s.sessions[id]
	return exists
}
