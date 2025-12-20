#!/bin/bash

###############################################################################
# E2E Test Runner with Automatic Service Management
#
# This script:
# 1. Starts the backend server if not running
# 2. Waits for backend to be healthy
# 3. Runs Playwright E2E tests (frontend starts automatically via webServer)
# 4. Cleans up backend service after tests complete
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_PORT=3000  # Default port, will be read from .env if available
FRONTEND_PORT=8000
BACKEND_URL="http://localhost:${BACKEND_PORT}"
FRONTEND_URL="http://localhost:${FRONTEND_PORT}"
MAX_WAIT_TIME=30
BACKEND_PID_FILE="/tmp/workflow-engine-backend.pid"
DB_PORT=5432

# Get the project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_ROOT="$(cd "${CLIENT_DIR}/.." && pwd)"
SERVER_DIR="${PROJECT_ROOT}/server"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}E2E Test Runner with Service Management${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

###############################################################################
# Helper Functions
###############################################################################

# Print info message
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Print success message
success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Print warning message
warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Print error message
error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if port is in use
is_port_in_use() {
    local port=$1
    lsof -i :${port} -sTCP:LISTEN -t >/dev/null 2>&1
}

# Wait for service to be healthy
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_wait=$3
    local elapsed=0

    info "Waiting for ${service_name} to be healthy..."

    while [ $elapsed -lt $max_wait ]; do
        if curl -f -s -o /dev/null "${url}"; then
            success "${service_name} is healthy!"
            return 0
        fi

        sleep 1
        elapsed=$((elapsed + 1))
        echo -ne "\r${BLUE}[INFO]${NC} Waiting... ${elapsed}/${max_wait}s"
    done

    echo ""
    error "${service_name} did not become healthy within ${max_wait}s"
    return 1
}

# Check if PostgreSQL is available and accessible
check_database() {
    info "Checking PostgreSQL database availability..."

    # First check if port is open
    local port_open=false
    if command -v nc &> /dev/null; then
        if timeout 2 nc -z localhost ${DB_PORT} 2>/dev/null; then
            port_open=true
        fi
    elif command -v telnet &> /dev/null; then
        if echo "quit" | timeout 2 telnet localhost ${DB_PORT} 2>&1 | grep -q "Connected"; then
            port_open=true
        fi
    fi

    if [ "$port_open" = false ]; then
        warning "PostgreSQL port ${DB_PORT} is not accessible"
        return 1
    fi

    # Try to actually connect to PostgreSQL
    if command -v psql &> /dev/null; then
        # Read database config from .env if available
        local db_name="lifecycle_ops"
        local db_user="postgres"
        local db_password=""

        if [ -f "${SERVER_DIR}/.env" ]; then
            db_name=$(grep "^DB_NAME=" "${SERVER_DIR}/.env" 2>/dev/null | cut -d'=' -f2) || db_name="lifecycle_ops"
            db_user=$(grep "^DB_USER=" "${SERVER_DIR}/.env" 2>/dev/null | cut -d'=' -f2) || db_user="postgres"
            db_password=$(grep "^DB_PASSWORD=" "${SERVER_DIR}/.env" 2>/dev/null | cut -d'=' -f2) || db_password=""
        fi

        # Try to connect with a short timeout
        if PGPASSWORD="${db_password}" timeout 3 psql -h localhost -p ${DB_PORT} -U "${db_user}" -d "${db_name}" -c '\q' 2>/dev/null; then
            success "PostgreSQL database '${db_name}' is accessible"
            return 0
        else
            warning "PostgreSQL is running but database '${db_name}' is not accessible"
            warning "This might be due to: missing database, wrong credentials, or authentication issues"
            return 1
        fi
    else
        warning "psql command not found - cannot verify database accessibility"
        warning "Assuming database is NOT available"
        return 1
    fi
}

# Start backend server
start_backend() {
    info "Checking backend server status..."

    if is_port_in_use ${BACKEND_PORT}; then
        warning "Backend is already running on port ${BACKEND_PORT}"
        BACKEND_WAS_RUNNING=true
        return 0
    fi

    info "Starting backend server..."

    # Check if server directory exists
    if [ ! -d "${SERVER_DIR}" ]; then
        error "Server directory not found: ${SERVER_DIR}"
        return 1
    fi

    # Check if Go is installed
    if ! command -v go &> /dev/null; then
        error "Go is not installed or not in PATH"
        return 1
    fi

    # Check database availability
    DB_AVAILABLE=false
    if check_database; then
        DB_AVAILABLE=true
        info "Backend will connect to PostgreSQL database"
    else
        warning "Database not available - starting backend with DB_DISABLED=true"
        warning "Note: API tests requiring database will be skipped"
    fi

    # Start backend in background
    cd "${SERVER_DIR}"

    # Export DB_DISABLED if database is not available
    if [ "${DB_AVAILABLE}" = false ]; then
        export DB_DISABLED=true
    fi

    nohup make run > /tmp/workflow-backend.log 2>&1 &
    BACKEND_PID=$!
    echo ${BACKEND_PID} > ${BACKEND_PID_FILE}

    success "Backend server started (PID: ${BACKEND_PID})"
    info "Backend logs: /tmp/workflow-backend.log"

    # Wait for backend to be healthy
    if ! wait_for_service "${BACKEND_URL}/health" "Backend" ${MAX_WAIT_TIME}; then
        error "Backend failed to start properly"
        cat /tmp/workflow-backend.log
        stop_backend
        return 1
    fi

    BACKEND_WAS_RUNNING=false
    return 0
}

# Stop backend server
stop_backend() {
    if [ "${BACKEND_WAS_RUNNING}" = true ]; then
        info "Backend was already running before script, not stopping it"
        return 0
    fi

    if [ -f "${BACKEND_PID_FILE}" ]; then
        BACKEND_PID=$(cat ${BACKEND_PID_FILE})
        if ps -p ${BACKEND_PID} > /dev/null 2>&1; then
            info "Stopping backend server (PID: ${BACKEND_PID})..."
            kill ${BACKEND_PID} 2>/dev/null || true
            sleep 2

            # Force kill if still running
            if ps -p ${BACKEND_PID} > /dev/null 2>&1; then
                warning "Backend didn't stop gracefully, force killing..."
                kill -9 ${BACKEND_PID} 2>/dev/null || true
            fi

            success "Backend server stopped"
        fi
        rm -f ${BACKEND_PID_FILE}
    fi
}

# Cleanup function
cleanup() {
    echo ""
    info "Cleaning up..."
    stop_backend
    info "Cleanup complete"
}

# Run E2E tests
run_tests() {
    info "Running E2E tests..."
    echo ""

    cd "${CLIENT_DIR}"

    # Set environment variables for tests
    export BACKEND_URL="${BACKEND_URL}"
    export FRONTEND_URL="${FRONTEND_URL}"

    # Run Playwright tests
    # Note: Playwright will automatically start the frontend via webServer config
    if npm run test:e2e -- "$@"; then
        echo ""
        success "All tests passed!"
        return 0
    else
        echo ""
        error "Some tests failed!"
        return 1
    fi
}

###############################################################################
# Main Execution
###############################################################################

# Trap cleanup on exit
trap cleanup EXIT INT TERM

# Parse command line arguments
TEST_ARGS=()
SKIP_BACKEND=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-backend)
            SKIP_BACKEND=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [options] [playwright-args]"
            echo ""
            echo "Options:"
            echo "  --skip-backend    Skip starting the backend server"
            echo "  --help, -h        Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                                  # Run all tests"
            echo "  $0 --project=quick                  # Run quick tests"
            echo "  $0 --skip-backend --project=quick   # Run quick tests without backend"
            echo "  $0 --headed                         # Run tests in headed mode"
            exit 0
            ;;
        *)
            TEST_ARGS+=("$1")
            shift
            ;;
    esac
done

# Start services
if [ "${SKIP_BACKEND}" = false ]; then
    if ! start_backend; then
        error "Failed to start backend server"
        exit 1
    fi
else
    warning "Skipping backend startup (--skip-backend flag)"
fi

# Run tests
TEST_EXIT_CODE=0
if ! run_tests "${TEST_ARGS[@]}"; then
    TEST_EXIT_CODE=1
fi

# Cleanup happens automatically via trap
exit ${TEST_EXIT_CODE}
