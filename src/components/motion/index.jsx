import React from 'react'
import { useReveal } from '../../hooks/useReveal'

/*
 * KIT DE MOTION — componentes React reusáveis que embrulham as classes do
 * Motion System (src/styles/motion-system.css). Ponto único de aplicação de
 * movimento: em vez de colar `.motion-reveal-up`/`.motion-stagger`/etc. à mão
 * página por página, usa-se estes componentes. Mesma lógica do <Hero>.
 *
 * Não define CSS novo nem novos timings — só aplica as classes/tokens que já
 * existem. prefers-reduced-motion e "anima uma vez" vêm do CSS + useReveal.
 *
 * Todos aceitam `as` (tag/componente), `className` (mesclada) e repassam props
 * extras (onClick, href, aria-*, style…). Doc: SITE_DIRECTION.md (§ Motion).
 */

const REVEAL_CLASS = {
  up: 'motion-reveal-up',
  left: 'motion-reveal-left',
  right: 'motion-reveal-right',
  fade: 'motion-reveal',
  image: 'motion-image-reveal',
}

const cx = (...parts) => parts.filter(Boolean).join(' ')

/* Bloco que revela ao entrar na viewport. `variant`: up|left|right|fade|image. */
export function AnimatedSection({ as: Tag = 'div', variant = 'up', className = '', children, ...rest }) {
  const ref = useReveal()
  return (
    <Tag ref={ref} className={cx(REVEAL_CLASS[variant] || REVEAL_CLASS.up, className)} {...rest}>
      {children}
    </Tag>
  )
}

/* Alias semântico para títulos/textos que revelam (default <p>). */
export function TextReveal({ as = 'p', variant = 'up', ...rest }) {
  return <AnimatedSection as={as} variant={variant} {...rest} />
}

/* Container cujos filhos DIRETOS entram em sequência (CSS .motion-stagger). */
export function StaggerContainer({ as: Tag = 'div', className = '', children, ...rest }) {
  const ref = useReveal()
  return (
    <Tag ref={ref} className={cx('motion-stagger', className)} {...rest}>
      {children}
    </Tag>
  )
}

/* Filho do StaggerContainer. Passthrough: o sequenciamento é por nth-child no
   CSS, então não precisa de classe — existe pela clareza/semântica do markup. */
export function StaggerItem({ as: Tag = 'div', className = '', children, ...rest }) {
  return (
    <Tag className={className} {...rest}>
      {children}
    </Tag>
  )
}

/* Botão/link com press tátil; `hover` liga a elevação de botão. Não altera o
   visual base — combine com .btn/.btn-primary via className. */
export function MotionButton({ as: Tag = 'button', hover = false, className = '', children, ...rest }) {
  return (
    <Tag className={cx('motion-press', hover && 'motion-button-hover', className)} {...rest}>
      {children}
    </Tag>
  )
}

/* Card com elevação suave no hover. */
export function MotionCard({ as: Tag = 'div', className = '', children, ...rest }) {
  return (
    <Tag className={cx('motion-card-hover', className)} {...rest}>
      {children}
    </Tag>
  )
}
