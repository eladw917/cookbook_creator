import os
import json
from pathlib import Path
from typing import Optional, Dict, Any

# Base directory for storing video processing data
CACHE_DIR = Path("/Users/eladweller/receipe_extract/backend/cache")


def get_video_cache_dir(video_id: str) -> Path:
    """Get the cache directory for a specific video"""
    video_dir = CACHE_DIR / video_id
    video_dir.mkdir(parents=True, exist_ok=True)
    return video_dir


def save_step(video_id: str, step_name: str, data: Any) -> None:
    """Save data for a specific step"""
    video_dir = get_video_cache_dir(video_id)
    file_path = video_dir / f"{step_name}.json"
    
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"DEBUG: Saved {step_name} to cache for video {video_id}")


def load_step(video_id: str, step_name: str) -> Optional[Any]:
    """Load data for a specific step if it exists"""
    video_dir = get_video_cache_dir(video_id)
    file_path = video_dir / f"{step_name}.json"
    
    if file_path.exists():
        with open(file_path, 'r') as f:
            data = json.load(f)
        print(f"DEBUG: Loaded {step_name} from cache for video {video_id}")
        return data
    
    return None


def save_frame(video_id: str, step_number: str, frame_data: bytes) -> str:
    """Save a frame image and return the relative path"""
    video_dir = get_video_cache_dir(video_id)
    frames_dir = video_dir / "frames"
    frames_dir.mkdir(exist_ok=True)
    
    frame_path = frames_dir / f"step_{step_number}.jpg"
    
    with open(frame_path, 'wb') as f:
        f.write(frame_data)
    
    print(f"DEBUG: Saved frame for step {step_number} to cache")
    return str(frame_path)


def load_frame(video_id: str, step_number: str) -> Optional[bytes]:
    """Load a frame image if it exists"""
    video_dir = get_video_cache_dir(video_id)
    frame_path = video_dir / "frames" / f"step_{step_number}.jpg"
    
    if frame_path.exists():
        with open(frame_path, 'rb') as f:
            frame_data = f.read()
        print(f"DEBUG: Loaded frame for step {step_number} from cache")
        return frame_data
    
    return None


def get_pipeline_status(video_id: str) -> Dict[str, bool]:
    """Get the status of all pipeline steps for a video"""
    video_dir = get_video_cache_dir(video_id)
    
    status = {
        "metadata": (video_dir / "metadata.json").exists(),
        "transcript": (video_dir / "transcript.json").exists(),
        "recipe": (video_dir / "recipe.json").exists(),
        "timestamps": (video_dir / "timestamps.json").exists(),
        "frames": (video_dir / "frames").exists() and len(list((video_dir / "frames").glob("*.jpg"))) > 0
    }
    
    return status


def clear_cache(video_id: str) -> None:
    """Clear all cached data for a video"""
    import shutil
    video_dir = get_video_cache_dir(video_id)
    
    if video_dir.exists():
        shutil.rmtree(video_dir)
        print(f"DEBUG: Cleared cache for video {video_id}")


def clear_step(video_id: str, step_name: str) -> None:
    """Clear a specific pipeline step"""
    import shutil
    video_dir = get_video_cache_dir(video_id)
    
    if step_name == "frames":
        frames_dir = video_dir / "frames"
        if frames_dir.exists():
            shutil.rmtree(frames_dir)
            print(f"DEBUG: Cleared frames for video {video_id}")
    else:
        file_path = video_dir / f"{step_name}.json"
        if file_path.exists():
            file_path.unlink()
            print(f"DEBUG: Cleared {step_name} for video {video_id}")


def list_cached_videos() -> list:
    """List all cached videos with their pipeline status"""
    if not CACHE_DIR.exists():
        return []
    
    cached_videos = []
    for video_dir in CACHE_DIR.iterdir():
        if video_dir.is_dir():
            video_id = video_dir.name
            status = get_pipeline_status(video_id)
            
            # Load metadata to get video title
            metadata = load_step(video_id, "metadata")
            title = metadata.get("title", "Unknown") if metadata else "Unknown"
            
            cached_videos.append({
                "video_id": video_id,
                "title": title,
                "pipeline_status": status
            })
    
    return cached_videos
