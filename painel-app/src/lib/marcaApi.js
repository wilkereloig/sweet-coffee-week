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
import { lerGuardada, gravarGuardada } from './sessaoGuardada.js'

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
  // Só 4xx de credencial mata a sessão. 429/5xx (servidor acordando, pico)
  // é falha passageira: vira erro comum e a tela oferece tentar de novo, em
  // vez de deslogar a pessoa e jogar fora o que ela digitou.
  if (!r.ok && (r.status === 429 || r.status >= 500)) throw new Error('http_' + r.status)
  if (!r.ok || !r.dados.access_token) return null
  return {
    access_token: r.dados.access_token,
    refresh_token: r.dados.refresh_token,
    expira_em: Date.now() + (r.dados.expires_in || 3600) * 1000,
    email: (r.dados.user && r.dados.user.email) || sessao.email,
  }
}

/*
 * Uma renovação por refresh token de cada vez. Vistas carregam em paralelo
 * (Promise.all); sem isto, três chamadas com o token vencendo disparariam três
 * refresh com o MESMO refresh token — o Supabase gira o token no primeiro e as
 * outras duas podem voltar como sessão morta.
 */
const emVoo = new Map()
export function renovarCompartilhado(sessao, fetchImpl = fetch) {
  if (!sessao || Date.now() < sessao.expira_em - 60000) return renovar(sessao, fetchImpl)
  const chave = sessao.refresh_token
  if (!emVoo.has(chave)) {
    emVoo.set(chave, renovar(sessao, fetchImpl).finally(() => emVoo.delete(chave)))
  }
  return emVoo.get(chave)
}

/*
 * Gravações pendentes (autosave com debounce) que precisam ir ao servidor
 * ANTES de a sessão ser apagada — sair da conta apaga a sessão guardada na
 * hora, e o salvamento do desmonte chegaria sem token.
 */
const pendentes = new Set()
export function registrarPendente(fn) { pendentes.add(fn); return () => pendentes.delete(fn) }
export async function descarregarPendentes() {
  await Promise.allSettled([...pendentes].map((fn) => fn()))
}

/** signIn no formato que src/lib/marcaAccess.js#entrarComoMarca espera injetar. */
export async function signInComSenha(email, senha, fetchImpl = fetch) {
  const r = await auth('token?grant_type=password', { email, password: senha }, 'POST', undefined, fetchImpl)
  // 429/5xx não é senha errada: lança, e quem chama cai no recado de rede.
  if (!r.ok && (r.status === 429 || r.status >= 500)) throw new Error('http_' + r.status)
  if (!r.ok || !r.dados.access_token) return { data: {}, error: new Error('credenciais') }
  return { data: { session: r.dados, user: r.dados.user }, error: null }
}

function lerSessao(chave = CHAVE_SESSAO) {
  try {
    const cru = lerGuardada(chave)
    return cru ? JSON.parse(cru) : null
  } catch { return null }
}

function salvarSessao(sessao, chave = CHAVE_SESSAO) {
  gravarGuardada(chave, JSON.stringify(sessao))
}

/**
 * Token vivo da sessão guardada em `chave` (marca ou conta da organização):
 * renova antes de usar e grava a renovada. Quem chama /auth/v1 direto (trocar
 * a senha) precisa disto — o token cru guardado vence em 1 h.
 * @returns {Promise<string|null>} null = sessão morta; 429/5xx lança.
 */
export async function tokenVivo(chave = CHAVE_SESSAO, fetchImpl = fetch) {
  const atual = lerSessao(chave)
  const viva = await renovarCompartilhado(atual, fetchImpl)
  if (viva && viva !== atual) salvarSessao(viva, chave)
  return viva ? viva.access_token : null
}

/** Recado legível para a falha do PUT /auth/v1/user (o GoTrue responde em inglês). */
export function recadoSenha(r) {
  const cod = (r && r.dados && (r.dados.error_code || r.dados.code)) || ''
  if (r && r.status === 401) return 'Sua sessão expirou. Saia e entre de novo.'
  if (cod === 'same_password') return 'A nova senha precisa ser diferente da atual.'
  if (cod === 'weak_password') return 'Essa senha é fraca demais. Use uma mais longa, misturando letras e números.'
  return 'Não deu para salvar a senha agora. Tente de novo.'
}

/*
 * Leitura opcional (tabela, função ou coluna que só existe com uma migration
 * nova): SÓ a ausência no banco vira vazio. Falha passageira (5xx, rede)
 * propaga — senão a tela diria "Nada pendente" com o servidor fora do ar.
 */
const CODIGOS_AUSENTE = ['PGRST202', 'PGRST205', '42P01', '42883', '42703']
export function faltaNoBanco(e) {
  return !!e && (e.status === 404 || CODIGOS_AUSENTE.includes(e.codigo))
}
export const seFaltar = (vazio) => (e) => { if (faltaNoBanco(e)) return vazio; throw e }

/*
 * Caminho A da decisão de sessão (handoff de correções, Etapa 2): quem decide
 * o que fazer quando a sessão morre EM PLENO USO — painel já aberto, não no
 * boot — é o App, não esta lib. Ela só registra o callback uma vez (no mount)
 * e avisa antes de lançar `sessao_expirada`; continua sem importar DOM/rota.
 */
let aoSessaoExpirar = null
export function registrarAoSessaoExpirar(fn) { aoSessaoExpirar = fn }

function sessaoMorta() {
  if (aoSessaoExpirar) aoSessaoExpirar()
  throw new Error('sessao_expirada')
}

/**
 * PostgREST autenticado. Renova o token antes de chamar (nunca depois de um
 * 401) e lança erro se a resposta não for ok — nunca devolve corpo parcial
 * como se tivesse dado certo.
 */
export async function api(caminho, opcoes = {}, fetchImpl = fetch) {
  const atual = lerSessao()
  const viva = await renovarCompartilhado(atual, fetchImpl)
  if (!viva) sessaoMorta()
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
  // 401 com token recém-renovado = sessão revogada no servidor (senha nova,
  // conta suspensa). Tratar como erro genérico deixaria a pessoa num painel
  // que nunca mais carrega.
  if (r.status === 401) sessaoMorta()
  if (!r.ok) {
    const erro = new Error((dados && dados.message) || ('http_' + r.status))
    erro.status = r.status
    erro.codigo = (dados && dados.code) || null
    throw erro
  }
  return dados
}

/**
 * A trava de primeiro uso, com os DOIS desfechos de falha distinguidos (antes
 * colapsavam no mesmo `catch { return false }`): rede caiu → deixa entrar é
 * melhor que trancar alguém fora por causa de uma consulta que falhou; sessão
 * MORTA (refresh token não vale mais) → não tem painel pra entrar, o boot
 * precisa voltar pro login em vez de tentar montar em cima de sessão inválida.
 * Conta bloqueada ou desativada pela organização (29/09/2026) → 'pausada':
 * a tela diz isso em vez de montar um painel que a RLS deixaria vazio.
 * @returns {Promise<'trocar'|'ok'|'morta'|'pausada'>}
 */
export async function precisaTrocarSenha(fetchImpl = fetch) {
  try {
    const linhas = await api('perfis?select=deve_trocar_senha,ativo,bloqueado_em&limit=1', {}, fetchImpl)
    const p = linhas && linhas[0]
    if (p && (p.ativo === false || p.bloqueado_em)) return 'pausada'
    return (p && p.deve_trocar_senha) ? 'trocar' : 'ok'
  } catch (e) {
    return (e && e.message === 'sessao_expirada') ? 'morta' : 'ok'
  }
}

export async function marcarSenhaTrocada(fetchImpl = fetch) {
  try { await api('rpc/marcar_senha_trocada', { metodo: 'POST', corpo: {} }, fetchImpl) } catch { /* ver comentário acima */ }
}

/**
 * Sobe a logo da própria marca direto no bucket público `logos` (29/09/2026).
 * Quem decide se pode é a policy do Storage (só a pasta `<participante>/` da
 * conta, e só com a conta ativa) — não uma chave escondida na página. Nunca
 * por cima: `x-upsert: false`, cada versão é um arquivo novo.
 */
export async function subirLogo(caminho, arquivo, tipo, fetchImpl = fetch) {
  const atual = lerSessao()
  const viva = await renovarCompartilhado(atual, fetchImpl)
  if (!viva) sessaoMorta()
  if (viva !== atual) salvarSessao(viva)
  const r = await fetchImpl(SUPABASE_URL + '/storage/v1/object/logos/' + caminho, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + viva.access_token, 'Content-Type': tipo, 'x-upsert': 'false' },
    body: arquivo,
  })
  if (r.status === 401) sessaoMorta()
  if (!r.ok) {
    let dados = null
    try { dados = await r.json() } catch { /* sem corpo */ }
    throw new Error((dados && (dados.message || dados.error)) || ('http_' + r.status))
  }
  return caminho
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
  const viva = await renovarCompartilhado(atual, fetchImpl)
  if (!viva) sessaoMorta()
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

/**
 * Avisos deste aparelho para a marca, sob RLS (antes eram duas cópias, no
 * Início e na Conta). O endpoint é UNIQUE: apaga a linha própria e insere de
 * novo (update está revogado). A de OUTRA conta no mesmo aparelho o gatilho
 * `push_substitui_aparelho` tira. `conferir` diz se a assinatura do navegador
 * é desta marca — a RLS só devolve as próprias linhas.
 */
export function pushMarca(participanteId) {
  const linha = (endpoint) => 'push_subscriptions?endpoint=eq.' + encodeURIComponent(endpoint)
  return {
    registrar: async (a) => {
      if (!participanteId) throw new Error('Sua conta ainda não está ligada a uma marca.')
      await api(linha(a.endpoint), { metodo: 'DELETE' }).catch(() => null)
      await api('push_subscriptions', {
        metodo: 'POST', prefer: 'return=minimal',
        corpo: { papel: 'marca', participante_id: participanteId, endpoint: a.endpoint, p256dh: a.p256dh, auth_chave: a.auth, user_agent: a.userAgent },
      })
    },
    remover: (endpoint) => api(linha(endpoint), { metodo: 'DELETE' }),
    conferir: async (endpoint) => ((await api(linha(endpoint).replace('?', '?select=id&'))) || []).length > 0,
  }
}
