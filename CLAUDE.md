# CLAUDE.md — Regras do Projeto Sweet & Coffee Week

> Regras permanentes de layout, design, conteúdo e nomenclatura. Servem para que
> futuras páginas e ajustes respeitem o mesmo sistema visual e não repitam decisões
> já rejeitadas. **Atualizar este arquivo sempre que o usuário rejeitar algo ou
> aprovar uma nova regra** (ver seção 19).

## 1. Objetivo do projeto

Este repositório contém o site institucional do Sweet & Coffee Week. O site apresenta
o festival, suas edições, sua história, suas curiosidades, o Sweet Awards, e páginas
de participação, patrocínio/apoio e contato.

A **Home/O Festival é a página-mãe** do sistema visual. As demais páginas devem
respeitar sua lógica de margens, respiro, hierarquia, grid, linguagem e ritmo visual.

## 2. Nomenclatura obrigatória

Não usar "Sweet" sozinho para se referir ao festival.

Usar: **Sweet & Coffee Week**; **SCW** (só depois do nome completo já ter aparecido);
**o festival**; **o evento**; **a edição**.

Não usar: "o Sweet", "do Sweet", "no Sweet", "sobre o Sweet", "história do Sweet",
"participar do Sweet".

Exceções permitidas: **Sweet Awards**, **Sweet Lovers**, **Sweet & Coffee Week Lovers**,
nomes oficiais, hashtags, arrobas e nomes de arquivos quando necessário.

Grafias oficiais da marca (evitar variações erradas como "Sweet Coffee Week",
"Sweet Coffee", "Sweet Coffee Awards", "Sweet & Coffee Lovers"):
- Festival: **Sweet & Coffee Week**
- Edição Lovers: **Sweet & Coffee Week Lovers**
- Premiação: **Sweet Awards** / **Sweet & Coffee Week Awards**

## 3. Paleta de cores

Usar apenas a paleta oficial: **creme, bege, rosa, amarelo, azul/ciano,
coral/vermelho, marrom, vinho**.

Não criar cores novas para diferenciar páginas. As páginas podem ter acentos
diferentes, mas sempre dentro da paleta oficial.

Evitar: roxo, verde, cinzas frios aleatórios, pretos puros, cores externas que não
pertençam à identidade. Reutilizar variáveis CSS existentes; não inserir hex
aleatórios fora da paleta.

**Acento por página = fundo da hero.** Cada rota define `--page-accent` em
`body.route-*` (`src/styles.css`) e a regra global das heros institucionais usa esse
token como **fundo cheio** (`background: var(--page-accent) !important`) com texto em
tinta escura. Logo o acento tem que ser um **tom claro e dentro da paleta** (contraste
com `--ink`). Acentos atuais: Edições ciano `#2BC4E8` · Awards/Histórico rosa `#F2548A`
· Curiosidades amarelo `#F8B511` · Participar coral `#F2693C` · Apoiar azul `#1B86C9` ·
Contato peach `#F2B6A0`. (Contato já foi lavanda `#B38CFF` — roxo, fora da paleta;
corrigido.) Ao criar/editar rota, nunca usar roxo/verde/lavanda como `--page-accent`.

## 4. Margens, grid e respiro

Todas as páginas internas devem respeitar o sistema de margens da Home/O Festival.
Não deixar textos, imagens ou componentes colados no menu principal.

A hero das páginas **não deve ter altura fixa de 1080px**. Usar altura proporcional
ao conteúdo, com respiro no topo e conteúdo principal ancorado mais para baixo.

**Margem horizontal — REGRA: igual ao MENU em TODAS as páginas.** No desktop
(≥960) o conteúdo segue a mesma margem do header: **full-width** (`max-width: none`)
com **`padding-inline: var(--hm-gutter)`** (`--hm-gutter: clamp(28px, 11.5vw, 150px)`,
`:root` em `swc-redesign.css`). É o que a Home faz (`.hm .wrap`, `swc-redesign.css`):
a logo e o menu encostam no `--hm-gutter`, e títulos/cards/seções alinham à logo.
O `.wrap` base (`max-width: var(--maxw)` = **1280px** / `padding: 0 var(--pad)` =
clamp(20px,4vw,56px), `styles.css`) é só o fallback quando não há override `.hm`.
Toda página institucional deve alinhar ao menu — usar `--hm-gutter` full-width, não
inventar largura/gutter próprios. Página com container próprio replica `--hm-gutter`.
Já alinhados: Edições (tokens `--page-*` apontam pra `--hm-gutter`) e Home.

Tokens reais (Home):
```css
--maxw:      1280px;                    /* largura máx. do conteúdo (.wrap) */
--pad:       clamp(20px, 4vw, 56px);    /* gutter lateral (.wrap) */
--section-y: clamp(72px, 10vw, 140px);  /* ritmo vertical de seção */
```

Regras: topo da hero deve respirar; conteúdo não pode brigar com o menu; alinhamentos
consistentes; elementos seguem grid; nada solto por acaso; evitar blocos grandes
vazios sem função.

### 4.1 Zona de segurança entre menu e hero (REGRA ESTRUTURAL)

Todas as páginas internas devem respeitar uma **zona de segurança** entre o
header/menu e o conteúdo da hero. O **fundo** da hero pode subir até o topo da
página, mas o **conteúdo** da hero (títulos, textos, imagens, cards, etc.) só pode
começar **depois** do offset de segurança do header. Nenhum elemento da hero deve
sobrepor, competir ou encostar visualmente no menu principal.

Implementação reutilizável — tokens globais em `src/styles.css` (bloco `body`):
```css
--header-safe-offset:  clamp(120px, 14vh, 168px);  /* header útil + logo que vaza */
--hero-top-clearance:  clamp(32px, 4vw, 56px);     /* folga visual extra */
--hero-content-start:  calc(var(--header-safe-offset) + var(--hero-top-clearance));
```

Como aplicar (estrutura wrapper/inner, **não** gambiarra em elemento isolado):
- **wrapper da hero** (`.X-hero`): fundo full-bleed, pode ir até o topo;
- **inner da hero** (`.X-hero__inner` / `.wrap`): `padding-top: var(--hero-content-start)`.

Consumido por: regra global `.cur-hero/.participar-hero/.apoiar-hero/.contato-hero/
.hist-hero` (styles.css) e pela hero auto-contida da Edições (`.edx-hero__inner`).
Vale também em tablet/mobile (os tokens já fazem clamp). Proibido: `margin-top`
solto, empurrão manual no título, `position: absolute` improvisado, ajuste que só
funcione numa tela.

## 5. Elementos soltos

Evitar elementos gráficos soltos sem função clara. Não adicionar formas, stickers,
blobs, rabiscos, ícones ou ornamentos só para "decorar".

Todo elemento visual precisa ter função: estruturar layout, indicar hierarquia,
representar dado, organizar conteúdo, apoiar fotografia ou reforçar identidade da
página. Se não tiver função clara, remover.

**Não usar eyebrow/kicker acima dos títulos** — texto curto em caixa-alta antes do
H1/H2 (ex.: "APOIE O FESTIVAL", "O FESTIVAL"), com ou sem bolinha/dot. Preferência
já registrada do usuário: o título abre a seção direto, sem rótulo por cima. Vale
para todas as páginas institucionais (exceto a Home, que não se mexe — §9).

**Não usar a fonte mono (`var(--font-mono)`, JetBrains Mono) em rótulos/labels/
eyebrows/metadados institucionais.** Preferência registrada (rejeitada 2x: chip do
Sweet Awards e rótulos da seção Números). Para rótulos institucionais usar **Nexa**:
`var(--font-sans)` ou `var(--font-slab)`. Caixa-alta + letter-spacing podem ficar — o
que incomoda é a face mono, não o caixa-alta. (DESIGN.md §2 "mono só p/ eyebrow" está
desatualizado; vale esta regra.)

## 6. Stickers e ilustrações

**Não usar stickers por padrão nas páginas institucionais.** Stickers só em materiais
de campanha ou páginas específicas, quando solicitados explicitamente.

Em Edições, Curiosidades, Participar, Apoiar, Contato e Sweet Awards: não inserir
stickers, doodles ou elementos soltos sem aprovação.

A página **Edições** deve ter linguagem editorial, histórica e fotográfica — não
estética de sticker/colagem.

## 7. Logos e fotos

Quando uma página falar de edição ou participante, reservar espaço visual para logo
e/ou foto sempre que fizer sentido.

Logo real: usar a logo real; manter proporção; não distorcer; `object-fit: contain`;
limite de altura; alt text adequado.
Sem logo: manter espaço reservado; fallback claro e elegante; não inventar logo; não
esconder a ausência.

Foto real: usar a foto real; preservar proporção; `object-fit: cover` quando
apropriado; alt text adequado.
Sem foto: fallback em moldura editorial; texto claro ("Foto pendente"/"Galeria
pendente"); não deixar área vazia sem explicação; nunca usar imagem aleatória externa
nem hotlink.

## 8. Placeholders e fallbacks

Placeholders devem parecer parte do sistema visual, não erro técnico.

Evitar: blocos vazios; áreas gigantes sem conteúdo; texto perdido no meio; aparência
de protótipo.
Preferir: moldura editorial; borda sutil; fundo da paleta; texto curto; proporção bem
definida.

## 9. Home/O Festival

A Home/O Festival é a página-mãe. **Não alterar a Home sem solicitação explícita.**
As demais páginas usam a Home como referência de margens, largura máxima, respiro,
hierarquia, ritmo visual, nível de acabamento e tom institucional-afetivo.

## 10. Página Edições

Funciona como **apresentação editorial photo-first** ("Cinema da Década") da história
do festival. Reconstruída jul/2026 (spec: `docs/superpowers/specs/
2026-07-07-edicoes-cinema-da-decada-design.md`). Direção aprovada:
- cada edição é uma **CENA**: foto do acervo em full-bleed + scrim no tom da edição,
  com camada editorial por cima (numeral gigante = posição na série, tema, lead) e
  **pódio real da edição** (1º lugares, empates preservados; ponte com o Sweet Awards);
- apresentação horizontal no desktop; scroll vertical avança o trilho (motor de passos
  `useSteppedPresentation`); no mobile/reduced-motion vira capítulos verticais (foto 4:5
  como cabeçalho com título sobreposto, corpo em fundo creme);
- sequência direta de 1 a 16 (não dividir por fases; a década é carregada por tom +
  fotografia, sem interstícios de era);
- **sem hero separada**: a página abre direto na cena 1 (2016) — a apresentação É a
  página. O título/intro institucional foi removido a pedido (jul/2026); não
  reintroduzir hero em Edições sem solicitação;
- controles = **timeline de anos** (não chips numerados) + setas + barra de progresso;
- painel Lovers especial (selo 10 anos, pódio de trilhas Júri/Sweet Lovers, CTA único
  pro Sweet Awards); **epílogo** curto aponta pra Curiosidades;
- **filmstrip** por painel: todas as fotos da edição em scroll-snap (clique troca a
  foto-cena). Fallbacks honestos quando faltar asset (logo/foto pendente).

Dados por edição: pódio + curadoria de frames em `src/data/editionHighlights.js`
(2026.1 vem de `loversAwardsResults.js`). Perf: janela `live/near ±1-2` monta foto e
filmstrip só perto do foco (16 cenas full-viewport de uma vez congelam o compositor).

Não usar stickers. Não usar grid comum de cards. Não usar `backdrop-filter` sobre o
trilho animado (blur + readback de GPU a cada frame congela o compositor — usar fundo
semi-opaco). A navegação das edições deve parecer **controle de apresentação**, não
segunda navbar — e não pode brigar com o menu principal.

## 11. Página Curiosidades

Não repetir a página Edições. **Não incluir**: timeline completa das 16 edições; lista
cronológica de todas as edições; cards de todas as edições; ranking de "maiores
edições"; "edições com mais participantes" como destaque.

Deve mostrar (com dados reais do acervo): achados do acervo; rankings criativos; marcas
recorrentes; participantes mais premiados; vencedores por categoria; evolução das
categorias do Sweet Awards; primeiras vezes; momentos marcantes.

## 12. Página Sweet Awards

**Reconstruída** em `src/pages/institutional/SweetAwards.jsx` (rota `vencedores` /
`premiacao` em `App.jsx`; o antigo `Agradecimento.jsx` foi removido). Aparência de premiação/hall de vencedores — não embeds de Instagram. Identidade
**institucional do festival** (espresso `#2B1810` + creme + **ouro `#F8B511`** de medalha),
NUNCA o KV Lovers. Estrutura: hero institucional → o que é → categorias (8 oficiais +
históricas computadas) → vencedores da edição atual (Lovers 2026.1, em destaque) →
histórico por edição (accordion com trilhas Júri Técnico/Sweet Lovers separadas, empates
preservados, nota p/ 2016–2018 sem premiação) → CTA final.

Regra de dados (cruzar fontes, não inventar): descrições das categorias vêm de
`sweetCoffeeHistory.js` (edição 2026.1); **pódios da edição atual vêm de
`loversAwardsResults.js`** (na base histórica os pódios de 2026.1 estão vazios de
propósito); histórico das demais edições vem de `sweetCoffeeHistory.js`. Selo dourado de
1º lugar é a única peça celebrativa (codifica a colocação — não é sticker). Logos reais
via `resolveParticipant` (fallback em iniciais).

## 13. Página Participar

Segue a lógica visual da Home. Deve ter: proposta clara; imagens/fotos quando
disponíveis; depoimentos; **formulário em destaque**; linguagem voltada a participantes;
visual editorial e comercial. Não deve parecer formulário genérico.

**Hero bespoke (exceção ao `<PageHero>`).** A hero de Participar (e a de Apoiar, §14)
tem o **formulário integrado** + banda chocolate própria + selo girando + shots —
estrutura de landing de conversão, distinta da hero institucional simples. Fica
**fora** do componente `PageHero`, como Home (§9) e Edições (§10) já são. As demais
seções dessas páginas usam o kit de layout (`PageShell`/`PageSection`/`SectionHeader`/
`CardsGrid`/`CTASection`, `src/components/layout/`). Não migrar essas heros p/ PageHero
sem pedido explícito.

## 14. Página Apoiar

Lógica parecida com Participar. Precisa de: **formulário em destaque**; explicação
visual de oportunidades de apoio; benefícios para marcas; exemplos de presença da marca
no festival; linguagem comercial alinhada ao tom do festival. Não deve parecer página
institucional fria.

## 15. Textos e tom de voz

Claro, afetivo e institucional na medida certa. Evitar: texto técnico/longo demais;
repetição de dados; tom burocrático; excesso de adjetivos genéricos. Preferir: frases
objetivas; linguagem calorosa; ritmo de leitura; conexão com Natal, gastronomia, marcas
locais e Sweet Lovers.

Posts/comunicações ao público: linguagem mais leve. Páginas institucionais: equilibrar
afeto e credibilidade.

## 16. Dados históricos

Fontes principais (verificar antes de criar rankings/históricos/cards):
- `ACERVO.md` (raiz) — **resumo legível por IA** de TODO o acervo (16 edições,
  Sweet Awards + vencedores com empates, Lovers 2026.1, 21 participantes, métricas,
  curiosidades). Transcrição fiel das fontes abaixo; para gerar texto/responder usar
  o `ACERVO.md`, mas o **código em `src/data/` é a verdade** (se divergir, vale o
  código — e atualize o `ACERVO.md`);
- `src/data/sweetCoffeeHistory.js` — **base oficial, 16 edições (inclui Lovers)**;
- `src/data/loversAwardsResults.js` — resultados da 16ª edição (Lovers);
- `src/data/participants.js`, `src/data/sweetAwards.js`, `src/data/editions.js`.

Não inventar dados. Não criar ranking fake. Não esconder ausência de dado importante.
(Migração da base antiga `sweetHistory.js` concluída: nenhuma página a importa mais; as
páginas consomem `sweetCoffeeHistory.js` direto ou via `sweetEditionsCompat.js`.)

## 17. Responsividade

Validar em desktop, tablet e mobile. No mobile: evitar sticky horizontal complexo;
evitar overflow lateral; manter leitura clara; botões tocáveis; reorganizar grids em
coluna; manter logos/fotos proporcionais.

**Escala de breakpoints canônica (institucional).** Não existe token de breakpoint
(CSS não aceita `var()` em `@media`), então a consistência é por convenção. Ao criar
ou ajustar `@media (max-width: …)`, preferir a escala: **1080 · 960 · 720 · 560 ·
420**. O reflow principal desktop→tablet (grid de 2 colunas → 1) é **960px** em todo
o institucional (Participar/Apoiar já alinhados; antes divergiam em 980). Os `959px`
(styles.css) são propositais (pareados com `min-width: 960`, "abaixo de 960"). Valores
fora da escala só quando o conteúdo daquele bloco exigir ponto próprio — nunca por
inércia/cópia. Não renumerar em massa breakpoints já calibrados: alinhar só os
outliers do reflow principal.

## 18. Validação antes de finalizar

1. Home não foi alterada sem necessidade.
2. `AWARDS_ONLY_PUBLICATION` não foi alterado indevidamente.
3. Não foram criadas cores novas.
4. Não foram usados stickers sem solicitação.
5. Margens seguem a Home.
6. Não há elementos soltos sem função.
7. Placeholders claros e elegantes.
8. Desktop e mobile funcionam.
9. Rodar build (`npm run build`).
10. Rodar lint/typecheck se existir.

## 19. Como registrar novas preferências

Sempre que o usuário disser que não gosta de algo ou aprovar uma nova regra de layout,
**atualizar este arquivo**. Exemplos já registrados: "não gosto de elementos soltos";
"não quero stickers"; "hero com conteúdo ancorado embaixo"; "formulário em destaque";
"não usar cores fora da paleta"; "hero não pode ter 1080px fixo"; "zona de segurança
entre menu e hero" (ver 4.1); "Contato é página simples, SEM hero" (jul/2026 — título
compacto direto na seção de cards, com padding-top = --hero-content-start; não
reintroduzir PageHero ali).

---

# Regras técnicas e operacionais (preservadas)

## Proteção de branch e deploy — ABSOLUTO

- Confirmar branch antes de alterar: `git branch --show-current`. Trabalhar na **branch
  de desenvolvimento ativa** (atualmente **`dev/site-completo`**). Se estiver em
  `master`/`main`: **parar e avisar; não continuar.**
- Nunca alterar `master`/`main`. Nunca publicar produção. Nunca usar `vercel --prod`.
  Nunca promover Preview para Production. Nunca fazer merge para `master`/`main` sem
  autorização explícita.
- O site oficial em `sweetcoffeeweek.com.br` não deve ser afetado por essas operações.

### Fluxo ao finalizar
1. **Build local:** `npm run build`. Falhou → parar, mostrar erro, não commitar/push.
2. `git status` → conferir alterações.
3. Commit pequeno e claro: `git add <arquivos da tarefa>` + `git commit -m "tipo: descrição"`
   (tipos: `fix:` / `feat:` / `style:` / `chore:` / `docs:`).
4. `git push origin dev/site-completo`.
5. Reportar: build, hash+mensagem do commit, push, e link/preview da Vercel se houver.
6. ⚠️ O repo pode ter WIP local não relacionado — commitar **só** os arquivos da tarefa.

## URLs estáveis para QR Codes — REGRA PERMANENTE

URLs públicas dos QR Codes da edição Sweet & Coffee Week Lovers **NÃO podem mudar**
depois de definidas.

Padrões fixos:
- Combo: `https://www.sweetcoffeeweek.com.br/#/lovers/combos/{slug-do-participante}`
- Premiação: `https://www.sweetcoffeeweek.com.br/#/lovers/awards`

Regras: nunca alterar rota `#/lovers/combos/:slug` nem `#/lovers/awards`; slug do combo
= slug do participante; não renomear slugs já definidos em `src/data/participants.js`;
não trocar hash routing por path routing; mudança em URL/rota/slug exige parar e avisar
antes — nunca automático. Lista dos 21 slugs congelados: seção 9 de `CODE_REVIEW_GRAPH.md`.

## Duas identidades visuais — nunca misturar

**Institucional** — `src/pages/institutional/` (Home, Curiosidades, Edições, Participar,
Apoiar, Contato). Paleta terracotta (`--bg`, `--ink`, `--accent`, `--peach`). Cor-acento
por página via `--page-accent` (definido em `body.route-*` em `src/styles.css`).

**Edição Lovers** — `src/pages/lovers/` (Hub, Combos, Mapa, Awards). Paleta cream,
`--lovers-red`, burgundy, pink, yellow. Tipografia Sofia Pro Comp via Typekit. Wrapper
obrigatório `.kv-lovers`. Fontes via `--font-lovers-display` / `--font-lovers-body`.

Nunca aplicar estilos Lovers em páginas Institucionais nem vice-versa sem pedido explícito.

## Estrutura, stack e variáveis

```
src/
  components/   # nav.jsx, footer/SiteFooter.jsx, icons.jsx, ...
  pages/institutional/ | lovers/
  data/         # editions.js, sweetCoffeeHistory.js, loversAwardsResults.js,
                # participants.js, sweetAwards.js, participantAssets.js, editionAssets.js
  hooks/        # useRevealOnScroll.js (IntersectionObserver, threshold 0)
  styles.css    # globais (route-* / --page-accent) — editar com cuidado
  styles/       # motion-system.css, etc.
  App.jsx · router.js · DevTools.jsx (DevViewportSwitcher é DEV-only)
public/images/  # logos, combos (/images/combos/<slug>/main.jpg), shapes
```

- Vite + React (JSX). Hash router customizado. Adobe Fonts/Typekit + Google Fonts.
- Dev server: `npm run dev`. Build: `npm run build`.
- `dist/` costuma ficar travado pelo Dropbox → buildar em `dist_check --emptyOutDir` e
  depois `rm -rf dist_check`.

```css
--accent: #E8553A;  --ink: #2B1810;  --peach: #F7D9B5;
--lovers-red: #D63648;  --lovers-cream: #FFF1E6;
--font-lovers-display: 'sofia-pro-comp', 'Caprasimo', serif;
--font-lovers-body:    'sofia-pro-comp', 'DM Sans', sans-serif;
```

## Escopo, qualidade e segurança

- Listar os arquivos a modificar **antes** de editar. Alterar só o que se relaciona ao
  pedido. Usar `Edit` (não `Write`) em arquivos existentes, salvo reconstrução pedida.
  Resumo curto após cada conjunto de edições.
- Preservar padrão do projeto, tipagem, acessibilidade e responsividade. Evitar
  dependências novas sem justificativa. Não reescrever arquivo inteiro se um ajuste local
  resolve.
- Não ler/exibir/versionar `.env`, secrets, tokens, chaves ou credenciais.
- Pedir confirmação antes de ações destrutivas (apagar, reset, force-push, deploy de
  produção, remover dependência principal, mexer em config de produção).

## Princípio principal

O repositório é a fonte da verdade. Buscar contexto nos arquivos, docs, commits e
configs antes de pedir contexto ao usuário; não pedir o que pode ser inferido com
segurança do repositório. Nunca fingir ter usado uma ferramenta.
