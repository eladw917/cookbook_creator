#!/bin/bash

# Cookbook Creator - Server Startup Script
# This script starts both backend and frontend servers

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🍳 Cookbook Creator - Starting Servers${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "servers.sh" ]; then
    echo -e "${RED}❌ Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down servers...${NC}"
    kill 0  # Kill all processes in the current process group
    exit
}

trap cleanup SIGINT SIGTERM

# Check if backend virtual environment exists
if [ ! -d "backend/venv" ]; then
    echo -e "${YELLOW}⚠️  Virtual environment not found. Creating it...${NC}"
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cd ..
    echo -e "${GREEN}✅ Virtual environment created${NC}"
fi

# Check if frontend node_modules exists
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Node modules not found. Installing...${NC}"
    cd frontend
    npm install
    cd ..
    echo -e "${GREEN}✅ Node modules installed${NC}"
fi

# Check environment variables
echo -e "${BLUE}🔍 Checking environment variables...${NC}"

if [ ! -f "backend/.env" ]; then
    echo -e "${RED}❌ Error: backend/.env file not found${NC}"
    echo -e "${YELLOW}Please create backend/.env with your Clerk secret key${NC}"
    exit 1
fi

if [ ! -f "frontend/.env" ]; then
    echo -e "${RED}❌ Error: frontend/.env file not found${NC}"
    echo -e "${YELLOW}Please create frontend/.env with your Clerk publishable key${NC}"
    exit 1
fi

# Check if Clerk keys are configured
if grep -q "your-clerk-secret-key-here" backend/.env; then
    echo -e "${RED}❌ Error: Clerk secret key not configured in backend/.env${NC}"
    echo -e "${YELLOW}Please update CLERK_SECRET_KEY in backend/.env${NC}"
    exit 1
fi

if grep -q "your-clerk-publishable-key-here" frontend/.env; then
    echo -e "${RED}❌ Error: Clerk publishable key not configured in frontend/.env${NC}"
    echo -e "${YELLOW}Please update VITE_CLERK_PUBLISHABLE_KEY in frontend/.env${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment variables configured${NC}"
echo ""

# Start backend server
echo -e "${BLUE}🚀 Starting backend server...${NC}"
cd backend
source venv/bin/activate
python main.py &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 2

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}❌ Backend failed to start${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Backend running on http://localhost:8000${NC}"
echo ""

# Start frontend server
echo -e "${BLUE}🚀 Starting frontend server...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait a moment for frontend to start
sleep 2

# Check if frontend started successfully
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "${RED}❌ Frontend failed to start${NC}"
    kill $BACKEND_PID
    exit 1
fi

echo -e "${GREEN}✅ Frontend running on http://localhost:5173${NC}"
echo ""

# Start SQLite Web UI
echo -e "${BLUE}🗄️  Starting SQLite Web UI...${NC}"
cd backend
if [ -f "venv/bin/sqlite_web" ]; then
    ./venv/bin/sqlite_web cookbook.db &
    SQLITE_PID=$!
    cd ..
    
    # Wait a moment for SQLite UI to start
    sleep 2
    
    # Check if SQLite UI started successfully
    if ! kill -0 $SQLITE_PID 2>/dev/null; then
        echo -e "${YELLOW}⚠️  SQLite Web UI failed to start (optional)${NC}"
    else
        echo -e "${GREEN}✅ SQLite Web UI running on http://localhost:8080${NC}"
    fi
else
    cd ..
    echo -e "${YELLOW}⚠️  SQLite Web UI not installed (optional)${NC}"
    echo -e "${YELLOW}   Install with: cd backend && source venv/bin/activate && pip install sqlite-web${NC}"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 All servers are running!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📱 Application:    ${GREEN}http://localhost:5173${NC}"
echo -e "${BLUE}🔧 Backend API:    ${GREEN}http://localhost:8000${NC}"
echo -e "${BLUE}🗄️  Database UI:    ${GREEN}http://localhost:8080${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo ""

# Wait for all processes
wait
