/*
 * Página da casa (§5.3 do plano; docs/cartoon-2026-2/10 §10.7 e §10.14) — a ficha única da edição.
 * /cartoon/combos/:slug usa a mesma página com foco="combo" (abre no bloco do combo).
 *
 * Uma seção por arquivo nesta pasta: Topo · Combo (com o cartão de cada item) · ComoPedir · Unidades · Sobre a casa
 * (texto e fotos da casa) · Avalie. A faixa do cenário com o combo fica presa ao pé da tela (CenarioFixo). Tudo à vista, sem
 * abas. O que o painel ainda não tem aparece como "não informado" — nunca escondido, nunca deduzido.
 */
import React from 'react'
import ScwIcon from '../../../../components/scw-icons/ScwIcon.jsx'
import { EDICAO } from '../../../config.js'
import { carregarParticipante } from '../../../dados/publico.js'
import { Link, Carregando, Falha, Avisos } from '../../../componentes/base.jsx'
import { Letreiro } from '../../../componentes/sistema/Letreiro.jsx'
import { CenarioFixo } from '../../../componentes/sistema/CenarioTema.jsx'
import { AssinaturaPatrocinio } from '../../../componentes/sistema/AssinaturaPatrocinio.jsx'
import { PARTICIPANTE as T, FASE_TEXTO, TIPO_ORDEM, ICONE } from '../../textos.js'
import { useRota } from '../../contexto.js'
import { Topo } from './Topo.jsx'
import { Combo } from './Combo.jsx'
import { ComoPedir } from './ComoPedir.jsx'
import { Unidades } from './Unidades.jsx'
import { Sobre } from './Sobre.jsx'

export function Participante ({ slug, foco, navigate, edicao }) {
  const [res, setRes] = React.useState({ estado: 'carregando' })
  const [tentativa, setTentativa] = React.useState(0)
  const rota = useRota()
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
    // /combos/:slug abre no combo; "Quero ir" de casa com várias unidades, vindo do catálogo, abre nas unidades.
    const alvo = foco === 'combo' ? 'combo' : new URLSearchParams(location.search).get('ver') === 'unidades' ? 'unidades' : ''
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
      navigate={navigate} rota={rota} desatualizado={res.desatualizado} demo={res.demo} retrato={res.retrato} />
  )
}

/**
 * A ficha em si — só apresentação, a partir do JSON público. É a MESMA que a
 * prévia do painel mostra (painel-app importa daqui): o que a marca vê antes de
 * enviar é o que o site mostraria. Sem `navigate`, os links internos somem
 * (prévia); sem `rota` (ou com a edição encerrada), "Quero ir" e "Já fui" somem.
 */
export function FichaParticipante ({ p, fase, avaliacaoAberta: aberta = false, navigate = null, rota: rotaRecebida = null, desatualizado = false, demo = false, retrato = null, periodo = null }) {
  const encerrada = fase === 'encerrada'
  const rota = encerrada ? null : rotaRecebida
  const combo = p.combo
  const itens = [...(combo?.itens || [])].sort((a, b) => a.posicao - b.posicao || TIPO_ORDEM.indexOf(a.tipo) - TIPO_ORDEM.indexOf(b.tipo))
  const avaliacaoAberta = aberta && !!combo && !!navigate

  return (
    <article className="ct-part">
      <Avisos desatualizado={desatualizado} demo={demo} retrato={retrato} />
      {navigate && <p className="ct-voltar"><Link href={`${EDICAO.caminho}/participantes`} navigate={navigate}>← {T.voltar}</Link></p>}

      {/* Só no site: a prévia do painel (sem navigate) não leva a assinatura do patrocinador. */}
      {navigate && <AssinaturaPatrocinio />}

      <Topo p={p} encerrada={encerrada} rota={rota} navigate={navigate} />
      {encerrada && <p className="ct-aviso">{FASE_TEXTO.encerrada}</p>}

      {combo ? <Combo p={p} combo={combo} itens={itens} encerrada={encerrada} /> : <p className="ct-aviso">{FASE_TEXTO.semCombo}</p>}
      {combo && !encerrada && <ComoPedir p={p} />}
      <Unidades p={p} navigate={navigate} comCombo={!!combo && !encerrada} rota={rota} periodo={periodo} />

      <Sobre p={p} />

      {avaliacaoAberta && (
        <section className="ct-bloco ct-avalie" aria-labelledby="av-titulo">
          <Letreiro id="av-titulo" texto={T.avaliarTitulo} />
          <p>{T.avaliarTexto}</p>
          <Link className="ct-botao" href={`${EDICAO.caminho}/avaliar?participante=${p.slug}`} navigate={navigate}><ScwIcon nome={ICONE.avaliar} tamanho={20} />{T.avaliar}</Link>
        </section>
      )}
      {/* Só no site: na prévia do painel (sem navigate) a faixa presa ao pé cobriria a interface do painel. */}
      {navigate && <CenarioFixo slug={p.slug} />}
    </article>
  )
}
