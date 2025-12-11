#!/bin/bash

# Cookbook Creator - SQLite Database UI
# This script starts a web interface to view and manage the database

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🗄️  Cookbook Creator - Database UI${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "db-ui.sh" ]; then
    echo -e "${RED}❌ Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Check if database exists
if [ ! -f "backend/cookbook.db" ]; then
    echo -e "${YELLOW}⚠️  Database not found. It will be created when you first run the backend.${NC}"
    echo -e "${YELLOW}Run ./servers.sh first to initialize the database.${NC}"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "backend/venv" ]; then
    echo -e "${RED}❌ Error: Virtual environment not found${NC}"
    echo -e "${YELLOW}Run ./servers.sh first to set up the environment${NC}"
    exit 1
fi

# Activate virtual environment and check for sqlite-web
cd backend
source venv/bin/activate

# Check if sqlite-web is installed
if ! command -v sqlite_web &> /dev/null; then
    echo -e "${YELLOW}📦 Installing sqlite-web...${NC}"
    pip install sqlite-web
    echo -e "${GREEN}✅ sqlite-web installed${NC}"
    echo ""
fi

echo -e "${GREEN}✅ Starting SQLite Web UI...${NC}"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🌐 Database UI is running!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📱 Open your browser to: ${GREEN}http://localhost:8080${NC}"
echo ""
echo -e "${YELLOW}Tables available:${NC}"
echo -e "  • users - User accounts"
echo -e "  • recipes - Recipe data"
echo -e "  • user_recipes - User's saved recipes"
echo -e "  • books - Cookbooks"
echo -e "  • book_recipes - Recipes in cookbooks"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the database UI${NC}"
echo ""

# Start sqlite-web
sqlite_web cookbook.db --host 0.0.0.0 --port 8080
