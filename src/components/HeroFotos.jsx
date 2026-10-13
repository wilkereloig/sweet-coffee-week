/*
 * HeroFotos — as fotos de fundo de um herói institucional, em crossfade.
 *
 * O RELÓGIO mora em `useCrossfade` (hooks/useCrossfade.js), compartilhado com a
 * abertura da Home: índice válido, próxima foto decodificada antes da troca,
 * pausa com a aba oculta, `prefers-reduced-motion` escutado ao vivo e pausa
 * manual. Aqui fica só a COMPOSIÇÃO da banda.
 *
 * Cada camada manda o enquadramento como custom property em vez de resolver um
 * valor só: style inline vence media query (§10.4), então quem escolhe entre o
 * enquadramento do celular e o do desktop é o CSS.
 *
 * Carga: só pedem `background-image` a camada visível, as já vistas e a
 * PRÓXIMA (um intervalo inteiro antes de aparecer). As camadas seguem montadas
 * — sai do fluxo o download, não o elemento —, então não há salto de layout.
 *
 * Acessibilidade: só a camada visível carrega `role="img"` e o alt; as outras
 * são `aria-hidden`. Com rotação, um botão de pausa só com ícone (§6.11: o nome
 * aparece no hover/foco e é o nome acessível).
 */

import React from 'react'
import { fotoAte, LARGURA_HEROI_MOBILE } from '../data/imageLibrary'
import { useCrossfade } from '../hooks/useCrossfade'
import ScwIcon from './scw-icons/ScwIcon'

/* Mesmo corte do CSS (.scw-hero-banda__foto): acima de 1000px o original. */
const ehDesktop = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' &&
  window.matchMedia('(min-width: 1001px)').matches

/** Botão de pausa das séries em crossfade — o mesmo na banda e na Home. */
export function PausaFotos({ pausado, alternar, className = '' }) {
  const rotulo = pausado ? 'Retomar a troca de fotos' : 'Pausar a troca de fotos'
  return (
    <button
      type="button"
      className={`scw-pausa-fotos scw-icone-rotulo scw-icone-rotulo--esquerda ${className}`.trim()}
      onClick={alternar}
      aria-pressed={pausado}
      aria-label={rotulo}
      data-rotulo={rotulo}
    >
      <ScwIcon nome={pausado ? 'ui/play' : 'ui/pausa'} tamanho={20} />
    </button>
  )
}

/**
 * @param {object}   props
 * @param {Array}    props.fotos     itens de `heroPhotos(rota)` (src, alt, position, mobilePosition)
 * @param {string}   [props.classe]  classe do container; o padrão é a banda do sistema
 */
export function HeroFotos({ fotos = [], classe = 'scw-hero-banda' }) {
  const urlDe = React.useCallback(
    (i) => (fotos[i] ? (ehDesktop() ? fotos[i].src : fotoAte(fotos[i].src, LARGURA_HEROI_MOBILE)) : null),
    [fotos],
  )
  const { ativa, pedidas, reduzido, pausado, alternarPausa, temRotacao } = useCrossfade(fotos.length, { urlDe })

  if (!fotos.length) return null

  /* Sem movimento, sem crossfade: uma camada só — e a página baixa UMA foto.
     (Com todas montadas e `opacity: 1` pela salvaguarda, aparecia a última do
     DOM, não a ativa.) */
  const camadas = reduzido ? fotos.slice(0, 1) : fotos

  /* O botão de pausa existe em dois lugares, um por tela (o outro some com
     `display: none`, que também o tira da árvore de acessibilidade):
     - ≤1000px a foto é um bloco no topo do herói e o botão mora nela;
     - >1000px a banda é fundo SOB o véu do herói (.scw-hero-veu::after), num
       contexto de empilhamento próprio — dentro dela o botão ficaria embaixo
       do véu, desbotado. Ali ele é irmão da banda, no contexto do herói. */
  return (
    <>
    <div className={classe}>
      {camadas.map((foto, i) => (
        <span
          key={foto.src}
          className={'scw-hero-banda__foto' + (i === ativa ? ' is-ativa' : '')}
          style={{
            '--foto': pedidas[i] ? `url("${foto.src}")` : undefined,
            '--foto-mobile': pedidas[i] ? `url("${fotoAte(foto.src, LARGURA_HEROI_MOBILE)}")` : undefined,
            '--foco': foto.position || 'center',
            '--foco-mobile': foto.mobilePosition || foto.position || 'center',
          }}
          role={i === ativa ? 'img' : undefined}
          aria-label={i === ativa ? foto.alt : undefined}
          aria-hidden={i === ativa ? undefined : 'true'}
        />
      ))}
      {temRotacao && <PausaFotos pausado={pausado} alternar={alternarPausa} className="scw-pausa-fotos--na-banda" />}
    </div>
    {temRotacao && <PausaFotos pausado={pausado} alternar={alternarPausa} className="scw-pausa-fotos--no-heroi" />}
    </>
  )
}

export default HeroFotos
