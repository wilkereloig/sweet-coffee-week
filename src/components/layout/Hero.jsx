import React from 'react'

/*
 * HERO institucional ÚNICO — fim dos 7 heros bespoke com <style> inline.
 * FONTE ÚNICA do hero: mudar a aparência de TODOS os heros institucionais =
 * editar este componente + src/styles/hero.css. Nada de ajustar página por página.
 *
 * FORA deste componente (por design):
 *  - Home (§9, página-mãe, não se mexe) → mantém .swc-hero.
 * (Edições agora USA este componente: só o corpo horizontal é auto-contido; a
 *  hero segue o padrão institucional — fundo no acento da rota + tinta escura.)
 *
 * variant:
 *  - 'accent'    → fundo = --page-accent (cor do item ativo do menu), texto --ink.
 *                  [PADRÃO — reproduz o que renderiza hoje: faixa no acento + tinta escura]
 *  - 'chocolate' → fundo chocolate #2B1810, texto creme.
 *
 * Respeita a zona de segurança header↔hero (--hero-content-start, §4.1) e a
 * margem canônica .wrap (§4). Slots opcionais:
 *  - actions: CTAs/links abaixo do texto;
 *  - aside:   form/mídia — ATIVA layout 2 colunas (empilha no mobile);
 *  - seal:    selo decorativo;
 *  - children: conteúdo extra na coluna de copy (ex.: fotos/shots).
 */
export function Hero({
  variant = 'accent',
  title,
  subtitle,
  actions,
  aside,
  seal,
  className = '',
  children,
}) {
  const hasAside = !!aside
  const classes = ['hero', `hero--${variant}`, hasAside && 'hero--split', className]
    .filter(Boolean)
    .join(' ')
  return (
    <section className={classes}>
      {seal ? <div className="hero__seal" aria-hidden="true">{seal}</div> : null}
      <div className="wrap hero__inner motion-reveal-up">
        <div className="hero__copy">
          {title ? <h1 className="hero__title">{title}</h1> : null}
          {Array.isArray(subtitle)
            ? subtitle.map((s, i) => <p className="hero__lead" key={i}>{s}</p>)
            : subtitle
              ? <p className="hero__lead">{subtitle}</p>
              : null}
          {children}
          {actions ? <div className="hero__actions">{actions}</div> : null}
        </div>
        {hasAside ? <div className="hero__aside">{aside}</div> : null}
      </div>
    </section>
  )
}

/*
 * Destaque itálico sublinhado do título — unifica cur-hl / participar-hl /
 * apoiar-hl / contato-hl / hist-hl numa peça só (.hero__hl).
 * `color` recebe um token da paleta, ex.: color="var(--pink)".
 */
export function HeroHL({ color, children }) {
  return (
    <span className="hero__hl" style={color ? { '--hl': color } : undefined}>
      {children}
    </span>
  )
}
