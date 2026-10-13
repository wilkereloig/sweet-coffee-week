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
import { applyPageMeta } from './lib/pageMeta'

import { CARREGADORES } from './pages/carregadores'

// Uma página, um chunk (src/pages/carregadores.js). O gate abaixo decide a ROTA
// antes de qualquer página ser pedida: sob PARTICIPAR_ONLY só o chunk de
// Participar chega ao visitante.
const PAGINAS = Object.fromEntries(
  Object.entries(CARREGADORES).map(([rota, carregar]) => [rota, React.lazy(carregar)]),
)

/* O motor de movimento varre o DOM da página. Com a página em chunk próprio, um
   efeito no App rodaria com o fallback na tela e não acharia nada. Dentro do
   Suspense, este efeito só roda quando a página real já montou — React só
   confirma a árvore suspensa inteira, filhos primeiro. */
function MovimentoDaPagina({ raizRef, ativo, children }) {
  useSiteMotion(raizRef, [], ativo)
  return children
}

/* Fallback da troca de página: ocupa a altura da tela na cor do herói da rota
   (body.route-* já está aplicado), então não há clarão branco nem salto do
   rodapé subindo. O texto existe para leitor de tela; visualmente é a chapa. */
function CarregandoPagina() {
  return (
    <div className="scw-carregando" role="status" aria-live="polite">
      <span className="scw-sr">Carregando a página…</span>
    </div>
  )
}

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
// DESLIGADO em 26/08/2026 (decisão do Eloi): entra o lançamento parcial abaixo.
const COMING_SOON_PUBLICATION = false

// Publicação "SÓ PARTICIPAR" (18/09/2026, pedido do Wilke): o domínio oficial
// abre direto na página Participar, e QUALQUER endereço do site — inclusive
// '/' e '/contato' — mostra essa página. Sem menu: o cabeçalho fica só com a
// marca e o botão "Painel SCW" (`semNav`), o rodapé perde os links de página
// (`semLinks`) e a barra de abas do celular não entra. As páginas estáticas
// fora do bundle (/quero-participar/, /painel/ — §10.4-b) não passam por aqui
// e seguem no ar. O institucional completo continua em DEV e em
// *.vercel.app?preview=1 (INSTITUTIONAL_PREVIEW).
// DESLIGADO em 13/10/2026 (pedido do Wilker: "pode publicar o site completo"):
// o domínio passa a mostrar o institucional inteiro, com menu e abas.
const PARTICIPAR_ONLY_PUBLICATION = false

// Lançamento parcial "SÓ PARTICIPANTES" (26/08/2026, decisão do Eloi): o
// domínio oficial mostra só Contato como página institucional real — o
// resto (inclusive a home, '/') cai na página de espera 'aguarde'
// (src/pages/institutional/Aguarde.jsx). Participar segue no ar de verdade
// (rota /participar funciona pra quem tem o link direto), só não é mais a
// porta de entrada: a partir de 26/08/2026 quem digita o domínio cai na
// espera, não em Participar. Toda rota que não for Contato (nem Awards-only/
// em-breve, tratados antes) força 'aguarde', mesmo padrão de
// AWARDS_ONLY_PUBLICATION acima. O clique no menu para Home/Edições/Awards/
// Apoiar troca o hash mas a página renderizada não muda — do ponto de vista
// de quem navega, "não acontece nada" (pedido do Eloi). As três páginas
// estáticas fora do bundle (/quero-participar/, /marca/, /organizacao/ —
// §10.4-b) não passam por aqui e continuam no ar normalmente, inclusive o
// botão "Painel SCW" do cabeçalho. Preview institucional completo
// (INSTITUTIONAL_PREVIEW) segue liberado em DEV e em *.vercel.app?preview=1,
// para revisar as páginas trancadas (Participar incluída) antes de
// destrancar de verdade.
// DESLIGADO em 18/09/2026 (pedido do Wilke): entra PARTICIPAR_ONLY_PUBLICATION.
const AGUARDE_ONLY_PUBLICATION = false

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

  const soParticipar = PARTICIPAR_ONLY_PUBLICATION && !INSTITUTIONAL_PREVIEW

  const route = (() => {
    // Modo Awards-only: qualquer rota pública renderiza a página de vencedores.
    // Exceção DEV-only: com o preview institucional ligado (ver acima), a tabela
    // de rotas normal assume — sem alterar a flag de produção.
    if (AWARDS_ONLY_PUBLICATION && !INSTITUTIONAL_PREVIEW) return 'historico-awards'
    // Modo "em breve": toda rota pública renderiza a landing (ver flag acima).
    if (COMING_SOON_PUBLICATION && !INSTITUTIONAL_PREVIEW) return 'em-breve'
    // Modo "só Participar": toda rota pública renderiza Participar (ver flag).
    if (soParticipar) return 'participar'
    // Rota direta p/ revisar a landing em DEV/preview.
    if (path.startsWith('/em-breve')) return 'em-breve'
    // Lançamento parcial: Contato e Participar (link direto) saem livres;
    // qualquer outra rota pública vira a espera (inclusive a home). Ver
    // AGUARDE_ONLY_PUBLICATION acima.
    if (
      AGUARDE_ONLY_PUBLICATION && !INSTITUTIONAL_PREVIEW &&
      !path.startsWith('/contato') && !path.startsWith('/participar')
    ) return 'aguarde'
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

  const Pagina = PAGINAS[route] || PAGINAS.home
  // Edições tem cabeçalho próprio (o do site não é renderizado nessa rota), então
  // o botão de acesso precisa do gatilho do diálogo vindo daqui.
  const propsDaPagina = route === 'edicoes'
    ? { navigate, onOpenAccess: () => setAccessOpen(true), accessOpen }
    : route === 'em-breve' || route === 'aguarde' ? {} : { navigate }

  React.useEffect(() => {
    const cls = `route-${route}`
    document.body.classList.add(cls)
    return () => document.body.classList.remove(cls)
  }, [route])

  // router.js já chama applyPageMeta(path) no path CRU (hash/pathname). Isso
  // basta na publicação normal, mas com AGUARDE_ONLY_PUBLICATION (ou
  // AWARDS_ONLY_PUBLICATION/COMING_SOON_PUBLICATION) a ROTA renderizada diverge
  // do path digitado -- sem isto, /edicoes mostraria o conteúdo de Participar
  // com a aba do navegador e a meta description ainda dizendo "Edições".
  // Roda por cima, na rota já resolvida, então corrige os três modos restritos
  // de uma vez sem duplicar a lógica de cada flag aqui.
  React.useEffect(() => {
    const pathPorRota = {
      home: '/', edicoes: '/edicoes', 'historico-awards': '/sweet-awards',
      participar: '/participar', apoiar: '/apoiar', contato: '/contato',
      'em-breve': '/', aguarde: '/',
    }
    applyPageMeta(pathPorRota[route] || '/')
  }, [route])

  // Áreas internas (painéis) e as duas landings de espera ("em breve" e
  // "aguarde") são tela cheia: sem header/menu público (o menu levaria
  // sempre pra elas mesmas, já que são o destino de toda rota trancada).
  const isInternal = route === 'em-breve' || route === 'aguarde'

  // Nav mobile (tab bar + menu full-screen): só nas rotas públicas institucionais
  // (mesma lista do rodapé). Fecha o menu ao trocar de rota.
  const showMobileNav = FOOTER_ROUTES.includes(route) && !soParticipar
  React.useEffect(() => { setMenuOpen(false) }, [route])

  // Edições substitui a casca do site pelo cabeçalho próprio da página (mesma
  // geometria) — header, barra de página e rodapé saem; a tab bar continua.
  const showShell = !isInternal && route !== 'edicoes'

  // Motor de movimento (src/hooks/useSiteMotion.js): um único ponto para todas
  // as institucionais. Fica de fora de Edições, que tem coreografia própria de
  // apresentação, e dos painéis internos, que são ferramenta de trabalho.
  const conteudoRef = React.useRef(null)
  const comMovimento = !isInternal && route !== 'edicoes'

  // Trocou de página: o foco vai para o conteúdo novo (o <main>, que é
  // focável só por script). Sem isso, quem navega por teclado ou leitor de
  // tela continuaria no link do menu da página anterior. Não roda na carga
  // inicial — ali o foco é do navegador.
  const primeiraRota = React.useRef(true)
  React.useEffect(() => {
    if (primeiraRota.current) { primeiraRota.current = false; return }
    const main = conteudoRef.current
    if (main && typeof main.focus === 'function') main.focus({ preventScroll: true })
  }, [route])

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
            semNav={soParticipar}
          />
        </>
      )}
      {/* A landing não tem menu — mas precisa da porta de acesso, senão o painel
          da organização fica inalcançável enquanto o gate estiver ligado: ele é
          página estática e não aparece em rota nenhuma do React. Cabeçalho
          reduzido ao botão, sem marca e sem navegação (§7.7). Vale pras duas
          landings de espera — "aguarde" é a atual porta de entrada. */}
      {(route === 'em-breve' || route === 'aguarde') && (
        <SiteHeader
          apenasAcesso
          route={route}
          navigate={navigate}
          accessOpen={accessOpen}
          onOpenAccess={() => setAccessOpen(true)}
        />
      )}
      {/* O respiro acima da barra de abas vem de `.scw-raiz.tem-abas`; a classe
          legada `has-mobile-tabbar` somava um segundo padding, em 959px. */}
      <main id="conteudo" key={route} className="page-enter" ref={conteudoRef} tabIndex={-1}>
        <ErrorBoundary key={route}>
          <React.Suspense fallback={<CarregandoPagina />}>
            <MovimentoDaPagina raizRef={conteudoRef} ativo={comMovimento}>
              <Pagina {...propsDaPagina} />
            </MovimentoDaPagina>
          </React.Suspense>
        </ErrorBoundary>
      </main>
      {/* Edições = apresentação de tela única: sem rodapé (a nav do site continua
          na tab bar). FOOTER_ROUTES também controla o mobile nav (linha
          showMobileNav), por isso a exclusão é só aqui no render do rodapé. */}
      {FOOTER_ROUTES.includes(route) && route !== 'edicoes' && <SiteFooter navigate={navigate} route={route} semLinks={soParticipar} />}
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
      {/* A landing agora tem botão de acesso, então precisa do diálogo junto —
          sem isso o clique não abriria nada. */}
      <AccessDialog open={accessOpen} onClose={() => setAccessOpen(false)} />
      {showShell && <BotaoTopo />}
      <CookieConsent />
    </div>
  )
}
