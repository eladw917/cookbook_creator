import { NavLink, useNavigate } from 'react-router-dom'
import { UserButton, useUser } from '@clerk/clerk-react'

export default function Navigation() {
  const navigate = useNavigate()
  const { isSignedIn } = useUser()

  // Always show navigation - it will adapt based on sign-in status
  if (!isSignedIn) {
    return null
  }

  return (
    <nav className="main-nav">
      <div className="nav-content">
        <div className="nav-brand" onClick={() => navigate('/')}>
          <span className="nav-logo">🍳</span>
          <span className="nav-title">Cookbook Creator</span>
        </div>

        <div className="nav-links">
          <NavLink
            to="/recipes"
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
          >
            <span className="nav-icon">📚</span>
            My Recipes
          </NavLink>
          <NavLink
            to="/recipes/new"
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
          >
            <span className="nav-icon">➕</span>
            Add Recipe
          </NavLink>
          <NavLink
            to="/books"
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
          >
            <span className="nav-icon">📖</span>
            My Cookbooks
          </NavLink>
          <NavLink
            to="/books/create"
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
          >
            <span className="nav-icon">✨</span>
            Create Cookbook
          </NavLink>
        </div>

        <div className="nav-user">
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: 'w-10 h-10',
              },
            }}
          />
        </div>
      </div>

      <style>{`
        .main-nav {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          position: sticky;
          top: 0;
          z-index: 1000;
        }

        .nav-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 1rem 2rem;
          display: flex;
          align-items: center;
          gap: 2rem;
        }

        .nav-brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          transition: opacity 0.2s;
          user-select: none;
        }

        .nav-brand:hover {
          opacity: 0.9;
        }

        .nav-logo {
          font-size: 2rem;
        }

        .nav-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
        }

        .nav-links {
          display: flex;
          gap: 0.5rem;
          flex: 1;
          margin-left: 2rem;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          color: rgba(255, 255, 255, 0.9);
          text-decoration: none;
          border-radius: 8px;
          font-weight: 500;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .nav-link:hover {
          background: rgba(255, 255, 255, 0.15);
          color: white;
        }

        .nav-link.active {
          background: rgba(255, 255, 255, 0.25);
          color: white;
          font-weight: 600;
        }

        .nav-icon {
          font-size: 1.2rem;
        }

        .nav-user {
          margin-left: auto;
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .nav-content {
            flex-wrap: wrap;
            padding: 1rem;
          }

          .nav-links {
            order: 3;
            width: 100%;
            margin-left: 0;
            margin-top: 1rem;
            flex-wrap: wrap;
            justify-content: center;
          }

          .nav-link {
            padding: 0.5rem 1rem;
            font-size: 0.9rem;
          }

          .nav-title {
            font-size: 1.2rem;
          }

          .nav-logo {
            font-size: 1.5rem;
          }
        }

        @media (max-width: 480px) {
          .nav-links {
            gap: 0.25rem;
          }

          .nav-link {
            padding: 0.5rem 0.75rem;
            font-size: 0.85rem;
          }

          .nav-icon {
            font-size: 1rem;
          }
        }
      `}</style>
    </nav>
  )
}
