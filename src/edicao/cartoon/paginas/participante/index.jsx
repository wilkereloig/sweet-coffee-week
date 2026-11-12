/*
 * Página da casa (§5.3 do plano; docs/cartoon-2026-2/10 §10.7 e §10.14) — a ficha única da edição.
 * /cartoon/combos/:slug usa a mesma página com foco="combo" (abre no bloco do combo).
 *
 * Redesenho de 11/11/2026 (auditoria da Página da casa), na ordem de quem vem comprar. Uma seção por arquivo nesta pasta:
 * Capa (a lâmina do combo: foto, preço, momento, ações de compra) · ComoPedir ("Peça ou venha") · Combo (o que vem, com os
 * detalhes dos itens recolhidos) · Unidades ("Onde e quando") · Carimbe e avalie · Sobre a casa. (O patrocinador Sicredi mora no TOPO de toda página da edição, na casca — cartoon/index.jsx.) A barra de
 * compra do celular só aparece depois que as ações da capa saem da tela; o cenário do combo fecha a capa e a seção seguinte senta por cima dele.
 * Tudo à vista, sem abas. O que o painel ainda não tem aparece como "não informado" — nunca escondido, nunca deduzido.
 */
import React from 'react'
import { EDICAO } from '../../../config.js'
import { carregarParticipante } from '../../../dados/publico.js'
import { Link, Carregando, Falha, Avisos } from '../../../componentes/base.jsx'
import { PARTICIPANTE as T, FASE_TEXTO, TIPO_ORDEM } from '../../textos.js'
import { useRota } from '../../contexto.js'
import { useAgoraNasCasas } from '../../useAgoraNasCasas.js'
import { AssinaturaPatrocinio } from '../../../componentes/sistema/AssinaturaPatrocinio.jsx'
import { Capa } from './Capa.jsx'
import { Carimbe } from './Carimbe.jsx'
import { Combo } from './Combo.jsx'
import { ComoPedir } from './ComoPedir.jsx'
import { Unidades } from './Unidades.jsx'
import { Sobre } from './Sobre.jsx'
import { AcoesCompra } from '../../CartaoCombo.jsx'

export function Participante ({ slug, foco, navigate, edicao }) {
  const [res, setRes] = React.useState({ estado: 'carregando' })
  const [tentativa, setTentativa] = React.useState(0)
  const rota = useRota()
  // O que é verdade AGORA (esgotado, fila): as mesmas leituras da Home e do mapa, para a ficha nunca vender o que a Home diz que acabou.
  const { esgotados, filas } = useAgoraNasCasas(edicao?.fase === 'encerrada' ? null : EDICAO.codigo)
  React.useEffect(() => {
    let vivo = true
    const ctl = new AbortController()
    setRes({ estado: 'carregando' })
    carregarParticipante(EDICAO.codigo, slug, { sinal: ctl.signal })
      .then((r) => { if (vivo) setRes(r) })
      .catch(() => { if (vivo) setRes({ estado: 'falha' }) })
    return () => { vivo = false; ctl.abort() }
  }, [slug, tentativa])

  const p = res.participante
  React.useEffect(() => {
    if (res.estado !== 'publicado') return
    document.title = `${foco === 'combo' ? 'Combo da ' : ''}${p.casa.nome} · Sweet & Coffee Week Cartoon`
    // /combos/:slug abre na capa (que já é o combo: foto, preço e ações). "Quero ir" de casa com várias unidades, vindo do
    // catálogo, abre nas unidades. ?ver=atendimento|unidades (cartão de compra, 11/11) manda mesmo em /combos/:slug.
    const ver = new URLSearchParams(location.search).get('ver')
    const alvo = ['unidades', 'atendimento'].includes(ver) ? ver : ''
    if (alvo) requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById(alvo)?.scrollIntoView({ block: 'start' })))
  }, [res.estado, p, foco])

  if (res.estado === 'carregando') return <Carregando texto="Carregando a casa…" />
  if (res.estado === 'falha') return <Falha principal titulo="Não conseguimos carregar esta casa agora" texto="Confira a conexão e tente de novo." tentar={() => setTentativa((n) => n + 1)} />
  if (res.estado !== 'publicado') {
    const texto = res.estado === 'retirado' ? T.retirado : res.estado === 'nao_divulgado' ? T.naoDivulgado : T.inexistente
    return (
      <Falha principal titulo={texto}>
        <p><Link className="ct-botao" href={`${EDICAO.caminho}/participantes`} navigate={navigate}>Ver as casas</Link></p>
      </Falha>
    )
  }

  return (
    <FichaParticipante p={p} fase={res.fase || edicao?.fase} avaliacaoAberta={!!edicao?.avaliacao?.aberta} periodo={edicao?.edicao}
      navigate={navigate} rota={rota} desatualizado={res.desatualizado} demo={res.demo} retrato={res.retrato}
      esgotado={esgotados.has(p.slug)} fila={(p.unidades || []).some((u) => filas.has(u.id))} />
  )
}

/**
 * A ficha em si — só apresentação, a partir do JSON público. É a MESMA que a
 * prévia do painel mostra (painel-app importa daqui): o que a marca vê antes de
 * enviar é o que o site mostraria. Sem `navigate`, os links internos somem
 * (prévia); sem `rota` (ou com a edição encerrada), "Quero ir" e "Já fui" somem.
 */
export function FichaParticipante ({ p, fase, avaliacaoAberta: aberta = false, navigate = null, rota: rotaRecebida = null, desatualizado = false, demo = false, retrato = null, periodo = null, esgotado = false, fila = false }) {
  const encerrada = fase === 'encerrada'
  const rota = encerrada ? null : rotaRecebida
  const combo = p.combo
  const itens = [...(combo?.itens || [])].sort((a, b) => a.posicao - b.posicao || TIPO_ORDEM.indexOf(a.tipo) - TIPO_ORDEM.indexOf(b.tipo))
  const avaliacaoAberta = aberta && !!combo && !!navigate && !encerrada
  // A barra de compra do celular só entra quando as ações da capa saem da tela (senão são duas iguais na primeira tela).
  const [capaComCompra, setCapaComCompra] = React.useState(true)
  const naCompra = !encerrada && !!combo && !!navigate && !esgotado
  // Fim da página: com ele à vista a barra de compra some (não fica solta entre o patrocínio e o rodapé).
  const [noFim, setNoFim] = React.useState(false)
  const fimRef = React.useRef(null)
  React.useEffect(() => {
    const el = fimRef.current
    if (!el) return undefined
    // Pela rolagem (e não por IntersectionObserver): um salto até o rodapé passa do marcador sem nunca "cruzá-lo" e o observador não avisa.
    let quadro = 0
    const ler = () => { cancelAnimationFrame(quadro); quadro = requestAnimationFrame(() => setNoFim(el.getBoundingClientRect().top < window.innerHeight)) }
    ler()
    window.addEventListener('scroll', ler, { passive: true })
    window.addEventListener('resize', ler)
    return () => { cancelAnimationFrame(quadro); window.removeEventListener('scroll', ler); window.removeEventListener('resize', ler) }
  }, [])

  return (
    <article className="ct-part">
      <Avisos desatualizado={desatualizado} demo={demo} retrato={retrato} />
      {navigate && <p className="ct-voltar"><Link href={`${EDICAO.caminho}/participantes`} navigate={navigate}>← {T.voltar}</Link></p>}

      <Capa p={p} encerrada={encerrada} rota={rota} navigate={navigate} esgotado={esgotado} fila={fila} periodo={periodo} aoVerCompra={setCapaComCompra} />
      {/* Só no site (a prévia do painel não leva patrocinador), logo abaixo da capa. */}
      {navigate && <AssinaturaPatrocinio />}
      {encerrada && <p className="ct-aviso">{FASE_TEXTO.encerrada}</p>}

      {combo && !encerrada && <ComoPedir p={p} />}
      {combo ? <Combo p={p} combo={combo} itens={itens} /> : <p className="ct-aviso">{FASE_TEXTO.semCombo}</p>}
      <Unidades p={p} navigate={navigate} comCombo={!!combo && !encerrada} rota={rota} periodo={periodo} />

      {/* Provou? Carimbe e avalie: um painel só (era o bloco Avalie + o aviso flutuante + o botão do carimbo de delivery). */}
      {avaliacaoAberta && <Carimbe p={p} navigate={navigate} />}

      <Sobre p={p} />
      <span ref={fimRef} className="ct-ficha__fim" aria-hidden="true" />

      {/* Venda: no celular, "Pedir delivery | Ir até a casa" presos ao pé da tela, acima da barra de abas, depois que as da
          capa saem da tela. Só no site (a prévia do painel não tem navigate), com a edição em curso e o combo à venda. */}
      {naCompra && <AcoesCompra p={p} navigate={navigate} naFicha className={`ct-ficha__compra${capaComCompra || noFim ? ' is-oculta' : ''}`} />}
    </article>
  )
}
