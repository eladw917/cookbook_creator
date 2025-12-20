import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useAuth as useClerkAuth } from '@clerk/clerk-react'
import { API_BASE_URL } from '../config'
import Navigation from './Navigation'

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
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRecipes, setSelectedRecipes] = useState<Set<number>>(new Set())
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { getToken } = useClerkAuth()

  useEffect(() => {
    fetchRecipes()
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
      setSelectedRecipes(prev => {
        const newSet = new Set(prev)
        newSet.delete(recipeId)
        return newSet
      })
    } catch (err) {
      alert('Failed to delete recipe')
    }
  }

  const handleToggleSelect = (recipeId: number) => {
    setSelectedRecipes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(recipeId)) {
        newSet.delete(recipeId)
      } else {
        newSet.add(recipeId)
      }
      return newSet
    })
  }

  const handleCreateBook = () => {
    if (selectedRecipes.size < 5) {
      alert('Please select at least 5 recipes to create a book')
      return
    }
    if (selectedRecipes.size > 20) {
      alert('Please select no more than 20 recipes for a book')
      return
    }
    navigate('/books/create', {
      state: { selectedRecipeIds: Array.from(selectedRecipes) },
    })
  }

  const filteredRecipes = recipes.filter(
    recipe =>
      recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (recipe.channel_name &&
        recipe.channel_name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

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
      <header className="collection-header">
        <div className="header-content">
          <h1>🍳 My Recipe Collection</h1>
        </div>
      </header>

      <div className="collection-actions">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search recipes..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="action-buttons">
          <button
            onClick={() => navigate('/recipes/new')}
            className="btn-primary"
          >
            + Add New Recipe
          </button>
          <button onClick={() => navigate('/books')} className="btn-secondary">
            📚 My Books
          </button>
          {selectedRecipes.size > 0 && (
            <button onClick={handleCreateBook} className="btn-success">
              Create Book ({selectedRecipes.size} selected)
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="error">
          <p>❌ {error}</p>
        </div>
      )}

      {recipes.length === 0 ? (
        <div className="empty-state">
          <h2>No recipes yet</h2>
          <p>Start by adding your first recipe!</p>
          <button
            onClick={() => navigate('/recipes/new')}
            className="btn-primary"
          >
            Add Recipe
          </button>
        </div>
      ) : (
        <div className="recipes-grid">
          {filteredRecipes.map(recipe => (
            <div key={recipe.id} className="recipe-card">
              <div className="recipe-card-header">
                <input
                  type="checkbox"
                  checked={selectedRecipes.has(recipe.id)}
                  onChange={() => handleToggleSelect(recipe.id)}
                  className="recipe-checkbox"
                />
                <h3>{recipe.title}</h3>
              </div>
              {recipe.channel_name && (
                <p className="channel-name">by {recipe.channel_name}</p>
              )}
              <div className="recipe-card-actions">
                <a
                  href={recipe.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-link"
                >
                  🎥 Watch Video
                </a>
                <a
                  href={`${API_BASE_URL}/api/cache/${recipe.video_id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-link"
                >
                  📄 View PDF
                </a>
                <button
                  onClick={() => handleDeleteRecipe(recipe.id)}
                  className="btn-danger-small"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .recipe-collection {
          min-height: 100vh;
          background: #f5f5f5;
        }

        .collection-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 2rem;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-content h1 {
          margin: 0;
          font-size: 2rem;
        }

        .collection-actions {
          max-width: 1200px;
          margin: 2rem auto;
          padding: 0 2rem;
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          align-items: center;
        }

        .search-bar {
          flex: 1;
          min-width: 250px;
        }

        .search-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 1rem;
        }

        .action-buttons {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .recipes-grid {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem 2rem;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .recipe-card {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .recipe-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }

        .recipe-card-header {
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
          margin-bottom: 0.5rem;
        }

        .recipe-checkbox {
          margin-top: 0.25rem;
          width: 20px;
          height: 20px;
          cursor: pointer;
        }

        .recipe-card h3 {
          margin: 0;
          font-size: 1.2rem;
          color: #333;
          flex: 1;
        }

        .channel-name {
          color: #666;
          font-size: 0.9rem;
          margin: 0.5rem 0;
        }

        .recipe-card-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
          flex-wrap: wrap;
        }

        .btn-link {
          padding: 0.5rem 1rem;
          background: #f0f0f0;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          text-decoration: none;
          color: #333;
          font-size: 0.9rem;
          transition: background 0.2s;
        }

        .btn-link:hover {
          background: #e0e0e0;
        }

        .btn-danger-small {
          padding: 0.5rem 1rem;
          background: #ff4444;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: background 0.2s;
        }

        .btn-danger-small:hover {
          background: #cc0000;
        }

        .btn-success {
          background: #28a745;
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
          background: #218838;
        }

        .empty-state {
          max-width: 600px;
          margin: 4rem auto;
          text-align: center;
          padding: 3rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .empty-state h2 {
          color: #333;
          margin-bottom: 1rem;
        }

        .empty-state p {
          color: #666;
          margin-bottom: 2rem;
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
