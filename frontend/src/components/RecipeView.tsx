import PDFView from './PDFView'
import type { Recipe, Visuals } from '../App'
import { useEffect, useState } from 'react'

interface RecipeViewProps {
    recipe: Recipe
    visuals: Visuals | null
}

export default function RecipeView({ recipe, visuals }: RecipeViewProps) {
    const [videoId, setVideoId] = useState<string | null>(null)

    useEffect(() => {
        // Extract video ID from recipe's video_url
        if (recipe.video_url) {
            try {
                if (recipe.video_url.includes('v=')) {
                    const id = recipe.video_url.split('v=')[1].split('&')[0]
                    setVideoId(id)
                } else if (recipe.video_url.includes('youtu.be/')) {
                    const id = recipe.video_url.split('youtu.be/')[1].split('?')[0]
                    setVideoId(id)
                }
            } catch (e) {
                console.error('Failed to extract video ID:', e)
            }
        }
    }, [recipe.video_url])

    return (
        <div className="recipe-container">
            {videoId ? (
                <PDFView videoId={videoId} />
            ) : (
                <div className="pdf-error">
                    Unable to load PDF: Video ID not found
                </div>
            )}
        </div>
    )
}
