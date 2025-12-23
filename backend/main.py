from fastapi import FastAPI, HTTPException, Query, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response, RedirectResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import os
from typing import Optional, List
import io
from dotenv import load_dotenv
from sqlalchemy.orm import Session

# Load environment variables from .env file BEFORE importing services
import os
if os.path.exists('.env'):
    load_dotenv()

# Now import services after .env is loaded
from services import (
    get_video_metadata,
    get_transcript,
    extract_recipe_gemini,
    extract_timestamps_gemini,
    extract_best_frame,
    validate_is_recipe_video
)
import pdf_service
import database
import models
import crud
import auth

# Initialize database
database.init_db()

app = FastAPI(title="Recipe Extract API")


async def generate_pdf_background(video_id: str, force_regenerate: bool = False):
    """Background task to generate PDF after visuals are complete"""
    print(f"========================================")
    print(f"BACKGROUND TASK STARTED: PDF generation for {video_id}")
    print(f"========================================")
    try:
        print(f"[{video_id}] Generating PDF (force_regenerate={force_regenerate})...")
        await pdf_service.generate_or_load_pdf(video_id, force_regenerate=force_regenerate)
        print(f"[{video_id}] PDF generation completed successfully")
        print(f"========================================")
        print(f"BACKGROUND TASK COMPLETED: PDF generation for {video_id}")
        print(f"========================================")
    except Exception as e:
        import traceback
        # Log error but don't crash - PDF generation is not critical
        print(f"========================================")
        print(f"BACKGROUND TASK FAILED: PDF generation for {video_id}")
        print(f"Error: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        print(f"========================================")

# CORS middleware for frontend
# Allow origins from environment variable, default to localhost for development
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
cors_origins = [origin.strip() for origin in cors_origins]  # Remove whitespace

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RecipeRequest(BaseModel):
    url: str


class VisualsRequest(BaseModel):
    url: str
    key_steps: dict  # {step_number: instruction}


class CreateBookRequest(BaseModel):
    name: str
    recipe_ids: List[int]


class UpdateBookRequest(BaseModel):
    name: Optional[str] = None
    recipe_ids: Optional[List[int]] = None


class SaveRecipeRequest(BaseModel):
    url: str


@app.get("/")
async def root():
    return {"message": "Recipe Extract API"}


# ==================== Authentication Endpoints ====================

@app.get("/auth/me")
async def get_current_user_info(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Get current authenticated user info.
    This endpoint also creates the user in the database if they don't exist yet.
    Fetches user display information (email, name, profile picture) from Clerk.
    """
    # Fetch user details from Clerk using the clerk_id
    try:
        clerk_user_obj = auth.clerk.users.get(user_id=current_user.clerk_id)
        
        # Extract display info from Clerk
        email = clerk_user_obj.email_addresses[0].email_address if clerk_user_obj.email_addresses else ""
        first_name = clerk_user_obj.first_name or ""
        last_name = clerk_user_obj.last_name or ""
        name = f"{first_name} {last_name}".strip() or (email.split("@")[0] if email else "User")
        profile_picture_url = clerk_user_obj.image_url or ""
        
        return {
            "id": current_user.id,
            "email": email,
            "name": name,
            "profile_picture_url": profile_picture_url,
            "created_at": current_user.created_at
        }
    except Exception as e:
        print(f"ERROR: Failed to fetch user from Clerk: {e}")
        # Return minimal info if Clerk fetch fails
        return {
            "id": current_user.id,
            "email": "",
            "name": "User",
            "profile_picture_url": "",
            "created_at": current_user.created_at
        }


@app.post("/api/recipe")
async def extract_recipe(
    request: RecipeRequest,
    current_user: Optional[models.User] = Depends(auth.get_optional_user),
    db: Session = Depends(database.get_db)
):
    """
    Extract structured recipe from YouTube URL.
    If authenticated, saves to user's collection.
    """
    try:
        # Extract video ID from URL
        video_id = request.url.split("v=")[-1].split("&")[0]
        
        # Get metadata
        metadata = get_video_metadata(request.url)
        
        # Validate if this is a recipe video using Gemma
        validation_result = validate_is_recipe_video(metadata, request.url)
        if not validation_result.get("is_recipe", True):
            # Not a recipe video - return error
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "not_recipe_video",
                    "message": "This video does not appear to be a recipe video",
                    "suggestion": "Please try a cooking tutorial or recipe video"
                }
            )
        
        # Get transcript (only if validation passed)
        # Note: get_transcript returns empty list if no transcript available
        transcript = get_transcript(video_id)

        # Stop if no transcript available
        if not transcript:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "no_transcript",
                    "message": "This video does not have a transcript available",
                    "suggestion": "Please try a video with English subtitles or captions enabled"
                }
            )
        
        # Combine into input JSON
        input_data = {
            "title": metadata.get("title"),
            "description": metadata.get("description"),
            "transcript": transcript  # Transcript is guaranteed to exist at this point
        }

        # Extract recipe using Gemini
        recipe = extract_recipe_gemini(input_data, request.url)

        # Add video URL and channel info to recipe data
        recipe["video_url"] = request.url
        if metadata.get("channel_name"):
            recipe["channel_name"] = metadata.get("channel_name")

        # If user is authenticated, save to database
        if current_user:
            db_recipe, created = crud.get_or_create_recipe(
                db=db,
                video_id=video_id,
                video_url=request.url,
                title=recipe.get("title", metadata.get("title")),
                recipe_data=recipe,
                channel_name=metadata.get("channel_name")
            )
            
            # Associate recipe with user
            try:
                crud.add_recipe_to_user(db, current_user.id, db_recipe.id)
            except ValueError:
                # Recipe already in user's collection, that's fine
                pass

        return recipe
        
    except HTTPException:
        # Re-raise HTTPException (e.g., validation errors)
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Recipe Management Endpoints ====================

@app.post("/api/recipes")
async def save_recipe_to_collection(
    request: SaveRecipeRequest,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Save a recipe to user's collection (extracts if needed)
    """
    try:
        # Extract video ID
        video_id = request.url.split("v=")[-1].split("&")[0]
        
        # Check if recipe already exists in database
        db_recipe = crud.get_recipe_by_video_id(db, video_id)
        recipe_was_new = False
        
        # Check if cache was cleared (recipe.json doesn't exist but database recipe does)
        import cache_manager
        cache_cleared = False
        if db_recipe:
            recipe_cache_exists = (cache_manager.get_video_cache_dir(video_id) / "recipe.json").exists()
            if not recipe_cache_exists:
                cache_cleared = True
                print(f"[{video_id}] Cache was cleared - will regenerate recipe from scratch")
        
        if not db_recipe or cache_cleared:
            # Recipe doesn't exist, need to extract it
            recipe_was_new = True
            metadata = get_video_metadata(request.url)
            
            # Validate if this is a recipe video using Gemma
            validation_result = validate_is_recipe_video(metadata, request.url)
            if not validation_result.get("is_recipe", True):
                # Not a recipe video - return error
                raise HTTPException(
                    status_code=400,
                    detail={
                        "error": "not_recipe_video",
                        "message": "This video does not appear to be a recipe video",
                        "suggestion": "Please try a cooking tutorial or recipe video"
                    }
                )
            
            # Get transcript (only if validation passed)
            # Note: get_transcript returns empty list if no transcript available
            transcript = get_transcript(video_id)

            # Stop if no transcript available
            if not transcript:
                raise HTTPException(
                    status_code=400,
                    detail={
                        "error": "no_transcript",
                        "message": "This video does not have a transcript available",
                        "suggestion": "Please try a video with English subtitles or captions enabled"
                    }
                )
            
            input_data = {
                "title": metadata.get("title"),
                "description": metadata.get("description"),
                "transcript": transcript  # Transcript is guaranteed to exist at this point
            }

            # Extract recipe using Gemini (force regenerate if cache was cleared)
            recipe_data = extract_recipe_gemini(input_data, request.url, force_regenerate=cache_cleared)
            recipe_data["video_url"] = request.url
            if metadata.get("channel_name"):
                recipe_data["channel_name"] = metadata.get("channel_name")
            
            # Create or update recipe in database
            if cache_cleared and db_recipe:
                # Update existing recipe if cache was cleared
                db_recipe.recipe_data = recipe_data
                db_recipe.title = recipe_data.get("title", metadata.get("title"))
                if metadata.get("channel_name"):
                    db_recipe.channel_name = metadata.get("channel_name")
                db.commit()
                db.refresh(db_recipe)
                print(f"[{video_id}] Updated database recipe after cache clear")
            else:
                # Create new recipe in database
                db_recipe = crud.create_recipe(
                    db=db,
                    video_id=video_id,
                    video_url=request.url,
                    title=recipe_data.get("title", metadata.get("title")),
                    recipe_data=recipe_data,
                    channel_name=metadata.get("channel_name")
                )
        
        # Check if recipe is already in user's collection
        recipe_already_in_collection = crud.user_has_recipe(db, current_user.id, db_recipe.id)
        
        # Schedule image extraction and PDF generation in background if needed
        import cache_manager
        import os
        from pathlib import Path
        
        existing_image = cache_manager.load_frame(video_id, "dish_visual")
        pdf_path = cache_manager.get_video_cache_dir(video_id) / "recipe.pdf"
        existing_pdf = pdf_path.exists()
        
        # Check if PDF needs regeneration (if any pipeline part is missing or newer)
        pdf_needs_regeneration = False
        if existing_pdf:
            pdf_mtime = pdf_path.stat().st_mtime if pdf_path.exists() else 0
            # Check if recipe, timestamps, or images are newer than PDF
            recipe_path = cache_manager.get_video_cache_dir(video_id) / "recipe.json"
            timestamps_path = cache_manager.get_video_cache_dir(video_id) / "timestamps.json"
            image_path = cache_manager.get_video_cache_dir(video_id) / "frames" / "step_dish_visual.jpg"
            
            if recipe_path.exists() and recipe_path.stat().st_mtime > pdf_mtime:
                pdf_needs_regeneration = True
                print(f"[{video_id}] PDF needs regeneration: recipe.json is newer")
            elif timestamps_path.exists() and timestamps_path.stat().st_mtime > pdf_mtime:
                pdf_needs_regeneration = True
                print(f"[{video_id}] PDF needs regeneration: timestamps.json is newer")
            elif image_path.exists() and image_path.stat().st_mtime > pdf_mtime:
                pdf_needs_regeneration = True
                print(f"[{video_id}] PDF needs regeneration: dish_visual image is newer")
        elif not existing_pdf:
            # PDF doesn't exist, check if we have the required parts
            recipe_exists = (cache_manager.get_video_cache_dir(video_id) / "recipe.json").exists()
            if recipe_exists:
                pdf_needs_regeneration = True
                print(f"[{video_id}] PDF needs regeneration: PDF missing but recipe exists")
        
        # Extract key steps from recipe for timestamp extraction
        # Try to get recipe_data from database first, then from cache as fallback
        recipe_data = {}
        if hasattr(db_recipe, 'recipe_data') and db_recipe.recipe_data:
            recipe_data = db_recipe.recipe_data
        else:
            # Fallback: try loading from cache
            cached_recipe = cache_manager.load_step(video_id, "recipe")
            if cached_recipe:
                recipe_data = cached_recipe
        
        print(f"[{video_id}] DEBUG: Recipe data keys: {list(recipe_data.keys()) if recipe_data else 'None'}")
        
        key_steps = {}
        # Check for 'instructions' (plural) which is what the recipe extraction returns
        instructions = recipe_data.get("instructions", [])
        if instructions:
            print(f"[{video_id}] DEBUG: Found {len(instructions)} instructions in recipe_data")
            for i, instruction in enumerate(instructions, 1):
                if isinstance(instruction, dict):
                    # Only include steps marked as key steps
                    if instruction.get("is_key_step"):
                        instruction_text = instruction.get("instruction", instruction.get("step", instruction.get("text", "")))
                        if instruction_text:
                            key_steps[str(i)] = instruction_text
                elif isinstance(instruction, str):
                    # If instruction is just a string, include it (legacy support)
                    key_steps[str(i)] = instruction
                else:
                    instruction_text = str(instruction)
                    if instruction_text:
                        key_steps[str(i)] = instruction_text
            print(f"[{video_id}] DEBUG: Extracted {len(key_steps)} key steps (marked as is_key_step): {list(key_steps.keys())}")
        # Also check for 'steps' as fallback
        elif "steps" in recipe_data and recipe_data["steps"]:
            print(f"[{video_id}] DEBUG: Found {len(recipe_data['steps'])} steps in recipe_data")
            for i, step in enumerate(recipe_data["steps"], 1):
                if isinstance(step, dict):
                    # Only include steps marked as key steps
                    if step.get("is_key_step"):
                        instruction_text = step.get("instruction", step.get("step", ""))
                        if instruction_text:
                            key_steps[str(i)] = instruction_text
                elif isinstance(step, str):
                    # If step is just a string, include it (legacy support)
                    key_steps[str(i)] = step
                else:
                    instruction_text = str(step)
                    if instruction_text:
                        key_steps[str(i)] = instruction_text
            print(f"[{video_id}] DEBUG: Extracted {len(key_steps)} key steps (marked as is_key_step): {list(key_steps.keys())}")
        else:
            print(f"[{video_id}] DEBUG: No instructions/steps found in recipe_data. Available keys: {list(recipe_data.keys()) if recipe_data else 'None'}")
        
        # Schedule image extraction if missing
        if not existing_image:
            if key_steps:
                try:
                    print(f"========================================")
                    print(f"SCHEDULING: Background image extraction for {video_id}")
                    print(f"Reason: Image missing, {len(key_steps)} steps available")
                    print(f"========================================")
                    background_tasks.add_task(extract_recipe_images_background, request.url, key_steps, video_id)
                    print(f"[{video_id}] ✓ Background image extraction task scheduled")
                except Exception as e:
                    print(f"[{video_id}] ✗ Failed to schedule background image task: {e}")
            else:
                print(f"[{video_id}] ⚠ Skipping image extraction: No key steps available")
        else:
            print(f"[{video_id}] ✓ Image already exists, skipping extraction")
        
        # Schedule PDF generation if missing or needs regeneration
        # Also regenerate if recipe was just extracted (recipe_was_new=True)
        if not existing_pdf or pdf_needs_regeneration or recipe_was_new:
            try:
                if recipe_was_new:
                    reason = "Recipe just extracted"
                elif not existing_pdf:
                    reason = "PDF missing"
                else:
                    reason = "Pipeline parts updated"
                print(f"========================================")
                print(f"SCHEDULING: Background PDF generation for {video_id}")
                print(f"Reason: {reason}")
                print(f"========================================")
                # Force regeneration if PDF exists but is outdated, or if recipe was just extracted
                force_regenerate = (existing_pdf and pdf_needs_regeneration) or recipe_was_new
                background_tasks.add_task(generate_pdf_background, video_id, force_regenerate)
                print(f"[{video_id}] ✓ Background PDF generation task scheduled (force_regenerate={force_regenerate})")
            except Exception as e:
                print(f"[{video_id}] ✗ Failed to schedule background PDF task: {e}")
        else:
            print(f"[{video_id}] ✓ PDF already exists and is up-to-date, skipping generation")
        
        # Add to user's collection (or return success if already exists)
        response_recipe = db_recipe.recipe_data.copy() if db_recipe.recipe_data else {}
        
        if recipe_already_in_collection:
            return {
                "message": "Recipe already in collection",
                "recipe_id": db_recipe.id,
                "recipe": response_recipe
            }
        
        try:
            crud.add_recipe_to_user(db, current_user.id, db_recipe.id)
            return {
                "message": "Recipe added to collection",
                "recipe_id": db_recipe.id,
                "recipe": response_recipe
            }
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"ERROR: Failed to save recipe to collection: {e}")
        print(f"ERROR: Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


def extract_recipe_images_background(video_url: str, key_steps: dict, video_id: str):
    """
    Background task to extract recipe images (timestamps and dish_visual frame)
    """
    print(f"========================================")
    print(f"BACKGROUND TASK STARTED: Image extraction for {video_id}")
    print(f"Video URL: {video_url}")
    print(f"Key steps count: {len(key_steps)}")
    print(f"========================================")
    
    try:
        print(f"[{video_id}] STEP 1: Getting timestamps from Gemini...")
        timestamps = extract_timestamps_gemini(video_url, key_steps)
        print(f"[{video_id}] STEP 1 COMPLETE: Got timestamps: {list(timestamps.keys())}")
        
        # Extract ONLY the dish_visual frame (hero image)
        if "dish_visual" in timestamps and timestamps["dish_visual"] and timestamps["dish_visual"] != "null":
            print(f"[{video_id}] STEP 2: Extracting dish_visual frame at timestamp {timestamps['dish_visual']}...")
            result = extract_best_frame(
                video_url,
                timestamps["dish_visual"],
                "Visual reference",
                "dish_visual"  # cache key
            )
            if result:
                print(f"[{video_id}] STEP 2 COMPLETE: Successfully extracted and saved dish_visual frame")
            else:
                print(f"[{video_id}] STEP 2 FAILED: extract_best_frame returned None")
        else:
            print(f"[{video_id}] STEP 2 SKIPPED: No dish_visual timestamp found in {timestamps}")
        
        print(f"========================================")
        print(f"BACKGROUND TASK COMPLETED: Image extraction for {video_id}")
        print(f"========================================")
            
    except Exception as e:
        import traceback
        print(f"========================================")
        print(f"BACKGROUND TASK FAILED: Image extraction for {video_id}")
        print(f"Error: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        print(f"========================================")


@app.get("/api/recipes")
async def get_user_recipes(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Get all recipes in user's collection
    """
    try:
        recipes = crud.get_user_recipes(db, current_user.id)
        return {
            "recipes": [
                {
                    "id": recipe.id,
                    "video_id": recipe.video_id,
                    "video_url": recipe.video_url,
                    "title": recipe.title,
                    "channel_name": recipe.channel_name,
                    "recipe_data": recipe.recipe_data,
                    "created_at": recipe.created_at
                }
                for recipe in recipes
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/recipes/{recipe_id}")
async def remove_recipe_from_collection(
    recipe_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Remove a recipe from user's collection
    """
    try:
        success = crud.remove_recipe_from_user(db, current_user.id, recipe_id)
        if not success:
            raise HTTPException(status_code=404, detail="Recipe not found in collection")
        return {"message": "Recipe removed from collection"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Book Management Endpoints ====================

@app.post("/api/books")
async def create_book(
    request: CreateBookRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Create a new book with selected recipes (5-20 recipes required)
    """
    try:
        book = crud.create_book(
            db=db,
            user_id=current_user.id,
            name=request.name,
            recipe_ids=request.recipe_ids
        )
        
        return {
            "message": "Book created successfully",
            "book": {
                "id": book.id,
                "name": book.name,
                "created_at": book.created_at,
                "recipe_count": len(request.recipe_ids)
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/books")
async def get_user_books(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Get all books for the current user
    """
    try:
        books = crud.get_user_books(db, current_user.id)
        return {
            "books": [
                {
                    "id": book.id,
                    "name": book.name,
                    "created_at": book.created_at,
                    "recipe_count": len(book.book_recipes)
                }
                for book in books
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/books/{book_id}")
async def get_book_details(
    book_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Get book details with all recipes
    """
    try:
        book_data = crud.get_book_with_recipes(db, book_id)
        if not book_data:
            raise HTTPException(status_code=404, detail="Book not found")
        
        # Verify book belongs to current user
        if book_data["user_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return book_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/books/{book_id}")
async def update_book(
    book_id: int,
    request: UpdateBookRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Update book name and/or recipe order
    """
    try:
        book = crud.update_book(
            db=db,
            book_id=book_id,
            user_id=current_user.id,
            name=request.name,
            recipe_ids=request.recipe_ids
        )
        
        if not book:
            raise HTTPException(status_code=404, detail="Book not found")
        
        return {
            "message": "Book updated successfully",
            "book": {
                "id": book.id,
                "name": book.name,
                "updated_at": book.updated_at,
                "recipe_count": len(book.book_recipes)
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/books/{book_id}")
async def delete_book(
    book_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Delete a book
    """
    try:
        success = crud.delete_book(db, book_id, current_user.id)
        if not success:
            raise HTTPException(status_code=404, detail="Book not found")
        return {"message": "Book deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/books/{book_id}/pdf")
async def download_book_pdf(
    book_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
    download: bool = Query(False, description="Force download instead of inline display")
):
    """
    Generate and download a combined PDF for all recipes in a book
    """
    try:
        book_data = crud.get_book_with_recipes(db, book_id)
        if not book_data:
            raise HTTPException(status_code=404, detail="Book not found")
        
        # Verify book belongs to current user
        if book_data["user_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        if not book_data["recipes"]:
            raise HTTPException(status_code=400, detail="Book has no recipes")

        # Build full book PDF with covers and TOC
        pdf_bytes = await pdf_service.generate_book_pdf(book_data)

        # Sanitize filename
        safe_name = "".join(c for c in book_data["name"] if c.isalnum() or c in (' ', '-', '_')).strip()
        safe_name = safe_name.replace(' ', '_')
        filename = f"{safe_name}_cookbook.pdf"
        
        disposition = "attachment" if download else "inline"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"{disposition}; filename={filename}"
            }
        )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/visuals")
async def extract_visuals(
    request: VisualsRequest,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(auth.get_current_user)
):
    """Extract timestamps and best frame for dish visual only"""
    try:
        video_id = request.url.split("v=")[-1].split("&")[0]

        # Get timestamps from Gemini (analyzes video to find key moments)
        timestamps = extract_timestamps_gemini(request.url, request.key_steps)

        # Only extract the dish_visual frame (hero image)
        # Skip extracting individual step frames to save time and bandwidth
        results = {}
        
        # Return timestamps for all steps (for future reference)
        for step_key, ts in timestamps.items():
            results[step_key] = {
                "timestamp": ts,
                "frame_base64": None  # Don't extract frames for individual steps
            }
        
        # Extract ONLY the dish_visual frame
        if "dish_visual" in timestamps and timestamps["dish_visual"] and timestamps["dish_visual"] != "null":
            print("DEBUG: Extracting dish_visual frame only...")
            best_frame_data = extract_best_frame(
                request.url,
                timestamps["dish_visual"],
                "Visual reference",
                "dish_visual"  # cache key
            )
            results["dish_visual"] = {
                "timestamp": timestamps["dish_visual"],
                "frame_base64": best_frame_data
            }

        # Schedule PDF generation in background (non-blocking)
        background_tasks.add_task(generate_pdf_background, video_id)

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

        # Add video URL and channel info to cached recipe data for compatibility
        recipe["video_url"] = f"https://www.youtube.com/watch?v={video_id}"
        if metadata and metadata.get("channel_name"):
            recipe["channel_name"] = metadata.get("channel_name")

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


@app.get("/api/cache/{video_id}/image")
async def get_recipe_image(video_id: str):
    """
    Get the dish_visual image for a recipe.
    Returns the image as JPEG if available, otherwise 404.
    """
    import cache_manager
    from fastapi.responses import Response
    
    try:
        # Load the dish_visual frame
        frame_data = cache_manager.load_frame(video_id, "dish_visual")
        
        if not frame_data:
            raise HTTPException(status_code=404, detail="Recipe image not found")
        
        return Response(
            content=frame_data,
            media_type="image/jpeg",
            headers={
                "Cache-Control": "public, max-age=31536000"  # Cache for 1 year
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/cache/{video_id}/{step_name}")
async def clear_cache_step(video_id: str, step_name: str):
    """Clear a specific pipeline step for a video"""
    import cache_manager
    try:
        valid_steps = ["metadata", "transcript", "recipe", "timestamps", "frames", "pdf"]
        if step_name not in valid_steps:
            raise HTTPException(status_code=400, detail=f"Invalid step name. Must be one of: {valid_steps}")
        
        cache_manager.clear_step(video_id, step_name)
        return {"message": f"Cleared {step_name} for video {video_id}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/cache/{video_id}/pdf")
async def download_recipe_pdf(
    video_id: str, 
    regenerate: bool = Query(False, description="Force regenerate PDF even if cached"),
    download: bool = Query(False, description="Force download instead of inline display")
):
    """
    Generate and download a PDF of the recipe.
    Uses cached PDF if available unless regenerate=true.
    Set download=true to force download, otherwise displays inline for preview.
    """
    import pdf_service
    try:
        # Generate or load PDF
        pdf_bytes = await pdf_service.generate_or_load_pdf(video_id, force_regenerate=regenerate)
        
        # Get recipe title for filename
        import cache_manager
        recipe = cache_manager.load_step(video_id, "recipe")
        title = recipe.get("title", "recipe") if recipe else "recipe"
        
        # Sanitize filename
        safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_')).strip()
        safe_title = safe_title.replace(' ', '_')
        filename = f"{safe_title}.pdf"
        
        # Return PDF with proper headers
        # Use 'inline' for preview, 'attachment' for download
        disposition = "attachment" if download else "inline"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"{disposition}; filename={filename}"
            }
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
