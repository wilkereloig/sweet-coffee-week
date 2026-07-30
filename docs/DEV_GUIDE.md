# DEV_GUIDE.md — Guia interno de desenvolvimento (Sweet & Coffee Week)

> Documentação para dev humano **ou IA** continuar o projeto **sem bagunçar**.
> Explica como o site é montado, onde cada coisa vive, e — o mais importante —
> **onde mexer para que a mudança propague para todas as páginas** (heros, cores,
> fontes, espaçamentos), em vez de virar N edições manuais.
>
> **Leia antes:** este guia é operacional. As **regras de negócio/visuais** e as
> **regras de branch/deploy** vivem em `CLAUDE.md` (raiz do projeto) — ele é a fonte
> viva e **vence** este documento em caso de conflito. Aqui explicamos *como* o código
> está organizado; lá está *o que pode e o que não pode*.
>
> ⚠️ **Marcação PROPOSTO × ATUAL.** Boa parte da arquitetura-alvo (componentes
> `<Hero>`/`<Section>`/`<PageForm>`, `src/config/channels.js`, `src/styles/tokens.css`)
> **ainda não existe** no repositório — é o resultado esperado da refatoração planejada.
> Sempre que algo for alvo e não realidade atual, está marcado **[PROPOSTO]**. O que
> não tem marcação **existe hoje** e foi verificado no código.

---

## Índice

1. [Stack](#1-stack)
2. [Estrutura de pastas](#2-estrutura-de-pastas)
3. [Padrão de componentes](#3-padrão-de-componentes)
4. [Padrão de páginas](#4-padrão-de-páginas)
5. [Padrão de dados](#5-padrão-de-dados)
6. [Padrão visual (tokens)](#6-padrão-visual-tokens)
7. [Padrão de motion](#7-padrão-de-motion)
8. [COMO criar uma nova página](#8-como-criar-uma-nova-página)
9. [Como criar uma nova seção](#9-como-criar-uma-nova-seção)
10. [Como alterar uma hero GLOBALMENTE (um lugar só)](#10-como-alterar-uma-hero-globalmente-um-lugar-só)
11. [Como alterar cores / fontes / espaçamentos (tokens)](#11-como-alterar-cores--fontes--espaçamentos-tokens)
12. [Como adicionar participante / notícia / edição / card](#12-como-adicionar-participante--notícia--edição--card)
13. [Cuidados para NÃO duplicar componentes](#13-cuidados-para-não-duplicar-componentes)
14. [Boas práticas de organização](#14-boas-práticas-de-organização)
15. [Checklist antes de finalizar](#15-checklist-antes-de-finalizar)

---

## 1. Stack

- **Build:** [Vite](https://vitejs.dev) + **React (JSX)**. **Sem TypeScript.** Sem framework de rotas.
- **Roteamento:** hash router **customizado** em `src/router.js` (rotas do tipo `#/edicoes`).
  Não usar React Router; não trocar hash routing por path routing (QR Codes dependem disso — ver §12 e `CLAUDE.md`).
- **Fontes:** Adobe Fonts/Typekit + Google Fonts + Nexa Slab local (`src/styles/fonts-nexa-slab.css`).
- **Dev server:** `npm run dev`. **Build:** `npm run build`.
  - ⚠️ `dist/` costuma travar por causa do Dropbox. Para checar build sem conflito:
    `npm run build -- --outDir dist_check --emptyOutDir` e depois `rm -rf dist_check`.
- **Testes:** `node tests/responsive.mjs` valida overflow/header/menu em 6 viewports.
- **Backend (parcial):** Supabase (`src/lib/supabase.js`) para painéis/pesquisa. Formulários
  institucionais de Participar/Apoiar/Contato hoje **não têm backend** — copiam texto para o
  clipboard e abrem o Instagram (ver §13).

### Duas identidades visuais — NUNCA misturar

| Identidade | Pasta | Paleta / wrapper | Fontes |
|---|---|---|---|
| **Institucional** | `src/pages/institutional/` | terracota/creme; acento por rota via `--page-accent` em `body.route-*` | Nexa / Nexa Slab |
| **Lovers** (edição) | `src/pages/lovers/` | cream / `--lovers-red` / burgundy; wrapper obrigatório `.kv-lovers` | Sofia Pro Comp (Typekit) |

O CSS da Lovers (`src/styles/lovers-system.css`) é **isolado e lazy** (carrega só via Painel
Lovers). **Não aplicar estilo Lovers em página Institucional nem vice-versa.**

### Flags de publicação (em `src/App.jsx`)

- `AWARDS_ONLY_PUBLICATION = true` → **em produção o site mostra só o Sweet Awards.** Todo o
  institucional fica escondido no domínio oficial. Isso é uma **rede de segurança**: dá para
  refatorar o institucional sem afetar `sweetcoffeeweek.com.br`.
- `INSTITUTIONAL_PREVIEW` → libera o institucional em **DEV** e em `*.vercel.app?preview=1`,
  **nunca** no domínio oficial.
- **Não alterar essas flags** para "ver a página em produção". Use o preview.

---

## 2. Estrutura de pastas

Estado **atual** verificado no repositório:

```
site-sweet-coffee-week/
├── CLAUDE.md              # fonte viva de regras (LER SEMPRE)
├── SITEMAP.md             # mapa de rotas
├── ACERVO.md              # resumo legível do acervo (16 edições) — texto derivado dos dados
├── docs/
│   └── DEV_GUIDE.md       # este arquivo
├── tests/responsive.mjs
├── public/
│   ├── images/            # combos, logos, shapes, fotos
│   └── logos/
└── src/
    ├── App.jsx            # monta rota → página; flags AWARDS_ONLY / INSTITUTIONAL_PREVIEW; redirects
    ├── main.jsx           # ordem de import dos CSS (IMPORTA A ORDEM — ver §6)
    ├── router.js          # hash router customizado
    ├── theme.js
    ├── styles.css         # globais institucionais (route-* / --page-accent / heros)
    ├── styles/
    │   ├── swc-redesign.css   # redesign v2 (carrega por último — VENCE hoje)
    │   ├── motion-system.css  # tokens/keyframes de motion
    │   ├── lovers-system.css  # isolado (Lovers) — não tocar sem pedido
    │   ├── fonts-nexa-slab.css
    │   └── pesquisa.css
    ├── components/
    │   ├── nav.jsx            # SiteHeader / menu
    │   ├── SiteFooter.jsx
    │   ├── icons.jsx          # ícones inline
    │   ├── placeholders.jsx   # fallbacks editoriais (logo/foto ausente)
    │   ├── PhotoRotator.jsx
    │   ├── CookieConsent.jsx
    │   └── ErrorBoundary.jsx
    ├── hooks/
    │   └── useRevealOnScroll.js  # IntersectionObserver, reveal on scroll
    ├── lib/
    │   ├── pageMeta.js        # atualiza <title>/description por rota (runtime)
    │   ├── analytics.js
    │   └── supabase.js
    ├── data/                 # 13 arquivos — fonte de verdade do conteúdo (ver §5)
    └── pages/
        ├── institutional/    # Home, Edicoes, Curiosidades, HistoricoAwards,
        │                     # Participar, Apoiar, Contato, Pesquisa, PainelAdmin
        └── lovers/           # Painel (lazy)
```

### Pastas-alvo da refatoração **[PROPOSTO]** (ainda **não existem**)

```
src/
├── components/layout/     # [PROPOSTO] Hero.jsx, Section.jsx, PageForm.jsx
├── config/                # [PROPOSTO] channels.js (INSTAGRAM_URL único)
├── hooks/                 # [PROPOSTO] + useContactForm.js, useTilt3D.js
├── data/                  # [PROPOSTO] + testimonials.js, mediaContent.js, curioContent.js
└── styles/
    └── tokens.css         # [PROPOSTO] :root ÚNICO (cor/tipo/espaço/motion), carrega 1º
```

> Ao implementar a refatoração, **crie essas pastas nesses caminhos exatos** — o resto do
> guia assume esses nomes.

---

## 3. Padrão de componentes

**Componentes compartilhados vivem em `src/components/`.** Um componente:

- é um arquivo `.jsx` com **um export default** nomeado (`export default function SiteFooter(){…}`);
- recebe dados por **props**, não lê `src/data/` diretamente (exceção: componentes de dados
  muito específicos). Página busca o dado e passa pra baixo;
- **não** contém regras de cor/espaço hardcoded que já existam como token — usa `var(--token)`;
- se tiver CSS próprio, prefira uma classe no CSS global correspondente à identidade
  (institucional → `styles.css`/`swc-redesign.css`; Lovers → `lovers-system.css`).

Bons exemplos já no projeto: `src/components/placeholders.jsx` (fallback editorial quando
falta logo/foto — **nunca inventa logo**), `src/components/PhotoRotator.jsx`,
`src/components/icons.jsx`.

**Regra de ouro do componente:** se você está prestes a **copiar/colar** um bloco de JSX ou
uma função de lógica de uma página para outra, **pare** — isso vira um componente ou um hook
(§13). Duplicar é a causa-raiz do problema "mudo num lugar e não propaga".

---

## 4. Padrão de páginas

Cada rota institucional é **uma página** em `src/pages/institutional/<Nome>.jsx`,
registrada em `src/App.jsx` e mapeada por `body.route-<slug>` (que define o acento).

### Como uma página é montada hoje (ATUAL)

Hoje as páginas são grandes e **auto-contidas**: cada uma tem seu próprio bloco `<style>`
inline (inclusive a hero) e, em vários casos, conteúdo hardcoded no JSX. Isso funciona, mas é
exatamente o que gera duplicação. Exemplos: `Home.jsx` (~852 linhas), `Apoiar.jsx` (~524),
`Participar.jsx` (~517), `HistoricoAwards.jsx` (~514).

### Como uma página **deve** ser montada [PROPOSTO — alvo da refatoração]

Página = **composição** de componentes de layout + dados de `src/data/`, sem `<style>` inline
de hero:

```jsx
// src/pages/institutional/Contato.jsx  [PROPOSTO]
import Hero from '../../components/layout/Hero.jsx'
import Section from '../../components/layout/Section.jsx'
import PageForm from '../../components/layout/PageForm.jsx'
import { useRevealOnScroll } from '../../hooks/useRevealOnScroll.js'

export default function ContatoPage(){
  const rootRef = useRevealOnScroll()
  return (
    <main ref={rootRef} className="route-contato">
      <Hero variant="chocolate" seal photo>
        <h1>Fale com o festival</h1>
        <p>…</p>
      </Hero>

      <Section>
        {/* conteúdo da seção, dentro do container canônico */}
      </Section>

      <Section>
        <PageForm channel="contato" />
      </Section>
    </main>
  )
}
```

**Regras de página (valem já hoje):**

- **Home é a página-mãe e é PROTEGIDA** (`CLAUDE.md §9`): não alterar sem pedido explícito.
  Todas as outras páginas usam a Home como referência de margem/respiro/hierarquia/ritmo.
- **Margem horizontal = igual à Home em TODAS as páginas** — container canônico `.wrap`
  (`max-width: 1280px; padding: 0 clamp(20px,4vw,56px)`). Não inventar largura/gutter próprios.
- **Zona de segurança entre menu e hero** (`CLAUDE.md §4.1`): o **fundo** da hero pode ir até o
  topo, mas o **conteúdo** só começa depois de `--hero-content-start`. Nunca empurrar o título
  com `margin-top` solto.
- **Acento por página** = `--page-accent`, definido em `body.route-*` no `styles.css`. Só usar
  tons **claros da paleta oficial** (contraste com `--ink`). **Nunca roxo/verde/lavanda.**
- **Sem eyebrow/kicker** acima dos títulos; **sem fonte mono** em rótulos institucionais
  (`CLAUDE.md §5`).

---

## 5. Padrão de dados

**Todo conteúdo estruturado vive em `src/data/` (JS que exporta constantes/objetos).**
A página **importa** e renderiza; **não** hardcoda listas/depoimentos/edições no JSX.

Arquivos atuais e seus papéis:

| Arquivo | Papel |
|---|---|
| `sweetCoffeeHistory.js` | **Base oficial das 16 edições** (inclui Lovers) — fonte de verdade histórica |
| `loversAwardsResults.js` | Pódios da 16ª edição (Lovers 2026.1) |
| `sweetEditionsCompat.js` | Adapter oficial→legado; cruza fontes para 2026.1 |
| `sweetHistoryStats.js` | Cálculos puros (rankings, evolução) — sem inventar dado |
| `participants.js` | 21 participantes da edição Lovers (slugs congelados — ver §12) |
| `participantAssets.js` | `resolveParticipant` + fallback de iniciais (nunca inventa logo) |
| `editionAssets.js` | Logos por edição (placeholders até entregarem os assets) |
| `sweetAwards.js`, `editions.js`, `supportMetrics.js`, `pesquisaLovers.js`, `homeGalleries.js`, `comboPhotos.js` | Config/conteúdo estruturado |

**Verdade dos dados:** o **código em `src/data/` é a verdade**. `ACERVO.md` é um resumo
legível derivado dele — se divergirem, vale o código, e aí atualize o `ACERVO.md`.
`src/data/sweetHistory.js` (se aparecer) é base **antiga** de 15 edições — migrar para
`sweetCoffeeHistory.js`.

**Regras:** não inventar dados; não criar ranking fake; não esconder ausência de dado.

**Conteúdo que ainda está hardcoded no JSX** (dívida a migrar para `src/data/` — **[PROPOSTO]**):
`TESTIMONIALS` (em `Participar.jsx`), `mediaCards`/`STEPS`/`STATS` (em `Home.jsx`),
`EVO_MARCOS`/`MOMENTOS` (em `Curiosidades.jsx`). Ao migrar, só **mover + importar** — sem mudar
o conteúdo — para `data/testimonials.js`, `data/mediaContent.js`/`data/homeContent.js`,
`data/curioContent.js`.

---

## 6. Padrão visual (tokens)

### ⚠️ Realidade atual: DOIS `:root` concorrentes

Hoje existem **dois** blocos `:root` definindo os **mesmos** nomes de token com valores
diferentes:

- `src/styles.css` (v1, terracota): `--bg:#FFF4EC`, `--ink:#2B1810`, `--accent:#E8553A`…
- `src/styles/swc-redesign.css` (v2, creme): `--bg:var(--cream)=#FFF1E6`, `--ink:var(--choco-deep)`, `--accent:var(--coral)`…

A **ordem de import em `src/main.jsx`** decide quem vence: `fonts-nexa-slab` → `styles.css`
→ **`swc-redesign.css`** → `motion-system.css`. Como `swc-redesign.css` carrega **por último**,
**os valores v2 são os que renderizam**. Há inclusive token com valor divergente ativo
(`--sidebar-w`: 240px em v1 vs 284px em v2). **Isso é conhecimento tribal e é justamente o que
o alvo abaixo elimina.**

### Alvo [PROPOSTO]: um único `src/styles/tokens.css`

Colapsar os dois `:root` em **um** arquivo `src/styles/tokens.css`, importado **PRIMEIRO** em
`main.jsx`. `styles.css` e `swc-redesign.css` passam a **só consumir** tokens (`var(--x)`),
nunca redefinir `--bg`/`--ink`/`--sidebar-w`. Valores adotados = os do v2 (os que já vencem
hoje), para o visual não mudar. Depois disso, `grep :root src/styles/*.css` deve retornar
**apenas** `tokens.css`.

### Tokens de referência (Institucional)

```css
/* cor (paleta oficial: creme, bege, rosa, amarelo, azul/ciano, coral, marrom, vinho) */
--bg: #FFF1E6;            /* fundo (creme) */
--ink: #2B1810;          /* tinta escura (espresso) */
--accent: #E8553A;       /* coral */
--peach: #F7D9B5;

/* acento por rota (fundo/acento da hero) — definido em body.route-* */
--page-accent: …;        /* ciano #2BC4E8 · rosa #F2548A · amarelo #F8B511 · coral #F2693C · azul #1B86C9 · peach #F2B6A0 */

/* container canônico (margem única — igual à Home) */
--maxw: 1280px;
--pad: clamp(20px, 4vw, 56px);
--section-y: clamp(72px, 10vw, 140px);   /* ritmo vertical de seção */

/* zona de segurança menu → hero */
--header-safe-offset: clamp(120px, 14vh, 168px);
--hero-top-clearance: clamp(32px, 4vw, 56px);
--hero-content-start: calc(var(--header-safe-offset) + var(--hero-top-clearance));

/* fontes institucionais */
--font-sans / --font-slab   /* Nexa / Nexa Slab — usar para rótulos institucionais */
--font-mono                 /* JetBrains Mono — PROIBIDO em rótulos institucionais */
```

**Radius / sombras:** usar as variáveis já definidas nos `:root` (ex. `--radius*`, `--shadow*`).
**Não** cravar `border-radius`/`box-shadow` numéricos novos em componentes — se precisar de um
valor recorrente, **crie um token** em `tokens.css` **[PROPOSTO]** (ou no `:root` v2 que vence,
enquanto tokens.css não existe) e consuma via `var()`.

**Tokens Lovers** (só dentro de `.kv-lovers`): `--lovers-red:#D63648`, `--lovers-cream:#FFF1E6`,
`--font-lovers-display`, `--font-lovers-body`. Não vazar para o institucional.

---

## 7. Padrão de motion

### Realidade atual: 3 escalas fragmentadas

`motion-system.css` (160/260/560/760ms), `swc-redesign.css` (140/240/420ms) e
`lovers-system.css` (160/260ms) definem durações próprias — mais de 50 durações únicas no total.
Além disso, `swc-redesign.css` usa `animation-timeline: view()` que é **Chrome-only sem
fallback** → Firefox/Safari não veem o reveal em alguns cards.

### Alvo [PROPOSTO]

- **Uma escala** de motion em `motion-system.css` (tokens `--dur-*`, `--ease-*`).
  `swc-redesign.css` e `lovers-system.css` **consomem** esses tokens, não redefinem.
- Todo reveal on scroll passa pelo hook **`useRevealOnScroll`** (já existe) — que serve de
  **fallback cross-browser** para o `animation-timeline: view()`. Edições hoje é a única
  institucional sem reveal; ao mexer, adicionar o hook.

### Componentes/hooks de motion

- `src/hooks/useRevealOnScroll.js` — chame no `ref` do `<main>` da página; ele revela filhos
  marcados conforme entram na viewport. Padrão em 6 páginas hoje.
- **[PROPOSTO]** extrair de `Home.jsx`: `CountUp` → `src/components/CountUp.jsx` e
  `useTilt3D` → `src/hooks/useTilt3D.js`, para reuso (Home é protegida: extrair **sem** mudar
  comportamento).

**Não** introduzir bibliotecas de animação novas (`CLAUDE.md`). Motion via CSS + os
hooks existentes.

---

## 8. COMO criar uma nova página

Passo a passo (assumindo o alvo com `<Hero>`/`<Section>` **[PROPOSTO]**; onde ainda não
existirem, replique o padrão de uma página vizinha, mas **sem** recriar hero inline própria):

1. **Confirme a branch:** `git branch --show-current` deve ser `dev/site-completo`. Se for
   `master`/`main`, **pare** (`CLAUDE.md`).
2. **Crie** `src/pages/institutional/<Nome>.jsx` como composição de `<Hero>` + `<Section>`
   (veja o esqueleto em §4). **Não** copie o `<style>` de hero de outra página.
3. **Registre a rota** em `src/router.js` e monte a página em `src/App.jsx` (respeitando as
   flags `AWARDS_ONLY_PUBLICATION` / `INSTITUTIONAL_PREVIEW`).
4. **Defina o acento** em `styles.css`: adicione `body.route-<slug>{ --page-accent: <tom claro da paleta> }`.
   Nunca roxo/verde/lavanda. Cheque contraste do texto sobre esse fundo (≥ 4.5:1).
5. **Conteúdo em dados:** qualquer lista/depoimento/card vai para `src/data/`, não para o JSX.
6. **Meta por rota:** adicione título/description (e, no alvo, `og:image`/`og:url`) em
   `src/lib/pageMeta.js`.
7. **Documente** a rota no `SITEMAP.md`.
8. **Valide:** `npm run build` + preview + `node tests/responsive.mjs`. Ver §15.

**Nunca** copie uma página inteira só para trocar textos — isso reintroduz hero/form/const
duplicados. Componha.

---

## 9. Como criar uma nova seção

Uma seção é um bloco vertical dentro de uma página. Padrão:

- Envolva no container canônico. **[PROPOSTO]** `<Section>…</Section>`; enquanto não existir,
  use `<section class="wrap">…</section>` (o `.wrap` real da Home: 1280 / `clamp(20px,4vw,56px)`).
- **Não** crie um container com largura/gutter divergentes (ex. 1180px ou `...,64px`) — isso
  quebra o alinhamento vertical entre páginas (`CLAUDE.md §4`).
- Use `--section-y` para o ritmo vertical (padding/gap), não números soltos.
- Cores só via token; sem cor nova; sem elemento gráfico solto sem função (`CLAUDE.md §5`).
- Se a seção repete um padrão que já existe em outra página, **extraia um componente** em
  `src/components/` em vez de copiar (§13).

---

## 10. Como alterar uma hero GLOBALMENTE (um lugar só)

Este é **o problema central** que a arquitetura-alvo resolve. Leia com atenção.

### Por que hoje "mudar a hero não propaga" (ATUAL — a armadilha)

1. A regra global de heros em `src/styles.css` (perto da linha 538) mira as classes
   `.ed-hero, .cur-hero, .participar-hero, .apoiar-hero, .contato-hero, .hist-hero`. Mas
   **`.ed-hero` não existe em nenhuma página** (Edições usa `.edx-hero`) — a "regra-mãe"
   já nasce sem alcançar a página que mais muda.
2. Essa regra global usa **`!important`** (`background: var(--page-accent) !important` e texto
   `var(--ink) !important`). Cada página define no seu `<style>` inline um fundo chocolate
   `#381610` + texto creme **sem `!important`**. Mesma especificidade → **o `!important`
   global vence silenciosamente**. Ou seja: **o hero que você vê no JSX da página NÃO é o que
   renderiza.** Editar o arquivo da página "não faz nada" porque a fonte de verdade real é a
   regra global.
3. Cada uma das 7 heros tem um `<style>` inline próprio → não existe **um** lugar para editar.

### Alvo [PROPOSTO]: UM componente `<Hero>` + `hero.css`

- **Um componente** `src/components/layout/Hero.jsx` para **todas** as páginas institucionais
  (exceto a Home, §9), com variantes (`variant="chocolate|accent"`) e slots (`seal`, `photo`,
  copy via `children`). Ele consome `--page-accent` e `--hero-content-start`.
- **Um CSS** para a hero — seja um `hero.css` dedicado, seja um bloco único em `styles.css` —
  **sem** `!important` brigando com páginas, porque as páginas **não terão mais** `<style>` de
  hero: elas só renderizam `<Hero>`.

**Resultado:** para mudar a hero de **todo o site** você edita **um** arquivo
(`Hero.jsx` para estrutura/variantes; o CSS da hero para aparência). A mudança propaga
automaticamente para todas as rotas que usam `<Hero>`.

### Enquanto o `<Hero>` não existir (transição — ATUAL)

Se precisar mexer numa hero **antes** da refatoração, saiba onde a verdade está:

- **Para as 5 páginas casadas pela regra global** (Curiosidades, Awards/Histórico, Participar,
  Apoiar, Contato): a aparência real vem da regra global em `styles.css` (com `!important`).
  Editar o `<style>` da página **não** propaga. Ajuste a regra global — mas entenda que ela
  afeta todas de uma vez.
- **Edições** (`.edx-hero`) escapa da global (por ter regra própria e classe diferente); a
  verdade dela está no `<style>` de `Edicoes.jsx`.
- **Home** (`.swc-hero`) tem regra própria e é protegida — não mexer.

> **Antes de qualquer mudança de hero, decida a direção com o usuário** (`CLAUDE.md`):
> hero institucional é **chocolate `#381610` + texto creme** ou **acento-claro + texto escuro**?
> Hoje o código faz as duas coisas e o `!important` decide — consolidar exige essa decisão.

---

## 11. Como alterar cores / fontes / espaçamentos (tokens)

**Alvo [PROPOSTO] — o caminho certo:** edite **`src/styles/tokens.css`** (o `:root` único) e
pronto — propaga para tudo que consome `var(--token)`.

- **Cor:** troque o valor do token (`--accent`, `--bg`, `--ink`, `--page-accent` por rota…).
  Mantenha-se **dentro da paleta oficial** (creme, bege, rosa, amarelo, azul/ciano, coral,
  marrom, vinho). **Proibido** roxo/verde/lavanda/cinza frio/preto puro. Não cravar hex solto
  em componente.
- **Fonte:** troque `--font-sans`/`--font-slab`/`--font-serif`. Para rótulos institucionais use
  Nexa (`--font-sans`/`--font-slab`); **nunca** `--font-mono`.
- **Espaçamento/ritmo:** ajuste `--section-y`, `--pad`, `--maxw`. Não inventar gutter/largura por
  página.
- **Radius/sombra:** ajuste (ou crie) o token correspondente; consuma via `var()`.

**Enquanto `tokens.css` não existir (ATUAL):** o `:root` que **vence** é o de
`src/styles/swc-redesign.css` (carrega por último). Edite **lá** para mudar cor/fonte base — e
saiba que o `:root` de `styles.css` está sendo sobrescrito. Não duplique o token nos dois com
valores diferentes (é o bug que estamos eliminando). `--page-accent` por rota fica em
`body.route-*` no `styles.css`.

**Depois de mexer em token:** faça uma **varredura visual de todas as rotas** (institucional +
Lovers via painel) — token base afeta o site inteiro.

---

## 12. Como adicionar participante / notícia / edição / card

Tudo é **dado** em `src/data/`. Adicione ao arquivo certo; a UI se atualiza sozinha.

- **Participante:** adicione ao `src/data/participants.js`.
  ⚠️ **Slugs são congelados** — os QR Codes impressos da edição Lovers apontam para
  `#/lovers/combos/{slug}`. **Nunca renomear um slug existente** nem mudar essa rota
  (`CLAUDE.md` — "URLs estáveis para QR Codes"). Logo/foto do participante entram via
  `participantAssets.js` (`resolveParticipant`, com fallback de iniciais — **nunca inventar
  logo**).
- **Edição:** a base oficial é `src/data/sweetCoffeeHistory.js` (16 edições). Logos por edição:
  `src/data/editionAssets.js`. Resultados da Lovers 2026.1: `loversAwardsResults.js`.
  Não duplicar edição em `editions.js`/`sweetHistory.js` (base antiga).
- **Card / seção de conteúdo (depoimento, matéria, "notícia", estatística):** coloque o item no
  arquivo de dados correspondente e itere sobre ele no JSX. Se ainda não houver arquivo
  (ex. depoimentos), crie um em `src/data/` (**[PROPOSTO]** `testimonials.js`,
  `mediaContent.js`, `curioContent.js`) — **não** hardcode no componente.
- **Ranking/curiosidade calculada:** use `sweetHistoryStats.js` (cálculo puro sobre a base). Não
  cravar números à mão; não criar ranking fake.

**Assets físicos:** imagens em `public/images/...` (combos em `public/images/combos/<slug>/main.jpg`).
Preservar proporção; `object-fit` adequado; alt text. Sem foto/logo → fallback editorial de
`placeholders.jsx`, nunca imagem externa aleatória nem hotlink.

---

## 13. Cuidados para NÃO duplicar componentes

Duplicação atual **conhecida** (não repita esses padrões; consolide quando encostar):

| Padrão duplicado | Onde está hoje | Fonte única alvo [PROPOSTO] |
|---|---|---|
| Hero bespoke com `<style>` inline (7×) | Home, Edicoes, Curiosidades, HistoricoAwards, Participar, Apoiar, Contato | `components/layout/Hero.jsx` |
| Container/margem por página | várias | `components/layout/Section.jsx` (+ `.wrap` canônico) |
| Form clipboard→Instagram (3×) | Participar, Apoiar, SiteFooter | `components/layout/PageForm.jsx` + `hooks/useContactForm.js` |
| `INSTAGRAM_URL` hardcoded (4×) | SiteFooter, Participar, Apoiar, Contato | `config/channels.js` |
| `useRevealOnScroll` boilerplate (6×) | várias páginas | manter o hook, padronizar a chamada |
| Escalas de motion (3×) | motion-system, swc-redesign, lovers | uma escala em `motion-system.css` |

**Regra prática:** ao ver a **2ª** cópia de qualquer coisa (JSX, lógica, constante), extraia
para `components/` (visual), `hooks/` (lógica), `config/` (constante) ou `data/` (conteúdo).
Nunca a **3ª**. Antes de criar um componente novo, faça `grep` para ver se já existe um que
resolve — **não** criar um segundo componente que faz o mesmo.

**CSS morto** a remover na consolidação: `.site-sidebar`, `.combo-rail`, o seletor `.ed-hero`
(sem consumidores), e o hack `.eyebrow{display:none}` (remover o markup morto, não escondê-lo).

---

## 14. Boas práticas de organização

- **Uma fonte de verdade por conceito.** Cor → tokens. Hero/seção/form → componente.
  Constante/canal → `config/`. Conteúdo → `data/`. Se você precisa editar o "mesmo" em dois
  lugares, um deles está errado.
- **Home é intocável** sem pedido (`CLAUDE.md §9`). Extrair componente/const da Home é permitido
  **desde que** não mude o comportamento visual — valide idêntico.
- **Escopo mínimo.** Liste os arquivos que vai tocar **antes** de editar. Mude só o que se
  relaciona ao pedido. Use `Edit` (não `Write`) em arquivos existentes. O repo pode ter WIP
  local não relacionado — **commit só os arquivos da tarefa**.
- **Branch e deploy (ABSOLUTO):** trabalhar em `dev/site-completo`; nunca alterar `master`/`main`;
  nunca `vercel --prod`; nunca promover Preview→Production. Fluxo ao finalizar: `npm run build`
  → `git status` → commit pequeno e claro (`feat:`/`fix:`/`style:`/`chore:`/`docs:`) →
  `git push origin dev/site-completo`.
- **Não** ler/exibir/versionar `.env`, secrets, tokens ou chaves.
- **Não** introduzir dependências novas sem justificativa.
- **Docs:** mantenha `CLAUDE.md` e `SITEMAP.md` atualizados quando a arquitetura mudar.
  `DESIGN.md` está desatualizado (contradiz `CLAUDE.md §5` sobre mono/eyebrow) — a fonte viva é
  o `CLAUDE.md`.
- **Higiene de repo:** `dist*`, `vite.config.js.timestamp-*` e `**/.impeccable/` **já estão no
  `.gitignore`** (verificado) — são só clutter de disco do Dropbox, **não** desversione com
  `git rm`. Gaps reais do `.gitignore` a fechar: `.devserver.log`, `por.traineddata`,
  `skills-lock.json`, e a pasta `public/logos/logo edições/` (renomear para `logo-editions/`
  por causa de espaço + acento).

---

## 15. Checklist antes de finalizar

1. Home não foi alterada sem necessidade (§9).
2. Flags `AWARDS_ONLY_PUBLICATION` / `INSTITUTIONAL_PREVIEW` intactas.
3. Nenhuma cor nova fora da paleta (sem roxo/verde/lavanda).
4. Nenhum sticker/elemento solto sem função.
5. Margens seguem a Home (`.wrap` 1280 / `clamp(20px,4vw,56px)`).
6. Zona de segurança menu→hero respeitada (`--hero-content-start`).
7. Placeholders claros e elegantes; nunca logo/foto inventada.
8. Nenhuma duplicação nova introduzida (§13).
9. `npm run build` verde.
10. `node tests/responsive.mjs` sem overflow em 6 viewports; conferir desktop/tablet/mobile.
11. Preview institucional revisado (`npm run dev` ou `*.vercel.app?preview=1`).
12. `SITEMAP.md`/`CLAUDE.md` atualizados se a arquitetura mudou.

---

> **Resumo de uma linha:** cada conceito tem **um** lugar. Se "mudar tudo" está te obrigando a
> editar N arquivos, você achou uma duplicação — consolide-a (§13) antes de seguir. É isso que
> faz a mudança global finalmente **propagar**.
