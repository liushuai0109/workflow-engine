package routes

import (
	"github.com/bpmn-explorer/server/internal/handlers"
	"github.com/bpmn-explorer/server/internal/interceptor"
	"github.com/bpmn-explorer/server/internal/middleware"
	"github.com/bpmn-explorer/server/internal/services"
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

	// Initialize services
	workflowSvc := services.NewWorkflowService(db, logger)
	instanceSvc := services.NewWorkflowInstanceService(db, logger)
	executionSvc := services.NewWorkflowExecutionService(db, logger)
	mockInstanceSvc := services.NewMockInstanceService(db, logger, workflowSvc)
	engineService := services.NewWorkflowEngineServiceWithMockInstance(db, logger, workflowSvc, instanceSvc, executionSvc, mockInstanceSvc)

	// Initialize session store for interceptor
	sessionStore := interceptor.NewMemorySessionStore()

	// Initialize handlers
	userHandler := handlers.NewUserHandler(db, logger)
	workflowHandler := handlers.NewWorkflowHandler(db, logger)
	claudeHandler := handlers.NewClaudeHandler(cfg.Claude, logger)
	executorHandler := handlers.NewWorkflowExecutorHandler(db, logger, workflowSvc, instanceSvc, executionSvc)
	mockHandler := handlers.NewMockHandler(db, logger, workflowSvc, instanceSvc, executionSvc)
	mockConfigHandler := handlers.NewMockConfigHandler(db, logger)
	debugHandler := handlers.NewDebugHandler(db, logger)
	executionHistoryHandler := handlers.NewExecutionHistoryHandler(db, logger)
	chatHandler := handlers.NewChatConversationHandler(db, logger)
	interceptorHandler := handlers.NewInterceptorHandler(engineService, mockInstanceSvc, workflowSvc, sessionStore, logger)

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

		// Workflow execution
		api.POST("/execute/:workflowInstanceId", executorHandler.ExecuteWorkflow)

		// Mock execution
		mock := api.Group("/workflows/:workflowId/mock")
		{
			mock.POST("/execute", mockHandler.ExecuteMock)
		}

		// Mock instance management (new instance-based API)
		api.GET("/workflows/mock/instances/:instanceId", mockHandler.GetMockInstance)
		api.POST("/workflows/mock/instances", mockHandler.CreateMockInstance)
		api.PUT("/workflows/mock/instances/:instanceId", mockHandler.UpdateMockInstance)
		api.GET("/workflows/mock/instances", mockHandler.ListMockInstances)
		api.POST("/workflows/mock/instances/:instanceId/step", mockHandler.StepMockExecution)

		// Legacy Mock execution operations (for backwards compatibility)
		api.GET("/workflows/mock/executions/:executionId", mockHandler.GetMockExecution)
		api.POST("/workflows/mock/executions/:executionId/continue", mockHandler.ContinueMockExecution)
		api.POST("/workflows/mock/executions/:executionId/stop", mockHandler.StopMockExecution)

		// Mock configuration
		mockConfig := api.Group("/workflows/:workflowId/mock/configs")
		{
			mockConfig.POST("", mockConfigHandler.CreateMockConfig)
			mockConfig.GET("", mockConfigHandler.GetMockConfigs)
		}
		api.GET("/workflows/mock/configs/:configId", mockConfigHandler.GetMockConfig)
		api.PUT("/workflows/mock/configs/:configId", mockConfigHandler.UpdateMockConfig)
		api.DELETE("/workflows/mock/configs/:configId", mockConfigHandler.DeleteMockConfig)

		// Debug sessions
		debug := api.Group("/workflows/:workflowId/debug")
		{
			debug.POST("/start", debugHandler.StartDebug)
		}
		api.GET("/workflows/debug/sessions/:sessionId", debugHandler.GetDebugSession)
		api.POST("/workflows/debug/sessions/:sessionId/step", debugHandler.StepDebug)
		api.POST("/workflows/debug/sessions/:sessionId/continue", debugHandler.ContinueDebug)
		api.GET("/workflows/debug/sessions/:sessionId/variables", debugHandler.GetDebugVariables)
		api.GET("/workflows/debug/sessions/:sessionId/nodes/:nodeId", debugHandler.GetDebugNode)
		api.POST("/workflows/debug/sessions/:sessionId/breakpoints", debugHandler.SetBreakpoints)
		api.POST("/workflows/debug/sessions/:sessionId/stop", debugHandler.StopDebug)

		// Execution history
		api.GET("/executions/:executionId/histories", executionHistoryHandler.GetExecutionHistories)

		// Chat conversations
		chat := api.Group("/chat/conversations")
		{
			chat.POST("", chatHandler.CreateConversation)
			chat.GET("", chatHandler.GetConversations)
			chat.GET("/:id", chatHandler.GetConversation)
			chat.PUT("/:id", chatHandler.UpdateConversation)
			chat.DELETE("/:id", chatHandler.DeleteConversation)
			chat.POST("/:id/messages", chatHandler.AddMessage)
			chat.POST("/:id/messages/batch", chatHandler.BatchAddMessages)
		}

		// Interceptor routes
		interceptorGroup := api.Group("/interceptor")
		{
			// Initialize interceptor execution
			interceptorGroup.POST("/workflows/:workflowId/execute", interceptorHandler.ExecuteIntercept)

			// Trigger node execution (for stopping points)
			interceptorGroup.POST("/instances/:instanceId/trigger", interceptorHandler.TriggerNode)

			// Session management
			interceptorGroup.GET("/sessions/:sessionId", interceptorHandler.GetInterceptSession)
			interceptorGroup.GET("/sessions/:sessionId/log", interceptorHandler.GetExecutionLog)
			interceptorGroup.POST("/sessions/:sessionId/reset", interceptorHandler.ResetIntercept)
		}
	}

	return router
}
