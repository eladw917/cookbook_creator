import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SignIn, useUser } from '@clerk/clerk-react'
import Navigation from './Navigation'
import logoImage from '../assets/Gemini_Generated_Image_ooiexwooiexwooie.png'
import heroImage from '../assets/Gemini_Generated_Image_rtd832rtd832rtd8.png'
import step1Icon from '../assets/video_library_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.png'
import step2Icon from '../assets/auto_awesome_mosaic_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.png'
import step3Icon from '../assets/local_shipping_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.png'

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

    // If already signed in, go to recipes page
    if (isSignedIn) {
      navigate('/recipes')
      return
    }

    // Store URL and show login
    setPendingUrl(url)
    setShowLogin(true)
  }

  // When user signs in, navigate appropriately
  if (isSignedIn && pendingUrl) {
    // User entered URL before signing in - go to recipes page
    navigate('/recipes')
  } else if (isSignedIn && showLogin) {
    // User just signed in without URL - go to recipes page
    navigate('/recipes')
  }

  return (
    <div className="landing-page">
      <Navigation />

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-left">
            <h1 className="hero-headline">
              Bring Your Favorite Online Chefs Into Your Kitchen
            </h1>
            <p className="hero-description">
              Stop pausing and rewinding. Build colorful, personalized cookbooks
              tailored by you, featuring your most-loved recipes from your
              favorite chefs.
            </p>

            <div className="how-it-works">
              <h2 className="how-it-works-title">How does it work?</h2>
              <div className="how-it-works-steps">
                <div className="how-it-works-step">
                  <div className="step-content">
                    <img
                      src={step1Icon}
                      alt="Add recipes"
                      className="step-icon"
                    />
                    <p className="step-text">Add 5+ of your favorite recipes</p>
                  </div>
                </div>
                <div className="how-it-works-step">
                  <div className="step-content">
                    <img
                      src={step2Icon}
                      alt="Arrange recipes"
                      className="step-icon"
                    />
                    <p className="step-text">Arrange them however you like</p>
                  </div>
                </div>
                <div className="how-it-works-step">
                  <div className="step-content">
                    <img
                      src={step3Icon}
                      alt="Order cookbook"
                      className="step-icon"
                    />
                    <p className="step-text">
                      Order a physical cookbook tailored to you
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="hero-input-container">
              <div className="input-wrapper">
                <span className="input-icon">∞</span>
                <input
                  type="text"
                  placeholder="Paste YouTube URL here..."
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  className="hero-input"
                  disabled={showLogin}
                  onKeyPress={e => {
                    if (e.key === 'Enter') {
                      handleGetStarted()
                    }
                  }}
                />
              </div>
              {!showLogin ? (
                <button
                  className="btn-primary hero-button"
                  onClick={handleGetStarted}
                >
                  GET STARTED
                </button>
              ) : (
                <div className="clerk-signin-container">
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

            <p className="hero-subtext">
              Try it free. No credit card required.
            </p>
          </div>

          <div className="hero-right">
            <div className="hero-image-wrapper">
              <img
                src={heroImage}
                alt="Fresh ingredients in a bowl"
                className="hero-image"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-logo">
            <img
              src={logoImage}
              alt="Cookbook Creator Logo"
              className="footer-logo-icon"
            />
            <span className="footer-logo-text">Cookbook Creator</span>
          </div>
          <div className="footer-copyright">
            © 2024 Cookbook Creator. All rights reserved.
          </div>
        </div>
      </footer>

      <style>{`
        .landing-page {
          min-height: 100vh;
          background: #ffffff;
        }

        /* Hero Section */
        .hero-section {
          padding: 4rem 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .hero-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
        }

        @media (max-width: 968px) {
          .hero-container {
            grid-template-columns: 1fr;
            gap: 2rem;
          }
        }

        .hero-left {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .hero-headline {
          font-size: 3rem;
          font-weight: 800;
          color: #1a1f3a;
          line-height: 1.2;
          margin: 0;
        }

        @media (max-width: 768px) {
          .hero-headline {
            font-size: 2rem;
          }
        }

        .hero-description {
          font-size: 1.125rem;
          color: #6b7280;
          line-height: 1.6;
          margin: 0;
        }

        .how-it-works {
          margin: 2rem 0;
        }

        .how-it-works-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1a1f3a;
          margin: 0 0 1.5rem;
        }

        .how-it-works-steps {
          display: flex;
          flex-direction: row;
          gap: 2rem;
          flex-wrap: wrap;
        }

        @media (max-width: 768px) {
          .how-it-works-steps {
            flex-direction: column;
            gap: 1.5rem;
          }
        }

        .how-it-works-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          flex: 1;
          min-width: 150px;
        }

        .step-number {
          width: 40px;
          height: 40px;
          background: #ff6b35;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.125rem;
          margin-bottom: 0.75rem;
        }

        .step-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .step-icon {
          width: 24px;
          height: 24px;
          object-fit: contain;
          margin-bottom: 0.25rem;
        }

        .step-text {
          font-size: 1rem;
          color: #6b7280;
          margin: 0;
          line-height: 1.4;
        }

        .hero-input-container {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .input-wrapper {
          flex: 1;
          min-width: 300px;
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 1rem;
          font-size: 1.25rem;
          color: #6b7280;
        }

        .hero-input {
          width: 100%;
          padding: 1rem 1rem 1rem 3rem;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 1rem;
          background: white;
          color: #1a1f3a;
        }

        .hero-input:focus {
          outline: none;
          border-color: #ff6b35;
          box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
        }

        .hero-input:disabled {
          background: #f3f4f6;
          cursor: not-allowed;
        }

        .hero-button {
          padding: 1rem 2rem;
          font-size: 1rem;
          white-space: nowrap;
        }

        .hero-subtext {
          font-size: 0.875rem;
          color: #9ca3af;
          margin: 0;
        }

        .hero-right {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .hero-image-wrapper {
          position: relative;
          width: 100%;
          max-width: 600px;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
        }

        .hero-image {
          width: 100%;
          height: auto;
          display: block;
        }


        .clerk-signin-container {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: white;
          border-radius: 8px;
        }

        /* Footer */
        .landing-footer {
          padding: 2rem;
          border-top: 1px solid #e5e7eb;
          background: white;
        }

        .footer-container {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        @media (max-width: 768px) {
          .footer-container {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }
        }

        .footer-logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .footer-logo-icon {
          height: 3rem;
          width: auto;
          object-fit: contain;
        }

        .footer-logo-text {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1a1f3a;
        }

        .footer-copyright {
          font-size: 0.875rem;
          color: #9ca3af;
        }
      `}</style>
    </div>
  )
}
