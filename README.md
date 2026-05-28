# Sweet & Coffee Week

Site oficial do festival **Sweet & Coffee Week** — Natal/RN.

## Stack

- Vite + React (JSX)
- Hash router customizado (`src/router.js`)
- Google Maps (`@googlemaps/js-api-loader` v2)
- Adobe Fonts / Typekit + Google Fonts
- Deploy: Vercel

## Setup

```bash
npm install
npm run dev      # localhost:5173
npm run build    # gera dist/
npm run preview  # preview do build
```

## Estrutura

```
src/
  components/     # Nav, Footer, Icons
  pages/
    institutional/  # Home, Curiosidades, Edições, Participar, Apoiar, Contato
    lovers/         # Hub, Combos, Mapa, Awards
  data/           # participants.js, combos.js, editions.js
  styles.css
  App.jsx
  router.js
public/
  images/
```

## Identidades visuais

Duas identidades isoladas — **nunca misturar**:

| | Institucional | Lovers |
|---|---|---|
| Páginas | `pages/institutional/` | `pages/lovers/` |
| Paleta | terracotta / peach | cream / vermelho / burgundy |
| Tipografia | Instrument Serif + DM Sans | Sofia Pro Comp (Typekit) |
| Wrapper | — | `.kv-lovers` obrigatório |

## Desenvolvimento local — páginas internas Lovers

Para abrir as páginas internas em desenvolvimento (sem depender do deploy):

```bash
git checkout dev/lovers-internal-pages
npm install
npm run dev
```

Abrir no navegador:

```
http://localhost:5173/#/lovers
http://localhost:5173/#/lovers/combos
http://localhost:5173/#/lovers/combos/canutos
http://localhost:5173/#/lovers/mapa
http://localhost:5173/#/lovers/awards
```

Variável necessária para o mapa (copiar `.env.example` → `.env.local`):

```
VITE_GOOGLE_MAPS_KEY=sua-chave-aqui
```

> Nessa branch as rotas internas abrem diretamente. Em `master`, combos e mapa estão bloqueados (deploy de produção).

## Coming Soon

`src/App.jsx` tem flag `SITE_COMING_SOON`. Com `true`, o domínio público exibe página de espera. Acesso ao site completo via botão admin (canto inferior direito).

## Deploy

- **Produção:** `sweetcoffeeweek.com.br` (Vercel)
- **Preview:** `sweet-coffee-preview.vercel.app`
- Auto-deploy via push para `master`
