import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth as useClerkAuth } from '@clerk/clerk-react'
import config from '../config'
import PizzaTracker from './PizzaTracker'
import Navigation from './Navigation'
import ErrorModal from './ErrorModal'

export default function RecipeExtractor() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorModalData, setErrorModalData] = useState<{ message: string; suggestion?: string; title?: string; icon?: string } | null>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { getToken } = useClerkAuth()

  useEffect(() => {
    // Check if URL was passed from landing page
    const state = location.state as { url?: string }
    if (state?.url) {
      setUrl(state.url)
      // Auto-extract if URL is provided
      handleExtract(state.url)
    }
  }, [])

  const handleExtract = async (submitUrl?: string) => {
    const urlToExtract = submitUrl || url

    if (!urlToExtract) {
      alert('Please enter a YouTube URL')
      return
    }

    if (
      !urlToExtract.includes('youtube.com') &&
      !urlToExtract.includes('youtu.be')
    ) {
      alert('Please enter a valid YouTube URL')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const token = await getToken()
      // Extract recipe (will automatically save to user's collection)
      const response = await fetch(`${config.API_BASE_URL}/api/recipe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: urlToExtract }),
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
          setLoading(false)
          return
        }
        
        throw new Error(errorMessage)
      }

      const recipe = await response.json()

      // Extract visuals
      const keySteps: { [key: string]: string } = {}
      recipe.instructions?.forEach((step: any) => {
        if (step.is_key_step) {
          keySteps[step.step_number.toString()] = step.instruction
        }
      })

      await fetch(`${config.API_BASE_URL}/api/visuals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: urlToExtract, key_steps: keySteps }),
      })

      setSuccess(true)
      setTimeout(() => {
        navigate('/recipes')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const videoId =
    url.split('v=')[1]?.split('&')[0] ||
    url.split('youtu.be/')[1]?.split('?')[0]

  return (
    <div className="recipe-extractor">
      <Navigation />
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
      <header className="extractor-header">
        <div className="header-content">
          <h1>🍳 Add New Recipe</h1>
        </div>
      </header>

      <div className="extractor-content">
        {!loading && !success && (
          <div className="input-section">
            <h2>Enter YouTube Video URL</h2>
            <div className="url-input-container">
              <input
                type="text"
                placeholder="https://www.youtube.com/watch?v=..."
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="url-input"
              />
              <button onClick={() => handleExtract()} className="btn-primary">
                Extract Recipe
              </button>
            </div>
          </div>
        )}

        {loading && videoId && (
          <div className="loading-section">
            <PizzaTracker videoId={videoId} />
          </div>
        )}

        {success && (
          <div className="success-section">
            <div className="success-icon">✅</div>
            <h2>Recipe Added Successfully!</h2>
            <p>Redirecting to your collection...</p>
          </div>
        )}

        {error && (
          <div className="error">
            <p>❌ {error}</p>
            <button onClick={() => setError(null)} className="btn-secondary">
              Try Again
            </button>
          </div>
        )}
      </div>

      <style>{`
        .recipe-extractor {
          min-height: 100vh;
          background: #f8f9fa;
        }

        .extractor-header {
          background: white;
          color: #1a1f3a;
          padding: 2rem;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          border-bottom: 1px solid #e5e7eb;
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
        }

        .header-content h1 {
          margin: 0;
          font-size: 2rem;
          color: #1a1f3a;
        }

        .extractor-content {
          max-width: 800px;
          margin: 3rem auto;
          padding: 0 2rem;
        }

        .input-section {
          background: white;
          border-radius: 12px;
          padding: 3rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .input-section h2 {
          margin-top: 0;
          color: #333;
          text-align: center;
        }

        .url-input-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .url-input {
          padding: 1rem;
          border: 2px solid #ddd;
          border-radius: 8px;
          font-size: 1rem;
        }

        .url-input:focus {
          outline: none;
          border-color: #ff6b35;
          box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
        }

        .loading-section {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .success-section {
          background: white;
          border-radius: 12px;
          padding: 3rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          text-align: center;
        }

        .success-icon {
          font-size: 5rem;
          margin-bottom: 1rem;
        }

        .success-section h2 {
          color: #10b981;
          margin-bottom: 1rem;
        }

        .success-section p {
          color: #666;
        }
      `}</style>
    </div>
  )
}
