/*
 * HeroFotos — as fotos de fundo de um herói institucional, em crossfade.
 *
 * Nasceu da terceira cópia: o herói da Home já fazia isso desde o redesign, o
 * Sweet Awards passou a fazer em 21/08/2026 e Participar/Apoiar entraram na
 * sequência. Em vez de repetir o mesmo `setInterval` e o mesmo mapa de camadas
 * em cada página, a peça vive aqui (§5.3 — ao ver a 2ª cópia, extraia).
 *
 * A Home NÃO usa este componente: o herói dela tem classe própria, respiração
 * na propriedade `scale` e enquadramento em `--pos`, e a página-mãe não se
 * mexe sem pedido (A6). Quando alguém for encostar nela, é aqui que ela cai.
 *
 * Cada camada manda o enquadramento como custom property em vez de resolver um
 * valor só: `bgStyle()` decide entre desktop e celular na hora, e style inline
 * vence media query — o mesmo tropeço registrado no §10.4 do CLAUDE.md. Assim
 * quem escolhe é o CSS.
 *
 * Acessibilidade: só a camada visível carrega `role="img"` e o alt; as outras
 * são `aria-hidden`. Um leitor de tela nunca ouve seis descrições de fundo.
 */

import React from 'react'

/* Mesmo intervalo do herói da Home. Duração que já existe no sistema, não um
   tempo novo (§6.15 — "nada de curva ou duração nova"). */
const INTERVALO = 6200

const semMovimento = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * @param {object}   props
 * @param {Array}    props.fotos     itens de `heroPhotos(rota)` (src, alt, position, mobilePosition)
 * @param {string}   [props.classe]  classe do container; o padrão é a banda do sistema
 */
export function HeroFotos({ fotos, classe = 'scw-hero-banda' }) {
  const [ativa, setAtiva] = React.useState(0)

  React.useEffect(() => {
    /* Uma foto só não é crossfade: não vale acordar um timer para nada. */
    if (semMovimento() || fotos.length < 2) return
    const t = setInterval(() => setAtiva((i) => (i + 1) % fotos.length), INTERVALO)
    return () => clearInterval(t)
  }, [fotos.length])

  if (!fotos.length) return null

  return (
    <div className={classe}>
      {fotos.map((foto, i) => (
        <span
          key={foto.src}
          className={'scw-hero-banda__foto' + (i === ativa ? ' is-ativa' : '')}
          style={{
            backgroundImage: `url("${foto.src}")`,
            '--foco': foto.position || 'center',
            '--foco-mobile': foto.mobilePosition || foto.position || 'center',
          }}
          role={i === ativa ? 'img' : undefined}
          aria-label={i === ativa ? foto.alt : undefined}
          aria-hidden={i === ativa ? undefined : 'true'}
        />
      ))}
    </div>
  )
}

export default HeroFotos
