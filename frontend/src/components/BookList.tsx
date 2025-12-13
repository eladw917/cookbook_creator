import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useAuth as useClerkAuth } from '@clerk/clerk-react'
import config from '../config'
import Navigation from './Navigation'

interface Book {
  id: number
  name: string
  created_at: string
  recipe_count: number
}

export default function BookList() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { getToken } = useClerkAuth()

  useEffect(() => {
    fetchBooks()
  }, [])

  const fetchBooks = async () => {
    try {
      const token = await getToken()
      const response = await fetch(`${config.API_BASE_URL}/api/books`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch books')
      }

      const data = await response.json()
      setBooks(data.books)
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
        `${config.API_BASE_URL}/api/books/${bookId}/pdf?download=true`,
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
        `${config.API_BASE_URL}/api/books/${bookId}`,
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
          <h1>📚 My Cookbooks</h1>
        </div>
      </header>

      <div className="books-actions">
        <button
          onClick={() => navigate('/books/create')}
          className="btn-primary"
        >
          + Create New Book
        </button>
      </div>

      {error && (
        <div className="error">
          <p>❌ {error}</p>
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
              <div className="book-icon">📖</div>
              <h3>{book.name}</h3>
              <p className="book-info">
                {book.recipe_count} recipe{book.recipe_count !== 1 ? 's' : ''}
              </p>
              <p className="book-date">
                Created {new Date(book.created_at).toLocaleDateString()}
              </p>
              <div className="book-actions">
                <button
                  onClick={() => navigate(`/books/${book.id}/edit`)}
                  className="btn-secondary"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDownloadBook(book.id, book.name)}
                  className="btn-primary"
                >
                  📥 Download PDF
                </button>
                <button
                  onClick={() => handleDeleteBook(book.id)}
                  className="btn-danger"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .book-list {
          min-height: 100vh;
          background: #f5f5f5;
        }

        .books-header {
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

        .books-actions {
          max-width: 1200px;
          margin: 2rem auto;
          padding: 0 2rem;
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .books-grid {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem 2rem;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .book-card {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s, box-shadow 0.2s;
          text-align: center;
        }

        .book-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }

        .book-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .book-card h3 {
          margin: 0 0 0.5rem;
          font-size: 1.5rem;
          color: #333;
        }

        .book-info {
          color: #666;
          font-size: 1rem;
          margin: 0.5rem 0;
        }

        .book-date {
          color: #999;
          font-size: 0.85rem;
          margin: 0.5rem 0 1.5rem;
        }

        .book-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
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
          text-decoration: none;
          display: inline-block;
        }

        .btn-secondary:hover {
          background: #5a6268;
        }

        .btn-danger {
          background: #ff4444;
          color: white;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          transition: background 0.2s;
          text-decoration: none;
          display: inline-block;
        }

        .btn-danger:hover {
          background: #cc0000;
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
