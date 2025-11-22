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

# Initialize Gemini client
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY environment variable is required")
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
                raise e


def extract_recipe_gemini(input_data: dict, video_url: str) -> dict:
    """Extract structured recipe using Gemini"""
    print("DEBUG: Starting Gemini recipe extraction...")
    
    # Extract video ID and check cache
    video_id = video_url.split("v=")[-1].split("&")[0]
    cached_recipe = cache_manager.load_step(video_id, "recipe")
    if cached_recipe:
        return cached_recipe
    
    prompt = f"""
PROMPT: Recipe Standardization from YouTube Video


You will be provided with content from a YouTube recipe video in JSON format that includes:
1. Video title (typically a catchy YouTube-style title)
2. Video description (may contain ingredients, notes, or other recipe information)
3. Video transcript as a list of text segments in chronological order (the order they appear in the video)


Your task is to extract the recipe information from these sources and convert it into a standardized JSON format.


**IMPORTANT: The output must ALWAYS be in English, regardless of the language of the input video title, description, or transcript.**


Convert the recipe into this standardized JSON format with these exact specifications:


**OUTPUT JSON STRUCTURE:**
{{
 "title": "Recipe Title in Title Case",
 "description": "A compelling 2-4 sentence description of the recipe",
 "servings": "Serves: X" or "Yields: X units",
 "prep_time": "X minutes/hours",
 "cook_time": "X minutes/hours",
 "total_time": "X minutes/hours",
 "difficulty": "Easy" | "Intermediate" | "Advanced",
 "ingredients": [
   {{
     "quantity": "numeric value or range",
     "unit": "measurement unit or 'unit'/'units'",
     "ingredient": "ingredient name with preparation notes if needed"
   }}
 ],
 "instructions": [
   {{
     "step_number": 1,
     "category": "Prep" | "Cook" | "Plate/Finalize/Serve",
     "instruction": "Detailed instruction text",
     "is_key_step": true
   }}
 ]
}}


**FIELD SPECIFICATIONS:**


**title**
- Single line, title case
- Should be descriptive and appetizing
- Extract from the video title, but refine it to be clear and recipe-focused
- Remove YouTube clickbait elements (e.g., "BEST EVER", "You Won't Believe", emojis, all caps)
- Keep the core dish name and any key descriptors (e.g., "Restaurant-Style Guacamole", "Crispy Oven-Baked Chicken")
- Translate to English if in another language


**description**
- A compelling, informative description of the recipe (2-4 sentences, approximately 50-100 words)
- Extract contextual information from the video transcript and description
- Should include:
  - General overview: What the dish is and what makes it special or unique
  - Occasions/use cases: What it's good for (e.g., "perfect for summer gatherings", "ideal comfort food")
  - Dish type/cuisine: Type of dish and cuisine style if mentioned (e.g., "Italian classic", "Asian-inspired fusion")
  - When to eat: Meal timing or seasonal context (e.g., "great for breakfast", "winter warmer", "light lunch")
  - Background/context: Cultural background, origin story, or interesting facts if mentioned in the video
- Tone: Warm, inviting, and appetizing - make readers want to cook this dish
- Focus on benefits and appeal rather than just restating ingredients
- Extract from what the chef says in the transcript, not just the video metadata
- Example: "This classic French ratatouille is a celebration of summer vegetables at their peak. Perfect as a light main course or hearty side dish, it's ideal for al fresco dining. The slow-roasting technique brings out incredible depth of flavor, making it a favorite in Provence for generations."


**servings**
- Format: "Serves: [number]" OR "Yields: [quantity and unit]"
- Be specific (e.g., "Serves: 4-6" or "Yields: 24 cookies")
- If not explicitly stated, estimate based on the recipe


**prep_time, cook_time, total_time**
- Format: "[X] minutes" or "[X] hours"
- Extract from description or estimate based on the transcript
- total_time should equal prep + cook + any passive time (cooling, resting, etc.)


**difficulty**
- Choose one: "Easy", "Intermediate", or "Advanced"
- Guidelines:
 - Easy: Minimal skills, basic techniques, few steps
 - Intermediate: Some cooking experience needed, multiple techniques
 - Advanced: Complex techniques, precise timing, many components
- Base this on the complexity shown in the video


**ingredients**
- Array of ingredient objects
- Extract all ingredients from the description and/or transcript
- List in order of use
- quantity: numeric value (e.g., "3", "1/2", "1/4")
- unit: standard measurements (cups, tablespoons, teaspoons, ounces, grams, ml, etc.)
 - For countable items, use "units" (plural) or "unit" (singular)
 - Use "-" for items without specific quantities
- ingredient: name of ingredient with preparation details (e.g., "diced", "minced", "at room temperature")
- Group ingredients by component if recipe has multiple parts (add ingredient objects with descriptive text like "For the dough:")
- If measurements are mentioned in the transcript but not the description, use those


**instructions**
- Array of instruction objects
- Extract steps from the video transcript list in chronological order
- step_number: sequential number starting from 1
- category: "Prep", "Cook", or "Plate/Finalize/Serve"
 - Prep: All preparation work before cooking begins (chopping, measuring, mixing, preheating)
 - Cook: Active cooking process (sautéing, baking, boiling, frying, simmering)
 - Plate/Finalize/Serve: Assembly, presentation, garnishing, and final touches
- instruction: Clear, detailed step
 - Use imperative/command form (start with verbs: "Preheat", "Mix", "Add", "Cook")
 - Be specific about temperatures, times, and visual cues mentioned in the video
 - Include "why" when helpful (e.g., "until golden brown" or "until doubled in size")
 - Ignore filler words and casual conversation - focus only on actual cooking instructions
 - CRITICAL: Do NOT repeat ingredient quantities in instructions. Simply refer to ingredient by name (e.g., "Add flour" not "Add 300g flour")
 - EXCEPTION: Only specify quantities if using a portion of an ingredient (e.g., "Add half of the milk" or "Reserve 2 tablespoons of the mixture")
- is_key_step: ONLY include this field when the value is true
 - Mark steps where a visual/image would be most important for understanding the recipe
 - Key steps typically include: critical technique demonstrations, visual doneness checks, assembly stages, plating/presentation, or transformation moments
 - REQUIREMENTS:
   * Target approximately 1/4 (25%) of total steps as key steps
   * Minimum 3 key steps per recipe
   * Distribute key steps throughout the recipe (prep, cook, and serve phases)
 - Examples of key steps: "until edges are golden brown", "fold gently until combined", "flip crêpe", "mash until chunky", "final plating"
 - IMPORTANT: Do NOT include "is_key_step": false. Only add "is_key_step": true when a step is key.


---


Now please convert this recipe:


INPUT JSON:


{json.dumps(input_data)}
"""
    
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
    
    prompt = f"""
# YouTube Cooking Video Timestamp Analysis Assistant

## Role
You are a specialized video analysis assistant designed to identify precise timestamps for specific cooking steps in YouTube long-form recipe videos, as well as the best visual representation of the completed dish.

## Primary Objective
Analyze the provided YouTube cooking video and identify:
1. The exact start time (timestamp) for each cooking step listed in the JSON object below
2. The timestamp showing the **best visual representation of the completed dish**

Prioritize the best demonstration of each step that provides maximum clarity and instructional value for home cooks.

## Analysis Instructions

### Timestamp Selection Criteria:

**For Cooking Steps:**
1. **Best Demonstration Priority**: When a cooking step occurs multiple times, choose the clearest, most instructive occurrence
2. **Visual Clarity**: Select moments with optimal camera angles and lighting that show the technique clearly
3. **Peak Action Focus**: Identify the **middle or peak of the action**, NOT when it's first mentioned or when preparation begins
   - For "crack eggs": timestamp when the egg is being cracked, not when they pick up the egg
   - For "whisk": timestamp when they're actively whisking, not when they pick up the whisk
   - For "flip": timestamp during the flip motion, not before
4. **Timing Buffer**: Add 3-5 seconds to the moment when the action is first mentioned to capture the actual execution
5. **Instructional Value**: Choose timestamps that best serve someone learning the cooking technique

**For Completed Dish Representation:**
1. **End of Video Priority**: ALWAYS select the timestamp from the final segment of the video, typically during the plating and presentation phase
2. **Stable Shot Required**: Choose a moment when the dish is FULLY visible and stable on screen - NOT during transitions, fade-ins, fade-outs, or camera movements
3. **Wait for Full Reveal**: If the dish appears during a transition or fade-in, wait 2-3 seconds after the transition completes to ensure the shot is stable and fully revealed
4. **Visual Appeal**: Choose the moment with the most attractive, well-lit presentation of the finished dish
5. **Completeness**: Ensure all components of the dish are visible and properly arranged
6. **Plating Focus**: Prioritize shots where the dish is fully plated and styled for final presentation
7. **Clarity**: Select a stable, clear shot rather than quick glimpses or transitions
8. **Clean Framing**: Avoid timestamps with text overlays, logos, faces, or transitions
9. **Timing**: Look specifically in the last 1-3 minutes of the video where the finished dish is typically showcased

### Precision Standards:
- Identify the **peak moment** of the cooking action, not the beginning
- Add 3-5 seconds buffer from when the step is first mentioned to when it's actually performed
- Focus on actual execution rather than preparation or discussion phases
- For dish visuals, add 2-3 seconds after any transition to ensure a stable, fully-revealed shot

### Quality Assurance:
- Only provide timestamps when you can confidently identify the step
- Return `null` for any step you cannot locate with certainty
- Ensure selected moments provide clear visual understanding of the technique
- For the dish representation, ensure it matches the described dish and comes from the END of the video
- **CRITICAL**: Verify the dish_visual timestamp shows a STABLE, FULLY-REVEALED shot with NO active transitions

## Output Requirements

**CRITICAL**: Your response must be exclusively a single, valid JSON object with no additional text, explanations, or commentary.

### Format Specifications:
- **Keys**:
  - Use exact step numbers from the input JSON (maintain as strings)
  - Use `"dish_visual"` as the key for the completed dish timestamp
- **Values**: Time range strings in "M:SS-M:SS" or "MM:SS-MM:SS" format (5-10 second ranges)
  - Example: "1:23-1:28" means the action occurs somewhere between 1:23 and 1:28
  - Provide a range that captures the peak action moment
- **Unknown Steps**: Use `null` for steps that cannot be confidently identified
- **JSON Standards**: Proper quotation marks, commas, and bracket formatting
- **Key Order**: Always place `"dish_visual"` as the LAST key in the JSON object

### Example Output:
```json
{{
  "2": "1:23-1:28",
  "6": "4:17-4:22",
  "7": "5:42-5:47",
  "dish_visual": "12:45-12:50"
}}
```

## Constraints
- Provide only the final JSON timestamp mapping
- No explanatory text, reasoning, or additional commentary
- No markdown formatting or code blocks in the response
- Focus exclusively on YouTube video format optimization
- Maintain exact key formatting from input JSON
- Always include the `"dish_visual"` key as the LAST item in the output
- The `"dish_visual"` timestamp MUST come from the end/conclusion of the video
- The `"dish_visual"` timestamp MUST show a stable, fully-revealed shot with NO transitions

---

## INPUT

### Steps to Locate:
{key_steps_json}
"""
    
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
    
    # Create temp file for output
    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp_frame:
        frame_path = tmp_frame.name
    
    try:
        # Use the notebook's approach: get URL with yt-dlp -g and pass to ffmpeg in one shell command
        # This minimizes URL expiration risk and avoids downloading the full video
        command = f'''URL=$(yt-dlp -f "bestvideo[ext=mp4]/best[ext=mp4]/best" -g "{video_url}" 2>/dev/null | head -1) && ffmpeg -ss {timestamp_str} -i "$URL" -frames:v 1 -q:v 2 "{frame_path}" -y 2>&1 | tail -5'''
        
        print(f"DEBUG: Running shell command to extract frame...")
        result = subprocess.run(
            command,
            shell=True,
            executable='/bin/bash',
            capture_output=True,
            text=True,
            timeout=30
        )
        
        # Check if the file was actually created
        if os.path.exists(frame_path):
            file_size = os.path.getsize(frame_path)
            print(f"DEBUG: Frame extracted successfully ({file_size} bytes)")
            
            # Read the frame
            with open(frame_path, 'rb') as f:
                frame_data = f.read()
            
            return frame_data
        else:
            raise Exception('Frame file was not created')
            
    except subprocess.TimeoutExpired:
        print(f"DEBUG: Command timed out after 30 seconds")
        raise Exception("Frame extraction timed out")
    except Exception as e:
        print(f"DEBUG: Extraction error: {str(e)}")
        if result.stderr:
            print(f"DEBUG: stderr: {result.stderr[-500:]}")
        raise
    finally:
        # Clean up temp file
        if os.path.exists(frame_path):
            os.remove(frame_path)


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
