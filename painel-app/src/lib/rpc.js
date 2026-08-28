/*
 * Cliente RPC do painel — PostgREST direto por fetch, sem supabase-js
 * (mesmo motivo do arquivo estático que substitui: ~100 KB de CDN só pra
 * fazer POSTs). `fetchImpl` é injetado com default `fetch` global — em
 * produção ninguém passa o terceiro argumento; o teste passa um fake.
 *
 * Fase 2 do plano de funções da organização (27/08/2026): dois modos.
 * Existindo sessão nominal (`scw_org_conta`, src/lib/orgAccess.js), manda o
 * TOKEN da pessoa e zera qualquer `p_secret` que o chamador tenha incluído —
 * a perna nominal de `pode()` nem olha pra `p_secret`, então mandar a senha
 * única (que uma conta nominal nunca teria) só arriscaria vazar um valor à
 * toa. Sem sessão nominal, comportamento IDÊNTICO ao de antes: chave
 * publicável + o `p_secret` que o chamador mandar.
 *
 * ⚠️ Só SUBSTITUI `p_secret` quando o chamador já incluiu essa chave — nunca
 * ACRESCENTA numa `corpo` que não tinha. RPCs sem argumento nenhum
 * (`minhas_permissoes()`, `marcar_senha_trocada()`) quebram no PostgREST se
 * receberem uma chave que a função não declara; os ~20 pontos de chamada já
 * existentes (Mesa.jsx, Respostas.jsx, Marcas.jsx...) continuam passando
 * `{p_secret: senha, ...campos}` exatamente como hoje, sem precisar mudar —
 * é essa chave que vira `null` quando existe sessão nominal.
 */
import { renovar } from './marcaApi.js'
import { CHAVE_SESSAO as CHAVE_SESSAO_ORG_CONTA } from '../../../src/lib/orgAccess.js'

export const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || 'https://dgfmoibynftadsyjcclg.supabase.co'
export const SUPABASE_KEY = import.meta.env?.VITE_SUPABASE_KEY || 'sb_publishable_E6G4mwt0xFzz_Ob0dULd9g_NhlJpH2R'

function lerSessaoOrgConta() {
  try {
    const cru = sessionStorage.getItem(CHAVE_SESSAO_ORG_CONTA)
    return cru ? JSON.parse(cru) : null
  } catch { return null }
}

function salvarSessaoOrgConta(sessao) {
  try { sessionStorage.setItem(CHAVE_SESSAO_ORG_CONTA, JSON.stringify(sessao)) } catch { /* modo privado */ }
}

/**
 * Decide o modo desta chamada. Sessão nominal que morreu (refresh falhou)
 * lança `sessao_expirada` — melhor um erro reconhecível do que cair de volta
 * pra senha única com um `p_secret` vazio, que passaria batido como "sem
 * permissão nenhuma" sem dizer por quê (mesma lição do Etapa 2 do lado
 * marca — sessão morta não pode se disfarçar de falha de rede).
 * @returns {Promise<{authorization: string, nominal: boolean}>}
 */
async function modoDeAcesso(fetchImpl) {
  const atual = lerSessaoOrgConta()
  if (!atual) return { authorization: 'Bearer ' + SUPABASE_KEY, nominal: false }

  const viva = await renovar(atual, fetchImpl)
  if (!viva) throw new Error('sessao_expirada')
  if (viva !== atual) salvarSessaoOrgConta(viva)
  return { authorization: 'Bearer ' + viva.access_token, nominal: true }
}

export async function rpc(nome, corpo = {}, fetchImpl = fetch) {
  const modo = await modoDeAcesso(fetchImpl)
  const corpoFinal = (modo.nominal && 'p_secret' in corpo) ? { ...corpo, p_secret: null } : corpo

  const r = await fetchImpl(SUPABASE_URL + '/rest/v1/rpc/' + nome, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: modo.authorization,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(corpoFinal),
  })
  if (!r.ok) {
    let detalhe = ''
    try { detalhe = (await r.json()).message || '' } catch { /* corpo não é JSON */ }
    throw new Error(detalhe || ('HTTP ' + r.status))
  }
  // RPC `returns void` responde 204 sem corpo — ler como texto primeiro
  // cobre esse caso sem esconder falha de parse real.
  const bruto = await r.text()
  return bruto ? JSON.parse(bruto) : null
}

// Edge Functions (não é PostgREST) — porta fiel de chamarFuncao em
// public/painel/index.html (~1940-1962). Diferente de rpc(): sempre lê o
// corpo como JSON (as functions sempre respondem JSON, nunca 204 vazio) e,
// em erro, o corpo viaja junto (`err.dados`) — recusas de colisão devolvem
// dados que a tela usa (ex.: candidatura_id), perder isso no throw vira
// queixa sem saída.
//
// Fase 4 do plano de funções da organização (28/08/2026): reusa o mesmo
// modoDeAcesso() de rpc() — sessão nominal manda o TOKEN da pessoa em vez da
// chave publicável, e as cinco funções de conta aprenderam a validar esse
// JWT (admin.auth.getUser + pode_por_user) quando o corpo não traz `secret`.
// `corpo.secret` continua vindo do chamador tal como hoje (vazio numa sessão
// nominal, porque a chave que ele lê não existe) — não precisa ser zerado
// aqui: vazio já é falsy do lado da função, que cai pro caminho do JWT.
export async function chamarFuncao(nome, corpo, fetchImpl = fetch) {
  const modo = await modoDeAcesso(fetchImpl)
  const r = await fetchImpl(SUPABASE_URL + '/functions/v1/' + nome, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: modo.authorization,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(corpo),
  })
  let dados = null
  try { dados = await r.json() } catch { /* corpo não é JSON */ }
  if (!r.ok) {
    const err = new Error((dados && (dados.detalhe || dados.erro)) || ('HTTP ' + r.status))
    err.dados = dados
    throw err
  }
  return dados || {}
}
