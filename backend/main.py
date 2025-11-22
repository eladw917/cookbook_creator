from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import os
from typing import Optional
import io

from services import (
    get_video_metadata,
    get_transcript,
    extract_recipe_gemini,
    extract_timestamps_gemini,
    extract_best_frame
)

app = FastAPI(title="Recipe Extract API")

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RecipeRequest(BaseModel):
    url: str


class VisualsRequest(BaseModel):
    url: str
    key_steps: dict  # {step_number: instruction}


@app.get("/")
async def root():
    return {"message": "Recipe Extract API"}


@app.post("/api/recipe")
async def extract_recipe(request: RecipeRequest):
    """Extract structured recipe from YouTube URL"""
    try:
        # Extract video ID from URL
        video_id = request.url.split("v=")[-1].split("&")[0]
        
        # Get metadata and transcript
        metadata = get_video_metadata(request.url)
        transcript = get_transcript(video_id)
        
        # Combine into input JSON
        input_data = {
            "title": metadata.get("title"),
            "description": metadata.get("description"),
            "transcript": transcript
        }
        
        # Extract recipe using Gemini
        recipe = extract_recipe_gemini(input_data, request.url)
        
        return recipe
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/visuals")
async def extract_visuals(request: VisualsRequest):
    """Extract timestamps and best frames for key steps"""
    try:
        video_id = request.url.split("v=")[-1].split("&")[0]
        
        # Get timestamps from Gemini
        timestamps = extract_timestamps_gemini(request.url, request.key_steps)
        
        # For each timestamp, extract best frame using Gemini Vision
        results = {}
        for step_num, timestamp in timestamps.items():
            if timestamp and timestamp != "null":
                # Extract frame
                best_frame_data = extract_best_frame(
                    request.url,
                    timestamp,
                    request.key_steps.get(step_num, ""),
                    step_num  # Pass step number for caching
                )
                results[step_num] = {
                    "timestamp": timestamp,
                    "frame_base64": best_frame_data
                }
            else:
                results[step_num] = {
                    "timestamp": None,
                    "frame_base64": None
                }
        
        return results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/cache")
async def list_cache():
    """List all cached videos with their pipeline status"""
    import cache_manager
    try:
        cached_videos = cache_manager.list_cached_videos()
        return {"videos": cached_videos}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/cache/{video_id}/status")
async def get_cache_status(video_id: str):
    """Get the pipeline status for a specific video"""
    import cache_manager
    try:
        status = cache_manager.get_pipeline_status(video_id)
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/cache/{video_id}")
async def get_cached_recipe(video_id: str):
    """Get a cached recipe by video ID"""
    import cache_manager
    try:
        # Load all cached data
        metadata = cache_manager.load_step(video_id, "metadata")
        recipe = cache_manager.load_step(video_id, "recipe")
        timestamps = cache_manager.load_step(video_id, "timestamps")
        status = cache_manager.get_pipeline_status(video_id)
        
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found in cache")
        
        return {
            "video_id": video_id,
            "metadata": metadata,
            "recipe": recipe,
            "timestamps": timestamps,
            "pipeline_status": status
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/cache/{video_id}")
async def clear_video_cache(video_id: str):
    """Clear all cache for a specific video"""
    import cache_manager
    try:
        cache_manager.clear_cache(video_id)
        return {"message": f"Cache cleared for video {video_id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/cache/{video_id}/{step_name}")
async def clear_cache_step(video_id: str, step_name: str):
    """Clear a specific pipeline step for a video"""
    import cache_manager
    try:
        valid_steps = ["metadata", "transcript", "recipe", "timestamps", "frames"]
        if step_name not in valid_steps:
            raise HTTPException(status_code=400, detail=f"Invalid step name. Must be one of: {valid_steps}")
        
        cache_manager.clear_step(video_id, step_name)
        return {"message": f"Cleared {step_name} for video {video_id}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
