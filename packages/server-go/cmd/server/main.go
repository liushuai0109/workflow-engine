package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/bpmn-explorer/server-go/internal/routes"
	"github.com/bpmn-explorer/server-go/pkg/config"
	"github.com/bpmn-explorer/server-go/pkg/database"
	"github.com/bpmn-explorer/server-go/pkg/logger"
	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		fmt.Printf("Failed to load configuration: %v\n", err)
		os.Exit(1)
	}

	// Initialize logger
	log := logger.NewLogger(cfg.Environment)

	// Initialize database
	db := database.NewDatabase(log)
	if err := db.Connect(cfg.Database); err != nil {
		log.Warn().Err(err).Msg("Database connection failed, running without database")
	}
	defer db.Disconnect()

	// Setup Gin mode
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Create router
	router := routes.SetupRouter(cfg, db, log)

	// Create server
	srv := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.Port),
		Handler: router,
	}

	// Start server in a goroutine
	go func() {
		log.Info().
			Int("port", cfg.Port).
			Str("environment", cfg.Environment).
			Str("corsOrigin", cfg.CORSOrigin).
			Msg("🚀 Server starting")

		if db.IsAvailable() {
			log.Info().Msg("✅ Database: connected")
		} else {
			log.Warn().Msg("⚠️  Database: unavailable (server running without database)")
		}

		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("Failed to start server")
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("Shutting down server...")

	// Graceful shutdown with 5 second timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal().Err(err).Msg("Server forced to shutdown")
	}

	log.Info().Msg("Server exited")
}
