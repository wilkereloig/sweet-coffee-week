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
 * O painel guarda esta sessão no aparelho até "Sair"
 * (painel-app/src/lib/sessaoGuardada.js, 02/10/2026).
 *
 * ⚠️ Erro de login é SEMPRE genérico ("E-mail ou senha não conferem.") —
 * nunca diz qual dos dois está errado, mesma regra de marcaAccess.js.
 */

export const CHAVE_SESSAO = 'scw_org_conta'

/*
 * Conta SEM e-mail (01/10/2026, pedido do Wilker): o administrador cria um
 * USUÁRIO curto (ex.: ana.producao) e o Auth guarda <usuario>@DOMINIO_EQUIPE —
 * endereço interno que não recebe mensagem, mesmo arranjo da marca
 * (marcas.sweetcoffeeweek.com.br). Contas antigas com e-mail real continuam
 * entrando pelo e-mail: quem digita "@" está digitando um e-mail.
 * ⚠️ O domínio tem cópia em supabase/functions/criar-conta-organizacao (Deno
 * não importa daqui); tests/orgAccess.test.mjs compara as duas.
 * Sem slugificação: o usuário é VALIDADO (USUARIO_VALIDO), não convertido —
 * converter faria "Ana Produção" e "ana-producao" virarem a mesma conta.
 */
export const DOMINIO_EQUIPE = 'equipe.sweetcoffeeweek.com.br'
export const USUARIO_VALIDO = /^[a-z0-9]+([._-][a-z0-9]+)*$/

/*
 * Login padrão da equipe (02/10/2026, pedido do Wilker): nome e sobrenome
 * juntos + ponto + sigla da função — wilkereloi.adm. Gerado na CRIAÇÃO da
 * conta, nunca no login (lá o usuário é só validado). Trocar a função depois
 * não troca o login: login é fixo.
 */
export const SIGLA_FUNCAO = { administrador: 'adm', curadoria: 'cur', producao: 'prod', comercial: 'com', consulta: 'cons' }

export function usuarioDaEquipe(nome, funcao) {
  const base = String(nome == null ? '' : nome).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const sigla = SIGLA_FUNCAO[funcao] || String(funcao || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 4)
  if (!base || !sigla) return ''
  return base.slice(0, 30 - sigla.length - 1) + '.' + sigla
}

/** O que a pessoa digitou → endereço do Auth. */
export function enderecoDaConta(digitado) {
  const t = String(digitado == null ? '' : digitado).trim().toLowerCase()
  if (!t || t.includes('@')) return t
  return t + '@' + DOMINIO_EQUIPE
}

/** Endereço do Auth → o que mostrar como login (o usuário, sem o domínio interno). */
export function loginDaConta(email) {
  const e = String(email == null ? '' : email)
  const fim = '@' + DOMINIO_EQUIPE
  return e.toLowerCase().endsWith(fim) ? e.slice(0, -fim.length) : e
}

/**
 * @param {object}   p
 * @param {string}   p.email    e-mail real da pessoa (sem slugificação)
 * @param {string}   p.senha    o que a pessoa digitou
 * @param {Function} p.signIn   (email, senha) => Promise<{data:{session,user},error}>, injetada
 * @param {Function} p.guardar  (chave, valor) => void, injetada (sessionStorage)
 * @returns {Promise<{ok: boolean, erro?: 'vazio'|'credenciais'|'rede'|'sessao'}>}
 */
export async function entrarComoContaOrganizacao({ email, senha, signIn, guardar }) {
  const emailLimpo = enderecoDaConta(email)
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
  vazio: 'Preencha o usuário e a senha.',
  credenciais: 'Usuário ou senha não conferem.',
  rede: 'Não deu para conectar agora. Tente de novo em instantes.',
  sessao: 'A senha confere, mas o navegador não deixou guardar a sessão. Tente fora da janela anônima.',
}
