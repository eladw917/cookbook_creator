#!/bin/bash

# Recipe Extract - Server Startup Script
# This script helps you start the backend and frontend servers for the Recipe Extract application

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Server configuration
BACKEND_PORT=8000
FRONTEND_PORT=5173
BACKEND_DIR="./backend"
FRONTEND_DIR="./frontend"

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if a port is in use
check_port() {
    local port=$1
    local name=$2
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        print_warning "$name port $port is already in use"
        return 1
    fi
    return 0
}

# Function to start backend server
start_backend() {
    print_info "Starting backend server..."

    # Check if backend port is available
    if ! check_port $BACKEND_PORT "Backend"; then
        print_error "Cannot start backend server - port $BACKEND_PORT is in use"
        return 1
    fi

    # Check if backend directory exists
    if [ ! -d "$BACKEND_DIR" ]; then
        print_error "Backend directory '$BACKEND_DIR' not found"
        return 1
    fi

    cd "$BACKEND_DIR"

    # Check if virtual environment exists and activate it
    if [ -d "venv" ]; then
        print_info "Activating virtual environment..."
        source venv/bin/activate
    else
        print_warning "Virtual environment not found. Make sure to run setup first."
        print_info "Attempting to run with system Python..."
    fi

    # Check if requirements are installed
    if ! python -c "import fastapi, uvicorn" 2>/dev/null; then
        print_error "Required Python packages not found. Run setup first."
        return 1
    fi

    print_success "Backend server starting on http://localhost:$BACKEND_PORT"
    print_info "API documentation available at http://localhost:$BACKEND_PORT/docs"

    # Start backend server in background
    python main.py &
    BACKEND_PID=$!

    cd ..
    return 0
}

# Function to start frontend server
start_frontend() {
    print_info "Starting frontend server..."

    # Check if frontend port is available
    if ! check_port $FRONTEND_PORT "Frontend"; then
        print_error "Cannot start frontend server - port $FRONTEND_PORT is in use"
        return 1
    fi

    # Check if frontend directory exists
    if [ ! -d "$FRONTEND_DIR" ]; then
        print_error "Frontend directory '$FRONTEND_DIR' not found"
        return 1
    fi

    cd "$FRONTEND_DIR"

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_error "Node modules not found. Run 'npm install' in frontend directory first."
        return 1
    fi

    print_success "Frontend server starting on http://localhost:$FRONTEND_PORT"

    # Start frontend dev server in background
    npm run dev &
    FRONTEND_PID=$!

    cd ..
    return 0
}

# Function to show usage
show_usage() {
    echo "Recipe Extract - Server Startup Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start          Start both backend and frontend servers"
    echo "  backend        Start only the backend server"
    echo "  frontend       Start only the frontend server"
    echo "  stop           Stop all running servers"
    echo "  status         Show status of servers"
    echo "  ports          Show configured ports"
    echo "  help           Show this help message"
    echo ""
    echo "Ports:"
    echo "  Backend (FastAPI):  $BACKEND_PORT"
    echo "  Frontend (Vite):    $FRONTEND_PORT"
    echo ""
    echo "Examples:"
    echo "  $0 start          # Start both servers"
    echo "  $0 backend        # Start only backend"
    echo "  $0 stop           # Stop all servers"
}

# Function to show ports
show_ports() {
    echo "Recipe Extract - Server Ports"
    echo ""
    echo "Backend (FastAPI):"
    echo "  URL:        http://localhost:$BACKEND_PORT"
    echo "  API Docs:   http://localhost:$BACKEND_PORT/docs"
    echo "  ReDoc:      http://localhost:$BACKEND_PORT/redoc"
    echo ""
    echo "Frontend (React + Vite):"
    echo "  URL:        http://localhost:$FRONTEND_PORT"
    echo ""
    echo "Environment Variables:"
    echo "  GEMINI_API_KEY    - Required for AI recipe extraction"
}

# Function to check server status
check_status() {
    echo "Recipe Extract - Server Status"
    echo ""

    # Check backend
    if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null ; then
        print_success "Backend server is running on port $BACKEND_PORT"
    else
        print_error "Backend server is not running"
    fi

    # Check frontend
    if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null ; then
        print_success "Frontend server is running on port $FRONTEND_PORT"
    else
        print_error "Frontend server is not running"
    fi
}

# Function to stop servers
stop_servers() {
    print_info "Stopping servers..."

    # Stop backend
    if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null ; then
        BACKEND_PID=$(lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t)
        kill $BACKEND_PID 2>/dev/null && print_success "Backend server stopped" || print_warning "Failed to stop backend server"
    else
        print_info "Backend server is not running"
    fi

    # Stop frontend
    if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null ; then
        FRONTEND_PID=$(lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t)
        kill $FRONTEND_PID 2>/dev/null && print_success "Frontend server stopped" || print_warning "Failed to stop frontend server"
    else
        print_info "Frontend server is not running"
    fi
}

# Main script logic
case "${1:-start}" in
    "start")
        print_info "Starting Recipe Extract servers..."
        echo ""

        # Start backend
        if start_backend; then
            print_success "Backend started successfully"
        else
            print_error "Failed to start backend"
            exit 1
        fi

        echo ""

        # Start frontend
        if start_frontend; then
            print_success "Frontend started successfully"
        else
            print_error "Failed to start frontend"
            exit 1
        fi

        echo ""
        print_success "🎉 All servers started successfully!"
        echo ""
        show_ports
        echo ""
        print_info "Press Ctrl+C to stop all servers"
        wait
        ;;

    "backend")
        start_backend
        ;;

    "frontend")
        start_frontend
        ;;

    "stop")
        stop_servers
        ;;

    "status")
        check_status
        ;;

    "ports")
        show_ports
        ;;

    "help"|"-h"|"--help")
        show_usage
        ;;

    *)
        print_error "Unknown command: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac




