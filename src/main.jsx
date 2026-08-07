import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/fonts-nexa-slab.css'
import './styles/layout-tokens.css'
import './styles/em-breve.css'
import './styles/motion-system.css'
import './styles/scw-2026.css'
import './styles/scw-motion.css'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
