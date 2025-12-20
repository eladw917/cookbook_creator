#!/bin/bash

# Fly.io Deployment Script for Cookbook Creator
# This script helps deploy both backend and frontend to Fly.io

set -e  # Exit on error

echo "🚀 Cookbook Creator - Fly.io Deployment"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null; then
    echo -e "${RED}Error: flyctl is not installed${NC}"
    echo "Install it with: brew install flyctl"
    echo "Or visit: https://fly.io/docs/hands-on/install-flyctl/"
    exit 1
fi

# Check if user is logged in
if ! flyctl auth whoami &> /dev/null; then
    echo -e "${YELLOW}You need to login to Fly.io${NC}"
    flyctl auth login
fi

echo -e "${BLUE}What would you like to deploy?${NC}"
echo "1) Backend only"
echo "2) Frontend only"
echo "3) Both (backend first, then frontend)"
echo "4) Setup new deployment (create apps and volumes)"
read -p "Enter choice [1-4]: " choice

case $choice in
    1)
        echo -e "${GREEN}Deploying backend...${NC}"
        cd backend
        flyctl deploy
        cd ..
        echo -e "${GREEN}✓ Backend deployed!${NC}"
        ;;
    2)
        echo -e "${GREEN}Deploying frontend...${NC}"
        cd frontend
        npm run build
        flyctl deploy
        cd ..
        echo -e "${GREEN}✓ Frontend deployed!${NC}"
        ;;
    3)
        echo -e "${GREEN}Deploying backend...${NC}"
        cd backend
        flyctl deploy
        cd ..
        echo -e "${GREEN}✓ Backend deployed!${NC}"
        echo ""
        echo -e "${GREEN}Deploying frontend...${NC}"
        cd frontend
        npm run build
        flyctl deploy
        cd ..
        echo -e "${GREEN}✓ Frontend deployed!${NC}"
        ;;
    4)
        echo -e "${BLUE}Setting up new Fly.io deployment${NC}"
        echo ""
        
        # Backend setup
        echo -e "${GREEN}Step 1: Backend Setup${NC}"
        cd backend
        
        echo "Initializing backend app..."
        flyctl launch --no-deploy
        
        read -p "Enter your app name (from fly.toml): " backend_app
        read -p "Enter your region (e.g., sjc): " region
        
        echo "Creating persistent volume..."
        flyctl volumes create cookbook_data --size 1 --region $region
        
        echo "Setting environment variables..."
        read -p "Enter your GEMINI_API_KEY: " gemini_key
        flyctl secrets set GEMINI_API_KEY="$gemini_key"
        
        read -p "Enter your CLERK_SECRET_KEY: " clerk_key
        flyctl secrets set CLERK_SECRET_KEY="$clerk_key"
        
        echo "Deploying backend..."
        flyctl deploy
        
        backend_url="https://${backend_app}.fly.dev"
        echo -e "${GREEN}✓ Backend deployed at: $backend_url${NC}"
        
        cd ..
        
        # Frontend setup
        echo ""
        echo -e "${GREEN}Step 2: Frontend Setup${NC}"
        cd frontend
        
        # Update config
        echo "Updating frontend config..."
        cat > src/config.ts << EOF
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '${backend_url}';
EOF
        
        echo "Initializing frontend app..."
        flyctl launch --no-deploy
        
        read -p "Enter your frontend app name (from fly.toml): " frontend_app
        
        echo "Building frontend..."
        npm run build
        
        echo "Deploying frontend..."
        flyctl deploy
        
        frontend_url="https://${frontend_app}.fly.dev"
        echo -e "${GREEN}✓ Frontend deployed at: $frontend_url${NC}"
        
        cd ..
        
        # Update CORS
        echo ""
        echo -e "${GREEN}Step 3: Updating CORS settings${NC}"
        cd backend
        flyctl secrets set CORS_ORIGINS="$frontend_url"
        flyctl secrets set PUBLIC_PDF_BASE_URL="$backend_url"
        cd ..
        
        echo ""
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}✓ Deployment Complete!${NC}"
        echo -e "${GREEN}========================================${NC}"
        echo ""
        echo -e "${BLUE}Your app is live at:${NC}"
        echo -e "  Frontend: ${GREEN}$frontend_url${NC}"
        echo -e "  Backend:  ${GREEN}$backend_url${NC}"
        echo ""
        echo -e "${YELLOW}Next steps:${NC}"
        echo "1. Update Clerk dashboard with these URLs"
        echo "2. Test your app at $frontend_url"
        echo "3. Monitor logs with: flyctl logs"
        echo ""
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Done! 🎉${NC}"

