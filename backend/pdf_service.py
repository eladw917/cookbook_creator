"""
PDF Generation Service
Generates recipe PDFs from cached data using Playwright for HTML→PDF conversion
"""

import os
import base64
from pathlib import Path
from typing import Optional
from jinja2 import Environment, FileSystemLoader
from playwright.async_api import async_playwright
import cache_manager


# Setup Jinja2 environment
TEMPLATES_DIR = Path(__file__).parent / "templates"
jinja_env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))


def get_hero_image_data_uri(video_id: str) -> Optional[str]:
    """Load the dish_visual frame and convert to data URI"""
    frame_data = cache_manager.load_frame(video_id, "dish_visual")
    if frame_data:
        base64_data = base64.b64encode(frame_data).decode('utf-8')
        return f"data:image/jpeg;base64,{base64_data}"
    return None


def get_step_images_data_uris(video_id: str) -> dict:
    """
    Load all step frames and convert to data URIs.
    Note: Currently we only extract dish_visual, not individual step images.
    This function is kept for future compatibility if step images are re-enabled.
    """
    step_images = {}
    video_dir = cache_manager.get_video_cache_dir(video_id)
    frames_dir = video_dir / "frames"
    
    if not frames_dir.exists():
        return step_images
    
    # Get all step frame files (excluding dish_visual)
    for frame_file in frames_dir.glob("step_*.jpg"):
        # Skip dish_visual as it's used for hero image
        if frame_file.stem == "step_dish_visual":
            continue
            
        step_key = frame_file.stem.replace("step_", "")  # e.g., "12", "14", etc.
        frame_data = cache_manager.load_frame(video_id, step_key)
        if frame_data:
            base64_data = base64.b64encode(frame_data).decode('utf-8')
            step_images[step_key] = f"data:image/jpeg;base64,{base64_data}"
    
    return step_images


def ensure_hero_image(video_id: str, recipe: dict) -> Optional[str]:
    """
    Ensure we have a hero image; if missing, try to regenerate the dish_visual frame.
    """
    hero_image = get_hero_image_data_uri(video_id)
    if hero_image:
        return hero_image

    # Attempt regeneration using cached timestamps
    timestamps = cache_manager.load_step(video_id, "timestamps") or {}
    dish_timestamp = timestamps.get("dish_visual")
    if not dish_timestamp or dish_timestamp == "null":
        print(f"DEBUG: No dish_visual timestamp available to regenerate hero image for {video_id}")
        return None

    # Build video URL (recipe cache may not contain it)
    video_url = recipe.get("video_url") or f"https://www.youtube.com/watch?v={video_id}"

    try:
        from services import extract_best_frame  # Lazy import to avoid circular dependency
        regenerated_base64 = extract_best_frame(
            video_url,
            dish_timestamp,
            "Visual reference",
            "dish_visual"
        )
        if regenerated_base64:
            print(f"DEBUG: Regenerated dish_visual frame for {video_id}")
            return f"data:image/jpeg;base64,{regenerated_base64}"
    except Exception as e:
        print(f"DEBUG: Failed to regenerate hero image for {video_id}: {e}")

    return None


async def generate_recipe_pdf(video_id: str) -> bytes:
    """
    Generate a PDF for a recipe using cached data.
    
    Args:
        video_id: YouTube video ID
        
    Returns:
        PDF file as bytes
        
    Raises:
        ValueError: If recipe data not found in cache
        Exception: If PDF generation fails
    """
    print(f"DEBUG: Generating PDF for video {video_id}")
    
    # Load cached data
    recipe = cache_manager.load_step(video_id, "recipe")
    if not recipe:
        raise ValueError(f"Recipe not found in cache for video {video_id}")
    
    metadata = cache_manager.load_step(video_id, "metadata")
    
    # Get hero image as data URI (regenerate dish_visual if missing)
    hero_image = ensure_hero_image(video_id, recipe)
    
    # Get step images as data URIs
    step_images = get_step_images_data_uris(video_id)
    
    # Render HTML template
    template = jinja_env.get_template("recipe.html")
    html_content = template.render(
        recipe=recipe,
        metadata=metadata,
        hero_image=hero_image,
        step_images=step_images
    )
    
    print("DEBUG: Rendered HTML template")
    
    # Generate PDF using Playwright
    try:
        async with async_playwright() as p:
            print("DEBUG: Launching browser...")
            browser = await p.chromium.launch()
            page = await browser.new_page()
            
            # Set content and wait for fonts/images to load
            print("DEBUG: Setting page content...")
            await page.set_content(html_content, wait_until="networkidle")
            
            # Generate PDF with A4 size
            print("DEBUG: Generating PDF...")
            pdf_bytes = await page.pdf(
                format="A4",
                print_background=True,
                margin={
                    "top": "0mm",
                    "right": "0mm",
                    "bottom": "0mm",
                    "left": "0mm"
                }
            )
            
            await browser.close()
            print(f"DEBUG: PDF generated successfully ({len(pdf_bytes)} bytes)")
            return pdf_bytes
            
    except Exception as e:
        print(f"DEBUG: PDF generation failed: {e}")
        raise Exception(f"Failed to generate PDF: {str(e)}")


def get_cached_pdf_path(video_id: str) -> Path:
    """Get the path where the PDF would be cached"""
    video_dir = cache_manager.get_video_cache_dir(video_id)
    return video_dir / "recipe.pdf"


def load_cached_pdf(video_id: str) -> Optional[bytes]:
    """Load a cached PDF if it exists"""
    pdf_path = get_cached_pdf_path(video_id)
    if pdf_path.exists():
        print(f"DEBUG: Loading cached PDF for video {video_id}")
        with open(pdf_path, 'rb') as f:
            return f.read()
    return None


def save_pdf_to_cache(video_id: str, pdf_bytes: bytes) -> None:
    """Save generated PDF to cache"""
    pdf_path = get_cached_pdf_path(video_id)
    with open(pdf_path, 'wb') as f:
        f.write(pdf_bytes)
    print(f"DEBUG: Saved PDF to cache for video {video_id}")


async def generate_or_load_pdf(video_id: str, force_regenerate: bool = False) -> bytes:
    """
    Generate PDF or load from cache.
    
    Args:
        video_id: YouTube video ID
        force_regenerate: If True, regenerate even if cached
        
    Returns:
        PDF file as bytes
    """
    # Check cache first (unless force regenerate)
    if not force_regenerate:
        cached_pdf = load_cached_pdf(video_id)
        if cached_pdf:
            return cached_pdf
    
    # Generate new PDF
    pdf_bytes = await generate_recipe_pdf(video_id)
    
    # Save to cache
    save_pdf_to_cache(video_id, pdf_bytes)
    
    return pdf_bytes

