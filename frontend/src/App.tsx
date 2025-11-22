import { useState, useEffect } from 'react'
import './App.css'
import UrlInput from './components/UrlInput'
import RecipeView from './components/RecipeView'
import CacheView from './components/CacheView'
import PipelineStatus from './components/PipelineStatus'
import PizzaTracker from './components/PizzaTracker'

export interface Recipe {
  title: string;
  servings: string;
  prep_time: string;
  cook_time: string;
  total_time: string;
  difficulty: string;
  description: string;
  channel_name?: string;
  video_url?: string;
  ingredients: {
    quantity: string;
    unit: string;
    ingredient: string;
    purpose?: string;
  }[];
  instructions: {
    step_number: number;
    category: string;
    instruction: string;
    is_key_step?: boolean;
  }[];
}

export interface Visuals {
  [key: string]: {
    timestamp: string | null;
    frame_base64: string | null;
  };
}

function App() {
  const [url, setUrl] = useState('')
  const [videoId, setVideoId] = useState<string | null>(null)
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [visuals, setVisuals] = useState<Visuals | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCache, setShowCache] = useState(true)

  // Extract video ID when URL changes
  useEffect(() => {
    try {
      if (url.includes('v=')) {
        const id = url.split('v=')[1].split('&')[0];
        setVideoId(id);
      } else if (url.includes('youtu.be/')) {
        const id = url.split('youtu.be/')[1].split('?')[0];
        setVideoId(id);
      } else {
        setVideoId(null);
      }
    } catch (e) {
      setVideoId(null);
    }
  }, [url]);

  const handleSelectCachedVideo = (id: string, videoUrl: string) => {
    setUrl(videoUrl);
    setVideoId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExtract = async (submitUrl: string) => {
    setLoading(true)
    setError(null)
    setRecipe(null)
    setVisuals(null)
    setShowCache(false)

    try {
      // Step 1: Extract recipe
      const recipeResponse = await fetch('http://localhost:8000/api/recipe', {
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

      // Step 2: Extract visuals for key steps
      const keySteps: { [key: string]: string } = {}
      recipeData.instructions.forEach((step: any) => {
        if (step.is_key_step) {
          keySteps[step.step_number.toString()] = step.instruction
        }
      })

      const visualsResponse = await fetch('http://localhost:8000/api/visuals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: submitUrl, key_steps: keySteps }),
      })

      if (!visualsResponse.ok) {
        throw new Error('Failed to extract visuals')
      }

      const visualsData = await visualsResponse.json()
      setVisuals(visualsData)
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

      {loading && videoId && (
        <PizzaTracker videoId={videoId} />
      )}

      {videoId && !loading && !recipe && (
        <PipelineStatus videoId={videoId} />
      )}

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
          <button
            className="btn-secondary"
            style={{ marginBottom: '1rem' }}
            onClick={() => {
              setRecipe(null);
              setVisuals(null);
              setShowCache(true);
              // Keep URL and VideoID so user can easily re-run or modify
            }}
          >
            ← Back to Cache / Search
          </button>
          <RecipeView recipe={recipe} visuals={visuals} />
        </div>
      )}
    </div>
  )
}

export default App
