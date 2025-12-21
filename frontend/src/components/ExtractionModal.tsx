import { useState, useEffect } from 'react'
import config from '../config'

interface ExtractionModalProps {
  videoId: string
  onComplete: () => void
}

interface Status {
  metadata: boolean
  transcript: boolean
  recipe: boolean
  timestamps: boolean
  frames: boolean
  pdf: boolean
}

const cookingSteps = [
  { key: 'metadata', label: 'Shopping for Ingredients', icon: '🛒' },
  { key: 'transcript', label: 'Preparing the Kitchen', icon: '🏠' },
  { key: 'recipe', label: 'Chopping Vegetables', icon: '🔪' },
  { key: 'timestamps', label: 'Boiling the Water', icon: '💧' },
  { key: 'frames', label: 'Pouring Ingredients into the Pot', icon: '🍲' },
  { key: 'pdf', label: 'Serving the Food', icon: '🍽️' },
]

export default function ExtractionModal({ videoId, onComplete }: ExtractionModalProps) {
  const [status, setStatus] = useState<Status>({
    metadata: false,
    transcript: false,
    recipe: false,
    timestamps: false,
    frames: false,
    pdf: false,
  })

  useEffect(() => {
    if (!videoId) return

    let pollCount = 0
    const maxPolls = 300 // 5 minutes max (300 seconds)

    // Poll status every 1 second
    const interval = setInterval(async () => {
      pollCount++
      
      // Safety timeout - close modal after max polls even if not complete
      if (pollCount >= maxPolls) {
        clearInterval(interval)
        console.warn('ExtractionModal: Max polls reached, closing modal')
        onComplete()
        return
      }

      try {
        const response = await fetch(`${config.API_BASE_URL}/api/cache/${videoId}/status`)
        if (response.ok) {
          const data = await response.json()
          setStatus(data)

          // Check if all steps are complete
          const allComplete = Object.values(data).every(Boolean)
          if (allComplete) {
            clearInterval(interval)
            // Update status one more time to show completion
            setStatus(data)
            // Wait a moment to show completion, then close
            setTimeout(() => {
              onComplete()
            }, 1500)
            return
          }
          
          // Also check if background tasks are complete (timestamps, frames, pdf)
          // since those are what we're waiting for
          const backgroundComplete = data.timestamps && data.frames && data.pdf
          if (backgroundComplete) {
            clearInterval(interval)
            setStatus(data)
            setTimeout(() => {
              onComplete()
            }, 1500)
            return
          }
        } else {
          // If status endpoint returns error, check if it's 404 (recipe doesn't exist)
          // In that case, stop polling
          if (response.status === 404) {
            clearInterval(interval)
            onComplete()
            return
          }
        }
      } catch (error) {
        console.error('Error fetching status:', error)
        // Continue polling on error, but stop after many consecutive errors
        if (pollCount > 10) {
          clearInterval(interval)
          onComplete()
        }
      }
    }, 1000)

    // Initial fetch
    fetch(`${config.API_BASE_URL}/api/cache/${videoId}/status`)
      .then(res => res.json())
      .then(data => {
        setStatus(data)
        // Check immediately if already complete
        const allComplete = Object.values(data).every(Boolean)
        const backgroundComplete = data.timestamps && data.frames && data.pdf
        if (allComplete || backgroundComplete) {
          clearInterval(interval)
          setTimeout(() => {
            onComplete()
          }, 1500)
        }
      })
      .catch(err => console.error('Error fetching initial status:', err))

    return () => clearInterval(interval)
  }, [videoId, onComplete])

  // Determine active step (first incomplete step)
  // Since modal only appears for background tasks, we focus on timestamps, frames, pdf
  // But we still show all steps for context
  const activeIndex = cookingSteps.findIndex(step => !status[step.key as keyof Status])
  const isComplete = activeIndex === -1
  
  // Debug: log status to help diagnose issues
  if (process.env.NODE_ENV === 'development') {
    console.log('ExtractionModal status:', status, 'activeIndex:', activeIndex, 'isComplete:', isComplete)
  }

  return (
    <div className="extraction-modal-overlay">
      <div className="extraction-modal">
        <div className="modal-header">
          <h2>Preparing Your Recipe...</h2>
          {isComplete ? (
            <>
              <p className="modal-subtitle">✨ All done! Your recipe is ready.</p>
              <button className="modal-close-button" onClick={onComplete}>
                Close
              </button>
            </>
          ) : activeIndex >= 0 ? (
            <div className="current-stage">
              <div className="stage-icon-wrapper">
                <span className="stage-spinner">⟳</span>
              </div>
              <p className="stage-label">{cookingSteps[activeIndex].icon} {cookingSteps[activeIndex].label}</p>
            </div>
          ) : (
            <p className="modal-subtitle">Finalizing...</p>
          )}
        </div>
      </div>

      <style>{`
        .extraction-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          backdrop-filter: blur(4px);
        }

        .extraction-modal {
          background: white;
          border-radius: 24px;
          padding: 3rem;
          max-width: 600px;
          width: 90%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: modalFadeIn 0.3s ease-out;
        }

        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .modal-header {
          text-align: center;
          margin-bottom: 2.5rem;
        }

        .modal-header h2 {
          margin: 0 0 0.5rem;
          font-size: 2rem;
          font-weight: 700;
          color: #1a1f3a;
        }

        .modal-subtitle {
          margin: 0 0 1rem;
          font-size: 1.125rem;
          color: #6b7280;
        }

        .modal-close-button {
          margin-top: 1rem;
          padding: 0.75rem 2rem;
          background: #1a1f3a;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .modal-close-button:hover {
          background: #2d3550;
        }

        .current-stage {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          margin-top: 1rem;
        }

        .stage-icon-wrapper {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #1a1f3a;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.9;
          }
        }

        .stage-spinner {
          font-size: 2.5rem;
          color: white;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .stage-label {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1a1f3a;
          margin: 0;
          text-align: center;
        }

        @media (max-width: 768px) {
          .extraction-modal {
            padding: 2rem;
            max-width: 90%;
          }

          .modal-header h2 {
            font-size: 1.5rem;
          }

          .modal-subtitle {
            font-size: 1rem;
          }

          .step-icon-wrapper {
            width: 40px;
            height: 40px;
            font-size: 1.25rem;
          }

          .step-label {
            font-size: 1rem;
          }

          .step-connector {
            left: 20px;
            top: 40px;
          }
        }
      `}</style>
    </div>
  )
}

