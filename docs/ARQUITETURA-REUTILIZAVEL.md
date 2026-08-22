# Arquitetura Reutilizável — Sweet & Coffee Week

> **Propósito:** registrar como os sistemas da edição **Lovers (2026)** foram construídos para que sejam **reaproveitados na próxima edição**, mesmo que páginas sejam apagadas/desativadas no site atual.
>
> A edição Lovers já encerrou (votação: até 15/06/2026). Este documento é a fonte de verdade da engenharia por trás de **Mapa da Doçura**, **Premiação / Sweet Awards**, **Combos / Participantes** e do **Sistema Visual Lovers**.
>
> Regra permanente: ver `CLAUDE.md` e `CODE_REVIEW_GRAPH.md`. URLs de QR Code (`#/lovers/combos/:slug`, `#/lovers/awards`) **nunca mudam**.

---

## 0. Stack e roteamento

- **Stack:** Vite + React (JSX), CSS vanilla, sem TypeScript. SPA estática, deploy Vercel.
- **Backend:** Supabase (Postgres + RPC + Edge Functions). E-mail via Resend.
- **Mapas:** Google Maps JS API (2D padrão, 3D opcional) + Leaflet (alternativa não-ativa).
- **Router:** hash-first customizado em `src/router.js` (`useRoute()`). Sem hash, usa pathname (rewrites em `vercel.json`). Resolução rota→componente em `src/App.jsx`.

### Rotas registradas (App.jsx)

| Padrão de path | `route` | Componente | QR impresso? |
|---|---|---|---|
| `/` ou vazio | `home` | `LoversPage` (Hub.jsx) | — |
| `/lovers` | `lovers` | `LoversPage` (Hub.jsx) | — |
| `/participantes`, `/lovers/participantes`, `/lovers/combos` | `participantes`/`combos` | `ComboPage` (Combos.jsx) | — |
| `/lovers/combos/:slug` | `combo-detail` | `ComboDetailPage` (ComboDetail.jsx) | **SIM — congelado** |
| `/mapa`, `/rota`, `/lovers/mapa` | `mapa` | `MapaPage` (Mapa.jsx) | — |
| `/lovers/viva`, `/lovers/promocoes` (alias) | `viva` | `VivaPage` (Viva.jsx) | — |
| `/premiacao`, `/lovers/premiacao`, `/lovers/awards` | `premiacao`/`awards` | `AwardsPage` (Awards.jsx) | **`/lovers/awards` congelado** |
| `/lovers/votar` | `votar` | `VotarPage` (Votar.jsx) | — |
| `/lovers/painel` | `painel` | `PainelPage` (Painel.jsx) — **admin** | — |
| `/curiosidades`, `/participar`, `/apoiar`, `/edicoes`, `/contato` | institucionais | `ComingSoonPage` (stub "em breve") | — |

> **Importante:** hoje a home (`/`) é a **própria landing Lovers**. As páginas institucionais (`src/pages/institutional/*`) existem como componentes mas **não estão plugadas** — todas caem em `ComingSoonPage`.

### Variáveis de ambiente (nomes — nunca versionar valores)

| Variável | Onde | Uso |
|---|---|---|
| `VITE_SUPABASE_URL` | frontend (.env.local) | URL do projeto Supabase (fallback hardcoded em `src/lib/supabase.js`) |
| `VITE_SUPABASE_KEY` | frontend | chave publishable (segurança via RLS) |
| `VITE_GOOGLE_MAPS_KEY` | frontend | Google Maps + Places |
| `VITE_GOOGLE_MAPS_MAP_ID` | frontend | Map ID (estilo vetorial); fallback `DEMO_MAP_ID` |
| `VITE_LOVERS_MAP_PROVIDER` | frontend (opcional) | `google3d` ativa mapa 3D |
| `VITE_SHOW_LOVERS_COMBO_DETAILS` | frontend (opcional) | `false` esconde detalhes dos combos (pré-lançamento) |
| `RESEND_API_KEY` | Supabase secret (`send-vote-email`) | envio de e-mail |
| `EMAIL_FROM` | Supabase secret (`send-vote-email`) | remetente verificado |
| `RESEND_WEBHOOK_SECRET` | Supabase secret (`resend-webhook`) | assinatura svix dos webhooks |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | injetadas pelo Supabase nas Edge Functions | — |

Restrições HTTP referrer da chave Google (Cloud Console): `http://localhost:5173/*`, `https://sweetcoffeeweek.com.br/*`, `https://*.vercel.app/*`.

---

## 1. Mapa da Doçura

**Arquivos:** `src/pages/lovers/Mapa.jsx` (seletor de provider) + `src/pages/lovers/maps/MapaGoogle.jsx` (2D, ativo) + `MapaGoogle3D.jsx` (3D opt-in) + `MapaLeaflet.jsx` (alternativa). Rota: `#/lovers/mapa`.

### Como decide o provider
`Mapa.jsx` → `MapaPage()` usa `want3D()`: ativa 3D se `VITE_LOVERS_MAP_PROVIDER === 'google3d'` **ou** query `?map3d=1`. Se o 3D falhar (`onError`), volta para 2D. Leaflet existe mas não está no fluxo automático.

### Dependências
`@googlemaps/js-api-loader`, `@googlemaps/markerclusterer` (no package.json), Leaflet (importado direto, sem package). Chave injetada via `setOptions({ key })`; 3D usa `v: 'beta'`. Sem chave → `onError('missing-key')`.

### Dados que consome (de `participants.js`)
Cada participante pode ter `locations[]` (múltiplas unidades). `getParticipantLocations(participant)` (em MapaGoogle.jsx) normaliza: se há `locations`, usa-as; senão monta uma virtual da unidade principal. Campos usados por pino: `latitude`, `longitude`, `address`, `neighborhood`, `city`, `mapsUrl`, `hours`, `name`, `logo`, `brandColor`, `theme`.

Pipeline: `PARTICIPANTS → allLocations (flatmap) → visibleLocations (busca+filtro bairro) → +distância (geo) → pinLocations (só com coords)`.

### Pinos / popups / estilos
- 2D: `AdvancedMarkerElement` com pino DOM em SVG de coração 2 camadas + badge numerado (`buildPinElement`). InfoWindow com nome, bairro, endereço, tema, botão "Adicionar à rota". XSS-safe via `escapeHtml()`.
- 3D: `Marker3DInteractiveElement` (evento `gmp-click`), popover DOM `.m3c`, câmera `flyCameraTo()` (tilt 55°).
- Leaflet: `L.divIcon` coração rotacionado, tiles OSM.
- Centro/zoom hardcoded: Natal `{ lat: -5.7945, lng: -35.2110 }`, zoom 13 (em cada arquivo de mapa). Fuso `America/Fortaleza`.

### Helpers reutilizáveis (MapaGoogle.jsx)
`haversineKm(a,b)`, `formatDistance(km)`, `getOpenStatus(hours, now)` (slots por dia 0–6, cruza meia-noite, próximos 7 dias), `normalizeSearchText()`, `escapeHtml()`, `buildPinElement(label, selected)`.

### Estado/rota
Query params: `?loja=<location-id>` (foca unidade), `?rota=<id1,id2,...>` (carrega rota), `?map3d=1`. Rota do usuário persiste em `localStorage['sweet-lovers-route']`. Share via `buildRouteShareUrl(ids)`. Captura de card de rota com `html-to-image` + QR via `qrcode`.

### Reaproveitar
1. Trocar `PARTICIPANTS` (coords reais, `mapsUrl`/CID, `hours`).
2. Atualizar centro/zoom se a cidade mudar (3 arquivos de mapa) e o fuso.
3. Reusar paleta `--lovers-*` ou trocar.
4. Configurar `VITE_GOOGLE_MAPS_KEY` / `VITE_GOOGLE_MAPS_MAP_ID`.
5. Toda a lógica é agnóstica de dados — nenhuma reescrita necessária.

---

## 2. Premiação / Sweet Awards (votação + painel)

**Arquivos:** `src/pages/lovers/Awards.jsx` (público), `Votar.jsx` (formulário), `Painel.jsx` (admin, ~1031 linhas). Config em `src/data/sweetAwards.js`. Backend em `supabase/schema.sql` + 3 Edge Functions. `src/data/awards.js` é placeholder vazio.

### Fluxo de votação (`Votar.jsx`)
Etapas adaptativas: novo votante `['regras','voce','avaliacao','final']`; lembrado (localStorage `sweet-awards-voter`) só `['avaliacao','final']`.
- **Dados:** email, nome, telefone (BR), instagram, gênero, escolaridade, faixa etária, segue @sweetcoffeeweek (obrigatório), aceita comunicação (opcional).
- **7 notas (5–10):** atendimento, criatividade, apresentacao, doce, salgado, bebida, envolvimento (coluna `nota_encantamento`). **"Melhor Combo" não é perguntado** — é `(doce+salgado+bebida)/3` calculado no banco.
- **Pesquisa (abertas, obrigatórias):** gostou, melhorar, sugestao_tema.

### Anti-fraude
- **A1 formato/domínio:** `emailValid()` + `BAD_EMAIL_DOMAINS` (lista sincronizada frontend↔backend, typos e descartáveis).
- **A2 DNS:** Edge Function `check-email-domain` (MX→A→AAAA, debounce 600ms, não bloqueia em falha de rede).
- **B duplicidade:** "último voto vale" por `(lower(email), participante)` e `(participante, dígitos(telefone))` — índices únicos. Segunda submissão faz UPDATE. Mesma pessoa pode votar em participantes **diferentes**.

### Janela de votação
`AWARDS_VOTING` em `sweetAwards.js`: `opensAt`/`closesAt` (ISO com `-03:00`). Bloqueio também no SQL (`votacao_nao_aberta`/`votacao_encerrada`). Lovers: 03/06 → 15/06/2026.

### Schema do banco (`supabase/schema.sql`)
Tabelas (todas com RLS sem policies = sem acesso anônimo direto):
- **`votos`** — 1 linha por (pessoa × participante). Colunas: id, created_at, updated_at, email, nome, telefone, instagram, genero, escolaridade, faixa_etaria, aceita_comunicacao, participante_slug, nota_combo (legado), nota_encantamento/apresentacao/atendimento/criatividade/salgado/doce/bebida (CHECK 5–10), obs. Índices únicos: `votos_email_participante_uniq`, `votos_telefone_participante_uniq`.
- **`feedback_geral`** — PK email; gostou, melhorar, sugestao_tema.
- **`vote_emails`** — PK email; status ('sent'/'bounced'), sent_at, bounced_at (dedup do e-mail).
- **`awards_config`** — singleton; `results_published` (libera ranking público), opens_at, closes_at.
- **`admin_config`** — singleton; `secret_hash` (bcrypt da senha do painel).

RPCs (`security definer`):
- `submit_vote(...)` (22 params) — valida e faz upsert "último vale" + feedback. `grant execute to anon, authenticated`.
- `get_rankings()` — TOP 3 por categoria (8 prêmios), **só se `results_published = true`**. Melhor Combo = média de doce+salgado+bebida.
- `admin_ping(p_secret)` → bool — login do painel.
- `get_audit_report(p_secret)` → todos os votos (PII) — só com senha.
- `get_feedback_admin(p_secret)` — feedback + participantes.
- `get_suspicious_votes(p_secret)` — sinais: telefone_multi_email, instagram_multi_email, nome_multi_email, notas_max, email_bounce.
- `admin_ok(p_secret)` / `set_admin_secret(p_secret)` — internos (bcrypt `gen_salt('bf')`); `set_admin_secret` roda no SQL Editor (service-role).

### Edge Functions (`supabase/functions/`)
- **`send-vote-email`** — e-mail de agradecimento (best-effort, dedup em `vote_emails`, template HTML com identidade). Secrets: `RESEND_API_KEY`, `EMAIL_FROM`. Deploy: `supabase functions deploy send-vote-email`.
- **`check-email-domain`** — valida DNS do domínio. Sem secrets. Deploy `--no-verify-jwt`.
- **`resend-webhook`** — recebe bounces/complaints da Resend, marca `vote_emails.status='bounced'`. Secret: `RESEND_WEBHOOK_SECRET`. Deploy `--no-verify-jwt`. Endpoint na Resend: `https://<PROJECT>.supabase.co/functions/v1/resend-webhook`.

### Painel admin (`Painel.jsx`) — `#/lovers/painel`
Login por senha (`admin_ping`), sessão em `sessionStorage['sweet-admin-secret']`. 5 abas: Visão Geral, Resultados, Auditoria (paginada 300, `PER_PAGE`), Pesquisa, Suspeitos.
- **Export Excel** (`buildAndDownloadXlsx`, lib `exceljs`): abas Resultados (média pura), Resultados (ponderada/bayesiana), Análise da Pesquisa, Votos, Pesquisa. Formatação: banner, cabeçalho colorido, freeze, auto-filtro, zebra, bordas.
- **4 métodos de ranking** (só prévia do painel; site público usa **média pura**):
  1. **Média pura** — soma/n. Desempate: votos.
  2. **Ponderada (bayesiana)** — `(n/(n+M))·média + (M/(n+M))·média_geral`; `BAYES_M=20`, `BAYES_MIN=5`.
  3. **Aprovação (% positivas)** — % de notas ≥9 entre as 10 mais votadas (`POS_MIN=9`).
  4. **Taxa de aprovação** — `positivas/total·100`, volume-independente; piso `RATE_MIN=30`. Ver `docs/metodo-taxa-aprovacao.md`.
- **Resumo da pesquisa** (`AI_PESQUISA`, ~linhas 61–132): análise curada (data, nRespostas, pontos fortes/melhorar, temas, citações, frequências) + métricas ao vivo (% sem crítica, por faixa/gênero, top elogio/crítica). **Específico da edição — recriar a cada ano.**
- Hooks: `useRpc`, `useRpcAll` (blocos de 1000, contorna limite PostgREST).

Docs do painel: `docs/PAINEL-SWEET-AWARDS.md`.

### `sweetAwards.js` exporta
`AWARDS_VOTING`, `AWARDS_CATEGORIES` (7: key/field/label/question/help), `AWARDS_SCALE` ([5..10]), `GENDER_OPTIONS`, `ESCOLARIDADE_OPTIONS`, `FAIXA_ETARIA_OPTIONS`, `AWARDS_PARTICIPANTS` (derivado de PARTICIPANTS, ordenado), `AWARDS_TEXTS` (hero, cta, regulamento, mensagens), `AWARDS_CATEGORY_BLURB`.

### Reaproveitar (resumo)
1. `participants.js`: novos slugs. 2. `sweetAwards.js`: datas, categorias, textos. 3. Schema: adicionar colunas se categorias mudarem. 4. Reset SQL: limpar `votos`/`feedback_geral`/`vote_emails`, atualizar `awards_config`, `set_admin_secret('nova-senha')`. 5. Re-deploy Edge Functions + secrets. 6. Pós-votação: curar `AI_PESQUISA`, `UPDATE awards_config SET results_published=true`.

---

## 3. Combos + Participantes + QR Codes

**Arquivos:** `src/pages/lovers/Combos.jsx` (lista), `ComboDetail.jsx` (detalhe), `src/data/participants.js`, `src/data/combos.js`, `src/data/comboPhotos.js` (auto-gerado), `scripts/generate-lovers-qrcodes.mjs`.

### Estrutura de PARTICIPANTE (`participants.js → PARTICIPANTS[]`)
```js
{
  id, slug,                 // congelados (= URL do QR). slug === id
  name, logo,               // "/logos/participants/{slug}.png"
  brandColor,               // "var(--lovers-pink)"
  instagram, whatsapp,
  address, neighborhood, city, latitude, longitude, mapsUrl, openingHours,
  theme, edition,           // tema criativo + edição temática
  takeAwayOnly?,            // opcional
  locations: [ {            // 1+ unidades
    id, name, address, neighborhood, city, latitude, longitude, mapsUrl, openingHours,
    hours: { 0..6: [["HH:MM","HH:MM"]] },   // 0=Dom … 6=Sáb
    access?, dateOverrides?                  // ex.: { "2026-06-07": [] } = fechado
  } ]
}
```

### Estrutura de COMBO (`combos.js → COMBOS[]`)
```js
{
  id, editionId,            // "2026-lovers"
  participantId, slug,      // slug === participant.slug (congelado)
  name, description,
  sweet: { name, desc }, savory: { name, desc }, drink: { name, desc },
  boxLabel?, boxItems?: [{ emoji, country, name, desc }], boxNote?,  // Sweet Box (ex.: Douce di Maria)
  price
}
```

### Ligação e resolução de rota
`combo.participantId` → `participant.id`; `combo.slug === participant.slug`. Rota `#/lovers/combos/:slug` → `ComboDetail.jsx` → `resolveQrSlug(slug)` (aliases em `QR_SLUG_ALIASES`, hoje vazio) → acha combo por slug → acha participante por `participantId`. Fallback: gera combo a partir do participante + `COMBO_PHOTOS[slug]` (modo preview).

### ComboDetail exibe
Galeria com loop (`ComboHeroPhotos`, troca a cada 4s), preço sticker, tema/criação, itens (Sweet Box ou doce/salgado/bebida), `LocationCard` por unidade (status aberto/fechado via `getOpenStatus`, link mapa interno `#/lovers/mapa?loja=...`), contato (Instagram/WhatsApp), bloco de votação, CTA final. OG/share via `src/lib/pageMeta.js`.

### Fotos e logos
- **Logos:** `public/logos/participants/{slug}.png`. Campo `logo` aponta para `/logos/participants/{slug}.png`. Não renomear.
- **Fotos:** `public/images/fotos-combos-site/`, nome `site-{Nome Loja} {n}.png` (1=combo, 2=doce, 3+=salgado/bebida). Mapeadas em `comboPhotos.js → COMBO_PHOTOS[slug]` (AUTO-GERADO).

### QR Codes (`scripts/generate-lovers-qrcodes.mjs`, `npm run qr:lovers`)
Gera PNGs 1200×1200 (erro "H") por combo em `exports/qrcodes/lovers/combos/{slug}.png` + `awards.png` + índice `qrcodes-lovers.csv`. Apontam para `https://www.sweetcoffeeweek.com.br/#/lovers/combos/{slug}` e `.../#/lovers/awards`.

### 21 slugs congelados (Lovers)
`adocee-doceria, bolomania, caffe-basilicos, canutos, caroli-douces, casa-1190, casa-de-taipa-tapiocaria, delicato-bolos, douce-di-maria, jolie-cafe-patisserie, just-food-coffee, mangai, mr-cupcake-confeitaria, o-maestro-cafe, oli-gastro, padoca-do-bosque, paneer-patisserie, parma-doces, rollab-confeitaria, sweet-duo-confeitaria, wow-cookies`.

### Reaproveitar
Popular `participants.js` + `combos.js` (novos slugs, novo `editionId`), adicionar logos/fotos com a convenção de nomes, regenerar `comboPhotos.js`, rodar `npm run qr:lovers`. Componentes não mudam.

---

## 4. Sistema Visual Lovers

**Arquivos:** `src/components/lovers/*` + `src/components/lovers/index.js` (barrel) + `src/styles.css` (tokens) + `src/styles/lovers-system.css` (~2401 linhas) + `src/config/loversRelease.js` + `src/config/loversStickers.js`.

### Componentes (barrel `index.js`)
| Componente | Props principais | O que faz |
|---|---|---|
| `LoversButton` | variant(primary/secondary/ghost/dark), size, full, href/onClick | botão (vira `<a>` se href) |
| `LoversBadge` | variant(pink/yellow/cyan/purple/cream/dark) | pílula uppercase |
| `LoversCard` | variant, interactive, as | card temático (hover lift) |
| `LoversNavCard` | kicker, title, text, cta, href, variant, icon | card de navegação |
| `LoversSection` | eyebrow, title, subtitle, center, variant | wrapper de seção c/ header |
| `LoversStatCard` | number, label, text, variant | métrica grande |
| `LoversStickers` | page(sobre/participantes/combos/premiacao/viva/mapa), count | adesivos decorativos c/ parallax |
| `ShareCardModal` | open, onClose, variant(carteirinha/meutop/rota), data | card 9:16 p/ social (html-to-image 3x) |
| `PhotoBoothModal` | open, onClose | cabine de foto (selfie/upload→moldura→adesivos→share) |
| `useLoversReveal` | (selector, dep) | reveal on-scroll (IntersectionObserver, respeita reduced-motion, failsafe 1.2s) |

### Tokens CSS (`:root` em styles.css)
```css
--lovers-red:#D63648; --lovers-burgundy:#870E2D; --lovers-pink:#F20567;
--lovers-cyan:#00B8CC; --lovers-yellow:#F5B800; --lovers-purple:#4F2092;
--lovers-brown:#3F1A0A; --lovers-cream:#FFE8D2;
--font-lovers-display:'sofia-pro-comp','Caprasimo','Instrument Serif',Georgia,serif;
--font-lovers-body:'sofia-pro-comp','DM Sans',system-ui,sans-serif;
/* + espaçamento --lovers-space-*, radius --lovers-radius-*, sombras, z-index, transições, --tabbar-h */
```
Cor do hero muda por rota via `body.route-*`: participantes/combos→pink, mapa→cyan, premiacao/awards→purple.

Fonte **Sofia Pro Comp** via Adobe Typekit (`https://use.typekit.net/kgh7res.css`). Wrapper obrigatório `.kv-lovers` na raiz de toda página Lovers.

### Feature flags / fim da edição
`src/config/loversRelease.js`: `LOVERS_SHOW_COMBO_DETAILS = VITE_SHOW_LOVERS_COMBO_DETAILS !== 'false'`; `LOVERS_PUBLIC_LOCKED = !LOVERS_SHOW_COMBO_DETAILS`.
As **fases por data** estão **hardcoded em `Hub.jsx`** (`start` 04/06, `end` 14/06, `voteEnd` 15/06 2026): `normal → lastFest → lastVote → closed`. A fase `closed` exibe o badge **"EDIÇÃO ENCERRADA"** e o hero de agradecimento. Para mudar, editar as constantes em `Hub.jsx`.

### Stickers (`loversStickers.js`)
`POOLS` por página (refs `A(n)=/images/adesivos-site/adesivo (n).png`, `B(n)=...adesivo-v2 (n).png`), `POSITIONS` (16 slots c/ rotação/escala/parallax), `pickStickers(pool, n)` (sorteia a cada mount). `mapa` tem pool vazio.

### Re-skin para nova edição
1. Datas/fases em `Hub.jsx`. 2. `participants.js`/`comboPhotos.js`. 3. Paleta `--lovers-*` em `styles.css` (propaga p/ tudo). 4. Fontes (`--font-lovers-*` + link Typekit/Google em `index.html`). 5. Adesivos PNG + `loversStickers.js`. 6. Textos em Hub/Viva/Awards + `pageMeta.js` + `nav.jsx`. 7. Molduras PhotoBooth + cores em `ShareCardModal.jsx`. 8. `npm run build`, testar rotas + QR antigos.

---

## 5. Mapa de arquivos (referência rápida)

```
src/
  App.jsx                      # rota→componente, tab bar Lovers
  router.js                    # useRoute() hash-first
  styles.css                   # tokens :root + classes base
  styles/lovers-system.css     # sistema visual completo
  config/
    loversRelease.js           # feature flags
    loversStickers.js          # POOLS/POSITIONS/pickStickers
  lib/
    supabase.js                # cliente
    pageMeta.js                # OG/meta por rota
    analytics.js               # GA4 consent mode
  data/
    participants.js            # PARTICIPANTS[] (fonte de verdade)
    combos.js                  # COMBOS[]
    comboPhotos.js             # COMBO_PHOTOS{} (AUTO-GERADO)
    sweetAwards.js             # config de votação
    awards.js                  # placeholder vazio
  components/lovers/           # design system (barrel index.js)
  pages/lovers/
    Hub.jsx Combos.jsx ComboDetail.jsx Mapa.jsx Viva.jsx
    Awards.jsx Votar.jsx Painel.jsx
    maps/MapaGoogle.jsx MapaGoogle3D.jsx MapaLeaflet.jsx
  pages/institutional/         # Home/Edicoes/... (hoje stub ComingSoon)
  utils/openStatus.js          # getOpenStatus / openSummary
supabase/
  schema.sql                   # tabelas + RPCs + RLS
  functions/{send-vote-email,check-email-domain,resend-webhook}/
scripts/generate-lovers-qrcodes.mjs   # npm run qr:lovers
public/logos/participants/{slug}.png
public/images/fotos-combos-site/site-{Nome} {n}.png
exports/qrcodes/lovers/        # QR gerados + CSV
docs/PAINEL-SWEET-AWARDS.md docs/metodo-taxa-aprovacao.md
```

---

## 6. Checklist de nova edição (resumo)

- [ ] `participants.js` + `combos.js`: novos dados/slugs, novo `editionId`.
- [ ] Logos (`public/logos/participants/`) + fotos (`public/images/fotos-combos-site/`) → regenerar `comboPhotos.js`.
- [ ] `sweetAwards.js`: datas (`AWARDS_VOTING`), categorias, textos.
- [ ] `Hub.jsx`: datas das fases (`start/end/voteEnd`).
- [ ] Paleta/fontes/adesivos se a identidade mudar.
- [ ] Supabase: reset de tabelas, `awards_config`, `set_admin_secret`, re-deploy Edge Functions + secrets.
- [ ] `npm run qr:lovers` (novos QR) — **manter URLs antigas funcionando**.
- [ ] `npm run build`, testar rotas e QR impressos, deploy Preview (`dev/lovers-internal-pages`).
