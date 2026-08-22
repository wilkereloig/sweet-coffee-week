/*
 * Entrada no painel da organização — lógica pura.
 *
 * Mesmo padrão dos três formulários do site (§4.1): a lib NÃO importa supabase,
 * a função `rpc` é injetada. Isso a torna testável sem rede e sem cliente.
 *
 * ⚠️ Regra que vale como as dos formulários: **nunca afirmar que entrou se o
 * banco não confirmou.** Só `admin_ping === true` abre a porta; qualquer outra
 * coisa — false, null, erro de rede — devolve `ok: false` com o motivo.
 *
 * COMO A SESSÃO FUNCIONA, e por que isto não inventa mecanismo nenhum:
 * o painel `public/organizacao/` já lê `sessionStorage.getItem('scw_org')` na
 * abertura e, se achar a senha lá, monta o painel direto — é o próprio
 * formulário de login dele que grava essa chave depois de um `admin_ping`
 * bem-sucedido. Esta lib faz exatamente os mesmos dois passos, só que a partir
 * do diálogo do site. Mesma origem, mesma aba, mesma chave: nada novo é
 * exposto, e a senha continua morrendo com a aba (sessionStorage, não local).
 *
 * O banco guarda só o hash (`admin_config` / `set_admin_secret`), então a senha
 * não é recuperável e não trafega para lugar nenhum além da própria RPC.
 */

export const CHAVE_SESSAO = 'scw_org'

/**
 * @param {object}   p
 * @param {string}   p.senha    o que a pessoa digitou
 * @param {Function} p.rpc      (nome, corpo) => Promise<any>, injetada
 * @param {Function} p.guardar  (chave, valor) => void, injetada (sessionStorage)
 * @returns {Promise<{ok: boolean, erro?: 'vazio'|'senha'|'rede'|'sessao'}>}
 */
export async function entrarNaOrganizacao({ senha, rpc, guardar }) {
  const limpa = String(senha == null ? '' : senha).trim()
  if (!limpa) return { ok: false, erro: 'vazio' }

  let resposta
  try {
    resposta = await rpc('admin_ping', { p_secret: limpa })
  } catch {
    return { ok: false, erro: 'rede' }
  }

  /* Estritamente `true`. A RPC devolve booleano; qualquer outra coisa é "não". */
  if (resposta !== true) return { ok: false, erro: 'senha' }

  try {
    guardar(CHAVE_SESSAO, limpa)
  } catch {
    /* Janela anônima ou armazenamento bloqueado: a senha CONFERE, mas o painel
       não vai encontrá-la do outro lado. Dizer isso é melhor que mandar a
       pessoa para uma tela de login que ela acabou de passar. */
    return { ok: false, erro: 'sessao' }
  }

  return { ok: true }
}

/* Texto por motivo. Fica aqui, junto da lógica, para a mensagem não se perder
   do caso que a produziu. */
export const RECADO = {
  vazio: 'Digite a senha para entrar.',
  senha: 'Senha incorreta. Confira e tente de novo.',
  rede: 'Não deu para conferir a senha agora. Veja a conexão e tente de novo.',
  sessao: 'A senha confere, mas o navegador não deixou guardar a sessão. Tente fora da janela anônima.',
}
