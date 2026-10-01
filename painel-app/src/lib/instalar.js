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

// "Agora não" do convite: por aparelho e por papel. localStorage pode falhar
// (aba privada, dados bloqueados); aí o convite só volta a aparecer.
const chave = (papel) => 'scw_convite_app_' + papel
export function conviteDispensado(papel) {
  try { return localStorage.getItem(chave(papel)) === '1' } catch { return false }
}
export function dispensarConvite(papel) {
  try { localStorage.setItem(chave(papel), '1') } catch { /* segue sem lembrar */ }
}
