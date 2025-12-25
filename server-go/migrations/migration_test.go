//go:build integration
// +build integration

package migrations

import (
	"context"
	"os"
	"strconv"
	"testing"

	"github.com/bpmn-explorer/server/pkg/config"
	"github.com/bpmn-explorer/server/pkg/database"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestChatTablesMigration(t *testing.T) {
	if os.Getenv("INTEGRATION_TEST") != "true" {
		t.Skip("Skipping integration test. Set INTEGRATION_TEST=true to run.")
	}

	// Setup test database
	cfg := config.DatabaseConfig{
		Host:     getEnv("TEST_DB_HOST", "localhost"),
		Port:     getEnvAsInt("TEST_DB_PORT", 5432),
		User:     getEnv("TEST_DB_USER", "postgres"),
		Password: getEnv("TEST_DB_PASSWORD", "postgres"),
		DBName:   getEnv("TEST_DB_NAME", "bpmn_explorer_test"),
		Disabled: false,
	}

	logger := zerolog.New(os.Stderr).With().Timestamp().Logger()
	db := database.NewDatabase(&logger)
	err := db.Connect(cfg)
	require.NoError(t, err, "Failed to connect to test database")
	defer db.Disconnect()

	ctx := context.Background()

	// Test: Run down migration first to ensure clean state
	t.Run("Down migration", func(t *testing.T) {
		downSQL, err := os.ReadFile("000003_add_chat_tables.down.sql")
		require.NoError(t, err, "Failed to read down migration file")

		_, err = db.ExecContext(ctx, string(downSQL))
		// Ignore errors if tables don't exist
		if err != nil {
			t.Logf("Down migration warning (expected if tables don't exist): %v", err)
		}
	})

	// Test: Run up migration
	t.Run("Up migration", func(t *testing.T) {
		upSQL, err := os.ReadFile("000003_add_chat_tables.up.sql")
		require.NoError(t, err, "Failed to read up migration file")

		_, err = db.ExecContext(ctx, string(upSQL))
		require.NoError(t, err, "Failed to execute up migration")

		// Verify tables exist
		var tableExists bool
		err = db.QueryRowContext(ctx, `
			SELECT EXISTS (
				SELECT FROM information_schema.tables 
				WHERE table_schema = 'public' 
				AND table_name = 'chat_conversations'
			)
		`).Scan(&tableExists)
		require.NoError(t, err)
		assert.True(t, tableExists, "chat_conversations table should exist")

		err = db.QueryRowContext(ctx, `
			SELECT EXISTS (
				SELECT FROM information_schema.tables 
				WHERE table_schema = 'public' 
				AND table_name = 'chat_messages'
			)
		`).Scan(&tableExists)
		require.NoError(t, err)
		assert.True(t, tableExists, "chat_messages table should exist")
	})

	// Test: Verify indexes exist
	t.Run("Indexes verification", func(t *testing.T) {
		indexes := []string{
			"idx_conversations_updated_at",
			"idx_conversations_last_message_at",
			"idx_messages_conversation",
			"idx_messages_created_at",
		}

		for _, indexName := range indexes {
			var indexExists bool
			err := db.QueryRowContext(ctx, `
				SELECT EXISTS (
					SELECT FROM pg_indexes 
					WHERE schemaname = 'public' 
					AND indexname = $1
				)
			`, indexName).Scan(&indexExists)
			require.NoError(t, err, "Failed to check index: %s", indexName)
			assert.True(t, indexExists, "Index %s should exist", indexName)
		}
	})

	// Test: Verify table structure
	t.Run("Table structure verification", func(t *testing.T) {
		// Check chat_conversations columns
		var columnCount int
		err := db.QueryRowContext(ctx, `
			SELECT COUNT(*) 
			FROM information_schema.columns 
			WHERE table_schema = 'public' 
			AND table_name = 'chat_conversations'
		`).Scan(&columnCount)
		require.NoError(t, err)
		assert.Equal(t, 5, columnCount, "chat_conversations should have 5 columns")

		// Check chat_messages columns
		err = db.QueryRowContext(ctx, `
			SELECT COUNT(*) 
			FROM information_schema.columns 
			WHERE table_schema = 'public' 
			AND table_name = 'chat_messages'
		`).Scan(&columnCount)
		require.NoError(t, err)
		assert.Equal(t, 7, columnCount, "chat_messages should have 7 columns")
	})

	// Test: Verify foreign key constraint
	t.Run("Foreign key constraint", func(t *testing.T) {
		var fkExists bool
		err := db.QueryRowContext(ctx, `
			SELECT EXISTS (
				SELECT FROM information_schema.table_constraints 
				WHERE constraint_type = 'FOREIGN KEY' 
				AND table_name = 'chat_messages'
				AND constraint_name LIKE '%conversation_id%'
			)
		`).Scan(&fkExists)
		require.NoError(t, err)
		assert.True(t, fkExists, "Foreign key constraint should exist")
	})

	// Test: Run down migration to verify rollback
	t.Run("Down migration rollback", func(t *testing.T) {
		downSQL, err := os.ReadFile("000003_add_chat_tables.down.sql")
		require.NoError(t, err, "Failed to read down migration file")

		_, err = db.ExecContext(ctx, string(downSQL))
		require.NoError(t, err, "Failed to execute down migration")

		// Verify tables are dropped
		var tableExists bool
		err = db.QueryRowContext(ctx, `
			SELECT EXISTS (
				SELECT FROM information_schema.tables 
				WHERE table_schema = 'public' 
				AND table_name = 'chat_conversations'
			)
		`).Scan(&tableExists)
		require.NoError(t, err)
		assert.False(t, tableExists, "chat_conversations table should be dropped")

		err = db.QueryRowContext(ctx, `
			SELECT EXISTS (
				SELECT FROM information_schema.tables 
				WHERE table_schema = 'public' 
				AND table_name = 'chat_messages'
			)
		`).Scan(&tableExists)
		require.NoError(t, err)
		assert.False(t, tableExists, "chat_messages table should be dropped")
	})
}

// Helper functions
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	valueStr := os.Getenv(key)
	if value, err := strconv.Atoi(valueStr); err == nil {
		return value
	}
	return defaultValue
}

