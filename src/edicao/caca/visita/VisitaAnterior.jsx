/*
 * "Visitei uma casa antes de conhecer a Caça": pedido excepcional, aceito só no prazo que o SERVIDOR informa
 * (05/11/2026, até 23h59:59 de Natal). O pedido não carimba nem conta nada; a organização analisa no painel. O carimbo aprovado
 * só vira casa validada depois da avaliação do combo com o mesmo e-mail do mapa. Sem mapa, só o convite para criá-lo.
 * Depois do prazo o formulário some e a consulta dos pedidos já enviados continua.
 */
import React from 'react'
import { EDICAO } from '../../config.js'
import { prepararAvaliacao } from '../../rota/carimbo.js'
import { api as apiPadrao } from '../api.js'
import { nomeDaCasa } from '../regras.js'
import { VISITA as T } from './textos.js'
import { casasDisponiveis, dataCurta, dataEmNatal, descreverPrazo, estadoDoPedido, pedidosDeVisita } from './logica.js'

/** prazo: null enquanto carrega · 'falha' se o servidor não respondeu · { aberto, ate }. */
function usarPrazo (api) {
  const [prazo, setPrazo] = React.useState(null)
  React.useEffect(() => {
    let vivo = true
    api.visitaAnteriorPrazo().then((r) => { if (vivo) setPrazo(r.ok ? r.prazo : 'falha') })
    return () => { vivo = false }
  }, [api])
  return prazo
}

function Pedido ({ pedido, mapa, dados, navigate }) {
  const estado = estadoDoPedido(pedido, mapa)
  const casa = nomeDaCasa(dados, pedido.slug)
  return (
    <li className={`ct-visita__pedido is-${estado}`}>
      <p className="ct-visita__linha"><strong>{casa}</strong><span className={`ct-visita__estado is-${estado}`}>{T.estado[estado]}</span></p>
      {pedido.visita_data && <p className="ct-nota">{T.dataDaVisita(dataCurta(pedido.visita_data))}</p>}
      <p className="ct-nota">{T.estadoTexto[estado]}</p>
      {estado === 'aprovadoAvaliar' && (
        <button type="button" className="ct-botao ct-botao--contorno" onClick={() => navigate(prepararAvaliacao({ caminho: EDICAO.caminho, codigo: EDICAO.codigo, slug: pedido.slug, mapa }))}>{T.avaliar}</button>
      )}
      {estado === 'negado' && <a className="ct-link" href="/contato" onClick={(e) => { if (!e.defaultPrevented && e.button === 0 && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) { e.preventDefault(); navigate('/contato') } }}>{T.contato}</a>}
    </li>
  )
}

function Formulario ({ chave, dados, casas, aoEnviar, aoFechar, api }) {
  const hoje = dataEmNatal()
  const [slug, setSlug] = React.useState('')
  const [unidade, setUnidade] = React.useState('')
  const [data, setData] = React.useState(hoje)
  const [nota, setNota] = React.useState('')
  const [enviando, setEnviando] = React.useState(false)
  const [erro, setErro] = React.useState('')
  const casa = casas.find((c) => c.slug === slug)
  const varias = (casa?.unidades.length || 0) > 1

  async function enviar (e) {
    e.preventDefault()
    if (enviando) return
    if (!casa) { setErro(T.recusa.qr_invalido); return }
    if (varias && !unidade) { setErro(T.recusa.unidade_obrigatoria); return }
    setEnviando(true); setErro('')
    const r = await api.visitaAnteriorPedir(chave, { slug, unidade: varias ? unidade : casa.unidades[0]?.id, data, nota })
    setEnviando(false)
    if (r.ok === true && r.estado === 'pendente') { aoEnviar(nomeDaCasa(dados, slug)); return }
    setErro(T.recusa[r.motivo] || T.recusa.padrao)
  }

  return (
    <form className="ct-form ct-visita__form" onSubmit={enviar} noValidate aria-labelledby="visita-form-titulo">
      <p id="visita-form-titulo" className="ct-sub">{T.formTitulo}</p>
      <label className="ct-campo"><span>{T.casa}</span>
        <select value={slug} onChange={(e) => { setSlug(e.target.value); setUnidade('') }} required>
          <option value="">{T.casaEscolha}</option>
          {casas.map((c) => <option key={c.slug} value={c.slug}>{c.nome}</option>)}
        </select>
      </label>
      {varias && (
        <label className="ct-campo"><span>{T.unidade}</span>
          <select value={unidade} onChange={(e) => setUnidade(e.target.value)} required>
            <option value="">{T.unidadeEscolha}</option>
            {casa.unidades.map((u) => <option key={u.id} value={u.id}>{u.rotulo}</option>)}
          </select>
        </label>
      )}
      <label className="ct-campo"><span>{T.data}</span>
        <input type="date" value={data} max={hoje} onChange={(e) => setData(e.target.value)} required aria-describedby="visita-data-ajuda" />
        <small id="visita-data-ajuda">{T.dataAjuda}</small>
      </label>
      <label className="ct-campo"><span>{T.nota}</span>
        <textarea rows={3} maxLength={T.notaMax} value={nota} onChange={(e) => setNota(e.target.value)} aria-describedby="visita-nota-ajuda" />
        <small id="visita-nota-ajuda">{T.notaAjuda}</small>
      </label>
      <p className="ct-nota">{T.comprovante}</p>
      <p className="ct-nota">{T.privacidade}</p>
      {erro && <p className="ct-aviso" role="alert">{erro}</p>}
      <div className="ct-acoes">
        <button type="submit" className="ct-botao" disabled={enviando}>{enviando ? T.enviando : T.enviar}</button>
        <button type="button" className="ct-botao ct-botao--contorno" onClick={aoFechar} disabled={enviando}>{T.fechar}</button>
      </div>
    </form>
  )
}

export function VisitaAnterior ({ caca, dados, navigate, api = apiPadrao }) {
  const prazo = usarPrazo(api)
  const [pedidos, setPedidos] = React.useState(null)
  const [aberto, setAberto] = React.useState(false)
  const [aviso, setAviso] = React.useState('')
  const [rodada, setRodada] = React.useState(0)
  const comMapa = caca.estado === 'pronto' && !!caca.mapa && !!caca.chave
  React.useEffect(() => {
    if (!comMapa) return undefined
    let vivo = true
    api.excecaoMinhas(caca.chave).then((r) => { if (vivo) setPedidos(r.ok ? pedidosDeVisita(r.pedidos) : []) })
    return () => { vivo = false }
  }, [api, comMapa, caca.chave, rodada])

  if (prazo === null || prazo === 'falha') return null // sem resposta do servidor não prometemos nada
  const aberta = prazo.aberto === true
  const quando = descreverPrazo(prazo.ate)
  if (!comMapa) return aberta ? <section className="ct-visita ct-visita--convite" aria-label={T.titulo}><p className="ct-nota">{T.semMapa(quando)}</p></section> : null

  const lista = pedidos || []
  if (!aberta && lista.length === 0) return null
  const casas = casasDisponiveis(dados, caca.mapa, lista)
  return (
    <section className="ct-visita" aria-labelledby="visita-titulo">
      <h2 id="visita-titulo" className="ct-sub">{T.titulo}</h2>
      {aberta
        ? <><p className="ct-nota">{T.lead}</p><p className="ct-visita__prazo"><strong>{T.prazo(quando)}</strong></p></>
        : <p className="ct-nota" role="status">{T.prazoEncerrado(quando)}</p>}
      {aviso && <div className="ct-visita__ok" role="status" tabIndex={-1}><p className="ct-sub">{T.enviadoTitulo}</p><p className="ct-nota">{T.enviadoTexto(aviso)}</p></div>}
      {aberta && !aberto && (
        <>
          <ul className="ct-visita__regras">{T.comoFunciona.map((t) => <li key={t}>{t}</li>)}</ul>
          {casas.length
            ? <button type="button" className="ct-botao ct-botao--contorno" aria-expanded={false} onClick={() => { setAberto(true); setAviso('') }}>{T.abrir}</button>
            : <p className="ct-nota">{T.semCasas}</p>}
        </>
      )}
      {aberta && aberto && (
        <Formulario chave={caca.chave} dados={dados} casas={casas} api={api}
          aoFechar={() => setAberto(false)} aoEnviar={(nome) => { setAberto(false); setAviso(nome); setRodada((n) => n + 1); caca.atualizar?.() }} />
      )}
      {lista.length > 0 && (
        <div className="ct-visita__lista">
          <h3 className="ct-rotulo">{T.seusPedidos}</h3>
          <ul>{lista.map((p) => <Pedido key={`${p.slug}-${p.criado_em}`} pedido={p} mapa={caca.mapa} dados={dados} navigate={navigate} />)}</ul>
        </div>
      )}
    </section>
  )
}
