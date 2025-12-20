package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/bpmn-explorer/server/internal/models"
	"github.com/bpmn-explorer/server/pkg/database"
	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/rs/zerolog"
)

// DebugSessionService handles debug session business logic
type DebugSessionService struct {
	db      *database.Database
	logger  *zerolog.Logger
	store   *DebugSessionStore
	useStore bool
}

// NewDebugSessionService creates a new DebugSessionService
func NewDebugSessionService(db *database.Database, logger *zerolog.Logger) *DebugSessionService {
	useStore := db == nil || db.DB == nil
	return &DebugSessionService{
		db:       db,
		logger:   logger,
		store:    NewDebugSessionStore(logger),
		useStore: useStore,
	}
}

// CreateDebugSession creates a new debug session
func (s *DebugSessionService) CreateDebugSession(
	ctx context.Context,
	workflowId string,
	executionId string,
	initialVariables map[string]interface{},
	breakpoints []string,
) (*models.DebugSession, error) {
	// Use in-memory store if database is not available
	if s.useStore || s.db == nil || s.db.DB == nil {
		s.logger.Debug().Bool("useStore", s.useStore).Bool("dbIsNil", s.db == nil).Msg("Using in-memory store for debug session")
		return s.createDebugSessionInMemory(workflowId, executionId, initialVariables, breakpoints)
	}

	id := uuid.New().String()
	now := time.Now()

	if initialVariables == nil {
		initialVariables = make(map[string]interface{})
	}
	if breakpoints == nil {
		breakpoints = []string{}
	}

	// Marshal data
	variablesJSON, err := json.Marshal(initialVariables)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal variables: %w", err)
	}

	breakpointsArray := pq.Array(breakpoints)
	callStackJSON := []byte("[]")

	query := `
		INSERT INTO debug_sessions (id, workflow_id, execution_id, status, current_node_id, variables, breakpoints, call_stack, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8::jsonb, $9, $10)
		RETURNING id, workflow_id, execution_id, status, current_node_id, variables, breakpoints, call_stack, created_at, updated_at
	`

	var session models.DebugSession
	var variablesBytes []byte
	var breakpointsBytes []byte
	var callStackBytes []byte

	err = s.db.QueryRowContext(ctx, query,
		id, workflowId, executionId, models.DebugStatusPending, "", string(variablesJSON), breakpointsArray, string(callStackJSON), now, now,
	).Scan(
		&session.Id,
		&session.WorkflowId,
		&session.ExecutionId,
		&session.Status,
		&session.CurrentNodeId,
		&variablesBytes,
		&breakpointsBytes,
		&callStackBytes,
		&session.CreatedAt,
		&session.UpdatedAt,
	)

	if err != nil {
		s.logger.Error().Err(err).Msg("Failed to create debug session")
		return nil, fmt.Errorf("failed to create debug session: %w", err)
	}

	// Unmarshal data
	if err := session.UnmarshalVariables(variablesBytes); err != nil {
		return nil, fmt.Errorf("failed to unmarshal variables: %w", err)
	}
	if err := session.UnmarshalBreakpoints(breakpointsBytes); err != nil {
		return nil, fmt.Errorf("failed to unmarshal breakpoints: %w", err)
	}
	if err := session.UnmarshalCallStack(callStackBytes); err != nil {
		return nil, fmt.Errorf("failed to unmarshal call stack: %w", err)
	}

	return &session, nil
}

// GetDebugSessionByID retrieves a debug session by ID
func (s *DebugSessionService) GetDebugSessionByID(ctx context.Context, sessionId string) (*models.DebugSession, error) {
	// Use in-memory store if database is not available
	if s.useStore || s.db == nil || s.db.DB == nil {
		return s.store.GetSession(sessionId)
	}

	query := `
		SELECT id, workflow_id, execution_id, status, current_node_id, variables, breakpoints, call_stack, created_at, updated_at
		FROM debug_sessions
		WHERE id = $1
	`

	var session models.DebugSession
	var variablesBytes []byte
	var breakpointsBytes []byte
	var callStackBytes []byte

	err := s.db.QueryRowContext(ctx, query, sessionId).Scan(
		&session.Id,
		&session.WorkflowId,
		&session.ExecutionId,
		&session.Status,
		&session.CurrentNodeId,
		&variablesBytes,
		&breakpointsBytes,
		&callStackBytes,
		&session.CreatedAt,
		&session.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("debug session not found")
		}
		s.logger.Error().Err(err).Str("sessionId", sessionId).Msg("Failed to get debug session")
		return nil, fmt.Errorf("failed to get debug session: %w", err)
	}

	// Unmarshal data
	if err := session.UnmarshalVariables(variablesBytes); err != nil {
		return nil, fmt.Errorf("failed to unmarshal variables: %w", err)
	}
	if err := session.UnmarshalBreakpoints(breakpointsBytes); err != nil {
		return nil, fmt.Errorf("failed to unmarshal breakpoints: %w", err)
	}
	if err := session.UnmarshalCallStack(callStackBytes); err != nil {
		return nil, fmt.Errorf("failed to unmarshal call stack: %w", err)
	}

	return &session, nil
}

// UpdateDebugSession updates a debug session
func (s *DebugSessionService) UpdateDebugSession(
	ctx context.Context,
	sessionId string,
	status string,
	currentNodeId string,
	variables map[string]interface{},
	breakpoints []string,
	callStack []models.CallStackFrame,
) (*models.DebugSession, error) {
	// Use in-memory store if database is not available
	if s.useStore || s.db == nil || s.db.DB == nil {
		return s.updateDebugSessionInMemory(sessionId, status, currentNodeId, variables, breakpoints, callStack)
	}

	now := time.Now()

	// Marshal data
	variablesJSON, err := json.Marshal(variables)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal variables: %w", err)
	}

	breakpointsArray := pq.Array(breakpoints)
	callStackJSON, err := json.Marshal(callStack)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal call stack: %w", err)
	}

	query := `
		UPDATE debug_sessions
		SET status = $1, current_node_id = $2, variables = $3::jsonb, breakpoints = $4, call_stack = $5::jsonb, updated_at = $6
		WHERE id = $7
		RETURNING id, workflow_id, execution_id, status, current_node_id, variables, breakpoints, call_stack, created_at, updated_at
	`

	var session models.DebugSession
	var variablesBytes []byte
	var breakpointsBytes []byte
	var callStackBytes []byte

	err = s.db.QueryRowContext(ctx, query,
		status, currentNodeId, string(variablesJSON), breakpointsArray, string(callStackJSON), now, sessionId,
	).Scan(
		&session.Id,
		&session.WorkflowId,
		&session.ExecutionId,
		&session.Status,
		&session.CurrentNodeId,
		&variablesBytes,
		&breakpointsBytes,
		&callStackBytes,
		&session.CreatedAt,
		&session.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("debug session not found")
		}
		s.logger.Error().Err(err).Str("sessionId", sessionId).Msg("Failed to update debug session")
		return nil, fmt.Errorf("failed to update debug session: %w", err)
	}

	// Unmarshal data
	if err := session.UnmarshalVariables(variablesBytes); err != nil {
		return nil, fmt.Errorf("failed to unmarshal variables: %w", err)
	}
	if err := session.UnmarshalBreakpoints(breakpointsBytes); err != nil {
		return nil, fmt.Errorf("failed to unmarshal breakpoints: %w", err)
	}
	if err := session.UnmarshalCallStack(callStackBytes); err != nil {
		return nil, fmt.Errorf("failed to unmarshal call stack: %w", err)
	}

	return &session, nil
}

// AddBreakpoint adds a breakpoint to a debug session
func (s *DebugSessionService) AddBreakpoint(ctx context.Context, sessionId string, nodeId string) error {
	session, err := s.GetDebugSessionByID(ctx, sessionId)
	if err != nil {
		return err
	}

	// Check if breakpoint already exists
	for _, bp := range session.Breakpoints {
		if bp == nodeId {
			return nil // Already exists
		}
	}

	// Add breakpoint
	session.Breakpoints = append(session.Breakpoints, nodeId)

	_, err = s.UpdateDebugSession(
		ctx,
		sessionId,
		session.Status,
		session.CurrentNodeId,
		session.Variables,
		session.Breakpoints,
		session.CallStack,
	)

	return err
}

// RemoveBreakpoint removes a breakpoint from a debug session
func (s *DebugSessionService) RemoveBreakpoint(ctx context.Context, sessionId string, nodeId string) error {
	session, err := s.GetDebugSessionByID(ctx, sessionId)
	if err != nil {
		return err
	}

	// Remove breakpoint
	newBreakpoints := []string{}
	for _, bp := range session.Breakpoints {
		if bp != nodeId {
			newBreakpoints = append(newBreakpoints, bp)
		}
	}

	_, err = s.UpdateDebugSession(
		ctx,
		sessionId,
		session.Status,
		session.CurrentNodeId,
		session.Variables,
		newBreakpoints,
		session.CallStack,
	)

	return err
}

// createDebugSessionInMemory creates a debug session in memory store
func (s *DebugSessionService) createDebugSessionInMemory(
	workflowId string,
	executionId string,
	initialVariables map[string]interface{},
	breakpoints []string,
) (*models.DebugSession, error) {
	s.logger.Info().Str("workflowId", workflowId).Msg("Creating debug session in memory (database unavailable)")
	
	if initialVariables == nil {
		initialVariables = make(map[string]interface{})
	}
	if breakpoints == nil {
		breakpoints = []string{}
	}

	session := &models.DebugSession{
		Id:            uuid.New().String(),
		WorkflowId:    workflowId,
		ExecutionId:   executionId,
		Status:        models.DebugStatusPending,
		CurrentNodeId: "",
		Variables:     initialVariables,
		Breakpoints:   breakpoints,
		CallStack:     []models.CallStackFrame{},
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if s.store == nil {
		return nil, fmt.Errorf("debug session store is nil")
	}
	
	s.store.SaveSession(session)
	s.logger.Info().Str("sessionId", session.Id).Str("workflowId", workflowId).Msg("Created debug session in memory")
	return session, nil
}

// updateDebugSessionInMemory updates a debug session in memory store
func (s *DebugSessionService) updateDebugSessionInMemory(
	sessionId string,
	status string,
	currentNodeId string,
	variables map[string]interface{},
	breakpoints []string,
	callStack []models.CallStackFrame,
) (*models.DebugSession, error) {
	session, err := s.store.GetSession(sessionId)
	if err != nil {
		return nil, err
	}

	session.Status = status
	session.CurrentNodeId = currentNodeId
	session.Variables = variables
	session.Breakpoints = breakpoints
	session.CallStack = callStack
	session.UpdatedAt = time.Now()

	s.store.SaveSession(session)
	return session, nil
}

