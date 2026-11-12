/*
 * Os dados do "O que você disputa", num hook só: a leitura dos prêmios (uma vez, sem sondagem por minuto), a campanha do Sicredi, o dia de Fortaleza
 * e a situação de quem joga. Quem usa: o pop-up diário (PopupDisputa) e a tela de boas-vindas de quem ainda não tem mapa (BoasVindas) — as duas
 * mostram a mesma coisa, da mesma fonte (12/11/2026: a segunda cópia virou este arquivo, CLAUDE.md §5.3).
 * Devolve { lido: 'carregando' | 'pronto' | 'falha', campanha, hojeIso, disputa } — `disputa` é o `montarDisputa` de logica.js.
 */
import { useAgora } from '../../cartoon/useAgora.js'
import { situacaoDoJogador } from '../premios/logica.js'
import { usarPremios } from '../premios/usarPremios.js'
import { useCampanha } from '../campanha/Campanha.jsx'
import { diaEmFortaleza } from '../campanha/terComQuemContar.js'
import { montarDisputa } from './logica.js'

export function useDisputa (caca, totalDaEdicao = 0) {
  const { estado: lido, dado } = usarPremios(caca.api, { refrescar: false })
  const campanha = useCampanha()
  const hojeIso = diaEmFortaleza(useAgora(60000))
  const jogador = situacaoDoJogador(caca.estado === 'pronto' ? caca.mapa : null, totalDaEdicao)
  const disputa = montarDisputa({ premios: dado, campanha, jogador, estado: caca.estado, email: caca.email, hojeIso })
  return { lido, campanha, hojeIso, disputa }
}
