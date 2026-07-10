import React from 'react'
import { I } from './icons'

/*
 * Tab bar inferior — navegação primária do mobile (só ≤959px; display:none no
 * desktop via CSS). 5 destinos que o site REALMENTE tem hoje; o 5º ("Menu") abre
 * o menu full-screen. Aba ativa acende no --page-accent da rota (body.route-*).
 * Stateless: recebe rota + navigate + onOpenMenu. Spec:
 * docs/superpowers/specs/2026-07-10-mobile-tabbar-nav-design.md
 */
const TABS = [
  { id: 'home',             label: 'Início',     href: '/',            Icon: I.home },
  { id: 'edicoes',          label: 'Edições',    href: '/edicoes',     Icon: I.cal },
  { id: 'historico-awards', label: 'Awards',     href: '/sweet-awards', Icon: I.star },
  { id: 'participar',       label: 'Participar', href: '/participar',  Icon: I.plate },
  { id: 'menu',             label: 'Menu',       action: 'menu',       Icon: I.menu },
]

export function MobileTabBar({ route, navigate, onOpenMenu, menuOpen }) {
  return (
    <nav className="mobile-tabbar" aria-label="Navegação principal">
      {TABS.map((t) => {
        const active = t.action === 'menu' ? menuOpen : route === t.id
        const cls = `mobile-tabbar__item${active ? ' is-active' : ''}`
        const inner = (
          <>
            <span className="mobile-tabbar__icon"><t.Icon width={22} height={22} /></span>
            <span className="mobile-tabbar__label">{t.label}</span>
          </>
        )
        if (t.action === 'menu') {
          return (
            <button key={t.id} type="button" className={cls} onClick={onOpenMenu}
                    aria-haspopup="dialog" aria-expanded={!!menuOpen}>
              {inner}
            </button>
          )
        }
        return (
          <a key={t.id} href={`#${t.href}`} className={cls}
             aria-current={active ? 'page' : undefined}
             onClick={(e) => { e.preventDefault(); navigate(t.href) }}>
            {inner}
          </a>
        )
      })}
    </nav>
  )
}
