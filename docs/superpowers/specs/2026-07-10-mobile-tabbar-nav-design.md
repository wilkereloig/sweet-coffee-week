# Arquitetura de navegação mobile — Tab bar global + reconciliação Edições

**Data:** 2026-07-10 · **Branch:** dev/site-completo · **Escopo:** só a fundação de
navegação mobile (tab bar global + convivência com a barra da Edições). Passes por
página (Home, Awards, Curiosidades, Participar/Apoiar/Contato, cards) ficam para
etapas futuras — decisão do Wilke.

## 1. Objetivo

Dar ao mobile uma navegação de produto próprio: tab bar inferior fixa, no alcance do
polegar, com acesso rápido às ações-chave. Substituir o hambúrguer do header (canto
superior) pela aba "Menu" da tab bar. Não é CSS responsivo empilhando desktop — é
navegação específica de celular, componentizada.

## 2. Decisões travadas (aprovadas pelo Wilke)

- **5 abas:** Início (`/`) · Edições (`/edicoes`) · Awards (`/sweet-awards`) ·
  Participar (`/participar`) · **Menu** (abre o menu full-screen existente).
- Destinos mapeiam o que o site **realmente tem** hoje. As páginas públicas da edição
  Lovers (combos/mapa/rota/votação) foram removidas (`App.jsx` redireciona `/lovers/*`
  → home); não entram na tab bar. Reabrir esse fluxo exigiria desarquivar rotas
  congeladas (QR codes) — fora deste escopo.
- **Edições vs tab bar:** a pill de edição (`.edx-tabbar`) **empilha logo acima** da
  tab bar global (duas barras no rodapé, edição em cima, site embaixo).
- Desktop e a estrutura interna da Home **não mudam** (só ganham padding-bottom no
  mobile). Regra §9 do CLAUDE.md preservada.

## 3. Componentes

### 3.1 `MobileTabBar` (novo — `src/components/MobileTabBar.jsx`)

- `<nav>` fixo no rodapé, `role="navigation"`, `aria-label="Navegação principal"`.
- Renderiza 5 itens de uma constante `TABS`:
  ```
  [
    { id: 'home',        label: 'Início',    href: '#/',            icon: I.home },
    { id: 'edicoes',     label: 'Edições',   href: '#/edicoes',     icon: I.cal },
    { id: 'historico-awards', label: 'Awards', href: '#/sweet-awards', icon: I.star },
    { id: 'participar',  label: 'Participar',href: '#/participar',  icon: I.plate },
    { id: 'menu',        label: 'Menu',      icon: I.menu, action: 'menu' },
  ]
  ```
- Item de rota: `<a>` que faz `navigate()`. Item "menu": `<button>` que chama
  `onOpenMenu()`.
- **Ativo:** compara `route` (prop) com `tab.id`. Item ativo recebe classe
  `is-active` → cor = `var(--page-accent)` da rota (já definido em `body.route-*`,
  `styles.css`). Muda de cor por seção, dentro da paleta.
- Props: `{ route, navigate, onOpenMenu }`.
- Sem estado interno (stateless) — re-render barato.

### 3.2 `MobileMenu` (extraído de `SiteHeader`)

- Move o markup do menu full-screen (hoje inline em `nav.jsx`, bloco `mobileOpen &&
  (...)`) para `src/components/MobileMenu.jsx`.
- Props: `{ open, route, navigate, onClose }`. Sem estado próprio.
- Mantém o layout atual (tela cheia, logo, links numerados, acesso, rodapé IG) — só
  vira componente com estado controlado por fora.

### 3.3 `App.jsx` — dono do estado de menu + monta a tab bar

- Sobe o estado `menuOpen` do `SiteHeader` para o `App`.
- Renderiza (nesta ordem, no fim da árvore, só quando `showMobileNav`):
  `<MobileTabBar route onOpenMenu={() => setMenuOpen(true)} navigate />` e
  `<MobileMenu open={menuOpen} route navigate onClose={() => setMenuOpen(false)} />`.
- `SiteHeader` perde o `mobileOpen` e o markup do menu; recebe `onOpenMenu` opcional
  (não usado no mobile — o hambúrguer sai; ver 3.4).

### 3.4 `SiteHeader` (`nav.jsx`) — hambúrguer sai no mobile

- Remove o `<button className="menu-toggle">` e o bloco `mobileOpen && (...)` (movido
  para `MobileMenu`). Remove os `useEffect` de Esc/scroll-lock ligados a `mobileOpen`
  (vão junto para `MobileMenu`).
- Header mobile fica: logo (esquerda) + login (direita). `.menu-toggle` some do CSS
  mobile.

## 4. Gate de exibição

`showMobileNav = ROTAS_PUBLICAS.includes(route)` onde
`ROTAS_PUBLICAS = ['home','edicoes','curiosidades','participar','apoiar','contato','historico-awards']`
(mesma lógica do `FOOTER_ROUTES`; nunca em `em-breve`/`painel`/`painel-admin`/`pesquisa`).
A tab bar e o `MobileMenu` só montam nessas rotas. Em desktop a tab bar é
`display:none` (breakpoint 959px), então o gate é sobre "qual rota", o CSS cuida de
"qual largura".

## 5. CSS (novo bloco em `styles.css`)

- `.mobile-tabbar { position: fixed; inset: auto 0 0 0; z-index: 90; display: none; }`
  — `display:flex` só em `@media (max-width: 959px)`.
- Altura: `--tabbar-h: 58px`; barra = `calc(var(--tabbar-h) + env(safe-area-inset-bottom))`,
  com `padding-bottom: env(safe-area-inset-bottom)`.
- Fundo institucional: `color-mix(in srgb, var(--ink) 92%, transparent)` + `backdrop-filter:
  blur(12px)`, borda-topo sutil creme. Discreta.
- Item: `flex:1`, coluna (ícone + label 10.5px), `min-height:100%`, área de toque ≥
  a barra toda. Cor base creme translúcido; `.is-active` → `var(--page-accent)`.
- Microinteração: ícone do ativo faz `translateY(-1px)` + label ganha opacidade;
  `:active { transform: scale(.9) }`. Sem animação pesada. Respeita
  `prefers-reduced-motion`.
- **Reserva de espaço:** `body.has-mobile-tabbar { }` não — em vez disso, regra mobile
  adiciona `padding-bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom))` ao
  container de conteúdo. Como cada página tem seu próprio scroll, aplica-se em
  `@media (max-width:959px)` sobre `main.page-enter` (ou `.page-enter` raiz) só nas
  rotas públicas. Evita conteúdo/CTA coberto.

## 6. Reconciliação Edições (`Edicoes.jsx`)

- A pill `.edx-tabbar` hoje: `bottom: calc(12px + env(safe-area-inset-bottom))`.
  Passa a: `bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom) + 12px)` — sobe
  para empilhar acima da tab bar global. (`--tabbar-h` vira token global em `:root`
  ou `body`, lido pelos dois arquivos.)
- O padding-bottom do corpo da cena (`.edx-stack .edx-scene__body`) e do
  `.edx-page--tabbar` somam a altura das DUAS barras (edição + global). Ajustar o
  `calc` existente para incluir `var(--tabbar-h)`.
- Sheet de salto (`.edx-sheet`) e overlay ficam acima da tab bar (z-index já 60/61 >
  90? Não — tab bar z-index 90). Ajustar: tab bar `z-index: 90`; sheet overlay `z-index:
  100+` para o sheet cobrir a tab bar quando aberto. Verificar no preview.

## 7. Ícones (`icons.jsx`)

- Existem: `cal`, `star`, `plate`, `menu`. Reusar.
- Adicionar 1 ícone: **`home`** (SVG inline, casa simples, stroke currentColor,
  viewBox 0 0 16 16 no padrão dos outros). Sem lib.

## 8. Token global

- `--tabbar-h: 58px` definido uma vez (bloco `:root`/`body` em `styles.css`), lido pela
  tab bar, pela reserva de padding e pela pill de Edições. Fonte única de verdade da
  altura.

## 9. Performance

- 1 componente pequeno stateless + 1 extração + CSS. Zero dependência nova. SVG inline.
- Estado de menu isolado no `App` (não força re-render de páginas — só do overlay).
- Sem observers/intervals novos. Sem imagens.

## 10. Acessibilidade / usabilidade

- Área de toque de cada aba = largura/5 × 58px (≫ 44px). `aria-current="page"` na aba
  ativa. `aria-label` na nav. Foco visível (outline no `--page-accent-dark`).
- Contraste: creme sobre espresso (base) e `--page-accent` (ativo) — acentos são claros,
  legíveis sobre o fundo espresso.
- Safe-area iOS/Android via `env(safe-area-inset-bottom)`.

## 11. Fora de escopo (etapas futuras, já combinado)

- Redesign de cards (participantes/combos/edições/notícias).
- Jornada mobile da Home, Awards, Curiosidades, Participar/Apoiar/Contato.
- Timeline horizontal de edições no topo (ficou a pill empilhada, por decisão do Wilke).

## 12. Critérios de aceite

1. Tab bar aparece nas 7 rotas públicas no mobile, some no desktop e em
   em-breve/painel/pesquisa.
2. Aba ativa reflete a rota e acende no acento da página.
3. "Menu" abre o full-screen; navegar por qualquer aba fecha o menu.
4. Nenhum conteúdo/CTA fica coberto (padding reservado); nada colado.
5. Edições: pill de edição empilhada acima da tab bar, sem sobreposição; sheet cobre
   as duas quando aberto.
6. `npm run build` passa. Desktop idêntico ao de antes.
