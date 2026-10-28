/*
 * Porta de entrada dos avisos de alteração (19/10/2026). rpc.js e marcaApi.js
 * chamam isto DEPOIS de uma gravação confirmada; o gerenciador de sincronização
 * chama com origem 'remota' (sinal do servidor) ou 'reconciliacao'.
 *
 * Além de alimentar o barramento, solta um evento DOM `scw:painel:alteracao`
 * (só nomes de domínio, origem e id opaco — nunca o corpo da gravação), para
 * que qualquer parte da página e os testes possam observar sem importar nada.
 */
import { barramento } from './barramento.js'
import { limparDominios, dominiosDeRpc, dominiosDeFuncao, dominiosDeApi, foiConfirmada } from './dominios.js'

export const EVENTO_ALTERACAO = 'scw:painel:alteracao'

function eventoDom(detail) {
  try {
    const janela = globalThis.window
    if (!janela || typeof janela.dispatchEvent !== 'function' || typeof CustomEvent !== 'function') return
    janela.dispatchEvent(new CustomEvent(EVENTO_ALTERACAO, { detail }))
  } catch { /* sem DOM (testes de lógica pura) */ }
}

export function anunciarAlteracao(dominios, { ref = null, origem = 'local' } = {}) {
  const lista = limparDominios(dominios)
  if (!lista.length) return
  barramento.anunciar(lista, { ref, origem })
  eventoDom({ dominios: lista, origem, ref: ref == null ? null : String(ref).slice(0, 64), em: Date.now() })
}

/** Depois de uma RPC que voltou ok. Recusa de negócio ({ok:false}) não avisa. */
export function aoRpcConfirmada(nome, corpo, resposta) {
  if (!foiConfirmada(resposta)) return
  anunciarAlteracao(dominiosDeRpc(nome, corpo))
}

export function aoFuncaoConfirmada(nome, resposta) {
  if (!foiConfirmada(resposta)) return
  anunciarAlteracao(dominiosDeFuncao(nome))
}

export function aoApiConfirmada(caminho, metodo, resposta) {
  if (!foiConfirmada(resposta)) return
  anunciarAlteracao(dominiosDeApi(caminho, metodo))
}
