/*
 * Preferência de cookies — FONTE ÚNICA (13/10/2026).
 *
 * Guarda só o necessário para lembrar a escolha, numa chave de localStorage:
 *   scw_privacidade = {"v":1,"analise":true|false,"em":<ms>,"ate":<ms>}
 *     v       versão do aviso. Subiu a versão (finalidade nova, texto que muda o
 *             que se autoriza) → a escolha antiga deixa de valer e o aviso volta.
 *     analise a única categoria opcional que existe de fato: Google Analytics.
 *     em/ate  quando a escolha foi feita e até quando vale.
 *
 * VALIDADE = 180 dias. Decisão de produto, não prazo da LGPD: depois disso o
 * aviso volta a perguntar. Mudar aqui muda a Política de Cookies junto (ela lê
 * VALIDADE_DIAS, não repete o número).
 *
 * Sem escolha válida (ausente, ilegível, versão antiga, vencida) = análise
 * BLOQUEADA. A chave antiga `scw_consent` ("granted"/"denied", sem versão nem
 * validade) não autoriza nada: é lida como "sem escolha" e apagada.
 *
 * Armazenamento indisponível (modo privado, bloqueio de site): a escolha vale
 * em memória até a aba fechar, e o aviso reaparece na próxima visita.
 *
 * Nada aqui guarda IP, identificador ou registro no servidor.
 */

export const CHAVE = 'scw_privacidade'
export const CHAVE_ANTIGA = 'scw_consent'
export const VERSAO_AVISO = 1
export const VALIDADE_DIAS = 180
const VALIDADE_MS = VALIDADE_DIAS * 24 * 60 * 60 * 1000

/* Escolha feita nesta aba quando o storage falha. */
let memoria = null
const ouvintes = new Set()

function armazenamento () {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null
  } catch {
    return null
  }
}

/**
 * Lê e valida um registro bruto. Devolve a preferência ou null.
 * Pura: recebe o texto e o "agora", para o teste não depender do relógio.
 */
export function interpretar (bruto, agora = Date.now()) {
  if (typeof bruto !== 'string' || !bruto) return null
  let r
  try { r = JSON.parse(bruto) } catch { return null }
  if (!r || typeof r !== 'object') return null
  if (r.v !== VERSAO_AVISO) return null
  if (typeof r.analise !== 'boolean') return null
  if (!Number.isFinite(r.em) || !Number.isFinite(r.ate)) return null
  if (r.ate <= agora || r.em > agora + 60_000) return null
  return { v: r.v, analise: r.analise, em: r.em, ate: r.ate }
}

/** A preferência válida agora, ou null (= ainda não escolheu). */
export function lerPreferencia (agora = Date.now()) {
  const s = armazenamento()
  if (s) {
    try {
      if (s.getItem(CHAVE_ANTIGA) !== null) s.removeItem(CHAVE_ANTIGA)
      const p = interpretar(s.getItem(CHAVE), agora)
      if (p) return p
    } catch { /* cai na memória */ }
  }
  return memoria && memoria.ate > agora ? memoria : null
}

/** Análise só com escolha válida e explícita. */
export function analisePermitida (agora = Date.now()) {
  const p = lerPreferencia(agora)
  return !!(p && p.analise === true)
}

/** Grava a escolha. Devolve a preferência gravada (em disco ou só em memória). */
export function salvarPreferencia (analise, agora = Date.now()) {
  const p = { v: VERSAO_AVISO, analise: analise === true, em: agora, ate: agora + VALIDADE_MS }
  memoria = p
  const s = armazenamento()
  if (s) {
    try { s.setItem(CHAVE, JSON.stringify(p)) } catch { /* fica em memória */ }
  }
  avisar(p)
  return p
}

/** Recebe a preferência a cada mudança — nesta aba ou em outra. */
export function aoMudar (fn) {
  ouvintes.add(fn)
  return () => ouvintes.delete(fn)
}

function avisar (p) {
  for (const fn of [...ouvintes]) {
    try { fn(p) } catch { /* um ouvinte não derruba os outros */ }
  }
}

/* Outra aba salvou ou limpou: o evento `storage` só chega nas OUTRAS abas. */
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', (e) => {
    if (e.key !== CHAVE && e.key !== null) return
    memoria = null
    avisar(lerPreferencia())
  })
}

/* ---- Abrir o diálogo de preferências de qualquer lugar ------------------
   Rodapé, folha "mais", Edições e a Política de Cookies chamam isto; quem
   escuta é o CookieConsent, montado uma vez no App. */
const EVENTO_ABRIR = 'scw:preferencias-cookies'

export function abrirPreferencias () {
  if (typeof window === 'undefined') return
  const gatilho = typeof document !== 'undefined' ? document.activeElement : null
  window.dispatchEvent(new CustomEvent(EVENTO_ABRIR, { detail: { gatilho } }))
}

export function aoPedirPreferencias (fn) {
  if (typeof window === 'undefined') return () => {}
  const h = (e) => fn(e.detail && e.detail.gatilho)
  window.addEventListener(EVENTO_ABRIR, h)
  return () => window.removeEventListener(EVENTO_ABRIR, h)
}

/* Só para teste: zera a escolha em memória. */
export function _zerarMemoria () { memoria = null }
