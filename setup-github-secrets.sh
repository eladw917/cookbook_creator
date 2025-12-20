#!/bin/bash

# GitHub CI/CD Setup Script
# This script helps you set up GitHub secrets for CI/CD

echo "🚀 GitHub CI/CD Setup for Cookbook Creator"
echo "==========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Your Fly.io token (already generated)
FLY_TOKEN="FlyV1 fm2_lJPECAAAAAAABhFmxBAtx/px/qrdONb7kf9XHrqDwrVodHRwczovL2FwaS5mbHkuaW8vdjGUAJLOAAUxoB8Lk7lodHRwczovL2FwaS5mbHkuaW8vYWFhL3YxxDzy552b3FGDr150HzbMygrvSiOJ5XWfY7RTBjQuNjg+8BojhO7SxwssI0xGIvGxWvtJKadXsg2otSNCbm3ETjWg6ucP04FUt51PqcNI9hARJPeMDuAmcMXTGk/OcblGm+cCP371Oey7YbdITW9qCQxjCUz2LunVbFzxZkqGYM9w+UF77QYkFHEFAtNDFsQgEAON0gcZM3RvtA6GDyHxcv5GVxhsiQ0ON1yWCYgGZ48=,fm2_lJPETjWg6ucP04FUt51PqcNI9hARJPeMDuAmcMXTGk/OcblGm+cCP371Oey7YbdITW9qCQxjCUz2LunVbFzxZkqGYM9w+UF77QYkFHEFAtNDFsQQSqKNkuAVSyG9VRIwU5eGNsO5aHR0cHM6Ly9hcGkuZmx5LmlvL2FhYS92MZgEks5pRtREzo7e2mIXzgAE0JIKkc4ABNCSDMQQWPi+1IOyuDMvT5b4mxd7JsQgT3aAlkh7mfyVEewh/ZAWalGntomxMRkuYabzTe+ooT0="

echo -e "${BLUE}Step 1: Copy Your Fly.io Token${NC}"
echo "=================================="
echo ""
echo "Your Fly.io API token is:"
echo ""
echo -e "${GREEN}${FLY_TOKEN}${NC}"
echo ""
echo "This token has been copied to your clipboard (on macOS)."
echo ""

# Copy to clipboard on macOS
if command -v pbcopy &> /dev/null; then
    echo "$FLY_TOKEN" | pbcopy
    echo -e "${GREEN}✓ Token copied to clipboard!${NC}"
else
    echo -e "${YELLOW}Note: Clipboard copy not available. Please copy the token above manually.${NC}"
fi

echo ""
echo -e "${BLUE}Step 2: Add Token to GitHub${NC}"
echo "============================"
echo ""
echo "1. Go to your GitHub repository in a web browser"
echo "2. Click 'Settings' (top navigation bar)"
echo "3. In the left sidebar, click 'Secrets and variables' → 'Actions'"
echo "4. Click 'New repository secret'"
echo "5. Name: FLY_API_TOKEN"
echo "6. Value: Paste the token from your clipboard"
echo "7. Click 'Add secret'"
echo ""

echo -e "${BLUE}Step 3: Verify Your Setup${NC}"
echo "=========================="
echo ""
echo "After adding the secret, you can:"
echo ""
echo "1. Commit and push the workflow files:"
echo "   git add .github/workflows/"
echo "   git commit -m 'Add GitHub Actions CI/CD'"
echo "   git push origin master"
echo ""
echo "2. Go to the 'Actions' tab in your GitHub repository"
echo "3. Watch your first automated deployment!"
echo ""

echo -e "${GREEN}✓ Setup script complete!${NC}"
echo ""
echo "📚 For more details, see: GITHUB_CICD_SETUP.md"
echo ""

