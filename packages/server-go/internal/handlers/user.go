package handlers

import (
	"net/http"

	"github.com/bpmn-explorer/server-go/internal/models"
	"github.com/bpmn-explorer/server-go/internal/services"
	"github.com/bpmn-explorer/server-go/pkg/database"
	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
)

// UserHandler handles user-related requests
type UserHandler struct {
	service *services.UserService
	logger  *zerolog.Logger
}

// NewUserHandler creates a new UserHandler
func NewUserHandler(db *database.Database, logger *zerolog.Logger) *UserHandler {
	return &UserHandler{
		service: services.NewUserService(db, logger),
		logger:  logger,
	}
}

// CreateUser creates a new user
func (h *UserHandler) CreateUser(c *gin.Context) {
	var req struct {
		Email      string                 `json:"email" binding:"required"`
		Attributes map[string]interface{} `json:"attributes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"Invalid request body",
		))
		return
	}

	if req.Email == "" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrMissingEmail,
			"Email is required",
		))
		return
	}

	user, err := h.service.CreateUser(c.Request.Context(), req.Email, req.Attributes)
	if err != nil {
		h.logger.Error().Err(err).Msg("Failed to create user")
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrInternalError,
			"Failed to create user",
		))
		return
	}

	c.JSON(http.StatusCreated, models.NewSuccessResponse(user))
}

// GetUser retrieves a user by ID
func (h *UserHandler) GetUser(c *gin.Context) {
	userID := c.Param("userId")

	user, err := h.service.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		h.logger.Error().Err(err).Str("userId", userID).Msg("Failed to get user")
		c.JSON(http.StatusNotFound, models.NewErrorResponse(
			models.ErrUserNotFound,
			"User not found",
		))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(user))
}

// UpdateUser updates user attributes
func (h *UserHandler) UpdateUser(c *gin.Context) {
	userID := c.Param("userId")

	var req struct {
		Attributes map[string]interface{} `json:"attributes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrInvalidRequest,
			"Invalid request body",
		))
		return
	}

	user, err := h.service.UpdateUserAttributes(c.Request.Context(), userID, req.Attributes)
	if err != nil {
		h.logger.Error().Err(err).Str("userId", userID).Msg("Failed to update user")
		c.JSON(http.StatusNotFound, models.NewErrorResponse(
			models.ErrUserNotFound,
			"User not found",
		))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(user))
}
