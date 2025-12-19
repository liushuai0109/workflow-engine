package routes

import (
	"github.com/bpmn-explorer/server/internal/handlers"
	"github.com/bpmn-explorer/server/internal/middleware"
	"github.com/bpmn-explorer/server/pkg/config"
	"github.com/bpmn-explorer/server/pkg/database"
	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
)

// SetupRouter sets up the Gin router with all routes
func SetupRouter(cfg *config.Config, db *database.Database, logger *zerolog.Logger) *gin.Engine {
	router := gin.New()

	// Recovery middleware
	router.Use(gin.Recovery())

	// Custom middlewares
	router.Use(middleware.CORSMiddleware(cfg.CORSOrigin))
	router.Use(middleware.LoggerMiddleware(logger))

	// Initialize handlers
	userHandler := handlers.NewUserHandler(db, logger)
	workflowHandler := handlers.NewWorkflowHandler(db, logger)
	claudeHandler := handlers.NewClaudeHandler(cfg.Claude, logger)

	// Health check
	router.GET("/health", handlers.HealthCheck(db))

	// API routes
	api := router.Group("/api")
	{
		// User routes
		users := api.Group("/users")
		{
			users.POST("", userHandler.CreateUser)
			users.GET("/:userId", userHandler.GetUser)
			users.PUT("/:userId", userHandler.UpdateUser)
		}

		// Workflow routes
		workflows := api.Group("/workflows")
		{
			workflows.POST("", workflowHandler.CreateWorkflow)
			workflows.GET("/:workflowId", workflowHandler.GetWorkflow)
			workflows.PUT("/:workflowId", workflowHandler.UpdateWorkflow)
			workflows.GET("", workflowHandler.ListWorkflows)
		}

		// Claude API proxy
		claude := api.Group("/claude/v1")
		{
			claude.POST("/messages", claudeHandler.ProxyMessages)
		}
	}

	return router
}
