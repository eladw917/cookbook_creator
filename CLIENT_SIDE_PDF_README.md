# Client-Side PDF Generation Implementation

## Overview
This branch implements client-side PDF generation for single recipe PDFs using React-PDF, eliminating the 200-400MB memory overhead from Playwright on the server.

## Changes Made

### Frontend Changes

1. **Added @react-pdf/renderer dependency** (`frontend/package.json`)
   - Installed with `--legacy-peer-deps` due to React 19 compatibility

2. **Created RecipePDF Component** (`frontend/src/components/RecipePDF.tsx`)
   - Recreates the exact layout from `backend/templates/recipe.html`
   - Supports hero page with image, title, description, and time badges
   - Two-column content page (ingredients left, instructions right)
   - Overflow pages for long recipes
   - Uses Google Fonts (Libre Baskerville, Open Sans) matching server version

3. **Updated RecipeCollection Component** (`frontend/src/components/RecipeCollection.tsx`)
   - Added `RecipePDFDownload` component for lazy-loading PDF data
   - Replaced server PDF link with client-side PDF generation
   - Fetches recipe data with images as data URIs from new API endpoint

### Backend Changes

1. **Added PDF Data Endpoint** (`backend/main.py`)
   - New endpoint: `GET /api/recipes/{recipe_id}/pdf-data`
   - Returns recipe data with hero image and step images as base64 data URIs
   - Reuses existing `pdf_service` functions for image loading

## Benefits

- **Memory**: 0 MB server memory (vs 200-400 MB with Playwright)
- **Cost**: Can stay on 256 MB free tier
- **Speed**: Faster for users (no server processing time)
- **Scalability**: No server bottleneck for PDF generation
- **Offline**: Works once page loads

## Testing Instructions

### Setup Backend
```bash
cd backend
# Install dependencies if needed
pip install -r requirements.txt
# Run server
python3 main.py
```

### Setup Frontend
```bash
cd frontend
# Dependencies already installed
npm run dev
```

### Test PDF Generation
1. Navigate to http://localhost:5173
2. Log in with Clerk
3. Go to your recipe collection
4. Click "Download PDF" on any recipe
5. First click loads data, second generates PDF
6. Compare output with server-generated PDF

## Notes

- Server-side Playwright PDF generation is still used for **cookbook PDFs** (multiple recipes)
- Only single recipe PDFs moved to client-side
- React-PDF uses React 18 API but works with React 19 using `--legacy-peer-deps`
- Height calculations use fixed estimates (Option A from plan) - can upgrade to dynamic measurement if needed

## Files Modified

- `frontend/package.json` - Added @react-pdf/renderer
- `frontend/src/components/RecipePDF.tsx` - New PDF component
- `frontend/src/components/RecipeCollection.tsx` - Updated to use client-side PDF
- `backend/main.py` - Added `/api/recipes/{recipe_id}/pdf-data` endpoint

## Next Steps

1. Test with various recipes to ensure layout matches
2. If pagination issues occur, implement Option B (dynamic height measurement)
3. Consider adding progress indicator for large PDFs
4. Deploy to production and verify memory usage stays low

