# 🍳 Recipe Extract

A powerful AI-powered application that extracts structured recipes from YouTube cooking videos. Using Google's Gemini AI, this tool automatically analyzes video transcripts and visual content to create detailed, structured recipes with timestamps and step-by-step visual guides.

## ✨ Features

- **AI-Powered Recipe Extraction**: Uses Google's Gemini AI to analyze YouTube video transcripts and extract structured recipes
- **Visual Step Timestamps**: Automatically identifies key cooking steps and extracts corresponding video frames
- **Intelligent Caching**: Caches processed videos to avoid re-processing and improve performance
- **Real-time Pipeline Tracking**: Monitor the extraction pipeline progress with live status updates
- **Modern Web Interface**: Clean, responsive React frontend for easy video URL input and recipe viewing
- **RESTful API**: FastAPI backend with automatic OpenAPI documentation
- **Cross-Platform**: Works on macOS, Linux, and Windows

## 🏗️ Architecture

The application consists of three main components:

### Backend (FastAPI)
- **Port**: 8000
- **Location**: `backend/`
- **Purpose**: Handles video processing, AI inference, and data caching
- **Key Technologies**: FastAPI, Google's Gemini AI, yt-dlp, YouTube Transcript API

### Frontend (React + TypeScript)
- **Port**: 5173 (development)
- **Location**: `frontend/`
- **Purpose**: User interface for video URL input and recipe visualization
- **Key Technologies**: React, TypeScript, Vite

### Data Pipeline
1. **Video Metadata**: Extract title, description, and duration using yt-dlp
2. **Transcript**: Fetch video transcript using YouTube Transcript API
3. **Recipe Extraction**: Use Gemini AI to parse transcript into structured recipe format
4. **Visual Timestamps**: Identify key cooking steps and their timestamps
5. **Frame Extraction**: Capture video frames at key timestamps using Gemini Vision

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- Google Gemini API key

### One-Command Setup & Run
```bash
# Clone the repository
git clone <repository-url>
cd recipe_extract

# Run setup script (creates virtual environments, installs dependencies)
./setup.sh

# Start both servers
./servers.sh start
```

Visit `http://localhost:5173` in your browser to start extracting recipes!

## 📋 Manual Setup

### Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
export GEMINI_API_KEY="your-gemini-api-key-here"
```

### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install
```

## 🎯 Usage

### Starting Servers

#### Option 1: Start Everything
```bash
./servers.sh start
```

#### Option 2: Start Individually
```bash
# Terminal 1: Start backend
./servers.sh backend

# Terminal 2: Start frontend
./servers.sh frontend
```

### Using the Application

1. **Open your browser** and go to `http://localhost:5173`
2. **Enter a YouTube URL** of a cooking video (e.g., `https://www.youtube.com/watch?v=VIDEO_ID`)
3. **Click "Extract Recipe"** and watch the AI work its magic!
4. **View the structured recipe** with ingredients, instructions, and visual timestamps

### Server Management

```bash
# Check server status
./servers.sh status

# Stop all servers
./servers.sh stop

# View configured ports
./servers.sh ports
```

## 📚 API Documentation

When the backend is running, visit:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Key API Endpoints

- `POST /api/recipe` - Extract recipe from YouTube URL
- `POST /api/visuals` - Extract visual timestamps for key steps
- `GET /api/cache` - List cached videos
- `GET /api/cache/{video_id}` - Get cached recipe data

## 🔧 Configuration

### Environment Variables

#### Backend
- `GEMINI_API_KEY`: Your Google Gemini API key (required)
- `YOUTUBE_API_KEY`: YouTube API key (optional, for enhanced metadata)
- `CORS_ORIGINS`: Comma-separated list of allowed CORS origins (default: `http://localhost:5173`)

#### Frontend
- `VITE_API_BASE_URL`: Backend API base URL (default: `http://localhost:8000`)

### Ports
- **Backend API**: 8000
- **Frontend Dev Server**: 5173

## 🗂️ Project Structure

```
recipe_extract/
├── backend/                 # FastAPI backend
│   ├── main.py             # FastAPI application
│   ├── services.py         # Core business logic
│   ├── cache_manager.py    # Caching functionality
│   ├── requirements.txt    # Python dependencies
│   └── cache/              # Cached video data
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   └── App.tsx         # Main application
│   └── package.json        # Node dependencies
├── docs/                   # Documentation
├── servers.sh              # Server management script
├── setup.sh                # Setup script
└── README.md              # This file
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Development Guidelines

- **Backend**: Follow FastAPI best practices and add type hints
- **Frontend**: Use TypeScript for all components and maintain consistent styling
- **AI Prompts**: All AI prompts must be stored in external files (see [docs/development.md](docs/development.md))
- **Testing**: Test both individual components and end-to-end workflows
- **Documentation**: Update documentation for any new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Gemini AI** for powering the recipe extraction
- **YouTube Transcript API** for video transcript access
- **yt-dlp** for robust video downloading
- **FastAPI** and **React** communities for excellent frameworks

## 🐛 Troubleshooting

### Common Issues

**Backend won't start:**
- Check if port 8000 is available
- Ensure virtual environment is activated
- Verify GEMINI_API_KEY is set

**Frontend won't start:**
- Check if port 5173 is available
- Run `npm install` in frontend directory
- Clear node_modules and reinstall if needed

**Recipe extraction fails:**
- Verify the YouTube URL is valid and public
- Check your Gemini API key is correct and has quota
- Ensure the video has English transcripts

### Getting Help

- Check the [API Documentation](http://localhost:8000/docs) when servers are running
- Review server logs for detailed error messages
- Open an issue on GitHub for bugs or feature requests

---

**Happy Cooking! 🍳✨**

