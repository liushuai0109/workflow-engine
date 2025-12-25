package database

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	_ "github.com/lib/pq"
	"github.com/bpmn-explorer/server/pkg/config"
	"github.com/rs/zerolog"
)

// Database wraps sql.DB with additional methods
type Database struct {
	*sql.DB
	available bool
	logger    *zerolog.Logger
}

// NewDatabase creates a new Database instance
func NewDatabase(logger *zerolog.Logger) *Database {
	return &Database{
		logger:    logger,
		available: false,
	}
}

// Connect establishes a database connection
func (db *Database) Connect(cfg config.DatabaseConfig) error {
	if cfg.Disabled {
		db.logger.Info().Msg("Database is disabled (DB_DISABLED=true)")
		return nil
	}

	// Log connection parameters (without password)
	db.logger.Info().
		Str("host", cfg.Host).
		Int("port", cfg.Port).
		Str("user", cfg.User).
		Str("dbname", cfg.DBName).
		Msg("Connecting to database")

	// Build connection string, handling empty password
	var connStr string
	if cfg.Password == "" {
		connStr = fmt.Sprintf(
			"host=%s port=%d user=%s dbname=%s sslmode=disable search_path=public",
			cfg.Host, cfg.Port, cfg.User, cfg.DBName,
		)
	} else {
		connStr = fmt.Sprintf(
			"host=%s port=%d user=%s password=%s dbname=%s sslmode=disable search_path=public",
			cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.DBName,
		)
	}

	sqlDB, err := sql.Open("postgres", connStr)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}

	// Set connection pool settings
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := sqlDB.PingContext(ctx); err != nil {
		sqlDB.Close()
		return fmt.Errorf("failed to ping database: %w", err)
	}

	// Set search_path to ensure we use the public schema
	if _, err := sqlDB.Exec("SET search_path TO public"); err != nil {
		sqlDB.Close()
		return fmt.Errorf("failed to set search_path: %w", err)
	}

	// Test query to verify table exists
	var dbName, schemaName string
	if err := sqlDB.QueryRow("SELECT current_database(), current_schema()").Scan(&dbName, &schemaName); err != nil {
		sqlDB.Close()
		return fmt.Errorf("failed to query database info: %w", err)
	}
	db.logger.Info().Str("database", dbName).Str("schema", schemaName).Msg("Connected to database")

	// Verify chat_conversations table exists
	var tableExists bool
	if err := sqlDB.QueryRow("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_conversations')").Scan(&tableExists); err != nil {
		sqlDB.Close()
		return fmt.Errorf("failed to check table existence: %w", err)
	}
	if !tableExists {
		db.logger.Warn().Msg("chat_conversations table not found in public schema")
	} else {
		db.logger.Info().Msg("✅ chat_conversations table found")
	}

	db.DB = sqlDB
	db.available = true
	return nil
}

// Disconnect closes the database connection
func (db *Database) Disconnect() error {
	if db.DB != nil {
		return db.DB.Close()
	}
	return nil
}

// IsAvailable returns whether the database is available
func (db *Database) IsAvailable() bool {
	return db.available
}

// QueryOne executes a query that returns a single row
func (db *Database) QueryOne(ctx context.Context, query string, args ...interface{}) *sql.Row {
	if !db.available {
		return nil
	}
	return db.QueryRowContext(ctx, query, args...)
}

// QueryRowContext executes a query that returns a single row
func (db *Database) QueryRowContext(ctx context.Context, query string, args ...interface{}) *sql.Row {
	if db.DB == nil {
		return nil
	}
	return db.DB.QueryRowContext(ctx, query, args...)
}
