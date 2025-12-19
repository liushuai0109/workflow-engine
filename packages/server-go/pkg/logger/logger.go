package logger

import (
	"os"
	"time"

	"github.com/rs/zerolog"
)

// NewLogger creates a new zerolog logger
func NewLogger(environment string) *zerolog.Logger {
	// Pretty logging for development
	if environment == "development" {
		logger := zerolog.New(zerolog.ConsoleWriter{
			Out:        os.Stdout,
			TimeFormat: time.RFC3339,
		}).With().Timestamp().Logger()
		return &logger
	}

	// JSON logging for production
	logger := zerolog.New(os.Stdout).With().Timestamp().Logger()
	return &logger
}
