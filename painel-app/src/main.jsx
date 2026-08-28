import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'

// O corte já aconteceu: /painel/, /organizacao/ e /marca/ são a URL REAL que
// o navegador vê — o rewrite do Vercel (e o plugin dev espelho em
// vite.config.js) troca o conteúdo servido sem mudar a barra de endereço.
// Registrar o SW com escopo /painel/ funciona nas três rotas. O try/catch
// segue existindo por segurança (ex.: navegação direta em /painel-app/ em
// dev, que não tem esse escopo), não porque o registro esteja esperado pra
// falhar.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/painel/sw.js', { scope: '/painel/' }).catch(() => {})
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
