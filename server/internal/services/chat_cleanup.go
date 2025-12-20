package services

import (
	"context"
	"fmt"
	"time"

	"github.com/bpmn-explorer/server/pkg/database"
	"github.com/rs/zerolog"
)

// ChatCleanupService handles chat cleanup operations
type ChatCleanupService struct {
	db     *database.Database
	logger *zerolog.Logger
}

// NewChatCleanupService creates a new ChatCleanupService
func NewChatCleanupService(db *database.Database, logger *zerolog.Logger) *ChatCleanupService {
	return &ChatCleanupService{
		db:     db,
		logger: logger,
	}
}

// CleanupResult represents the result of a cleanup operation
type CleanupResult struct {
	DeletedConversations int
	DeletedMessages      int
	ExecutionTime        time.Duration
	Error                error
}

// CleanupExpiredConversations deletes conversations older than 7 days
func (s *ChatCleanupService) CleanupExpiredConversations(ctx context.Context) (*CleanupResult, error) {
	if s.db.DB == nil {
		return nil, fmt.Errorf("database not available")
	}

	startTime := time.Now()

	// Delete conversations older than 7 days
	// Messages will be cascade deleted due to ON DELETE CASCADE
	query := `
		DELETE FROM chat_conversations
		WHERE last_message_at < NOW() - INTERVAL '7 days'
		RETURNING id
	`

	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		s.logger.Error().Err(err).Msg("Failed to cleanup expired conversations")
		return nil, fmt.Errorf("failed to cleanup expired conversations: %w", err)
	}
	defer rows.Close()

	var deletedConversationIds []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			s.logger.Warn().Err(err).Msg("Failed to scan deleted conversation id")
			continue
		}
		deletedConversationIds = append(deletedConversationIds, id)
	}

	if err = rows.Err(); err != nil {
		s.logger.Error().Err(err).Msg("Failed to iterate deleted conversations")
		return nil, fmt.Errorf("failed to iterate deleted conversations: %w", err)
	}

	// Count deleted messages (approximate, since they're cascade deleted)
	// We can't get exact count easily, so we'll estimate based on conversations
	// In a real scenario, you might want to count before deletion or use a trigger
	deletedConversations := len(deletedConversationIds)
	executionTime := time.Since(startTime)

	result := &CleanupResult{
		DeletedConversations: deletedConversations,
		DeletedMessages:      0, // Messages are cascade deleted, exact count not available
		ExecutionTime:        executionTime,
	}

	s.logger.Info().
		Int("deletedConversations", deletedConversations).
		Dur("executionTime", executionTime).
		Msg("Cleanup completed")

	return result, nil
}

// StartPeriodicCleanup starts a goroutine that runs cleanup every 24 hours
func (s *ChatCleanupService) StartPeriodicCleanup(ctx context.Context) {
	ticker := time.NewTicker(24 * time.Hour)
	defer ticker.Stop()

	// Run cleanup immediately on start
	s.logger.Info().Msg("Starting initial chat cleanup")
	result, err := s.CleanupExpiredConversations(ctx)
	if err != nil {
		s.logger.Error().Err(err).Msg("Initial cleanup failed")
	} else {
		s.logger.Info().
			Int("deletedConversations", result.DeletedConversations).
			Dur("executionTime", result.ExecutionTime).
			Msg("Initial cleanup completed")
	}

	// Then run cleanup every 24 hours
	for {
		select {
		case <-ctx.Done():
			s.logger.Info().Msg("Stopping periodic chat cleanup")
			return
		case <-ticker.C:
			s.logger.Info().Msg("Running periodic chat cleanup")
			result, err := s.CleanupExpiredConversations(ctx)
			if err != nil {
				s.logger.Error().Err(err).Msg("Periodic cleanup failed")
			} else {
				s.logger.Info().
					Int("deletedConversations", result.DeletedConversations).
					Dur("executionTime", result.ExecutionTime).
					Msg("Periodic cleanup completed")
			}
		}
	}
}

