package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds all configuration for the application
type Config struct {
	Port        int
	CORSOrigin  string
	Environment string
	Database    DatabaseConfig
	Claude      ClaudeConfig
}

// DatabaseConfig holds database configuration
type DatabaseConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	DBName   string
	Disabled bool
}

// ClaudeConfig holds Claude API configuration
type ClaudeConfig struct {
	BaseURL string
	APIKey  string
}

// LoadConfig loads configuration from environment variables
func LoadConfig() (*Config, error) {
	// Load .env file if it exists (ignore error if file doesn't exist)
	_ = godotenv.Load()

	cfg := &Config{
		Port:        getEnvAsInt("PORT", 3000),
		CORSOrigin:  getEnv("CORS_ORIGIN", "http://editor.workflow.com,http://editor.workflow.com:8000,http://localhost:8000"),
		Environment: getEnv("GO_ENV", "development"),
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnvAsInt("DB_PORT", 5432),
			User:     getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", ""),
			DBName:   getEnv("DB_NAME", "lifecycle_ops"),
			Disabled: getEnvAsBool("DB_DISABLED", false),
		},
		Claude: ClaudeConfig{
			BaseURL: getEnv("CLAUDE_API_BASE_URL", "https://api.jiekou.ai"),
			APIKey:  getEnv("CLAUDE_API_KEY", ""),
		},
	}

	return cfg, nil
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

func getEnvAsBool(key string, defaultValue bool) bool {
	valueStr := os.Getenv(key)
	if value, err := strconv.ParseBool(valueStr); err == nil {
		return value
	}
	return defaultValue
}
