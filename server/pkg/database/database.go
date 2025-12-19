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

	connStr := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
		cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.DBName,
	)

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
