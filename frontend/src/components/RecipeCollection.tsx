import { useState, useEffect, useCallback } from 'react'
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react'
import { API_BASE_URL } from '../config'
import Navigation from './Navigation'
import ExtractionModal from './ExtractionModal'
import ErrorModal from './ErrorModal'

interface Recipe {
  id: number
  video_id: string
  video_url: string
  title: string
  channel_name?: string
  recipe_data: any
  created_at: string
}

export default function RecipeCollection() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const [imageRetryKeys, setImageRetryKeys] = useState<Map<string, number>>(new Map())
  const [extractUrl, setExtractUrl] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [extractingVideoId, setExtractingVideoId] = useState<string | null>(null)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorModalData, setErrorModalData] = useState<{ message: string; suggestion?: string; title?: string; icon?: string } | null>(null)
  const { getToken } = useClerkAuth()
  const { isLoaded: isUserLoaded, isSignedIn } = useUser()

  const handleImageError = (videoId: string) => {
    setImageErrors(prev => new Set(prev).add(videoId))
  }

  const handleExtractRecipe = async () => {
    if (!extractUrl) {
      alert('Please enter a YouTube URL')
      return
    }

    if (!extractUrl.includes('youtube.com') && !extractUrl.includes('youtu.be')) {
      alert('Please enter a valid YouTube URL')
      return
    }

    setExtracting(true)
    setError(null)

    // Extract video ID from URL first to show modal immediately
    let videoId: string | null = null
    if (extractUrl.includes('youtube.com/watch?v=')) {
      videoId = extractUrl.split('v=')[1]?.split('&')[0] || null
    } else if (extractUrl.includes('youtu.be/')) {
      videoId = extractUrl.split('youtu.be/')[1]?.split('?')[0] || null
    }

    // Show modal immediately when extraction starts
    if (videoId) {
      setExtractingVideoId(videoId)
    }

    try {
      const token = await getToken()
      const response = await fetch(`${API_BASE_URL}/api/recipes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: extractUrl }),
      })

      if (!response.ok) {
        // Try to parse error response
        let errorMessage = 'Failed to extract recipe'
        let isNotRecipeVideo = false
        let isNoTranscript = false
        let suggestion = ''
        try {
          const errorData = await response.json()
          // Check if it's a structured error response
          if (errorData.detail) {
            if (typeof errorData.detail === 'object' && errorData.detail.error === 'not_recipe_video') {
              isNotRecipeVideo = true
              errorMessage = errorData.detail.message || 'This video does not appear to be a recipe video'
              suggestion = errorData.detail.suggestion || 'Please try a cooking tutorial or recipe video.'
            } else if (typeof errorData.detail === 'object' && errorData.detail.error === 'no_transcript') {
              isNoTranscript = true
              errorMessage = errorData.detail.message || 'This video does not have a transcript available'
              suggestion = errorData.detail.suggestion || 'Please try a video with English subtitles or captions enabled.'
            } else if (typeof errorData.detail === 'string') {
              errorMessage = errorData.detail
            } else if (errorData.detail.message) {
              errorMessage = errorData.detail.message
            }
          }
        } catch (e) {
          // If parsing fails, use default message
        }

        // Show modal for non-recipe video errors and no transcript errors
        if (isNotRecipeVideo || isNoTranscript) {
          setErrorModalData({ message: errorMessage, suggestion })
          setShowErrorModal(true)
          setExtracting(false)
          setExtractingVideoId(null)
          return
        }
        
        throw new Error(errorMessage)
      }
      
      await response.json()
      
      // Clear the input and refresh recipes
      setExtractUrl('')
      await fetchRecipes()

      // Modal will continue polling status and close when all steps complete
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract recipe')
      setExtractingVideoId(null)
    } finally {
      setExtracting(false)
    }
  }

  const fetchRecipes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const token = await getToken()
      
      if (!token) {
        throw new Error('No authentication token available')
      }
      
      console.log('Fetching recipes from:', `${API_BASE_URL}/api/recipes`)
      const response = await fetch(`${API_BASE_URL}/api/recipes`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      console.log('Response status:', response.status, response.statusText)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error response:', errorText)
        let errorMessage = 'Failed to fetch recipes'
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.detail || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log('Recipes data received:', data)
      console.log('Number of recipes:', data.recipes?.length || 0)
      
      if (data.recipes && Array.isArray(data.recipes)) {
        setRecipes(data.recipes)
      } else {
        console.warn('Unexpected data format:', data)
        setRecipes([])
      }
    } catch (err) {
      console.error('Error fetching recipes:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    // Wait for Clerk to load and user to be signed in before fetching
    if (isUserLoaded && isSignedIn) {
      fetchRecipes()
    } else if (isUserLoaded && !isSignedIn) {
      // User is not signed in, set loading to false
      setLoading(false)
      setError('Please sign in to view your recipes')
    }
  }, [isUserLoaded, isSignedIn, fetchRecipes])

  const handleDeleteRecipe = async (recipeId: number) => {
    if (
      !confirm(
        'Are you sure you want to remove this recipe from your collection?'
      )
    ) {
      return
    }

    try {
      const token = await getToken()
      const response = await fetch(
        `${API_BASE_URL}/api/recipes/${recipeId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to delete recipe')
      }

      setRecipes(recipes.filter(r => r.id !== recipeId))
    } catch (err) {
      alert('Failed to delete recipe')
    }
  }

  const handleModalComplete = () => {
    const completedVideoId = extractingVideoId
    setExtractingVideoId(null)
    
    // Clear image error for this video if it was previously marked as error
    // and increment retry key to force image reload
    if (completedVideoId) {
      setImageErrors(prev => {
        const newSet = new Set(prev)
        newSet.delete(completedVideoId)
        return newSet
      })
      // Increment retry key to force React to reload the image
      setImageRetryKeys(prev => {
        const newMap = new Map(prev)
        const currentKey = newMap.get(completedVideoId) || 0
        newMap.set(completedVideoId, currentKey + 1)
        return newMap
      })
    }
    
    // Refresh recipes to show new images
    fetchRecipes()
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading your recipes...</p>
      </div>
    )
  }

  return (
    <div className="recipe-collection">
      <Navigation />
      {extractingVideoId && (
        <ExtractionModal videoId={extractingVideoId} onComplete={handleModalComplete} />
      )}
      {showErrorModal && errorModalData && (
        <ErrorModal
          message={errorModalData.message}
          suggestion={errorModalData.suggestion}
          title={errorModalData.title}
          icon={errorModalData.icon}
          onClose={() => {
            setShowErrorModal(false)
            setErrorModalData(null)
            setError(null)
          }}
        />
      )}
      <header className="collection-header">
        <div className="header-content">
          <h1>My recipes</h1>
          <p className="header-subtitle">Add your favorite recipes and build your personalized cookbook</p>
        </div>
      </header>

      <div className="collection-actions">
        <div className="extract-recipe-section">
          <div className="url-input-wrapper">
            <span className="input-icon">∞</span>
            <input
              type="text"
              placeholder="Paste YouTube URL here..."
              value={extractUrl}
              onChange={e => setExtractUrl(e.target.value)}
              onKeyPress={e => {
                if (e.key === 'Enter') {
                  handleExtractRecipe()
                }
              }}
              className="extract-url-input"
              disabled={extracting}
            />
          </div>
          <button
            onClick={handleExtractRecipe}
            className="btn-primary extract-button"
            disabled={extracting || !extractUrl.trim()}
          >
            {extracting ? 'Extracting...' : 'Extract Recipe'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error">
          <p>{error}</p>
        </div>
      )}

      {recipes.length === 0 ? (
        <div className="empty-state">
          <h2>No recipes yet</h2>
          <p>Use the input above to add your first recipe!</p>
        </div>
      ) : (
        <div className="recipes-grid">
          {recipes.map(recipe => {
            const hasImageError = imageErrors.has(recipe.video_id)
            const retryKey = imageRetryKeys.get(recipe.video_id) || 0
            const imageUrl = `${API_BASE_URL}/api/cache/${recipe.video_id}/image${retryKey > 0 ? `?retry=${retryKey}` : ''}`
            
            return (
              <div key={recipe.id} className={`recipe-card ${hasImageError ? 'no-image' : ''}`}>
                {!hasImageError ? (
                  <>
                    <img
                      key={`img-${recipe.video_id}-${retryKey}`}
                      src={imageUrl}
                      alt=""
                      className="recipe-card-background-image"
                      onError={() => handleImageError(recipe.video_id)}
                    />
                    <div className="recipe-card-overlay" />
                  </>
                ) : (
                  <div className="recipe-card-background-fallback" />
                )}
                <button
                  onClick={() => handleDeleteRecipe(recipe.id)}
                  className="recipe-delete-button"
                  aria-label="Delete recipe"
                >
                  ×
                </button>
                <div className="recipe-card-content">
                  <div className="recipe-card-header">
                    <div className="recipe-title-section">
                      <h3>{recipe.title}</h3>
                      {recipe.channel_name && (
                        <p className="channel-name">by {recipe.channel_name}</p>
                      )}
                    </div>
                  </div>
                  <div className="recipe-card-actions">
                    <a
                      href={recipe.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-link"
                    >
                      Watch Video
                    </a>
                    <a
                      href={`${API_BASE_URL}/api/cache/${recipe.video_id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-link"
                    >
                      Preview
                    </a>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        .recipe-collection {
          min-height: 100vh;
          background: #ffffff;
        }

        .collection-header {
          background: transparent;
          color: #1a1f3a;
          padding: 4rem 2rem 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .header-content {
          max-width: 1400px;
          margin: 0 auto;
        }

        .header-content h1 {
          margin: 0 0 0.5rem;
          font-size: 3rem;
          font-weight: 800;
          color: #1a1f3a !important;
          background: none !important;
          -webkit-background-clip: unset !important;
          -webkit-text-fill-color: #1a1f3a !important;
          background-clip: unset !important;
          line-height: 1.2;
        }

        .header-subtitle {
          margin: 0;
          font-size: 1.125rem;
          color: #6b7280;
          line-height: 1.6;
        }

        @media (max-width: 768px) {
          .header-content h1 {
            font-size: 2rem;
          }

          .header-subtitle {
            font-size: 1rem;
          }
        }

        .collection-actions {
          max-width: 1400px;
          margin: 3rem auto 2rem;
          padding: 0 2rem;
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          align-items: center;
        }

        .extract-recipe-section {
          flex: 1;
          min-width: 300px;
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .url-input-wrapper {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 1rem;
          font-size: 1.25rem;
          color: #6b7280;
          z-index: 1;
        }

        .extract-url-input {
          width: 100%;
          padding: 1rem 1rem 1rem 3rem;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 1rem;
          background: white;
          color: #1a1f3a;
          transition: all 0.2s;
        }

        .extract-url-input:focus {
          outline: none;
          border-color: #1a1f3a;
          box-shadow: 0 0 0 3px rgba(26, 31, 58, 0.1);
        }

        .extract-url-input:disabled {
          background: #f3f4f6;
          cursor: not-allowed;
        }

        .extract-button {
          padding: 1rem 2rem;
          white-space: nowrap;
        }

        .extract-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .recipes-grid {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 2rem 4rem;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 2rem;
        }

        .recipe-card {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          min-height: 300px;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .recipe-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
        }

        .recipe-delete-button {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: none;
          border: none;
          color: white;
          font-size: 2rem;
          font-weight: 300;
          line-height: 1;
          cursor: pointer;
          z-index: 2;
          padding: 0;
          width: auto;
          height: auto;
          transition: opacity 0.2s;
        }

        .recipe-delete-button:hover {
          opacity: 0.7;
        }

        .recipe-card-background-image {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          z-index: 0;
        }

        .recipe-card-background-fallback {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #e5e7eb 0%, #f3f4f6 100%);
          z-index: 0;
        }

        .recipe-card.no-image .recipe-card-overlay {
          background: rgba(0, 0, 0, 0.05);
        }

        .recipe-card.no-image .recipe-card-content {
          color: #1a1f3a;
        }

        .recipe-card.no-image h3 {
          color: #1a1f3a;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .recipe-card.no-image .channel-name {
          color: #6b7280;
          font-weight: 700;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .recipe-card-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0) 0%,
            rgba(0, 0, 0, 0.2) 40%,
            rgba(0, 0, 0, 0.6) 100%
          );
          z-index: 1;
        }

        .recipe-card:has(.recipe-card-background:not([style*="background-image"])) .recipe-card-overlay {
          background: rgba(0, 0, 0, 0.1);
        }

        .recipe-card:has(.recipe-card-background:not([style*="background-image"])) .recipe-card-content {
          color: #1a1f3a;
        }

        .recipe-card:has(.recipe-card-background:not([style*="background-image"])) h3 {
          color: #1a1f3a;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .recipe-card:has(.recipe-card-background:not([style*="background-image"])) .channel-name {
          color: #6b7280;
          font-weight: 700;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .recipe-card-content {
          position: relative;
          z-index: 1;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 2rem;
          color: white;
          width: 100%;
          box-sizing: border-box;
        }

        .recipe-card-header {
          margin-bottom: 1rem;
          width: 100%;
        }

        .recipe-title-section {
          width: 100%;
          max-width: 100%;
        }

        .recipe-card h3 {
          margin: 0 0 0.5rem;
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.7);
          line-height: 1.3;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .channel-name {
          color: rgba(255, 255, 255, 0.9);
          font-size: 0.95rem;
          font-weight: 700;
          margin: 0;
          word-wrap: break-word;
          overflow-wrap: break-word;
          line-height: 1.4;
          width: 100%;
          max-width: 100%;
          white-space: normal;
          text-align: left;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.7);
        }

        .recipe-card-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: auto;
          flex-wrap: wrap;
        }

        .btn-link {
          padding: 0.75rem 1.25rem;
          background: rgba(255, 255, 255, 0.95);
          border: none;
          border-radius: 8px;
          cursor: pointer;
          text-decoration: none;
          color: #1a1f3a;
          font-size: 0.9rem;
          font-weight: 600;
          transition: all 0.2s;
          display: inline-block;
        }

        .btn-link:hover {
          background: white;
          transform: translateY(-1px);
        }

        .btn-danger-small {
          padding: 0.75rem 1.25rem;
          background: rgba(239, 68, 68, 0.95);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
          transition: all 0.2s;
        }

        .btn-danger-small:hover {
          background: rgba(220, 38, 38, 0.95);
          transform: translateY(-1px);
        }

        .btn-success {
          background: #10b981;
          color: white;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          transition: background 0.2s;
        }

        .btn-success:hover {
          background: #059669;
        }

        .empty-state {
          max-width: 600px;
          margin: 4rem auto;
          text-align: center;
          padding: 3rem;
          background: transparent;
        }

        .empty-state h2 {
          color: #1a1f3a;
          font-weight: 700;
          font-size: 1.5rem;
          margin-bottom: 1rem;
        }

        .empty-state p {
          color: #6b7280;
          font-size: 1rem;
          margin-bottom: 2rem;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          gap: 1rem;
          color: #6b7280;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e5e7eb;
          border-top-color: #1a1f3a;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .error {
          max-width: 1200px;
          margin: 1rem auto;
          padding: 1rem 2rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #ef4444;
        }

        .error p {
          margin: 0;
        }
      `}</style>
    </div>
  )
}
