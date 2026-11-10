<!-- Parte das regras do projeto. Índice: src/pages/CLAUDE.md. Movido sem reescrita de src/pages/CLAUDE.md em 10/11/2026. -->

### 7.3 Sweet Awards — `/sweet-awards` e `/historico-sweet-awards`, roxo `#4D257E`

**Onde mora (12/10/2026):** `src/pages/sweet-awards/` — `index.jsx` monta a página
(componente `HistoricoAwardsPage`, rota interna `historico-awards`); uma seção por
arquivo em `secoes/` (`Abertura`, `Indice`, `Resultados`, `QuemDaANota`, `Hall`,
`Historico`, mais `Cabeca.jsx` e `medalha.js`); **as contas e consultas são funções
puras em `consulta.js`** (filtro, índice, Hall, contagens), testadas em
`tests/sweet-awards.test.mjs` contra o acervo. Texto em
`src/data/conteudo/sweet-awards.js`; CSS em `scw-awards.css`.
`src/pages/institutional/HistoricoAwards.jsx` só reexporta. ⛔ **Não existe
`SweetAwards.jsx` — não criar arquivo novo só para casar com documentação antiga.**

**Ordem real (`index.jsx`):** `01 Abertura` · faixa de palavras (`Marquee`, §6.15) · `Índice` · `02 Resultados 2026.1` · `03 Quem dá a nota`
· `04 Hall` · `05 Histórico`. A página é de **consulta**, e cada coisa tem um caminho só:
categoria se escolhe no filtro, edição no acordeão, e o índice é o único atalho entre
seções. Reorganizada em 12/10/2026: de ~13,8 mil para ~7,6 mil px de altura.

Aparência de premiação e hall de vencedores — **não embeds de Instagram**. **A página
pode ser alterada com pedido explícito** (layout, seções, movimento, conteúdo editorial).
O que não muda sem autorização: flags de publicação, dados oficiais e deploy.

- **01 Abertura:** banda de foto (desktop **e** celular) + título ("O prêmio que o
  público entrega.") + lead + **3 números** (edições premiadas · prêmios entregues ·
  marcas premiadas), e nada mais. Fundo roxo. As classes `.swa-hero`, `.swa-hero__texto`
  e `.swa-numeros` são as que `scw-motion.css` coreografa — não renomear.
- **Índice ("Nesta página"):** as quatro áreas de consulta abaixo, cada uma com o que há
  nela (contado dos dados em `indiceDaPagina`). O salto rola até a seção e leva o foco
  ao H2 (o roteador é por hash: `href="#swa-hall"` cru trocaria de rota). ⛔ O índice
  das 8 categorias que ficava no herói **saiu**: categoria se escolhe no filtro.
  ⛔ **A vitrine com as fotos dos 4 primeiros lugares saiu em 06/08/2026. Não
  reintroduzir** — eram as mesmas quatro fotos que abrem a seção 02 logo abaixo, lá com
  pódio completo e medalha. Sem ela o desktop ficava com 216–268px de roxo chapado no
  topo; por isso a banda de foto passou a valer também no desktop.
- **02 Resultados 2026.1:** 8 categorias × 3 colocações, cada card com a **foto da
  peça premiada**. **Filtro por categoria** ("Ver categoria"): "Todas" mostra os oito
  pódios em duas colunas no desktop; escolher uma mostra só o pódio dela, maior. Botões
  com `aria-pressed` e uma região viva que diz o que a tela passou a mostrar — o foco
  fica no botão. **Medalha dentro da legenda do card**, ao lado do rótulo de colocação,
  **não solta no canto da foto**. Numeral sempre chocolate. 1º lugar em coluna larga
  (span de 2 linhas), 2º e 3º empilhados ao lado — **as três fotos sempre 1:1**; o 1º só é
  maior por ocupar coluna mais larga, não por aspect-ratio próprio. Empates no mesmo
  card. No celular (≤820px) vira carrossel de arrasto com snap.
- **03 Quem dá a nota:** **trilha do tempo de três momentos cronológicos** — 2019 (categoria
  única) → 2020.2–2021.2 (Júri Técnico) → 2022 em diante (só Sweet Lovers, com selo
  "hoje"). ⛔ **Não** dois cards gêmeos lado a lado: isso escondia que a régua mudou ao
  longo do tempo. Espinha tracejada atrás dos discos; no celular vira vertical com o
  disco fora do fluxo.
- **04 Hall dos mais premiados:** os **dez** participantes com mais colocações
  (`consulta.ranking`), com logo real ou iniciais, barra segmentada por colocação,
  contagem por posição e total. Ranking só entre participantes, nunca entre edições
  (§8.5).
- **05 Histórico:** **acordeão por edição**, da mais recente à estreia da premiação; cada
  edição abre e fecha sozinha (dá para comparar duas abertas), botão com
  `aria-expanded` e painel `role="region"`. Dentro, pódio completo por categoria,
  separado por trilha (Júri Técnico · Sweet Lovers) quando houve as duas. Sem foto: o
  acervo não liga foto e marca nessas edições.
  ✅ **Marca da edição na linha (14/10/2026):** logo inteira, `contain`, sem máscara nem
  placa, numa caixa de 76px (≤560) a 92px; a linha é marca · ano e tema · categorias ·
  seta, e abaixo de 560px a contagem desce para baixo do tema (a marca não encolhe).
  Presença óptica e contraste vêm de `apresentacao` em `editionMark()`
  (`src/data/editionAssets.js`): selos que enchem o arquivo em 0,9, a 2022 (quadrado
  opaco) em 0,86, e só a 2021.1 ganha disco chocolate ("SÉRIES" é branco). Edições não
  lê esse campo.
  ✅ **Número no círculo (14/10/2026):** "1" da lista e "1º" do pódio usam `.swa-num`
  (`scw-awards.css`) — caixa recortada por `text-box: trim-both cap alphabetic`, que
  centraliza o desenho do algarismo, não a caixa da fonte; sem suporte, `--swa-num-y`.
  ⚠️ **Nome da época quando o nome repete:** duas categorias da mesma edição unidas pelo
  alias no mesmo nome canônico mostram embaixo **"na época, “…”"** com o nome original
  (`nomeOriginal`, derivado em `awardsData.js`). O §8.2 vale para o nome canônico; o da
  época é o que distingue as duas.
- **Antes de 2019:** fecha o histórico — as cinco primeiras edições não tiveram
  premiação, e a página **diz isso**.
- ⛔ A seção **"O momento de receber o prêmio"** (bastidores, 3 fotos) **saiu em
  20/08/2026**: não estava no desenho nem nesta lista de seções. As fotos seguem em
  `public/images/awards-bastidores/`.
- ⚠️ O desenho de 20/08 traz o pódio em **três colunas** com o 1º em **4:5**. Isso é
  exatamente o que o §11 registra como testado e reprovado, e o mesmo arquivo ainda
  desenha a medalha de 2º em `#EBD6B4`, cor que saiu da paleta. **O código fica como
  está** — 1º em coluna larga, as três fotos 1:1.

**Regra de dados:** descrições das categorias vêm de `sweetCoffeeHistory.js`; **os pódios
da edição 2026.1 vêm de `loversAwardsResults.js`** (na base histórica eles estão vazios
de propósito); o histórico das demais vem de `sweetCoffeeHistory.js`; o agregado é
derivado em `src/data/handoff/awardsData.js` — **se divergir do código em `src/data/`,
vale o código.** Logos reais via `resolveParticipant`, com fallback em iniciais. **2º e 3º
lugares que o acervo não registra: ausência honesta, nunca preenchida.**

✅ **Os números do Hall batem com o acervo desde 07/08/2026** e não são mais digitados:
saem da fonte a cada import (§9.4).

