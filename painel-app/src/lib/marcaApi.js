/*
 * Cliente de rede do lado MARCA — Supabase Auth + PostgREST direto por
 * fetch, sem supabase-js (mesmo motivo de rpc.js). `fetchImpl` é injetado
 * com default `fetch` global.
 *
 * Porte de public/painel/index.html (IIFE PainelMarca): auth/renovar/api
 * (~4360-4412) e precisaTrocarSenha/marcarSenhaTrocada (~4810-4821).
 * `renovar` foi separado do acesso a sessionStorage (que o arquivo estático
 * mistura na mesma função) para ficar lógica pura testável sem DOM — o
 * comportamento é idêntico: token com mais de 60s de validade não renova.
 */
import { SUPABASE_URL, SUPABASE_KEY } from './rpc.js'
import { CHAVE_SESSAO } from '../../../src/lib/marcaAccess.js'

export async function auth(caminho, corpo, metodo = 'POST', token, fetchImpl = fetch) {
  const cab = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' }
  if (token) cab.Authorization = 'Bearer ' + token
  const r = await fetchImpl(SUPABASE_URL + '/auth/v1/' + caminho, {
    method: metodo,
    headers: cab,
    body: corpo ? JSON.stringify(corpo) : undefined,
  })
  let dados = {}
  try { dados = await r.json() } catch { /* corpo vazio ou não-JSON */ }
  return { ok: r.ok, status: r.status, dados }
}

/**
 * @param {object|null} sessao {access_token, refresh_token, expira_em, email}
 * @returns {Promise<object|null>} a mesma sessão (ainda válida), uma sessão
 *   renovada, ou `null` se não havia sessão ou o refresh falhou.
 */
export async function renovar(sessao, fetchImpl = fetch) {
  if (!sessao) return null
  if (Date.now() < sessao.expira_em - 60000) return sessao
  const r = await auth('token?grant_type=refresh_token', { refresh_token: sessao.refresh_token }, 'POST', undefined, fetchImpl)
  if (!r.ok || !r.dados.access_token) return null
  return {
    access_token: r.dados.access_token,
    refresh_token: r.dados.refresh_token,
    expira_em: Date.now() + (r.dados.expires_in || 3600) * 1000,
    email: (r.dados.user && r.dados.user.email) || sessao.email,
  }
}

/** signIn no formato que src/lib/marcaAccess.js#entrarComoMarca espera injetar. */
export async function signInComSenha(email, senha, fetchImpl = fetch) {
  const r = await auth('token?grant_type=password', { email, password: senha }, 'POST', undefined, fetchImpl)
  if (!r.ok || !r.dados.access_token) return { data: {}, error: new Error('credenciais') }
  return { data: { session: r.dados, user: r.dados.user }, error: null }
}

function lerSessao() {
  try {
    const cru = sessionStorage.getItem(CHAVE_SESSAO)
    return cru ? JSON.parse(cru) : null
  } catch { return null }
}

function salvarSessao(sessao) {
  try { sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao)) } catch { /* modo privado */ }
}

/**
 * PostgREST autenticado. Renova o token antes de chamar (nunca depois de um
 * 401) e lança erro se a resposta não for ok — nunca devolve corpo parcial
 * como se tivesse dado certo.
 */
export async function api(caminho, opcoes = {}, fetchImpl = fetch) {
  const atual = lerSessao()
  const viva = await renovar(atual, fetchImpl)
  if (!viva) throw new Error('sessao_expirada')
  if (viva !== atual) salvarSessao(viva)

  const cab = {
    apikey: SUPABASE_KEY,
    Authorization: 'Bearer ' + viva.access_token,
    'Content-Type': 'application/json',
  }
  if (opcoes.prefer) cab.Prefer = opcoes.prefer
  const r = await fetchImpl(SUPABASE_URL + '/rest/v1/' + caminho, {
    method: opcoes.metodo || 'GET',
    headers: cab,
    body: opcoes.corpo ? JSON.stringify(opcoes.corpo) : undefined,
  })
  let dados = null
  try { dados = await r.json() } catch { /* sem corpo */ }
  if (!r.ok) throw new Error((dados && dados.message) || ('http_' + r.status))
  return dados
}

/* A trava de primeiro uso: erro de rede devolve `false` — deixar entrar é
   melhor que trancar alguém fora por causa de uma consulta que falhou. */
export async function precisaTrocarSenha(fetchImpl = fetch) {
  try {
    const linhas = await api('perfis?select=deve_trocar_senha&limit=1', {}, fetchImpl)
    return !!(linhas && linhas[0] && linhas[0].deve_trocar_senha)
  } catch { return false }
}

export async function marcarSenhaTrocada(fetchImpl = fetch) {
  try { await api('rpc/marcar_senha_trocada', { metodo: 'POST', corpo: {} }, fetchImpl) } catch { /* ver comentário acima */ }
}

/**
 * URL assinada para baixar um arquivo do bucket privado 'arquivos' — porta
 * fiel de `baixar()` em public/painel/index.html (~5166-5186). Assina com o
 * TOKEN DA PRÓPRIA MARCA via storage direto: quem decide se ela pode baixar
 * é a policy de storage, não uma chave de serviço escondida na página. É por
 * isso que aqui NÃO se usa a Edge Function 'arquivo-url' (essa é só do lado
 * organização, que assina com a senha compartilhada).
 * @returns {Promise<string>} URL assinada, válida por 5 minutos
 */
export async function assinarDownload(caminho, fetchImpl = fetch) {
  const atual = lerSessao()
  const viva = await renovar(atual, fetchImpl)
  if (!viva) throw new Error('sessao_expirada')
  if (viva !== atual) salvarSessao(viva)

  const r = await fetchImpl(SUPABASE_URL + '/storage/v1/object/sign/arquivos/' + caminho, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + viva.access_token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: 300 }),
  })
  let dados = null
  try { dados = await r.json() } catch { /* sem corpo */ }
  if (!r.ok || !dados || !dados.signedURL) throw new Error('sem_link')
  return SUPABASE_URL + '/storage/v1' + dados.signedURL
}
