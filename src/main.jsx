import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/fonts-nexa-slab.css'
import './styles/tokens.css'
import './styles/layout-tokens.css'
import './styles.css'
import './styles/swc-redesign.css'
import './styles/motion-system.css'
import './styles/hero.css'
import './styles/layout.css'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
