/*
 * Entrada como marca (Área da marca) — lógica pura, mesmo padrão de
 * adminAccess.js (§4.1): a lib NÃO importa supabase, a função de rede é
 * injetada. Isso a torna testável sem cliente e sem rede.
 *
 * ⚠️ `slugificar`/`enderecoDeLogin` são a TERCEIRA cópia do mesmo algoritmo —
 * as outras duas são `public/marca/index.html` (o próprio login estático, que
 * este diálogo agora antecede) e a Edge Function `criar-acesso-marca` (que
 * cria a conta). AS TRÊS TÊM QUE CASAR: divergir uma vírgula faz a marca
 * digitar o nome certo e não entrar, com erro genérico de propósito — ninguém
 * descobre o motivo. `tests/marca.test.mjs` compara as três.
 * O corpo de `slugificar` foi extraído byte a byte da página estática (a regex
 * de acentos combinantes não se redigita à mão), não escrito de novo aqui.
 *
 * COMO A SESSÃO CASA COM /marca/: o formulário estático lê
 * `sessionStorage.scw_marca` no boot e, achando uma sessão válida, pula direto
 * para o painel (depois de checar `deve_trocar_senha` — ver o hardening em
 * `public/marca/index.html`). Esta lib grava exatamente o mesmo formato que o
 * `sessaoSalvar()` de lá produz: `access_token`, `refresh_token`, `expira_em`
 * (instante calculado, não o `expires_in` cru) e `email`. Sessão em
 * sessionStorage, nunca localStorage — ela morre com a aba, de propósito.
 *
 * ⚠️ Erro de login é SEMPRE genérico ("E-mail ou senha não conferem.") — nunca
 * diz qual dos dois está errado. Confirmar que o e-mail existe é a mesma fuga
 * de informação que `public/marca/index.html` já evita (`tests/marca.test.mjs`,
 * "erro de login não confirma se o e-mail existe").
 */

export const CHAVE_SESSAO = 'scw_marca'
const DOMINIO_LOGIN = 'marcas.sweetcoffeeweek.com.br'

function slugificar (nome) {
    return (nome || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/&/g, ' e ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48)
}

/**
 * @param {string} digitado nome do estabelecimento, ou o e-mail sintético direto
 * @returns {string} o e-mail que o Supabase Auth espera
 */
export function enderecoDeLogin (digitado) {
  const t = String(digitado == null ? '' : digitado).trim()
  if (t.indexOf('@') > -1) return t.toLowerCase()
  return slugificar(t) + '@' + DOMINIO_LOGIN
}

/**
 * @param {object}   p
 * @param {string}   p.nome     nome do estabelecimento (ou e-mail direto)
 * @param {string}   p.senha    o que a pessoa digitou
 * @param {Function} p.signIn   (email, senha) => Promise<{data:{session,user},error}>, injetada
 * @param {Function} p.guardar  (chave, valor) => void, injetada (sessionStorage)
 * @returns {Promise<{ok: boolean, erro?: 'vazio'|'credenciais'|'rede'|'sessao'}>}
 */
export async function entrarComoMarca ({ nome, senha, signIn, guardar }) {
  const nomeLimpo = String(nome == null ? '' : nome).trim()
  const senhaLimpa = String(senha == null ? '' : senha)
  if (!nomeLimpo || !senhaLimpa) return { ok: false, erro: 'vazio' }

  const email = enderecoDeLogin(nomeLimpo)

  let resposta
  try {
    resposta = await signIn(email, senhaLimpa)
  } catch {
    return { ok: false, erro: 'rede' }
  }

  const sessao = resposta && resposta.data && resposta.data.session
  if (!sessao || (resposta && resposta.error)) return { ok: false, erro: 'credenciais' }

  const paraGuardar = {
    access_token: sessao.access_token,
    refresh_token: sessao.refresh_token,
    // O servidor manda expires_in (segundos). Guardar o INSTANTE evita
    // recalcular a partir de um relógio que pode ter andado — mesma conta de
    // public/marca/index.html.
    expira_em: Date.now() + (sessao.expires_in || 3600) * 1000,
    email: (sessao.user && sessao.user.email) || email,
  }

  try {
    guardar(CHAVE_SESSAO, JSON.stringify(paraGuardar))
  } catch {
    return { ok: false, erro: 'sessao' }
  }

  return { ok: true }
}

/* Texto por motivo, junto da lógica que o produz (mesmo padrão de adminAccess.js). */
export const RECADO = {
  vazio: 'Preencha o nome do estabelecimento e a senha.',
  credenciais: 'E-mail ou senha não conferem.',
  rede: 'Não deu para conectar agora. Tente de novo em instantes.',
  sessao: 'A senha confere, mas o navegador não deixou guardar a sessão. Tente fora da janela anônima.',
}
