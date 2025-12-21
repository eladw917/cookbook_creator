import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ClerkProvider } from '@clerk/clerk-react'

// Import Clerk Publishable Key from environment
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

if (!PUBLISHABLE_KEY) {
  // Render error message instead of throwing (which causes black screen)
  rootElement.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #0a0e27;
      color: #ff6b6b;
      font-family: system-ui, -apple-system, sans-serif;
      padding: 2rem;
    ">
      <div style="
        background: #1a1f3a;
        padding: 2rem;
        border-radius: 12px;
        border: 2px solid #ff6b6b;
        max-width: 600px;
      ">
        <h1 style="margin-top: 0; color: #ff6b6b;">⚠️ Configuration Error</h1>
        <p style="color: #e8eaf6; line-height: 1.6;">
          Missing Clerk Publishable Key. Please check your <code style="background: #0a0e27; padding: 0.2rem 0.4rem; border-radius: 4px;">frontend/.env</code> file.
        </p>
        <p style="color: #9fa8da; margin-top: 1rem; font-size: 0.9rem;">
          Make sure it contains: <code style="background: #0a0e27; padding: 0.2rem 0.4rem; border-radius: 4px;">VITE_CLERK_PUBLISHABLE_KEY=pk_test_...</code>
        </p>
        <p style="color: #9fa8da; margin-top: 1rem; font-size: 0.9rem;">
          After updating, restart the dev server: <code style="background: #0a0e27; padding: 0.2rem 0.4rem; border-radius: 4px;">npm run dev</code>
        </p>
      </div>
    </div>
  `
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
        <App />
      </ClerkProvider>
    </StrictMode>
  )
}
