/*
 * Preferência de cookies — FONTE ÚNICA (13/10/2026, revisto no mesmo dia).
 *
 * MODELO: análise LIGADA POR PADRÃO, com recusa a um clique (pedido do Wilker:
 * "coletar todos os dados possíveis", aviso simples). A base declarada para o
 * Google Analytics é o legítimo interesse de medir a audiência do site — não o
 * consentimento. Por isso:
 *   - sem escolha salva, a análise roda e o aviso aparece UMA vez, só para
 *     informar ("Ok, entendi") e oferecer "Recusar";
 *   - "Recusar" (no aviso ou nas preferências) desliga na hora e fica salvo;
 *   - navegador com Global Privacy Control ligado conta como recusa até a
 *     pessoa escolher outra coisa;
 *   - a escolha salva vale VALIDADE_DIAS; vencida, o aviso informa de novo.
 * ⚠️ O legítimo interesse pede uma avaliação escrita do caso (pendência em
 * src/pages/CLAUDE.md §7.9). Mudou a finalidade? Sobe VERSAO_AVISO.
 *
 * Registro em localStorage:
 *   scw_privacidade = {"v":1,"analise":true|false,"em":<ms>,"ate":<ms>}
 * Inválido ou de versão antiga = sem escolha. A chave antiga `scw_consent`
 * é apagada. Storage indisponível: a escolha vale em memória até a aba fechar.
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

/** Navegador pediu para não rastrear (Global Privacy Control). */
export function pediuNaoRastrear () {
  try { return typeof navigator !== 'undefined' && navigator.globalPrivacyControl === true } catch { return false }
}

/** Análise: a escolha salva manda; sem escolha, ligada — salvo GPC. */
export function analisePermitida (agora = Date.now()) {
  const p = lerPreferencia(agora)
  if (p) return p.analise === true
  return !pediuNaoRastrear()
}

/** O aviso aparece enquanto não houver escolha salva e válida. */
export function precisaAviso (agora = Date.now()) {
  return !lerPreferencia(agora)
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
