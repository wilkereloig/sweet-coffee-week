/*
 * Canais oficiais do festival — FONTE ÚNICA.
 * Antes duplicado em 4 arquivos (SiteFooter, Participar, Apoiar, Contato).
 * Mudar handle/URL do Instagram = editar só aqui.
 */
export const INSTAGRAM_HANDLE = '@sweetcoffeeweek'
export const INSTAGRAM_URL = 'https://instagram.com/sweetcoffeeweek'

/*
 * Responsável e canal de privacidade — confirmados pelo Wilker em 13/10/2026.
 * O mesmo e-mail já era o contato da F2 no site (seção Realização da Home) e o
 * destino de reserva do pré-cadastro estático. ⚠️ `/quero-participar/` é página
 * estática fora do bundle e repete o endereço em `CONFIG.emailDestino`: mudou
 * aqui, muda lá no mesmo commit.
 * Não há encarregado (DPO) nomeado: não identificar pessoa sem confirmação.
 */
export const RESPONSAVEL = {
  razaoSocial: 'F2 EXPERIENCE LIVE MARKETING LTDA',
  nome: 'F2 Experience',
  cnpj: '26.723.343/0001-78',
}
export const CONTATO_EMAIL = 'contato@fabrica2.com.br'
export const PRIVACIDADE_ASSUNTO = 'Privacidade — Sweet & Coffee Week'
export const PRIVACIDADE_MAILTO =
  `mailto:${CONTATO_EMAIL}?subject=${encodeURIComponent(PRIVACIDADE_ASSUNTO)}`

/* Pedido de retirada de imagem (13/10/2026): mesmo canal, assunto próprio
   para a equipe separar dos demais. */
export const IMAGEM_ASSUNTO = 'Retirada de imagem — Sweet & Coffee Week'
export const IMAGEM_MAILTO =
  `mailto:${CONTATO_EMAIL}?subject=${encodeURIComponent(IMAGEM_ASSUNTO)}`
