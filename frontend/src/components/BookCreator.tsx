import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useAuth as useClerkAuth } from '@clerk/clerk-react'
import { API_BASE_URL } from '../config'
import Navigation from './Navigation'

interface Recipe {
  id: number
  video_id: string
  title: string
  channel_name?: string
}

export default function BookCreator() {
  const [bookName, setBookName] = useState('')
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [selectedRecipes, setSelectedRecipes] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { getToken } = useClerkAuth()

  useEffect(() => {
    fetchRecipes()

    // If coming from recipe collection with pre-selected recipes
    const state = location.state as { selectedRecipeIds?: number[] }
    if (state?.selectedRecipeIds) {
      setSelectedRecipes(new Set(state.selectedRecipeIds))
    }
  }, [])

  const fetchRecipes = async () => {
    try {
      const token = await getToken()
      const response = await fetch(`${API_BASE_URL}/api/recipes`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch recipes')
      }

      const data = await response.json()
      setRecipes(data.recipes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleRecipe = (recipeId: number) => {
    setSelectedRecipes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(recipeId)) {
        newSet.delete(recipeId)
      } else {
        if (newSet.size >= 20) {
          alert('Maximum 20 recipes per book')
          return prev
        }
        newSet.add(recipeId)
      }
      return newSet
    })
  }

  const handleCreateBook = async () => {
    if (!bookName.trim()) {
      alert('Please enter a book name')
      return
    }

    if (selectedRecipes.size < 5) {
      alert('Please select at least 5 recipes')
      return
    }

    if (selectedRecipes.size > 20) {
      alert('Please select no more than 20 recipes')
      return
    }

    setCreating(true)
    setError(null)

    try {
      const token = await getToken()
      const response = await fetch(`${API_BASE_URL}/api/books`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: bookName,
          recipe_ids: Array.from(selectedRecipes),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to create book')
      }

      const data = await response.json()
      alert('Book created successfully!')
      navigate('/books')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setCreating(false)
    }
  }

  const isValid =
    bookName.trim() && selectedRecipes.size >= 5 && selectedRecipes.size <= 20

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading recipes...</p>
      </div>
    )
  }

  return (
    <div className="book-creator">
      <Navigation />
      <header className="creator-header">
        <div className="header-content">
          <h1>📖 Create a New Book</h1>
        </div>
      </header>

      <div className="creator-content">
        <div className="book-info-section">
          <h2>Book Details</h2>
          <input
            type="text"
            placeholder="Enter book name..."
            value={bookName}
            onChange={e => setBookName(e.target.value)}
            className="book-name-input"
          />

          <div className="selection-info">
            <p className="selection-count">
              Selected: {selectedRecipes.size} / 20 recipes
            </p>
            <p className="selection-requirement">
              {selectedRecipes.size < 5 &&
                `Need ${5 - selectedRecipes.size} more recipes (minimum 5)`}
              {selectedRecipes.size >= 5 &&
                selectedRecipes.size <= 20 &&
                '✓ Ready to create book'}
              {selectedRecipes.size > 20 && '⚠️ Too many recipes (maximum 20)'}
            </p>
          </div>

          {error && (
            <div className="error">
              <p>❌ {error}</p>
            </div>
          )}

          <button
            onClick={handleCreateBook}
            disabled={!isValid || creating}
            className="btn-primary btn-large"
          >
            {creating ? 'Creating Book...' : 'Create Book'}
          </button>
        </div>

        <div className="recipes-selection-section">
          <h2>Select Recipes (5-20)</h2>

          {recipes.length === 0 ? (
            <div className="empty-state">
              <p>You don't have any recipes yet.</p>
              <button
                onClick={() => navigate('/recipes/new')}
                className="btn-primary"
              >
                Add Your First Recipe
              </button>
            </div>
          ) : (
            <div className="recipes-list">
              {recipes.map(recipe => (
                <div
                  key={recipe.id}
                  className={`recipe-item ${
                    selectedRecipes.has(recipe.id) ? 'selected' : ''
                  }`}
                  onClick={() => handleToggleRecipe(recipe.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedRecipes.has(recipe.id)}
                    onChange={() => {}}
                    className="recipe-checkbox"
                  />
                  <div className="recipe-info">
                    <h3>{recipe.title}</h3>
                    {recipe.channel_name && (
                      <p className="channel-name">by {recipe.channel_name}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .book-creator {
          min-height: 100vh;
          background: #f5f5f5;
        }

        .creator-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 2rem;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
        }

        .header-content h1 {
          margin: 0;
          font-size: 2rem;
        }

        .creator-content {
          max-width: 1200px;
          margin: 2rem auto;
          padding: 0 2rem;
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 2rem;
        }

        @media (max-width: 768px) {
          .creator-content {
            grid-template-columns: 1fr;
          }
        }

        .book-info-section,
        .recipes-selection-section {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .book-info-section h2,
        .recipes-selection-section h2 {
          margin-top: 0;
          color: #333;
        }

        .book-name-input {
          width: 100%;
          padding: 1rem;
          border: 2px solid #ddd;
          border-radius: 8px;
          font-size: 1.1rem;
          margin-bottom: 1.5rem;
        }

        .book-name-input:focus {
          outline: none;
          border-color: #667eea;
        }

        .selection-info {
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .selection-count {
          font-size: 1.2rem;
          font-weight: 600;
          color: #333;
          margin: 0 0 0.5rem;
        }

        .selection-requirement {
          font-size: 0.95rem;
          color: #666;
          margin: 0;
        }

        .btn-large {
          width: 100%;
          padding: 1rem 2rem;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .recipes-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .recipe-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .recipe-item:hover {
          border-color: #667eea;
          background: #f8f9fa;
        }

        .recipe-item.selected {
          border-color: #667eea;
          background: #e8eaf6;
        }

        .recipe-checkbox {
          width: 20px;
          height: 20px;
          cursor: pointer;
        }

        .recipe-info {
          flex: 1;
        }

        .recipe-info h3 {
          margin: 0 0 0.25rem;
          font-size: 1rem;
          color: #333;
        }

        .channel-name {
          margin: 0;
          font-size: 0.85rem;
          color: #666;
        }

        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: #666;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          gap: 1rem;
        }
      `}</style>
    </div>
  )
}
