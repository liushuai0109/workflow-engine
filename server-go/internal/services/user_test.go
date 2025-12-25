package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"testing"
	"time"

	"github.com/bpmn-explorer/server/internal/models"
	"github.com/bpmn-explorer/server/pkg/database"
	"github.com/DATA-DOG/go-sqlmock"
	"github.com/lib/pq"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupUserServiceTest(t *testing.T) (*UserService, sqlmock.Sqlmock, func()) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)

	logger := zerolog.Nop()
	database := database.NewDatabase(&logger)
	database.DB = db

	service := NewUserService(database, &logger)

	cleanup := func() {
		db.Close()
	}

	return service, mock, cleanup
}

func TestUserService_CreateUser_Success(t *testing.T) {
	service, mock, cleanup := setupUserServiceTest(t)
	defer cleanup()

	ctx := context.Background()
	email := "test@example.com"
	attributes := map[string]interface{}{
		"name": "Test User",
		"age":  30,
	}

	attributesJSON, _ := json.Marshal(attributes)
	now := time.Now()

	mock.ExpectQuery(`INSERT INTO users`).
		WithArgs(sqlmock.AnyArg(), email, string(attributesJSON), sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"id", "email", "attributes", "created_at", "updated_at"}).
			AddRow("test-id", email, attributesJSON, now, now))

	user, err := service.CreateUser(ctx, email, attributes)

	require.NoError(t, err)
	assert.NotNil(t, user)
	assert.Equal(t, email, user.Email)
	assert.Equal(t, attributes["name"], user.Attributes["name"])
	// JSON unmarshal converts numbers to float64
	assert.Equal(t, float64(30), user.Attributes["age"])

	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

func TestUserService_CreateUser_DuplicateEmail(t *testing.T) {
	service, mock, cleanup := setupUserServiceTest(t)
	defer cleanup()

	ctx := context.Background()
	email := "test@example.com"
	attributes := map[string]interface{}{}

	attributesJSON, _ := json.Marshal(attributes)

	pqErr := &pq.Error{
		Code:    "23505", // unique_violation
		Message: "duplicate key value violates unique constraint",
	}

	mock.ExpectQuery(`INSERT INTO users`).
		WithArgs(sqlmock.AnyArg(), email, string(attributesJSON), sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnError(pqErr)

	user, err := service.CreateUser(ctx, email, attributes)

	assert.Nil(t, user)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), models.ErrDuplicateEmail)

	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

func TestUserService_GetUserByID_Success(t *testing.T) {
	service, mock, cleanup := setupUserServiceTest(t)
	defer cleanup()

	ctx := context.Background()
	userID := "test-user-id"
	email := "test@example.com"
	attributes := map[string]interface{}{"name": "Test User"}
	attributesJSON, _ := json.Marshal(attributes)
	now := time.Now()

	mock.ExpectQuery(`SELECT id, email, attributes, created_at, updated_at`).
		WithArgs(userID).
		WillReturnRows(sqlmock.NewRows([]string{"id", "email", "attributes", "created_at", "updated_at"}).
			AddRow(userID, email, attributesJSON, now, now))

	user, err := service.GetUserByID(ctx, userID)

	require.NoError(t, err)
	assert.NotNil(t, user)
	assert.Equal(t, userID, user.Id)
	assert.Equal(t, email, user.Email)
	assert.Equal(t, attributes["name"], user.Attributes["name"])

	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

func TestUserService_GetUserByID_NotFound(t *testing.T) {
	service, mock, cleanup := setupUserServiceTest(t)
	defer cleanup()

	ctx := context.Background()
	userID := "nonexistent-id"

	mock.ExpectQuery(`SELECT id, email, attributes, created_at, updated_at`).
		WithArgs(userID).
		WillReturnError(sql.ErrNoRows)

	user, err := service.GetUserByID(ctx, userID)

	assert.Nil(t, user)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), models.ErrUserNotFound)

	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

func TestUserService_UpdateUserAttributes_Success(t *testing.T) {
	service, mock, cleanup := setupUserServiceTest(t)
	defer cleanup()

	ctx := context.Background()
	userID := "test-user-id"
	email := "test@example.com"
	newAttributes := map[string]interface{}{"newKey": "newValue"}
	attributesJSON, _ := json.Marshal(newAttributes)
	now := time.Now()

	mock.ExpectQuery(`UPDATE users`).
		WithArgs(string(attributesJSON), sqlmock.AnyArg(), userID).
		WillReturnRows(sqlmock.NewRows([]string{"id", "email", "attributes", "created_at", "updated_at"}).
			AddRow(userID, email, attributesJSON, now, now))

	user, err := service.UpdateUserAttributes(ctx, userID, newAttributes)

	require.NoError(t, err)
	assert.NotNil(t, user)
	assert.Equal(t, userID, user.Id)
	assert.Equal(t, newAttributes["newKey"], user.Attributes["newKey"])

	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

func TestUserService_UpdateUserAttributes_NotFound(t *testing.T) {
	service, mock, cleanup := setupUserServiceTest(t)
	defer cleanup()

	ctx := context.Background()
	userID := "nonexistent-id"
	newAttributes := map[string]interface{}{"key": "value"}
	attributesJSON, _ := json.Marshal(newAttributes)

	mock.ExpectQuery(`UPDATE users`).
		WithArgs(string(attributesJSON), sqlmock.AnyArg(), userID).
		WillReturnError(sql.ErrNoRows)

	user, err := service.UpdateUserAttributes(ctx, userID, newAttributes)

	assert.Nil(t, user)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), models.ErrUserNotFound)

	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

