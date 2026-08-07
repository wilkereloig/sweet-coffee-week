import React from 'react'
import { useRoute } from './router'
import { applyPalette } from './theme'
import { SiteHeader } from './components/nav'
import { MobileTabBar } from './components/MobileTabBar'
import { MobileMenu } from './components/MobileMenu'
import { AccessDialog } from './components/AccessDialog'
import { ErrorBoundary } from './components/ErrorBoundary'
import { CookieConsent } from './components/CookieConsent'
import { SiteFooter } from './components/SiteFooter'
import { BotaoTopo } from './components/BotaoTopo'
import { useSiteMotion } from './hooks/useSiteMotion'

import { HomePage }         from './pages/institutional/Home'
import { EdicoesPage }      from './pages/institutional/Edicoes'
import { ParticiparPage }   from './pages/institutional/Participar'
import { ApoiarPage }       from './pages/institutional/Apoiar'
import { ContatoPage }      from './pages/institutional/Contato'
import { HistoricoAwardsPage } from './pages/institutional/HistoricoAwards'
import { EmBrevePage } from './pages/institutional/EmBreve'

// A edição Lovers foi encerrada e suas páginas públicas removidas. As rotas antigas
// (incluindo QR Codes impressos: /lovers/combos/:slug, /lovers/awards, e os aliases
// limpos /mapa, /rota, /participantes) são encaminhadas para a home.
// Publicação temporária focada em Awards: enquanto true, todo o site público
// renderiza só a página oficial do Sweet Awards — o Hall dos vencedores
// (#/sweet-awards, route 'historico-awards').
// DESLIGADO em jul/2026 (autorização do Wilke): site institucional completo
// publicado — Home, Edições, Participar, Apoiar, Contato + Awards.
const AWARDS_ONLY_PUBLICATION = false

// Publicação "EM BREVE" (jul/2026, decisão do Wilke): enquanto true, o domínio
// oficial mostra só a landing EmBreve — aviso do novo site + Sweet Awards da
// edição Lovers 2026.1 com links pros posts de resultado no Instagram.
// O institucional completo segue visível em DEV e em previews
// *.vercel.app?preview=1 (INSTITUTIONAL_PREVIEW).
const COMING_SOON_PUBLICATION = true

// PREVIEW DEV-only do institucional: permite revisar Edições,
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
const FOOTER_ROUTES = ['home', 'edicoes', 'participar', 'apoiar', 'contato', 'historico-awards']

const LEGACY_LOVERS_PATHS = ['/mapa', '/rota', '/participantes']
const RETIRED_PUBLIC_PATHS = ['/curiosidades']
function isLegacyLoversPath(path) {
  if (path.startsWith('/lovers/painel')) return false
  return /^\/lovers(\/|$)/.test(path) || LEGACY_LOVERS_PATHS.includes(path)
}

export default function App() {
  const [path, navigate] = useRoute()
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [accessOpen, setAccessOpen] = React.useState(false)

  React.useEffect(() => { applyPalette() }, [])

  React.useEffect(() => {
    if (isLegacyLoversPath(path)) navigate('/')
  }, [path, navigate])

  React.useEffect(() => {
    if (RETIRED_PUBLIC_PATHS.some((retiredPath) => path.startsWith(retiredPath))) navigate('/edicoes')
  }, [path, navigate])

  const route = (() => {
    // Modo Awards-only: qualquer rota pública renderiza a página de vencedores.
    // Exceção DEV-only: com o preview institucional ligado (ver acima), a tabela
    // de rotas normal assume — sem alterar a flag de produção.
    if (AWARDS_ONLY_PUBLICATION && !INSTITUTIONAL_PREVIEW) return 'historico-awards'
    // Modo "em breve": toda rota pública renderiza a landing (ver flag acima).
    if (COMING_SOON_PUBLICATION && !INSTITUTIONAL_PREVIEW) return 'em-breve'
    // Rota direta p/ revisar a landing em DEV/preview.
    if (path.startsWith('/em-breve')) return 'em-breve'
    if (path === '/' || path === '') return 'home'
    if (path.startsWith('/edicoes'))      return 'edicoes'
    if (path.startsWith('/sweet-awards') || path.startsWith('/historico-sweet-awards')) return 'historico-awards'
    // Curiosidades foi descontinuada; o endereço antigo continua seguro via Edições.
    if (path.startsWith('/curiosidades')) return 'edicoes'
    if (path.startsWith('/participar'))   return 'participar'
    if (path.startsWith('/apoiar'))       return 'apoiar'
    if (path.startsWith('/contato'))      return 'contato'
    return 'home'
  })()

  let page
  switch (route) {
    case 'home':         page = <HomePage navigate={navigate} />; break
    // Edições tem cabeçalho próprio (o do site não é renderizado nessa rota), então
    // o botão de acesso precisa do gatilho do diálogo vindo daqui.
    case 'edicoes':      page = <EdicoesPage navigate={navigate} onOpenAccess={() => setAccessOpen(true)} accessOpen={accessOpen} />; break
    case 'participar':   page = <ParticiparPage navigate={navigate} />; break
    case 'apoiar':       page = <ApoiarPage navigate={navigate} />; break
    case 'contato':      page = <ContatoPage navigate={navigate} />; break
    case 'historico-awards': page = <HistoricoAwardsPage navigate={navigate} />; break
    case 'em-breve':     page = <EmBrevePage />; break
    default:             page = <HomePage navigate={navigate} />
  }

  React.useEffect(() => {
    const cls = `route-${route}`
    document.body.classList.add(cls)
    return () => document.body.classList.remove(cls)
  }, [route])

  // Áreas internas (painéis) e a landing "em breve" são tela cheia: sem
  // header/menu público (na landing, o menu levaria sempre pra ela mesma).
  const isInternal = route === 'em-breve'

  // Nav mobile (tab bar + menu full-screen): só nas rotas públicas institucionais
  // (mesma lista do rodapé). Fecha o menu ao trocar de rota.
  const showMobileNav = FOOTER_ROUTES.includes(route)
  React.useEffect(() => { setMenuOpen(false) }, [route])

  // Edições substitui a casca do site pelo cabeçalho próprio da página (mesma
  // geometria) — header, barra de página e rodapé saem; a tab bar continua.
  const showShell = !isInternal && route !== 'edicoes'

  // Motor de movimento (src/hooks/useSiteMotion.js): um único ponto para todas
  // as institucionais. Fica de fora de Edições, que tem coreografia própria de
  // apresentação, e dos painéis internos, que são ferramenta de trabalho.
  const conteudoRef = React.useRef(null)
  const comMovimento = !isInternal && route !== 'edicoes'
  useSiteMotion(conteudoRef, [route, comMovimento], comMovimento)

  return (
    <div className={`scw-raiz${showMobileNav ? ' tem-abas' : ''}`}>
      {showShell && (
        <>
          <a href="#conteudo" className="scw-skip">Ir para o conteúdo</a>
          <SiteHeader
            route={route}
            navigate={navigate}
            accessOpen={accessOpen}
            onOpenAccess={() => setAccessOpen(true)}
          />
        </>
      )}
      {/* O respiro acima da barra de abas vem de `.scw-raiz.tem-abas`; a classe
          legada `has-mobile-tabbar` somava um segundo padding, em 959px. */}
      <main id="conteudo" key={route} className="page-enter" ref={conteudoRef}>
        <ErrorBoundary key={route}>
          <React.Suspense fallback={<div style={{ padding: '80px 20px', textAlign: 'center', opacity: 0.6 }}>Carregando…</div>}>
            {page}
          </React.Suspense>
        </ErrorBoundary>
      </main>
      {/* Edições = apresentação de tela única: sem rodapé (a nav do site continua
          na tab bar). FOOTER_ROUTES também controla o mobile nav (linha
          showMobileNav), por isso a exclusão é só aqui no render do rodapé. */}
      {FOOTER_ROUTES.includes(route) && route !== 'edicoes' && <SiteFooter navigate={navigate} route={route} />}
      {showMobileNav && (
        <>
          <MobileTabBar route={route} navigate={navigate} onOpenMenu={() => setMenuOpen(true)} menuOpen={menuOpen} />
          <MobileMenu
            open={menuOpen}
            route={route}
            navigate={navigate}
            onClose={() => setMenuOpen(false)}
            onOpenAccess={() => setAccessOpen(true)}
          />
        </>
      )}
      {!isInternal && <AccessDialog open={accessOpen} onClose={() => setAccessOpen(false)} />}
      {showShell && <BotaoTopo />}
      <CookieConsent />
    </div>
  )
}
