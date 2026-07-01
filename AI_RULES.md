# AI_RULES.md — Regras obrigatórias de alteração (IA e dev)

> **Leia isto ANTES de tocar em qualquer arquivo do projeto Sweet & Coffee Week.**
>
> Este documento é o contrato de manutenção do repositório. Vale para **qualquer**
> alteração futura, feita por IA ou por humano. Nasceu de uma auditoria de arquitetura
> que identificou a causa-raiz da dor recorrente do projeto: *"mudo algo global (heros,
> cor) e não propaga"*. A causa não é bug — é **múltiplas fontes de verdade para o mesmo
> conceito** (cor base em 2 `:root`, estilo de hero em 1 seletor morto + 7 blocos inline,
> `INSTAGRAM_URL` em 4 lugares, form duplicado 3x). Estas regras existem para que isso
> **nunca mais se repita**.
>
> Hierarquia de autoridade: `CLAUDE.md` (raiz do projeto) é a **fonte viva** de regras de
> conteúdo/design/nomenclatura. Este `AI_RULES.md` é a **fonte viva** de regras de
> arquitetura/engenharia. Quando um contradiz doc antigo (ex.: `DESIGN.md` §2), valem
> `CLAUDE.md` e `AI_RULES.md`.

---

## 0. Legenda: atual vs. alvo

Parte da arquitetura descrita aqui **ainda não existe** — é o alvo da refatoração em
andamento. Cada regra estrutural marca seu estado:

- **[ATUAL]** — já existe no código hoje; respeitar.
- **[ALVO]** — arquitetura pretendida (pós-refatoração); ainda **não** criada no repo.
  Ao implementar, seguir exatamente esta forma. Não referenciar como se já existisse.

Componentes/arquivos marcados **[ALVO]** e que **ainda não existem** no repositório
(verificado): `src/components/layout/Hero.jsx`, `Section.jsx`, `PageForm.jsx`;
`src/config/channels.js`; `src/hooks/useContactForm.js`; `src/styles/tokens.css`.
**Não invente import destes arquivos sem antes criá-los** na etapa correspondente do plano.

---

## 1. Regras de ouro (herdadas do CLAUDE.md — inegociáveis)

Estas vêm do `CLAUDE.md` e têm precedência sobre qualquer conveniência técnica:

1. **Não alterar a Home/O Festival sem solicitação explícita.** É a página-mãe (§9). Mover
   uma `const` de conteúdo para `src/data/` sem mudar layout é aceitável; qualquer mudança
   visual, não.
2. **Não usar cores fora da paleta oficial.** Creme, bege, rosa, amarelo, azul/ciano,
   coral/vermelho, marrom, vinho. **Proibido roxo, verde, lavanda, cinza frio, preto puro.**
   Nunca inserir hex avulso; reutilizar tokens.
3. **URLs de QR Code são congeladas.** `#/lovers/combos/:slug` e `#/lovers/awards` **não
   podem mudar** (rota, slug ou tipo de routing). Qualquer mexida nelas exige **parar e
   avisar** antes. Não trocar hash routing por path routing.
4. **Duas identidades visuais nunca se misturam.** Institucional (`src/pages/institutional/`,
   paleta terracota, `--page-accent` por rota) × Lovers (`src/pages/lovers/`, wrapper
   `.kv-lovers`, paleta creme/vermelho, Typekit). Nunca aplicar estilo Lovers em página
   institucional nem vice-versa.
5. **Branch de trabalho é `dev/site-completo`.** Nunca alterar `master`/`main`. Nunca
   `vercel --prod`, nunca promover Preview para Production, nunca merge para `master` sem
   autorização. Confirmar branch (`git branch --show-current`) antes de editar; se estiver
   em `master`, **parar e avisar**.
6. **Não alterar `AWARDS_ONLY_PUBLICATION` nem `INSTITUTIONAL_PREVIEW`** (`App.jsx`) sem
   pedido explícito. São o gate que impede o institucional em refatoração de vazar no
   domínio oficial.

---

## 2. Regras de arquitetura (o coração deste documento)

### 2.1 Uma fonte de verdade por conceito
Cada conceito tem **UM** lugar de edição. Cor → tokens. Estrutura de hero/seção → um
componente. Canal/constante → uma config. Conteúdo → `src/data/`. Se você precisa editar
"todos os X" e isso obriga a tocar N arquivos, **pare**: é sinal de fonte duplicada — a
correção é colapsar em um, não repetir a edição N vezes.

### 2.2 Nunca duplicar componente/lógica sem necessidade real
- **Antes de criar qualquer componente, hook, hero, seção, form ou constante, procure se
  já existe** (`grep`/`Grep` no `src/`). Reutilize.
- **É proibido copiar-colar** bloco de JSX, `<style>` inline ou lógica entre páginas.
  Duplicação já documentada e a eliminar: 7 heros inline, form clipboard→Instagram 3x
  (`Participar`, `Apoiar`, `SiteFooter`), `INSTAGRAM_URL` 4x, boilerplate de
  `useRevealOnScroll` 6x.
- Duplicar só se houver justificativa escrita de que abstrair custa mais que a cópia — e
  isso é exceção, não padrão.

### 2.3 Centralizar padrões em tokens e componentes
- **Cor, tipografia, espaço, raio, sombra e motion vivem em tokens** — **[ALVO]** um único
  `src/styles/tokens.css` carregado **primeiro** em `main.jsx`. **[ATUAL]** hoje há **dois
  `:root` concorrentes** (`styles.css:8-67` v1 terracota e `swc-redesign.css:7-111` v2
  creme, que vence por ordem de import). Enquanto os dois existirem: **nunca redefina o
  mesmo token nos dois arquivos**; ao mudar uma cor base, saiba que **v2 vence** e edite
  lá. Ao consolidar, os valores de v2 (os que renderizam) são a base.
- **Estrutura de hero e de seção vira componente** — **[ALVO]** `<Hero variant="chocolate|
  accent">` e `<Section>`/`<Wrap>` em `src/components/layout/`. Editar o hero de todo o site
  = editar **um** componente. **[ATUAL]** ainda são 7 blocos `<style>` inline governados
  por uma regra global.
- **Constantes de canal em config** — **[ALVO]** `src/config/channels.js` para
  `INSTAGRAM_URL`/handle (hoje espalhado em 4 arquivos).

### 2.4 Nunca aplicar ajuste global página-por-página
Se o pedido é "mude os heros / a cor / a margem / o motion em todas as páginas", **não
edite arquivo por arquivo**. Edite a fonte única (token/componente/regra global) e deixe
propagar. Se não existe fonte única para aquilo, **primeiro crie a fonte única** (conforme
o plano de refatoração), depois altere.

### 2.5 A armadilha do `!important` global — CUIDADO CRÍTICO
**[ATUAL]** A regra global `src/styles.css:538-559` controla os heros institucionais
(`.ed-hero, .cur-hero, .participar-hero, .apoiar-hero, .contato-hero, .hist-hero`) com
`background: var(--page-accent) !important` e `:is(h1,p){ color: var(--ink) !important }`.

Consequências que você **precisa** conhecer antes de tocar em qualquer hero:
- **`.ed-hero` é seletor MORTO** (0 consumidores no `src/`; Edições usa `.edx-hero`, que
  escapa por ter regra própria). Não confie nele.
- **O `<style>` inline de cada página perde silenciosamente** para o `!important` global.
  O fundo chocolate + texto creme que você lê no `.jsx` **não é o que renderiza** — o global
  impõe fundo=acento + texto escuro. **Por isso "editar a página não faz nada".**
- **Regra:** ao mexer em hero, a fonte de verdade é a **regra global** (ou, no alvo, o
  componente `<Hero>` + tokens) — **não** o `<style>` da página. Confirme no DevTools qual
  regra ganha antes e depois. Ao consolidar, **remova a guerra de `!important`**, não some
  mais um.

### 2.6 Separar conteúdo da camada visual
- **Dados e textos moram em `src/data/`** (13 arquivos já bem estruturados — o padrão do
  projeto). JSX é composição/layout, não depósito de conteúdo.
- **[ATUAL]** exceções a migrar (não replicar o antipadrão): `TESTIMONIALS`
  (`Participar.jsx`), `mediaCards`/`STEPS`/`STATS` (`Home.jsx`), `EVO_MARCOS`/`MOMENTOS`
  (`Curiosidades.jsx`).
- **Nunca inventar dado histórico.** Fontes: `src/data/sweetCoffeeHistory.js` (base oficial,
  16 edições), `loversAwardsResults.js` (pódios Lovers), demais `src/data/*`. Em caso de
  divergência, **o código em `src/data/` é a verdade** (e atualize o `ACERVO.md`). Logos
  reais via `resolveParticipant` com fallback de iniciais — **nunca** inventar logo.

### 2.7 CSS sem regras que brigam nem código morto
- Não introduzir regras que se sobrescrevem via especificidade/`!important` para a mesma
  propriedade. Estilo estrutural pertence ao componente + tokens.
- **[ATUAL]** código morto conhecido a remover ao passar pela área (não deixar crescer):
  `.site-sidebar`, `.combo-rail`, `.ed-hero`, e o hack `.eyebrow{display:none}`. Não
  "esconder via CSS" — remover markup + estilo.

---

## 3. Design system — respeitar

- **Margem horizontal única** (`CLAUDE.md` §4): container canônico `.wrap` da Home —
  `max-width: 1280px`, `padding: 0 clamp(20px,4vw,56px)`. Toda página institucional usa
  exatamente isso. Não criar largura/gutter divergente (1180px, 1140px, clamp com 64px…):
  quebra o alinhamento vertical entre páginas. **[ALVO]** encapsular no `<Section>`/`<Wrap>`.
- **Zona de segurança menu↔hero** (`CLAUDE.md` §4.1): usar os tokens globais
  `--header-safe-offset`, `--hero-top-clearance`, `--hero-content-start`. Fundo da hero
  pode ir ao topo; **conteúdo** só começa após `--hero-content-start`. Proibido `margin-top`
  solto, empurrão manual no título ou `position:absolute` improvisado.
- **Hero não tem altura fixa de 1080px** — usar `clamp` proporcional (já cumprido).
- **Acento por página** via `--page-accent` em `body.route-*` (`src/styles.css`) e sempre
  **dentro da paleta** e claro o bastante para contraste com `--ink`. Nunca roxo/verde/
  lavanda. Atenção: o acento de Apoiar (azul `#1B86C9`) **falha AA** com texto escuro —
  qualquer mexida no hero de Apoiar deve resolver contraste ≥ 4.5:1 dentro da paleta.
- **Sem eyebrow/kicker** acima de títulos. **Sem fonte mono** (JetBrains Mono) em rótulos/
  labels/metadados institucionais — usar Nexa (`--font-sans`/`--font-slab`).
- **Sem stickers/blobs/ornamentos** sem função em páginas institucionais. Todo elemento
  visual precisa ter função.
- **Placeholders/fallbacks** parecem parte do sistema (moldura editorial), nunca erro
  técnico. Logo/foto reais quando existir; espaço reservado e texto claro quando não.

## 4. Motion system — respeitar

- **Uma escala de motion**, em `src/styles/motion-system.css`. **[ATUAL]** hoje há 3 escalas
  concorrentes (`motion-system.css`, `swc-redesign.css`, `lovers-system.css`) e 57+ durações
  únicas. Ao mexer em transição/animação, **consumir os tokens de motion**, não inventar
  duração nova.
- `animation-timeline: view()` é Chrome-only — sempre dar **fallback via
  `useRevealOnScroll`** (que já existe) para Firefox/Safari. Não deixar card sem reveal.
- Não introduzir biblioteca de animação nova sem justificativa (regra `CLAUDE.md`).

---

## 5. Processo de mudança — obrigatório

### 5.1 Antes de uma mudança grande: apresentar plano
Para qualquer alteração que toque fonte única (tokens, hero, roteador, gate de publicação),
que atinja múltiplas páginas, ou que envolva decisão de design em aberto:
1. **Listar os arquivos que serão modificados** e o porquê, **antes** de editar.
2. **Apresentar o plano** e, se houver decisão de design/produto em aberto (ex.: hero
   chocolate vs. acento; destino dos QR Codes), **obter a decisão do usuário por escrito**
   antes de codar. Não decidir sozinho o que a auditoria marcou como "decisão do usuário".
3. Fazer em **etapas pequenas, isoladas e reversíveis**; 1 subcommit por item lógico.

### 5.2 Não alterar várias áreas sem explicar impacto
Se uma mudança propaga (por ser fonte única), **isso é o objetivo** — mas **explicite o
alcance**: "isto altera todos os heros institucionais", "isto muda a cor base do site
inteiro". Nunca deixar um efeito global implícito. Alterar só o que se relaciona ao pedido;
usar `Edit` (não `Write`) em arquivo existente, salvo reconstrução pedida.

### 5.3 Depois de editar: listar o que mudou
Ao fim de cada conjunto de edições, reportar de forma curta:
- **arquivos alterados** (caminho) + **o que mudou em cada um**;
- efeitos de propagação (o que passou a mudar globalmente);
- resultado do build e, se houver, do lint/testes.

### 5.4 Escopo e commits
- Commitar **só** os arquivos da tarefa. O repo costuma ter WIP local não relacionado —
  não commitar o que não é seu. Commit pequeno e claro (`feat:`/`fix:`/`style:`/`chore:`/
  `docs:`), push em `dev/site-completo`.
- Ações destrutivas (apagar asset, `reset`, `force-push`, renomear pasta com referências,
  mexer em config de produção) exigem **confirmação explícita** antes.

---

## 6. Validação antes de finalizar — checklist

Rodar/conferir sempre, na ordem:

1. **`npm run build` verde.** Falhou → parar, mostrar erro, **não** commitar/push.
   (`dist/` pode ficar travado pelo Dropbox → buildar em `dist_check --emptyOutDir` e depois
   remover.)
2. **Responsividade**: `node tests/responsive.mjs` (6 viewports) sem overflow; conferir
   desktop, tablet e mobile; nada colado no menu; grids viram coluna no mobile.
3. **Performance**: não regredir peso do bundle; imagens novas comprimidas + `srcSet`
   quando aplicável; SVGs otimizados. Não deletar asset pesado sem confirmação do usuário.
4. **Acessibilidade**: 1 `<h1>` por página e hierarquia de headings coerente; contraste
   texto/fundo ≥ 4.5:1 (atenção ao hero Apoiar); label real (`<span>`) + placeholder, não
   placeholder-como-label; ação de navegação é `<button>`/`<a>`, não `onClick` em elemento
   morto.
5. **Não regressão visual**: em mudança de token/hero/global, varrer todas as rotas
   institucionais **e** Lovers (via painel) comparando antes/depois; o output visual
   aprovado deve permanecer (refatoração ≠ redesign).
6. **Regras de ouro intactas** (§1): Home não mexida sem pedido; flags de publicação
   intactas; nenhuma cor nova; sem stickers não solicitados; margens = Home; rotas de QR
   congeladas; identidades não misturadas.

---

## 7. Atualização deste documento

Sempre que a arquitetura mudar (fonte única nova criada, componente `<Hero>`/`<Section>`/
`<PageForm>` entregue, `tokens.css` consolidado, config de canais centralizada), **atualizar
este arquivo**: mover o item de **[ALVO]** para **[ATUAL]** e ajustar os caminhos. Um item
marcado [ALVO] que já foi implementado e não foi atualizado aqui é um bug de documentação —
corrija ao encontrar. Manter `CLAUDE.md`, `SITEMAP.md` e `ACERVO.md` em sincronia quando a
mudança os afetar.
