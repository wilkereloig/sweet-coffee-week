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
            <h2 className="ct-assina-patrocinio__titulo">Sua história pode ganhar um par de vouchers!</h2>
            <p className="ct-assina-patrocinio__nome">{CAMPANHA.historias} histórias serão escolhidas na campanha {TC.titulo}.</p>
            <aside className="ct-assina-patrocinio__beneficio" aria-labelledby="sicredi-carimbo-titulo">
              <span className="ct-assina-patrocinio__beneficio-simbolo" aria-hidden="true"><span>S</span><i>✦</i></span>
              <div className="ct-assina-patrocinio__beneficio-conteudo">
                <p className="ct-assina-patrocinio__beneficio-rotulo">GANHE TAMBÉM</p>
                <h3 id="sicredi-carimbo-titulo">Carimbo Sicredi no seu mapa</h3>
                <p>Envie o print da publicação. Com a aprovação da organização, o carimbo entra no seu mapa.</p>
                <p className="ct-assina-patrocinio__beneficio-valor"><span aria-hidden="true">✓</span> Vale para o ranking e o sorteio final</p>
                <p className="ct-assina-patrocinio__beneficio-nota">É um carimbo especial, separado das visitas às casas.</p>
              </div>
            </aside>
            <p className="ct-assina-patrocinio__prazo">{prazoCurto(campanha)}</p>
            <Botao tipo="secundario" href={CAMPANHA.caminho} navigate={navigate}>Como participar</Botao>
          </div>
          {/* Compacto (auditoria da Home, 11/11): o vídeo fica atrás de um botão; só carrega quando a pessoa abre. */}
          <details className="ct-assina-patrocinio__video-abrir">
            <summary className="ct-botao ct-botao--contorno">Assistir ao vídeo da campanha</summary>
            <figure className="ct-assina-patrocinio__video">
              <video controls playsInline preload="none" poster={CAMPANHA.video.capa} width={CAMPANHA.video.largura} height={CAMPANHA.video.altura} aria-label={TC.videoRotulo}>
                <source src={CAMPANHA.video.src} type="video/mp4" />
                {TC.videoSemSuporte} <a href={CAMPANHA.video.src}>{TC.videoBaixar}</a>.
              </video>
              <figcaption>Assista ao vídeo da campanha</figcaption>
            </figure>
          </details>
          <div className="ct-assina-patrocinio__passos">
            <IconeCartoon nome="vouchers" tamanho={64} />
            <p className="ct-assina-patrocinio__passos-titulo">Para participar</p>
            <ol>
              <li>Grave um vídeo contando com quem você pôde contar.</li>
              <li>Publique no feed do Instagram até {CAMPANHA.fimCurto}.</li>
            </ol>
            <p className="ct-assina-patrocinio__nota">Confira as regras completas no botão.</p>
          </div>
        </div>
      )}
    </section>
  )
}
