import INTERFACE from './gerado/interface'
import { criarIcone } from './registro'

/**
 * Só a família de interface (16 · 20 · 24) — para a casca do site, que carrega
 * em toda página e não precisa dos desenhos gastronômicos. Mesmo contrato do
 * `ScwIcon`: `nome`, `tamanho`, `titulo`, `className`.
 */
const IconeUi = criarIcone({ interface: INTERFACE }, 20)
export default IconeUi
