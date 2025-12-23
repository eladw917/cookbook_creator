import { NavLink, useNavigate } from 'react-router-dom'
import { UserButton, useUser, SignInButton, SignUpButton } from '@clerk/clerk-react'
import logoImage from '../assets/Gemini_Generated_Image_ooiexwooiexwooie.png'

export default function Navigation() {
  const navigate = useNavigate()
  const { isSignedIn } = useUser()

  return (
    <nav className="main-nav">
      <div className="nav-content">
        <div className="nav-brand" onClick={() => navigate('/')}>
          <img src={logoImage} alt="Cookbook Creator Logo" className="nav-logo" />
          <span className="nav-title">Cookbook Creator</span>
        </div>

        {isSignedIn && (
          <div className="nav-links">
            <NavLink
              to="/recipes"
              className={({ isActive }) =>
                isActive ? 'nav-link active' : 'nav-link'
              }
            >
              My Recipes
            </NavLink>
            <NavLink
              to="/books"
              end
              className={({ isActive }) =>
                isActive ? 'nav-link active' : 'nav-link'
              }
            >
              My Cookbooks
            </NavLink>
            <NavLink
              to="/books/create"
              className={({ isActive }) =>
                isActive ? 'nav-link active' : 'nav-link'
              }
            >
              Create Cookbook
            </NavLink>
          </div>
        )}

        <div className="nav-right">
          {isSignedIn ? (
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
          ) : (
            <div className="nav-auth">
              <SignInButton mode="modal">
                <button className="nav-login">LOG IN</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="nav-signup">SIGN UP</button>
              </SignUpButton>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .main-nav {
          background: white;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          position: sticky;
          top: 0;
          z-index: 1000;
          border-bottom: 1px solid #e5e7eb;
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
          opacity: 0.8;
        }

        .nav-logo {
          height: 3rem;
          width: auto;
          object-fit: contain;
        }

        .nav-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1a1f3a;
        }

        .nav-links {
          display: flex;
          gap: 1rem;
          flex: 1;
          margin-left: 2rem;
        }

        .nav-link {
          padding: 0.5rem 1rem;
          color: #1a1f3a;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s;
          white-space: nowrap;
          font-size: 0.95rem;
        }

        .nav-link:hover {
          color: #1a1f3a;
          opacity: 0.8;
        }

        .nav-link.active {
          color: #1a1f3a;
          font-weight: 700;
          border-bottom: 3px solid #1a1f3a;
          padding-bottom: calc(0.5rem - 3px);
          background: rgba(26, 31, 58, 0.05);
          border-radius: 6px 6px 0 0;
        }

        .nav-right {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-left: auto;
        }

        .nav-auth {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .nav-login {
          background: none;
          border: none;
          color: #1a1f3a;
          font-weight: 500;
          cursor: pointer;
          padding: 0.5rem 1rem;
          font-size: 0.95rem;
          transition: color 0.2s;
        }

        .nav-login:hover {
          color: #1a1f3a;
          opacity: 0.8;
        }

        .nav-signup {
          background: #1a1f3a;
          border: none;
          color: white;
          font-weight: 600;
          cursor: pointer;
          padding: 0.5rem 1.5rem;
          border-radius: 6px;
          font-size: 0.95rem;
          transition: background 0.2s;
        }

        .nav-signup:hover {
          background: #2d3550;
        }

        .nav-user {
          display: flex;
          align-items: center;
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
            padding: 0.5rem 0.75rem;
            font-size: 0.85rem;
          }

          .nav-title {
            font-size: 1.1rem;
          }

          .nav-logo {
            height: 2rem;
          }

          .nav-auth {
            gap: 0.5rem;
          }

          .nav-signup {
            padding: 0.5rem 1rem;
            font-size: 0.85rem;
          }
        }

        @media (max-width: 480px) {
          .nav-links {
            gap: 0.5rem;
          }

          .nav-link {
            padding: 0.5rem;
            font-size: 0.8rem;
          }
        }
      `}</style>
    </nav>
  )
}
