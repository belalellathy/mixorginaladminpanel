import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'
import { initSentry } from './lib/sentry'
import { beforeSend } from './lib/analytics'
import './index.css'

// Must run before the app renders so Sentry's global handlers are in place.
// No-op when VITE_SENTRY_DSN is unset (local dev without the env var).
initSentry()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {import.meta.env.PROD && <Analytics beforeSend={beforeSend} />}
    <BrowserRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>,
)
