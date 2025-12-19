package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
)

// LoggerMiddleware logs HTTP requests
func LoggerMiddleware(logger *zerolog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		// Process request
		c.Next()

		// Calculate latency
		latency := time.Since(start)

		// Build log entry
		logEvent := logger.Info().
			Str("method", c.Request.Method).
			Str("path", path).
			Int("status", c.Writer.Status()).
			Dur("latency", latency).
			Str("ip", c.ClientIP())

		if raw != "" {
			logEvent = logEvent.Str("query", raw)
		}

		if len(c.Errors) > 0 {
			logEvent = logEvent.Str("error", c.Errors.String())
		}

		logEvent.Msg("request completed")
	}
}
