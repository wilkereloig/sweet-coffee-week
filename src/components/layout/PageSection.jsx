import React from 'react'

/*
 * PageSection — seção institucional padrão: banda vertical (.section, ritmo
 * --sp-section) + container canônico (.wrap, largura/gutter da Home, §4).
 * Reproduz exatamente o padrão hoje escrito à mão em toda página:
 *   <section className="section X"><div className="wrap">…</div></section>
 *
 * `className` acresce à banda; `wrapClassName` ao container. `wrap={false}`
 * para seções que precisam de container próprio (ex.: full-bleed). Não muda
 * visual — só remove a repetição da dupla section/wrap.
 */
const cx = (...parts) => parts.filter(Boolean).join(' ')

export function PageSection({
  as: Tag = 'section',
  className = '',
  wrap = true,
  wrapClassName = '',
  children,
  ...rest
}) {
  const content = wrap ? <div className={cx('wrap', wrapClassName)}>{children}</div> : children
  return (
    <Tag className={cx('section', className)} {...rest}>
      {content}
    </Tag>
  )
}
