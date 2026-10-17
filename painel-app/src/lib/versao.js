/*
 * Versão do painel e atualização segura (18/10/2026; antes, 02/10/2026,
 * comparava só o arquivo JS de entrada do HTML e recarregava sozinho ao voltar
 * ao app).
 *
 * A identidade é do BUILD inteiro (vite.config.js › versaoDoPainel): HTML,
 * todos os chunks e CSS do painel, sw.js e manifesto. Ela sai em dois lugares
 * do MESMO deploy:
 *   · <meta name="scw-versao"> — a versão desta aba;
 *   · /painel/versao.json      — a versão publicada agora.
 * Diferente = há outra (nunca "maior": rollback também é outra versão).
 * Mesma = nada a fazer (primeira instalação nunca vira "atualização").
 *
 * Nada aqui recarrega sozinho. Quem decide é a pessoa ("Atualizar agora"), e
 * antes o painel confere conexão, trabalho pela metade (lib/pendencias.js),
 * se a versão nova está inteira no servidor e o service worker em espera.
 */
export const URL_VERSAO = '/painel/versao.json'
const ID_OK = /^[0-9a-f]{12,64}$/
export const CHAVE_TENTATIVA = 'scw_atualizacao' // sessionStorage: { esperado, de, tentativa, em }
const CHAVE_VISTA = 'scw_versao_vista' // localStorage: { id, em } — divide a consulta entre as abas
const CHAVE_ADIADA = 'scw_versao_adiada' // sessionStorage: id adiado ("Depois")
export const INTERVALO = 15 * 60 * 1000
export const MINIMO_ENTRE_CONSULTAS = 60 * 1000
export const MAX_TENTATIVAS = 2

const seguro = (f, padrao = null) => { try { return f() } catch { return padrao } }

/** A versão desta aba (meta do build). Sem meta (servidor de desenvolvimento): null. */
export function versaoDaPagina(doc) {
  const m = doc && doc.querySelector && doc.querySelector('meta[name="scw-versao"]')
  const id = m && m.getAttribute('content')
  return id && ID_OK.test(id) ? { id, ambiente: m.getAttribute('data-ambiente') || 'local' } : null
}

/** Aceita só o arquivo de versão do painel; qualquer outra coisa (HTML de erro, JSON alheio) é recusada. */
export function validarVersao(d) {
  if (!d || typeof d !== 'object' || d.app !== 'painel-scw' || typeof d.id !== 'string' || !ID_OK.test(d.id)) return null
  return {
    id: d.id,
    ambiente: typeof d.ambiente === 'string' ? d.ambiente : 'local',
    publicado_em: typeof d.publicado_em === 'string' ? d.publicado_em : null,
    novidades: typeof d.novidades === 'string' && d.novidades.trim() ? d.novidades.trim().slice(0, 160) : null,
  }
}

/** Da rede, sem cache (o `?t=` e o `no-store` passam por cima do navegador e do SW). */
export async function lerVersaoPublicada(f = fetch, agora = Date.now) {
  let r
  try { r = await f(URL_VERSAO + '?t=' + agora(), { cache: 'no-store', credentials: 'same-origin', headers: { Accept: 'application/json' } }) }
  catch { throw new Error('rede') }
  if (!r.ok) throw new Error(r.status === 404 ? 'indisponivel' : 'servidor')
  if (!/json/i.test((r.headers && r.headers.get && r.headers.get('content-type')) || '')) throw new Error('invalida')
  let d
  try { d = await r.json() } catch { throw new Error('invalida') }
  const v = validarVersao(d)
  if (!v) throw new Error('invalida')
  return v
}

/*
 * Monitor: uma consulta por vez, no máximo uma por minuto entre TODAS as abas
 * (a última vista fica no localStorage e as outras abas reaproveitam), e o
 * resultado vai às outras abas pelo BroadcastChannel. Estado:
 *   { atual, disponivel, adiada, verificando, erro, ultima, falhaRecurso }
 */
export function criarMonitor({ atual, ambiente = null, ler = () => lerVersaoPublicada(), agora = Date.now,
  local = null, sessao = null, canal = null, online = () => true } = {}) {
  let estado = { atual, disponivel: null, adiada: false, verificando: false, erro: null, ultima: null, falhaRecurso: false }
  const ouvintes = new Set()
  let emCurso = null
  const definir = (patch) => { estado = { ...estado, ...patch }; ouvintes.forEach((f) => f(estado)) }

  function receber(v, { espalhar = false } = {}) {
    if (!v || !atual) return
    if (ambiente && v.ambiente !== ambiente) { definir({ erro: 'ambiente' }); return } // nunca mistura produção e preview
    if (v.id === atual) { definir({ disponivel: null, erro: null, adiada: false }); return }
    const adiada = seguro(() => sessao && sessao.getItem(CHAVE_ADIADA) === v.id, false)
    if (!estado.disponivel || estado.disponivel.id !== v.id) definir({ disponivel: v, adiada, erro: null })
    if (espalhar && canal) seguro(() => canal.postMessage({ tipo: 'versao', v }))
  }
  if (canal) canal.onmessage = (e) => { const v = e && e.data && e.data.tipo === 'versao' ? validarVersao({ app: 'painel-scw', ...e.data.v }) : null; if (v) receber(v) }

  async function verificar({ forcar = false } = {}) {
    if (!atual) return estado
    if (!online()) { definir({ erro: 'offline' }); return estado }
    if (emCurso) return emCurso
    if (!forcar) {
      const vista = seguro(() => JSON.parse(local.getItem(CHAVE_VISTA) || 'null'))
      if (vista && agora() - vista.em < MINIMO_ENTRE_CONSULTAS && vista.v) { receber(validarVersao({ app: 'painel-scw', ...vista.v })); return estado }
    }
    definir({ verificando: true })
    emCurso = (async () => {
      try {
        const v = await ler()
        seguro(() => local && local.setItem(CHAVE_VISTA, JSON.stringify({ em: agora(), v })))
        definir({ verificando: false, ultima: agora() })
        receber(v, { espalhar: true })
      } catch (e) {
        definir({ verificando: false, ultima: agora(), erro: (e && e.message) || 'servidor' })
      } finally { emCurso = null }
      return estado
    })()
    return emCurso
  }

  return {
    get estado() { return estado },
    ouvir(f) { ouvintes.add(f); return () => ouvintes.delete(f) },
    verificar,
    receber,
    adiar() { if (estado.disponivel) { seguro(() => sessao && sessao.setItem(CHAVE_ADIADA, estado.disponivel.id)); definir({ adiada: true }) } },
    retomar() { definir({ adiada: false }) },
    // Um pedaço do painel (chunk) não veio: é versão nova publicada por cima desta aba.
    falhaDeRecurso() { definir({ falhaRecurso: true }); verificar({ forcar: true }) },
  }
}

/* ── Atualizar agora ──────────────────────────────────────────────────────── */

const ENTRADAS = /<(?:script|link)\b[^>]*\b(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/g
/** Os arquivos que o HTML novo carrega na abertura (entrada, CSS, pré-carregados). */
export function recursosDoHtml(html) {
  const s = new Set()
  for (const m of String(html || '').matchAll(ENTRADAS)) s.add(m[1])
  return [...s]
}
export const idDoHtml = (html) => ((/<meta name="scw-versao" content="([0-9a-f]{12,64})"/.exec(String(html || '')) || [])[1] || null)

const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms))
function comPrazo(p, ms, erro) { return Promise.race([p, esperar(ms).then(() => { throw new Error(erro) })]) }

/** Espera o worker novo terminar de instalar e o ativa (se houver). Sem worker novo, segue. */
export async function ativarWorkerNovo(sw, { prazo = 15000 } = {}) {
  if (!sw) return 'sem_sw'
  const reg = await sw.getRegistration('/painel/').catch(() => null)
  if (!reg) return 'sem_sw'
  await reg.update().catch(() => {}) // falha aqui não impede: a atualização do app não depende do worker
  const instalando = reg.installing
  if (instalando) {
    await comPrazo(new Promise((ok) => {
      const ver = () => { if (instalando.state === 'installed' || instalando.state === 'activated' || instalando.state === 'redundant') ok() }
      instalando.addEventListener('statechange', ver); ver()
    }), prazo, 'incompleta')
  }
  if (!reg.waiting) return 'sem_worker_novo'
  const trocou = new Promise((ok) => sw.addEventListener('controllerchange', ok, { once: true }))
  reg.waiting.postMessage({ tipo: 'ativar' })
  await comPrazo(trocou, prazo, 'incompleta')
  return 'ativado'
}

/**
 * O fluxo do botão. Devolve { fase } e só recarrega quando tudo deu certo:
 *   offline · pendente (com os itens) · indisponivel · incompleta · ja_atual · recarregando
 * `ignorarPendencias`: a pessoa escolheu explicitamente atualizar sem salvar.
 */
export async function atualizarAgora({ monitor, pendencias = () => [], online = () => true, f = fetch,
  sw = null, sessao = null, recarregar, agora = Date.now, ignorarPendencias = false }) {
  if (!online()) return { fase: 'offline' }
  const pend = pendencias()
  if (pend.length && !ignorarPendencias) return { fase: 'pendente', itens: pend }
  if (pend.some((p) => p.tipo === 'envio')) return { fase: 'pendente', itens: pend } // envio nunca é interrompido
  let v
  try { v = await lerVersaoPublicada(f, agora) } catch (e) { return { fase: e.message === 'rede' ? 'offline' : 'indisponivel' } }
  if (v.id === monitor.estado.atual) { monitor.receber(v); return { fase: 'ja_atual' } }
  // Prepara: o HTML novo e os arquivos que ele abre precisam estar no servidor.
  try {
    const r = await f('/painel/?v=' + v.id, { cache: 'no-store', credentials: 'same-origin' })
    if (!r.ok) return { fase: 'incompleta' }
    const html = await r.text()
    if (idDoHtml(html) !== v.id) return { fase: 'incompleta' } // HTML e versão de publicações diferentes (deploy no meio)
    const recursos = recursosDoHtml(html)
    if (!recursos.length) return { fase: 'incompleta' }
    const respostas = await Promise.all(recursos.map((u) => f(u, { credentials: 'same-origin' }).then((x) => x.ok).catch(() => false)))
    if (respostas.some((ok) => !ok)) return { fase: 'incompleta' }
  } catch { return { fase: 'incompleta' } }
  try { await ativarWorkerNovo(sw) } catch { return { fase: 'incompleta' } }
  const antes = seguro(() => JSON.parse(sessao.getItem(CHAVE_TENTATIVA) || 'null'))
  const tentativa = antes && antes.esperado === v.id ? antes.tentativa + 1 : 1
  if (tentativa > MAX_TENTATIVAS) return { fase: 'esgotou' }
  seguro(() => sessao.setItem(CHAVE_TENTATIVA, JSON.stringify({ esperado: v.id, de: monitor.estado.atual, tentativa, em: agora() })))
  recarregar(tentativa > 1 ? v.id : null)
  return { fase: 'recarregando' }
}

/** Na abertura: a recarga anterior trouxe a versão esperada? (e limpa o registro se trouxe) */
export function resultadoDaAtualizacao(atual, sessao, agora = Date.now) {
  const t = seguro(() => JSON.parse(sessao.getItem(CHAVE_TENTATIVA) || 'null'))
  if (!t || !t.esperado) return null
  if (agora() - (t.em || 0) > 10 * 60 * 1000) { seguro(() => sessao.removeItem(CHAVE_TENTATIVA)); return null } // velho: esquece
  if (t.esperado === atual) { seguro(() => sessao.removeItem(CHAVE_TENTATIVA)); return { ok: true, id: atual } }
  return { ok: false, esperado: t.esperado, tentativa: t.tentativa, podeTentar: t.tentativa < MAX_TENTATIVAS }
}
