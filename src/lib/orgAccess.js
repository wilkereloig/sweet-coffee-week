/*
 * Entrada nominal na organização (Fase 2 do plano de funções, 27/08/2026) —
 * lógica pura, mesmo padrão de adminAccess.js e marcaAccess.js: a lib NÃO
 * importa supabase, `signIn` e `guardar` são injetados.
 *
 * NÃO reimplementa o login por e-mail/senha — `signIn` é a MESMA
 * `signInComSenha` de painel-app/src/lib/marcaApi.js (chama
 * /auth/v1/token?grant_type=password, que não tem nada de específico de
 * marca). Reescrever essa chamada aqui seria a terceira cópia da mesma
 * lógica de rede que o projeto já pagou caro uma vez com `slugificar`
 * (CLAUDE.md §6.10-b). O que MUDA em relação a `entrarComoMarca` é só isto:
 * sem slugificação (o e-mail da equipe é real, digitado direto) e chave de
 * sessão própria — por isso não vale a pena generalizar `entrarComoMarca`
 * para os dois casos; o corpo que sobraria depois de tirar a slugificação é
 * pequeno o bastante pra não valer uma abstração nova.
 *
 * ⚠️ Chave de sessão PRÓPRIA (`scw_org_conta`), diferente de `scw_org`
 * (adminAccess.js, a senha única em texto puro) — formatos incompatíveis,
 * não dá pra reaproveitar a mesma chave (decisão D3 do plano). `App.jsx`
 * confere as duas na inicialização.
 *
 * Sessão em sessionStorage, nunca localStorage — morre com a aba, mesmo
 * motivo de marcaAccess.js.
 *
 * ⚠️ Erro de login é SEMPRE genérico ("E-mail ou senha não conferem.") —
 * nunca diz qual dos dois está errado, mesma regra de marcaAccess.js.
 */

export const CHAVE_SESSAO = 'scw_org_conta'

/**
 * @param {object}   p
 * @param {string}   p.email    e-mail real da pessoa (sem slugificação)
 * @param {string}   p.senha    o que a pessoa digitou
 * @param {Function} p.signIn   (email, senha) => Promise<{data:{session,user},error}>, injetada
 * @param {Function} p.guardar  (chave, valor) => void, injetada (sessionStorage)
 * @returns {Promise<{ok: boolean, erro?: 'vazio'|'credenciais'|'rede'|'sessao'}>}
 */
export async function entrarComoContaOrganizacao({ email, senha, signIn, guardar }) {
  const emailLimpo = String(email == null ? '' : email).trim().toLowerCase()
  const senhaLimpa = String(senha == null ? '' : senha)
  if (!emailLimpo || !senhaLimpa) return { ok: false, erro: 'vazio' }

  let resposta
  try {
    resposta = await signIn(emailLimpo, senhaLimpa)
  } catch {
    return { ok: false, erro: 'rede' }
  }

  const sessao = resposta && resposta.data && resposta.data.session
  if (!sessao || (resposta && resposta.error)) return { ok: false, erro: 'credenciais' }

  const paraGuardar = {
    access_token: sessao.access_token,
    refresh_token: sessao.refresh_token,
    // Instante calculado, não o expires_in cru — mesma conta de marcaAccess.js.
    expira_em: Date.now() + (sessao.expires_in || 3600) * 1000,
    email: (sessao.user && sessao.user.email) || emailLimpo,
  }

  try {
    guardar(CHAVE_SESSAO, JSON.stringify(paraGuardar))
  } catch {
    return { ok: false, erro: 'sessao' }
  }

  return { ok: true }
}

/* Texto por motivo, junto da lógica que o produz (mesmo padrão das outras duas libs). */
export const RECADO = {
  vazio: 'Preencha o e-mail e a senha.',
  credenciais: 'E-mail ou senha não conferem.',
  rede: 'Não deu para conectar agora. Tente de novo em instantes.',
  sessao: 'A senha confere, mas o navegador não deixou guardar a sessão. Tente fora da janela anônima.',
}
