/*
 * HeroFotos — a área fotográfica de um herói institucional, em crossfade.
 *
 * O RELÓGIO mora em `useCrossfade` (hooks/useCrossfade.js), compartilhado com a
 * abertura da Home: índice válido, próxima foto decodificada antes da troca,
 * pausa com a aba oculta, `prefers-reduced-motion` escutado ao vivo e pausa
 * manual. A GEOMETRIA mora em scw-2026.css (.scw-heroi-foto / .scw-hero-banda):
 * faixa compacta no topo até 1000px, área à direita acima disso (14/10/2026).
 *
 * Cada camada é um <img> com srcset + sizes (resolvedor central,
 * imageLibrary): o navegador escolhe a variante pela largura REAL da área e
 * pela densidade da tela — nada de esticar a variante de 960px nem de baixar o
 * original no celular. O enquadramento vai como custom property (--foco e
 * --foco-mobile) porque style inline vence media query (§10.4); quem escolhe
 * entre os dois é o CSS (object-position).
 *
 * Carga: só ganham `src` a camada visível, as já vistas e a PRÓXIMA. As
 * camadas seguem montadas e a caixa tem proporção fixa, então a troca não
 * mexe no tamanho do herói.
 *
 * Acessibilidade: só a camada visível tem alt; as outras são `aria-hidden`.
 * Com rotação, um botão de pausa só com ícone, dentro da área da foto (§6.11).
 */

import React from 'react'
import { fotoAte, srcSet, SIZES } from '../data/imageLibrary'
import { useCrossfade } from '../hooks/useCrossfade'
import ScwIcon from './scw-icons/ScwIcon'

/* Largura em pixels de tela que a área pede agora — a largura REAL da caixa
   (medida, não suposta), para o pré-carregamento
   do relógio baixar o MESMO arquivo que o <img> escolhe pelo `sizes`. */
function larguraPedida (caixa) {
  if (typeof window === 'undefined') return 960
  const css = (caixa && caixa.clientWidth) || window.innerWidth
  return Math.ceil(css * (window.devicePixelRatio || 1))
}

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
      <ScwIcon nome={pausado ? 'play' : 'pausa'} tamanho={20} />
    </button>
  )
}

/**
 * @param {object}   props
 * @param {Array}    props.fotos     itens de `heroPhotos(rota)` (src, alt, position, mobilePosition)
 * @param {string}   [props.classe]  classe do container; o padrão é a área do sistema
 */
export function HeroFotos({ fotos = [], classe = 'scw-hero-banda' }) {
  const caixa = React.useRef(null)
  const urlDe = React.useCallback(
    (i) => (fotos[i] ? fotoAte(fotos[i].src, larguraPedida(caixa.current)) : null),
    [fotos],
  )
  const { ativa, pedidas, reduzido, pausado, alternarPausa, temRotacao } = useCrossfade(fotos.length, { urlDe })

  if (!fotos.length) return null

  /* Sem movimento, sem crossfade: uma camada só — e a página baixa UMA foto. */
  const camadas = reduzido ? fotos.slice(0, 1) : fotos

  return (
    <div className={classe} ref={caixa}>
      {camadas.map((foto, i) => {
        const visivel = i === ativa || reduzido
        return (
          <img
            key={foto.src}
            className={'scw-hero-banda__foto' + (visivel ? ' is-ativa' : '')}
            src={pedidas[i] || reduzido ? foto.src : undefined}
            srcSet={pedidas[i] || reduzido ? srcSet(foto.src) : undefined}
            sizes={SIZES.heroi}
            alt={visivel ? foto.alt : ''}
            aria-hidden={visivel ? undefined : 'true'}
            decoding="async"
            fetchPriority={i === 0 ? 'high' : undefined}
            style={{
              '--foco': foto.position || 'center',
              '--foco-mobile': foto.mobilePosition || foto.position || 'center',
            }}
          />
        )
      })}
      {temRotacao && !reduzido && <PausaFotos pausado={pausado} alternar={alternarPausa} />}
    </div>
  )
}

export default HeroFotos
