#!/bin/bash

# GitHub CI/CD Quick Setup Script
# This script automates the entire GitHub CI/CD setup

set -e  # Exit on error

echo "🚀 GitHub CI/CD Quick Setup"
echo "============================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Your Fly.io token
FLY_TOKEN="FlyV1 fm2_lJPECAAAAAAABhFmxBAtx/px/qrdONb7kf9XHrqDwrVodHRwczovL2FwaS5mbHkuaW8vdjGUAJLOAAUxoB8Lk7lodHRwczovL2FwaS5mbHkuaW8vYWFhL3YxxDzy552b3FGDr150HzbMygrvSiOJ5XWfY7RTBjQuNjg+8BojhO7SxwssI0xGIvGxWvtJKadXsg2otSNCbm3ETjWg6ucP04FUt51PqcNI9hARJPeMDuAmcMXTGk/OcblGm+cCP371Oey7YbdITW9qCQxjCUz2LunVbFzxZkqGYM9w+UF77QYkFHEFAtNDFsQgEAON0gcZM3RvtA6GDyHxcv5GVxhsiQ0ON1yWCYgGZ48=,fm2_lJPETjWg6ucP04FUt51PqcNI9hARJPeMDuAmcMXTGk/OcblGm+cCP371Oey7YbdITW9qCQxjCUz2LunVbFzxZkqGYM9w+UF77QYkFHEFAtNDFsQQSqKNkuAVSyG9VRIwU5eGNsO5aHR0cHM6Ly9hcGkuZmx5LmlvL2FhYS92MZgEks5pRtREzo7e2mIXzgAE0JIKkc4ABNCSDMQQWPi+1IOyuDMvT5b4mxd7JsQgT3aAlkh7mfyVEewh/ZAWalGntomxMRkuYabzTe+ooT0="

echo -e "${BLUE}Step 1: Check GitHub CLI${NC}"
echo "========================"
echo ""

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}GitHub CLI (gh) is not installed.${NC}"
    echo ""
    echo "Install it with:"
    echo "  brew install gh"
    echo ""
    echo "Or visit: https://cli.github.com/"
    echo ""
    echo -e "${YELLOW}After installing, run this script again.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ GitHub CLI is installed${NC}"
echo ""

# Check if authenticated
echo -e "${BLUE}Step 2: Check GitHub Authentication${NC}"
echo "===================================="
echo ""

if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}Not authenticated with GitHub.${NC}"
    echo ""
    echo "Authenticating now..."
    gh auth login
    echo ""
fi

echo -e "${GREEN}✓ Authenticated with GitHub${NC}"
echo ""

# Set the secret
echo -e "${BLUE}Step 3: Add FLY_API_TOKEN Secret${NC}"
echo "================================="
echo ""

echo "Adding FLY_API_TOKEN to GitHub repository..."
echo ""

if echo "$FLY_TOKEN" | gh secret set FLY_API_TOKEN; then
    echo ""
    echo -e "${GREEN}✓ FLY_API_TOKEN added successfully!${NC}"
else
    echo ""
    echo -e "${RED}✗ Failed to add secret${NC}"
    echo ""
    echo "You can add it manually:"
    echo "1. Go to: GitHub repo → Settings → Secrets and variables → Actions"
    echo "2. Click 'New repository secret'"
    echo "3. Name: FLY_API_TOKEN"
    echo "4. Value: (run ./setup-github-secrets.sh to see the token)"
    exit 1
fi

echo ""

# Commit and push workflow files
echo -e "${BLUE}Step 4: Commit and Push Workflows${NC}"
echo "=================================="
echo ""

# Check if there are changes to commit
if git diff --quiet .github/workflows/ 2>/dev/null && \
   git diff --quiet --cached .github/workflows/ 2>/dev/null; then
    echo -e "${YELLOW}No changes to commit in .github/workflows/${NC}"
else
    echo "Adding workflow files..."
    git add .github/workflows/ \
           GITHUB_CICD_SETUP.md \
           CICD_NEXT_STEPS.md \
           CICD_QUICK_REFERENCE.md \
           setup-github-secrets.sh \
           setup-github-cicd.sh 2>/dev/null || true
    
    echo "Committing changes..."
    git commit -m "Add GitHub Actions CI/CD workflows" || echo "Nothing to commit"
    
    echo ""
    echo "Pushing to GitHub..."
    git push origin master || git push origin main
    
    echo ""
    echo -e "${GREEN}✓ Workflows pushed to GitHub!${NC}"
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}   Setup Complete! 🎉${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""

echo "Your CI/CD pipeline is now active!"
echo ""
echo "Next steps:"
echo ""
echo "1. View your workflows:"
echo "   gh workflow list"
echo ""
echo "2. Watch the deployment:"
echo "   gh run watch"
echo ""
echo "3. Or visit GitHub Actions in your browser:"
echo "   gh repo view --web"
echo "   (Then click the 'Actions' tab)"
echo ""
echo "4. Check your deployed apps:"
echo "   Backend:  https://cookbook-creator-api.fly.dev"
echo "   Frontend: https://cookbook-creator-web.fly.dev"
echo ""
echo -e "${BLUE}📚 Documentation:${NC}"
echo "   - Quick Reference: CICD_QUICK_REFERENCE.md"
echo "   - Next Steps: CICD_NEXT_STEPS.md"
echo "   - Full Guide: GITHUB_CICD_SETUP.md"
echo ""
echo -e "${GREEN}Happy deploying! 🚀${NC}"
echo ""

