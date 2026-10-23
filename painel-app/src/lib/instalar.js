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

/** Que aparelho é este (só o que muda a instrução). */
export function plataforma(ua = typeof navigator === 'undefined' ? '' : navigator.userAgent, toque = typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints) {
  const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && toque > 1)
  const v = /(?:iPhone )?OS (\d+)[_.](\d+)/.exec(ua)
  return {
    ios,
    // iOS/iPadOS abaixo de 16.4 não recebe aviso nenhum, nem com o painel instalado. O iPad que se apresenta como Mac não diz a versão: fica false.
    iosAntigo: ios && !!v && (Number(v[1]) < 16 || (Number(v[1]) === 16 && Number(v[2]) < 4)),
    // No iPhone só o Safari adiciona à Tela de Início com o painel como app.
    safari: ios && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua),
    android: /Android/.test(ua),
    movel: ios || /Android|Mobile/.test(ua),
  }
}

/**
 * Como liberar notificações BLOQUEADAS neste aparelho (o painel não pode pedir de novo). `p` = plataforma(),
 * `app` = aberto pelo ícone. No iPhone só existe bloqueio com o painel instalado (fora dele não há push).
 */
export const COMO_LIBERAR = (p, app) => p.ios ? 'Ajustes do iPhone › Notificações › Painel SCW › Permitir Notificações.'
  : p.android && app ? 'Configurações do aparelho › Apps › Painel SCW › Notificações › Permitir.'
  : p.android ? 'Toque no cadeado ao lado do endereço › Permissões › Notificações › Permitir.'
  : 'Clique no cadeado ao lado do endereço do site › Notificações › Permitir. Depois, recarregue o painel.'

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
