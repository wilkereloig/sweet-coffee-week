/*
 * "Sair" e a troca de conta apagam os rascunhos do Social media deste navegador (sessionStorage): sem isso, a próxima
 * pessoa que entra na mesma aba abre a postagem e recebe "Recuperei alterações" com o texto da anterior (achado da
 * auditoria de 21/10/2026). Módulo sem dependências de propósito: o App o importa sem puxar o módulo de Redes.
 */
export const PREFIXO_RASCUNHO = 'scw_redes_rascunho' // `scw_redes_rascunho_<id>` e `scw_redes_rascunho_novo`
export const CHAVE_NOVA_POSTAGEM = 'scw_social_nova_postagem'

export function limparRascunhosSocial(st = typeof sessionStorage !== 'undefined' ? sessionStorage : null) {
  if (!st) return
  try {
    for (const k of Object.keys(st)) if (k.startsWith(PREFIXO_RASCUNHO) || k === CHAVE_NOVA_POSTAGEM) st.removeItem(k)
  } catch { /* armazenamento indisponível: nada a limpar */ }
}
