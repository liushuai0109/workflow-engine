.PHONY: build run test clean install

# 检测并设置 Go 路径
GO := $(shell which go 2>/dev/null || echo /data/mm64/simonsliu/go/bin/go)
ifeq ($(wildcard $(GO)),)
    $(error Go not found. Please install Go or set PATH to include Go binary)
endif

# Build the server
build:
	$(GO) build -o bin/server cmd/server/main.go

# Run the server
run:
	$(GO) run cmd/server/main.go

# Run tests
test:
	$(GO) test -v ./...

# Run tests with coverage and generate reports
test-coverage: ensure-reports-dir
	@echo "Running tests with coverage..."
	@$(GO) test -v -coverprofile=reports/coverage/coverage.out ./...
	@$(GO) tool cover -func=reports/coverage/coverage.out > reports/coverage/coverage.txt
	@$(GO) tool cover -html=reports/coverage/coverage.out -o reports/coverage/coverage.html
	@echo ""
	@echo "=========================================="
	@echo "Coverage Report (by file):"
	@echo "=========================================="
	@$(GO) tool cover -func=reports/coverage/coverage.out
	@echo ""
	@echo "Reports generated in reports/coverage/:"
	@echo "  - coverage.out (raw data)"
	@echo "  - coverage.txt (text report with full details)"
	@echo "  - coverage.html (HTML report)"

# Run tests using test script
test-script:
	@bash scripts/test.sh

# Run integration tests (requires INTEGRATION_TEST=true and test database)
test-integration:
	@if [ "$$INTEGRATION_TEST" != "true" ]; then \
		echo "Skipping integration tests. Set INTEGRATION_TEST=true to run."; \
		exit 0; \
	fi
	@echo "Running integration tests..."
	@$(GO) test -tags=integration -v ./internal/services/... -run TestIntegration

# Ensure reports directory exists
ensure-reports-dir:
	@mkdir -p reports/coverage

# Install dependencies
install:
	$(GO) mod download
	$(GO) mod tidy

# Clean build artifacts and reports
clean:
	rm -rf bin/
	rm -rf reports/
	rm -f coverage.out coverage.html

# Run with hot reload (requires air: go install github.com/cosmtrek/air@latest)
dev:
	air

# Format code
fmt:
	$(GO) fmt ./...

# Run linter (requires golangci-lint)
lint:
	golangci-lint run

# Build for production
build-prod:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 $(GO) build -ldflags="-w -s" -o bin/server cmd/server/main.go

# Database migration commands
# Install migrate tool: go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
MIGRATE := $(shell which migrate 2>/dev/null || echo $(GO) run -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate)

# Run database migrations up
migrate-up:
	@if [ -z "$$DB_HOST" ]; then \
		echo "Error: DB_HOST environment variable not set"; \
		exit 1; \
	fi
	@$(MIGRATE) -path migrations -database "postgres://$$DB_USER:$$DB_PASSWORD@$$DB_HOST:$$DB_PORT/$$DB_NAME?sslmode=disable" up

# Run database migrations down
migrate-down:
	@if [ -z "$$DB_HOST" ]; then \
		echo "Error: DB_HOST environment variable not set"; \
		exit 1; \
	fi
	@$(MIGRATE) -path migrations -database "postgres://$$DB_USER:$$DB_PASSWORD@$$DB_HOST:$$DB_PORT/$$DB_NAME?sslmode=disable" down 1

# Create a new migration file
migrate-create:
	@if [ -z "$$(MIGRATION_NAME)" ]; then \
		echo "Usage: make migrate-create MIGRATION_NAME=name"; \
		exit 1; \
	fi
	@$(MIGRATE) create -ext sql -dir migrations -seq $$(MIGRATION_NAME)
