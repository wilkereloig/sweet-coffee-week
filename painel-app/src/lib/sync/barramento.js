/*
 * Barramento de invalidação (19/10/2026). Puro: sem rede, sem DOM, sem React.
 *
 * Quem lê dado se inscreve por DOMÍNIO (`ouvir(['participantes'], recarregar)`);
 * quem muda dado — a própria sessão, depois de uma gravação confirmada; outra
 * sessão, por sinal do servidor; a reconexão, para cobrir sinal perdido —
 * ANUNCIA o domínio. O barramento junta os avisos próximos e chama cada
 * ouvinte UMA vez com tudo que o interessa.
 *
 *   · janela de 150 ms (no máximo 1 s) junta rajada num só aviso;
 *   · um aviso nunca carrega registro: só domínio, id opaco e origem;
 *   · domínio que dispara de mais (≥ 12 entregas em 10 s) é segurado por 5 s e
 *     solto uma vez ao fim — um laço de invalidação não vira tempestade de
 *     requisições. A reconciliação (reconexão, volta ao app) não conta;
 *   · `reiniciar()` (sair, trocar de conta) descarta o que estava pendente e
 *     muda a ÉPOCA: resposta de carga iniciada na época anterior perde o direito
 *     de gravar em tela (ver useGuarda).
 */
import { limparDominios } from './dominios.js'

export const JANELA_MS = 150
export const MAXIMO_MS = 1000
export const TEMPESTADE_ENTREGAS = 12
export const TEMPESTADE_JANELA_MS = 10000
export const TEMPESTADE_PAUSA_MS = 5000

const unicos = (a) => [...new Set(a)]

export function criarBarramento({
  agora = () => Date.now(),
  agendar = (f, ms) => setTimeout(f, ms),
  cancelar = (t) => clearTimeout(t),
  janela = JANELA_MS,
  maximo = MAXIMO_MS,
  aoErro = null,
} = {}) {
  const ouvintes = new Set()          // { dominios: Set | null (todos), fn }
  let pendentes = new Map()           // 'dominio|ref|origem' → { dominio, ref, origem }
  let timer = null
  let desde = 0
  let epocaAtual = 0
  const entregas = new Map()          // domínio → [instantes]
  const segurados = new Map()         // domínio → { ate, eventos: Map }
  const pausas = new Map()            // domínio → timer de soltura

  function programar() {
    const t = agora()
    if (timer === null) desde = t
    else {
      if (t - desde >= maximo) return       // já venceu o prazo: o tique em curso solta
      cancelar(timer)
    }
    timer = agendar(soltar, Math.max(0, Math.min(janela, maximo - (t - desde))))
  }

  function entregar(eventos) {
    for (const l of [...ouvintes]) {
      const meus = l.dominios ? eventos.filter((e) => l.dominios.has(e.dominio)) : eventos
      if (!meus.length) continue
      const aviso = {
        dominios: unicos(meus.map((e) => e.dominio)),
        refs: unicos(meus.map((e) => e.ref).filter(Boolean)),
        origens: unicos(meus.map((e) => e.origem)),
        origem: meus[0].origem,
      }
      try { l.fn(aviso) } catch (e) { if (aoErro) aoErro(e) }
    }
  }

  function soltar() {
    timer = null
    const eventos = [...pendentes.values()]
    pendentes = new Map()
    if (!eventos.length) return
    const t = agora()
    for (const e of eventos) {
      if (e.origem === 'reconciliacao') continue
      const lista = (entregas.get(e.dominio) || []).filter((x) => t - x < TEMPESTADE_JANELA_MS)
      lista.push(t)
      entregas.set(e.dominio, lista)
    }
    entregar(eventos)
  }

  function segurar(dominio, evento) {
    let s = segurados.get(dominio)
    if (!s) {
      s = { eventos: new Map() }
      segurados.set(dominio, s)
      pausas.set(dominio, agendar(() => {
        const fim = segurados.get(dominio)
        segurados.delete(dominio); pausas.delete(dominio)
        entregas.set(dominio, [])
        if (fim) {
          for (const e of fim.eventos.values()) pendentes.set(chave(e), e)
          programar()
        }
      }, TEMPESTADE_PAUSA_MS))
    }
    s.eventos.set(chave(evento), evento)
  }

  const chave = (e) => e.dominio + '|' + (e.ref || '') + '|' + e.origem

  function anunciar(dominios, { ref = null, origem = 'local' } = {}) {
    const lista = limparDominios(dominios)
    if (!lista.length) return
    const r = ref == null ? null : String(ref).slice(0, 64)
    const t = agora()
    for (const dominio of lista) {
      const e = { dominio, ref: r, origem }
      if (origem !== 'reconciliacao') {
        if (segurados.has(dominio)) { segurar(dominio, e); continue }
        const recentes = (entregas.get(dominio) || []).filter((x) => t - x < TEMPESTADE_JANELA_MS)
        if (recentes.length >= TEMPESTADE_ENTREGAS) { segurar(dominio, e); continue }
      }
      pendentes.set(chave(e), e)
    }
    if (pendentes.size) programar()
  }

  /** Inscreve `fn` nos domínios (ou '*'). Devolve a função que desinscreve. */
  function ouvir(dominios, fn) {
    const l = { dominios: dominios === '*' ? null : new Set(limparDominios(dominios)), fn }
    ouvintes.add(l)
    return () => { ouvintes.delete(l) }
  }

  function dominiosOuvidos() {
    const s = new Set()
    for (const l of ouvintes) {
      if (!l.dominios) return new Set(limparDominios('*'))
      for (const d of l.dominios) s.add(d)
    }
    return s
  }

  /** Relê tudo o que está sendo ouvido (reconexão, volta ao app, conferência). */
  function reconciliar() {
    const d = [...dominiosOuvidos()]
    if (d.length) anunciar(d, { origem: 'reconciliacao' })
  }

  function reiniciar() {
    epocaAtual += 1
    if (timer !== null) { cancelar(timer); timer = null }
    pendentes = new Map()
    for (const t of pausas.values()) cancelar(t)
    pausas.clear(); segurados.clear(); entregas.clear()
  }

  return {
    anunciar, ouvir, reconciliar, reiniciar, dominiosOuvidos,
    epoca: () => epocaAtual,
    ouvintes: () => ouvintes.size,
    segurados: () => [...segurados.keys()],
  }
}

export const barramento = criarBarramento({
  aoErro: (e) => { try { console.error('[sync] ouvinte falhou:', e) } catch { /* sem console */ } },
})
