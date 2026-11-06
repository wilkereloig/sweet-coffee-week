/*
 * Assinatura de patrocínio: "Patrocínio" + logo oficial do Sicredi, em linha própria sobre branco (versão preferencial,
 * sem box, sem rotação, sombra ou contorno). Um componente só, no topo da entrada, do catálogo, da ficha da casa e do mapa
 * (05/11/2026, pedido do Wilker); não é fixa na tela e não repete por seção.
 * A faixa completa de marcas continua antes do rodapé (Marcas.jsx).
 */
import React from 'react'
import { MARCAS_PARCEIROS as M } from '../../../data/imageLibrary'
import { MARCAS as T } from '../../cartoon/textos.js'
import { LinkDaCampanha } from '../../caca/campanha/Campanha.jsx'

/** `navigate` (só na entrada): junta um link de texto para a campanha Ter com quem contar enquanto ela estiver no prazo. */
export function AssinaturaPatrocinio ({ navigate }) {
  const s = M.sicredi
  return (
    <aside className="ct-assina-patrocinio" aria-label={T.patrocinio}>
      <p className="ct-assina-patrocinio__rotulo">{T.patrocinio}</p>
      <img src={s.src} alt={s.alt} width={s.largura} height={s.altura} decoding="async" />
      {navigate && <LinkDaCampanha navigate={navigate} className="ct-assina-patrocinio__campanha" />}
    </aside>
  )
}
