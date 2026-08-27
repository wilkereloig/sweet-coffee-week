import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'

// Scope real é /painel/, mas hoje a página é servida de /painel-app/ (o corte
// pra substituir /painel/ ainda não aconteceu — decisão do Eloi). O navegador
// recusa esse registro por escopo fora do caminho da página; try/catch evita
// erro não tratado no console até o corte acontecer.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/painel/sw.js', { scope: '/painel/' }).catch(() => {})
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
