/*
 * Assinatura de patrocínio: "Patrocínio" + logo oficial do Sicredi, em linha própria sobre branco (versão preferencial,
 * sem box, sem rotação, sombra ou contorno). Uma por página da edição Cartoon (05/11/2026; para todas, 11/11/2026 — pedido do Wilker):
 * logo ABAIXO da primeira seção (o herói) nas páginas com herói; no começo nas que abrem sem herói (SEM_HEROI em cartoon/index.jsx).
 * Não é fixa na tela e não repete por seção.
 * A faixa completa de marcas continua antes do rodapé (Marcas.jsx).
 */
import React from 'react'
import { MARCAS_PARCEIROS as M } from '../../../data/imageLibrary'
import { MARCAS as T } from '../../cartoon/textos.js'
import { Botao, Quadro } from './pecas.jsx'
import { Letreiro } from './Letreiro.jsx'
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
  // Redesenho (11/11/2026, Wilker: "essa seção ainda está bem ruim"): painel de gibi da campanha, na língua das peças da
  // edição — fita vermelha do prazo, letreiro, os passos em balões numerados, o vídeo num quadro com fita crepe e o
  // adesivo do carimbo Sicredi. A marca do patrocinador fica no alto, sobre branco (versão preferencial do logo).
  return (
    <section className="ct-sicredi" aria-label={T.patrocinio}>
      <div className="ct-sicredi__marca">
        <p className="ct-assina-patrocinio__rotulo">{T.patrocinio}</p>
        <img src={s.src} alt={s.alt} width={s.largura} height={s.altura} decoding="async" />
      </div>
      {campanha.aberta && (
        <div className="ct-sicredi__painel ct-reticula">
          <div className="ct-sicredi__chamada">
            <p className="ct-sicredi__prazo"><span className="ct-fita-moldura"><span className="ct-fita">{prazoCurto(campanha)}</span></span></p>
            <Letreiro id="ct-sicredi-titulo" apoio="Sua história pode ganhar" texto="um par de vouchers!" cor="vermelho" />
            <p className="ct-sicredi__lead">{CAMPANHA.historias} histórias serão escolhidas na campanha <strong>{TC.titulo}</strong>, do Sicredi.</p>
            <ol className="ct-sicredi__passos">
              <li><span className="ct-sicredi__n" aria-hidden="true">1</span><p>Grave um vídeo contando com quem você pôde contar.</p></li>
              <li><span className="ct-sicredi__n" aria-hidden="true">2</span><p>Publique no feed do Instagram até {CAMPANHA.fimCurto} com {CAMPANHA.hashtag}.</p></li>
              <li><span className="ct-sicredi__n" aria-hidden="true">3</span><p>Mande o print: o <strong>carimbo Sicredi</strong> entra no seu mapa e vale para o ranking e o sorteio final.</p></li>
            </ol>
            <div className="ct-acoes">
              <Botao tipo="acao" href={CAMPANHA.caminho} navigate={navigate}>Como participar</Botao>
            </div>
          </div>
          <figure className="ct-sicredi__video">
            <Quadro className="ct-sicredi__quadro">
              <video controls playsInline preload="none" poster={CAMPANHA.video.capa} width={CAMPANHA.video.largura} height={CAMPANHA.video.altura} aria-label={TC.videoRotulo}>
                <source src={CAMPANHA.video.src} type="video/mp4" />
                {TC.videoSemSuporte} <a href={CAMPANHA.video.src}>{TC.videoBaixar}</a>.
              </video>
            </Quadro>
            <figcaption>Assista ao vídeo da campanha</figcaption>
            <p className="ct-sicredi__adesivo"><IconeCartoon nome="vouchers" tamanho={48} /><span><strong>Ganhe também</strong> o carimbo Sicredi no seu mapa</span></p>
          </figure>
        </div>
      )}
    </section>
  )
}
