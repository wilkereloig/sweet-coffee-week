/*
 * Camada Cartoon (2026.2) — docs/cartoon-2026-2/.
 *
 * Casca própria (cabeçalho, abas no celular, rodapé), carregamento único da
 * projeção pública da edição e a resolução de cena. Só aparece com
 * CARTOON_PUBLICA ou em preview (src/lib/rotas.js).
 */
import React from 'react'
import '../../styles/scw-cartoon.css'
import { EDICAO, INICIO_INSTITUCIONAL } from '../config.js'
import { resolverCena } from '../rotas.js'
import { carregarEdicao } from '../dados/publico.js'
import { useMinhaRota } from '../rota/useMinhaRota.js'
import { fotoProximaEdicao } from '../../data/imageLibrary'
import { LINKS_LEGAIS } from '../../components/SiteFooter'
import { abrirPreferencias } from '../../lib/consentimento'
import { useReservaDaBase } from '../../hooks/useReservaDaBase'
import { Link, Carregando, Falha } from '../componentes/base.jsx'
import { RotaContexto } from './contexto.js'
import { NAV, CENA_TEXTO, RODAPE } from './textos.js'
import { Entrada } from './paginas/Entrada.jsx'
import { Catalogo } from './paginas/Catalogo.jsx'
import { Participante } from './paginas/Participante.jsx'
import { Mapa } from './paginas/Mapa.jsx'
import { MinhaRota } from './paginas/MinhaRota.jsx'
import { Avaliar } from './paginas/Avaliar.jsx'
import { Premiacao } from './paginas/Premiacao.jsx'

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

const TITULOS = {
  participantes: 'Participantes', combos: 'Combos', mapa: 'Mapa', 'minha-rota': 'Minha rota',
  avaliar: 'Avaliar', premiacao: 'Premiação', inexistente: 'Página não encontrada',
}

export function CartoonPage ({ path, navigate }) {
  const { cena, slug, foco } = resolverCena(path)
  const ed = useEdicao()
  const rota = useMinhaRota(EDICAO.codigo)
  // A barra de abas do celular é fixa na base: o aviso de cookies sobe acima dela.
  const abasRef = React.useRef(null)
  useReservaDaBase(abasRef)
  const lettering = fotoProximaEdicao('marca')
  const dados = ed.dados
  const ativa = cena === 'participante' || cena === 'combos' ? 'participantes' : cena
  const nav = NAV.filter((n) => !n.soComAvaliacao || dados?.avaliacao?.aberta)

  React.useEffect(() => {
    if (cena !== 'participante') document.title = cena === 'entrada' ? `${EDICAO.nome} · 5 a 15 de novembro` : `${TITULOS[cena]} · ${EDICAO.nome}`
  }, [cena])

  // Páginas que dependem da lista da edição esperam por ela; o participante busca o seu.
  const precisaLista = !['entrada', 'participante', 'inexistente'].includes(cena)
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
      case 'avaliar': conteudo = <Avaliar navigate={navigate} dados={dados} />; break
      case 'premiacao': conteudo = <Premiacao navigate={navigate} dados={dados} />; break
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
    <RotaContexto.Provider value={rota}>
      <div className="ct-edicao">
        <header className="ct-topo">
          <Link href={EDICAO.caminho} navigate={navigate} className="ct-topo__marca" aria-label={`${EDICAO.nome}, início`}>
            {lettering && <img src={lettering.src} alt="" width="140" height="72" />}
          </Link>
          <nav className="ct-topo__nav" aria-label="Navegação da edição">
            <ul>
              {nav.map((item) => (
                <li key={item.cena}>
                  <Link href={item.href} navigate={navigate} aria-current={ativa === item.cena ? 'page' : undefined}>
                    {item.rotulo}{item.cena === 'minha-rota' && rota.ids.length ? <span className="ct-contador" aria-label={`, ${rota.ids.length} paradas`}>{rota.ids.length}</span> : null}
                  </Link>
                </li>
              ))}
              <li><Link href={INICIO_INSTITUCIONAL} navigate={navigate}>{RODAPE.sobre}</Link></li>
            </ul>
          </nav>
        </header>

        <div className="ct-conteudo">{conteudo}</div>
        <p className="ct-sr" aria-live="polite">{rota.anuncio}</p>

        <footer className="ct-rodape">
          <p>{RODAPE.assinatura}</p>
          <ul className="ct-rodape__links">
            <li><Link href={INICIO_INSTITUCIONAL} navigate={navigate}>{RODAPE.sobre}</Link></li>
            <li><Link href="/participar" navigate={navigate}>Participar</Link></li>
            <li><Link href="/apoiar" navigate={navigate}>Apoiar</Link></li>
            <li><Link href="/contato" navigate={navigate}>Contato</Link></li>
          </ul>
          <ul className="ct-rodape__links">
            {LINKS_LEGAIS.map(([href, rotulo]) => (
              <li key={href}><Link href={href} navigate={navigate}>{rotulo}</Link></li>
            ))}
            <li><button type="button" className="ct-rodape__botao" onClick={abrirPreferencias}>{RODAPE.preferencias}</button></li>
          </ul>
        </footer>

        <nav ref={abasRef} className="ct-abas" aria-label="Atalhos da edição">
          {[{ cena: 'entrada', rotulo: 'Início', href: EDICAO.caminho }, ...nav.filter((n) => n.cena !== 'premiacao' || !dados?.avaliacao?.aberta)].slice(0, 5).map((item) => (
            <Link key={item.cena} href={item.href} navigate={navigate} className="ct-aba" aria-current={ativa === item.cena ? 'page' : undefined}>
              {item.rotulo === 'Participantes' ? 'Casas' : item.rotulo === 'Minha rota' ? 'Rota' : item.rotulo}
              {item.cena === 'minha-rota' && rota.ids.length ? <span className="ct-contador">{rota.ids.length}</span> : null}
            </Link>
          ))}
        </nav>
      </div>
    </RotaContexto.Provider>
  )
}
