package middleware

import (
	"github.com/gin-gonic/gin"
)

// CORSMiddleware adds CORS headers to responses
// allowedOrigin can be a comma-separated list of origins
func CORSMiddleware(allowedOrigin string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 完全开放的 CORS 配置
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "*")
		c.Writer.Header().Set("Access-Control-Expose-Headers", "*")

		// Handle preflight request
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
