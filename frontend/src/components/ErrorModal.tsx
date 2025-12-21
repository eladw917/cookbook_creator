interface ErrorModalProps {
  message: string
  suggestion?: string
  title?: string
  icon?: string
  onClose: () => void
}

export default function ErrorModal({ message, suggestion, title = "Not a Recipe Video", icon = "⚠️", onClose }: ErrorModalProps) {
  return (
    <div className="error-modal-overlay" onClick={onClose}>
      <div className="error-modal" onClick={(e) => e.stopPropagation()}>
        <div className="error-modal-content">
          <div className="error-icon">{icon}</div>
          <h2>{title}</h2>
          <p className="error-message">{message}</p>
          {suggestion && (
            <p className="error-suggestion">{suggestion}</p>
          )}
          <button className="error-modal-button" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>

      <style>{`
        .error-modal-overlay {
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
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .error-modal {
          background: white;
          border-radius: 24px;
          padding: 0;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: modalSlideIn 0.3s ease-out;
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .error-modal-content {
          padding: 3rem;
          text-align: center;
        }

        .error-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .error-modal-content h2 {
          margin: 0 0 1rem;
          font-size: 1.75rem;
          font-weight: 700;
          color: #1a1f3a;
        }

        .error-message {
          margin: 0 0 1rem;
          font-size: 1.125rem;
          color: #374151;
          line-height: 1.6;
        }

        .error-suggestion {
          margin: 0 0 2rem;
          font-size: 1rem;
          color: #6b7280;
          line-height: 1.5;
        }

        .error-modal-button {
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

        .error-modal-button:hover {
          background: #2d3550;
        }

        @media (max-width: 768px) {
          .error-modal-content {
            padding: 2rem;
          }

          .error-icon {
            font-size: 3rem;
          }

          .error-modal-content h2 {
            font-size: 1.5rem;
          }

          .error-message {
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  )
}

