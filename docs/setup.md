# Setup and Installation Guide

This guide will help you set up the Recipe Extract development environment on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

- **Python 3.8 or higher**
  - Download from [python.org](https://python.org)
  - Or use your system package manager:
    ```bash
    # macOS (with Homebrew)
    brew install python

    # Ubuntu/Debian
    sudo apt update
    sudo apt install python3 python3-pip python3-venv

    # CentOS/RHEL/Fedora
    sudo dnf install python3 python3-pip  # Fedora/CentOS 8+
    sudo yum install python3 python3-pip  # CentOS 7
    ```

- **Node.js 16 or higher**
  - Download from [nodejs.org](https://nodejs.org)
  - Or use your system package manager:
    ```bash
    # macOS (with Homebrew)
    brew install node

    # Ubuntu/Debian
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs

    # CentOS/RHEL/Fedora
    curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
    sudo yum install nodejs  # or dnf
    ```

- **Git**
  - Usually pre-installed on macOS/Linux
  - Download from [git-scm.com](https://git-scm.com)

### API Keys

You'll need a **Google Gemini API key**:

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Create a new API key
4. Copy the API key (you'll need it later)

## Quick Setup (Automated)

The easiest way to set up the project is using the automated setup script:

```bash
# Clone the repository
git clone <repository-url>
cd recipe_extract

# Run the setup script
chmod +x setup.sh
./setup.sh

# Set your API key
echo "export GEMINI_API_KEY='your-api-key-here'" >> ~/.bashrc
# or for fish shell: set -Ux GEMINI_API_KEY 'your-api-key-here'
```

The setup script will:
- Create Python virtual environment for backend
- Install Python dependencies
- Install Node.js dependencies for frontend
- Verify installations
- Provide next steps

## Manual Setup

If you prefer to set up manually or the automated script fails:

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd recipe_extract
```

### Step 2: Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt

# Verify installation
python -c "import fastapi, uvicorn, google.genai; print('✅ Backend dependencies installed')"
```

### Step 3: Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install

# Verify installation
npm run build  # This should complete without errors
```

### Step 4: Environment Configuration

Create environment variables for your API keys:

```bash
# For bash/zsh
echo "export GEMINI_API_KEY='your-gemini-api-key-here'" >> ~/.bashrc
source ~/.bashrc

# For fish shell
set -Ux GEMINI_API_KEY 'your-gemini-api-key-here'

# For Windows Command Prompt
setx GEMINI_API_KEY "your-gemini-api-key-here"

# For Windows PowerShell
[System.Environment]::SetEnvironmentVariable('GEMINI_API_KEY', 'your-gemini-api-key-here', 'User')
```

## Verification

After setup, verify everything works:

### Backend Verification

```bash
cd backend
source venv/bin/activate  # Activate virtual environment

# Test basic imports
python -c "
import fastapi
import uvicorn
import google.genai
import yt_dlp
from youtube_transcript_api import YouTubeTranscriptApi
print('✅ All backend dependencies working')
"

# Test API key
python -c "
import os
from google import genai
client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))
print('✅ Gemini API key is valid')
"
```

### Frontend Verification

```bash
cd frontend

# Check if dependencies are installed
ls node_modules | head -5

# Run build to verify setup
npm run build

# Start dev server briefly to test
timeout 10s npm run dev || echo "✅ Frontend setup verified"
```

## Running the Application

After successful setup:

### Option 1: Use the Server Script (Recommended)

```bash
# Start both servers
./servers.sh start

# Or start individually
./servers.sh backend   # Terminal 1
./servers.sh frontend  # Terminal 2
```

### Option 2: Manual Start

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
python main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Troubleshooting Setup Issues

### Python Issues

**"python3: command not found"**
```bash
# Check if Python is installed
python --version
python3 --version

# Install Python if missing (Ubuntu/Debian)
sudo apt update
sudo apt install python3 python3-pip python3-venv
```

**Virtual environment issues**
```bash
# Remove and recreate venv
cd backend
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Pip install fails**
```bash
# Upgrade pip first
pip install --upgrade pip

# Install with user flag if permission issues
pip install --user -r requirements.txt

# Or use virtual environment properly
source venv/bin/activate
pip install -r requirements.txt
```

### Node.js Issues

**"npm: command not found"**
```bash
# Install Node.js (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

**npm install fails**
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### API Key Issues

**"GEMINI_API_KEY not set"**
```bash
# Check if environment variable is set
echo $GEMINI_API_KEY

# Set it for current session
export GEMINI_API_KEY='your-key-here'

# Or add to your shell profile
echo "export GEMINI_API_KEY='your-key-here'" >> ~/.bashrc
source ~/.bashrc
```

**Invalid API key**
- Double-check your API key in Google AI Studio
- Ensure there are no extra spaces or characters
- Try creating a new API key

### Port Issues

**"Port 8000/5173 already in use"**
```bash
# Find what's using the port
lsof -i :8000  # For backend port
lsof -i :5173  # For frontend port

# Kill the process (replace PID)
kill -9 <PID>

# Or use different ports (modify scripts accordingly)
```

### Permission Issues

**"Permission denied" when running scripts**
```bash
# Make scripts executable
chmod +x setup.sh
chmod +x servers.sh
```

**Virtual environment activation fails**
```bash
# Check shell type
echo $SHELL

# For fish shell
source venv/bin/activate.fish

# For csh/tcsh
source venv/bin/activate.csh
```

## Development Environment

### IDE Recommendations

- **VS Code**: Excellent TypeScript and Python support
  - Install extensions: Python, TypeScript, React
- **PyCharm**: Great for Python backend development
- **WebStorm**: Excellent for React frontend development

### Optional Tools

```bash
# Install development tools
pip install black flake8 mypy  # Python formatting/linting
npm install -g typescript eslint prettier  # JS/TS tools
```

### Environment File

Create a `.env` file in the backend directory for local development:

```bash
# backend/.env
GEMINI_API_KEY=your-api-key-here
DEBUG=true
```

## Next Steps

After successful setup:

1. **Run the application**: `./servers.sh start`
2. **Visit the frontend**: http://localhost:5173
3. **Try a test video**: Use any YouTube cooking video URL
4. **Check API docs**: http://localhost:8000/docs
5. **Explore the code**: Understand the architecture and components

## Getting Help

If you encounter issues:

1. Check this troubleshooting section
2. Review error messages carefully
3. Check the [main README](../README.md) for usage instructions
4. Open an issue on the project repository with:
   - Your OS and versions
   - Complete error messages
   - Steps to reproduce the issue

Happy coding! 🚀




