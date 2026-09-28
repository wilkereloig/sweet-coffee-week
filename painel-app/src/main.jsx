import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { PainelShell } from './components/PainelShell'
import { GuiaFotos } from './components/vistas/GuiaFotos'

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

// Só em DEV: /painel?guia-fotos abre a vista do guia sem login, para editar
// o layout. A vista não lê o banco; as outras abas ficam vazias nesse modo.
// Em produção `import.meta.env.DEV` é false e o atalho some do bundle.
const guiaFotosDev = import.meta.env.DEV && new URLSearchParams(location.search).has('guia-fotos')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {guiaFotosDev
      ? <PainelShell vistas={{ fotos: GuiaFotos }} vistaInicial="fotos" onSair={() => location.assign('/painel')} />
      : <App />}
  </React.StrictMode>
)
