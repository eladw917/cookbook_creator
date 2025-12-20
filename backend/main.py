from fastapi import FastAPI, HTTPException, Query, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response, RedirectResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import os
from typing import Optional, List, Dict
import io
import secrets
import time
from pathlib import Path
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
    extract_best_frame
)
import pdf_service
import database
import models
import crud
import auth

# Initialize database
database.init_db()

app = FastAPI(title="Recipe Extract API")


async def generate_pdf_background(video_id: str):
    """Background task to generate PDF after visuals are complete"""
    try:
        print(f"DEBUG: Starting background PDF generation for video {video_id}")
        await pdf_service.generate_or_load_pdf(video_id, force_regenerate=False)
        print(f"DEBUG: Background PDF generation completed for video {video_id}")
    except Exception as e:
        # Log error but don't crash - PDF generation is not critical
        print(f"ERROR: Background PDF generation failed for video {video_id}: {e}")

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


class PrintQuoteRequest(BaseModel):
    country_code: str = "US"
    state_code: Optional[str] = None
    city: Optional[str] = None
    postcode: Optional[str] = None


class PrintOrderRequest(BaseModel):
    shipping_name: str
    shipping_address: Dict
    shipping_level: str = "MAIL"
    contact_email: str


@app.get("/")
async def root():
    return {"message": "Recipe Extract API"}


# ==================== Public PDF Hosting ====================

# In-memory storage for temporary PDF URLs (in production, use Redis or database)
_pdf_url_cache: Dict[str, Dict] = {}

def create_public_pdf_url(book_id: int, pdf_bytes: bytes) -> str:
    """
    Create a temporary public URL for a PDF.
    
    Args:
        book_id: Book ID
        pdf_bytes: PDF file bytes
        
    Returns:
        Public URL that Lulu can access
    """
    # Generate secure random token
    token = secrets.token_urlsafe(32)
    
    # Store PDF with expiry (24 hours)
    _pdf_url_cache[token] = {
        "book_id": book_id,
        "pdf_bytes": pdf_bytes,
        "expires_at": time.time() + (24 * 60 * 60)  # 24 hours
    }
    
    # Get base URL from environment or use default
    base_url = os.getenv("PUBLIC_PDF_BASE_URL", "http://localhost:8000")
    return f"{base_url}/public/pdfs/{book_id}/{token}.pdf"


@app.get("/public/pdfs/{book_id}/{token}")
async def serve_public_pdf(book_id: int, token: str):
    """
    Publicly accessible endpoint for Lulu to download PDFs.
    No authentication required - uses secure random tokens.
    """
    # Remove .pdf extension from token if present
    token = token.replace(".pdf", "")
    
    # Check if token exists
    if token not in _pdf_url_cache:
        raise HTTPException(status_code=404, detail="PDF not found or expired")
    
    pdf_data = _pdf_url_cache[token]
    
    # Check if expired
    if time.time() > pdf_data["expires_at"]:
        del _pdf_url_cache[token]
        raise HTTPException(status_code=404, detail="PDF expired")
    
    # Verify book_id matches
    if pdf_data["book_id"] != book_id:
        raise HTTPException(status_code=404, detail="Invalid PDF URL")
    
    # Return PDF
    return Response(
        content=pdf_data["pdf_bytes"],
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename=cookbook_{book_id}.pdf"
        }
    )


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
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Recipe Management Endpoints ====================

@app.post("/api/recipes")
async def save_recipe_to_collection(
    request: SaveRecipeRequest,
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
        
        if not db_recipe:
            # Recipe doesn't exist, need to extract it
            metadata = get_video_metadata(request.url)
            transcript = get_transcript(video_id)
            
            input_data = {
                "title": metadata.get("title"),
                "description": metadata.get("description"),
                "transcript": transcript
            }
            
            recipe_data = extract_recipe_gemini(input_data, request.url)
            recipe_data["video_url"] = request.url
            if metadata.get("channel_name"):
                recipe_data["channel_name"] = metadata.get("channel_name")
            
            # Create recipe in database
            db_recipe = crud.create_recipe(
                db=db,
                video_id=video_id,
                video_url=request.url,
                title=recipe_data.get("title", metadata.get("title")),
                recipe_data=recipe_data,
                channel_name=metadata.get("channel_name")
            )
        
        # Add to user's collection
        try:
            crud.add_recipe_to_user(db, current_user.id, db_recipe.id)
            return {
                "message": "Recipe added to collection",
                "recipe_id": db_recipe.id,
                "recipe": db_recipe.recipe_data
            }
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
async def get_cached_recipe(video_id: str, regenerate: bool = Query(False, description="Force regenerate if not in cache")):
    """
    Get a cached recipe by video ID.
    If recipe is not in cache and regenerate=true, attempts to regenerate it.
    """
    import cache_manager
    try:
        # Load all cached data
        metadata = cache_manager.load_step(video_id, "metadata")
        recipe = cache_manager.load_step(video_id, "recipe")
        timestamps = cache_manager.load_step(video_id, "timestamps")
        status = cache_manager.get_pipeline_status(video_id)
        
        if not recipe:
            if regenerate:
                # Try to regenerate the recipe
                print(f"DEBUG: Recipe not found in cache for video {video_id}, attempting to regenerate...")
                try:
                    video_url = f"https://www.youtube.com/watch?v={video_id}"
                    
                    # Get metadata and transcript
                    if not metadata:
                        print(f"DEBUG: Fetching metadata for video {video_id}")
                        metadata = get_video_metadata(video_url)
                        cache_manager.save_step(video_id, "metadata", metadata)
                    
                    transcript = cache_manager.load_step(video_id, "transcript")
                    if not transcript:
                        print(f"DEBUG: Fetching transcript for video {video_id}")
                        transcript = get_transcript(video_id)
                        cache_manager.save_step(video_id, "transcript", transcript)
                    
                    # Extract recipe
                    print(f"DEBUG: Extracting recipe for video {video_id}")
                    input_data = {
                        "metadata": metadata,
                        "transcript": transcript
                    }
                    recipe = extract_recipe_gemini(input_data, video_url)
                    print(f"DEBUG: Successfully regenerated recipe for video {video_id}")
                    
                    # Reload status after regeneration
                    status = cache_manager.get_pipeline_status(video_id)
                    
                except Exception as e:
                    print(f"ERROR: Failed to regenerate recipe for video {video_id}: {e}")
                    raise HTTPException(
                        status_code=500, 
                        detail=f"Recipe not found in cache and regeneration failed: {str(e)}"
                    )
            else:
                raise HTTPException(
                    status_code=404, 
                    detail="Recipe not found in cache. Add ?regenerate=true to attempt regeneration."
                )

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


# ==================== Print Order Endpoints ====================

@app.get("/api/books/{book_id}/print-quote")
async def get_print_quote(
    book_id: int,
    country_code: str = Query("US"),
    state_code: str = Query(""),
    city: str = Query(""),
    postcode: str = Query(""),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Get pricing quote for printing a book.
    Returns estimated cost including shipping to specified location.
    """
    import lulu_service
    
    try:
        # Get book and verify ownership
        book_data = crud.get_book_with_recipes(db, book_id)
        if not book_data:
            raise HTTPException(status_code=404, detail="Book not found")
        
        if book_data["user_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        if not book_data["recipes"]:
            raise HTTPException(status_code=400, detail="Book has no recipes")
        
        # Calculate page count (approximate)
        # Each recipe typically has 2-3 pages, plus cover pages
        recipe_count = len(book_data["recipes"])
        estimated_page_count = 3 + (recipe_count * 2)  # 3 front matter + ~2 pages per recipe
        
        # Create minimal shipping address for quote
        shipping_address = {
            "city": city or "New York",
            "country_code": country_code,
            "postcode": postcode or "10001",
            "state_code": state_code or "NY",
            "street1": "123 Main St",  # Required but not used for quote
            "phone_number": "+1 555-0100"  # Required but not used for quote
        }
        
        # Get cost calculation from Lulu
        cost_data = lulu_service.get_cost_calculation(
            page_count=estimated_page_count,
            pod_package_id=lulu_service.DEFAULT_POD_PACKAGE_ID,
            shipping_address=shipping_address,
            shipping_option="MAIL",
            quantity=1
        )
        
        return {
            "book_id": book_id,
            "book_name": book_data["name"],
            "estimated_page_count": estimated_page_count,
            "recipe_count": recipe_count,
            "cost_breakdown": cost_data,
            "pod_package_id": lulu_service.DEFAULT_POD_PACKAGE_ID,
            "binding_type": "coil"
        }
        
    except lulu_service.LuluAPIError as e:
        raise HTTPException(status_code=502, detail=f"Lulu API error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/books/{book_id}/print-order")
async def create_print_order(
    book_id: int,
    request: PrintOrderRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Create a print order with Lulu.
    
    Steps:
    1. Generate book PDF
    2. Create public URL for PDF
    3. Submit print job to Lulu
    4. Save order to database
    5. Return order details
    """
    import lulu_service
    
    try:
        # Get book and verify ownership
        book_data = crud.get_book_with_recipes(db, book_id)
        if not book_data:
            raise HTTPException(status_code=404, detail="Book not found")
        
        if book_data["user_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        if not book_data["recipes"]:
            raise HTTPException(status_code=400, detail="Book has no recipes")
        
        # Validate shipping address
        try:
            lulu_service.validate_shipping_address(request.shipping_address)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        
        # Generate book PDF
        print(f"DEBUG: Generating PDF for book {book_id}")
        pdf_bytes = await pdf_service.generate_book_pdf(book_data)
        
        # Create public URL for Lulu to access
        public_url = create_public_pdf_url(book_id, pdf_bytes)
        print(f"DEBUG: Created public PDF URL: {public_url}")
        
        # Calculate page count
        recipe_count = len(book_data["recipes"])
        estimated_page_count = 3 + (recipe_count * 2)
        
        # Create print job with Lulu
        print(f"DEBUG: Submitting print job to Lulu")
        lulu_job = lulu_service.create_print_job(
            interior_url=public_url,
            cover_url=public_url,  # Same PDF for now
            page_count=estimated_page_count,
            shipping_address=request.shipping_address,
            contact_email=request.contact_email,
            shipping_level=request.shipping_level,
            pod_package_id=lulu_service.DEFAULT_POD_PACKAGE_ID,
            quantity=1,
            title=book_data["name"],
            external_id=f"book_{book_id}"
        )
        
        # Save order to database
        print_order = crud.create_print_order(
            db=db,
            user_id=current_user.id,
            book_id=book_id,
            lulu_job_id=str(lulu_job["id"]),
            shipping_name=request.shipping_name,
            shipping_address=request.shipping_address,
            shipping_level=request.shipping_level,
            total_cost=None  # Will be updated when we get final cost
        )
        
        return {
            "order_id": print_order.id,
            "lulu_job_id": lulu_job["id"],
            "status": lulu_job.get("status", {}).get("name", "CREATED"),
            "book_name": book_data["name"],
            "created_at": print_order.created_at
        }
        
    except lulu_service.LuluAPIError as e:
        raise HTTPException(status_code=502, detail=f"Lulu API error: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/print-orders/{order_id}")
async def get_print_order_status(
    order_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Get current status of a print order.
    Fetches latest status from Lulu and updates database.
    """
    import lulu_service
    
    try:
        # Get order from database
        print_order = crud.get_print_order(db, order_id)
        if not print_order:
            raise HTTPException(status_code=404, detail="Print order not found")
        
        # Verify ownership
        if print_order.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Query Lulu for latest status
        lulu_job = lulu_service.get_print_job_status(int(print_order.lulu_job_id))
        
        # Update database with new status
        new_status = lulu_job.get("status", {}).get("name", "UNKNOWN")
        
        # Extract tracking info if shipped
        tracking_info = None
        if new_status == "SHIPPED":
            tracking_info = lulu_service.get_print_job_tracking(int(print_order.lulu_job_id))
        
        # Update order in database
        if tracking_info:
            crud.update_print_order_status(
                db=db,
                order_id=order_id,
                status=new_status,
                tracking_id=tracking_info.get("tracking_id"),
                tracking_url=tracking_info["tracking_urls"][0] if tracking_info.get("tracking_urls") else None,
                carrier_name=tracking_info.get("carrier_name")
            )
        else:
            crud.update_print_order_status(db=db, order_id=order_id, status=new_status)
        
        # Get updated order
        print_order = crud.get_print_order(db, order_id)
        
        # Get book info
        book = crud.get_book(db, print_order.book_id)
        
        return {
            "id": print_order.id,
            "book_id": print_order.book_id,
            "book_name": book.name if book else "Unknown",
            "lulu_job_id": print_order.lulu_job_id,
            "status": print_order.status,
            "shipping_name": print_order.shipping_name,
            "shipping_address": print_order.shipping_address,
            "shipping_level": print_order.shipping_level,
            "total_cost": print_order.total_cost,
            "tracking_id": print_order.tracking_id,
            "tracking_url": print_order.tracking_url,
            "carrier_name": print_order.carrier_name,
            "created_at": print_order.created_at,
            "updated_at": print_order.updated_at
        }
        
    except lulu_service.LuluAPIError as e:
        raise HTTPException(status_code=502, detail=f"Lulu API error: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/print-orders")
async def list_print_orders(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Get all print orders for current user"""
    try:
        orders = crud.get_user_print_orders(db, current_user.id)
        
        # Get book names for each order
        result = []
        for order in orders:
            book = crud.get_book(db, order.book_id)
            result.append({
                "id": order.id,
                "book_id": order.book_id,
                "book_name": book.name if book else "Unknown",
                "lulu_job_id": order.lulu_job_id,
                "status": order.status,
                "shipping_name": order.shipping_name,
                "shipping_level": order.shipping_level,
                "total_cost": order.total_cost,
                "tracking_id": order.tracking_id,
                "tracking_url": order.tracking_url,
                "carrier_name": order.carrier_name,
                "created_at": order.created_at,
                "updated_at": order.updated_at
            })
        
        return {"orders": result}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
