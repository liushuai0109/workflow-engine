package middleware

import (
	"encoding/json"
	"net/http"
	"net/url"

	"github.com/bpmn-explorer/server/internal/interceptor"

	"github.com/gin-gonic/gin"
)

// InterceptorMiddleware handles interceptor HTTP headers and configures context
func InterceptorMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. Check if in dry-run mode
		isDryRun := c.GetHeader("X-Intercept-Dry-Run") == "true"

		// 2. Parse interceptor config from header
		configHeader := c.GetHeader("X-Intercept-Config")
		var config *interceptor.InterceptConfig

		if configHeader != "" {
			// URL decode and parse JSON
			decoded, err := url.QueryUnescape(configHeader)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"error": "Failed to decode X-Intercept-Config header",
				})
				c.Abort()
				return
			}

			var configMap map[string]string
			if err := json.Unmarshal([]byte(decoded), &configMap); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"error": "Failed to parse X-Intercept-Config JSON",
				})
				c.Abort()
				return
			}

			config = interceptor.NewInterceptConfig(configMap)
		}

		// 3. Create default config if not provided
		if config == nil {
			config = interceptor.NewInterceptConfig(nil) // Empty config, use default record mode
		}

		// 4. Set dry-run flag and config to context
		ctx := c.Request.Context()
		if isDryRun {
			ctx = interceptor.WithDryRunMode(ctx)
			// Create interceptor collector for dry-run mode
			collector := interceptor.NewInterceptorCollector()
			ctx = interceptor.WithInterceptorCollector(ctx, collector)
		}
		ctx = interceptor.WithInterceptConfig(ctx, config)
		c.Request = c.Request.WithContext(ctx)

		c.Next()

		// 5. Dry-run mode: return interceptor list
		if isDryRun {
			collector := interceptor.GetInterceptorCollector(ctx)
			if collector != nil {
				c.JSON(http.StatusOK, gin.H{
					"isDryRun":     true,
					"interceptors": collector.GetList(),
				})
				c.Abort()
				return
			}
		}
	}
}
