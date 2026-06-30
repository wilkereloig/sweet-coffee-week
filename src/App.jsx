import React from 'react'
import { useRoute } from './router'
import { applyPalette } from './theme'
import { SiteHeader } from './components/nav'
import { DevViewportSwitcher } from './DevTools'
import { ErrorBoundary } from './components/ErrorBoundary'
import { CookieConsent } from './components/CookieConsent'
import { SiteFooter } from './components/SiteFooter'

import { HomePage }         from './pages/institutional/Home'
import { EdicoesPage }      from './pages/institutional/Edicoes'
import { CuriosidadesPage } from './pages/institutional/Curiosidades'
import { ParticiparPage }   from './pages/institutional/Participar'
import { ApoiarPage }       from './pages/institutional/Apoiar'
import { ContatoPage }      from './pages/institutional/Contato'
import { HistoricoAwardsPage } from './pages/institutional/HistoricoAwards'
import { SweetAwardsPage }  from './pages/institutional/SweetAwards'
import { PesquisaPage }     from './pages/lovers/Pesquisa'
import { PainelAdminPage } from './pages/institutional/PainelAdmin'

// Painel admin é lazy: o lovers-system.css (~135 KB) vira chunk próprio,
// carregado só ao abrir /lovers/painel — fora do bundle institucional/awards.
const PainelPage = React.lazy(() => import('./pages/lovers/Painel').then(m => ({ default: m.PainelPage })))

// A edição Lovers foi encerrada e suas páginas públicas removidas. As rotas antigas
// (incluindo QR Codes impressos: /lovers/combos/:slug, /lovers/awards, e os aliases
// limpos /mapa, /premiacao, /participantes) são encaminhadas para a home.
// EXCEÇÃO: o painel admin do Sweet Awards segue acessível em #/lovers/painel
// para consultar e exportar a votação (dados preservados no Supabase).
// Publicação temporária focada em Awards: enquanto true, todo o site público
// renderiza só a página de vencedores (/vencedores e alias /premiacao). O painel
// interno (/lovers/painel) continua acessível, mas fora de qualquer menu/header.
const AWARDS_ONLY_PUBLICATION = true

// PREVIEW DEV-only do institucional: permite revisar Edições, Curiosidades,
// Participar, Apoiar, Contato e o Histórico do Sweet Awards SEM desligar a flag
// de produção acima. Liga apenas em dois casos seguros e NUNCA no domínio oficial:
//   - servidor de desenvolvimento (import.meta.env.DEV);
//   - deploy de Preview (ex.: *.vercel.app) acessado com ?preview=1 na URL.
// No domínio de produção (sweetcoffeeweek.com.br) não libera nem com ?preview=1,
// para não vazar páginas ainda não publicadas. É aditivo: não altera a flag.
const INSTITUTIONAL_PREVIEW = (() => {
  try {
    if (import.meta.env && import.meta.env.DEV) return true
    if (typeof window === 'undefined') return false
    const host = window.location.hostname || ''
    if (/(^|\.)sweetcoffeeweek\.com\.br$/i.test(host)) return false
    return new URLSearchParams(window.location.search).has('preview')
  } catch {
    return false
  }
})()

// Rodapé institucional: páginas onde o SiteFooter aparece. Nunca no painel interno.
// 'vencedores' fica de fora por ora (Awards publicado ainda não revisado com footer);
// liberar quando o institucional/Awards forem revisados.
const FOOTER_ROUTES = ['home', 'edicoes', 'curiosidades', 'participar', 'apoiar', 'contato', 'historico-awards']

const LEGACY_LOVERS_PATHS = ['/mapa', '/rota', '/participantes']
function isLegacyLoversPath(path) {
  if (path.startsWith('/lovers/painel')) return false
  return /^\/lovers(\/|$)/.test(path) || LEGACY_LOVERS_PATHS.includes(path)
}

export default function App() {
  const [path, navigate] = useRoute()

  React.useEffect(() => { applyPalette() }, [])

  React.useEffect(() => {
    if (isLegacyLoversPath(path)) navigate('/')
  }, [path, navigate])

  const route = (() => {
    // Rotas internas: acessíveis mesmo em modo Awards-only (não aparecem em menu).
    if (path.startsWith('/painel-admin')) return 'painel-admin'
    if (path.startsWith('/lovers/painel')) return 'painel'
    // Pesquisa: pública, isenta do modo Awards-only (link vai por e-mail/Brevo).
    if (path.startsWith('/pesquisa')) return 'pesquisa'
    // Modo Awards-only: qualquer rota pública renderiza a página de vencedores.
    // Exceção DEV-only: com o preview institucional ligado (ver acima), a tabela
    // de rotas normal assume — sem alterar a flag de produção.
    if (AWARDS_ONLY_PUBLICATION && !INSTITUTIONAL_PREVIEW) return 'vencedores'
    if (path === '/' || path === '') return 'home'
    if (path.startsWith('/vencedores'))   return 'vencedores'
    if (path.startsWith('/premiacao'))    return 'vencedores'
    if (path.startsWith('/edicoes'))      return 'edicoes'
    if (path.startsWith('/historico-sweet-awards')) return 'historico-awards'
    if (path.startsWith('/curiosidades')) return 'curiosidades'
    if (path.startsWith('/participar'))   return 'participar'
    if (path.startsWith('/apoiar'))       return 'apoiar'
    if (path.startsWith('/contato'))      return 'contato'
    if (path.startsWith('/lovers/painel')) return 'painel'
    return 'home'
  })()

  let page
  switch (route) {
    case 'home':         page = <HomePage navigate={navigate} />; break
    case 'edicoes':      page = <EdicoesPage navigate={navigate} />; break
    case 'curiosidades': page = <CuriosidadesPage navigate={navigate} />; break
    case 'participar':   page = <ParticiparPage navigate={navigate} />; break
    case 'apoiar':       page = <ApoiarPage navigate={navigate} />; break
    case 'contato':      page = <ContatoPage navigate={navigate} />; break
    case 'historico-awards': page = <HistoricoAwardsPage navigate={navigate} />; break
    case 'vencedores':   page = <SweetAwardsPage navigate={navigate} />; break
    case 'painel':       page = <PainelPage navigate={navigate} />; break
    case 'pesquisa':     page = <PesquisaPage navigate={navigate} />; break
    case 'painel-admin': page = <PainelAdminPage navigate={navigate} />; break
    default:             page = <HomePage navigate={navigate} />
  }

  React.useEffect(() => {
    const cls = `route-${route}`
    document.body.classList.add(cls)
    return () => document.body.classList.remove(cls)
  }, [route])

  return (
    <DevViewportSwitcher>
      <SiteHeader route={route} navigate={navigate} path={path} />
      <main key={route} className="page-enter">
        <ErrorBoundary key={route}>
          <React.Suspense fallback={<div style={{ padding: '80px 20px', textAlign: 'center', opacity: 0.6 }}>Carregando…</div>}>
            {page}
          </React.Suspense>
        </ErrorBoundary>
      </main>
      {FOOTER_ROUTES.includes(route) && <SiteFooter navigate={navigate} />}
      <CookieConsent />
    </DevViewportSwitcher>
  )
}
