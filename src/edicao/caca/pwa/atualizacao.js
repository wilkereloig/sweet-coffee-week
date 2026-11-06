/*
 * Atualização automática do app da Caça aos Carimbos (06/11/2026).
 *
 * POR QUÊ. O HTML do site é servido com `max-age=0, must-revalidate` (vercel.json) e os arquivos em /assets/ têm o hash no nome, então
 * uma ABERTURA A FRIO sempre traz a versão publicada. O que ficava velho era o app que já estava ABERTO: a Caça é uma página única
 * (SPA) e o iPhone/Android congela o app em segundo plano e o devolve do jeito que estava, com o JavaScript antigo na memória —
 * ninguém voltava à rede para saber se existia versão nova. E, sem o arquivo de uma tela sob demanda (que a versão nova trocou de
 * nome), o app antigo travava. O service worker (public/caca-sw.js) não guarda cache: não era ele.
 *
 * COMO. O build grava a mesma id em `<meta name="scw-versao">` (a versão desta aba) e em `/versao.json` (a versão publicada agora;
 * vite.config.js › versaoDoSite). Ao abrir, ao voltar do segundo plano, ao voltar a rede e de tempos em tempos, o app compara as duas.
 * Diferente = há outra (nunca "maior": rollback também é outra versão). Sendo diferente:
 *   1. confere que a versão nova está INTEIRA no servidor (o HTML novo declara a mesma id e os arquivos que ele abre existem);
 *   2. espera um momento seguro (sem envio em curso nem campo preenchido: ./pendencias.js);
 *   3. recarrega a página — mapa, carimbos, grupos e preferências ficam no aparelho (localStorage), nada é apagado;
 *   4. na abertura seguinte confere se a versão esperada chegou. Não chegando, tenta mais uma vez e para (sem laço de recarga).
 * Nada daqui carrega dado pessoal, chave de mapa ou código: a consulta é um GET de arquivo público, sem cookie nem cabeçalho extra.
 */
import { idDoHtml, recursosDoHtml } from '../../../lib/versaoBuild.js'

export const URL_VERSAO = '/versao.json'
export const CAMINHO_DO_APP = '/cartoon/caca'
const ID_OK = /^[0-9a-f]{12,64}$/
export const CHAVE_TENTATIVA = 'scw_caca_atualizacao' // sessionStorage: { esperado, de, tentativa, em }
export const INTERVALO = 15 * 60 * 1000 // consulta periódica, só com o app visível
export const MINIMO_ENTRE_CONSULTAS = 30 * 1000 // volta e meia de aba não vira rajada de consultas
export const ESPERA_DO_MOMENTO_SEGURO = 8 * 1000 // de quanto em quanto tempo reavalia, com trabalho pela metade
export const MAX_TENTATIVAS = 2
export const ESQUECE_TENTATIVA_EM = 10 * 60 * 1000

const seguro = (f, padrao = null) => { try { return f() } catch { return padrao } }

/** A versão desta aba (meta do build). Sem meta (servidor de desenvolvimento): null — e nada a comparar. */
export function versaoDaPagina (doc = globalThis.document) {
  const m = doc?.querySelector?.('meta[name="scw-versao"]')
  const id = m?.getAttribute('content')
  return id && ID_OK.test(id) ? { id, ambiente: m.getAttribute('data-ambiente') || 'local' } : null
}

/** Aceita só o arquivo de versão do site; HTML de erro ou JSON alheio (inclusive o do painel) é recusado. */
export function validarVersao (d) {
  if (!d || typeof d !== 'object' || d.app !== 'site-scw' || typeof d.id !== 'string' || !ID_OK.test(d.id)) return null
  return { id: d.id, ambiente: typeof d.ambiente === 'string' ? d.ambiente : 'local' }
}

/** Da rede, sem cache (o `?t=` e o `no-store` passam por cima do navegador e do edge). Lança 'rede' | 'indisponivel' | 'servidor' | 'invalida'. */
export async function lerVersaoPublicada (f = globalThis.fetch, agora = Date.now) {
  let r
  try { r = await f(`${URL_VERSAO}?t=${agora()}`, { cache: 'no-store', credentials: 'omit', headers: { Accept: 'application/json' } }) } catch { throw new Error('rede') }
  if (!r.ok) throw new Error(r.status === 404 ? 'indisponivel' : 'servidor')
  if (!/json/i.test(r.headers?.get?.('content-type') || '')) throw new Error('invalida')
  let d
  try { d = await r.json() } catch { throw new Error('invalida') }
  const v = validarVersao(d)
  if (!v) throw new Error('invalida')
  return v
}

/**
 * A versão nova está inteira no servidor? O HTML da Caça (sem cache) tem de declarar a MESMA id e os arquivos que ele abre têm de
 * existir. Deploy no meio, edge ainda com o HTML antigo ou arquivo faltando = não está pronta (tenta de novo mais tarde).
 */
export async function versaoEstaInteira (v, f = globalThis.fetch) {
  try {
    const r = await f(`${CAMINHO_DO_APP}?v=${v.id}`, { cache: 'no-store', credentials: 'omit' })
    if (!r.ok) return false
    const html = await r.text()
    if (idDoHtml(html) !== v.id) return false
    const recursos = recursosDoHtml(html)
    if (!recursos.length) return false
    const respostas = await Promise.all(recursos.map((u) => f(u, { credentials: 'omit' }).then((x) => x.ok).catch(() => false)))
    return respostas.every(Boolean)
  } catch { return false }
}

/** Na abertura: a recarga anterior trouxe a versão esperada? Limpa o registro quando trouxe. */
export function resultadoDaAtualizacao (atual, sessao, agora = Date.now) {
  const t = seguro(() => JSON.parse(sessao.getItem(CHAVE_TENTATIVA) || 'null'))
  if (!t || !t.esperado) return null
  if (agora() - (t.em || 0) > ESQUECE_TENTATIVA_EM) { seguro(() => sessao.removeItem(CHAVE_TENTATIVA)); return null }
  if (t.esperado === atual) { seguro(() => sessao.removeItem(CHAVE_TENTATIVA)); return { ok: true, id: atual } }
  return { ok: false, esperado: t.esperado, tentativa: t.tentativa, podeTentar: t.tentativa < MAX_TENTATIVAS }
}

/**
 * O atualizador. Tudo que toca o mundo vem de fora (`ler`, `preparar`, `pendencias`, `online`, `recarregar`, storage), então o teste roda a
 * transição inteira com dependências falsas. Estado:
 *   { fase, atual, disponivel, verificadoEm, aguardando }
 * fases: 'ok' (tudo certo, ou nada a dizer) · 'disponivel' (achou, ainda não agiu) · 'aguardando' (versão nova pronta, espera a pessoa terminar)
 *        · 'incompleta' (versão nova ainda não está inteira no servidor) · 'offline' · 'recarregando' · 'falhou' (tentou e a nova não chegou)
 */
export function criarAtualizador ({
  atual, ambiente = null, ler = () => lerVersaoPublicada(), preparar = (v) => versaoEstaInteira(v),
  pendencias = () => [], online = () => true, recarregar = () => {}, sessao = null, agora = Date.now,
} = {}) {
  let estado = { fase: 'ok', atual, disponivel: null, verificadoEm: null }
  const ouvintes = new Set()
  let emCurso = null
  const definir = (patch) => { estado = { ...estado, ...patch }; ouvintes.forEach((f) => f(estado)) }

  // Registro da recarga anterior: a nova versão chegou? (e, se não chegou e já esgotou, não insiste.)
  const anterior = atual && sessao ? resultadoDaAtualizacao(atual, sessao, agora) : null
  if (anterior && !anterior.ok && !anterior.podeTentar) estado = { ...estado, fase: 'falhou', disponivel: { id: anterior.esperado } }

  async function aplicar () {
    const v = estado.disponivel
    if (!v || !atual) return estado
    if (!online()) { definir({ fase: 'offline' }); return estado }
    if (pendencias().length) { definir({ fase: 'aguardando' }); return estado }
    if (!(await preparar(v))) { definir({ fase: 'incompleta' }); return estado }
    if (!online()) { definir({ fase: 'offline' }); return estado }
    if (pendencias().length) { definir({ fase: 'aguardando' }); return estado } // a pessoa começou a escrever enquanto conferíamos
    const antes = seguro(() => JSON.parse(sessao?.getItem(CHAVE_TENTATIVA) || 'null'))
    const vigente = antes && antes.esperado === v.id && agora() - (antes.em || 0) <= ESQUECE_TENTATIVA_EM
    const tentativa = vigente ? antes.tentativa + 1 : 1
    if (tentativa > MAX_TENTATIVAS) { definir({ fase: 'falhou' }); return estado }
    seguro(() => sessao?.setItem(CHAVE_TENTATIVA, JSON.stringify({ esperado: v.id, de: atual, tentativa, em: agora() })))
    definir({ fase: 'recarregando' })
    recarregar(tentativa > 1 ? v.id : null) // 2ª tentativa: endereço com a id da versão, para furar qualquer cache do aparelho
    return estado
  }

  function receber (v) {
    if (!v || !atual) return
    if (ambiente && v.ambiente !== ambiente) return // nunca mistura produção e preview
    if (v.id === atual) { definir({ fase: 'ok', disponivel: null }); return }
    if (estado.fase === 'falhou' && estado.disponivel?.id === v.id) return
    definir({ fase: 'disponivel', disponivel: v })
  }

  /** Consulta a versão publicada e, achando outra, tenta aplicar. `forcar` ignora o intervalo mínimo. */
  async function verificar ({ forcar = false } = {}) {
    if (!atual) return estado // sem meta (desenvolvimento): nada a comparar
    if (emCurso) return emCurso
    if (!online()) { definir({ fase: 'offline' }); return estado }
    if (!forcar && estado.verificadoEm && agora() - estado.verificadoEm < MINIMO_ENTRE_CONSULTAS) return estado.disponivel ? aplicar() : estado
    emCurso = (async () => {
      try {
        const v = await ler()
        definir({ verificadoEm: agora() })
        receber(v)
        if (estado.disponivel) await aplicar()
      } catch (e) {
        // Rede caída: diz "sem conexão" (nunca promete versão nova). Erro do servidor: segue como estava e tenta no próximo gatilho.
        definir(e?.message === 'rede' ? { verificadoEm: agora(), fase: 'offline' } : { verificadoEm: agora() })
      } finally { emCurso = null }
      return estado
    })()
    return emCurso
  }

  return {
    get estado () { return estado },
    ouvir (f) { ouvintes.add(f); return () => ouvintes.delete(f) },
    verificar,
    /** Reavalia o momento seguro (chamado de tempos em tempos enquanto `aguardando`/`incompleta`). */
    tentarAplicar: aplicar,
    /** Um recurso sob demanda não veio: provavelmente é versão nova publicada por cima desta aba. */
    falhaDeRecurso () { return verificar({ forcar: true }) },
    /** Voltou a rede: confere de novo (e deixa de dizer "sem conexão"). */
    voltouARede () { if (estado.fase === 'offline') definir({ fase: estado.disponivel ? 'disponivel' : 'ok' }); return verificar({ forcar: true }) },
  }
}

/** Recarrega a página; na 2ª tentativa a id entra no endereço (`_v`), que o app tira de volta na abertura (`limparMarcaDeRecarga`). */
export function recarregarPagina (id = null, janela = globalThis.window) {
  if (!janela?.location) return
  if (!id) { janela.location.reload(); return }
  const u = new URL(janela.location.href)
  u.searchParams.set('_v', id)
  janela.location.replace(u.toString())
}

/** Tira o `_v` do endereço (sem recarregar) para não ficar na barra, no compartilhamento nem no "voltar". */
export function limparMarcaDeRecarga (janela = globalThis.window) {
  try {
    const u = new URL(janela.location.href)
    if (!u.searchParams.has('_v')) return
    u.searchParams.delete('_v')
    janela.history.replaceState(janela.history.state, '', u.pathname + u.search + u.hash)
  } catch { /* sem history: o `_v` fica inofensivo na barra */ }
}
