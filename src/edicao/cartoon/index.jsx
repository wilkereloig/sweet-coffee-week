/*
 * Camada Cartoon (2026.2) — docs/cartoon-2026-2/.
 *
 * Casca própria (docs/cartoon-2026-2/10 §10.6): cabeçalho creme com o selo à
 * esquerda e a navegação (fixo a partir de 900px); no celular, botão "Menu" que
 * abre a folha com todas as páginas (<dialog> modal: Esc, véu e link fecham, o
 * foco fica na folha e volta ao botão) e a barra de abas creme embaixo; rodapé
 * chocolate com as barras de sinal e a realização F2. Também o carregamento
 * único da projeção pública e a resolução de cena. Só aparece com
 * CARTOON_PUBLICA ou em preview (src/lib/rotas.js).
 */
import React from 'react'
import '../../styles/scw-cartoon.css'
import { EDICAO, INICIO_INSTITUCIONAL } from '../config.js'
import { resolverCena } from '../rotas.js'
import { carregarEdicao } from '../dados/publico.js'
import { useMinhaRota } from '../rota/useMinhaRota.js'
import { seloEdicao, LOGO_F2, srcSet } from '../../data/imageLibrary'
import { LINKS_LEGAIS } from '../../components/SiteFooter'
import { abrirPreferencias } from '../../lib/consentimento'
import { useReservaDaBase } from '../../hooks/useReservaDaBase'
import { Link, Carregando, Falha } from '../componentes/base.jsx'
import { IconeCartoon } from '../componentes/sistema/IconeCartoon.jsx'
import ScwIcon from '../../components/scw-icons/ScwIcon.jsx'
import { RotaContexto, MAPA_NO_AR } from './contexto.js'
import { NAV, MENU, CENA_TEXTO, RODAPE } from './textos.js'
import { Entrada } from './paginas/Entrada.jsx'
import { Catalogo } from './paginas/Catalogo.jsx'
import { Participante } from './paginas/participante/index.jsx'
import { Mapa } from './paginas/mapa/index.jsx'
import { MinhaRota } from './paginas/MinhaRota.jsx'
import { SweetAwards } from './paginas/awards/index.jsx'
import { Carimbo } from './paginas/Carimbo.jsx'
import { VoucherVirtual } from './paginas/VoucherVirtual.jsx'
import { Regulamento } from './paginas/Regulamento.jsx'

// Vitrine do sistema visual (docs/cartoon-2026-2/10 §10.12): só no DEV. Fora
// dele o import nem existe no código, então a vitrine não entra no build.
const Sistema = import.meta.env.DEV ? React.lazy(() => import('./paginas/Sistema.jsx')) : null

function useEdicao () {
  const [s, setS] = React.useState({ estado: 'carregando' })
  const [tentativa, setTentativa] = React.useState(0)
  React.useEffect(() => {
    let vivo = true
    const ctl = new AbortController()
    carregarEdicao(EDICAO.codigo, { sinal: ctl.signal })
      .then((dados) => { if (vivo) setS({ estado: 'pronto', dados }) })
      .catch(() => { if (vivo) setS({ estado: 'falha' }) })
    return () => { vivo = false; ctl.abort() }
  }, [tentativa])
  return { ...s, tentar: () => { setS({ estado: 'carregando' }); setTentativa((n) => n + 1) } }
}

/** Paradas na Minha rota: o número à vista, a frase para leitor de tela. */
function Contador ({ n }) {
  if (!n) return null
  return <><span className="ct-contador" aria-hidden="true">{n}</span><span className="ct-sr">({n} {n === 1 ? 'parada' : 'paradas'})</span></>
}

/**
 * Menu do celular: <dialog> modal. A plataforma fecha no Esc, deixa o resto da página inerte e devolve o
 * foco ao botão ao fechar; o véu (::backdrop) fecha pelo clique no próprio <dialog>, que não tem padding
 * (o conteúdo mora no corpo). O Tab dá a volta dentro da folha, em vez de sair para a barra do navegador.
 */
function MenuCelular ({ itens, ativa, navigate, paradas }) {
  const ref = React.useRef(null)
  const [aberto, setAberto] = React.useState(false)
  const fechar = () => ref.current?.close()
  const prende = (e) => {
    if (e.key !== 'Tab') return
    const focaveis = ref.current.querySelectorAll('a, button')
    const [primeiro, ultimo] = [focaveis[0], focaveis[focaveis.length - 1]]
    if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus() }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus() }
  }
  return (
    <>
      <button type="button" className="ct-botao ct-botao--contorno ct-topo__menu" aria-haspopup="dialog" aria-expanded={aberto} aria-controls="ct-menu"
        onClick={() => { ref.current.showModal(); setAberto(true) }}><ScwIcon nome="menu" tamanho={20} />{MENU.abrir}</button>
      <dialog id="ct-menu" ref={ref} className="ct-folha" aria-labelledby="ct-menu-titulo"
        onClose={() => setAberto(false)} onClick={(e) => { if (e.target === e.currentTarget) fechar() }} onKeyDown={prende}>
        <div className="ct-folha__corpo">
          <div className="ct-folha__cabeca">
            <p id="ct-menu-titulo" className="ct-folha__titulo">{MENU.titulo}</p>
            <button type="button" className="ct-botao ct-botao--contorno" onClick={fechar}>{MENU.fechar}</button>
          </div>
          <ul className="ct-folha__lista">
            {itens.map((item) => (
              <li key={item.cena}>
                <Link href={item.href} navigate={navigate} aoIr={fechar} className="ct-folha__link" aria-current={ativa === item.cena ? 'page' : undefined}>
                  <IconeCartoon nome={item.icone} tamanho={32} /><span>{item.rotulo}</span>
                  {item.cena === 'minha-rota' && <Contador n={paradas} />}
                </Link>
              </li>
            ))}
            <li><Link href={INICIO_INSTITUCIONAL} navigate={navigate} aoIr={fechar} className="ct-folha__link ct-folha__link--fora">{RODAPE.sobre}</Link></li>
          </ul>
        </div>
      </dialog>
    </>
  )
}

// Sem o mapa no ar, a navegação fica sem Mapa e Minha rota, e estas páginas mostram o "em breve".
const PAGINAS = NAV.filter((n) => MAPA_NO_AR || !['mapa', 'minha-rota'].includes(n.cena))
const CENAS_DO_MAPA = ['mapa', 'minha-rota', 'carimbo', 'regulamento']

const TITULOS = {
  'mapa-em-breve': 'Mapa', participantes: 'Participantes', combos: 'Combos', mapa: 'Mapa', 'minha-rota': 'Minha rota',
  avaliar: 'Sweet Awards', premiacao: 'Sweet Awards', sistema: 'Sistema visual', carimbo: 'Caça aos Carimbos', voucher: 'Voucher virtual', regulamento: 'Regulamento da Caça aos Carimbos', inexistente: 'Página não encontrada',
}

export function CartoonPage ({ path, navigate }) {
  const pedida = resolverCena(path)
  const { slug, foco, codigo, token } = pedida
  const cena = pedida.cena === 'sistema' && !Sistema ? 'inexistente' : !MAPA_NO_AR && CENAS_DO_MAPA.includes(pedida.cena) ? 'mapa-em-breve' : pedida.cena
  const ed = useEdicao()
  const rota = useMinhaRota(EDICAO.codigo)
  // A barra de abas do celular é fixa na base: o aviso de cookies sobe acima dela.
  const abasRef = React.useRef(null)
  useReservaDaBase(abasRef)
  const selo = seloEdicao()
  const dados = ed.dados
  const ativa = cena === 'participante' || cena === 'combos' ? 'participantes' : cena === 'premiacao' ? 'avaliar' : cena === 'carimbo' ? 'minha-rota' : cena
  // Barra do celular: os cinco atalhos; depois dos resultados, a aba do Sweet Awards vira "Prêmios" (§10.6).
  const abas = PAGINAS.map((n) => (dados?.resultados_publicos && n.abaResultados ? { ...n, aba: n.abaResultados, icone: n.iconeResultados } : n))
  const paradas = rota.ids.length
  const linkNav = (item, className, filhos) => (
    <Link href={item.href} navigate={navigate} className={className} aria-current={ativa === item.cena ? 'page' : undefined}>
      {filhos}{item.cena === 'minha-rota' && <Contador n={paradas} />}
    </Link>
  )

  React.useEffect(() => {
    if (cena !== 'participante') document.title = cena === 'entrada' ? `${EDICAO.nome} · 5 a 15 de novembro` : `${TITULOS[cena]} · ${EDICAO.nome}`
  }, [cena])

  // Páginas que dependem da lista da edição esperam por ela; o participante busca o seu.
  const precisaLista = !['entrada', 'participante', 'sistema', 'inexistente', 'mapa-em-breve', 'carimbo', 'voucher', 'regulamento'].includes(cena)
  let conteudo
  if (precisaLista && ed.estado === 'carregando') conteudo = <Carregando texto="Carregando a edição…" />
  else if (precisaLista && ed.estado === 'falha') {
    conteudo = <Falha principal titulo="Não conseguimos carregar a edição agora" texto="Confira a conexão e tente de novo." tentar={ed.tentar} />
  } else {
    switch (cena) {
      case 'entrada': conteudo = <Entrada navigate={navigate} dados={dados} carregando={ed.estado === 'carregando'} erro={ed.estado === 'falha'} tentar={ed.tentar} />; break
      case 'participantes': conteudo = <Catalogo modo="participantes" navigate={navigate} dados={dados} />; break
      case 'combos': conteudo = <Catalogo modo="combos" navigate={navigate} dados={dados} />; break
      case 'participante': conteudo = <Participante key={slug} slug={slug} foco={foco} navigate={navigate} edicao={dados} />; break
      case 'mapa': conteudo = <Mapa navigate={navigate} dados={dados} />; break
      case 'minha-rota': conteudo = <MinhaRota navigate={navigate} dados={dados} />; break
      case 'avaliar':
      case 'premiacao': conteudo = <SweetAwards navigate={navigate} dados={dados} foco={cena} />; break
      case 'carimbo': conteudo = <Carimbo key={codigo} codigo={codigo} navigate={navigate} dados={dados} />; break
      case 'voucher': conteudo = <VoucherVirtual key={token} token={token} navigate={navigate} dados={dados} />; break
      case 'regulamento': conteudo = <Regulamento navigate={navigate} />; break
      case 'sistema': conteudo = <React.Suspense fallback={<Carregando texto="Carregando a vitrine…" />}><Sistema /></React.Suspense>; break
      case 'mapa-em-breve':
        conteudo = (
          <section className="ct-bloco">
            <h1 className="ct-h1">{CENA_TEXTO.mapaEmBreve.titulo}</h1>
            <p className="ct-lead">{CENA_TEXTO.mapaEmBreve.apoio}</p>
            <div className="ct-acoes"><Link href={`${EDICAO.caminho}/participantes`} navigate={navigate} className="ct-botao">Ver as casas</Link></div>
          </section>
        )
        break
      default:
        conteudo = (
          <section className="ct-bloco">
            <h1 className="ct-h1">{CENA_TEXTO.inexistente.titulo}</h1>
            <p className="ct-lead">{CENA_TEXTO.inexistente.apoio}</p>
            <div className="ct-acoes">
              <Link href={EDICAO.caminho} navigate={navigate} className="ct-botao">Ir para a entrada</Link>
              <Link href={`${EDICAO.caminho}/participantes`} navigate={navigate} className="ct-botao ct-botao--contorno">Ver as casas</Link>
            </div>
          </section>
        )
    }
  }

  return (
    <RotaContexto.Provider value={MAPA_NO_AR ? rota : null}>
      <div className="ct-edicao">
        <header className="ct-topo">
          <Link href={EDICAO.caminho} navigate={navigate} className="ct-topo__marca" aria-label={`${EDICAO.nome}, início`}>
            <img src={selo.src} srcSet={srcSet(selo.src)} sizes="64px" alt="" width={selo.largura} height={selo.altura} />
          </Link>
          <nav className="ct-topo__nav" aria-label="Navegação da edição">
            <ul>
              {PAGINAS.filter((n) => n.cena !== 'entrada').map((item) => <li key={item.cena}>{linkNav(item, undefined, item.rotulo)}</li>)}
              <li><Link href={INICIO_INSTITUCIONAL} navigate={navigate}>{RODAPE.sobre}</Link></li>
            </ul>
          </nav>
          <MenuCelular itens={PAGINAS} ativa={ativa} navigate={navigate} paradas={paradas} />
        </header>

        <div className="ct-conteudo">{conteudo}</div>
        <p className="ct-sr" aria-live="polite">{rota.anuncio}</p>

        <footer className="ct-rodape">
          <div className="ct-rodape__corpo">
            <div className="ct-rodape__assina">
              <p>{RODAPE.assinatura}</p>
              <p className="ct-rodape__realiza">
                <span>{RODAPE.realizacao}</span>
                <img src={LOGO_F2.src} alt={LOGO_F2.alt} width={LOGO_F2.largura} height={LOGO_F2.altura} loading="lazy" />
              </p>
            </div>
            <nav className="ct-rodape__grupo" aria-labelledby="ct-rodape-edicao">
              <p id="ct-rodape-edicao" className="ct-rodape__titulo">{RODAPE.paginas}</p>
              <ul className="ct-rodape__links">
                {PAGINAS.map((item) => <li key={item.cena}><Link href={item.href} navigate={navigate}>{item.rotulo}</Link></li>)}
              </ul>
            </nav>
            <nav className="ct-rodape__grupo" aria-labelledby="ct-rodape-festival">
              <p id="ct-rodape-festival" className="ct-rodape__titulo">{RODAPE.festival}</p>
              <ul className="ct-rodape__links">
                <li><Link href={INICIO_INSTITUCIONAL} navigate={navigate}>{RODAPE.sobre}</Link></li>
                <li><Link href="/participar" navigate={navigate}>Participar</Link></li>
                <li><Link href="/apoiar" navigate={navigate}>Apoiar</Link></li>
                <li><Link href="/contato" navigate={navigate}>Contato</Link></li>
              </ul>
            </nav>
            <ul className="ct-rodape__links ct-rodape__legais" aria-label={RODAPE.legais}>
              {LINKS_LEGAIS.map(([href, rotulo]) => (
                <li key={href}><Link href={href} navigate={navigate}>{rotulo}</Link></li>
              ))}
              <li><button type="button" className="ct-rodape__botao" aria-haspopup="dialog" onClick={abrirPreferencias}>{RODAPE.preferencias}</button></li>
            </ul>
          </div>
        </footer>

        <nav ref={abasRef} className="ct-abas" aria-label="Atalhos da edição">
          {abas.map((item) => (
            <React.Fragment key={item.cena}>{linkNav(item, 'ct-aba', <><IconeCartoon nome={item.icone} tamanho={32} /><span>{item.aba}</span></>)}</React.Fragment>
          ))}
        </nav>
      </div>
    </RotaContexto.Provider>
  )
}
