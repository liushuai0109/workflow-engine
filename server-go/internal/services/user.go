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

// UserService handles user business logic
type UserService struct {
	db     *database.Database
	logger *zerolog.Logger
}

// NewUserService creates a new UserService
func NewUserService(db *database.Database, logger *zerolog.Logger) *UserService {
	return &UserService{
		db:     db,
		logger: logger,
	}
}

// CreateUser creates a new user
func (s *UserService) CreateUser(ctx context.Context, email string, attributes map[string]interface{}) (*models.UserProfile, error) {
	if s.db.DB == nil {
		return nil, fmt.Errorf("database not available")
	}

	// Generate UUID
	id := uuid.New().String()

	// Serialize attributes to JSON
	attributesJSON, err := json.Marshal(attributes)
	if err != nil {
		s.logger.Error().Err(err).Msg("Failed to marshal attributes")
		return nil, fmt.Errorf("failed to marshal attributes: %w", err)
	}

	// Insert into database
	query := `
		INSERT INTO users (id, email, attributes, created_at, updated_at)
		VALUES ($1, $2, $3::jsonb, $4, $5)
		RETURNING id, email, attributes, created_at, updated_at
	`

	now := time.Now()
	var user models.UserProfile
	var attributesBytes []byte

	err = s.db.QueryRowContext(ctx, query, id, email, string(attributesJSON), now, now).Scan(
		&user.Id,
		&user.Email,
		&attributesBytes,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok {
			switch pqErr.Code {
			case "23505": // unique_violation
				s.logger.Warn().Str("email", email).Msg("Duplicate email")
				return nil, fmt.Errorf("%s: %s", models.ErrDuplicateEmail, "email already exists")
			case "23503": // foreign_key_violation
				s.logger.Error().Err(err).Msg("Foreign key violation")
				return nil, fmt.Errorf("%s: %s", models.ErrForeignKeyViolation, pqErr.Message)
			}
		}
		s.logger.Error().Err(err).Msg("Failed to create user")
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Unmarshal attributes
	if len(attributesBytes) > 0 {
		if err := json.Unmarshal(attributesBytes, &user.Attributes); err != nil {
			s.logger.Error().Err(err).Msg("Failed to unmarshal attributes")
			return nil, fmt.Errorf("failed to unmarshal attributes: %w", err)
		}
	} else {
		user.Attributes = make(map[string]interface{})
	}

	s.logger.Info().Str("userId", user.Id).Str("email", email).Msg("User created")
	return &user, nil
}

// GetUserByID retrieves a user by ID
func (s *UserService) GetUserByID(ctx context.Context, userID string) (*models.UserProfile, error) {
	if s.db.DB == nil {
		return nil, fmt.Errorf("database not available")
	}

	query := `
		SELECT id, email, attributes, created_at, updated_at
		FROM users
		WHERE id = $1
	`

	var user models.UserProfile
	var attributesBytes []byte

	err := s.db.QueryRowContext(ctx, query, userID).Scan(
		&user.Id,
		&user.Email,
		&attributesBytes,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			s.logger.Warn().Str("userId", userID).Msg("User not found")
			return nil, fmt.Errorf("%s: %s", models.ErrUserNotFound, "user not found")
		}
		s.logger.Error().Err(err).Str("userId", userID).Msg("Failed to get user")
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Unmarshal attributes
	if len(attributesBytes) > 0 {
		if err := json.Unmarshal(attributesBytes, &user.Attributes); err != nil {
			s.logger.Error().Err(err).Msg("Failed to unmarshal attributes")
			return nil, fmt.Errorf("failed to unmarshal attributes: %w", err)
		}
	} else {
		user.Attributes = make(map[string]interface{})
	}

	return &user, nil
}

// UpdateUserAttributes updates user attributes
func (s *UserService) UpdateUserAttributes(ctx context.Context, userID string, attributes map[string]interface{}) (*models.UserProfile, error) {
	if s.db.DB == nil {
		return nil, fmt.Errorf("database not available")
	}

	// Serialize new attributes to JSON
	attributesJSON, err := json.Marshal(attributes)
	if err != nil {
		s.logger.Error().Err(err).Msg("Failed to marshal attributes")
		return nil, fmt.Errorf("failed to marshal attributes: %w", err)
	}

	// Update using JSONB merge operator
	query := `
		UPDATE users
		SET attributes = attributes || $1::jsonb,
		    updated_at = $2
		WHERE id = $3
		RETURNING id, email, attributes, created_at, updated_at
	`

	now := time.Now()
	var user models.UserProfile
	var attributesBytes []byte

	err = s.db.QueryRowContext(ctx, query, string(attributesJSON), now, userID).Scan(
		&user.Id,
		&user.Email,
		&attributesBytes,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			s.logger.Warn().Str("userId", userID).Msg("User not found")
			return nil, fmt.Errorf("%s: %s", models.ErrUserNotFound, "user not found")
		}
		s.logger.Error().Err(err).Str("userId", userID).Msg("Failed to update user")
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	// Unmarshal attributes
	if len(attributesBytes) > 0 {
		if err := json.Unmarshal(attributesBytes, &user.Attributes); err != nil {
			s.logger.Error().Err(err).Msg("Failed to unmarshal attributes")
			return nil, fmt.Errorf("failed to unmarshal attributes: %w", err)
		}
	} else {
		user.Attributes = make(map[string]interface{})
	}

	s.logger.Info().Str("userId", userID).Msg("User attributes updated")
	return &user, nil
}
