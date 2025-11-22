# Recipe Extract API Documentation

This document provides comprehensive documentation for the Recipe Extract REST API built with FastAPI.

## Overview

The Recipe Extract API provides endpoints for extracting structured recipes from YouTube cooking videos using AI. The API handles video processing, caching, and provides real-time pipeline status updates.

**Base URL**: `http://localhost:8000` (when running locally)

**API Documentation**:
- Interactive Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Authentication

Currently, the API does not require authentication. However, you must provide a valid `GEMINI_API_KEY` environment variable for AI-powered recipe extraction to work.

## Endpoints

### Recipe Extraction

#### POST `/api/recipe`

Extract a structured recipe from a YouTube video URL.

**Request Body**:
```json
{
  "url": "string"  // YouTube video URL (required)
}
```

**Response** (200 OK):
```json
{
  "title": "string",
  "servings": "string",
  "prep_time": "string",
  "cook_time": "string",
  "total_time": "string",
  "difficulty": "string",
  "description": "string",
  "ingredients": [
    {
      "quantity": "string",
      "unit": "string",
      "ingredient": "string"
    }
  ],
  "instructions": [
    {
      "step_number": number,
      "category": "string",
      "instruction": "string",
      "is_key_step": boolean
    }
  ]
}
```

**Error Responses**:
- `400 Bad Request`: Invalid URL format
- `500 Internal Server Error`: Processing failed (check server logs)

**Example Request**:
```bash
curl -X POST "http://localhost:8000/api/recipe" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://www.youtube.com/watch?v=VIDEO_ID"}'
```

#### POST `/api/visuals`

Extract timestamps and visual frames for key cooking steps.

**Request Body**:
```json
{
  "url": "string",           // YouTube video URL (required)
  "key_steps": {             // Object mapping step numbers to instructions (required)
    "1": "Chop the onions finely",
    "3": "Add tomatoes to the pan",
    "5": "Stir in the spices"
  }
}
```

**Response** (200 OK):
```json
{
  "1": {
    "timestamp": "00:02:15",
    "frame_base64": "iVBORw0KGgoAAAANSUhEUgAA..."
  },
  "3": {
    "timestamp": "00:05:42",
    "frame_base64": "iVBORw0KGgoAAAANSUhEUgAA..."
  },
  "5": {
    "timestamp": null,
    "frame_base64": null
  }
}
```

**Notes**:
- Only key steps (marked as `is_key_step: true` in recipe extraction) should be included
- Timestamps are in `HH:MM:SS` format
- Frame images are returned as base64-encoded JPEG data
- If a timestamp cannot be determined, both `timestamp` and `frame_base64` will be `null`

### Cache Management

#### GET `/api/cache`

List all cached videos with their pipeline status.

**Response** (200 OK):
```json
{
  "videos": [
    {
      "video_id": "VIDEO_ID_1",
      "url": "https://www.youtube.com/watch?v=VIDEO_ID_1",
      "status": {
        "metadata": true,
        "transcript": true,
        "recipe": true,
        "timestamps": false,
        "frames": false
      },
      "last_updated": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**Status Fields**:
- `metadata`: Video metadata extracted
- `transcript`: Video transcript fetched
- `recipe`: Recipe structure extracted
- `timestamps`: Visual timestamps identified
- `frames`: Video frames captured

#### GET `/api/cache/{video_id}`

Get cached recipe data for a specific video.

**Path Parameters**:
- `video_id`: YouTube video ID (string)

**Response** (200 OK):
```json
{
  "video_id": "VIDEO_ID",
  "metadata": {
    "title": "Delicious Pasta Recipe",
    "description": "Learn how to make authentic Italian pasta...",
    "duration": 1200
  },
  "recipe": {
    // Full recipe object (same as /api/recipe response)
  },
  "timestamps": {
    // Timestamp mappings (same as /api/visuals response)
  },
  "pipeline_status": {
    // Status object (same as in /api/cache response)
  }
}
```

**Error Responses**:
- `404 Not Found`: Video not found in cache

#### GET `/api/cache/{video_id}/status`

Get the pipeline status for a specific video.

**Path Parameters**:
- `video_id`: YouTube video ID (string)

**Response** (200 OK):
```json
{
  "metadata": true,
  "transcript": true,
  "recipe": true,
  "timestamps": false,
  "frames": false
}
```

#### DELETE `/api/cache/{video_id}`

Clear all cached data for a specific video.

**Path Parameters**:
- `video_id`: YouTube video ID (string)

**Response** (200 OK):
```json
{
  "message": "Cache cleared for video VIDEO_ID"
}
```

#### DELETE `/api/cache/{video_id}/{step_name}`

Clear a specific pipeline step for a video.

**Path Parameters**:
- `video_id`: YouTube video ID (string)
- `step_name`: Pipeline step name (string)

**Valid Step Names**:
- `metadata`
- `transcript`
- `recipe`
- `timestamps`
- `frames`

**Response** (200 OK):
```json
{
  "message": "Cleared step_name for video VIDEO_ID"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid step name

### Health Check

#### GET `/`

Basic health check endpoint.

**Response** (200 OK):
```json
{
  "message": "Recipe Extract API"
}
```

## Data Models

### RecipeRequest
```typescript
{
  url: string;  // YouTube video URL
}
```

### VisualsRequest
```typescript
{
  url: string;           // YouTube video URL
  key_steps: {           // Key step instructions by step number
    [stepNumber: string]: string;
  };
}
```

### Recipe
```typescript
{
  title: string;
  servings: string;
  prep_time: string;
  cook_time: string;
  total_time: string;
  difficulty: string;
  description: string;
  ingredients: Ingredient[];
  instructions: Instruction[];
}
```

### Ingredient
```typescript
{
  quantity: string;
  unit: string;
  ingredient: string;
}
```

### Instruction
```typescript
{
  step_number: number;
  category: string;      // e.g., "prep", "cook", "serve"
  instruction: string;
  is_key_step?: boolean; // Whether this step has visual timestamps
}
```

### PipelineStatus
```typescript
{
  metadata: boolean;   // Video metadata extracted
  transcript: boolean; // Transcript fetched
  recipe: boolean;     // Recipe structure extracted
  timestamps: boolean; // Timestamps identified
  frames: boolean;     // Frames captured
}
```

## Error Handling

All API errors follow a consistent format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

### Common Error Codes

- `400 Bad Request`: Invalid input data or parameters
- `404 Not Found`: Requested resource doesn't exist
- `422 Unprocessable Entity`: Validation error (FastAPI automatic)
- `500 Internal Server Error`: Server-side processing error

## Rate Limiting

Currently, there are no rate limits implemented. However, be mindful of:

- **Gemini API quotas**: Google imposes rate limits and costs on AI requests
- **YouTube API limits**: If using YouTube API for enhanced metadata
- **Server resources**: Large videos may require significant processing time

## Caching Strategy

The API implements intelligent caching to improve performance:

- **Video metadata**: Cached permanently (title, description, duration)
- **Transcripts**: Cached permanently (YouTube transcript data)
- **Recipes**: Cached permanently (AI-extracted recipe structure)
- **Timestamps**: Cached permanently (AI-identified step timestamps)
- **Frames**: Cached permanently (Base64-encoded video frames)

Cache is stored locally in the `backend/cache/` directory with the following structure:
```
cache/
├── VIDEO_ID_1/
│   ├── metadata.json
│   ├── transcript.json
│   ├── recipe.json
│   ├── timestamps.json
│   └── frames/
│       ├── step_1.jpg
│       ├── step_3.jpg
│       └── ...
```

## Best Practices

### For Frontend Integration

1. **Handle Loading States**: Recipe extraction can take 30-60 seconds
2. **Cache Awareness**: Check cache status before making extraction requests
3. **Error Handling**: Always handle network errors and API failures gracefully
4. **Progressive Loading**: Show recipe data as it becomes available

### For API Usage

1. **URL Validation**: Ensure YouTube URLs are valid before sending requests
2. **Step Selection**: Only send key steps to `/api/visuals` endpoint
3. **Caching**: Leverage the cache endpoints to avoid redundant processing
4. **Monitoring**: Use pipeline status endpoints to track processing progress

## Development

### Running Locally

```bash
# Start backend server
cd backend
python main.py

# API docs available at http://localhost:8000/docs
```

### Testing API Endpoints

```bash
# Health check
curl http://localhost:8000/

# Extract recipe
curl -X POST http://localhost:8000/api/recipe \
     -H "Content-Type: application/json" \
     -d '{"url": "https://www.youtube.com/watch?v=VIDEO_ID"}'

# Check cache
curl http://localhost:8000/api/cache
```

## Troubleshooting

### Common Issues

**"Failed to extract recipe"**
- Check server logs for detailed error messages
- Verify GEMINI_API_KEY is set correctly
- Ensure YouTube video is public and has English transcripts

**"Video not found in cache"**
- Video may not have been processed yet
- Check if video ID is correct
- Try extracting the recipe first

**Slow response times**
- First-time processing can take 1-2 minutes
- Check cache status to see processing progress
- Subsequent requests for same video will be fast

For additional support, check the server logs or open an issue on the project repository.




