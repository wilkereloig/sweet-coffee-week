# Auditoria Completa — Sweet & Coffee Week

> Gerado por auditoria multi-agente (10 dimensões + síntese). Read-only. Fonte de verdade = código; se divergir, vale o código.

---

# 1. Relatório / Diagnóstico

## Diagnóstico Consolidado — Sweet & Coffee Week (site institucional)

**Papel:** arquiteto-líder. Consolidei as 10 dimensões de auditoria numa única leitura, resolvi sobreposições e verifiquei no código as afirmações que sustentam o plano. Onde a auditoria estava imprecisa, corrigi com evidência (marcado como CORREÇÃO).

---

### RESUMO EXECUTIVO — a dor real e sua causa-raiz

A dor central do usuário — *"mudo os heros/algo global e não propaga"* — **não é um bug isolado, é a consequência direta de 4 falhas de arquitetura que se reforçam**:

1. **Seletor global morto (`.ed-hero`).** A regra global que deveria controlar TODOS os heros institucionais (`src/styles.css:538`) mira `.ed-hero`, mas **nenhuma página renderiza essa classe** (confirmado: `grep` por `className="ed-hero"` em `src/` retorna vazio). A página Edições usa `.edx-hero`. Ou seja, a regra "mãe" dos heros já nasce sem alcançar a página que mais mudou.

2. **A regra global BRIGA com cada página via `!important` e ganha silenciosamente.** `src/styles.css:538-549` força `background: var(--page-accent) !important` e `:is(h1,p){ color: var(--ink) !important }`. Cada página (Participar, Curiosidades, Apoiar, Contato, HistoricoAwards) redefine no seu `<style>` inline `background:#381610` + texto `var(--cream)` **SEM `!important`** (ex.: `Participar.jsx:362`, `Curiosidades.jsx:297`, `Contato.jsx:93`, `HistoricoAwards.jsx:355`). Mesma especificidade (0,1,0), mas o `!important` do arquivo global vence independentemente da ordem. **Resultado: o hero que o dev vê no JSX (chocolate escuro, texto creme) NÃO é o que renderiza — o global impõe fundo claro (acento) + texto escuro.** É exatamente por isso que editar o arquivo da página "não faz nada": a regra global invisível está sobrescrevendo. Quem edita a página não sabe que a fonte de verdade é outra.

3. **Dois sistemas de tokens `:root` concorrentes.** `src/styles.css:8-67` (v1, terracota: `--bg:#FFF4EC`, `--ink:#2B1810`, `--accent:#E8553A`) e `src/styles/swc-redesign.css:7-111` (v2, creme: `--bg:var(--cream)=#FFF1E6`, `--ink:var(--choco-deep)`, `--accent:var(--coral)`). O v2 carrega por último em `main.jsx:5` e vence, mas ambos definem os MESMOS nomes de token com valores diferentes. Há até token duplicado com valor divergente ativo: `--sidebar-w:240px` (styles.css:65) vs `--sidebar-w:284px` (swc-redesign.css:110). Mudar uma cor "base" exige saber qual dos dois `:root` ganha — conhecimento tribal, não óbvio.

4. **Zero componentes compartilhados de página.** Não existe `<Hero>`, `<Section>`, `<PageForm>`. Há **7 implementações de hero** bespoke, cada uma com bloco `<style>` inline próprio dentro do `.jsx`; a lógica de formulário (clipboard→Instagram) está copiada **3x** (Participar, Apoiar, SiteFooter); `INSTAGRAM_URL` está hardcoded **4x**. Sem ponto único de edição, "mudar todos os X" é intrinsecamente impossível — é sempre N edições manuais em N arquivos, com N chances de esquecer um.

**Conclusão:** a arquitetura tem múltiplas "fontes de verdade" para a mesma coisa (cor base em 2 lugares, estilo de hero em global-morto + 7 inline, canais em 4 lugares). O plano abaixo ataca a raiz: **colapsar cada conceito numa fonte única** (tokens → 1 arquivo; hero → 1 componente; dados/canais → `src/data`), antes de qualquer polimento visual. Sem isso, todo trabalho de motion/responsivo/refino continuará não-propagando.

**Gravidade geral:** os problemas são de **manutenibilidade/arquitetura**, não de quebra funcional em produção — porque produção hoje mostra só o Sweet Awards (`AWARDS_ONLY_PUBLICATION=true`). Isso é uma bênção: dá margem segura para refatorar o institucional (via `INSTITUTIONAL_PREVIEW`) sem afetar o site oficial.

---

### PROBLEMAS POR SEVERIDADE

#### 🔴 CRÍTICO (raiz da dor — bloqueiam propagação global)

**C1. Seletor global de hero morto + guerra de `!important`.**
`src/styles.css:538-559` controla `.ed-hero,.cur-hero,.participar-hero,.apoiar-hero,.contato-hero,.hist-hero`. `.ed-hero` não existe em lugar nenhum (Edições = `.edx-hero`, auto-contido). Para as 5 páginas que casam, o global `!important` (fundo=acento, texto=ink) sobrescreve o `<style>` inline de cada página (fundo=#381610, texto=creme, sem `!important`). Efeito: intenção de design divergente da renderização; edições nas páginas são engolidas. **Esta é a causa nº1 de "não propaga".** (Confirma memória `heros-institucionais-faixa.md`: "regra global styles.css controla 6 heros".)

**C2. Dois `:root` de tokens (v1 terracota vs v2 creme).**
`styles.css:8-67` e `swc-redesign.css:7-111`. v2 vence por ordem de import (`main.jsx:4-5`). ~15 tokens com valores conflitantes (`--bg`, `--bg-soft`, `--bg-card`, `--ink-soft`, `--line`), `--sidebar-w` duplicado (240 vs 284), fontes `--font-serif`/`--font-sans` remapeadas. Nenhuma fonte única de verdade para cor/tipo. Toda mudança de token é ambígua.

**C3. Sem componentes de página → duplicação estrutural.** 7 heros inline, form 3x (`Participar.jsx:127-165`, `Apoiar.jsx:124-159`, `SiteFooter.jsx:20-62`), `INSTAGRAM_URL` 4x, `useRevealOnScroll` boilerplate em 6 páginas. Páginas gigantes misturando dados+layout+lógica+CSS: `Home.jsx` 852 linhas, `Apoiar.jsx` 524, `Participar.jsx` 517, `HistoricoAwards.jsx` 514.

**C4. QR Codes impressos quebrados.** `src/App.jsx:59-72` redireciona `#/lovers/combos/:slug` e `#/lovers/awards` → home. CLAUDE.md (regra permanente "URLs estáveis para QR Codes") diz que essas rotas NÃO podem mudar. Hoje, QR Code impresso da edição Lovers cai na home. **Contradição direta com regra de ouro do projeto — decisão explícita do usuário necessária** (pode ser intencional pós-encerramento da edição, mas viola regra escrita).

**C5. Contraste AA falha no hero Apoiar.** Azul `#1B86C9` (`--page-accent` de Apoiar, styles.css:527) + texto `--ink` escuro = ~3.2:1 (< 4.5:1 WCAG AA). PORÉM — devido a C1, o que renderiza hoje é fundo azul + texto escuro forçado pelo `!important` global, então a falha **é real e ativa**. (Some-se: o CLAUDE.md §3 exige acento claro contrastando com `--ink`; azul #1B86C9 é escuro demais para texto escuro.)

**C6. OG/Twitter cards estáticos.** `index.html:17-26` fixo em "Sweet Awards 2026", `og:image=favicon-512.png` (não 1200x630). Todo compartilhamento (WhatsApp/Instagram) mostra o mesmo card, mesmo que a rota seja /participar. `pageMeta.js` atualiza title/description no runtime, mas crawlers sociais não executam JS.

#### 🟠 VISUAL / IDENTIDADE

**V1. Direção do hero divergiu da regra escrita.** CLAUDE.md §3 diz "acento por página = fundo cheio da hero, texto escuro". Mas as páginas foram reescritas para hero **chocolate escuro #381610 + texto creme** (igual à Home). A regra global nunca foi atualizada. **Há uma decisão de design pendente:** ou (a) heros são chocolate (atualizar global + CLAUDE.md §3), ou (b) heros são acento-claro (remover `background:#381610` das páginas). Hoje o código faz as duas coisas ao mesmo tempo e o `!important` decide. Isto precisa de 1 decisão do usuário antes de consolidar.

**V2. Home = página-mãe, mas diverge estruturalmente.** Home usa `.swc-hero` e o grid `--hm-gutter: clamp(28px,11.5vw,150px)` (swc-redesign.css:100), enquanto CLAUDE.md §4 define o container canônico como `.wrap` (max 1280 / `clamp(20px,4vw,56px)`). São dois sistemas de margem. CLAUDE.md §9 proíbe mexer na Home — então o alinhamento deve ser feito trazendo as OUTRAS páginas para o padrão, e documentando qual é o real.

**V3. `.eyebrow` é morto por CSS, não removido do código.** `swc-redesign.css:298` faz `.page-enter section .eyebrow{display:none}`. Cumpre CLAUDE.md §5 (sem eyebrow) na marra, mas deixa markup morto e é frágil. Fonte mono (`JetBrains Mono`) ainda referenciada em rótulos (contra CLAUDE.md §5 / memória `mono-font-rejeitada.md`).

**V4. `.edx-hero` é ilha.** Edições define seus próprios tokens de safe-zone inline (`Edicoes.jsx:326-329`) reduplicando os globais de `styles.css:518-520`. Funciona, mas é mais um lugar para manter sincronizado.

#### 🟡 TÉCNICO / DADOS

**T1. CSS morto:** `.site-sidebar` (styles.css:839-933) + `.combo-rail` (935-1010) = ~174 linhas com `display:none`. Alimentadas pelo `--sidebar-w`/`--combo-rail-w` conflitantes. Redesign removeu a sidebar mas escondeu via CSS em vez de deletar.

**T2. Conteúdo hardcoded em JSX (deveria estar em `src/data/`, que já tem 13 arquivos bem organizados):** `TESTIMONIALS` (Participar.jsx:51-57, depoimentos reais), `mediaCards`/`STEPS`/`STATS` (Home.jsx:29-79), `EVO_MARCOS`/`MOMENTOS` (Curiosidades.jsx:47-60). Padrão do projeto é dados em `src/data/` — estes são exceções.

**T3. Formulários sem backend:** Apoiar e Contato copiam+abrem Instagram (honesto, mas TODO pendente). Não é bug, é feature incompleta.

**T4. Hierarquia de headings:** Home tem 25 headings, 1 `<h1>`, resto H2/H3/H4 sem sequência limpa (a11y). Labels de form usam placeholder como rótulo (some ao digitar; screen reader não lê).

**T5. Sistema de motion fragmentado em 3 escalas:** motion-system.css (160/260/560/760ms) vs swc-redesign.css (140/240/420ms) vs lovers (160/260ms). 57+ durações únicas de transition. `animation-timeline: view()` (swc-redesign) é Chrome-only sem fallback → Firefox/Safari veem cards sem reveal. Edições não usa `useRevealOnScroll` (única institucional sem reveal).

#### 🔵 PERFORMANCE / HIGIENE

**P1. `public/images/fotos-combos-site/` = 204 MB (64% do peso), sem referência no código.** `adesivos-site/` = 33 MB, sem uso. 13 SVGs de logo com 64 KB cada (esperado <8 KB). **Ação exige confirmação do usuário** (pode ser acervo bruto a migrar, não deletar às cegas).

**P2. Clutter on-disk (Dropbox), NÃO no Git — CORREÇÃO da auditoria.** A auditoria afirmou que 13 `dist*`, `.impeccable/` e 172 `vite.config.js.timestamp-*` estavam "commitados / inchando o .git". **Falso, verificado:** `git check-ignore` confirma `dist`/`dist_b` ignorados; `git ls-files` retorna 0 para impeccable/timestamp/dist. O `.gitignore` já cobre `dist*/`, `vite.config.js.timestamp-*`, `**/.impeccable/`. São arquivos locais sincronizados pelo Dropbox — poluem o disco e o `git status` como untracked só nos 4 casos abaixo, não o repositório. Fix = deletar do disco + fechar 4 gaps do `.gitignore`, **não** `git rm`.

**P3. Gaps reais do `.gitignore` (untracked em `git status`):** `.devserver.log`, `por.traineddata` (2.4 MB, OCR espúrio), `skills-lock.json`, e a pasta `public/logos/logo edições/` (espaço + acento no nome — risco em CI/deploy).

**P4. Docs sobrepostos:** 10 .md na raiz; DESIGN.md §2 ("mono p/ eyebrow") contradiz CLAUDE.md §5 (registrada rejeição do usuário). CLAUDE.md é a fonte viva; DESIGN.md está desatualizado.

---

### O QUE ESTÁ CERTO (não mexer)

- Separação de identidades Institucional × Lovers: impecável, `lovers-system.css` isolado (CLAUDE.md respeitado).
- `src/data/` (13 arquivos, ~4.6k linhas): base histórica robusta, `resolveParticipant` com fallback de iniciais nunca inventa logo, adapter `sweetEditionsCompat` cruza fontes corretamente.
- `AWARDS_ONLY_PUBLICATION` + `INSTITUTIONAL_PREVIEW`: gate de produção correto — nunca vaza no domínio oficial.
- Lazy-load do Painel Lovers (ExcelJS 938 KB fora do bundle institucional).
- `useRevealOnScroll`, `PhotoRotator`, `icons.jsx`, `placeholders.jsx`, `SiteHeader/Footer`, `CookieConsent`, `ErrorBoundary`: bem componentizados.
- Heros já NÃO têm 1080px fixo (clamp) — CLAUDE.md §4 cumprido.
- `tests/responsive.mjs`: valida overflow/header/menu em 6 viewports.
- Contato já corrigido de lavanda→peach (fora-da-paleta resolvido).

---

# 2. Inventário

## Inventário

### Páginas e rotas

| Rota (hash) | Componente | Arquivo | `body.route-*` | Acento (`--page-accent`) | Linhas | Estado |
|---|---|---|---|---|---|---|
| `#/` | HomePage | pages/institutional/Home.jsx | route-home | cyan #2BC4E8 | ~852 | Página-mãe (PROTEGIDA §9) |
| `#/edicoes` | EdicoesPage | pages/institutional/Edicoes.jsx | route-edicoes | cyan #2BC4E8 | ~459 | Ativa; hero `.edx-hero` ilha |
| `#/curiosidades` | CuriosidadesPage | pages/institutional/Curiosidades.jsx | route-curiosidades | yellow #F8B511 | ~550 | Ativa |
| `#/sweet-awards` | HistoricoAwardsPage | pages/institutional/HistoricoAwards.jsx | route-historico-awards | pink #F2548A | ~514 | Ativa (Hall) |
| `#/participar` | ParticiparPage | pages/institutional/Participar.jsx | route-participar | coral #F2693C | ~517 | Ativa; form s/ backend |
| `#/apoiar` | ApoiarPage | pages/institutional/Apoiar.jsx | route-apoiar | blue #1B86C9 (contraste AA falha) | ~524 | Ativa; form s/ backend |
| `#/contato` | ContatoPage | pages/institutional/Contato.jsx | route-contato | peach #F2B6A0 | ~200 | Ativa |
| `#/pesquisa` | PesquisaPage | pages/institutional/Pesquisa.jsx | route-pesquisa | — | ~250 | Pública, isenta Awards-only |
| `#/painel-admin` | PainelAdminPage | pages/institutional/PainelAdmin.jsx | route-painel-admin | — | ~400 | Interna, s/ header |
| `#/lovers/painel` | PainelPage (lazy) | pages/lovers/Painel.jsx | route-painel | — | ~600 | Interna, lazy, s/ header |
| `#/lovers/combos/:slug`, `#/lovers/awards`, `#/mapa`, `#/rota`, `#/participantes` | → redirect home | App.jsx:59-72 | route-home | — | — | **QR quebrado (C4)** |

Flags: `AWARDS_ONLY_PUBLICATION=true` (App.jsx:33) esconde todo institucional em produção. `INSTITUTIONAL_PREVIEW` (App.jsx:42-52) libera preview em DEV e em `*.vercel.app?preview=1`, nunca em `sweetcoffeeweek.com.br`.

### Heros — a raiz do "não propaga"

| Página | Classe no JSX | Onde o estilo vive | Casada pela regra global styles.css:538? | Fundo que o dev escreveu | Fundo que RENDERIZA |
|---|---|---|---|---|---|
| Home | `.swc-hero` | Home.jsx `<style>` :446 | não (tem regra própria :555) | #381610 / #2B1810 | #2B1810 (ok) |
| Edições | `.edx-hero` | Edicoes.jsx `<style>` :337 | **NÃO (global mira `.ed-hero` morto)** | #381610 | #381610 (escapa do global) |
| Curiosidades | `.cur-hero` | Curiosidades.jsx `<style>` :297 | SIM (`!important`) | #381610 + texto creme | **acento + texto ink (global vence)** |
| Awards | `.hist-hero` | HistoricoAwards.jsx `<style>` :355 | SIM (`!important`) | #381610 + texto creme | **acento + texto ink** |
| Participar | `.participar-hero` | Participar.jsx `<style>` :362 | SIM (`!important`) | #381610 + texto creme | **acento + texto ink** |
| Apoiar | `.apoiar-hero` | Apoiar.jsx `<style>` :164+ | SIM (`!important`) | #381610 + texto creme | **acento + texto ink** |
| Contato | `.contato-hero` | Contato.jsx `<style>` :93 | SIM (`!important`) | #381610 + texto creme | **acento + texto ink** |

Selector `.ed-hero`: **0 consumidores em `src/`** (verificado). É código morto que deveria ser `.edx-hero` — e mesmo assim `.edx-hero` já escapa por ter regra própria.

### Sistemas de tokens (2 `:root` concorrentes)

| Token | v1 styles.css:8-67 | v2 swc-redesign.css:7-111 (vence) | Conflito |
|---|---|---|---|
| `--bg` | #FFF4EC | var(--cream)=#FFF1E6 | sim |
| `--bg-soft` | #FBEADC | var(--cream-deep)=#FBE6D2 | sim |
| `--bg-card` | #FFFFFF | var(--cream-card)=#FFF8F0 | sim |
| `--ink` | #2B1810 | var(--choco-deep) | equivalente |
| `--ink-soft` | #6B4A3A | #6B4A38 | 1 bit |
| `--accent` | #E8553A | var(--coral)=#E8553A | equivalente |
| `--line` | rgba(43,24,16,.12) | var(--paper-line)=#EAD7C4 | sim |
| `--sidebar-w` | 240px | 284px | **sim, ativo** |
| `--font-serif`/`--font-sans` | nexa/nexa-text | remapeado p/ Nexa Slab | sim |

Ordem de carga (main.jsx): fonts-nexa-slab → **styles.css** → **swc-redesign.css** → motion-system.css. lovers-system.css é lazy (via Painel). Total CSS ~6185 linhas; ~220 mortas.

### Duplicação de componentes/lógica

| Padrão | Ocorrências | Arquivos |
|---|---|---|
| Hero bespoke + `<style>` inline | 7 | Home, Edicoes, Curiosidades, HistoricoAwards, Participar, Apoiar, Contato |
| Form clipboard→Instagram | 3 | Participar.jsx:127-165, Apoiar.jsx:124-159, SiteFooter.jsx:20-62 |
| `INSTAGRAM_URL` const | 4 | SiteFooter:6, Participar:20, Apoiar:21, Contato:13 |
| `useRevealOnScroll(rootRef)` boilerplate | 6 | Home, Participar, Apoiar, Contato, Curiosidades, HistoricoAwards |
| Escalas de motion | 3 | motion-system.css, swc-redesign.css, lovers-system.css |

### Dados (`src/data/`, 13 arquivos — bem estruturado)

| Arquivo | Papel |
|---|---|
| sweetCoffeeHistory.js | Base oficial 16 edições (fonte de verdade) |
| loversAwardsResults.js | Pódios 16ª edição (Lovers) |
| sweetEditionsCompat.js | Adapter oficial→legado (cruza fontes p/ 2026.1) |
| sweetHistoryStats.js | Cálculos puros (rankings, evolução) |
| participants.js | 21 participantes Lovers |
| participantAssets.js | resolveParticipant + fallback iniciais |
| editionAssets.js | Logos por edição (16 placeholders, 0 entregues) |
| sweetAwards.js, editions.js, supportMetrics.js, pesquisaLovers.js, homeGalleries.js, comboPhotos.js | Config/conteúdo estruturado |

Conteúdo AINDA hardcoded em JSX (candidato a `src/data/`): `TESTIMONIALS` (Participar:51-57), `mediaCards`/`STEPS`/`STATS` (Home:29-79), `EVO_MARCOS`/`MOMENTOS` (Curiosidades:47-60).

### Assets principais

| Pasta/arquivo | Tamanho | Uso | Ação |
|---|---|---|---|
| public/images/fotos-combos-site/ | 204 MB | sem ref no código | confirmar → migrar/remover |
| public/images/combos/ (21 JPG) | 71 MB | ativo (126-405 KB/foto) | comprimir 75% + srcset |
| public/images/adesivos-site/ | 33 MB | sem ref | remover (confirmar) |
| 13× logo-*.svg | 64 KB cada | header/footer | SVGO |
| public/logos/logo edições/ | — | acento+espaço no nome | renomear (untracked) |

### Higiene de repo — CORREÇÃO da auditoria

| Item | Auditoria disse | Verdade verificada |
|---|---|---|
| 13× `dist*` | "commitado, incha .git" | **ignorado** (`.gitignore: dist*/`), só clutter de disco Dropbox |
| 172× vite.timestamp | "deveria estar no gitignore" | **já está** (`vite.config.js.timestamp-*`), ignorado |
| `.impeccable/` | "rastreado no Git" | **0 tracked** (`.gitignore: **/.impeccable/`) |
| Gaps REAIS gitignore | — | `.devserver.log`, `por.traineddata`, `skills-lock.json`, `logo edições/` (untracked) |

### Docs raiz (10, sobrepostos)
ACERVO.md (646), CLAUDE.md (367, fonte viva), CODE_REVIEW_GRAPH.md (204), PROJECT_CONTEXT.md (187, obsoleto), DESIGN.md (148, contradiz CLAUDE.md §5), CLAUDE_HANDOFF.md (114), HOME-TEXTOS.md (112), README.md (105), SITEMAP.md (72), PRODUCT.md (68).

---

# 3. Arquitetura Ideal

## Arquitetura IDEAL (alvo)

O princípio único: **cada conceito tem UMA fonte de verdade.** Cor → 1 arquivo de tokens. Estrutura de hero/seção → 1 componente. Canal/constante → 1 config. Conteúdo → `src/data/`. Quando isso vale, "mudar todos os heros" vira editar 1 arquivo, e a propagação é automática.

### Camadas alvo

**1. Tokens (design system) — colapsar os 2 `:root` em 1.**
Hoje `styles.css:8-67` (v1) e `swc-redesign.css:7-111` (v2) competem. Alvo: um único `src/styles/tokens.css` carregado PRIMEIRO em `main.jsx`, contendo cor/tipo/espaço/raio/sombra/motion. `styles.css` e `swc-redesign.css` passam a só CONSUMIR tokens, nunca redefinir `--bg`/`--ink`/`--sidebar-w`. Isso remove a ambiguidade "qual `:root` vence".

**2. Componentes de página compartilhados — o coração da correção.**
Criar `src/components/layout/`:
- `<Hero variant="chocolate|accent" accent seal photo>{children}</Hero>` — UM hero para todas as páginas institucionais (exceto Home §9). Consome `--page-accent` e a safe-zone global `--hero-content-start`. Substitui os 7 blocos `<style>` inline. Editar o hero de todo o site = editar este componente.
- `<Section>` / `<Wrap>` — encapsula o container canônico `.wrap` (1280 / clamp(20,4vw,56)) do CLAUDE.md §4, ponto único de margem.
- `<PageForm>` + hook `useContactForm()` — colapsa a lógica clipboard→Instagram (hoje 3x). Quando o backend chegar (Formspree/Supabase), muda-se 1 arquivo.

**3. Config única.** `src/config/channels.js` com `INSTAGRAM_URL`/handle (hoje 4x). Meta social por rota já preparada em `src/lib/pageMeta.js` — estender p/ og:image por rota.

**4. Dados.** Já forte em `src/data/`. Migrar as 3 exceções (testimonials, mediaContent, curioContent) p/ lá, mantendo o padrão.

**5. Estilos.** `styles.css` deixa de ter regras que brigam via `!important`; o hero vira responsabilidade do componente `<Hero>` + tokens. Deletar CSS morto (`.site-sidebar`, `.combo-rail`, `.ed-hero`).

**6. Motion.** Uma escala em `motion-system.css`; `swc-redesign.css` e lovers consomem os mesmos tokens. `animation-timeline: view()` ganha fallback via `useRevealOnScroll` (que já existe) para Firefox/Safari.

**7. Assets / Perf.** Acervo pesado (`fotos-combos-site/`) migrado ou removido após confirmação; combos comprimidos + `srcSet`; SVGs via SVGO.

**8. SEO/A11y.** `og:image` 1200×630 por rota; `sitemap.xml`+`robots.txt`+`canonical`; hierarquia de headings; `<span>` label + placeholder.

### Árvore sugerida

```
site-sweet-coffee-week/
├── docs/                          # consolidar .md da raiz (mantém CLAUDE.md/SITEMAP.md na raiz)
│   ├── DESIGN_SYSTEM.md           # funde DESIGN.md (corrige contradição §5) + tokens
│   ├── DATA_SOURCES.md            # ACERVO.md + mapa de src/data
│   └── ONBOARDING.md              # absorve CLAUDE_HANDOFF.md, PROJECT_CONTEXT.md (obsoleto)
├── public/
│   ├── images/
│   │   ├── combos/<slug>/main.jpg        # comprimir + gerar srcset
│   │   └── (fotos-combos-site → migrar/remover após confirmar)
│   ├── logos/
│   │   └── logo-editions/                # RENOMEAR de "logo edições/" (sem espaço/acento)
│   ├── sitemap.xml                       # criar
│   └── robots.txt                        # criar
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Hero.jsx            # ★ UM hero p/ todas (exceto Home) — fim dos 7 inline
│   │   │   ├── Section.jsx         # ★ container canônico .wrap (margem única §4)
│   │   │   └── PageForm.jsx        # ★ form único (fim da tripla duplicação)
│   │   ├── CountUp.jsx             # extrair de Home.jsx
│   │   ├── nav.jsx, SiteFooter.jsx, icons.jsx, placeholders.jsx, PhotoRotator.jsx ...
│   ├── config/
│   │   └── channels.js            # ★ INSTAGRAM_URL/handle único (fim das 4 cópias)
│   ├── hooks/
│   │   ├── useContactForm.js      # ★ lógica clipboard→Instagram (+futuro backend)
│   │   ├── useTilt3D.js           # extrair de Home.jsx
│   │   └── useRevealOnScroll.js
│   ├── data/                      # + testimonials.js, mediaContent.js, curioContent.js
│   ├── lib/pageMeta.js            # estender: og:image/og:url por rota
│   ├── pages/institutional/       # páginas viram composição de <Hero>/<Section>/<PageForm>
│   ├── pages/lovers/
│   └── styles/
│       ├── tokens.css             # ★ ÚNICO :root (cor/tipo/espaço/motion) — carrega 1º
│       ├── styles.css             # consome tokens; SEM :root duplicado; sem CSS morto
│       ├── swc-redesign.css       # consome tokens; sem redefinição de --bg/--ink
│       ├── motion-system.css      # escala única de motion
│       └── lovers-system.css      # isolado (não tocar)
└── .gitignore                     # + .devserver.log, por.traineddata, skills-lock.json
```

**Nota de segurança de escopo:** Home (§9), rotas QR congeladas, paleta oficial (sem roxo/verde/lavanda), e separação Institucional×Lovers permanecem invioláveis. A refatoração é "trocar N fontes por 1", preservando o output visual aprovado — não é redesign.

---

# 4. Plano de Refatoração (9 etapas)

## Plano de refatoração — 9 etapas (+ Etapa 0)

Regras: cada etapa é pequena, isolada, reversível, e termina com `npm run build` verde + revisão no preview institucional (`npm run dev` ou `*.vercel.app?preview=1`). Nunca tocar Home (§9), rotas QR, paleta, ou identidade Lovers sem decisão explícita. Trabalhar em `dev/site-completo`, commitar só arquivos da tarefa.

---

### ETAPA 0 — Documentação e decisões-gatilho (fazer ANTES de codar)
- **O QUE:** (a) Registrar em CLAUDE.md a descoberta do hero (§C1/V1) e obter do usuário 2 decisões: **(D1)** hero institucional é chocolate #381610 ou acento-claro? **(D2)** QR Codes `#/lovers/*` redirecionar p/ home é intencional (edição encerrada) ou precisa voltar a funcionar? (b) Corrigir contradição DESIGN.md §2 × CLAUDE.md §5 (mono/eyebrow) marcando CLAUDE.md como fonte viva.
- **ARQUIVOS:** CLAUDE.md, DESIGN.md (nota de "desatualizado").
- **RISCO:** Nenhum (só texto).
- **BENEFÍCIO:** Sem D1, a Etapa 2 não sabe qual hero consolidar; sem D2, arrisca-se violar regra de ouro. Destrava tudo.
- **COMO VALIDAR:** Usuário confirma D1 e D2 por escrito.

---

### ETAPA 1 — Correções críticas de arquitetura (raiz do "não propaga")
- **O QUE:** Matar a guerra de `!important` do hero SEM mudar o visual renderizado. (1) Corrigir o seletor morto `.ed-hero`→`.edx-hero` OU removê-lo (Edições já escapa). (2) Alinhar a regra global `styles.css:538-559` à decisão D1: se D1=chocolate, trocar `background: var(--page-accent)!important` por `background: var(--choco-deep)` e texto `var(--cream)`, removendo os `!important` que sobrescrevem as páginas; se D1=acento, remover `background:#381610` dos `<style>` das páginas. (3) Aplicar D2 nos redirects `App.jsx:59-72`. Fazer 1 subcommit por item.
- **ARQUIVOS:** src/styles.css:538-559; (se D1=acento) os 5-6 `.jsx` de página; src/App.jsx.
- **RISCO:** Médio — mexe no ponto mais sensível. Mitigado por: preview lado-a-lado antes/depois; 1 página por vez; screenshot de cada hero.
- **BENEFÍCIO:** **Elimina a causa nº1 da dor.** A partir daqui, hero tem 1 fonte de verdade coerente. Correções C1/C4/V1.
- **COMO VALIDAR:** `npm run build`; abrir /edicoes /curiosidades /participar /apoiar /contato /sweet-awards no preview; cada hero idêntico à intenção aprovada; DevTools confirma que a página não é mais sobrescrita por `!important` fantasma; QR conforme D2.

---

### ETAPA 2 — Componentes globais (`<Hero>`, `<Section>`, `<PageForm>`)
- **O QUE:** Criar `src/components/layout/Hero.jsx` (variantes chocolate/accent, slots seal/photo/copy, consome `--hero-content-start` e `--page-accent`), `Section.jsx` (container `.wrap` canônico §4), `PageForm.jsx`+`useContactForm()`. Migrar UMA página piloto (Contato, a menor ~200 linhas) para usar os 3. Manter as outras como estão nesta etapa.
- **ARQUIVOS:** novos em src/components/layout/, src/hooks/useContactForm.js, src/config/channels.js; refatorar Contato.jsx.
- **RISCO:** Médio (só na piloto). Isolado.
- **BENEFÍCIO:** Cria o ponto único de edição de hero/seção/form. Valida o padrão antes de escalar. Correções C3.
- **COMO VALIDAR:** `npm run build`; /contato pixel-equivalente ao atual; editar 1 prop no `<Hero>` e ver refletir; diff de Contato.jsx menor.

---

### ETAPA 3 — Design system: colapsar os 2 `:root` em `tokens.css`
- **O QUE:** Criar `src/styles/tokens.css` com o `:root` unificado (valores v2 vencem, pois já são os que renderizam). Importar PRIMEIRO em `main.jsx`. Remover os blocos `:root` de `styles.css:8-67` e `swc-redesign.css:7-111`, deixando ambos só consumindo. Resolver `--sidebar-w` (1 valor). Deletar CSS morto `.site-sidebar`/`.combo-rail`/`.ed-hero` e o hack `.eyebrow{display:none}` (remover eyebrow do markup se houver).
- **ARQUIVOS:** src/styles/tokens.css (novo), main.jsx, styles.css, swc-redesign.css.
- **RISCO:** Médio-alto (cor base global). Mitigado: valores idênticos aos que já vencem hoje → visual deve ficar igual; comparar screenshots de todas as páginas.
- **BENEFÍCIO:** 1 fonte de verdade para cor/tipo/espaço. "Mudar a paleta" vira 1 arquivo. Correções C2, T1, V3.
- **COMO VALIDAR:** `npm run build`; varredura visual de todas as rotas (institucional + Lovers via painel) sem regressão; `grep :root src/styles/*.css` retorna só tokens.css.

---

### ETAPA 4 — Dados e conteúdo (migrar hardcoded → `src/data/`)
- **O QUE:** Extrair `TESTIMONIALS`→data/testimonials.js, `mediaCards`/`STEPS`/`STATS`→data/mediaContent.js+homeContent.js, `EVO_MARCOS`/`MOMENTOS`→data/curioContent.js. Só mover + importar (sem mudar conteúdo).
- **ARQUIVOS:** novos em src/data/; Participar.jsx, Home.jsx, Curiosidades.jsx (só imports).
- **RISCO:** Baixo (Home §9: mover const p/ data é permitido, não altera layout — mas confirmar que "não alterar" não veta; se em dúvida, deixar Home fora e migrar só Participar/Curiosidades).
- **BENEFÍCIO:** Editar depoimento/matéria sem tocar JSX. Segue padrão do projeto. Correção T2.
- **COMO VALIDAR:** `npm run build`; páginas idênticas; conteúdo agora em src/data/.

---

### ETAPA 5 — Responsividade (normalizar breakpoints)
- **O QUE:** Alinhar o breakpoint mobile/desktop: `Edicoes.jsx:205` usa 980px, resto usa 960px → padronizar 960px. `photo booth .pb-stage width:360px`→`min(360px,90vw)` (lovers-system.css:376). `.mapa__list max-height` responsivo <540px. Documentar tokens `--bp-*` em tokens.css.
- **ARQUIVOS:** Edicoes.jsx, lovers-system.css, styles.css, tokens.css.
- **RISCO:** Baixo.
- **BENEFÍCIO:** Remove salto de layout em 960-979px; corrige squeeze <375px.
- **COMO VALIDAR:** `node tests/responsive.mjs` (6 viewports) sem overflow; testar 960/979px manualmente.

---

### ETAPA 6 — Performance (assets + motion)
- **O QUE:** Após confirmação do usuário (P1): remover `adesivos-site/` (33 MB) e resolver `fotos-combos-site/` (204 MB, migrar/remover). SVGO nos 13 logos. Comprimir combos (JPEG 75%) + `srcSet`. Consolidar escalas de motion em motion-system.css; `swc-redesign`/lovers consomem; dar fallback `useRevealOnScroll` ao `animation-timeline: view()`; adicionar reveal a Edições.
- **ARQUIVOS:** public/images/*, styles/motion-system.css, swc-redesign.css, Edicoes.jsx.
- **RISCO:** Médio (deletar asset — SÓ com confirmação; nunca deletar às cegas).
- **BENEFÍCIO:** −65% payload; motion consistente e cross-browser.
- **COMO VALIDAR:** `npm run build`; conferir bundle; Firefox/Safari mostram reveal; imagens carregam.

---

### ETAPA 7 — SEO e acessibilidade
- **O QUE:** `og:image` 1200×630 por rota (estender pageMeta.js) + `og:url`/`canonical` dinâmicos; criar `public/sitemap.xml`+`robots.txt`. Contraste: aplicar decisão de Etapa 1 ao Apoiar (texto branco ou acento mais escuro — dentro da paleta). Hierarquia de headings (H1 único/sequência). Labels `<span>`+placeholder. Links internos onClick→`<button>` em Contato.jsx:34-40.
- **ARQUIVOS:** index.html, src/lib/pageMeta.js, public/sitemap.xml, robots.txt, styles.css (contraste), páginas com heading/label.
- **RISCO:** Baixo-médio (contraste pode mudar leve o visual do hero Apoiar — validar com usuário).
- **BENEFÍCIO:** Cards sociais corretos; AA cumprido; descoberta em busca. Correções C5, C6, T4.
- **COMO VALIDAR:** Lighthouse a11y+SEO; checar contraste ≥4.5:1; testar share card.

---

### ETAPA 8 — Preparação para motion e transições
- **O QUE:** Com tokens de motion unificados (Etapa 6), extrair `CountUp`→componente e `useTilt3D`→hook (de Home.jsx). Preparar (sem ativar) page-transition via View Transitions API no router, atrás de flag. Não introduzir libs novas (CLAUDE.md).
- **ARQUIVOS:** src/components/CountUp.jsx, src/hooks/useTilt3D.js, src/router.js (opcional, flagged).
- **RISCO:** Baixo (Home §9: extrair sem mudar comportamento; validar idêntico).
- **BENEFÍCIO:** Motion reutilizável; base pronta p/ transições futuras.
- **COMO VALIDAR:** `npm run build`; Home visualmente idêntica; CountUp/Tilt funcionam.

---

### ETAPA 9 — Limpeza de código morto e higiene final
- **O QUE:** Deletar do DISCO os 13 `dist*` e 172 `vite.config.js.timestamp-*` (são clutter Dropbox, já ignorados — NÃO usar `git rm`). Fechar gaps reais do `.gitignore`: `.devserver.log`, `por.traineddata`, `skills-lock.json`. Renomear `public/logos/logo edições/`→`logo-editions/` (atualizar referências). Consolidar docs raiz em `docs/` (mantendo CLAUDE.md/SITEMAP.md na raiz). Remover qualquer CSS morto remanescente.
- **ARQUIVOS:** .gitignore, public/logos/, docs/, disco (dist*/timestamps).
- **RISCO:** Baixo — CORREÇÃO importante: dist/impeccable/timestamps NÃO estão no Git (verificado via `git check-ignore`/`git ls-files`), então é deleção de disco + ajuste de gitignore, não desversionamento. Renomear pasta exige atualizar imports (grep antes).
- **BENEFÍCIO:** `git status` limpo; disco leve; nomes CI-safe; docs sem contradição. Correções P2, P3, P4, T1.
- **COMO VALIDAR:** `git status` limpo; `grep -r "logo edições"` retorna 0; `npm run build`; site carrega logos de edição.

---

**Ordem e segurança:** 0→1 destravam a dor central (hero). 2→3 criam as fontes únicas (componentes+tokens) que garantem propagação futura. 4→9 são incrementais e independentes entre si (podem parar/retomar). Nenhuma etapa toca Home (§9), rotas QR (salvo D2 explícita), paleta ou identidade Lovers. Deleção de assets pesados (Etapa 6) e mudança visual de contraste (Etapa 7) exigem confirmação do usuário no momento.
