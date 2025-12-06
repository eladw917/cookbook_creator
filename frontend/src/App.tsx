import { useState, useEffect, useRef } from 'react'
import './App.css'
import UrlInput from './components/UrlInput'
import CacheView from './components/CacheView'
import PipelineStatus from './components/PipelineStatus'
import PizzaTracker from './components/PizzaTracker'
import config from './config'

export interface Recipe {
  title: string
  servings: string
  prep_time: string
  cook_time: string
  total_time: string
  difficulty: string
  description: string
  channel_name?: string
  video_url?: string
  ingredients: {
    quantity: string
    unit: string
    ingredient: string
    purpose?: string
  }[]
  instructions: {
    step_number: number
    category: string
    instruction: string
    is_key_step?: boolean
  }[]
}

export interface Visuals {
  [key: string]: {
    timestamp: string | null
    frame_base64: string | null
  }
}

function App() {
  const [url, setUrl] = useState('')
  const [videoId, setVideoId] = useState<string | null>(null)
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCache, setShowCache] = useState(true)
  const [pdfReady, setPdfReady] = useState(false)
  const [checkingPdf, setCheckingPdf] = useState(false)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Extract video ID when URL changes
  useEffect(() => {
    try {
      if (url.includes('v=')) {
        const id = url.split('v=')[1].split('&')[0]
        setVideoId(id)
      } else if (url.includes('youtu.be/')) {
        const id = url.split('youtu.be/')[1].split('?')[0]
        setVideoId(id)
      } else {
        setVideoId(null)
      }
    } catch (e) {
      setVideoId(null)
    }
  }, [url])

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [])

  const handleSelectCachedVideo = (id: string, videoUrl: string) => {
    setUrl(videoUrl)
    setVideoId(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Check PDF status and poll until ready
  const checkPdfStatus = (id: string) => {
    setCheckingPdf(true)
    setPdfReady(false)

    // Clear any existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(
          `${config.API_BASE_URL}/api/cache/${id}/status`
        )
        if (response.ok) {
          const status = await response.json()
          if (status.pdf) {
            setPdfReady(true)
            setCheckingPdf(false)
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }
          }
        }
      } catch (err) {
        console.error('Error checking PDF status:', err)
      }
    }, 2000) // Poll every 2 seconds
  }

  const handleExtract = async (submitUrl: string) => {
    setLoading(true)
    setError(null)
    setRecipe(null)
    setShowCache(false)

    try {
      // Step 1: Extract recipe
      const recipeResponse = await fetch(`${config.API_BASE_URL}/api/recipe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: submitUrl }),
      })

      if (!recipeResponse.ok) {
        throw new Error('Failed to extract recipe')
      }

      const recipeData = await recipeResponse.json()
      setRecipe(recipeData)

      // Start checking for PDF after recipe extraction
      if (videoId) {
        checkPdfStatus(videoId)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setShowCache(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header>
        <h1>🍳 Recipe Extract</h1>
        <p>Extract structured recipes from YouTube cooking videos</p>
      </header>

      <UrlInput
        url={url}
        onUrlChange={setUrl}
        onExtract={handleExtract}
        loading={loading}
      />

      {loading && videoId && <PizzaTracker videoId={videoId} />}

      {videoId && !loading && !recipe && <PipelineStatus videoId={videoId} />}

      {error && (
        <div className="error">
          <p>❌ {error}</p>
        </div>
      )}

      {!recipe && !loading && showCache && (
        <CacheView onSelectVideo={handleSelectCachedVideo} />
      )}

      {recipe && (
        <div>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <button
              className="btn-secondary"
              onClick={() => {
                setRecipe(null)
                setShowCache(true)
                setPdfReady(false)
                setCheckingPdf(false)
                if (pollIntervalRef.current) {
                  clearInterval(pollIntervalRef.current)
                  pollIntervalRef.current = null
                }
                // Keep URL and VideoID so user can easily re-run or modify
              }}
            >
              ← Back to Cache / Search
            </button>
            {videoId && (
              <button
                className="btn-primary"
                onClick={() => {
                  // Download PDF from backend with download=true to force download
                  const pdfUrl = `${config.API_BASE_URL}/api/cache/${videoId}/pdf?download=true`
                  window.open(pdfUrl, '_blank')
                }}
              >
                📥 Download PDF
              </button>
            )}
          </div>

          {/* PDF Preview Section */}
          {videoId && (
            <div className="pdf-preview-container">
              {checkingPdf && !pdfReady && (
                <div className="pdf-loading">
                  <div className="spinner"></div>
                  <p>Generating PDF preview...</p>
                </div>
              )}

              {pdfReady && (
                <div className="pdf-iframe-wrapper">
                  <iframe
                    src={`${config.API_BASE_URL}/api/cache/${videoId}/pdf`}
                    title="Recipe PDF Preview"
                    className="pdf-iframe"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default App
