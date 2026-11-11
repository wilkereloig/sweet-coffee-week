/*
 * O aparelho e o navegador (só no navegador). A mecânica de push é a MESMA do painel (painel-app/src/lib/push.js: suporte,
 * permissão sempre a partir de clique, `userVisibleOnly`, desfaz a assinatura se o banco recusar) e a chave VAPID PÚBLICA vem da
 * mesma fonte (painel-app/src/lib/avisos.js). A chave privada nunca está no front. Quem grava no banco é injetado (`registrar`).
 */
import {
  avisoSuportado, ehIOS, instalado, assinaturaDoAparelho, ligarAvisos, desligarAvisos,
} from '../../../../painel-app/src/lib/push.js'
import { TODAS_PREFS } from './logica.js'

export { ehIOS, instalado as appInstalado }

/** Foto do aparelho: suporte, permissão e se este aparelho já está assinado. Só espera o service worker se a permissão já foi dada. */
export async function lerAparelho () {
  const suportado = avisoSuportado()
  const permissao = suportado ? Notification.permission : 'default'
  const assinado = suportado && permissao === 'granted' ? !!(await assinaturaDoAparelho()) : false
  return { suportado, ios: ehIOS(), instalado: instalado(), permissao, assinado }
}

/** Pede permissão (chamar só de um clique), assina e entrega `{ endpoint, p256dh, auth }` a `registrar`. Lança 'bloqueado' | 'sem_resposta' | o erro do banco. */
export const ativarNesteAparelho = (registrar) => ligarAvisos(registrar)

/** Avisa as outras peças da tela (AvisosPush, convite) que o push deste aparelho mudou, para relerem o aparelho. */
export const EVENTO_PUSH = 'scw:caca-push'

/**
 * "Ativar" da central e do convite: assina este aparelho com todas as categorias e grava no banco. Devolve a resposta do banco
 * (prefs, dispositivos). Lança o mesmo que `ativarNesteAparelho` (classificar com logica.classificarErroPush).
 */
export async function ativarAvisosDoMapa (api, chave) {
  let resposta = null
  await ativarNesteAparelho(async ({ endpoint, p256dh, auth }) => {
    const r = await api.pushRegistrar(chave, { endpoint, keys: { p256dh, auth } }, TODAS_PREFS)
    if (!r.ok) throw Object.assign(new Error(r.motivo), { motivo: r.motivo })
    resposta = r
  })
  globalThis.dispatchEvent?.(new Event(EVENTO_PUSH))
  return resposta
}
export async function endpointDesteAparelho () {
  return (await assinaturaDoAparelho())?.endpoint || null
}

/** Banco primeiro (`remover(endpoint)`), depois o navegador. */
export const desativarNesteAparelho = (remover) => desligarAvisos(remover)

/** Só o navegador: usado depois de "desligar em todos os aparelhos" (o banco já apagou tudo). */
export async function esquecerAssinaturaLocal () {
  const atual = await assinaturaDoAparelho()
  if (atual) await atual.unsubscribe().catch(() => {})
}
