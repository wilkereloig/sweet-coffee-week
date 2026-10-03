<!-- Parte das regras do projeto. Índice e regras absolutas: CLAUDE.md da raiz. Movido sem reescrita em 03/10/2026. -->

## 7 · As páginas

### 7.1 Home / O Festival — `/`, amarelo `#FDBB1A`

⛔ **Não alterar sem solicitação explícita.** É a página-mãe: as demais usam a Home como
referência de margem, largura máxima, respiro, hierarquia, ritmo, nível de acabamento e
tom institucional-afetivo. Extrair componente ou constante é permitido **desde que não
mude o comportamento visual** — validar idêntico.

**Reconstruída em 28/09/2026** (pedido do Wilker): a Home tem duas funções —
anunciar a **edição de novembro com o pré-cadastro aberto** ("agora") e apresentar o
festival ("sempre"). **Sete seções:** `01 Abertura` · `02 O festival` ·
`03 Como participar` · `04 Por que participar` · `05 O festival em movimento` ·
`06 Trajetória` · `07 Apoio` + `Realização` (F2).

- **01 Abertura (`.hm-abre`)** — não é mais herói de tela cheia: altura do conteúdo, e a
  seção seguinte aparece na primeira dobra do desktop. Texto à esquerda (estado
  "Próxima edição" + selo "Cadastro aberto", H1 `.scw-h1`, lead, duas ações, ficha de
  três linhas), fotos à direita: **pessoas** em crossfade de 6,2s com um **combo** em
  recorte redondo sobreposto, trocando juntos. Tudo que fala da edição lê
  `src/data/proximaEdicao.js` — **campo `null` não aparece** (tema, datas, valor).
  ⚠️ **As fotos são todas da Lovers (2026.1) e a legenda diz isso** ("Registros da
  edição Lovers · 2026"). Ficam de fora de propósito: fantasias (Heróis & Vilões),
  personagens de desenho ou de contos (Padoca do Bosque, a luva do Mickey em
  `2023/04`) e a faixa do Sebrae (§9.6) — qualquer uma seria lida como pista do tema de
  novembro, que não foi anunciado.
  Celular (<1000px): foto no topo, largura cheia, **16:10** (2:1 entre 600 e 999px) —
  não o quadrado do §6.9, para o botão caber acima da barra de abas em 390×844.
- **02 O festival** — texto, anatomia do combo e três laços (casas · público · Natal)
  à esquerda; um combo completo à direita. A anatomia continua como era: ⛔ **sempre em
  UMA LINHA, inclusive no celular** (pedido do Eloi, 22/08/2026), escala por
  `--ing-disco`/`--ing-mais`, quatro desenhos por ingrediente em 8,8s (`scwIcnCiclo`,
  arte em `anatomia-combo.js`, fora de `scw-icons-v2.js`), só o primeiro com
  `prefers-reduced-motion`. **Não empilhar de novo.**
  ⚠️ O texto não diz "onze dias" nem "preço único": são fatos das edições passadas que
  soariam como regra de novembro, e duração e valor dela são `null`.
- **03 Como participar** — chapa **cyan** (cor do destino, Participar), três passos
  reais (pré-cadastro · curadoria · painel da marca e combo), a nota "o pré-cadastro não
  garante vaga" e a ação. Chapa clara: rótulo, links e **anel de foco em chocolate**.
- **04 Por que participar** — foto da equipe da Jolie com os prêmios + o depoimento
  da Carol Barreto; embaixo, quatro ganhos com dado (`festivalFacts`: +18 mi · +34 mil
  · +R$ 712 mil — contadores que sobem uma vez) e "Sweet Awards". A cor vai no ícone,
  uma por irmão (§6.3).
- **05 O festival em movimento** — mosaico editorial de seis fotos de tamanhos
  diferentes, cada uma com legenda que o acervo sustenta. **Sem laço, sem autoplay**: a
  entrada é a do motor. ⛔ A fita automática (`GaleriaCarrossel`/`.hm-fita`) **saiu** —
  era a pendência declarada aqui (atmosfera carregando informação); o Wilker pediu
  galeria controlada e sem movimento contínuo competindo com o texto.
- **06 Trajetória** — dois cartões-link na cor do destino (Edições laranja, Awards
  roxo; o número de edições premiadas sai de `AWARDS_DADOS`) e a lista de imprensa com
  "ver todas".
- **07 Apoio** (marrom, convite para Apoiar, sem patrocinador — §9.6) e **Realização**:
  KV da F2 Experience, a exceção declarada de paleta e fonte (§6.1).
- ⛔ **Saíram:** a faixa de palavras (`Marquee`), as Rotas, o Ciclo de quatro etapas e o
  cartão "preço único". O conteúdo válido foi redistribuído nas seções acima.
- Fotos das seções: `fotosHome(chave)` em `imageLibrary.js`; da abertura,
  `heroPhotos('home')`. Movimento da abertura: `scw-motion.css` (`.hm-abre …`).

> **Alvo do plano institucional:** a Home passa a ter oito seções, com "O festival
> transforma Natal" e "Os temas de todas as edições" ganhando bloco próprio. Ver
> `acervo/plano-site-institucional.md`. **Isso é plano, não estado — e depende de pedido
> explícito para ser executado (A6).**

### 7.2 Edições — `/edicoes`, laranja `#FF4810`

Experiência de tela cheia: apresentação editorial photo-first da história do festival.
**16 cenas, uma por edição.**

Em Edições o `App.jsx` **não renderiza** o cabeçalho do site nem o rodapé: a página tem
**cabeçalho próprio com a mesma geometria** — mesmo `--scw-trilho`, mesmo padding vertical
de 50px, marca da edição no slot da logo. **O menu não muda de lugar entre páginas.** A
barra de abas mobile continua montada por fora.

**Desktop:** cena de 100vh. Metade direita com **mosaico de 3 fotos** sangrando (uma larga
em cima, duas embaixo, filete de 3px). Metade esquerda com rótulo, tema, frase, meta
(período / marcas / Sweet Awards) e dois botões que abrem painéis flutuantes de
participantes e curiosidades. Fundo: foto do combo com `blur(64px)` sob véu chocolate a
87%, com deriva lenta de 46s. Rodapé com trilha das 16 edições (dots + anos), setas e
barra de progresso. Navegação por setas do teclado, clique na trilha e arraste.

**Mobile:** cabeçalho compacto com a marca da edição e progresso `01/16`; foto 4:5 com
tema; mosaico de 2 fotos 1:1; dados; palavras-chave; sanfonas de marcas e curiosidades.
Navegação em **uma peça só**: a régua de anos fixa na base, com as setas dentro.

1. **Régua de anos fixa na base** — trilha horizontal com os 16 anos + barra de progresso
   (`transform: scaleX` com origem à esquerda, **sem transição**). Rola e centraliza no
   ano ativo. O deslocamento acima da barra de abas é **condicional, nunca literal**.
   Fundo **chapado** (`rgb(43,14,6)`) e **sem `backdrop-filter`** — blur sobre cena
   animada trava o compositor (§10.3), e os 4% de transparência que havia antes
   deixavam o contador da galeria aparecer como texto fantasma atrás dos anos.
2. **As setas de passar vivem NA régua**, flanqueando os anos: `seta · anos · seta`, o
   **mesmo arranjo e a mesma peça** do rodapé do desktop (`.scw-edx__seta` e
   `--proxima`). Os anos são a única parte elástica (`flex: 1` + `min-width: 0`).
3. Nos extremos a seta sem destino recebe **`disabled`** de verdade — não só
   `opacity:0` —, para sair da tabulação. Dentro da régua ela fica no estado padrão
   do sistema (`.45`): sumir deixaria um buraco na linha.

⛔ **As setas laterais saíram em 22/08/2026** (pedido do Eloi) — 62×52px a 31% da altura,
metade fora da tela, com laço de pulso de 2,8s cada. Flutuavam sobre a cena, longe da
régua que comandam, e precisavam do pulso para se anunciar. **Não recriar.**

**Selo da cena:** disco vazado de 54px (44px em ≤900px) com **um ícone por edição**,
no tom da cena, ao lado da pill do rótulo — `ICONE_EDICAO` em `Edicoes.jsx`, mapeado
um a um do desenho. ⚠️ A classe é `.scw-edx__cena-selo`, **não** `.scw-edx__marca`:
essa última já é a marca da edição no cabeçalho, e o nome colide.

**Dados:** `src/data/handoff/edicoesData.js`, derivado de `sweetCoffeeHistory.js`.
**Performance:** janela `live/near ±1-2` monta foto e mosaico só perto do foco.

**Barra da galeria de fotos** (`.scw-gal__barra`) é **`seta · contador · seta` — três
peças, nada mais.** ⛔ **Não reintroduzir** pontos, rótulo `Fotos · <ano>` nem "N de N"
por extenso. As duas variantes (`--mosaico` no desktop, `--par` no celular) usam o
**mesmo** flex. Se voltar a precisar de layouts diferentes, é sinal de que peça a mais
entrou. O que **não** se mexe ao simplificar: as setas de 44px e o teclado ←/→/Home/End.

O numeral da edição é sempre `#FEF0DD` — o vinho sobre foto dava 2,08:1.

**Não usar:** stickers; grade comum de cards; `backdrop-filter` sobre o trilho animado. A
navegação das edições parece **controle de apresentação**, não segunda navbar — não pode
brigar com o menu.

### 7.3 Sweet Awards — `/sweet-awards` e `/historico-sweet-awards`, roxo `#4D257E`

Arquivo: `src/pages/institutional/HistoricoAwards.jsx`, componente
`HistoricoAwardsPage`, rota interna `historico-awards`. ⛔ **Não existe
`SweetAwards.jsx` — não criar arquivo novo só para casar com documentação antiga.**

Aparência de premiação e hall de vencedores — **não embeds de Instagram**. **A página
pode ser alterada com pedido explícito** (layout, seções, movimento, conteúdo editorial).
O que não muda sem autorização: flags de publicação, dados oficiais e deploy.

- **Herói:** banda de foto (desktop **e** celular) + título editorial + **3 números**
  (edições premiadas · categorias julgadas · marcas premiadas) + índice das 8 categorias.
  Fundo roxo; o selo inverte para creme com tinta roxa.
  ⛔ **A vitrine com as fotos dos 4 primeiros lugares saiu em 06/08/2026. Não
  reintroduzir** — eram as mesmas quatro fotos que abrem a seção 02 logo abaixo, lá com
  pódio completo e medalha. Sem ela o desktop ficava com 216–268px de roxo chapado no
  topo; por isso a banda de foto passou a valer também no desktop.
- **Vencedores da última edição:** 8 categorias × 3 colocações, cada card com a **foto da
  peça premiada**. **Medalha dentro da legenda do card**, ao lado do rótulo de colocação,
  **não solta no canto da foto**. Numeral sempre chocolate. 1º lugar em coluna larga
  (span de 2 linhas), 2º e 3º empilhados ao lado — **as três fotos sempre 1:1**; o 1º só é
  maior por ocupar coluna mais larga, não por aspect-ratio próprio. Empates no mesmo
  card. No celular (≤820px) vira carrossel de arrasto com snap.
- **Quem dá a nota:** **trilha do tempo de três momentos cronológicos** — 2019 (categoria
  única) → 2020.2–2021.2 (Júri Técnico) → 2022 em diante (só Sweet Lovers, com selo
  "hoje"). ⛔ **Não** dois cards gêmeos lado a lado: isso escondia que a régua mudou ao
  longo do tempo. Espinha tracejada atrás dos discos; no celular vira vertical com o
  disco fora do fluxo.
- **Hall dos mais premiados:** barra segmentada por colocação, contagem por posição e
  total.
- **Histórico:** acordeão por edição, pódio completo por categoria, separado por trilha
  quando houve júri e público.
- **Antes de 2019:** as cinco primeiras edições não tiveram premiação — **dizer isso**.
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

### 7.4 Participar — `/participar`, cyan `#01AFCC`

Segue a lógica visual da Home. Precisa de: proposta clara; fotos quando disponíveis;
**depoimentos**; **formulário em destaque**; linguagem voltada a participantes; visual
editorial e comercial. **Não parecer formulário genérico.**

**Seis seções:** `01 Abertura` (herói cyan) · `02 Depoimentos` (creme) ·
`03 O que a marca ganha` (bege) · `04 Números` (creme) · `05 Como funciona` (chocolate) ·
`06 Pré-cadastro` (creme). ⛔ `04 Circulação`, `05 Quem pode`, `06 Imprensa` e
`07 Jornada` **saíram em 26/08/2026** (pedido do Eloi): a página passou a anunciar a
próxima edição e empurrar para o pré-cadastro.

**Refeita em 18/09/2026** (pedido do Wilke: *"visual genérico"*). As seções do meio
repetiam a mesma receita — grade de cards com disco de ícone. Entraram duas que saem
dela, e a numeração foi refeita de 01 a 06 (a antiga 08 só guardava o lugar das que
saíram):

- **03 O que a marca ganha** — mosaico fotográfico (`.pa-ganhos`), superfície
  fotográfica do §6.16: foto sangrada, véu chocolate, tinta creme. Quatro ganhos
  (combo autoral · campanha e imprensa · Sweet Lovers · Sweet Awards), fotos em
  `fotoGanho()` de `imageLibrary.js`. 1 coluna → 2×2 a partir de 760px → zigue-zague
  7/5 · 5/7 a partir de 1100px. Selo na cor do ciclo sem o magenta. **Sem link, sem
  hover** (§6.15, regra 6).
  ⚠️ **O véu é em px, não em %:** o texto tem altura fixa (~170px), e a faixa inteira
  fica sob véu a .86 ou mais em qualquer altura de peça. Em % a peça baixa deixava o
  parágrafo sobre foto clara.
  ⛔ **Os displays de mesa de `campanha/` ficaram de fora de propósito:** trazem preço
  e data impressos, e o site não exibe dado volátil (§2.2).
  ⚠️ **Nada de promessa (§8.4):** o texto diz o que a edição faz por quem participa;
  o FAQ já registra que o pré-cadastro não garante vaga nem prêmio.
- **05 Como funciona** — trilha de cinco passos sobre chocolate (`.pa-passos`):
  pré-cadastro · curadoria · aprovação e painel da marca · o combo · a edição. Só
  passos que existem de fato. Nó numerado na cor do ciclo filtrada pelo chocolate
  (amarelo · cyan · magenta · laranja · creme). **A espinha é desenhada por passo**,
  não por uma linha só no contêiner: a mesma regra serve em coluna (até 999px) e em
  linha (a partir de 1000), sem conta de onde fica o último nó.
  ⚠️ **Não confundir com o `04 Ciclo` da Home**, que também se chama "Como funciona":
  lá é o ciclo do festival contado com fotos; aqui é o caminho da casa até a edição,
  sem foto.

- Herói = H1 + lead + **duas ações, nada mais**. No celular a foto continua, na
  `.scw-hero-banda` em 4:3.
- **Depoimentos vêm logo depois da abertura** (decisão do Eloi, 30/07/2026): são a prova
  social; quem cogita participar quer ouvir quem já participou antes de ler número ou
  processo, e vários depoimentos são em vídeo.
  ⚠️ **Os vídeos tocam sob demanda, não em autoplay** (15/09/2026, pedido do Wilke):
  hover/foco do card com ponteiro; no toque, quando o vídeo entra ≥60% na tela. Cinco
  laços simultâneos violavam §6.15 (um laço de atmosfera por tela) e §6.16 (⛔ autoplay
  dentro de card). Com `prefers-reduced-motion`, só toca pelo botão de som.
  ⚠️ **Palco, não faixa** (18/09/2026, pedido do Wilke: *"refaz essa"*): **um
  depoimento por vez**, grande — vídeo 1:1 à esquerda e a frase na chapa da cor da
  marca à direita (`.pa-palco`) — e as cinco marcas embaixo como **abas**
  (`role="tablist"`, setas em laço, Home/End, foco que percorre as abas). A faixa de seis cards iguais
  (15/09) era a receita de card que deixava a página genérica, e a grade 3×2 antes
  dela já tinha caído por altura (1.865px). ⛔ Não voltar a nenhuma das duas.
  Até 759px o palco empilha com o vídeo em 4:3 e a aba vira só o logo (o nome segue
  como `aria-label`); a partir de 760 vídeo e frase ficam lado a lado — empilhado, em
  800px, o palco media 823px. **Um `<video>` só no DOM:** a troca de aba remonta
  pela `key`, e o som desliga a cada troca.
  ⛔ **A reserva da Caroli Douces saiu** (18/09/2026, pedido do Wilke): no palco, uma
  marca sem depoimento viraria uma aba que não diz nada. Voltam cinco, todos em vídeo.
- **04 Números tem quatro dados** → `.pa-numeros--quatro`: **1 → 2 → 4 colunas, nunca
  3** (a base `.pa-numeros` limita a 3 e é o que Apoiar usa). O numeral tem teto em
  `14cqi` na fileira de 4 porque é `nowrap` (§10.5).
- **Uma ação, um rótulo:** herói, CTA da 06 e barra fixa dizem todos
  **"Fazer pré-cadastro"**. O botão da 06 usa a cor do destino (`.scw-btn--pagina`,
  cyan) com anel chocolate de 2px, porque cyan sobre o card bege não fecha 3:1.
  ⚠️ **Os três levam DIRETO ao formulário `/quero-participar/`** (18/09/2026, pedido
  do Wilke). Até então o do herói e o da barra fixa só rolavam até a seção 06 — um
  clique a mais entre a decisão e o formulário. `<a href>` com a barra final,
  nunca `navigate()` (§10.4-b).

- **06 Pré-cadastro NÃO tem formulário** (22/08/2026, pedido do Eloi). A seção é uma
  chamada (`.pa-cta`) para a página estática **`/quero-participar/`**, que é onde o
  pré-cadastro vive: **dois passos** (Você / O estabelecimento, sete campos ao
  todo — simplificado de quatro passos, sem índice pegajoso desde então),
  validação por passo e gravação em `quero_participar`.
  ⚠️ **A razão não é estética, é o banco.** O formulário que morava na página gravava
  em `participation_interests`, tabela que **nenhuma tela abre** — nem o painel da
  organização. O de `/quero-participar/` grava na tabela que o painel lê e triaria.
  Formulário que escreve onde ninguém lê é envio que se perde em silêncio, e some
  parecendo que funcionou.
  Por isso a regra "**formulário em destaque**" do parágrafo acima se cumpre pela
  chamada, não por um `<form>` na página. ⛔ Não devolver o formulário para cá: duas
  telas pedindo os mesmos dados são duas fontes de verdade do mesmo cadastro (§5.2), e
  era a daqui que ficava para trás a cada melhoria feita lá.

### 7.5 Apoiar — `/apoiar`, marrom `#6A2C15`

Precisa de: **formulário em destaque**; explicação visual das oportunidades de apoio;
benefícios para marcas; exemplos de presença da marca no festival; linguagem comercial
alinhada ao tom. **Não parecer página institucional fria.**

**Seis seções:** `01 Abertura` · `02 Alcance` · `03 Por que apoiar` · `04 Onde aparece` ·
`05 Quem vive` · `06 Proposta`. Mesma estrutura de herói de Participar — sem cartão e sem
indicadores.

- Os três indicadores de audiência **mudaram de lugar, não sumiram**: abrem a seção
  `02 Alcance`. Diferente de Participar, **não se repetem** — são dado próprio. Padrão
  disco + ícone + numeral + rótulo, com o disco de 54px na cor da página.
- **`05 Quem vive` é grade editorial**, não duas listas de bullets lado a lado: os seis
  traços do público viram itens com índice `01`–`06` e **filete horizontal** entre eles —
  bolinha de 7px é indicador de item de lista, **não de dado**. O texto do traço é
  `700 17–21px`: **ele é o argumento da seção**. A imprensa sai de dentro da grade e vira
  **bloco irmão embaixo, separado por 44–72px** — a distância entre argumento e prova é
  maior **de propósito**. ⛔ Não usar `--scw-gap-bloco` aí.
- **A página não exibe patrocinadores.** Em vez de vitrine de logos, mostra **formatos de
  ativação** — o que já foi feito, sem nomear a marca (§9.6).
- Os números vêm da fonte canônica, cada um com o que mede e quando foi apurado (§9.5).

### 7.6 Contato — `/contato`, bege `#F8E4C1`

**Quatro seções:** `01 Abertura` · `02 Dúvidas` · `03 Caminhos` · `04 Mensagem`.

A abertura é **coluna única**, como as outras cinco: rótulo, H1 (`.scw-h1` cheio, sem
teto próprio de medida — é o 17ch que faz o título quebrar em duas linhas), lead e as
duas ações. ⛔ A coluna de apoio à direita, com a nota "a central reúne N respostas",
**saiu em 20/08/2026**: dizia em nota o que a seção 02 logo abaixo mostra inteiro.

⛔ **A regra antiga "Contato é página simples, SEM hero" está superada** — a página abre
com herói compacto e banda de foto no mobile.

**Central de dúvidas: 93 perguntas em 10 assuntos** — Sobre o festival 9 · Edição atual 7
· Combos 10 · Atendimento 10 · Ingredientes e acessibilidade 7 · Rota da Doçura 9 · Sweet
Awards 13 · Participação 13 · Parcerias 8 · Suporte 7. **Fonte única das perguntas:
`src/data/faqCentral.js`** (import default em `Contato.jsx`).

⚠️ **`src/data/contactFaq.js` NÃO está morto** — conferido no código em 07/08/2026. Ele
exporta `FAQ_CATEGORIES`, `FAQ_ITEMS` e **`CONTACT_SUBJECTS`**, e é o `CONTACT_SUBJECTS`
que alimenta a triagem do formulário, importado por `Contato.jsx` e por
`src/lib/contactRequest.js`. **São duas coisas diferentes que a documentação antiga
confundia:** `faqCentral.js` são as 93 perguntas; `contactFaq.js` são os assuntos do
formulário. **Não remover.** O que sobra dele — `FAQ_CATEGORIES` e `FAQ_ITEMS`, a lista
de perguntas antiga — é que está morto, e some quando alguém confirmar que ninguém
importa esses dois nomes.

- Índice editorial à esquerda (linhas com filete, contagem à direita, ativo por peso +
  sublinhado de 2px na cor da página) e busca como linha com traço inferior.
- **No mobile o índice vira chips roláveis** — `flex: 0 0 auto` **obrigatório** no `<li>`,
  senão os chips colapsam.
- A busca **ignora acentos e maiúsculas, casa múltiplos termos e muda o filtro para
  "Todas" automaticamente**.
- Cada pergunta é `h3 > button` com `aria-expanded`/`aria-controls`, painel
  `role="region"`. Schema `FAQPage` gerado da mesma fonte de dados.
- Os campos `mapa`, `regulamentoRota`, `regulamentoAwards`, `areaAvaliacao`, `imprensa` e
  `pressKit` estão `null`. **Isso não é bug:** quando `null`, o link não aparece;
  preencher faz o link surgir sozinho. **Mapa, rota e avaliação pertencem à camada de
  edição e ficam `null` até a próxima edição existir.**

**O bloco "Edição atual" é reescrito para o estado entre-edições.** As perguntas que
apontavam para mapa, regulamento e área de avaliação passam a **explicar como funciona**,
sem prometer link que não existe.

### 7.7 Em breve — `/em-breve`

Landing própria. É o gate de publicação (`COMING_SOON_PUBLICATION`) e **é a única página
servida por `motion-system.css` + `useRevealOnScroll.js`.** ⛔ Não tocar sem pedido
explícito — é o que está no ar.

**Desde 25/08/2026 ela é a chamada do pré-cadastro**, e não mais "aviso de novo site + o
Sweet Awards da Lovers". Oito blocos, rolagem curta, **uma ação só — `Quero participar`
→ `/quero-participar/`**.

⛔ **Desde 25/08/2026 essa ação existe em UM lugar só: a barra presa na base** (pedido do
Eloi). Os três botões que moravam no herói, no fim dos passos e no fecho **saíram**, e a
barra deixou de ser peça de celular para valer em **toda largura**. **Não devolver botão
para dentro das seções**: a página tem uma conversão só, e espalhá-la de novo é a mesma
troca que já foi desfeita — o leitor reencontrar a ação três vezes em vez de ela nunca
sair da tela.

**A barra é a mesma casca da barra de abas do site** (`.scw-casca-base`, §6.10) — chapa
translúcida com desfoque, filete de creme e o mesmo ritmo vertical de 8px. Foi pedido do
Eloi: *"faz tipo como é o menu mobile, integrado, animado"*.

| Peça da barra | Regra |
|---|---|
| Chapa | `.scw-casca-base` — **não** redeclarar cor, desfoque nem `position` aqui |
| Indicador de 3px | é a peça da barra de abas, com **sentido próprio**: lá diz *onde* você está entre cinco destinos, aqui *quanto* da página já leu. `scaleX`, origem à esquerda, **sem transição** (§10.3) |
| Nota "Dois passos rápidos…" | acompanha o botão acima de 760px; **sai** abaixo, onde cada linha a mais é viewport a menos. A informação reaparece dentro do próprio `/quero-participar/`, que numera os passos na tela |
| Botão | `.eb-barra__btn`, tinta **prefixada** em chocolate (§10.1) |
| Altura | `--eb-barra-h`, escrito **no `body`** por `ResizeObserver` |

⛔ **O botão NÃO estica no celular.** Esticado ele vira uma lâmina amarela de ponta a
ponta, e a barra deixa de ler como casca de aplicativo — a barra de abas é **escura com
acentos contidos**, e é com ela que esta peça conversa. Na largura do conteúdo o alvo
ainda passa de 200px, muito acima dos 44px do §6.10.

✅ **A landing entrou no reset do sistema em 25/08/2026, e as duas exclusões caíram.**
Até então `scw-2026.css` a mantinha fora do `box-sizing: border-box` **e** do
`body { margin: 0 }`, por `body:not(.route-em-breve)`. A ressalva foi escrita quando a
página era a de antes — "calibrada em content-box e no ar" —, e a reescrita de 25/08 a
levou para as utilitárias do sistema: a partir dali a exclusão deixou de proteger e passou
a custar. **Não existe mais rota fora do reset**, e ⛔ não se redeclara `box-sizing` dentro
da landing: seria a segunda fonte de verdade do §5.2.

O que a exclusão custava, medido antes e depois nas três larguras:

| Sintoma | Antes | Depois |
|---|---|---|
| `.scw-btn` da barra | **84px** (54 de `min-height` + 30 de padding por cima) | **54px** |
| Controles da galeria | 51px (48 de caixa + 1,5 de borda dos dois lados) | 48px |
| Posição da página | `x = 8`, **16px mais estreita que a viewport** (374 de 390; 1424 de 1440) | `x = 0`, largura cheia |
| Faixas que sangram | uma tira do fundo do `<body>` descendo pelos dois lados | sem tira |
| Barra fixa da ação | 16px **mais larga** que a página (ela se posiciona contra a viewport, não contra o body) | do mesmo tamanho |

⚠️ **A faixa do topo encolheu junto, e isso é a zona de segurança do §6.7** — com
`border-box`, o `min-height` dela passa a **conter** o padding: 132 → 104px no desktop,
104 → 86px no celular. A folga entre o botão "Acesso" e o selo do herói caiu de 78 para
**52px** e continua sobrando. Ao mexer em `.eb-topo`, medir de novo.

⚠️ **O separador do rodapé é um VÃO DE FLEX, não um "·".** O caractere órfa nas duas
pontas e não existe posição que resolva: preso ao texto, a primeira linha terminava nele;
movido para dentro do link, a segunda linha passava a **começar** com ele. O link é
`inline-flex` com 44px de alvo (§10.2), então quebra cedo e a quebra sempre cai ali. O
"·" que é conteúdo continua dentro de "Week · Natal/RN".

⚠️ **O convite é FINITO, e isso é regra, não economia.** A página já tem dois laços
contínuos — o marquee e o gradiente dele —, que é o teto do §6.15. Um pulso permanente na
barra seria o terceiro, e ainda por cima **um que ninguém pode pausar**: diferente da
galeria, não há como parar um botão que pisca. O gesto dispara em **dois momentos e
para** — quando a barra chega, e quando o leitor alcança o fecho, que é onde ele decide.
Voltar ao fecho **não** redispara: insistir deixa de ser convite e vira cutucão.

⚠️ **A altura da barra se MEDE, não se calcula** — é o §10.4-b outra vez. O palpite
"padding + botão" deu 70px; o botão real tem **84px**, e a barra cobria 31px do rodapé e
se sobrepunha ao aviso de cookies **nas três larguras**. Quem escreve `--eb-barra-h` é o
próprio elemento, por `ResizeObserver`, e reescreve quando a fonte carrega, quando a tela
gira e quando a nota entra ou sai no ponto de 760px.

⚠️ **O token mora no `body`, não em `.eb-page`** — quem também precisa dele é o aviso de
cookies, que é peça de casca (§6.10), **irmã** desta página e não filha dela. Ele sobe a
altura da barra: banner de consentimento por cima da única conversão é as duas coisas
piores ao mesmo tempo — esconde a ação e faz o aviso legal parecer estorvo. A regra é
**escopada na rota**, porque o mesmo banner serve as sete e só esta tem barra fixa.

| Bloco | O que é |
|---|---|
| Topo | faixa chocolate com `MARCA_SCW`. O botão "Acesso" **não mora aqui** — vem do `<SiteHeader apenasAcesso>` do `App.jsx` |
| Herói | **grade de duas colunas**: rótulo + H1 + lead + ação à esquerda, a **galeria das 16 edições** à direita |
| Prova | 16 edições · +R$ 712 mil movimentação direta · +34 mil combos · desde 2016 — cada um com ícone. "+120 marcas" saiu em 26/08/2026 (pedido do Eloi): contagem de marca é número pequeno e gera dúvida; entrou o dado comercial (`F.revenue`, mesma fonte de §9.5 e de Apoiar 02), não redigitado |
| Marquee | os 16 temas, em `.scw-marquee` |
| Para quem é | os dez tipos de casa + os três chips do combo (doce · salgado · café) |
| Como funciona | três passos + a ação |
| Fecho | chapa chocolate, a ação e a linha do Instagram |
| Rodapé | **creme**, com a marca da F2 |

#### A galeria das 16 edições — herói reescrito em 25/08/2026

O herói **deixou de ter foto de fundo com texto por cima**. A grade
`repeat(auto-fit, minmax(min(100%,400px), 1fr))` colapsa sozinha, **sem media
query**, e por isso saíram junto: o véu diagonal, os tokens `--hv-*`, a emenda
de três paradas do celular, o `@media (max-width:1000px)` inteiro do herói e a
respiração de 26s (`ebRespira`) — a galeria tem movimento próprio e as duas
competiriam. ⛔ Não recriar nenhum deles: não há mais texto sobre foto, então
não há o que velar.

Quadro 1:1, 16 slides em `flex`, deslocados por **um custom property só**
(`--eb-i`) em vez de dezesseis regras. Cada slide traz foto, véu de **cinco
paradas**, marca da edição, pílula do rótulo e legenda com o vencedor do Melhor
Combo.

⚠️ **A pausa não é conforto, é requisito.** WCAG 2.2.2: movimento automático
acima de 5s que carrega informação tem de ser pausável. Ela para por mouse, por
foco e pelo botão, e **nunca liga** com `prefers-reduced-motion`. É também o que
impede a galeria de ser o **terceiro laço contínuo** da página, acima do teto de
dois (o marquee e o gradiente dele).

⚠️ **O ouvinte de mouse e foco fica no INVÓLUCRO, não no quadro.** O quadro não
tem nada focável dentro — os três botões moram nos controles, abaixo dele —,
então `onFocus` no quadro nunca dispararia e a pausa por teclado seria letra
morta.

⚠️ **A região viva anuncia só a troca MANUAL.** Um `aria-live` disparando a cada
5,2s, para sempre, interromperia a leitura de quem usa leitor de tela a cada
cinco segundos. Os 15 slides fora de vista são `aria-hidden`.

⛔ **Contorno claro no `drop-shadow` da marca, NUNCA chapa atrás dela** — a chapa
foi desenhada, mostrada e recusada. São 16 marcas de cores arbitrárias sobre
fotografia arbitrária, e o caso que quebra é escuro-sobre-escuro (a marca vinho
de Séries sobre uma cortina vinho). ⛔ **Escurecer o véu piora esse caso.**

⚠️ **A prova usa `repeat(4,1fr)` + `repeat(2,1fr)` abaixo de 900px, não
auto-fit.** Qualquer auto-fit desce de 4 para **3** antes de chegar a 2, e o
quarto item fica órfão com dois vãos ao lado — inclusive com o piso de 140px que
o handoff propunha. E **"desde 2016" é palavra, não numeral**: tem escala própria
(`clamp(30px,3.2vw,54px)`) e pode quebrar em duas linhas; na escala dos outros
três ela estoura a coluna e some no `overflow-x: clip`, sem barra que denuncie.

⚠️ **A barra final de `/quero-participar/` não é enfeite** (§10.4-b), e é `<a href>` de
navegador — nunca `navigate()`, nunca `#/`.

🐛 **`editionPhotos()` devolve OBJETO — `{src, alt, position, indice}` —, não
caminho.** Tratá-lo como string produz `url([object Object])`, e o **fallback do
SPA responde 200 com o index.html**: nenhum 404, nenhum erro de console, e a foto
simplesmente não aparece. Custou uma rodada inteira de teste verde com a galeria
em branco. **Status 200 não prova que o asset existe** — a checagem que vale é o
`content-type` da resposta e o `naturalWidth` depois do `onload`. O `alt` e o
ponto focal saem do mesmo objeto: escrever descrição de foto que ninguém viu
seria dado inventado por outro meio (A4).

⚠️ **Não usar backtick dentro do `<style>{\`…\`}`** da página. O CSS mora num
template literal; um backtick num comentário fecha a string e o build morre em
"Expected } but found …", com a linha apontando para o comentário, não para a
causa.

⚠️ **O rodapé é creme, e é decisão de contraste, não de gosto:** a logo da F2 é asset de
cor fixa (`#de1a59`) e sobre chocolate não fecha os 3:1 de elemento gráfico. Sobre creme
fecha. ⛔ Não devolver o rodapé para chocolate sem trocar o asset.

⚠️ **A página saiu da terceira paleta do projeto.** Ela consumia os tokens de
`em-breve.css` — espresso `#2B1810` + ouro `#F8B511`, a identidade do Sweet Awards de
antes do redesign — e agora consome a **paleta viva** (`--scw-*`) e as utilitárias do
sistema. ⛔ `em-breve.css` **continua no ar**: `icons.jsx` e `participants.js` ainda leem
tokens dele (§4.3).

⚠️ **A iconografia v2 entrou, mas ESTÁTICA — e é decisão, não esquecimento.** O
handoff de agosto/2026 pedia ícones que se montam peça por peça, com as props
`movimento`/`aoVivo`/`receita` do `ScwIcon`, as classes `.scw-icone-host--*` e os
tokens `--icon-mo-hover`/`--icon-ease-soft`. **Nada disso existe no repositório:**
o `PATCH-icones-animados.md` que os cria nunca foi aplicado, e a receita "recortar
o `d` em três `path`" exigiria editar `scw-icons-v2.js` à mão, que o §6.11 proíbe.
Os ícones entram pelo `ScwIcon` como está; o movimento fica com o sistema que a
página já tem (`motion-stagger` / `motion-reveal-up`).

⚠️ **Os tamanhos do handoff (18 · 28 · 30 · 34 · 44) NÃO estão na escala** do
§6.11, e `tests/regua-visual.mjs` reprova. Foram encaixados nos degraus reais:
seta de botão e controles **20**, chip **24**, prova e fecho **32**, disco de
passo **48** (os 60% de um disco de 80px, a proporção do §6.3).

⚠️ **A logo da F2 do rodapé NÃO foi trocada, e o handoff estava errado ali.** Ele
afirma que `logo-f2experience.svg` é um lockup claro `#F5F5F5` a 1,06:1; os dois
arquivos em `public/images/` são `#de1a59` na regra `.cls-1`. Só a altura mudou,
de 20px para 24px. É o §12.6 na prática: premissa de patch se confere contra o
código antes de aplicar.

⛔ **O bloco do Sweet Awards saiu, e é remoção de EXIBIÇÃO, não de dado.**
`sweetHistoryStats.js`, `loversAwardsResults.js` e as fotos seguem intactos — só
deixaram de ser importados ali. **Consequência a não esquecer: o resultado oficial da
Lovers deixou de ter endereço público** até o institucional ir ao ar.

---

