# SITEMAP — Sweet & Coffee Week

Mapa da estrutura do site. Atualizar sempre que rotas/arquitetura mudarem.

- Stack: **Vite + React 18**, hash router próprio (`src/router.js`), sem build server.
- Deploy: branch `master` → produção `sweetcoffeeweek.com.br` (Vercel). Redesign atual na branch **`feat/home-festival`**.

## Rotas (hash router — `router.js` + `App.jsx`)

| Path | Componente | O que é |
|---|---|---|
| `/` (ou vazio) | `HomePage` | Home do festival (institucional) |
| `/edicoes` | `EdicoesPage` | Timeline de edições |
| `/curiosidades` | `CuriosidadesPage` | Fatos / curiosidades |
| `/participar` | `ParticiparPage` | Como participar |
| `/apoiar` | `ApoiarPage` | Patrocínio / apoio |
| `/contato` | `ContatoPage` | Form de contato + endereço |
| `/vencedores` · `/premiacao` | `SweetAwardsPage` | Sweet Awards (vencedores) |
| `/lovers/painel` | `PainelPage` | Painel interno de votação (Supabase, CSV) |
| `/lovers/combos/*`, `/lovers/awards`, `/mapa`, `/rota`, `/participantes` | → redirect Home | QR antigos preservados (não alterar) |

## Árvore

```
site-sweet-coffee-week/
├── src/
│   ├── App.jsx          # roteamento + ErrorBoundary + CookieConsent
│   ├── router.js        # hook useRoute (hash-based)
│   ├── main.jsx         # mount React; ordem de import dos CSS
│   ├── theme.js         # applyPalette() no init
│   ├── DevTools.jsx     # DevViewportSwitcher (preview)
│   ├── pages/
│   │   ├── institutional/  Home · Edicoes · Curiosidades · Participar · Apoiar · Contato · SweetAwards · HistoricoAwards
│   │   └── lovers/         Painel (admin votação)
│   ├── components/  nav.jsx · icons.jsx · placeholders.jsx · CookieConsent.jsx · ErrorBoundary.jsx
│   ├── data/        editions.js · participants.js (21 slugs congelados) · comboPhotos.js · sweetAwards.js
│   ├── lib/         analytics.js (GA4) · pageMeta.js (SEO por rota) · supabase.js (votação)
│   ├── styles.css   # global (resets, custom props, animações de página)
│   └── styles/
│       ├── swc-redesign.css   # tema INSTITUCIONAL — v2 (ver abaixo)
│       ├── lovers-system.css  # tema Lovers (.kv-lovers; --lovers-red #D63648)
│       └── fonts-nexa-slab.css
├── public/images/
│   ├── logo-sweet-coffee-week.svg · logo-sweet-coffee-week-header.svg · logo-f2experience.svg
│   ├── shapes/   # 6 SVG: arrow-yellow, badge-choco, flower-coral, splat-coral, star-cyan, wave-cream-bottom
│   ├── combos/   # 21 dirs (1 por participante)
│   └── adesivos*/  # stickers
├── vite.config.js   # server.port = env PORT || 5173 (autoPort)
├── package.json     # scripts: dev · build · preview · qr:lovers
├── .claude/         # launch.json (autoPort) · agents/ · commands/
└── docs/ + raiz: README · CLAUDE.md · DESIGN.md · PRODUCT.md · CODE_REVIEW_GRAPH.md · PROJECT_CONTEXT.md · CLAUDE_HANDOFF.md
```

## Duas identidades visuais (nunca misturar)

### Institucional — `swc-redesign.css` (DESIGN SYSTEM v2, handoff Claude Design)
- Paleta: cream `#FFF1E6` · cream-deep `#FBE6D2` · chocolate `#2B1810` + 4 acentos: coral `#E8553A`, pink `#F2548A` ("doce"), cyan `#2BC4E8`, yellow `#F8B511`.
- Tipografia: corpo e títulos em **Nexa Slab** (`--font-display`/`--font-heading`/`--font-body`).
- ⚠️ Comentários antigos no README/CLAUDE.md citando "terracotta + Instrument Serif" estão DESATUALIZADOS.
- Componentes v2: PhotoBadge, StepCard, StatBlock, Card, FeatureTag, Button (sticker), SideNav.
- Grid horizontal único da Home: tokens `--hm-gutter` + `--hm-content-max`; `.hm .wrap` alinhado à esquerda → todas as seções na mesma linha vertical.
- Ritmo de fundo da Home: cream → cream-deep → cream → banda chocolate → cream → cream-deep (token `--sp-section`).

### Lovers — `lovers-system.css`
- Paleta cream / `--lovers-red` / burgundy / pink / yellow. Fonte Sofia Pro Comp (Typekit). Wrapper `.kv-lovers`.

## Backend / serviços
- Supabase (votação Sweet Awards, painel). Google Maps (mapa + clusters). GA4 com consentimento.
- QR codes: rotas `#/lovers/combos/:slug` e `#/lovers/awards` são CONTRATO — não renomear slugs (ver `CODE_REVIEW_GRAPH.md` §9).

## Regras de deploy (ver CLAUDE.md)
- Nunca merge/deploy em `master`/produção sem ordem. Build local em outDir temporário por causa do lock do Dropbox: `npm run build -- --outDir "C:/swc-build-tmp" --emptyOutDir`.
