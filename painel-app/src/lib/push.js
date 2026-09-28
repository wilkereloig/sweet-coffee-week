/*
 * Push deste aparelho — a mesma mecânica nos dois painéis (antes eram duas
 * cópias, em Equipe.jsx e vistas-marca/Arquivos.jsx). Quem grava a
 * assinatura no banco é injetado (`registrar`/`remover`): organização por
 * RPC, marca pela tabela sob RLS.
 *
 * Três coisas separadas, e confundi-las é o que gera "liguei e não chega":
 * suporte do navegador, permissão da pessoa, e assinatura registrada no banco.
 */
import { bytesDaChave, VAPID_PUBLICA } from './avisos.js'

export function avisoSuportado() {
  return typeof window !== 'undefined' &&
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

// iPhone/iPad só expõem push com o painel INSTALADO na Tela de Início.
export function ehIOS() {
  return typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
}
export function instalado() {
  return typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true)
}

// Espera o SW com prazo: fora do escopo /painel/ o `ready` nunca resolve, e a
// tela ficava presa em "pedindo permissão" para sempre.
async function registroPronto(ms = 6000) {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, rej) => setTimeout(() => rej(new Error('O aplicativo ainda não terminou de carregar. Recarregue a página e tente de novo.')), ms)),
  ])
}

export async function assinaturaDoAparelho() {
  if (!avisoSuportado()) return null
  try {
    const reg = await registroPronto()
    return await reg.pushManager.getSubscription()
  } catch {
    return null
  }
}

/** Pede permissão (sempre a partir de um clique) e grava a assinatura. */
export async function ligarAvisos(registrar) {
  if (Notification.permission === 'denied') throw new Error('bloqueado')
  const permissao = await Notification.requestPermission()
  if (permissao !== 'granted') throw new Error(permissao === 'denied' ? 'bloqueado' : 'sem_resposta')
  const reg = await registroPronto()
  // `userVisibleOnly: true` é obrigatório: não existe push silencioso na web.
  const nova = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytesDaChave(VAPID_PUBLICA) })
  const bruto = nova.toJSON()
  // Só diz "ligado" depois que o banco confirmar: assinatura que existe no
  // navegador e não no banco é aparelho que jura que está ligado e não recebe.
  await registrar({ endpoint: bruto.endpoint, p256dh: bruto.keys.p256dh, auth: bruto.keys.auth, userAgent: navigator.userAgent.slice(0, 300) })
}

/** Banco primeiro, depois o navegador: se a rede cair no meio, não sobra endpoint vivo apontando para nada. */
export async function desligarAvisos(remover) {
  const atual = await assinaturaDoAparelho()
  if (!atual) return
  await remover(atual.endpoint)
  await atual.unsubscribe()
}
