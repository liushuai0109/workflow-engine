package handlers

import (
	"net/http"
	"time"

	"github.com/bpmn-explorer/server-go/pkg/database"
	"github.com/gin-gonic/gin"
)

// HealthCheck returns the health status of the server
func HealthCheck(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		status := "ok"
		dbStatus := "unavailable"

		if db.IsAvailable() {
			dbStatus = "connected"
		}

		c.JSON(http.StatusOK, gin.H{
			"status":    status,
			"timestamp": time.Now().Format(time.RFC3339),
			"database":  dbStatus,
		})
	}
}
