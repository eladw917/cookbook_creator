import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SignIn, useUser } from '@clerk/clerk-react'
import { useAuth } from '../contexts/AuthContext'
import Navigation from './Navigation'

export default function LandingPage() {
  const [url, setUrl] = useState('')
  const [showLogin, setShowLogin] = useState(false)
  const [pendingUrl, setPendingUrl] = useState('')
  const navigate = useNavigate()
  const { isSignedIn } = useUser()

  const handleGetStarted = () => {
    if (!url) {
      alert('Please enter a YouTube URL')
      return
    }

    // Validate YouTube URL
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      alert('Please enter a valid YouTube URL')
      return
    }

    // If already signed in, go directly to recipe extraction
    if (isSignedIn) {
      navigate('/recipes/new', { state: { url } })
      return
    }

    // Store URL and show login
    setPendingUrl(url)
    setShowLogin(true)
  }

  // When user signs in, navigate appropriately
  if (isSignedIn && pendingUrl) {
    // User entered URL before signing in - go to extraction
    navigate('/recipes/new', { state: { url: pendingUrl } })
  } else if (isSignedIn && showLogin) {
    // User just signed in without URL - go to recipes page
    navigate('/recipes')
  }

  return (
    <div className="landing-page">
      <Navigation />
      <header className="landing-header">
        <h1>🍳 Cookbook Creator</h1>
      </header>

      <main className="landing-main">
        <section className="hero">
          <h2>Transform YouTube Cooking Videos into Beautiful Recipes</h2>
          <p className="hero-description">
            Extract structured recipes from your favorite cooking videos. Save
            them to your collection and create personalized cookbooks.
          </p>

          <div className="features">
            <div className="feature">
              <div className="feature-icon">🎥</div>
              <h3>AI-Powered Extraction</h3>
              <p>
                Automatically extract ingredients and instructions from any
                cooking video
              </p>
            </div>
            <div className="feature">
              <div className="feature-icon">📚</div>
              <h3>Personal Collection</h3>
              <p>Save recipes to your collection and organize them your way</p>
            </div>
            <div className="feature">
              <div className="feature-icon">📖</div>
              <h3>Create Cookbooks</h3>
              <p>Combine 5-20 recipes into beautiful PDF cookbooks</p>
            </div>
          </div>

          <div className="cta-section">
            <h3>Get Started with Your First Recipe</h3>
            <div className="url-input-container">
              <input
                type="text"
                placeholder="Paste YouTube video URL here..."
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="url-input-large"
                disabled={showLogin}
              />
              {!showLogin ? (
                <button
                  className="btn-primary btn-large"
                  onClick={handleGetStarted}
                >
                  Get Started →
                </button>
              ) : (
                <div className="clerk-signin-container">
                  <p>Sign in to continue:</p>
                  <SignIn
                    appearance={{
                      elements: {
                        rootBox: 'mx-auto',
                        card: 'shadow-lg',
                      },
                    }}
                  />
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setShowLogin(false)
                      setPendingUrl('')
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="how-it-works">
          <h3>How It Works</h3>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h4>Paste URL</h4>
              <p>Copy a YouTube cooking video URL</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h4>Sign In</h4>
              <p>Quick sign in with Google or email</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h4>Extract Recipe</h4>
              <p>AI extracts the recipe automatically</p>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <h4>Build Collection</h4>
              <p>Save recipes and create cookbooks</p>
            </div>
          </div>
        </section>
      </main>

      <style>{`
        .landing-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .landing-header {
          padding: 2rem;
          text-align: center;
          color: white;
        }

        .landing-header h1 {
          font-size: 2.5rem;
          margin: 0;
        }

        .landing-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .hero {
          background: white;
          border-radius: 20px;
          padding: 3rem;
          margin-bottom: 3rem;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .hero h2 {
          font-size: 2.5rem;
          color: #333;
          margin-bottom: 1rem;
          text-align: center;
        }

        .hero-description {
          font-size: 1.2rem;
          color: #666;
          text-align: center;
          margin-bottom: 3rem;
        }

        .features {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 2rem;
          margin-bottom: 3rem;
        }

        .feature {
          text-align: center;
          padding: 1.5rem;
        }

        .feature-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .feature h3 {
          color: #333;
          margin-bottom: 0.5rem;
        }

        .feature p {
          color: #666;
          font-size: 0.95rem;
        }

        .cta-section {
          background: #f8f9fa;
          border-radius: 15px;
          padding: 2rem;
          text-align: center;
        }

        .cta-section h3 {
          color: #333;
          margin-bottom: 1.5rem;
        }

        .url-input-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          max-width: 600px;
          margin: 0 auto;
        }

        .url-input-large {
          padding: 1rem;
          font-size: 1.1rem;
          border: 2px solid #ddd;
          border-radius: 10px;
          width: 100%;
        }

        .btn-large {
          padding: 1rem 2rem;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .clerk-signin-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: white;
          border-radius: 10px;
        }

        .how-it-works {
          background: white;
          border-radius: 20px;
          padding: 3rem;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .how-it-works h3 {
          text-align: center;
          font-size: 2rem;
          color: #333;
          margin-bottom: 2rem;
        }

        .steps {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 2rem;
        }

        .step {
          text-align: center;
        }

        .step-number {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: bold;
          margin: 0 auto 1rem;
        }

        .step h4 {
          color: #333;
          margin-bottom: 0.5rem;
        }

        .step p {
          color: #666;
          font-size: 0.95rem;
        }
      `}</style>
    </div>
  )
}
