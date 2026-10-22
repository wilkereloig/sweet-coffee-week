/*
 * Painel como app: o convite de instalação do navegador e o "agora não" do
 * convite. Lógica pura e testável (`estadoInstalacao`); o resto é a casca
 * mínima em volta das APIs do navegador.
 *
 * `beforeinstallprompt` (Chrome, Edge, Android) dispara uma vez, cedo, e só
 * pode virar `prompt()` a partir de um clique: por isso o ouvinte é de módulo,
 * importado no main.jsx antes do render. iPhone e iPad não têm essa API: lá a
 * instalação é pelo Safari (Compartilhar → Adicionar à Tela de Início).
 */
import { ehIOS, instalado } from './push.js'

let adiado = null
const ouvintes = new Set()
const avisar = () => ouvintes.forEach((f) => f())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); adiado = e; avisar() })
  window.addEventListener('appinstalled', () => { adiado = null; avisar() })
}

export function ouvirInstalacao(f) {
  ouvintes.add(f)
  return () => ouvintes.delete(f)
}

/**
 * 'instalado' (aberto como app) · 'pronto' (o navegador oferece instalar) ·
 * 'ios' (instruções do Safari) · 'manual' (navegador sem convite: menu dele).
 */
export function estadoInstalacao({ standalone, ios, prompt }) {
  if (standalone) return 'instalado'
  if (prompt) return 'pronto'
  if (ios) return 'ios'
  return 'manual'
}
export const estadoAtual = () => estadoInstalacao({ standalone: instalado(), ios: ehIOS(), prompt: !!adiado })

/** Abre o convite do navegador. Só a partir de um clique. */
export async function pedirInstalacao() {
  if (!adiado) return false
  const e = adiado
  adiado = null // o mesmo evento não serve duas vezes
  e.prompt()
  const r = await e.userChoice.catch(() => ({ outcome: 'dismissed' }))
  avisar()
  return r.outcome === 'accepted'
}

/*
 * Convite após o login (18/10/2026): "Agora não" adia 7 dias, por CONTA e por
 * aparelho (a dispensa de uma pessoa não esconde o convite de outra no mesmo
 * celular). Guarda só a data — nada de credencial. localStorage pode falhar
 * (aba privada): aí o convite só volta a aparecer.
 */
export const ADIAMENTO = 7 * 24 * 60 * 60 * 1000
const chaveConvite = (papel, conta) => 'scw_convite_aparelho_' + papel + '_' + (conta || 'sem-conta')
export function conviteAdiado(papel, conta, agora = Date.now()) {
  try { const t = Number(localStorage.getItem(chaveConvite(papel, conta))); return !!t && agora - t < ADIAMENTO } catch { return false }
}
export function adiarConvite(papel, conta, agora = Date.now()) {
  try { localStorage.setItem(chaveConvite(papel, conta), String(agora)) } catch { /* segue sem lembrar */ }
}

/*
 * Visitas ao painel por conta e aparelho (22/10/2026): conta UMA por sessão do navegador. O convite de instalar/ligar
 * avisos só abre a partir da 2ª — na primeira a pessoa está aprendendo o painel (o tour, dispensável, já cobre isso) e a
 * primeira tarefa não pode disputar atenção com um diálogo. Guarda só um número. Sem armazenamento: devolve 2 (o convite
 * não fica escondido para sempre por causa de uma aba privada).
 */
export function contarVisita(papel, conta, { local = typeof localStorage === 'undefined' ? null : localStorage, sessao = typeof sessionStorage === 'undefined' ? null : sessionStorage } = {}) {
  try {
    const k = 'scw_visitas_' + papel + '_' + (conta || 'sem-conta')
    const s = 'scw_visita_contada_' + papel + '_' + (conta || 'sem-conta')
    let n = Number(local.getItem(k)) || 0
    if (sessao.getItem(s) !== '1') { n += 1; local.setItem(k, String(n)); sessao.setItem(s, '1') }
    return n
  } catch { return 2 }
}

/** Que aparelho é este (só o que muda a instrução). */
export function plataforma(ua = typeof navigator === 'undefined' ? '' : navigator.userAgent, toque = typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints) {
  const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && toque > 1)
  return {
    ios,
    // No iPhone só o Safari adiciona à Tela de Início com o painel como app.
    safari: ios && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua),
    android: /Android/.test(ua),
    movel: ios || /Android|Mobile/.test(ua),
  }
}

/**
 * Qual etapa o convite mostra (ou nenhuma):
 *   fora do modo app  → 'instalar' (se o navegador oferece, ou no celular, com instruções);
 *                       no computador sem oferta, pula para as notificações;
 *   aberto como app   → 'notificacoes' se este aparelho ainda não está registrado.
 * Bloqueado no navegador também vai para 'notificacoes' (a etapa explica como liberar).
 */
export function etapaDoConvite({ standalone, instalacao, movel, avisos }) {
  const faltaAvisos = !!avisos && avisos.suportado && !avisos.registrado
  if (!standalone) {
    if (instalacao === 'pronto' || movel) return 'instalar'
    return faltaAvisos ? 'notificacoes' : null
  }
  return faltaAvisos ? 'notificacoes' : null
}
