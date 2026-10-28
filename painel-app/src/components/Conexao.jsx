import React from 'react'
import {
  versaoDaPagina, criarMonitor, atualizarAgora, resultadoDaAtualizacao, INTERVALO,
} from '../lib/versao'
import { pendencias, ouvirPendencias, liberarSaida } from '../lib/pendencias'
import { confirmar } from './Confirmar'

/*
 * Faixa de estado do app: sem conexão, e atualização disponível (18/10/2026).
 *
 * Offline: o painel depende do servidor para quase tudo, então não finge
 * funcionar — diz que está sem conexão. O que já estava na tela continua.
 *
 * Atualização: UM monitor (lib/versao.js) compara a versão desta aba com a
 * publicada — ao abrir, ao voltar ao app, ao voltar a internet, a cada 15 min
 * com a aba na frente, quando um pedaço do painel não carrega e quando o push
 * "Painel SCW atualizado" é tocado. Nunca recarrega sozinho: a pessoa toca em
 * "Atualizar agora" (ou "Depois", que só recolhe o aviso para um ponto no
 * perfil). Antes de recarregar, o fluxo confere conexão, trabalho pela metade
 * (lib/pendencias.js), se a versão nova está inteira e o service worker.
 */
const armazenar = (nome) => ({
  getItem: (k) => { try { return window[nome].getItem(k) } catch { return null } },
  setItem: (k, v) => { try { window[nome].setItem(k, v) } catch { /* aba privada */ } },
  removeItem: (k) => { try { window[nome].removeItem(k) } catch { /* aba privada */ } },
})

let unico = null
export function monitorDoPainel() {
  if (unico || typeof document === 'undefined') return unico
  const pag = versaoDaPagina(document)
  unico = criarMonitor({
    atual: pag && pag.id, ambiente: pag && pag.ambiente,
    local: armazenar('localStorage'), sessao: armazenar('sessionStorage'),
    canal: typeof BroadcastChannel === 'function' ? new BroadcastChannel('scw-painel-versao') : null,
    online: () => navigator.onLine,
  })
  return unico
}

export function useVersao() {
  const m = monitorDoPainel()
  const [estado, setEstado] = React.useState(() => (m ? m.estado : null))
  React.useEffect(() => (m ? m.ouvir(setEstado) : undefined), [m])
  return estado
}

/* Recarga única: na 2ª tentativa vai por endereço novo (foge de cache teimoso). */
function recarregar(forcarId) {
  liberarSaida() // a confirmação já foi feita aqui; o navegador não pergunta de novo
  if (forcarId) {
    const u = new URL(location.href)
    u.searchParams.set('atualizar', forcarId)
    location.replace(u.pathname + u.search + u.hash)
  } else location.reload()
}

const sw = () => ('serviceWorker' in navigator ? navigator.serviceWorker : null)

/* Ligado uma vez por aba (StrictMode monta duas vezes). */
let gatilhosLigados = false
function ligarGatilhos(m) {
  if (gatilhosLigados || !m || !m.estado.atual) return
  gatilhosLigados = true
  const olhar = (forcar = false) => { if (document.visibilityState === 'visible') m.verificar({ forcar }) }
  document.addEventListener('visibilitychange', () => olhar())
  window.addEventListener('pageshow', (e) => { if (e.persisted) olhar() })
  window.addEventListener('online', () => olhar(true))
  window.setInterval(() => olhar(), INTERVALO)
  // Chunk de uma publicação anterior que não existe mais: é versão nova.
  window.addEventListener('vite:preloadError', () => m.falhaDeRecurso())
  const s = sw()
  if (s) {
    s.addEventListener('message', (ev) => { if (ev.data && ev.data.tipo === 'verificar-versao') m.verificar({ forcar: true }) })
    // Worker novo esperando e esta aba acabou de abrir (nada pela metade): pode assumir.
    // Também pergunta ao navegador se há worker novo (ele não pergunta sozinho a
    // cada abertura); o que terminar de instalar no 1º minuto da aba assume do
    // mesmo jeito — a troca não apaga nada que outra aba ainda use.
    const assumir = (w) => { if (w && performance.now() < 60000 && !pendencias().length) w.postMessage({ tipo: 'ativar' }) }
    s.getRegistration('/painel/').then((r) => {
      if (!r) return
      if (r.waiting) assumir(r.waiting)
      r.addEventListener('updatefound', () => {
        m.verificar({ forcar: true })
        const w = r.installing
        if (w) w.addEventListener('statechange', () => { if (w.state === 'installed') assumir(w) })
      })
      r.update().catch(() => {})
    }).catch(() => {})
  }
  // Veio do push "Painel SCW atualizado" (?verificar=1) ou da 2ª tentativa (?atualizar=…): limpa o endereço.
  const u = new URL(location.href)
  const doPush = u.searchParams.has('verificar')
  if (doPush || u.searchParams.has('atualizar')) {
    u.searchParams.delete('verificar'); u.searchParams.delete('atualizar')
    history.replaceState(history.state, '', u.pathname + u.search + u.hash)
  }
  window.setTimeout(() => m.verificar({ forcar: doPush }), doPush ? 300 : 3000)
}

const TEXTO_FASE = {
  offline: 'Sem conexão agora. Atualize quando a internet voltar — nada mudou.',
  indisponivel: 'Não achei a versão nova no servidor (pode ter sido desfeita). Nada mudou.',
  incompleta: 'A versão nova ainda não chegou inteira. Nada mudou; tente de novo em instantes.',
  esgotou: 'O aparelho continua abrindo a versão anterior. Feche o painel por completo e abra de novo.',
}

/* Folha ou diálogo aberto? O aviso flutuante não cobre a janela: recolhe e volta quando ela fechar. */
function useJanelaAberta() {
  const ver = () => typeof document !== 'undefined' && !!document.querySelector('.og-detalhe, dialog[open]')
  const [aberta, setAberta] = React.useState(ver)
  React.useEffect(() => {
    const ob = new MutationObserver(() => setAberta(ver()))
    ob.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open', 'class'] })
    return () => ob.disconnect()
  }, [])
  return aberta
}

/** A caixa de atualização: no aviso flutuante e embutida (Meu perfil / Sua conta). */
export function CaixaAtualizacao({ embutido = false, onAdiar = null }) {
  const v = useVersao()
  const m = monitorDoPainel()
  const [fluxo, setFluxo] = React.useState(null) // { fase, itens?, texto? }
  const [, redesenhar] = React.useReducer((x) => x + 1, 0)
  React.useEffect(() => ouvirPendencias(redesenhar), [])

  async function atualizar({ ignorarPendencias = false } = {}) {
    setFluxo({ fase: 'preparando' })
    const r = await atualizarAgora({
      monitor: m, pendencias, online: () => navigator.onLine, sw: sw(),
      sessao: armazenar('sessionStorage'), recarregar, ignorarPendencias,
    })
    setFluxo(r.fase === 'ja_atual' ? null : r)
  }
  async function salvarEAtualizar(itens) {
    setFluxo({ fase: 'salvando' })
    for (const p of itens) {
      let ok = false
      try { ok = !!(await p.salvar()) } catch { ok = false }
      if (!ok) { setFluxo({ fase: 'pendente', itens: pendencias(), texto: 'Não consegui salvar “' + p.rotulo + '”. Nada foi atualizado.' }); return }
    }
    await new Promise((x) => setTimeout(x, 400)) // a tela tira a pendência depois de redesenhar
    atualizar()
  }
  async function descartarEAtualizar(itens) {
    const guarda = itens.filter((p) => p.guardaRascunho).length
    const ok = await confirmar('Atualizar sem salvar? ' + (guarda
      ? 'O rascunho guardado neste aparelho volta quando você reabrir; o resto do que não foi salvo se perde.'
      : 'O que não foi salvo se perde.'), { acao: 'Atualizar sem salvar', perigo: true })
    if (ok) atualizar({ ignorarPendencias: true })
  }

  if (!v || !v.disponivel) return null
  const fase = fluxo && fluxo.fase
  const itens = (fluxo && fluxo.itens) || []
  const envios = itens.filter((p) => p.tipo === 'envio')
  const salvaveis = itens.length > 0 && !envios.length && itens.every((p) => p.salvar)
  return (
    <div className={embutido ? 'ui-atualizacao' : 'ui-conexao ui-conexao--versao'} role="region" aria-label="Atualização do painel" data-tom="versao">
      {fase === 'pendente' ? (
        <div className="ui-conexao__corpo" role="alert">
          <b>Antes de atualizar</b>
          {fluxo.texto && <span>{fluxo.texto}</span>}
          <span>{envios.length ? 'Espere o envio terminar — atualizar agora interromperia:' : 'Há coisas não salvas nesta tela:'}</span>
          <ul className="ui-conexao__lista">
            {itens.map((p, i) => <li key={i}>{p.rotulo}{p.guardaRascunho ? ' (rascunho guardado neste aparelho)' : ''}</li>)}
          </ul>
        </div>
      ) : (
        <div className="ui-conexao__corpo">
          <b>{v.falhaRecurso ? 'Esta parte do painel foi atualizada' : 'Atualização disponível'}</b>
          <span>{v.falhaRecurso ? 'Uma nova versão do Painel SCW está pronta. Atualize para continuar.' : 'Uma nova versão do Painel SCW está pronta.'}</span>
          {v.disponivel.novidades && <span className="ui-conexao__novidade">{v.disponivel.novidades}</span>}
          {fase && TEXTO_FASE[fase] && <span role="alert">{TEXTO_FASE[fase]}</span>}
        </div>
      )}
      <span className="ui-conexao__acoes">
        {fase === 'pendente' ? (
          <>
            <button type="button" className="ui-conexao__btn" onClick={() => setFluxo(null)}>{envios.length === itens.length ? 'Voltar' : 'Voltar para salvar'}</button>
            {salvaveis && <button type="button" className="ui-conexao__btn ui-conexao__btn--vazado" onClick={() => salvarEAtualizar(itens)}>Salvar e atualizar</button>}
            {!envios.length && <button type="button" className="ui-conexao__btn ui-conexao__btn--vazado" onClick={() => descartarEAtualizar(itens)}>Atualizar sem salvar</button>}
          </>
        ) : (
          <>
            <button type="button" className="ui-conexao__btn" disabled={fase === 'preparando' || fase === 'salvando' || fase === 'recarregando'} onClick={() => atualizar()}>
              {fase === 'preparando' ? 'Preparando…' : fase === 'salvando' ? 'Salvando…' : fase === 'recarregando' ? 'Abrindo…' : 'Atualizar agora'}
            </button>
            {onAdiar && <button type="button" className="ui-conexao__btn ui-conexao__btn--vazado" disabled={fase === 'preparando' || fase === 'recarregando'} onClick={() => { setFluxo(null); onAdiar() }}>Depois</button>}
          </>
        )}
      </span>
    </div>
  )
}

export function Conexao() {
  const [online, setOnline] = React.useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  const v = useVersao()
  const m = monitorDoPainel()
  const janela = useJanelaAberta()
  const [resultado, setResultado] = React.useState(() => (m && m.estado.atual ? resultadoDaAtualizacao(m.estado.atual, armazenar('sessionStorage')) : null))

  React.useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    ligarGatilhos(m)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [m])
  React.useEffect(() => {
    if (!resultado || !resultado.ok) return undefined
    const t = setTimeout(() => setResultado(null), 7000)
    return () => clearTimeout(t)
  }, [resultado])

  if (!online) {
    return (
      <div className="ui-conexao" role="status" data-tom="offline">
        <span>Sem conexão. O que está na tela continua aqui, mas nada é enviado nem atualizado até a internet voltar.</span>
      </div>
    )
  }
  if (janela) return null // nada flutua por cima de folha ou diálogo; o ponto no perfil continua

  // Depois de recarregar: entrou a versão esperada?
  if (resultado && !v?.disponivel) {
    return (
      <div className="ui-conexao" role="status" data-tom="versao">
        {resultado.ok
          ? <span>Painel atualizado.</span>
          : <span>{resultado.podeTentar ? 'A atualização não entrou: o aparelho abriu a versão anterior.' : TEXTO_FASE.esgotou}</span>}
        <span className="ui-conexao__acoes">
          {!resultado.ok && resultado.podeTentar && <button type="button" className="ui-conexao__btn" onClick={() => { setResultado(null); m.retomar() }}>Tentar de novo</button>}
          <button type="button" className="ui-conexao__btn ui-conexao__btn--vazado" onClick={() => setResultado(null)}>Fechar</button>
        </span>
      </div>
    )
  }
  if (!v || !v.disponivel || (v.adiada && !v.falhaRecurso)) return null
  return <CaixaAtualizacao onAdiar={() => m.adiar()} />
}

/** O ponto no botão do perfil/conta quando a pessoa tocou em "Depois". */
export function PontoVersao() {
  const v = useVersao()
  if (!v || !v.disponivel) return null
  return <span className="ui-ponto-versao" aria-label="Atualização disponível" role="img" />
}

/** "Verificar atualização" (Meu perfil / Conta) — diferente do "Atualizar" do topo, que só relê os dados. */
export function VerificarAtualizacao() {
  const v = useVersao()
  const m = monitorDoPainel()
  const [pediu, setPediu] = React.useState(false)
  if (!m || !v || !v.atual) return <p className="ui-nota">A verificação de versão só existe no painel publicado.</p>
  const texto = v.verificando ? 'Verificando…'
    : v.disponivel ? null
    : !pediu ? null
    : v.erro === 'offline' ? 'Sem conexão: não deu para verificar agora.'
    : v.erro ? 'Não consegui verificar agora. Tente de novo em instantes.'
    : 'Você já está na versão mais recente.'
  return (
    <div className="ui-verificar-versao">
      <p className="ui-nota">Versão deste aparelho: <code>{v.atual.slice(0, 8)}</code></p>
      {v.disponivel
        ? <CaixaAtualizacao embutido />
        : (
          <div className="ui-linha-acoes">
            <button type="button" className="og-btn og-btn--vazado og-btn--mini" disabled={v.verificando} onClick={() => { setPediu(true); m.verificar({ forcar: true }) }}>Verificar atualização</button>
          </div>
        )}
      {texto && <p className="ui-nota" role="status">{texto}</p>}
    </div>
  )
}
