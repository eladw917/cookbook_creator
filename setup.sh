#!/bin/bash

# Recipe Extract - Automated Setup Script
# This script sets up the development environment for the Recipe Extract project

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

print_header() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}  🍳 Recipe Extract - Setup Script${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
}

# Function to check command availability
check_command() {
    if command -v "$1" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to check Python version
check_python_version() {
    if check_command python3; then
        PYTHON_CMD="python3"
    elif check_command python; then
        PYTHON_CMD="python"
    else
        print_error "Python not found. Please install Python 3.8 or higher."
        exit 1
    fi

    # Check version
    PYTHON_VERSION=$($PYTHON_CMD --version 2>&1 | grep -oP '\d+\.\d+')
    PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
    PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)

    if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 8 ]); then
        print_error "Python $PYTHON_VERSION found, but Python 3.8 or higher is required."
        exit 1
    fi

    print_success "Python $PYTHON_VERSION found at $($PYTHON_CMD --version)"
}

# Function to check Node.js version
check_nodejs_version() {
    if ! check_command node; then
        print_error "Node.js not found. Please install Node.js 16 or higher."
        print_info "Visit: https://nodejs.org/"
        exit 1
    fi

    NODE_VERSION=$(node --version | sed 's/v//')
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)

    if [ "$NODE_MAJOR" -lt 16 ]; then
        print_error "Node.js $NODE_VERSION found, but Node.js 16 or higher is required."
        exit 1
    fi

    print_success "Node.js $NODE_VERSION found"
}

# Function to setup backend
setup_backend() {
    print_info "Setting up backend..."

    if [ ! -d "backend" ]; then
        print_error "Backend directory not found. Are you in the project root?"
        exit 1
    fi

    cd backend

    # Create virtual environment
    print_info "Creating Python virtual environment..."
    if [ -d "venv" ]; then
        print_warning "Virtual environment already exists. Removing..."
        rm -rf venv
    fi

    $PYTHON_CMD -m venv venv
    print_success "Virtual environment created"

    # Activate virtual environment
    source venv/bin/activate

    # Upgrade pip
    print_info "Upgrading pip..."
    pip install --upgrade pip

    # Install requirements
    print_info "Installing Python dependencies..."
    if [ ! -f "requirements.txt" ]; then
        print_error "requirements.txt not found in backend directory"
        exit 1
    fi

    pip install -r requirements.txt
    print_success "Python dependencies installed"

    # Verify installation
    print_info "Verifying backend setup..."
    python -c "
import sys
try:
    import fastapi, uvicorn, google.genai, yt_dlp
    from youtube_transcript_api import YouTubeTranscriptApi
    print('✅ All critical backend dependencies imported successfully')
except ImportError as e:
    print(f'❌ Import error: {e}')
    sys.exit(1)
"

    cd ..
    print_success "Backend setup completed"
}

# Function to setup frontend
setup_frontend() {
    print_info "Setting up frontend..."

    if [ ! -d "frontend" ]; then
        print_error "Frontend directory not found. Are you in the project root?"
        exit 1
    fi

    cd frontend

    # Install dependencies
    print_info "Installing Node.js dependencies..."
    if [ ! -f "package.json" ]; then
        print_error "package.json not found in frontend directory"
        exit 1
    fi

    npm install
    print_success "Node.js dependencies installed"

    # Verify installation
    print_info "Verifying frontend setup..."
    if npm run build --silent 2>/dev/null; then
        print_success "Frontend build verification passed"
    else
        print_warning "Frontend build failed, but this might be okay for development"
    fi

    cd ..
    print_success "Frontend setup completed"
}

# Function to check API key
check_api_key() {
    print_info "Checking Gemini API key..."

    if [ -n "$GEMINI_API_KEY" ]; then
        print_success "GEMINI_API_KEY environment variable is set"
        # Try to validate the key
        cd backend
        source venv/bin/activate
        if python -c "
import os
from google import genai
try:
    client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))
    print('✅ API key appears to be valid')
except Exception as e:
    print(f'⚠️  Could not validate API key: {e}')
    print('   Make sure the key is correct and has proper permissions')
" 2>/dev/null; then
            :
        fi
        cd ..
    else
        print_warning "GEMINI_API_KEY environment variable not set"
        echo ""
        print_info "To set your API key:"
        echo "  export GEMINI_API_KEY='your-api-key-here'"
        echo ""
        print_info "Get your API key from: https://aistudio.google.com/"
        echo ""
    fi
}

# Function to make scripts executable
setup_scripts() {
    print_info "Setting up scripts..."

    chmod +x setup.sh 2>/dev/null || true
    chmod +x servers.sh 2>/dev/null || true

    print_success "Scripts are executable"
}

# Function to show next steps
show_next_steps() {
    echo ""
    print_header
    print_success "Setup completed successfully!"
    echo ""
    print_info "Next steps:"
    echo "  1. Set your Gemini API key (if not already done):"
    echo "     export GEMINI_API_KEY='your-api-key-here'"
    echo ""
    echo "  2. Start the development servers:"
    echo "     ./servers.sh start"
    echo ""
    echo "  3. Open your browser:"
    echo "     Frontend: http://localhost:5173"
    echo "     API Docs:  http://localhost:8000/docs"
    echo ""
    print_info "For help:"
    echo "  ./servers.sh --help    # Server management"
    echo "  cat README.md          # Full documentation"
    echo "  cat docs/setup.md      # Setup troubleshooting"
    echo ""
    print_success "Happy cooking! 🍳✨"
}

# Main setup process
main() {
    print_header

    print_info "Checking system requirements..."

    # Check Python
    check_python_version

    # Check Node.js
    check_nodejs_version

    # Check git
    if check_command git; then
        print_success "Git $(git --version | cut -d' ' -f3) found"
    else
        print_warning "Git not found. You may want to install it for version control."
    fi

    echo ""

    # Setup components
    setup_scripts
    setup_backend
    setup_frontend

    echo ""

    # Check API key
    check_api_key

    # Show next steps
    show_next_steps
}

# Run main function
main "$@"

