/*
 * Assinatura de patrocínio: "Patrocínio" + logo oficial do Sicredi, em linha própria sobre branco (versão preferencial,
 * sem box, sem rotação, sombra ou contorno). Um componente só, no topo da entrada, do catálogo, da ficha da casa e do mapa
 * (05/11/2026, pedido do Wilker); não é fixa na tela e não repete por seção.
 * A faixa completa de marcas continua antes do rodapé (Marcas.jsx).
 */
import React from 'react'
import { MARCAS_PARCEIROS as M } from '../../../data/imageLibrary'
import { MARCAS as T } from '../../cartoon/textos.js'
import { Botao } from './pecas.jsx'
import { LinkDaCampanha, useCampanha } from '../../caca/campanha/Campanha.jsx'
import { IconeCartoon } from './IconeCartoon.jsx'
import { CAMPANHA, TEXTOS_CAMPANHA as TC, prazoCurto } from '../../caca/campanha/terComQuemContar.js'

/** A assinatura apresenta o patrocínio e, enquanto estiver aberta, a campanha do Sicredi. */
export function AssinaturaPatrocinio ({ navigate, destaque = false }) {
  const s = M.sicredi
  const campanha = useCampanha()
  if (!destaque) return (
    <aside className="ct-assina-patrocinio" aria-label={T.patrocinio}>
      <p className="ct-assina-patrocinio__rotulo">{T.patrocinio}</p>
      <img src={s.src} alt={s.alt} width={s.largura} height={s.altura} decoding="async" />
      {navigate && <LinkDaCampanha navigate={navigate} className="ct-assina-patrocinio__campanha" />}
    </aside>
  )
  return (
    <section className="ct-assina-patrocinio ct-assina-patrocinio--destaque" aria-label={T.patrocinio}>
      <div className="ct-assina-patrocinio__marca">
        <p className="ct-assina-patrocinio__rotulo">{T.patrocinio}</p>
        <img src={s.src} alt={s.alt} width={s.largura} height={s.altura} decoding="async" />
      </div>
      {campanha.aberta && (
        <div className="ct-assina-patrocinio__promocao" aria-label={TC.rotulo}>
          <div className="ct-assina-patrocinio__chamada">
            <p className="ct-assina-patrocinio__selo">{TC.rotulo}</p>
            <h2 className="ct-assina-patrocinio__titulo">{CAMPANHA.historias} pares de vouchers para {CAMPANHA.historias} histórias</h2>
            <p className="ct-assina-patrocinio__nome">{TC.titulo}</p>
            <p className="ct-assina-patrocinio__texto">{TC.bloco.disputa}</p>
            <p className="ct-assina-patrocinio__prazo">{prazoCurto(campanha)}</p>
          </div>
          <div className="ct-assina-patrocinio__premios"><IconeCartoon nome="vouchers" tamanho={64} /><ul className="ct-assina-patrocinio__numeros" aria-label="O que você pode ganhar">
            {TC.dados.map((d) => <li key={d.rotulo}><b>{d.numero}</b><span>{d.rotulo}</span></li>)}
          </ul></div>
          <Botao tipo="secundario" href={CAMPANHA.caminho} navigate={navigate}>{TC.bloco.ver}</Botao>
        </div>
      )}
    </section>
  )
}
