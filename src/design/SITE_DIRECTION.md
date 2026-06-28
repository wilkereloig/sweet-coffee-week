# SITE_DIRECTION.md — Direção institucional do Sweet & Coffee Week

> Memória técnica e editorial do padrão que está sendo construído na página
> **"O Festival"** (`src/pages/institutional/Home.jsx`). Este documento é a
> referência a consultar **antes** de propor ou executar mudanças nas demais
> páginas institucionais.
>
> Status: **em refinamento**. A Home ainda não está aprovada. As regras aqui
> evoluem junto com ela. Nada deve ser replicado para outras páginas sem
> aprovação explícita.

---

## 1. Papel da página "O Festival"

- É a **página-mãe** do sistema institucional do Sweet & Coffee Week.
- Não é uma Home isolada: define a **direção visual, editorial e estrutural**
  que depois orienta Edições, Curiosidades, Participar, Apoiar e Contato.
- É o **laboratório principal**. Ajustes minuciosos feitos nela viram **regras
  reutilizáveis** para as próximas telas.
- Ao revisar ou criar qualquer outra página institucional, a referência de
  ritmo, hierarquia e clareza é esta página.

---

## 2. Princípios de estrutura

Lógica de construção da Home, de cima para baixo:

- **Hero forte e editorial** — abertura com presença, não banner de campanha.
- **Introdução clara** sobre o que é o festival, logo após o hero.
- **Blocos explicativos** com hierarquia simples e legível.
- **Seções que combinam texto curto + presença visual** (foto/colagem real).
- **Números** usados para reforçar relevância e escala.
- **Fechamento institucional** com a realização (F2 Experience).
- **Navegação para outras áreas** integrada ao todo — sem parecer promoção
  isolada de combos.

---

## 3. Princípios de texto

Regras de linguagem:

- Tom **institucional, mas caloroso**.
- Evitar texto **burocrático**.
- Evitar **excesso de explicação**.
- Frases **claras, diretas e com ritmo**.
- Comunicar o festival como **experiência de cidade**, não apenas promoção de
  combos.
- Preferir **"avaliam"** em vez de "votam".
- Usar **"Sweet Lovers"** como a comunidade / o público do festival.
- Evitar repetir em sequência as mesmas palavras, especialmente:
  *experiência, cidade, rota, memória, marcas*.
- Manter **"Sweet & Coffee Week"** como grafia oficial.

### Grafias oficiais (não variar)

- Festival: **Sweet & Coffee Week**
- Edição Lovers: **Sweet & Coffee Week Lovers**
- Premiação: **Sweet & Coffee Week Awards** (referida como **Sweet Awards** no
  uso editorial corrente)

Variações incorretas a evitar: "Sweet Coffee Week", "Sweet Coffee",
"Sweet Coffee Awards", "Sweet & Coffee Lovers", "Sweet Coffee Lovers".

---

## 4. Princípios de narrativa

Narrativa central do festival, na ordem:

1. O Sweet & Coffee Week nasce de um **tema**.
2. O tema **inspira os participantes**.
3. Os participantes criam **combos e experiências**.
4. O público **circula pela cidade**.
5. A edição gera **conteúdo, descoberta e memória**.
6. O **Sweet Awards** reconhece os destaques a partir da **avaliação do
   público**.
7. A **F2 Experience** realiza e organiza essa plataforma.

---

## 5. Princípios de componentes / seções

Padrões que a Home está consolidando (vocabulário de seções reutilizável):

- **Hero institucional** — abertura editorial.
- **Bloco "o que é"** — introdução do festival.
- **Cards numerados / processuais** — passos da narrativa.
- **Blocos de números** — escala e relevância.
- **Cards de pilares / impacto** — valor institucional.
- **Seção de realização** — F2 Experience.
- **CTAs institucionais** — encaminham para outras áreas.
- **Colagens / fotos reais** — apoio editorial e prova de cidade.

---

## 6. Regras para futuras páginas

Ao criar ou revisar Edições, Curiosidades, Participar, Apoiar, Contato:

- **Não copiar literalmente** a Home.
- Usar a Home como **referência de ritmo, hierarquia e clareza**.
- **Reutilizar padrões de seção** quando fizer sentido.
- Evitar criar estilos muito diferentes **sem necessidade**.
- Manter **consistência** entre títulos, textos de apoio, cards, CTAs e
  fechamentos.
- Cada página tem **função clara**:

| Página | Função |
|---|---|
| **Edições** | Memória e linha do tempo. |
| **Curiosidades** | Acervo, dados e bastidores. |
| **Participar** | Entrada para marcas participantes. |
| **Apoiar** | Entrada para patrocinadores e parceiros. |
| **Contato** | Canais e encaminhamentos. |
| **Sweet Awards** | Premiação institucional e resultados. |

---

## 7. O que NÃO fazer

- Não transformar cada página em uma **estética diferente**.
- Não criar **componentes redundantes** se o padrão já existe na Home.
- Não **duplicar textos**.
- Não usar **"votação"** como termo principal quando o contexto for avaliação
  do público.
- Não mexer na página **Sweet Awards** publicada nesta etapa.
- Não desligar **`AWARDS_ONLY_PUBLICATION`** (mantém `true`).
- Não **liberar outras rotas** ainda.

---

## 8. Próximos passos

- A Home ainda está em **refinamento**.
- As regras deste documento **podem ser atualizadas** conforme os ajustes
  finais forem definidos.
- Só **depois da aprovação da Home** essas regras devem ser aplicadas nas
  outras páginas.
- Antes de replicar para outras páginas, **revisar este `SITE_DIRECTION.md`**.

---

## 9. Sistema de layout & responsividade (pente fino da Home)

Regras medidas e validadas na Home — base para as próximas páginas.

### Container & gutters

- Container padrão: **`.wrap`** → `max-width: var(--maxw)` (**1280px**), centrado.
- Gutter lateral do conteúdo no contexto `.hm`: **`--hm-gutter`** =
  `clamp(28px, 11.5vw, 150px)` (~147px no desktop largo). **Todas** as seções de
  conteúdo (números, "o que é", processo, realização) compartilham o mesmo
  inset → margens laterais consistentes.
- O **hero** é exceção intencional: bloco centrado, `max-width: 920px`, padding
  próprio `clamp(24px,6vw,64px)`. Não alinha ao gutter das seções porque é
  full-bleed centrado — não replicar esse paradigma em seções normais.
- Header (desktop ≥960) segue o **mesmo grid do conteúdo** em **todas as páginas
  institucionais** (não só na Home): `.site-header__inner` usa `max-width: none` +
  `padding-inline: var(--hm-gutter)`. Logo encosta no gutter esquerdo, menu no
  direito — alinhados às bordas dos cards/títulos. O `.nav-cta` (hambúrguer, oculto
  no desktop) é `display:none` para o menu encostar no gutter direito sem sobra de
  `gap`. Logo prominente e consistente: `.brand img { height: clamp(72px,6vw,96px) }`.
- A **Home** mantém um tratamento exclusivo sobre o seu hero escuro (overrides
  `body.route-home`): barra **transparente** + scrim de topo, links em **creme** e
  **logo grande flutuante** (`position:absolute; top:100%`, `clamp(116px,11vw,160px)`)
  que sobe/encolhe ao rolar. As demais páginas usam a **mesma estrutura/alinhamento**,
  porém com **barra sólida legível** (fundo claro translúcido, links escuros) — o
  transparente+creme depende do hero escuro e não se replica em topo claro.
  Mobile (≤959) já é unificado para todas: logo à esquerda no `--hm-gutter`, botão à
  direita (≥44px). Páginas **Lovers** no desktop usam a sidebar própria (não o header).

### Ritmo vertical entre seções

- Na Home, `.hm .section` **sobrescreve** o `.section` global e usa o token
  **`--sp-section`** = `clamp(48px, 8vw, 128px)` (swc-redesign.css). Mobile
  compacto (48px), desktop generoso mas sem buracos (teto 128px).
  ⚠️ O valor anterior `clamp(56px, 11.5vw, 220px)` inflava demais (≈440px entre
  seções em telas largas) — não voltar a isso.
- Bandas de cor (números, processo) usam o **mesmo** ritmo — não criar padding
  vertical custom por seção sem intenção clara (evita bandas com alturas
  diferentes). Exceção: `.hm-f2` tem cap próprio `clamp(48px, 6.5vw, 84px)`.

### Tipografia responsiva — quebras e pontuação órfã

Regra validada em desktop, tablet e mobile (375px → 1440px):

- **Nenhuma linha pode conter só pontuação** (`:`, `,`, `.`). A causa raiz é o
  destaque `.hl-w { display: inline-block }`: o box vira token atômico e a
  pontuação seguinte (nó de texto vizinho) ganha oportunidade de quebra própria.
- **Solução:** agrupar palavra-destaque **+ sua pontuação** num
  `<span className="keep-together">` (`.hm .keep-together { white-space: nowrap }`).
  Ex.: `<span className="keep-together"><span className="hl-w">memória</span>:</span>`.
- **O espaço fica FORA do wrapper** → a quebra natural entre grupos é preservada;
  só o par palavra+sinal é protegido.
- `white-space: nowrap` **só em grupos curtos** (palavra + sinal). Nunca em frase
  inteira — causa overflow horizontal.
- `text-wrap: balance` (títulos) e `pretty` (parágrafos) podem ficar — convivem
  com os grupos `keep-together` (tratam o grupo como um único token).
- Antes de aprovar qualquer página: revisar os títulos grandes em **mobile,
  tablet e desktop** e confirmar que nenhum sinal sobra órfão.

### Grids & breakpoints

| Faixa | Nav | Números | "O que é" | Processo (steps) |
|---|---|---|---|---|
| Desktop ≥1024 | horizontal | 4 col | 2 col | auto-fit (4–6) |
| Tablet ~768 | hambúrguer (<960) | 4 col | 1 col | 3 col |
| Mobile ≤480 | hambúrguer | 1 col | 1 col | 1 col |

- Steps: `grid-template-columns: repeat(auto-fit, minmax(150px, 1fr))` — quebra
  sozinho conforme a largura. Cards mantêm altura/padding iguais via flex-column.
- Menu colapsa para hambúrguer em **< 960px** (`.nav-main { display:none }`).
- `overflow-x: clip` no `.hm` contém os elementos decorativos com posição
  negativa (splat). **Sem overflow horizontal** em nenhuma faixa testada
  (1440 / 1024 / 768 / 414 / 360).

### Comportamento de cards (padrão consolidado)

- `display: flex; flex-direction: column` + `min-height` + `gap` interno → todos
  os cards de uma seção têm a **mesma altura** e espaçamento previsível.
- Padding interno consistente; texto secundário nunca encosta nas bordas.
- Tipografia fluida com **container queries** (`cqi`) onde o card precisa escalar
  pela própria largura (números, steps) — atenção: `cqi` escala pela largura do
  card, não pelo comprimento do texto; limitar o teto do `clamp` quando o
  conteúdo for longo (ex.: `+R$ 712 mil`), sem aumentar só um card.

### Cuidados para mobile

- Hero reserva topo (`padding-top: clamp(120px,30vw,150px)`) para não colidir com
  o header fixo.
- Largura de leitura confortável: textos com `max-width` em `ch` (52–60ch).
- Garantir margem lateral mínima em telas pequenas (gutter mínimo `28px`).

---

## 10. Motion System

Referência de animação do site institucional. Tokens e classes vivem em
**`src/styles/motion-system.css`** (importado em `main.jsx`). Aplicar via classes
utilitárias opt-in; começar pela Home e replicar nas próximas páginas.

### Princípios

1. Movimento **editorial, leve e intencional** — reforça leitura e hierarquia.
2. Dá vida sem parecer brinquedo ou template genérico.
3. Acompanha a **narrativa** da página (entradas ajudam a entender sequência).
4. Hover é **feedback**, não distração. Cards e botões: microinteração discreta.
5. Decorativo pode ter movimento orgânico **muito** sutil.
6. Só anima `transform` e `opacity` (sem layout shift). Nunca `width/height/top/left`.
7. `prefers-reduced-motion: reduce` → tudo estático (conteúdo visível, sem animação).

### Quando usar / quando NÃO usar

- **Usar:** entrada de seção/cards ao cruzar a viewport, hover de card/botão,
  count-up de números, reveal orgânico de imagem, float decorativo discreto.
- **Não usar:** animação só por decoração, efeito genérico sem relação com o
  conteúdo, movimento pesado no load, nada que cause "pulo" de layout.

### Tokens

| Token | Valor | Uso |
|---|---|---|
| `--motion-fast` | `160ms` | hover / feedback imediato |
| `--motion-base` | `260ms` | transições e entradas padrão |
| `--motion-slow` | `520ms` | entradas calmas / institucionais |
| `--motion-reveal` | `720ms` | revelação de seção/imagem (a mais longa) |
| `--ease-out-soft` | `cubic-bezier(.2,.7,.2,1)` | desaceleração natural (entrada/hover) |
| `--ease-spring-soft` | `cubic-bezier(.16,1,.3,1)` | mola gentil, sem overshoot exagerado |
| `--motion-rise` | `22px` | deslocamento das entradas |

> Tokens legados (`--dur-fast/base/slow`, `--ease-out`, `--ease-pop`) em
> swc-redesign.css continuam válidos; o Motion System é a camada canônica daqui
> pra frente. O hero da Home já usava `cubic-bezier(.2,.7,.2,1)` (= `--ease-out-soft`).

### Classes utilitárias

| Classe | Comportamento |
|---|---|
| `.motion-reveal` / `.motion-reveal-up` | entrada rise+fade (sobe) ao revelar |
| `.motion-reveal-left` / `.motion-reveal-right` | entrada lateral suave |
| `.motion-stagger` | filhos diretos entram em sequência (delay 80ms por `nth-child`) |
| `.motion-image-reveal` | imagem com reveal orgânico (zoom-out leve `scale 1.045→1`) |
| `.motion-card-hover` | hover de card: `translateY(-4px)` + sombra |
| `.motion-button-hover` | hover de botão: `translateY(-2px)`, `:active` volta |
| `.motion-press` | feedback tátil: `scale(.97)` no `:active` |
| `.motion-float-soft` | float decorativo infinito, muito sutil (±6px) |

Entradas são **observer-driven**: a classe define o estado oculto; o hook
**`src/hooks/useRevealOnScroll.js`** (`IntersectionObserver`) adiciona `.is-in`
quando o elemento entra na viewport e a transição leva ao estado visível. Anima
**uma vez** por elemento, confiável em todo navegador (não depende de
`animation-timeline`). Sem suporte a IO ou em reduced-motion → revela tudo na hora.
Na Home, `HomePage` chama `useRevealOnScroll(rootRef)` no `.hm`.

### Comportamento por área (Home)

- **Hero** — texto entra em linhas escalonadas (`swcLineIn`), sublinhado desenha
  uma vez (`swcUnderlineDraw`); easing já alinhado ao `--ease-out-soft`. Sem
  movimento pesado no load.
- **"O que é"** — título/texto revelam ao entrar; a foto usa `.motion-image-reveal`
  (zoom-out leve, sem "pular").
- **Cards de processo / Pilares** — entrada em sequência; hover discreto
  (`translateY` + sombra), sem shift de layout.
- **Números** — count-up animado na viewport (`CountUp`, respeita reduced-motion);
  hover discreto que não compete com a leitura.
- **Realização (F2)** — entrada mais calma; espectro de marca com loop sutil
  (`f2Spectrum`); CTA com feedback claro no hover.
- **Menu/Header** — ver subseção dedicada abaixo (estados de navegação).

### Menu / Header — estados de navegação (referência p/ todas as páginas)

Comportamento canônico do `.nav-main` (desktop) e espelhado no menu mobile.
**Regra de ouro: nada de layout shift no hover** — só `transform`, `opacity` e
pseudo-elementos.

- **Página atual** — item com `.active` + `aria-current="page"`: cor de acento
  (`--cyan-deep`, ou `--cyan` no route-home), itálico/peso e **underline desenhado**
  (`::after` `scaleX(1)`, âncora à esquerda). O estado ativo respeita a **rota
  calculada no app** (ex.: `vencedores` quando renderizada), não o item clicado.
- **Hover** — underline desenha do canto esquerdo (`::after` `scaleX(0)→1`,
  `transform`, sem mexer em largura real) + cor reforça. Transição suave
  (`--motion-base` / `--ease-out-soft`).
- **Itens inativos** — legíveis em repouso. Quando o grupo está em hover
  (`.nav-main:hover a:not(:hover):not(.active)`), os não-alvos baixam opacidade
  (`.5`); o ativo **nunca** apaga. Ao sair do menu, tudo volta.
- **Foco por teclado** — `:focus-visible` com `outline` claro (não depende só de
  cor) + underline; funciona igual ao hover.
- **Reduced-motion** — transições zeradas; estados (ativo/hover/foco) continuam
  legíveis, underline instantâneo.

### Acessibilidade

`prefers-reduced-motion: reduce` zera entradas, floats, hovers e o espectro F2
(conteúdo permanece visível, sublinhados já desenhados). Verificar sempre antes
de aprovar uma página.

---

## 11. Fotos & galerias

As áreas de foto da Home não dependem de uma imagem fixa: usam o **acervo vivo**
da última edição (combos dos participantes), com troca sutil.

### Princípios

- Fotos do festival devem dar sensação de **acervo vivo**, não de banner.
- Evitar depender de **uma única imagem fixa** quando há acervo disponível.
- Galerias **sutis e integradas** ao layout — sem setas, sem aparência de slider.
- As fotos reforçam a **experiência real** do festival (combos, marcas, cidade).
- A Home define o padrão de galerias para as próximas páginas.

### Componente

- **`src/components/PhotoRotator.jsx`** — crossfade automático (fade + leve scale).
  Props: `images` (lista `{src, alt, participant?, type?}`), `interval`,
  `className`, `eager` (prioriza a 1ª imagem). `object-fit: cover`, imagens
  empilhadas (sem layout shift), `loading="lazy"` salvo a 1ª do hero, `onError`
  esconde imagem que falhar. Pausa com aba oculta.
- **`prefers-reduced-motion: reduce`** → não rotaciona; mostra a 1ª imagem estática.

### Dados

- **`src/data/homeGalleries.js`** — `heroGalleryImages`, `aboutGalleryImages`,
  `comboGalleryImages`. Derivados de `PARTICIPANTS` (nomes/slugs corretos),
  referenciando só `main.jpg` de cada combo. `about` usa subconjunto equilibrado
  (~8), não o acervo inteiro — performance.

### Aplicação na Home

- **Hero** — `PhotoRotator` (`eager`, ~5200ms) dentro de `.swc-hero__photo`,
  preservando a foto full-bleed e o overlay. Abre com `hero-festival.jpg`.
- **"O que é"** — `PhotoRotator` (~6800ms) dentro de `.hm-about__photo`,
  herdando a máscara badge. Intervalo diferente do hero → sensação orgânica.
- A "colagem de 3 células" (`.hm-about__collage`/`.hm-card`) é CSS **não
  renderizado** (legado); o DOM real tem 1 foto mascarada — por isso 1 rotator.
- Intervalos sugeridos: hero 4500–6000ms; colagens 5000–7500ms (variar entre
  instâncias).

---

## 12. Caminhos institucionais (conversão)

A Home não só explica o festival — **conduz** o usuário para os próximos passos.
Antes da Realização há uma seção-ponte (`.hm-paths`) com **duas colunas**:

- **Participar** (`#/participar`, eyebrow "Para estabelecimentos") — cafeterias,
  docerias, confeitarias, restaurantes e marcas autorais que querem entrar nas
  próximas edições.
- **Apoiar** (`#/apoiar`, eyebrow "Para marcas e parceiros") — patrocínio,
  ativações, conteúdo, brindes e presença nos pontos participantes.

Regras: linguagem institucional e convidativa; falar em **"interesse"** /
**"próximas edições"** (nunca prometer participação/patrocínio automático); sem
formulário (só chamada + CTA); cards cream sobre banda escura, acentos distintos
por coluna (coral / cyan-deep); CTA navega via `go('/rota')` (href `#/rota` de
fallback). Desktop 2 colunas, mobile empilha (≤760px).

> Padrão reutilizável: este bloco de "duas chamadas lado a lado" pode conduzir o
> usuário para páginas estratégicas em outras telas institucionais.

---

## 13. Rodapé institucional

Componente **global do institucional**: `src/components/SiteFooter.jsx`. Integrado
no `App.jsx` via `FOOTER_ROUTES` e renderizado após o `<main>`. Aparece em todas as
páginas institucionais **exceto o painel interno** (`route === 'painel'`).
`vencedores` fica de fora por ora (Awards publicado ainda não revisado com footer) —
liberar quando revisado. Lista atual: `home, edicoes, curiosidades, participar,
apoiar, contato`.

**Régua:** usa `.section` (ritmo vertical) + `.wrap` (largura/gutter do container) —
mesma da Home, sem direção visual paralela. Banda escura (`--ink`) com texto cream;
acentos `--peach`/`--cyan`/`--accent`. CSS reutilizável em `styles.css`
(`.site-footer*`).

**Conteúdo:** (1) identidade — nome, tagline, Instagram `@sweetcoffeeweek`,
Realização F2; (2) navegação institucional (reusa `NAV_LINKS`, mesma navegação
interna do header — não duplica rota); (3) informações essenciais; (4) caixa de
sugestão.

**Sugestão (envio honesto, sem backend):** form com estado local (nome/contato
opcionais, sugestão obrigatória). No envio: copia o texto pro clipboard e abre o
Instagram oficial (canal real) — **não** simula envio falso. Confirmação clara via
`role="status"` (sucesso → "copiamos + abrimos o Instagram"; fallback →
"envie pelo @sweetcoffeeweek"). `TODO(backend)`: conectar a um endpoint
(Formspree/Supabase) quando o institucional tiver coleta própria e então trocar o
fluxo.

**Responsivo:** grid 4 col → 2 col (≤900px) → 1 col (≤560px); campos com toque
confortável (≥44px no botão), sem overflow horizontal. Respeita
`prefers-reduced-motion`.

---

## 10. Validação mobile & header/menu (padrão p/ todo o institucional)

Régua de responsividade validada na Home/O Festival — base obrigatória para as
próximas páginas institucionais.

### Ferramenta de validação

- Script: **`tests/responsive.mjs`** (Playwright, já em devDependencies).
- Roda contra o **build de produção** via `vite preview` — NÃO contra o dev
  server. Em DEV o `DevViewportSwitcher` embrulha o app num `<iframe>`, então o
  header real não fica no documento de topo; só o preview reflete o site real.
- Comandos:
  ```
  npm run build              # exigido antes (dist no Dropbox → build separado)
  npm run test:responsive    # todos os viewports
  npm run test:mobile        # só telefones (390/414/430)
  ```
- Gera screenshots em `tests/screenshots/` (gitignored) para revisão visual.
- Sai com código 1 se houver overflow horizontal ou falha dura.

### Viewports oficiais de teste

`390×844` · `414×896` · `430×932` (telefones) · `768×1024` · `1024×768` ·
`1366×768`. Breakpoint do nav mobile (hambúrguer): **`max-width: 959px`**.

### Regras do header (mobile, ≤959px)

- **Logo sempre à esquerda**, alinhada ao gutter do conteúdo da Home
  (**`--hm-gutter`** = `clamp(28px, 11.5vw, 150px)`) — o `.site-header__inner`
  usa `justify-content: space-between` + `padding-inline: var(--hm-gutter)`
  (com `max(..., env(safe-area-inset-*))`). Nunca centralizar a logo.
- **Botão de menu sempre à direita** (`.nav-cta` com `margin-left:auto`), área de
  toque **≥44×44px**.
- Logo enxuta no mobile: `.brand img { height: clamp(40px, 11vw, 52px) }` (a base
  72px do `.brand-cycle__img` é grande demais p/ a barra).
- Header em uma única linha — não pode quebrar nem encostar nas bordas.

### Regras do menu mobile

- Padrão para as próximas páginas: lista institucional como navegação principal
  (`.mobile-menu__inst-link`), full-opacity, **`min-height: 48px`**, `font-size:16px`,
  divisórias sutis (`--line`), tipografia/cor institucionais (`--ink`).
- Overlay escuro com `.mobile-menu` deslizando pela direita; respeita
  `env(safe-area-inset-right/bottom)`.
- Fecha de **3 formas**: clique fora (overlay), clique em link, e **tecla Esc**
  (handler em `SiteHeader`, que também trava o scroll do fundo com
  `body.overflow:hidden` enquanto aberto).
- Links do menu (7): O Festival · Edições · Sweet Awards · Curiosidades ·
  Participar · Apoiar · Contato. **Não** incluir painel interno.

### Checklist obrigatório por página

- [ ] zero overflow horizontal em todos os viewports;
- [ ] logo à esquerda / botão à direita / gutter consistente header↔seções↔footer;
- [ ] menu abre, fecha (fora/link/Esc) e tem toque confortável;
- [ ] sem quebras tipográficas ruins / pontuação órfã no mobile;
- [ ] cards e botões não colados nas bordas; imagens sem cortes acidentais.

---

_Fonte de verdade da Home: `src/pages/institutional/Home.jsx`._
_Fonte de verdade do movimento: `src/styles/motion-system.css`._
_Fonte de verdade das galerias: `src/components/PhotoRotator.jsx` + `src/data/homeGalleries.js`._
_Atualizar este documento sempre que o padrão da Home mudar._
