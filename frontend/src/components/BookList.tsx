import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth as useClerkAuth } from '@clerk/clerk-react'
import { API_BASE_URL } from '../config'
import Navigation from './Navigation'

interface Book {
  id: number
  name: string
  created_at: string
  recipe_count: number
  recipes?: Array<{
    id: number
    title: string
  }>
  page_count?: number
}

export default function BookList() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedBooks, setExpandedBooks] = useState<Set<number>>(new Set())
  const navigate = useNavigate()
  const { getToken } = useClerkAuth()

  const toggleRecipes = (bookId: number) => {
    setExpandedBooks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(bookId)) {
        newSet.delete(bookId)
      } else {
        newSet.add(bookId)
      }
      return newSet
    })
  }

  useEffect(() => {
    fetchBooks()
  }, [])

  const fetchBooks = async () => {
    try {
      const token = await getToken()
      const response = await fetch(`${API_BASE_URL}/api/books`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch books')
      }

      const data = await response.json()
      const booksWithDetails = await Promise.all(
        data.books.map(async (book: Book) => {
          try {
            // Fetch detailed book info to get recipes
            const detailResponse = await fetch(
              `${config.API_BASE_URL}/api/books/${book.id}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            )
            if (detailResponse.ok) {
              const bookDetail = await detailResponse.json()
              return {
                ...book,
                recipes: bookDetail.recipes?.map((r: any) => ({
                  id: r.id,
                  title: r.title,
                })),
                // Estimate page count: ~2 pages per recipe + front matter (3 pages) + back cover (1 page)
                // This is an estimate; actual count would require PDF generation
                page_count: bookDetail.recipes
                  ? bookDetail.recipes.length * 2 + 4
                  : undefined,
              }
            }
            return book
          } catch {
            return book
          }
        })
      )
      setBooks(booksWithDetails)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadBook = async (bookId: number, name: string) => {
    try {
      const token = await getToken()
      const response = await fetch(
        `${API_BASE_URL}/api/books/${bookId}/pdf?download=true`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.detail || 'Failed to download book')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const safeName = name.replace(/[^a-zA-Z0-9 _-]/g, '').replace(/\s+/g, '_')
      link.download = `${safeName || 'cookbook'}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to download book')
    }
  }

  const handleDeleteBook = async (bookId: number) => {
    if (!confirm('Are you sure you want to delete this book?')) {
      return
    }

    try {
      const token = await getToken()
      const response = await fetch(
        `${API_BASE_URL}/api/books/${bookId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to delete book')
      }

      setBooks(books.filter(b => b.id !== bookId))
    } catch (err) {
      alert('Failed to delete book')
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading your books...</p>
      </div>
    )
  }

  return (
    <div className="book-list">
      <Navigation />
      <header className="books-header">
        <div className="header-content">
          <h1>My Cookbooks</h1>
          {books.length > 0 && (
            <button
              onClick={() => navigate('/books/create')}
              className="btn-primary header-button"
            >
              Add New
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="error">
          <p>{error}</p>
        </div>
      )}

      {books.length === 0 ? (
        <div className="empty-state">
          <h2>No cookbooks yet</h2>
          <p>
            Create your first cookbook by selecting 5-20 recipes from your
            collection!
          </p>
          <button
            onClick={() => navigate('/books/create')}
            className="btn-primary"
          >
            Create Cookbook
          </button>
        </div>
      ) : (
        <div className="books-grid">
          {books.map(book => (
            <div key={book.id} className="book-card">
              <div className="book-card-background-fallback" />
              <div className="book-card-overlay" />
              <button
                onClick={() => handleDeleteBook(book.id)}
                className="book-delete-button"
                aria-label="Delete book"
              >
                ×
              </button>
              <div className={`book-card-content ${expandedBooks.has(book.id) || !book.recipes || book.recipes.length === 0 ? '' : 'recipes-collapsed'}`}>
                <div className="book-card-header">
                  <div className="book-title-section">
                    <h3>{book.name}</h3>
                    <p className="book-info">
                      {book.recipe_count} recipe{book.recipe_count !== 1 ? 's' : ''}
                      {book.page_count && ` • ${book.page_count} pages`}
                    </p>
                    <p className="book-date">
                      Created {new Date(book.created_at).toLocaleDateString()}
                    </p>
                    {book.recipes && book.recipes.length > 0 && (
                      <div className={`book-recipes-list ${expandedBooks.has(book.id) ? 'expanded' : 'collapsed'}`}>
                        <button
                          onClick={() => toggleRecipes(book.id)}
                          className="book-recipes-toggle"
                        >
                          <span className="book-recipes-label">
                            Show recipes{' '}
                            <span className="book-recipes-arrow">
                              {expandedBooks.has(book.id) ? '▼' : '▶'}
                            </span>
                          </span>
                        </button>
                        {expandedBooks.has(book.id) && (
                          <ul className="book-recipes">
                            {book.recipes.map(recipe => (
                              <li key={recipe.id} className="book-recipe-item">
                                {recipe.title}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="book-card-actions">
                  <button
                    onClick={() => navigate(`/books/${book.id}/edit`)}
                    className="btn-link"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDownloadBook(book.id, book.name)}
                    className="btn-link"
                  >
                    Download
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .book-list {
          min-height: 100vh;
          background: #ffffff;
        }

        .books-header {
          background: transparent;
          color: #1a1f3a;
          padding: 4rem 2rem 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .header-content {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .header-content h1 {
          margin: 0;
          font-size: 3rem;
          font-weight: 800;
          color: #1a1f3a !important;
          background: none !important;
          -webkit-background-clip: unset !important;
          -webkit-text-fill-color: #1a1f3a !important;
          background-clip: unset !important;
          line-height: 1.2;
        }

        .header-button {
          padding: 0.5rem 1rem;
          font-size: 0.9rem;
          height: auto;
        }

        @media (max-width: 768px) {
          .header-content h1 {
            font-size: 2rem;
          }
        }

        .books-actions {
          max-width: 1400px;
          margin: 3rem auto 2rem;
          padding: 0 2rem;
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .books-grid {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 2rem 4rem;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 2rem;
        }

        .book-card {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          min-height: 300px;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .book-card:has(.book-card-content.recipes-collapsed) {
          min-height: auto;
        }

        .book-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
        }

        .book-card-background-fallback {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #e5e7eb 0%, #f3f4f6 100%);
          z-index: 0;
        }

        .book-card-overlay {
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

        .book-delete-button {
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

        .book-delete-button:hover {
          opacity: 0.7;
        }

        .book-card-content {
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

        .book-card-content.recipes-collapsed {
          justify-content: flex-start;
          height: auto;
        }

        .book-card-content.recipes-collapsed .book-card-actions {
          margin-top: 1rem;
        }

        .book-card-header {
          margin-bottom: 0.5rem;
          width: 100%;
        }

        .book-title-section {
          width: 100%;
          max-width: 100%;
        }

        .book-card h3 {
          margin: 0 0 0.5rem;
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
          line-height: 1.3;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .book-info {
          color: rgba(255, 255, 255, 0.9);
          font-size: 0.95rem;
          margin: 0.5rem 0;
          word-wrap: break-word;
          overflow-wrap: break-word;
          line-height: 1.4;
        }

        .book-date {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.875rem;
          margin: 0.5rem 0 0;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .book-recipes-list {
          margin-top: 0.5rem;
        }

        .book-recipes-list.collapsed {
          margin-bottom: 0;
        }

        .book-recipes-list.expanded {
          margin-bottom: 0.5rem;
        }

        .book-recipes-toggle {
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          width: 100%;
          margin-bottom: 0.5rem;
          transition: opacity 0.2s;
        }

        .book-recipes-toggle:hover {
          opacity: 0.8;
        }

        .book-recipes-label {
          color: rgba(255, 255, 255, 0.9);
          font-size: 0.85rem;
          font-weight: 600;
          margin: 0;
        }

        .book-recipes-arrow {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.75rem;
          margin-left: 0.25rem;
        }

        .book-recipes {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          counter-reset: recipe-counter;
        }

        .book-recipe-item {
          color: rgba(255, 255, 255, 0.85);
          font-size: 0.8rem;
          line-height: 1.4;
          word-wrap: break-word;
          overflow-wrap: break-word;
          padding-left: 1.5rem;
          position: relative;
          counter-increment: recipe-counter;
        }

        .book-recipe-item::before {
          content: counter(recipe-counter) '.';
          position: absolute;
          left: 0;
          color: rgba(255, 255, 255, 0.7);
        }

        .book-card-actions {
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
          max-width: 1400px;
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
