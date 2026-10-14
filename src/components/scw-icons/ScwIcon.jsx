import INTERFACE from './gerado/interface'
import EXPRESSIVA from './gerado/expressiva'
import { criarIcone } from './registro'

/**
 * Ícone do festival (v3, 14/10/2026) — as duas famílias.
 *   <ScwIcon nome="cupcake" tamanho={48} />   expressivo (32 · 48 · 64)
 *   <ScwIcon nome="busca" tamanho={20} />     interface (16 · 20 · 24)
 * O tamanho escolhe a família; nomes antigos (ui/…, doces/…) valem por alias.
 * Cor sempre do contexto (currentColor). Decorativo por padrão; com `titulo`
 * vira imagem acessível. Na casca do site (menu, abas, rodapé) use `IconeUi`,
 * que não carrega a família expressiva.
 */
const ScwIcon = criarIcone({ interface: INTERFACE, expressiva: EXPRESSIVA }, 24)
export default ScwIcon
