# Documentation

This directory contains comprehensive documentation for the Recipe Extract project.

## Quick Start

If you're new to the project:

1. **Setup**: Follow the [setup guide](setup.md) to get your development environment running
2. **Usage**: Check the main [README](../README.md) for usage instructions
3. **API**: See [api.md](api.md) for detailed API documentation
4. **Scripts**: Use `../servers.sh` to manage development servers

## Documentation Files

### Project Documentation

- **[../README.md](../README.md)** - Main project README with overview, features, and quick start guide
- **[../servers.sh](../servers.sh)** - Server management script with startup instructions
- **[../setup.sh](../setup.sh)** - Automated setup script for development environment

### Technical Documentation

- **[api.md](api.md)** - Comprehensive API documentation for the FastAPI backend
- **[setup.md](setup.md)** - Detailed setup and installation guide
- **[frontend.md](frontend.md)** - Frontend component documentation

## Development Workflow

### First Time Setup

```bash
# Run automated setup
./setup.sh

# Set your API key
export GEMINI_API_KEY='your-key-here'

# Start development servers
./servers.sh start
```

### Daily Development

```bash
# Start servers
./servers.sh start

# View in browser
# Frontend: http://localhost:5173
# API Docs: http://localhost:8000/docs
```

### Server Management

```bash
./servers.sh status    # Check server status
./servers.sh stop      # Stop all servers
./servers.sh ports     # Show port information
```

## Project Architecture

### Backend (FastAPI)
- **Location**: `../backend/`
- **Port**: 8000
- **Purpose**: Video processing, AI inference, caching
- **Tech**: FastAPI, Google Gemini AI, yt-dlp, YouTube Transcript API

### Frontend (React)
- **Location**: `../frontend/`
- **Port**: 5173 (development)
- **Purpose**: User interface and recipe visualization
- **Tech**: React, TypeScript, Vite

### Data Pipeline
1. Video metadata extraction
2. Transcript fetching
3. AI-powered recipe extraction
4. Visual timestamp identification
5. Frame capture and caching

## Key Features

- **AI Recipe Extraction**: Uses Google Gemini to parse cooking videos
- **Visual Timestamps**: Identifies key steps with video frames
- **Intelligent Caching**: Avoids re-processing videos
- **Real-time Status**: Live pipeline progress updates
- **Modern UI**: Responsive React interface

## API Reference

The backend provides a REST API with the following main endpoints:

- `POST /api/recipe` - Extract recipe from YouTube URL
- `POST /api/visuals` - Get visual timestamps for key steps
- `GET /api/cache` - List cached videos
- `GET /api/cache/{video_id}` - Get cached recipe data

See [api.md](api.md) for complete API documentation.

## Configuration

### Required Environment Variables

- `GEMINI_API_KEY` - Google Gemini API key for AI processing

### Ports

- Backend API: 8000
- Frontend Dev Server: 5173

## Troubleshooting

### Common Issues

- **Setup fails**: Check [setup.md](setup.md) for troubleshooting
- **Servers won't start**: Ensure ports are available
- **API errors**: Verify GEMINI_API_KEY is set correctly
- **Build issues**: Check Node.js/Python versions

### Getting Help

1. Check the relevant documentation file
2. Review error messages in terminal/server logs
3. Test with the provided example URLs
4. Open an issue on the project repository

## Contributing

When contributing:

1. Update relevant documentation
2. Follow the established patterns
3. Test thoroughly before submitting
4. Update this README if adding new docs

---

For the latest information, check the main project [README](../README.md).

