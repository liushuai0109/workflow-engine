package services

import (
	"context"
	"testing"

	"github.com/bpmn-explorer/server/internal/models"
	"github.com/bpmn-explorer/server/pkg/database"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupDebugSessionServiceTest(t *testing.T) *DebugSessionService {
	logger := zerolog.Nop()
	db := database.NewDatabase(&logger)
	return NewDebugSessionService(db, &logger)
}

func TestDebugSessionService_CreateDebugSession(t *testing.T) {
	service := setupDebugSessionServiceTest(t)
	ctx := context.Background()

	t.Run("create session with in-memory store", func(t *testing.T) {
		session, err := service.CreateDebugSession(ctx, "Process_1", "", nil, nil)

		require.NoError(t, err)
		assert.NotNil(t, session)
		assert.Equal(t, "Process_1", session.WorkflowId)
		assert.Equal(t, models.DebugStatusPending, session.Status)
		assert.NotEmpty(t, session.Id)
	})

	t.Run("create session with initial variables", func(t *testing.T) {
		initialVars := map[string]interface{}{
			"testVar": "testValue",
		}
		session, err := service.CreateDebugSession(ctx, "Process_1", "", initialVars, nil)

		require.NoError(t, err)
		assert.Equal(t, "testValue", session.Variables["testVar"])
	})

	t.Run("create session with breakpoints", func(t *testing.T) {
		breakpoints := []string{"Node_1", "Node_2"}
		session, err := service.CreateDebugSession(ctx, "Process_1", "", nil, breakpoints)

		require.NoError(t, err)
		assert.Equal(t, breakpoints, session.Breakpoints)
	})
}

func TestDebugSessionService_GetDebugSessionByID(t *testing.T) {
	service := setupDebugSessionServiceTest(t)
	ctx := context.Background()

	t.Run("get existing session", func(t *testing.T) {
		created, err := service.CreateDebugSession(ctx, "Process_1", "", nil, nil)
		require.NoError(t, err)

		retrieved, err := service.GetDebugSessionByID(ctx, created.Id)
		require.NoError(t, err)
		assert.Equal(t, created.Id, retrieved.Id)
		assert.Equal(t, created.WorkflowId, retrieved.WorkflowId)
	})

	t.Run("get non-existent session", func(t *testing.T) {
		_, err := service.GetDebugSessionByID(ctx, "non-existent-id")
		assert.Error(t, err)
	})
}

func TestDebugSessionService_UpdateDebugSession(t *testing.T) {
	service := setupDebugSessionServiceTest(t)
	ctx := context.Background()

	t.Run("update session status", func(t *testing.T) {
		session, err := service.CreateDebugSession(ctx, "Process_1", "", nil, nil)
		require.NoError(t, err)

		updated, err := service.UpdateDebugSession(
			ctx,
			session.Id,
			models.DebugStatusRunning,
			"Node_1",
			map[string]interface{}{"var1": "value1"},
			[]string{"Node_1"},
			[]models.CallStackFrame{},
		)

		require.NoError(t, err)
		assert.Equal(t, models.DebugStatusRunning, updated.Status)
		assert.Equal(t, "Node_1", updated.CurrentNodeId)
		assert.Equal(t, "value1", updated.Variables["var1"])
	})
}

func TestDebugSessionService_AddBreakpoint(t *testing.T) {
	service := setupDebugSessionServiceTest(t)
	ctx := context.Background()

	t.Run("add breakpoint", func(t *testing.T) {
		session, err := service.CreateDebugSession(ctx, "Process_1", "", nil, nil)
		require.NoError(t, err)

		err = service.AddBreakpoint(ctx, session.Id, "Node_1")
		require.NoError(t, err)

		updated, err := service.GetDebugSessionByID(ctx, session.Id)
		require.NoError(t, err)
		assert.Contains(t, updated.Breakpoints, "Node_1")
	})
}

func TestDebugSessionService_RemoveBreakpoint(t *testing.T) {
	service := setupDebugSessionServiceTest(t)
	ctx := context.Background()

	t.Run("remove breakpoint", func(t *testing.T) {
		session, err := service.CreateDebugSession(ctx, "Process_1", "", nil, []string{"Node_1", "Node_2"})
		require.NoError(t, err)

		err = service.RemoveBreakpoint(ctx, session.Id, "Node_1")
		require.NoError(t, err)

		updated, err := service.GetDebugSessionByID(ctx, session.Id)
		require.NoError(t, err)
		assert.NotContains(t, updated.Breakpoints, "Node_1")
		assert.Contains(t, updated.Breakpoints, "Node_2")
	})
}

