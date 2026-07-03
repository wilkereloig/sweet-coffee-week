import React from 'react'
import { AnimatedSection } from '../motion'

/*
 * CTASection — bloco de fechamento/chamada (banda + coluna central: título,
 * texto e ações). Reproduz o padrão hoje repetido (.contato-live, .participar-
 * close, .cur-cta…): <section className="section X"><div className="wrap ..__inner">.
 *
 * Por padrão o miolo revela ao entrar na viewport (AnimatedSection, Motion
 * System) — sem animação NOVA, usa o reveal que já existe. `reveal={false}`
 * desliga. Estilo base em src/styles/layout.css (.cta-block), só tokens.
 */
const cx = (...parts) => parts.filter(Boolean).join(' ')

export function CTASection({
  as: Tag = 'section',
  className = '',
  innerClassName = '',
  reveal = true,
  children,
  ...rest
}) {
  const innerCls = cx('wrap', 'cta-block__inner', innerClassName)
  return (
    <Tag className={cx('section', 'cta-block', className)} {...rest}>
      {reveal
        ? <AnimatedSection className={innerCls}>{children}</AnimatedSection>
        : <div className={innerCls}>{children}</div>}
    </Tag>
  )
}
