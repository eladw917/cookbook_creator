import os
import json
import re
import subprocess
import tempfile
import base64
from typing import Dict, List, Optional
from youtube_transcript_api import YouTubeTranscriptApi
import yt_dlp
from google import genai
from google.genai import types
import cache_manager
from prompts import recipe_extraction, timestamp_extraction

# Initialize Gemini client
api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
if not api_key:
    raise ValueError("API key not found. Please set GEMINI_API_KEY or GOOGLE_API_KEY environment variable.")
client = genai.Client(api_key=api_key)


def get_video_metadata(url: str) -> dict:
    """Fetch video metadata using yt-dlp"""
    # Extract video ID
    video_id = url.split("v=")[-1].split("&")[0]
    
    # Check cache first
    cached_metadata = cache_manager.load_step(video_id, "metadata")
    if cached_metadata:
        return cached_metadata
    
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
    }
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        metadata = {
            "title": info.get("title"),
            "description": info.get("description"),
            "duration": info.get("duration"),
            "channel_name": info.get("uploader", info.get("channel")),
            "channel_url": info.get("uploader_url", info.get("channel_url")),
        }
        
        # Save to cache
        cache_manager.save_step(video_id, "metadata", metadata)
        return metadata


def get_transcript(video_id: str) -> List[str]:
    """Fetch video transcript using YouTube Transcript API with yt-dlp fallback"""
    print(f"DEBUG: Attempting to fetch transcript for video {video_id}")
    
    # Check cache first
    cached_transcript = cache_manager.load_step(video_id, "transcript")
    if cached_transcript:
        return cached_transcript
    
    # Try official API first
    try:
        print("DEBUG: Trying YouTubeTranscriptApi...")
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['en', 'en-GB'])
        print("DEBUG: YouTubeTranscriptApi success!")
        transcript = [item['text'] for item in transcript_list]
        cache_manager.save_step(video_id, "transcript", transcript)
        return transcript
    except Exception as e:
        print(f"DEBUG: YouTubeTranscriptApi failed: {e}")
        
        # Fallback to yt-dlp
        print("DEBUG: Falling back to yt-dlp...")
        url = f"https://www.youtube.com/watch?v={video_id}"
        ydl_opts = {
            'skip_download': True,
            'writesubtitles': True,
            'writeautomaticsub': True,
            'subtitleslangs': ['en'],
            'quiet': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            print("DEBUG: extracting info with yt-dlp...")
            info = ydl.extract_info(url, download=False)
            
            sub_url = None
            # Check for manual subtitles
            if 'subtitles' in info and 'en' in info['subtitles']:
                print("DEBUG: Found manual subtitles")
                sub_url = info['subtitles']['en'][0]['url']
            # Check for automatic captions
            elif 'automatic_captions' in info and 'en' in info['automatic_captions']:
                print("DEBUG: Found automatic captions")
                sub_url = info['automatic_captions']['en'][0]['url']
            else:
                print("DEBUG: No subtitles found in yt-dlp info")
                raise Exception("No subtitles found")
            
            # Download and parse VTT/JSON3
            print(f"DEBUG: Fetching subtitles from {sub_url[:50]}...")
            import requests
            response = requests.get(sub_url)

            try:
                data = response.json()
                text_segments = []
                if 'events' in data:
                    for event in data['events']:
                        if 'segs' in event:
                            for seg in event['segs']:
                                if 'utf8' in seg and seg['utf8'].strip():
                                    text_segments.append(seg['utf8'])
                print(f"DEBUG: Extracted {len(text_segments)} segments")
                cache_manager.save_step(video_id, "transcript", text_segments)
                return text_segments
            except Exception as e:
                print(f"DEBUG: Failed to parse subtitle JSON: {e}")
                # Try to parse as VTT format if JSON fails
                try:
                    content = response.text
                    print(f"DEBUG: Response content type: {response.headers.get('content-type', 'unknown')}")
                    print(f"DEBUG: Response starts with: {content[:200]}...")

                    # Try to parse VTT format
                    if 'WEBVTT' in content:
                        print("DEBUG: Detected VTT format, attempting to parse...")
                        lines = content.split('\n')
                        text_segments = []
                        for line in lines:
                            line = line.strip()
                            # Skip VTT headers and timing lines
                            if line and not line.startswith('WEBVTT') and not '-->' in line and not line.isdigit():
                                # Remove HTML tags if any
                                import re
                                clean_line = re.sub(r'<[^>]+>', '', line)
                                if clean_line.strip():
                                    text_segments.append(clean_line.strip())
                        if text_segments:
                            print(f"DEBUG: Extracted {len(text_segments)} VTT segments")
                            cache_manager.save_step(video_id, "transcript", text_segments)
                            return text_segments

                    print("DEBUG: Could not parse subtitle content")
                    raise Exception(f"Could not parse subtitle content: {e}")
                except Exception as vtt_e:
                    print(f"DEBUG: VTT parsing also failed: {vtt_e}")
                    raise Exception(f"Subtitle parsing failed for both JSON and VTT formats")


def extract_recipe_gemini(input_data: dict, video_url: str) -> dict:
    """Extract structured recipe using Gemini"""
    print("DEBUG: Starting Gemini recipe extraction...")
    
    # Extract video ID and check cache
    video_id = video_url.split("v=")[-1].split("&")[0]
    cached_recipe = cache_manager.load_step(video_id, "recipe")
    if cached_recipe:
        return cached_recipe
    
    prompt = recipe_extraction.RECIPE_EXTRACTION_PROMPT.format(input_data=json.dumps(input_data))
    
    try:
        print("DEBUG: Sending request to Gemini...")
        response = client.models.generate_content(
            model='models/gemini-2.0-flash',
            contents=prompt,
        )
        print("DEBUG: Received response from Gemini")
        
        # Extract JSON from response
        json_pattern = r'```(?:json)?\s*(\{.*?\})\s*```'
        matches = re.findall(json_pattern, response.text, re.DOTALL)
        
        if matches:
            print("DEBUG: Found JSON block in response")
            recipe = json.loads(matches[0])
            cache_manager.save_step(video_id, "recipe", recipe)
            return recipe
        else:
            print("DEBUG: No JSON block found, trying to parse full text")
            # Try to parse the entire response as JSON
            recipe = json.loads(response.text)
            cache_manager.save_step(video_id, "recipe", recipe)
            return recipe
            
    except Exception as e:
        print(f"DEBUG: Gemini extraction failed: {e}")
        raise e


def extract_timestamps_gemini(video_url: str, key_steps: dict) -> dict:
    """Extract timestamps for key steps using Gemini with video"""
    
    # Extract video ID and check cache
    video_id = video_url.split("v=")[-1].split("&")[0]
    cached_timestamps = cache_manager.load_step(video_id, "timestamps")
    if cached_timestamps:
        return cached_timestamps
    
    key_steps_json = json.dumps(key_steps)
    
    prompt = timestamp_extraction.TIMESTAMP_EXTRACTION_PROMPT.format(key_steps_json=key_steps_json)
    
    print("DEBUG: Sending video to Gemini for timestamp analysis...")
    video_id = video_url.split("v=")[-1].split("&")[0]
    
    try:
        response = client.models.generate_content(
            model='models/gemini-2.5-flash',
            contents=types.Content(
                parts=[
                    types.Part(
                        file_data=types.FileData(file_uri=f'https://www.youtube.com/watch?v={video_id}')
                    ),
                    types.Part(text=prompt)
                ]
            )
        )
        
        print("DEBUG: Received timestamp response from Gemini")
        
        # Extract JSON from response
        json_pattern = r'```(?:json)?\s*(\{.*?\})\s*```'
        matches = re.findall(json_pattern, response.text, re.DOTALL)
        
        if matches:
            timestamps = json.loads(matches[0])
            print(f"DEBUG: Extracted timestamps: {timestamps}")
            cache_manager.save_step(video_id, "timestamps", timestamps)
            return timestamps
        else:
            # Try to parse the entire response as JSON
            timestamps = json.loads(response.text)
            print(f"DEBUG: Extracted timestamps: {timestamps}")
            cache_manager.save_step(video_id, "timestamps", timestamps)
            return timestamps
            
    except Exception as e:
        print(f"DEBUG: Timestamp extraction failed: {e}")
        raise e


def timestamp_to_seconds(timestamp: str) -> float:
    """Convert timestamp string to seconds"""
    parts = timestamp.split(':')
    if len(parts) == 3:
        return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    elif len(parts) == 2:
        return int(parts[0]) * 60 + int(parts[1])
    else:
        return float(parts[0])


def extract_frame_at_time(video_url: str, timestamp_seconds: float) -> bytes:
    """Extract a single frame at specific timestamp using ffmpeg"""
    print(f"DEBUG: Extracting frame at {timestamp_seconds}s...")
    # Convert seconds to HH:MM:SS format for ffmpeg
    hours = int(timestamp_seconds // 3600)
    minutes = int((timestamp_seconds % 3600) // 60)
    seconds = int(timestamp_seconds % 60)
    timestamp_str = f"{hours:02d}:{minutes:02d}:{seconds:02d}"

    # Download video once (best MP4) then seek locally — mirrors the working notebook flow
    tmp_dir = tempfile.mkdtemp(prefix="frame_extract_")
    video_path = os.path.join(tmp_dir, "video.%(ext)s")
    frame_path = os.path.join(tmp_dir, "frame.jpg")

    try:
        # Download the video (best mp4 or best available)
        ydl_opts = {
            "format": 'bestvideo[ext=mp4]/best[ext=mp4]/best',
            "outtmpl": video_path,
            "quiet": True,
            "no_warnings": True,
        }

        print("DEBUG: Downloading video for frame extraction...")
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=True)
            ext = info.get("ext", "mp4")
            downloaded_path = video_path.replace("%(ext)s", ext)

        if not os.path.exists(downloaded_path):
            raise Exception("Video download failed; file not found")

        # Extract the frame locally
        print("DEBUG: Running ffmpeg on downloaded video...")
        ffmpeg_cmd = [
            "ffmpeg",
            "-ss",
            timestamp_str,
            "-i",
            downloaded_path,
            "-frames:v",
            "1",
            "-q:v",
            "2",
            "-y",
            frame_path,
        ]

        result = subprocess.run(
            ffmpeg_cmd,
            capture_output=True,
            text=True,
            timeout=90,
        )

        if result.returncode != 0:
            print(f"DEBUG: ffmpeg failed: {result.stderr[-500:]}")
            raise Exception("ffmpeg failed to extract frame")

        if os.path.exists(frame_path):
            file_size = os.path.getsize(frame_path)
            print(f"DEBUG: Frame extracted successfully ({file_size} bytes)")
            with open(frame_path, "rb") as f:
                return f.read()

        raise Exception("Frame file was not created")

    except subprocess.TimeoutExpired:
        print("DEBUG: ffmpeg command timed out")
        raise Exception("Frame extraction timed out")
    except Exception as e:
        print(f"DEBUG: Extraction error: {str(e)}")
        raise
    finally:
        # Clean up temp files
        try:
            if os.path.exists(frame_path):
                os.remove(frame_path)
            # Remove downloaded video(s)
            for file in os.listdir(tmp_dir):
                try:
                    os.remove(os.path.join(tmp_dir, file))
                except Exception:
                    pass
            os.rmdir(tmp_dir)
        except Exception:
            pass


def extract_best_frame(video_url: str, timestamp: str, step_instruction: str, step_number: str) -> str:
    """
    Extract frame at the given timestamp or time range.
    Returns base64 encoded image.
    """
    print(f"DEBUG: Extracting frame for step {step_number}: {step_instruction[:50]}...")
    
    # Extract video ID and check cache
    video_id = video_url.split("v=")[-1].split("&")[0]
    cached_frame = cache_manager.load_frame(video_id, step_number)
    if cached_frame:
        frame_base64 = base64.b64encode(cached_frame).decode('utf-8')
        return frame_base64
    
    # Check if timestamp is a range (e.g., "1:23-1:28")
    if '-' in timestamp and timestamp.count('-') == 1:
        # Parse time range
        start_time, end_time = timestamp.split('-')
        start_seconds = timestamp_to_seconds(start_time)
        end_seconds = timestamp_to_seconds(end_time)
        
        # Extract from the middle of the range for best results
        timestamp_seconds = (start_seconds + end_seconds) / 2
        print(f"DEBUG: Time range {timestamp} -> extracting at middle: {timestamp_seconds}s")
    else:
        # Single timestamp
        timestamp_seconds = timestamp_to_seconds(timestamp)
    
    try:
        frame_data = extract_frame_at_time(video_url, timestamp_seconds)
        # Save to cache
        cache_manager.save_frame(video_id, step_number, frame_data)
        frame_base64 = base64.b64encode(frame_data).decode('utf-8')
        return frame_base64
    except Exception as e:
        print(f"DEBUG: Failed to extract frame: {e}")
        return None
