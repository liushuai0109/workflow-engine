package services

import (
	"fmt"
	"sync"

	"github.com/bpmn-explorer/server/internal/models"
	"github.com/rs/zerolog"
)

// DebugSessionStore manages in-memory debug session states
type DebugSessionStore struct {
	sessions map[string]*models.DebugSession
	mu       sync.RWMutex
	logger   *zerolog.Logger
}

// NewDebugSessionStore creates a new DebugSessionStore
func NewDebugSessionStore(logger *zerolog.Logger) *DebugSessionStore {
	return &DebugSessionStore{
		sessions: make(map[string]*models.DebugSession),
		logger:   logger,
	}
}

// SaveSession saves or updates a debug session in the store
func (s *DebugSessionStore) SaveSession(session *models.DebugSession) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions[session.Id] = session
	s.logger.Debug().Str("sessionId", session.Id).Str("status", session.Status).Msg("Debug session saved")
}

// GetSession retrieves a debug session by ID
func (s *DebugSessionStore) GetSession(id string) (*models.DebugSession, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if session, ok := s.sessions[id]; ok {
		return session, nil
	}
	return nil, fmt.Errorf("debug session %s not found", id)
}

// DeleteSession removes a debug session from the store
func (s *DebugSessionStore) DeleteSession(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.sessions, id)
	s.logger.Debug().Str("sessionId", id).Msg("Debug session deleted")
}

// ListSessionsByWorkflowID lists all sessions for a workflow
func (s *DebugSessionStore) ListSessionsByWorkflowID(workflowId string) []*models.DebugSession {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var result []*models.DebugSession
	for _, session := range s.sessions {
		if session.WorkflowId == workflowId {
			result = append(result, session)
		}
	}
	return result
}

