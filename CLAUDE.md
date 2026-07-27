# CLAUDE.md — Regras do Projeto Sweet & Coffee Week

> Regras permanentes de layout, design, conteúdo, nomenclatura. Futuras páginas
> respeitam mesmo sistema visual, não repetem decisões rejeitadas. **Atualizar
> arquivo sempre que usuário rejeitar ou aprovar regra** (ver seção 19).

## 0. Como interpretar regras sem bloquear pedidos do usuário

As regras deste projeto existem para orientar **qualidade, consistência e segurança**.
Elas **não** são motivo automático para recusar, adiar ou esvaziar uma solicitação
explícita do usuário. Quando um pedido (melhorar transições, adicionar movimento, criar
microinterações, redesenhar uma página, ajustar layout) parecer conflitar com uma regra,
**a regra orienta como fazer — não é permissão para não fazer**.

Ao receber um pedido que toca alguma regra, classifique-a primeiro:

1. **Absoluta de segurança/operação** — respeitar sempre, sem exceção (ver lista abaixo).
2. **Regra de marca/conteúdo** — nomenclatura, paleta, não inventar dados. Respeitar,
   adaptando a execução ao pedido.
3. **Preferência visual** — decisões estéticas já registradas (ex.: sem eyebrow, sem
   mono em rótulos). Manter coerência; se o usuário pedir direção nova, seguir o pedido
   e registrar a nova preferência (§19).
4. **Regra temporária/desatualizada** — se contradiz o código atual, **parar e avisar**
   (ver ponto final).
5. **Orientação técnica** — motion system, tokens, componentes. São **base para
   construir**, não parede.

**Absolutas — nunca enfraquecer, mesmo a pedido (só o usuário executa):**
não alterar `master`/`main`; trabalhar na branch de dev correta; nenhum deploy de
produção sem autorização; não mudar URLs públicas de QR Code (`#/lovers/combos/:slug`,
`#/lovers/awards`); não alterar flags de publicação (`AWARDS_ONLY_PUBLICATION`,
`COMING_SOON_PUBLICATION`, `INSTITUTIONAL_PREVIEW`) sem pedido explícito; não inventar
dados históricos/rankings/vencedores; não expor `.env`/secrets/tokens; não mexer na
Home/O Festival sem solicitação; não misturar identidade institucional × Lovers.

**"Evitar" ≠ "proibir".** Onde uma regra diz *evitar*, o padrão é o julgamento, não o
veto:
- Evitar stickers/ornamentos **não proíbe** elemento visual com função (medalha, pódio,
  selo de vencedor, indicador de dado, feedback de UI). Ver §5.
- Evitar duplicação **não proíbe** criar variação justificada quando o padrão existente
  não resolve a experiência pedida. Ver `AI_RULES.md` §2.2.
- Evitar animação decorativa **não proíbe** transições e microinterações — ver ponto
  Motion abaixo.
- Evitar mudança global página-por-página **não proíbe** refatorar a fonte única quando
  o pedido é global. Ver `AI_RULES.md` §2.4.

**Motion é base, não bloqueio.** Quando o usuário pedir transições, movimento,
microinterações ou animação, **implementar** usando ou expandindo o motion system: (1)
reusar as classes existentes quando bastarem; (2) criar novas classes de movimento
quando a experiência pedir, sempre consumindo os tokens de motion
(`src/styles/layout-tokens.css`); (3) animar só `transform`, `opacity` e `filter`, sem
layout shift; (4) respeitar `prefers-reduced-motion`; (5) não instalar biblioteca de
animação nova sem justificativa. A existência de `motion-system.css` **não** significa
que novas transições são proibidas — significa que há uma base pronta para partir.

**Se a regra estiver desatualizada ou contradizer o código, parar e avisar** — dizer
qual regra conflita, qual é o estado real do código, qual atualização será feita e como
seguir sem quebrar segurança. Depois seguir. **Toda resposta deve levar a uma execução
ou a um plano objetivo — nunca usar regra como justificativa para não fazer nada.**

## 1. Objetivo do projeto

Repositório = site institucional Sweet & Coffee Week. Apresenta festival, edições,
história, curiosidades, Sweet Awards, páginas de participação, patrocínio/apoio, contato.

**Home/O Festival = página-mãe** do sistema visual. Demais páginas respeitam sua
lógica de margens, respiro, hierarquia, grid, linguagem, ritmo.

## 2. Nomenclatura obrigatória

Não usar "Sweet" sozinho pro festival.

Usar: **Sweet & Coffee Week**; **SCW** (só após nome completo já aparecer);
**o festival**; **o evento**; **a edição**.

Não usar: "o Sweet", "do Sweet", "no Sweet", "sobre o Sweet", "história do Sweet",
"participar do Sweet".

Exceções: **Sweet Awards**, **Sweet Lovers**, **Sweet & Coffee Week Lovers**, nomes
oficiais, hashtags, arrobas, nomes de arquivos quando necessário.

Grafias oficiais (evitar erradas: "Sweet Coffee Week", "Sweet Coffee",
"Sweet Coffee Awards", "Sweet & Coffee Lovers"):
- Festival: **Sweet & Coffee Week**
- Edição Lovers: **Sweet & Coffee Week Lovers**
- Premiação: **Sweet Awards** / **Sweet & Coffee Week Awards**

## 3. Paleta de cores

Só paleta oficial: **creme, bege, rosa, amarelo, azul/ciano, coral/vermelho,
marrom, vinho**.

Não criar cores novas pra diferenciar páginas. Páginas podem ter acentos diferentes,
sempre dentro da paleta.

Evitar: roxo, verde, cinzas frios aleatórios, pretos puros, cores externas fora da
identidade. Reutilizar variáveis CSS existentes; não inserir hex aleatórios.

**Acento por página = fundo da hero.** Cada rota define `--page-accent` em
`body.route-*` (`src/styles.css`); regra global das heros institucionais usa token como
**fundo cheio** (`background: var(--page-accent) !important`) com texto tinta escura.
Acento tem que ser **tom claro dentro da paleta** (contraste com `--ink`). Acentos
atuais: Edições ciano `#2BC4E8` · Awards/Histórico dourado `#F8B511` (antes rosa
`#F2548A`; retonado jul/2026 para não ficar pink-dominante — ouro de medalha, condiz
com a identidade do Sweet Awards) · Curiosidades amarelo `#F8B511` · Participar coral
`#F2693C` · Apoiar azul `#1B86C9` · Contato peach `#F2B6A0`. (Contato já foi lavanda
`#B38CFF` — roxo, fora da paleta; corrigido.) Ao criar/editar rota, nunca usar
roxo/verde/lavanda como `--page-accent`.

## 4. Margens, grid e respiro

Todas páginas internas respeitam sistema de margens da Home/O Festival. Não deixar
textos, imagens, componentes colados no menu principal.

Hero **não deve ter altura fixa de 1080px**. Usar altura proporcional ao conteúdo,
com respiro no topo, conteúdo ancorado mais pra baixo.

**Margem horizontal — REGRA: igual ao MENU em TODAS as páginas.** Desktop (≥960):
conteúdo segue margem do header — **full-width** (`max-width: none`) com
**`padding-inline: var(--hm-gutter)`** (`--hm-gutter: clamp(28px, 11.5vw, 150px)`,
`:root` em `swc-redesign.css`). É o que Home faz (`.hm .wrap`, `swc-redesign.css`):
logo e menu encostam no `--hm-gutter`, títulos/cards/seções alinham �  logo. O `.wrap`
base (`max-width: var(--maxw)` = **1280px** / `padding: 0 var(--pad)` =
clamp(20px,4vw,56px), `styles.css`) só fallback quando não há override `.hm`. Toda
página institucional alinha ao menu — usar `--hm-gutter` full-width, não inventar
largura/gutter próprios. Página com container próprio replica `--hm-gutter`. Já
alinhados: Edições (tokens `--page-*` apontam pra `--hm-gutter`) e Home.

Tokens reais (Home):
```css
--maxw:      1280px;                    /* largura máx. do conteúdo (.wrap) */
--pad:       clamp(20px, 4vw, 56px);    /* gutter lateral (.wrap) */
--section-y: clamp(72px, 10vw, 140px);  /* ritmo vertical de seção */
```

Regras: topo da hero respira; conteúdo não briga com menu; alinhamentos consistentes;
elementos seguem grid; nada solto por acaso; evitar blocos grandes vazios sem função.

### 4.1 Zona de segurança entre menu e hero (REGRA ESTRUTURAL)

Todas páginas internas respeitam **zona de segurança** entre header/menu e conteúdo da
hero. **Fundo** da hero pode subir até o topo, mas **conteúdo** (títulos, textos,
imagens, cards) só começa **depois** do offset de segurança do header. Nenhum elemento
da hero sobrepõe, compete ou encosta no menu.

Implementação reutilizável — tokens globais em `src/styles.css` (bloco `body`):
```css
--header-safe-offset:  clamp(120px, 14vh, 168px);  /* header útil + logo que vaza */
--hero-top-clearance:  clamp(32px, 4vw, 56px);     /* folga visual extra */
--hero-content-start:  calc(var(--header-safe-offset) + var(--hero-top-clearance));
```

Como aplicar (estrutura wrapper/inner, **não** gambiarra isolada):
- **wrapper da hero** (`.X-hero`): fundo full-bleed, pode ir até o topo;
- **inner da hero** (`.X-hero__inner` / `.wrap`): `padding-top: var(--hero-content-start)`.

Consumido por: regra global `.cur-hero/.participar-hero/.apoiar-hero/.contato-hero/
.hist-hero` (styles.css) e hero auto-contida da Edições (`.edx-hero__inner`). Vale
também tablet/mobile (tokens já fazem clamp). Proibido: `margin-top` solto, empurrão
manual no título, `position: absolute` improvisado, ajuste que só funcione numa tela.

## 5. Elementos soltos

Evitar elementos gráficos soltos sem função. Não adicionar formas, stickers, blobs,
rabiscos, ícones ou ornamentos só pra "decorar".

Todo elemento visual precisa função: estruturar layout, indicar hierarquia,
representar dado, organizar conteúdo, apoiar fotografia, reforçar identidade. Sem
função clara → remover.

**A regra proíbe decoração gratuita, não elemento visual funcional.** Elemento com
função narrativa, estrutural, de hierarquia, navegação, feedback ou representação de
dado é permitido e às vezes necessário. Ex.: no Sweet Awards, medalhas, pódios, selos de
1º lugar e destaques de categoria **codificam colocação/resultado** — são funcionais,
não stickers (ver §12). Na dúvida, pergunte "esse elemento carrega informação ou só
enfeita?": carrega → fica; só enfeita → remove.

**Não usar eyebrow/kicker acima dos títulos** — texto curto caixa-alta antes do H1/H2
(ex.: "APOIE O FESTIVAL", "O FESTIVAL"), com ou sem dot. Preferência registrada:
título abre seção direto, sem rótulo por cima. Vale pra todas institucionais (exceto
Home, que não se mexe — §9).

**Não usar fonte mono (`var(--font-mono)`, JetBrains Mono) em rótulos/labels/eyebrows/
metadados institucionais.** Preferência registrada (rejeitada 2x: chip do Sweet Awards
e rótulos da seção Números). Pra rótulos institucionais usar **Nexa**:
`var(--font-sans)` ou `var(--font-slab)`. Caixa-alta + letter-spacing podem ficar —
incomoda a face mono, não o caixa-alta. (DESIGN.md §2 "mono só p/ eyebrow" desatualizado;
vale esta regra.)

## 6. Stickers e ilustrações

**Não usar stickers por padrão nas institucionais.** Stickers só em materiais de
campanha ou páginas específicas, quando solicitados explicitamente.

Em Edições, Curiosidades, Participar, Apoiar, Contato, Sweet Awards: não inserir
stickers, doodles, elementos soltos sem aprovação.

Página **Edições**: linguagem editorial, histórica, fotográfica — não estética de
sticker/colagem.

## 7. Logos e fotos

Página que fala de edição ou participante: reservar espaço pra logo e/ou foto quando
fizer sentido.

Logo real: usar logo real; manter proporção; não distorcer; `object-fit: contain`;
limite de altura; alt text adequado.
Sem logo: manter espaço reservado; fallback claro e elegante; não inventar logo; não
esconder ausência.

Foto real: usar foto real; preservar proporção; `object-fit: cover` quando apropriado;
alt text adequado.
Sem foto: fallback em moldura editorial; texto claro ("Foto pendente"/"Galeria
pendente"); não deixar área vazia sem explicação; nunca imagem aleatória externa nem
hotlink.

## 8. Placeholders e fallbacks

Placeholders parecem parte do sistema visual, não erro técnico.

Evitar: blocos vazios; áreas gigantes sem conteúdo; texto perdido no meio; aparência
de protótipo.
Preferir: moldura editorial; borda sutil; fundo da paleta; texto curto; proporção
definida.

## 9. Home/O Festival

Home/O Festival = página-mãe. **Não alterar Home sem solicitação explícita.** Demais
páginas usam Home como referência de margens, largura máxima, respiro, hierarquia,
ritmo, nível de acabamento, tom institucional-afetivo.

## 10. Página Edições

Funciona como **apresentação editorial photo-first** ("Cinema da Década") da história
do festival. Reconstruída jul/2026 (spec: `docs/superpowers/specs/
2026-07-07-edicoes-cinema-da-decada-design.md`). Direção aprovada:
- cada edição = **CENA**: foto do acervo full-bleed + scrim no tom da edição, camada
  editorial por cima (numeral gigante = posição na série, tema, lead) e **pódio real da
  edição** (1º lugares, empates preservados; ponte com Sweet Awards);
- apresentação horizontal no desktop; scroll vertical avança o trilho (motor de passos
  `useSteppedPresentation`); mobile/reduced-motion vira capítulos verticais (foto 4:5
  como cabeçalho com título sobreposto, corpo em fundo creme);
- sequência direta 1 a 16 (não dividir por fases; década carregada por tom + fotografia,
  sem interstícios de era);
- **sem hero separada**: página abre direto na cena 1 (2016) — apresentação É a página.
  Título/intro institucional removido a pedido (jul/2026); não reintroduzir hero em
  Edições sem solicitação;
- controles = **timeline de anos** (não chips numerados) + setas + barra de progresso;
- painel Lovers especial (selo 10 anos, pódio de trilhas Júri/Sweet Lovers, CTA único
  pro Sweet Awards); **epílogo** curto aponta pra Curiosidades;
- **filmstrip** por painel: todas fotos da edição em scroll-snap (clique troca a
  foto-cena). Fallbacks honestos quando faltar asset (logo/foto pendente).

Dados por edição: pódio + curadoria de frames em `src/data/editionHighlights.js`
(2026.1 vem de `loversAwardsResults.js`). Perf: janela `live/near ±1-2` monta foto e
filmstrip só perto do foco (16 cenas full-viewport de uma vez congelam o compositor).

Não usar stickers. Não usar grid comum de cards. Não usar `backdrop-filter` sobre o
trilho animado (blur + readback de GPU a cada frame congela o compositor — usar fundo
semi-opaco). Navegação das edições parece **controle de apresentação**, não segunda
navbar — não pode brigar com o menu.

## 11. Página Curiosidades

Não repetir Edições. **Não incluir**: timeline completa das 16 edições; lista
cronológica de todas; cards de todas; ranking de "maiores edições"; "edições com mais
participantes" como destaque.

**Edições não competem entre si (rejeição registrada, jul/2026).** Nenhum gráfico ou
dado comparando edições — ex.: gráfico de linha de "participantes por edição" com
pico/recorde rejeitado no redesign ("parece competição entre edições, isso não deve
ocorrer"). Comparação/ranking só entre **participantes** (premiados, recorrentes),
nunca entre edições. Linha do tempo permitida só como **marcos/primeiras vezes**
(criação do Sweet Awards, trilhas de júri, Menção Honrosa única, edição comemorativa),
sem números de tamanho por edição.
**Exceção aprovada (jul/2026):** seção de homenagens da Lovers pode agrupar e contar as
21 marcas pela edição que escolheram reviver ("Sweet Trip, 6 marcas") — dado é escolha
das marcas, não tamanho/desempenho da edição; aprovado nos mocks D e E.

Deve mostrar (dados reais do acervo): achados do acervo; rankings criativos; marcas
recorrentes; participantes mais premiados; vencedores por categoria; evolução das
categorias do Sweet Awards; primeiras vezes; momentos marcantes.

## 12. Página Sweet Awards

**Reconstruída** em `src/pages/institutional/HistoricoAwards.jsx` (componente
`HistoricoAwardsPage`, route interna `historico-awards`, paths públicos `/sweet-awards`
e `/historico-sweet-awards` em `App.jsx`; antigo `Agradecimento.jsx` removido). *(Não
existe `SweetAwards.jsx` — não criar arquivo novo só para casar com doc antiga.)*
Aparência de premiação/hall de vencedores — não embeds de Instagram.

**A página pode ser alterada com pedido explícito do usuário** (layout, seções,
movimento, conteúdo editorial). O que **não** muda sem autorização: flags de publicação,
rotas congeladas, dados oficiais (cruzados das fontes em §16, nunca inventados) e deploy
de produção. Não tratar Awards como intocável — a restrição é sobre flags/rotas/dados,
não sobre a página em si. Identidade **institucional do
festival** (espresso `#2B1810` + creme + **ouro `#F8B511`** de medalha), NUNCA o KV
Lovers. Estrutura: hero institucional → o que é → categorias (8 oficiais + históricas
computadas) → vencedores da edição atual (Lovers 2026.1, em destaque) → histórico por
edição (accordion com trilhas Júri Técnico/Sweet Lovers separadas, empates preservados,
nota p/ 2016–2018 sem premiação) → CTA final.

Regra de dados (cruzar fontes, não inventar): descrições das categorias vêm de
`sweetCoffeeHistory.js` (edição 2026.1); **pódios da edição atual vêm de
`loversAwardsResults.js`** (na base histórica os pódios de 2026.1 estão vazios de
propósito); histórico das demais vem de `sweetCoffeeHistory.js`. Selo dourado de 1º
lugar é a única peça celebrativa (codifica colocação — não é sticker). Logos reais via
`resolveParticipant` (fallback em iniciais).

## 13. Página Participar

Segue lógica visual da Home. Deve ter: proposta clara; imagens/fotos quando disponíveis;
depoimentos; **formulário em destaque**; linguagem voltada a participantes; visual
editorial e comercial. Não parecer formulário genérico.

**Hero bespoke (exceção ao `<PageHero>`).** Hero de Participar (e Apoiar, §14) tem
**formulário integrado** + banda chocolate própria + selo girando + shots — estrutura
de landing de conversão, distinta da hero institucional simples. Fica **fora** do
componente `PageHero`, como Home (§9) e Edições (§10). Demais seções dessas páginas
usam o kit de layout (`PageShell`/`PageSection`/`SectionHeader`/`CardsGrid`/
`CTASection`, `src/components/layout/`). Não migrar essas heros p/ PageHero sem pedido
explícito.

## 14. Página Apoiar

Lógica parecida com Participar. Precisa: **formulário em destaque**; explicação visual
de oportunidades de apoio; benefícios pra marcas; exemplos de presença da marca no
festival; linguagem comercial alinhada ao tom. Não parecer página institucional fria.

## 15. Textos e tom de voz

Claro, afetivo, institucional na medida. Evitar: texto técnico/longo demais; repetição
de dados; tom burocrático; excesso de adjetivos genéricos. Preferir: frases objetivas;
linguagem calorosa; ritmo de leitura; conexão com Natal, gastronomia, marcas locais,
Sweet Lovers.

Posts/comunicações ao público: linguagem mais leve. Páginas institucionais: equilibrar
afeto e credibilidade.

## 16. Dados históricos

Fontes principais (verificar antes de rankings/históricos/cards):
- `ACERVO.md` (raiz) — **resumo legível por IA** de TODO o acervo (16 edições,
  Sweet Awards + vencedores com empates, Lovers 2026.1, 21 participantes, métricas,
  curiosidades). Transcrição fiel das fontes abaixo; pra gerar texto/responder usar
  `ACERVO.md`, mas **código em `src/data/` é a verdade** (se divergir, vale o código —
  e atualize o `ACERVO.md`);
- `src/data/sweetCoffeeHistory.js` — **base oficial, 16 edições (inclui Lovers)**;
- `src/data/loversAwardsResults.js` — resultados da 16ª edição (Lovers);
- `src/data/participants.js`, `src/data/sweetAwards.js`, `src/data/editions.js`.

Não inventar dados. Não criar ranking fake. Não esconder ausência de dado importante.
(Migração da base antiga `sweetHistory.js` concluída: nenhuma página a importa mais;
páginas consomem `sweetCoffeeHistory.js` direto ou via `sweetEditionsCompat.js`.)

## 17. Responsividade

Validar em desktop, tablet, mobile. Mobile: evitar sticky horizontal complexo; evitar
overflow lateral; manter leitura clara; botões tocáveis; reorganizar grids em coluna;
manter logos/fotos proporcionais.

**Escala de breakpoints canônica (institucional).** Não existe token de breakpoint
(CSS não aceita `var()` em `@media`), consistência é por convenção. Ao criar/ajustar
`@media (max-width: …)`, preferir escala: **1080 · 960 · 720 · 560 · 420**. Reflow
principal desktop→tablet (grid de 2 colunas → 1) = **960px** em todo o institucional
(Participar/Apoiar já alinhados; antes divergiam em 980). Os `959px` (styles.css) são
propositais (pareados com `min-width: 960`, "abaixo de 960"). Valores fora da escala só
quando o conteúdo exigir ponto próprio — nunca por inércia/cópia. Não renumerar em
massa breakpoints já calibrados: alinhar só outliers do reflow principal.

## 18. Validação antes de finalizar

1. Home não alterada sem necessidade.
2. Flags de publicação em `App.jsx` não alteradas sem pedido explícito. Estado real
   (jul/2026): `AWARDS_ONLY_PUBLICATION = false`; `COMING_SOON_PUBLICATION = true` (gate
   ativo — domínio oficial mostra só a landing EmBreve); `INSTITUTIONAL_PREVIEW` =
   computed (DEV + previews `*.vercel.app?preview=1`, nunca no domínio oficial). Não
   trocar valores sem autorização; ver `AI_RULES.md` §1.6.
3. Nenhuma cor nova.
4. Nenhum sticker sem solicitação.
5. Margens seguem a Home.
6. Sem elementos soltos sem função.
7. Placeholders claros e elegantes.
8. Desktop e mobile funcionam.
9. Rodar build (`npm run build`).
10. Rodar lint/typecheck se existir.

## 19. Como registrar novas preferências

Sempre que usuário disser que não gosta de algo ou aprovar regra de layout, **atualizar
arquivo**. Exemplos já registrados: "não gosto de elementos soltos"; "não quero
stickers"; "hero com conteúdo ancorado embaixo"; "formulário em destaque"; "não usar
cores fora da paleta"; "hero não pode ter 1080px fixo"; "zona de segurança entre menu e
hero" (ver 4.1); "Contato é página simples, SEM hero" (jul/2026 — título compacto
direto na seção de cards, com padding-top = --hero-content-start; não reintroduzir
PageHero ali).

---

# Regras técnicas e operacionais (preservadas)

## Proteção de branch e deploy — ABSOLUTO

- Confirmar branch antes de alterar: `git branch --show-current`. Trabalhar na **branch
  de desenvolvimento ativa** (atualmente **`dev/site-completo`**). Se em `master`/`main`:
  **parar e avisar; não continuar.**
- Nunca alterar `master`/`main`. Nunca publicar produção. Nunca usar `vercel --prod`.
  Nunca promover Preview para Production. Nunca fazer merge para `master`/`main` sem
  autorização explícita.
- Site oficial em `sweetcoffeeweek.com.br` não deve ser afetado por essas operações.

### Fluxo ao finalizar
1. **Build local:** `npm run build`. Falhou → parar, mostrar erro, não commitar/push.
2. `git status` → conferir alterações.
3. Commit pequeno e claro: `git add <arquivos da tarefa>` + `git commit -m "tipo: descrição"`
   (tipos: `fix:` / `feat:` / `style:` / `chore:` / `docs:`).
4. `git push origin dev/site-completo`.
5. Reportar: build, hash+mensagem do commit, push, link/preview da Vercel se houver.
6. � � Repo pode ter WIP local não relacionado — commitar **só** os arquivos da tarefa.

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

Nunca aplicar estilos Lovers em Institucionais nem vice-versa sem pedido explícito.

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
- **Build de verificação: SEMPRE fora do projeto, uma vez só.** Rodar em pasta temp:
  `npx vite build --outDir "$TEMP/scw_build_$$" --emptyOutDir && rm -rf "$TEMP/scw_build_$$"`.
  Nunca disparar 2 builds ao mesmo tempo; esperar o anterior. `dist*/` já está no
  `.gitignore` — não versiona.
  *(Causa raiz dos builds de GBs resolvida em jul/2026: o acervo bruto de ~58 GB
  morava em `public/images/EDIÇÕES DO FESTIVAL/` e o Vite copiava tudo por build.
  Movido para `acervo-bruto/` na raiz — fora de `public/`, fora do git. Build agora
  ~364 MB / ~5 s. Não devolver o acervo pra dentro de `public/`.)*

```css
--accent: #E8553A;  --ink: #2B1810;  --peach: #F7D9B5;
--lovers-red: #D63648;  --lovers-cream: #FFF1E6;
--font-lovers-display: 'sofia-pro-comp', 'Caprasimo', serif;
--font-lovers-body:    'sofia-pro-comp', 'DM Sans', sans-serif;
```

## Escopo, qualidade e segurança

- Listar arquivos a modificar **antes** de editar. Alterar só o que se relaciona ao
  pedido. Usar `Edit` (não `Write`) em arquivos existentes, salvo reconstrução pedida.
  Resumo curto após cada conjunto de edições.
- Preservar padrão do projeto, tipagem, acessibilidade, responsividade. Evitar
  dependências novas sem justificativa. Não reescrever arquivo inteiro se ajuste local
  resolve.
- Não ler/exibir/versionar `.env`, secrets, tokens, chaves, credenciais.
- Pedir confirmação antes de ações destrutivas (apagar, reset, force-push, deploy de
  produção, remover dependência principal, mexer em config de produção).

## Princípio principal

Repositório é a fonte da verdade. Buscar contexto em arquivos, docs, commits, configs
antes de pedir ao usuário; não pedir o que pode ser inferido com segurança do repo.
Nunca fingir ter usado uma ferramenta.