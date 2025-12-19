package models

// APIResponse represents a standard API response
type APIResponse struct {
	Success  bool        `json:"success"`
	Data     interface{} `json:"data,omitempty"`
	Error    *APIError   `json:"error,omitempty"`
	Metadata *Metadata   `json:"metadata,omitempty"`
}

// APIError represents an API error
type APIError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// Metadata represents response metadata for pagination
type Metadata struct {
	Page     int  `json:"page,omitempty"`
	PageSize int  `json:"pageSize,omitempty"`
	Total    int  `json:"total,omitempty"`
	HasMore  bool `json:"hasMore,omitempty"`
}

// Error codes
const (
	ErrMissingEmail     = "MISSING_EMAIL"
	ErrUserNotFound     = "USER_NOT_FOUND"
	ErrWorkflowNotFound = "WORKFLOW_NOT_FOUND"
	ErrInvalidRequest   = "INVALID_REQUEST"
	ErrInternalError    = "INTERNAL_ERROR"
	ErrDatabaseError    = "DATABASE_ERROR"
)

// NewSuccessResponse creates a success response
func NewSuccessResponse(data interface{}) APIResponse {
	return APIResponse{
		Success: true,
		Data:    data,
	}
}

// NewErrorResponse creates an error response
func NewErrorResponse(code, message string) APIResponse {
	return APIResponse{
		Success: false,
		Error: &APIError{
			Code:    code,
			Message: message,
		},
	}
}
