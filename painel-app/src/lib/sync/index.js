/*
 * Ligação da sincronização ao painel real (19/10/2026): monta o gerenciador com
 * o transporte Realtime, o token da sessão guardada e a lista de canais do
 * servidor. As telas não importam isto direto — usam react.js (useSincronizar,
 * useGuarda, useEstadoSync) e os shells chamam `iniciarSincronizacao`.
 */
import { SUPABASE_URL, SUPABASE_KEY, rpc } from '../rpc.js'
import { api, tokenVivo } from '../marcaApi.js'
import { lerGuardada } from '../sessaoGuardada.js'
import { CHAVE_SESSAO as CHAVE_MARCA } from '../../../../src/lib/marcaAccess.js'
import { CHAVE_SESSAO as CHAVE_ORG_CONTA } from '../../../../src/lib/orgAccess.js'
import { barramento } from './barramento.js'
import { anunciarAlteracao } from './anuncio.js'
import { criarTempoReal } from './tempoReal.js'
import { criarSincronizacao, usuarioDoToken } from './sessao.js'

export function ambienteDoNavegador() {
  const w = typeof window !== 'undefined' ? window : null
  const d = typeof document !== 'undefined' ? document : null
  return {
    ouvir(evento, fn) {
      const alvo = evento === 'visibilitychange' ? d : w
      if (!alvo || typeof alvo.addEventListener !== 'function') return () => {}
      alvo.addEventListener(evento, fn)
      return () => alvo.removeEventListener(evento, fn)
    },
    visivel: () => !d || d.visibilityState !== 'hidden',
    online: () => typeof navigator === 'undefined' || navigator.onLine !== false,
  }
}

const URL_TEMPO_REAL = SUPABASE_URL.replace(/^http/, 'ws') + '/realtime/v1/websocket'

let quemAgora = null   // { tipo, chave } da sessão que o transporte deve usar

const obterToken = () => (quemAgora && quemAgora.chave ? tokenVivo(quemAgora.chave) : Promise.resolve(null))
// Os canais que ESTA conta pode ouvir vêm do servidor (sync_meus_canais): permissão revogada some da lista.
const obterCanais = async () => {
  const lista = quemAgora && quemAgora.tipo === 'marca'
    ? await api('rpc/sync_meus_canais', { metodo: 'POST', corpo: {} })
    : await rpc('sync_meus_canais', {})
  return Array.isArray(lista) ? lista.filter((t) => typeof t === 'string' && t.startsWith('scw:')) : []
}

export const sincronizacao = criarSincronizacao({
  barramento,
  anunciar: (dominios, opcoes) => anunciarAlteracao(dominios, opcoes),
  ambiente: ambienteDoNavegador(),
  criarTransporte: ({ aoSinal, aoReconectar }) => criarTempoReal({
    url: URL_TEMPO_REAL, apikey: SUPABASE_KEY, obterToken, obterCanais, aoSinal, aoReconectar,
  }),
})

/**
 * Liga a sincronização desta sessão. `tipo`: 'org' (conta nominal), 'marca' ou
 * 'legado' (senha compartilhada — sem canal; só a conferência periódica).
 * Idempotente; `aoTrocaDeConta` é chamado se outra aba sair ou entrar como outra pessoa.
 */
export function iniciarSincronizacao({ tipo, aoTrocaDeConta } = {}) {
  const chave = tipo === 'marca' ? CHAVE_MARCA : tipo === 'org' ? CHAVE_ORG_CONTA : null
  let uid
  if (chave) {
    try { uid = usuarioDoToken(JSON.parse(lerGuardada(chave) || 'null')?.access_token) || undefined } catch { uid = undefined }
  }
  quemAgora = { tipo, chave }
  sincronizacao.iniciar({ tipo, uid, chaveStorage: chave, aoTrocaDeConta })
}

export function pararSincronizacao() {
  sincronizacao.parar()
  quemAgora = null
}
