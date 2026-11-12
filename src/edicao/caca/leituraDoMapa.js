/*
 * O que fazer com a chave do aparelho quando o banco responde à leitura do mapa (lógica pura, testada em tests/cartoon-caca-regras.test.mjs).
 *
 * Regra de ouro (12/11/2026, pedido do Wilker: "os dados salvos têm que ficar salvos; não quero que as pessoas tenham que entrar e recuperar de novo"):
 * a chave guardada no aparelho NUNCA se perde por uma resposta só, nem por erro de rede, nem por banco fora do ar. Só vira "sem mapa" depois de o banco
 * dizer "desconhecida" DUAS vezes seguidas — e mesmo então ela vai para a quarentena (carimbo.js › soltarChave), de onde o aparelho a tenta de novo.
 *
 *   abrir   o banco devolveu o mapa
 *   falha   erro de rede, banco lento ou fora do ar (qualquer motivo que não seja "desconhecida"): a chave fica e o mapa tenta de novo
 *   voltar  acabou de entrar uma chave nova (colada, recuperada) que o banco não conhece: volta à que o aparelho já tinha
 *   reler   primeira resposta "desconhecida" para esta chave: espera um instante e pergunta de novo, antes de largar o mapa
 *   soltar  segunda resposta "desconhecida" seguida: a chave sai do lugar de chave ativa e vai para a quarentena; aparece a recuperação
 *   segurar a chave era a da quarentena (segunda chance) e o banco ainda não a conhece: segue na quarentena até vencer, sem aviso de "chave trocada"
 */
export function aposLeitura ({ ok = false, motivo = '', duvidas = 0, volta = null, chave = null, daQuarentena = false } = {}) {
  if (ok) return 'abrir'
  if (motivo !== 'mapa_desconhecido') return 'falha'
  if (volta && volta !== chave) return 'voltar'
  if (daQuarentena) return 'segurar'
  return duvidas < 1 ? 'reler' : 'soltar'
}

/** Espera entre a primeira resposta "desconhecida" e a pergunta de confirmação. */
export const ESPERA_CONFIRMACAO_MS = 2500
