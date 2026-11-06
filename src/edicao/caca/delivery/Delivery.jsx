/*
 * "Pedi por delivery": pedido de carimbo de quem recebeu o combo em casa, sem GPS. Dois caminhos, o primeiro é o principal:
 *   1) CASA confirma: o pedido nasce com um código temporário (uso único) que a pessoa manda à casa; a casa confirma no painel dela.
 *   2) IMAGEM: print ou foto do pedido, que a ORGANIZAÇÃO analisa. A imagem fica em armazenamento privado.
 * Enviar não carimba nem conta nada. O estado é sempre o do servidor; o que a pessoa preencheu não se perde quando o envio falha.
 */
import React from 'react'
import { EDICAO } from '../../config.js'
import { prepararAvaliacao } from '../../rota/carimbo.js'
import { api as apiPadrao } from '../api.js'
import { nomeDaCasa } from '../regras.js'
import { dataCurta, dataEmNatal } from '../visita/logica.js'
import { DELIVERY as T } from './textos.js'
import { LIMITES, casaDaConsulta, casasComDelivery, codigoLegivel, estadoDoDelivery, pedidosDelivery, validadeDoCodigo } from './logica.js'
import { prepararImagem } from './imagem.js'

const recusa = (motivo) => T.recusa[motivo] || T.recusa.padrao

function PainelImagem ({ chave, pedido, api, aoEnviar }) {
  const [preparado, setPreparado] = React.useState(null) // { blob, ext, tipo }
  const [previa, setPrevia] = React.useState('')
  const [fase, setFase] = React.useState('') // '' | 'preparando' | 'enviando'
  const [erro, setErro] = React.useState('')
  React.useEffect(() => () => { if (previa) URL.revokeObjectURL(previa) }, [previa])

  async function escolher (e) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    setErro(''); setFase('preparando')
    const r = await prepararImagem(arquivo)
    setFase('')
    if (!r.ok) { setErro(recusa(r.motivo)); return }
    setPreparado(r); setPrevia(URL.createObjectURL(r.blob))
  }

  async function enviar () {
    if (!preparado || fase) return
    setErro(''); setFase('enviando')
    const r = await api.deliveryEnviarImagem(chave, pedido.id, preparado)
    setFase('')
    if (r.ok === true) aoEnviar()
    else setErro(recusa(r.motivo)) // a imagem preparada continua aqui: é só tentar de novo
  }

  return (
    <div className="ct-dlv__imagem">
      <h4 className="ct-rotulo">{T.imagemTitulo}</h4>
      <p className="ct-nota">{T.imagemOrienta}</p>
      <div className="ct-acoes">
        <label className="ct-botao ct-botao--contorno ct-dlv__arquivo">
          {T.imagemGaleria}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="ct-sr" onChange={escolher} disabled={!!fase} />
        </label>
        <label className="ct-botao ct-botao--contorno ct-dlv__arquivo">
          {T.imagemCamera}
          <input type="file" accept="image/*" capture="environment" className="ct-sr" onChange={escolher} disabled={!!fase} />
        </label>
      </div>
      {fase === 'preparando' && <p className="ct-nota" role="status">{T.imagemPreparando}</p>}
      {previa && <img className="ct-dlv__previa" src={previa} alt="Prévia da imagem que será enviada" />}
      {preparado && (
        <div className="ct-acoes">
          <button type="button" className="ct-botao" onClick={enviar} disabled={!!fase}>{fase === 'enviando' ? T.enviando : erro ? T.imagemTentar : T.imagemEnviar}</button>
        </div>
      )}
      {erro && <p className="ct-aviso" role="alert">{erro}</p>}
    </div>
  )
}

function Pedido ({ pedido, mapa, dados, chave, api, navigate, aberto, aoAtualizar }) {
  const estado = estadoDoDelivery(pedido, mapa)
  const casa = nomeDaCasa(dados, pedido.slug)
  const [imagem, setImagem] = React.useState(!!aberto)
  const [msg, setMsg] = React.useState('')
  const [ocupado, setOcupado] = React.useState(false)
  const [erro, setErro] = React.useState('')
  const podeImagem = estado === 'codigo' || estado === 'expirado'
  const validade = estado === 'codigo' ? validadeDoCodigo(pedido.expira_em) : ''

  async function copiar () {
    try { await navigator.clipboard.writeText(codigoLegivel(pedido.codigo)); setMsg(T.copiado) } catch { setMsg(T.copiarFalhou) }
  }
  async function compartilhar () {
    try { await navigator.share({ text: `${T.codigoTitulo}: ${codigoLegivel(pedido.codigo)}` }) } catch { /* cancelou */ }
  }
  async function novoCodigo () {
    if (ocupado) return
    setOcupado(true); setErro('')
    const r = await api.deliveryNovoCodigo(chave, pedido.id)
    setOcupado(false)
    if (r.ok === true) aoAtualizar(); else setErro(recusa(r.motivo))
  }

  return (
    <li className={`ct-dlv__pedido is-${estado}`}>
      <p className="ct-dlv__linha"><strong>{casa}</strong><span className={`ct-dlv__estado is-${estado}`}>{T.estado[estado]}</span></p>
      {pedido.pedido_data && <p className="ct-nota">{T.dataDoPedido(dataCurta(pedido.pedido_data))}{pedido.pedido_ref ? ` · ${pedido.pedido_ref}` : ''}</p>}
      <p className="ct-nota">{T.estadoTexto[estado]}</p>

      {estado === 'codigo' && (
        <div className="ct-dlv__codigo" role="group" aria-label={T.codigoTitulo}>
          <p className="ct-dlv__codigo-rotulo">{T.codigoTitulo}</p>
          <p className="ct-dlv__codigo-valor" aria-label={`Código ${codigoLegivel(pedido.codigo).split('').join(' ')}`}>{codigoLegivel(pedido.codigo)}</p>
          <p className="ct-nota">{T.codigoComo(casa)}</p>
          {validade && <p className="ct-nota">{T.codigoValidade(validade)}</p>}
          <div className="ct-acoes">
            <button type="button" className="ct-botao" onClick={copiar}>{T.copiar}</button>
            {typeof navigator !== 'undefined' && navigator.share && <button type="button" className="ct-botao ct-botao--contorno" onClick={compartilhar}>{T.compartilhar}</button>}
          </div>
          <p className="ct-nota" role="status">{msg}</p>
          <p className="ct-nota">{T.codigoNaoChave}</p>
        </div>
      )}
      {estado === 'expirado' && (
        <div className="ct-acoes">
          {pedido.codigos_restantes > 0 && <button type="button" className="ct-botao" onClick={novoCodigo} disabled={ocupado}>{ocupado ? T.enviando : T.novoCodigo}</button>}
        </div>
      )}
      {estado === 'expirado' && pedido.codigos_restantes > 0 && <p className="ct-nota">{T.novoCodigoRestam(pedido.codigos_restantes)}</p>}
      {erro && <p className="ct-aviso" role="alert">{erro}</p>}

      {podeImagem && !imagem && (
        <button type="button" className="ct-botao ct-botao--contorno" aria-expanded={false} onClick={() => setImagem(true)}>{T.viaImagem}</button>
      )}
      {podeImagem && imagem && <PainelImagem chave={chave} pedido={pedido} api={api} aoEnviar={aoAtualizar} />}

      {estado === 'aprovadoAvaliar' && (
        <button type="button" className="ct-botao ct-botao--contorno" onClick={() => navigate(prepararAvaliacao({ caminho: EDICAO.caminho, codigo: EDICAO.codigo, slug: pedido.slug, mapa }))}>{T.avaliar}</button>
      )}
      {estado === 'negado' && <a className="ct-link" href="/contato" onClick={(e) => { if (!e.defaultPrevented && e.button === 0 && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) { e.preventDefault(); navigate('/contato') } }}>{T.contato}</a>}
    </li>
  )
}

function Formulario ({ chave, casas, inicial, api, aoCriar }) {
  const hoje = dataEmNatal()
  const [slug, setSlug] = React.useState(inicial)
  const [unidade, setUnidade] = React.useState('')
  const [data, setData] = React.useState(hoje)
  const [ref, setRef] = React.useState('')
  const [nota, setNota] = React.useState('')
  const [enviando, setEnviando] = React.useState('') // '' | 'casa' | 'imagem'
  const [erro, setErro] = React.useState('')
  const casa = casas.find((c) => c.slug === slug)
  const varias = (casa?.unidades.length || 0) > 1

  async function enviar (via) {
    if (enviando) return
    if (!casa) { setErro(T.recusa.qr_invalido); return }
    if (varias && !unidade) { setErro(T.recusa.unidade_obrigatoria); return }
    setErro(''); setEnviando(via)
    const r = await api.deliveryPedir(chave, { slug, unidade: varias ? unidade : casa.unidades[0]?.id, data, ref, nota })
    setEnviando('')
    if (r.ok === true && r.id) { setRef(''); setNota(''); aoCriar(r.id, via) } else setErro(recusa(r.motivo))
  }

  return (
    <form className="ct-form ct-dlv__form" onSubmit={(e) => { e.preventDefault(); enviar('casa') }} noValidate aria-labelledby="dlv-form-titulo">
      <p id="dlv-form-titulo" className="ct-sub">{T.formTitulo}</p>
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
        <input type="date" value={data} max={hoje} onChange={(e) => setData(e.target.value)} required />
      </label>
      <small className="ct-dlv__ajuda">{T.dataAjuda}</small>
      <label className="ct-campo"><span>{T.ref}</span>
        <input type="text" value={ref} maxLength={LIMITES.refMax} onChange={(e) => setRef(e.target.value)} autoComplete="off" />
      </label>
      <small className="ct-dlv__ajuda">{T.refAjuda}</small>
      <label className="ct-campo"><span>{T.nota}</span>
        <textarea rows={2} maxLength={T.notaMax} value={nota} onChange={(e) => setNota(e.target.value)} />
      </label>
      <p className="ct-nota">{T.privacidade}</p>
      {erro && <p className="ct-aviso" role="alert">{erro}</p>}
      <p className="ct-rotulo">{T.escolha}</p>
      <div className="ct-dlv__vias">
        <div className="ct-dlv__via">
          <button type="submit" className="ct-botao" disabled={!!enviando}>{enviando === 'casa' ? T.enviando : T.viaCasa}</button>
          <small className="ct-dlv__ajuda">{T.viaCasaAjuda}</small>
        </div>
        <div className="ct-dlv__via">
          <button type="button" className="ct-botao ct-botao--contorno" onClick={() => enviar('imagem')} disabled={!!enviando}>{enviando === 'imagem' ? T.enviando : T.viaImagem}</button>
          <small className="ct-dlv__ajuda">{T.viaImagemAjuda}</small>
        </div>
      </div>
    </form>
  )
}

export function Delivery ({ caca, dados, navigate, api = apiPadrao }) {
  const comMapa = caca.estado === 'pronto' && !!caca.mapa && !!caca.chave
  const [pedidos, setPedidos] = React.useState(null)
  const [rodada, setRodada] = React.useState(0)
  const [abrirImagem, setAbrirImagem] = React.useState('')
  const casas = React.useMemo(() => casasComDelivery(dados), [dados])
  const inicial = casaDaConsulta(typeof window === 'undefined' ? '' : window.location.search, casas)

  React.useEffect(() => {
    if (!comMapa) return undefined
    let vivo = true
    api.excecaoMinhas(caca.chave).then((r) => { if (vivo) setPedidos(r.ok ? pedidosDelivery(r.pedidos) : []) })
    return () => { vivo = false }
  }, [api, comMapa, caca.chave, rodada])

  if (!comMapa) return <p className="ct-nota">{T.semMapa}</p>
  const atualizar = () => { setRodada((n) => n + 1); caca.atualizar?.() }
  const lista = pedidos || []
  return (
    <section className="ct-dlv" aria-labelledby="dlv-titulo">
      <h2 id="dlv-titulo" className="ct-sub">{T.secao}</h2>
      <ul className="ct-visita__regras">{T.comoFunciona.map((t) => <li key={t}>{t}</li>)}</ul>
      {casas.length
        ? <Formulario chave={caca.chave} casas={casas} inicial={inicial} api={api} aoCriar={(id, via) => { if (via === 'imagem') setAbrirImagem(id); atualizar() }} />
        : <p className="ct-nota">{T.semCasas}</p>}
      {lista.length > 0 && (
        <div className="ct-dlv__lista">
          <h3 className="ct-rotulo">{T.seusPedidos}</h3>
          <ul>{lista.map((p) => <Pedido key={p.id} pedido={p} mapa={caca.mapa} dados={dados} chave={caca.chave} api={api} navigate={navigate} aberto={abrirImagem === p.id} aoAtualizar={atualizar} />)}</ul>
        </div>
      )}
    </section>
  )
}
