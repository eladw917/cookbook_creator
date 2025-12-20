import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth as useClerkAuth } from '@clerk/clerk-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { API_BASE_URL } from '../config'
import Navigation from './Navigation'
import PrintOrderModal from './PrintOrderModal'

interface Recipe {
  id: number
  video_id: string
  title: string
  channel_name?: string
  video_url: string
  recipe_data: any
}

interface BookData {
  id: number
  name: string
  user_id: number
  created_at: string
  updated_at: string
  recipe_count: number
  recipes: Recipe[]
}

interface SortableRecipeProps {
  recipe: Recipe
  onRemove: (id: number) => void
}

function SortableRecipe({ recipe, onRemove }: SortableRecipeProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: recipe.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="sortable-recipe-item">
      <div className="drag-handle" {...attributes} {...listeners}>
        ⋮⋮
      </div>
      <div className="recipe-info">
        <h3>{recipe.title}</h3>
        {recipe.channel_name && (
          <p className="channel-name">by {recipe.channel_name}</p>
        )}
      </div>
      <button
        onClick={() => onRemove(recipe.id)}
        className="btn-remove"
        type="button"
      >
        ✕
      </button>
    </div>
  )
}

export default function BookEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getToken } = useClerkAuth()

  const [bookName, setBookName] = useState('')
  const [bookRecipes, setBookRecipes] = useState<Recipe[]>([])
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([])
  const [availableRecipes, setAvailableRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [showAddRecipes, setShowAddRecipes] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchBookAndRecipes()
  }, [id])

  useEffect(() => {
    // Update available recipes (recipes not in the book)
    const bookRecipeIds = new Set(bookRecipes.map(r => r.id))
    setAvailableRecipes(allRecipes.filter(r => !bookRecipeIds.has(r.id)))
  }, [bookRecipes, allRecipes])

  useEffect(() => {
    // Warn before leaving with unsaved changes
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasChanges])

  const fetchBookAndRecipes = async () => {
    try {
      const token = await getToken()

      // Fetch book details
      const bookResponse = await fetch(
        `${API_BASE_URL}/api/books/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!bookResponse.ok) {
        throw new Error('Failed to fetch book')
      }

      const bookData: BookData = await bookResponse.json()
      setBookName(bookData.name)
      setBookRecipes(bookData.recipes)

      // Fetch all user recipes
      const recipesResponse = await fetch(
        `${API_BASE_URL}/api/recipes`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!recipesResponse.ok) {
        throw new Error('Failed to fetch recipes')
      }

      const recipesData = await recipesResponse.json()
      setAllRecipes(recipesData.recipes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setBookRecipes(recipes => {
        const oldIndex = recipes.findIndex(r => r.id === active.id)
        const newIndex = recipes.findIndex(r => r.id === over.id)
        return arrayMove(recipes, oldIndex, newIndex)
      })
      setHasChanges(true)
    }
  }

  const handleRemoveRecipe = (recipeId: number) => {
    if (bookRecipes.length <= 5) {
      alert('Book must contain at least 5 recipes')
      return
    }
    setBookRecipes(recipes => recipes.filter(r => r.id !== recipeId))
    setHasChanges(true)
  }

  const handleAddRecipe = (recipe: Recipe) => {
    if (bookRecipes.length >= 20) {
      alert('Book cannot contain more than 20 recipes')
      return
    }
    setBookRecipes(recipes => [...recipes, recipe])
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!bookName.trim()) {
      alert('Please enter a book name')
      return
    }

    if (bookRecipes.length < 5 || bookRecipes.length > 20) {
      alert('Book must contain between 5 and 20 recipes')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const token = await getToken()
      const response = await fetch(`${API_BASE_URL}/api/books/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: bookName,
          recipe_ids: bookRecipes.map(r => r.id),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to update book')
      }

      setHasChanges(false)
      alert('Book updated successfully!')
      navigate('/books')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (
      hasChanges &&
      !confirm('You have unsaved changes. Are you sure you want to leave?')
    ) {
      return
    }
    navigate('/books')
  }

  const isValid =
    bookName.trim() && bookRecipes.length >= 5 && bookRecipes.length <= 20

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading book...</p>
      </div>
    )
  }

  return (
    <div className="book-editor">
      <Navigation />
      <header className="editor-header">
        <div className="header-content">
          <h1>✏️ Edit Book</h1>
        </div>
      </header>

      <div className="editor-content">
        <div className="editor-sidebar">
          <div className="book-info-section">
            <h2>Book Details</h2>
            <input
              type="text"
              placeholder="Enter book name..."
              value={bookName}
              onChange={e => {
                setBookName(e.target.value)
                setHasChanges(true)
              }}
              className="book-name-input"
            />

            <div className="selection-info">
              <p className="selection-count">
                Recipes: {bookRecipes.length} / 20
              </p>
              <p className="selection-requirement">
                {bookRecipes.length < 5 &&
                  `Need ${5 - bookRecipes.length} more recipes (minimum 5)`}
                {bookRecipes.length >= 5 &&
                  bookRecipes.length <= 20 &&
                  '✓ Valid recipe count'}
                {bookRecipes.length > 20 && '⚠️ Too many recipes (maximum 20)'}
              </p>
            </div>

            {error && (
              <div className="error">
                <p>❌ {error}</p>
              </div>
            )}

            <div className="action-buttons">
              <button
                onClick={handleSave}
                disabled={!isValid || saving || !hasChanges}
                className="btn-primary btn-large"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={handleCancel}
                className="btn-secondary btn-large"
              >
                Cancel
              </button>
            </div>

            {isValid && !hasChanges && (
              <div className="print-order-section">
                <button
                  onClick={() => setShowPrintModal(true)}
                  className="btn-print btn-large"
                >
                  📦 Order Printed Book
                </button>
                <p className="print-info">
                  Get a physical copy of your cookbook delivered to your door
                </p>
              </div>
            )}
          </div>

          {availableRecipes.length > 0 && (
            <div className="add-recipes-section">
              <button
                onClick={() => setShowAddRecipes(!showAddRecipes)}
                className="btn-secondary btn-large"
              >
                {showAddRecipes ? '− Hide Available Recipes' : '+ Add Recipes'}
              </button>

              {showAddRecipes && (
                <div className="available-recipes-list">
                  <h3>Available Recipes</h3>
                  {availableRecipes.map(recipe => (
                    <div key={recipe.id} className="available-recipe-item">
                      <div className="recipe-info">
                        <h4>{recipe.title}</h4>
                        {recipe.channel_name && (
                          <p className="channel-name">
                            by {recipe.channel_name}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleAddRecipe(recipe)}
                        className="btn-add"
                        disabled={bookRecipes.length >= 20}
                      >
                        +
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="recipes-editor-section">
          <h2>Book Recipes (Drag to Reorder)</h2>
          <p className="instruction-text">
            Drag recipes to change their order in the book
          </p>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={bookRecipes.map(r => r.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="sortable-recipes-list">
                {bookRecipes.map((recipe, index) => (
                  <div key={recipe.id} className="recipe-with-number">
                    <span className="recipe-number">{index + 1}</span>
                    <SortableRecipe
                      recipe={recipe}
                      onRemove={handleRemoveRecipe}
                    />
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>

      {showPrintModal && (
        <PrintOrderModal
          bookId={parseInt(id!)}
          bookName={bookName}
          onClose={() => setShowPrintModal(false)}
          onOrderCreated={orderId => {
            console.log('Order created:', orderId)
            setShowPrintModal(false)
          }}
        />
      )}

      <style>{`
        .book-editor {
          min-height: 100vh;
          background: #f5f5f5;
        }

        .editor-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 2rem;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .header-content {
          max-width: 1400px;
          margin: 0 auto;
        }

        .header-content h1 {
          margin: 0;
          font-size: 2rem;
        }

        .editor-content {
          max-width: 1400px;
          margin: 2rem auto;
          padding: 0 2rem;
          display: grid;
          grid-template-columns: 400px 1fr;
          gap: 2rem;
        }

        @media (max-width: 1024px) {
          .editor-content {
            grid-template-columns: 1fr;
          }
        }

        .editor-sidebar {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .book-info-section,
        .add-recipes-section,
        .recipes-editor-section {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .book-info-section h2,
        .recipes-editor-section h2 {
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

        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .btn-large {
          width: 100%;
          padding: 1rem 2rem;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .print-order-section {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 2px solid #e9ecef;
        }

        .btn-print {
          width: 100%;
          padding: 1rem 2rem;
          font-size: 1.1rem;
          font-weight: 600;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .btn-print:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .print-info {
          margin-top: 0.75rem;
          font-size: 0.9rem;
          color: #666;
          text-align: center;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          transition: background 0.2s;
        }

        .btn-secondary:hover {
          background: #5a6268;
        }

        .instruction-text {
          color: #666;
          font-size: 0.95rem;
          margin-bottom: 1.5rem;
        }

        .sortable-recipes-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .recipe-with-number {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .recipe-number {
          font-size: 1.2rem;
          font-weight: 700;
          color: #667eea;
          min-width: 30px;
          text-align: right;
        }

        .sortable-recipe-item {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          background: white;
          transition: all 0.2s;
        }

        .sortable-recipe-item:hover {
          border-color: #667eea;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
        }

        .drag-handle {
          cursor: grab;
          font-size: 1.5rem;
          color: #999;
          user-select: none;
          padding: 0.5rem;
        }

        .drag-handle:active {
          cursor: grabbing;
        }

        .recipe-info {
          flex: 1;
        }

        .recipe-info h3,
        .recipe-info h4 {
          margin: 0 0 0.25rem;
          font-size: 1rem;
          color: #333;
        }

        .channel-name {
          margin: 0;
          font-size: 0.85rem;
          color: #666;
        }

        .btn-remove {
          background: #ff4444;
          color: white;
          border: none;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          font-size: 1.2rem;
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-remove:hover {
          background: #cc0000;
        }

        .available-recipes-list {
          margin-top: 1rem;
          max-height: 400px;
          overflow-y: auto;
        }

        .available-recipes-list h3 {
          margin-top: 0;
          margin-bottom: 1rem;
          color: #333;
          font-size: 1.1rem;
        }

        .available-recipe-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          margin-bottom: 0.5rem;
          transition: all 0.2s;
        }

        .available-recipe-item:hover {
          border-color: #667eea;
          background: #f8f9fa;
        }

        .btn-add {
          background: #28a745;
          color: white;
          border: none;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          font-size: 1.5rem;
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-add:hover:not(:disabled) {
          background: #218838;
        }

        .btn-add:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          gap: 1rem;
        }

        .error {
          background: #fee;
          border: 1px solid #fcc;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .error p {
          margin: 0;
          color: #c00;
        }
      `}</style>
    </div>
  )
}
