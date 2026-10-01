import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
// Antes do render: o convite de instalação do navegador dispara uma vez, cedo.
import './lib/instalar'

// O painel vive em /painel/ — /organizacao e /marca redirecionam para cá
// (vercel.json e o plugin de dev), porque é o escopo do service worker: fora
// dele o SW não controla a página e o push trava esperando `ready`.
// Registrado antes do render, fora de qualquer componente, para existir em
// qualquer vista que a pessoa abra primeiro.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/painel/sw.js', { scope: '/painel/' }).catch(() => {})
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
