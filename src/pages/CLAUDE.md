<!-- Parte das regras do projeto. Índice e regras absolutas: CLAUDE.md da raiz. Movido sem reescrita em 03/10/2026. -->

## 7 · As páginas

### 7.1 Home / O Festival — `/`, amarelo `#FDBB1A`

⛔ **Não alterar sem solicitação explícita.** É a página-mãe: as demais usam a Home como
referência de margem, largura máxima, respiro, hierarquia, ritmo, nível de acabamento e
tom institucional-afetivo. Extrair componente ou constante é permitido **desde que não
mude o comportamento visual** — validar idêntico.

**Reequilibrada em 12/10/2026** (pedido do Wilker): a Home **apresenta o festival o
ano inteiro**; quando houver lançamento autorizado, a edição assume a abertura e o resto
segue igual. A reconstrução de 28/09/2026 abria anunciando a edição de novembro com o
pré-cadastro — isso saiu da abertura e virou uma linha na porta de Participar (06).

**Onde mora:** `src/pages/home/` — `index.jsx` monta as seções na ordem abaixo; uma
seção por arquivo em `secoes/`; `useHome.js` (destaque dos títulos) e
`TituloDestaque.jsx`. Texto editorial em `src/data/conteudo/home.js`; CSS em
`scw-home.css`. Fotos: `heroPhotos('home')` e `fotosHome(chave)` de `imageLibrary.js`.
Dado: `festivalFacts`, `proximaEdicao.js`, `AWARDS_DADOS`.

**Sete seções:** `01 Abertura` · `02 Como funciona` · `03 Em registros` ·
`04 Trajetória` · `05 Sweet Awards` · `06 Faça parte` · `07 Realização` (F2).

- **01 Abertura (`secoes/Abertura.jsx`, `.hm-abre`)** — dois modos, **uma decisão só:
  `destaqueValido()`** de `src/data/destaqueEdicao.js`. Nunca decidir por `ativo`
  direto: um campo faltando abriria bloco vazio. A classe `.hm-abre` fica nos dois
  modos — `scw-motion.css` coreografa por ela. Altura do conteúdo, não de tela: a seção
  seguinte aparece na primeira dobra do desktop.
  - **Sem destaque válido (`ativo: false`, ou campo faltando):** apresentação do
    festival. Texto à esquerda: rótulo, H1 ("O festival dos *combos autorais* de
    Natal."), lead, duas ações (**"Explorar as edições"** → `/edicoes`; **"Como
    funciona"** rola até `#festival`) e uma ficha de até três linhas (edições desde o
    primeiro ano · marcas · "Próxima edição" **só se `proximaEdicao.js` tiver o mês**).
    Fotos à direita: **pessoas** em crossfade (`useCrossfade`, 6,2s) com um **combo** em
    recorte redondo sobreposto, trocando juntos, e o botão `PausaFotos` quando há
    rotação. Sem movimento, uma camada só.
  - **Com destaque válido (o estado de hoje — ligado em 13/10/2026, autorização do
    Wilker para tema Cartoon e datas 5 a 15 de novembro):** `.hm-abre--edicao`, composição
    própria de anúncio. Rótulo "Próxima edição · 2026" → H1 com "Sweet & Coffee Week" e o
    **lettering oficial CARTOON** (`marcas-edicoes/2026.2/tema.webp`, do PNG da marca
    aprovada no Dropbox F2; `alt="Cartoon"`, então o nome acessível do H1 é "Sweet & Coffee
    Week Cartoon") → **período em amarelo** → uma frase → ações (**"Quero participar"** →
    `/quero-participar/` só enquanto o pré-cadastro estiver aberto; **"Conhecer o
    festival"** rola até `#festival`). Sem ficha de números nem selo. Tema, período e ano
    vêm de `proximaEdicao.js`. **Só peças da edição nova — nenhuma foto de edição anterior**
    (pedido do Wilker, 13/10/2026):
    - **fundo** ilustrado gerado no Magnific (Nano Banana Pro, dois quadros do vídeo de
      lançamento como referência de estilo; original no Dropbox em
      `05_SITE/02_ASSETS/fundo-heroi-home_magnific_v1.png`). Chapa amarela, tinta
      chocolate; a **data vira chapa chocolate com amarelo** (amarelo em texto sumiria);
    - **vídeo de lançamento** (versão sem "Natal e região", a que está no Instagram) em
      cartão vertical 9:16 com contorno e sombra chapada, `public/videos/edicao-2026-2/
      lancamento.mp4` (720×1280, ~9,7 MB), **`preload="none"`, sem autoplay**, controles
      nativos — só baixa quando a pessoa dá o play;
    - botão **"Ver no Instagram"** (ícone `redes/instagram`, 24px) para o reel oficial,
      em nova aba, link sem parâmetro de rastreio (`REEL_LANCAMENTO` em `destaqueEdicao.js`).
    Desktop: coluna do vídeo presa ao topo do texto e tela com teto `48svh`, para o botão
    do Instagram ficar acima do aviso de cookies (que mora no canto inferior direito).
    Celular: texto primeiro sobre a área calma do fundo; o vídeo vem depois das ações num
    painel arredondado com a parte dos raios do mesmo fundo. O KV fica só nesta abertura;
    sem o arquivo da marca, o tema sai em tipografia (`.hm-ed__tema--texto`).
  ⚠️ **As fotos de pessoas são todas da Lovers (2026.1) e a legenda diz isso**
  ("Registros da edição Lovers · 2026 · combo …"). Ficam de fora de propósito:
  fantasias (Heróis & Vilões), personagens de desenho ou de contos (Padoca do Bosque, a
  luva do Mickey em `2023/04`) e a faixa do Sebrae (§9.6) — qualquer uma seria lida como
  pista do tema da próxima edição (anunciado em 13/10/2026, mas só a abertura de edição
  fala dele).
  Celular (<1000px): foto no topo, largura cheia, **16:10** (16:9 até 420px; 2:1 entre
  600 e 999px; teto `44svh`) — não o quadrado do §6.9, para título, lead e ação caberem
  acima do aviso de cookies na primeira visita.
- **02 Como funciona (`ComoFunciona.jsx`, `#festival`)** — texto, anatomia do combo e
  três laços (para as casas · para o público · para Natal) à esquerda; um combo completo
  à direita. A anatomia continua como era: ⛔ **sempre em UMA LINHA, inclusive no
  celular** (pedido do Eloi, 22/08/2026), escala por `--ing-disco`/`--ing-mais`, quatro
  desenhos por ingrediente em 8,8s (`scwIcnCiclo`, arte em `anatomia-combo.js`, fora de
  `scw-icons-v2.js`), só o primeiro com `prefers-reduced-motion`. **Não empilhar de
  novo.**
  ⚠️ O texto não diz "onze dias" nem "preço único": são fatos das edições passadas que
  soariam como regra da próxima, e duração e valor dela são `null`.
- **03 Em registros (`Registros.jsx`, chocolate)** — mosaico de seis fotos reais de
  edições passadas (`fotosHome('mosaico')`), cada legenda dizendo de onde é o registro,
  e a voz de uma casa participante sempre identificada (pessoa + marca: Carol Barreto,
  Jolie Café Pâtisserie), com a foto da equipe (`fotosHome('jolie')`) e o link para os
  depoimentos em vídeo. **Sem laço, sem autoplay**: a entrada é a do motor, item a
  item. ⛔ A fita automática (`GaleriaCarrossel`/`.hm-fita`) **saiu** em 28/09/2026 e
  não volta.
- **04 Trajetória (`Trajetoria.jsx`, bege)** — quatro números (participações · combos
  vendidos · movimento nas casas · visualizações), contados uma vez ao entrar, **cada um
  com o que mede** (`festivalFacts.*.mede`) e os comerciais com a data em que foram
  apurados; a porta para Edições na cor do destino (laranja), com quatro fotos
  (`fotosHome('edicoes')`); e a imprensa — uma matéria em destaque, quatro na lista e
  "ver todas".
- **05 Sweet Awards (`Reconhecimento.jsx`, chapa roxa — cor do destino)** — foto de uma
  entrega real (`fotosHome('premio')`), quem dá a nota (premiação desde 2019; só Sweet
  Lovers desde 2022), o total de prêmios entregues (271, `estatisticas()` de `sweet-awards/consulta.js` sobre `AWARDS_DADOS` — a mesma conta do herói do Awards, nunca digitado) e
  a ação "Ver o Sweet Awards".
- **06 Faça parte (`FacaParte.jsx`, creme)** — duas portas curtas na cor do destino:
  **casas → Participar (cyan)** e **empresas → Apoiar (marrom)**; embaixo, a linha
  "Outra dúvida?" para o Contato. **O pré-cadastro mora aqui, como linha da porta de
  Participar:** "Próxima edição · <período ou mês> · pré-cadastro aberto", a nota de
  curadoria e o botão "Fazer pré-cadastro" (`<a href>` com barra final, §10.4-b) — e
  **só aparecem quando `proximaEdicao.js` traz `status: 'pre-cadastro'` e o endereço**.
  Outro status some com a linha.
- **07 Realização (`Realizacao.jsx`)** — KV da F2 Experience, a exceção declarada de
  paleta e fonte (§6.1).
- ⛔ **Saíram:** a faixa de palavras (`Marquee`), as Rotas, o Ciclo de quatro etapas, o
  cartão "preço único" (28/09/2026); a chapa cyan "Como participar", "Por que
  participar" e o convite marrom "Apoio" como seções próprias (12/10/2026 — o conteúdo
  válido foi redistribuído: depoimento em 03, números em 04, portas em 06).

> **Alvo do plano institucional:** a Home passa a ter oito seções, com "O festival
> transforma Natal" e "Os temas de todas as edições" ganhando bloco próprio. Ver
> `acervo/plano-site-institucional.md`. **Isso é plano, não estado — e depende de pedido
> explícito para ser executado (A6).**

### 7.2 Edições — `/edicoes`, laranja `#FF4810`

Experiência de tela cheia: apresentação editorial photo-first da história do festival.
**16 cenas, uma por edição.**

**Onde mora (12/10/2026):** `src/pages/edicoes/` — `index.jsx` escolhe a montagem
(desktop × celular); `useEdicoes.js` guarda estado e comportamento (cena em foco,
painel aberto, teclado, arraste, aquecimento das vizinhas); `teclado.js` decide quando
uma tecla troca de edição; `icones.jsx` tem os glifos de controle. Peças em `secoes/`:
desktop = `CabecalhoDesktop` · `Galeria` (mosaico) · `ColunaDesktop` ·
`PaineisDesktop` · `RodapeDesktop`; celular = `CapaMobile` · `Galeria` (pares) ·
`CorpoMobile` · `ReguaMobile`; comuns = `DadosEdicao`, `Editorial`, `SetaEdicao`. Texto
de interface, identidade das cenas (etapa, ícone) e os tons em
`src/data/conteudo/edicoes.js`; CSS em `scw-edicoes.css`.

Em Edições o `App.jsx` **não renderiza** o cabeçalho do site nem o rodapé: a página tem
**cabeçalho próprio com a mesma geometria** — mesmo `--scw-trilho`, mesmo padding vertical
de 50px, marca da edição no slot da logo. **O menu não muda de lugar entre páginas.** A
barra de abas mobile continua montada por fora.

**Desktop (>900px):** cena de `100dvh`. Metade direita com **mosaico de 3 fotos** sangrando
(uma larga em cima, duas embaixo, filete de 3px) — a galeria da edição, paginada de 3 em
3. Metade esquerda (`ColunaDesktop`): **identificação junto do título** — selo (ícone +
etapa) e, na mesma linha, o ano e a posição na linha do tempo —, depois tema (`<h1>`),
frase, ficha (período / marcas / Sweet Awards) e dois botões que abrem painéis
flutuantes de participantes e de texto editorial (Esc fecha; o foco volta ao gatilho).
O texto ao lado da marca no cabeçalho (tema + "2016 · edição 01") **saiu em
12/10/2026**: a identificação mora na coluna. Fundo: a **última** foto do acervo com
`blur(64px)` sob véu chocolate a 87%, com deriva lenta de 46s — a primeira já abre o
mosaico, então não aparece duas vezes. Rodapé (`RodapeDesktop`): `seta · anos · seta`,
progresso e a legenda (edição em foco + "← → trocam de edição · clique num ano ou
arraste a cena"). ⛔ Saíram do rodapé (12/10/2026) os três laços sem pausa: o brilho que
varria o trilho, o anel que pulsava no cursor e o empurrão da seta "próxima".

**Celular (≤900px):** capítulo vertical. Capa 4:5 (`CapaMobile`) com a marca da edição
no alto e, no canto, **o ano e "edição N/16"** (antes só "01/16"); etapa e tema (`<h1>`)
embaixo. Depois a galeria em pares 1:1 (a capa é a 1ª foto, nada se repete), frase,
ficha, palavras do tema e duas sanfonas (marcas e texto editorial) que abrem no lugar.
Navegação em **uma peça só**: a régua de anos fixa na base, com as setas dentro.

**Controles nomeados (12/10/2026).** A seta de passar edição é uma peça só
(`SetaEdicao`), no rodapé e na régua: **o nome da edição de destino** ("Próxima: Páscoa
· 2017.1") é o nome acessível **e** aparece no hover/foco (`.scw-icone-rotulo`, §6.11).
Sem destino, "Esta é a primeira/última edição" e `disabled`.

**Teclado em contexto (`teclado.js`, testado em `tests/edicoes-teclado.test.mjs`).** A
página escuta a janela inteira, então ←/→ **só trocam de edição quando a tecla é dela**.
Não troca: com modificador (Alt+← é "voltar"), evento já tratado ou composição de IME,
foco em campo/select/editável, foco em diálogo ou com modal aberto, e foco numa região
com `data-teclas-proprias` — a galeria usa ←/→/Home/End para FOTOS e o painel de texto
usa as mesmas teclas para rolar (lá só o Esc é da página). O mesmo atributo tira a
região do arraste que troca de edição. No celular PageUp/PageDown/Home/End continuam
rolando a página; só ←/→ trocam.

**Tons por edição (`TONS` em `conteudo/edicoes.js`):** roxo · **laranja** · cyan ·
amarelo, rodando pelas cenas, cada um com a tinta que passa sobre ele. ⚠️ **O segundo tom
era magenta até 12/10/2026** — creme sobre magenta dá 3,8:1 e reprovava no texto pequeno
da pill, do botão e da sanfona (§6.3). Entrou o laranja da própria página (chocolate
sobre ele 4,78:1). Roxo sobre chocolate dá 1,45:1, por isso o texto dele cai no creme.

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

**Selo da cena (só no desktop, na coluna):** disco de 54px (`.scw-edx__cena-disco`) com
**um ícone por edição**, no tom da cena, ao lado da pill da etapa, dentro de
`.scw-edx__cena-selo`. O ícone é o campo `icone` de cada cena em
`src/data/conteudo/edicoes.js` (o antigo `ICONE_EDICAO` de `Edicoes.jsx` saiu com a
reorganização). ⚠️ A classe é `.scw-edx__cena-selo`, **não** `.scw-edx__marca`: essa
última já é a marca da edição no cabeçalho, e o nome colide.

**Dados:** `src/data/handoff/edicoesData.js`, derivado de `sweetCoffeeHistory.js`; fotos
por `editionPhotos()`, marca por `editionMark()`, texto longo de `edicoesNarrativa.js`.
**Performance:** **só a cena em foco existe no DOM**; as três primeiras fotos das cenas
vizinhas (±1) são aquecidas no cache, sem nó no DOM (§10.3). A janela `live/near ±1-2`
saiu.

**Galeria da edição (`Galeria.jsx`)** — o acervo inteiro da edição (11–12 fotos), em
páginas de 3 (mosaico) ou 2 (pares); a última página é ancorada no fim, sem buraco.
⛔ **Sem giro automático desde 12/10/2026:** a troca de 6s saiu — foto que troca sozinha é
conteúdo que alguém perde (§6.15, §6.16) e, sem pausa visível, descumpria a WCAG 2.2.2.
Só anda por escolha: setas ("Fotos anteriores/Próximas fotos desta edição"), teclado e
arraste. A barra (`.scw-gal__barra`) é **`seta · contador · seta` — três
peças, nada mais.** ⛔ **Não reintroduzir** pontos, rótulo `Fotos · <ano>` nem "N de N"
por extenso. As duas variantes (`--mosaico` no desktop, `--par` no celular) usam o
**mesmo** flex. Se voltar a precisar de layouts diferentes, é sinal de que peça a mais
entrou. O que **não** se mexe ao simplificar: as setas de 44px e o teclado ←/→/Home/End.

O numeral da edição é sempre `#FEF0DD` — o vinho sobre foto dava 2,08:1.

**Não usar:** stickers; grade comum de cards; `backdrop-filter` sobre o trilho animado. A
navegação das edições parece **controle de apresentação**, não segunda navbar — não pode
brigar com o menu.

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

**Ordem real (`index.jsx`):** `01 Abertura` · faixa de palavras (`Marquee` — a única que
resta no institucional, §6.15) · `Índice` · `02 Resultados 2026.1` · `03 Quem dá a nota`
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

### 7.4 Participar — `/participar`, cyan `#01AFCC`

Segue a lógica visual da Home. Precisa de: proposta clara; fotos quando disponíveis;
**depoimentos**; **formulário em destaque**; linguagem voltada a participantes; visual
editorial e comercial. **Não parecer formulário genérico.**

⚠️ **É a única página pública hoje:** `PARTICIPAR_ONLY_PUBLICATION` faz o domínio
inteiro abrir nela (flag em `src/App.jsx`, não mexer — A3).

**Onde mora (12/10/2026):** `src/pages/participar/` — `index.jsx` monta a jornada; uma
seção por arquivo em `secoes/`; `comum.jsx` guarda as peças que Participar e Apoiar
dividem (`HeroPa`, `Cabeca`, `Destaque`, `BarraAcao`, `irPara`). Texto em
`src/data/conteudo/participar.js`; CSS em `scw-participar-apoiar.css` (prefixo `.pa-`,
o mesmo de Apoiar).

**Jornada em seis seções (12/10/2026):** `01 Abertura` (herói cyan) · `02 Depoimentos`
· `03 Para quem é e como funciona` (bege) · `04 O que a participação oferece` (creme) ·
`05 Depois do pré-cadastro` (chocolate) · `06 Próximo passo` (creme), mais a barra fixa
de ação. ⛔ **A faixa de palavras (`Marquee`) saiu em 12/10/2026:** repetia o que a
página já diz e era laço contínuo sem pausa, como a Home decidiu em 28/09. ⛔ A seção
própria `04 Números` virou a escala dentro da 04; `05 Como funciona` virou
`05 Depois do pré-cadastro`; os três passos da edição foram para a 03.
Histórico: `04 Circulação`, `05 Quem pode`, `06 Imprensa` e `07 Jornada` saíram em
26/08/2026; a página foi refeita em 18/09/2026 (pedido do Wilke: *"visual genérico"*),
quando entraram o mosaico de ganhos e a trilha de passos.

- **01 Abertura (`Abertura.jsx`)** — título **"Sua marca na *próxima edição.*"**
  (destaque roxo, 4,25:1, texto grande), encurtado em 12/10/2026: a frase antiga juntava
  anúncio e pré-cadastro e quebrava em cinco linhas no celular, empurrando a ação para
  baixo do aviso de cookies. A edição aparece no lead, vinda de `proximaEdicao.js`:
  desde 13/10/2026 "a edição Cartoon, de 5 a 15 de novembro" (sem tema e período, só o
  mês). A linha a mais levou a foto do herói a **16:10 abaixo de 380px**.
  Duas ações: **"Fazer pré-cadastro"** e **"Ver como funciona"** (rola até
  `#como-funciona` e leva o foco). Fotos em crossfade por `HeroFotos` (§6.9).
- **03 Para quem é e como funciona (`ParaQuem.jsx`, `#como-funciona`)** — uma seção,
  duas colunas: à esquerda quem cabe na edição (os tipos de casa em frase corrida, onde,
  e a regra para marca sem loja física); à direita "Como a edição funciona" em três
  passos (um tema por edição · um combo inédito · os dias de festival).
- **04 O que a participação oferece (`Oferece.jsx`, `#ganhos`)** — mosaico fotográfico
  (`.pa-ganhos`) e, embaixo, a escala "Dez anos em números". Eram duas seções com duas
  cabeças; viraram uma: os números são a prova do que o mosaico afirma. Mosaico: superfície
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
- **05 Depois do pré-cadastro (`Depois.jsx`)** — título "Do pré-cadastro *à estreia do
  combo.*"; trilha de cinco passos sobre chocolate (`.pa-passos`): pré-cadastro ·
  curadoria · aprovação e painel · combo aprovado · a edição acontece. O apoio da cabeça
  é o que não pode se perder: **pré-cadastro não é vaga**. Só passos que existem de fato. Nó numerado na cor do ciclo filtrada pelo chocolate
  (amarelo · cyan · magenta · laranja · creme). **A espinha é desenhada por passo**,
  não por uma linha só no contêiner: a mesma regra serve em coluna (até 999px) e em
  linha (a partir de 1000), sem conta de onde fica o último nó.
  ⚠️ **Não confundir com a `02 Como funciona` da Home:** lá é o que é o combo e como a
  edição acontece; aqui é o caminho da casa até a edição, sem foto.

- Herói = H1 + lead + **duas ações, nada mais**. No celular a foto continua, na
  `.scw-hero-banda` em 4:3 (2:1 entre 600 e 1000px — §6.9).
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
- **A escala da 04 tem quatro dados** (movimentação direta · combos vendidos · anos ·
  edições, com a nota de quando os históricos foram apurados) → `.pa-numeros--quatro`:
  **1 → 2 (560px) → 4 (1280px) colunas, nunca 3** (a base `.pa-numeros` limita a 3).
  Card chapado, uma cor por dado. O numeral é `nowrap`, então o teto dele segue a largura
  do card (`cqi` na grade, nunca no `<li>`) — §10.5.
- **Uma ação, um rótulo:** herói, CTA da 06 e barra fixa ("Inscrições passam por
  curadoria.") dizem todos **"Fazer pré-cadastro"**. O botão da 06 usa a cor do destino (`.scw-btn--pagina`,
  cyan) com anel chocolate de 2px, porque cyan sobre o card bege não fecha 3:1.
  ⚠️ **Os três levam DIRETO ao formulário `/quero-participar/`** (18/09/2026, pedido
  do Wilke). Até então o do herói e o da barra fixa só rolavam até a seção 06 — um
  clique a mais entre a decisão e o formulário. `<a href>` com a barra final,
  nunca `navigate()` (§10.4-b).

- **06 Próximo passo (`ProximoPasso.jsx`, `#pre-cadastro`) NÃO tem formulário**
  (22/08/2026, pedido do Eloi). Título "Comece a *jornada da sua marca.*"; a seção é uma
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

**Onde mora (12/10/2026):** `src/pages/apoiar/` — `index.jsx` monta as seções; uma por
arquivo em `secoes/`; `usePropostaApoio.js` guarda o estado do formulário. Peças
comuns (herói, cabeça, barra fixa, `irPara`) vêm de `src/pages/participar/comum.jsx`;
CSS é o mesmo de Participar (`scw-participar-apoiar.css`). Texto em
`src/data/conteudo/apoiar.js`.

**Cinco seções (12/10/2026):** `01 Abertura` · `02 Alcance` (bege) · `03 Quem vive o
festival` (chocolate) · `04 Onde a marca aparece` (creme, com os formatos que já
aconteceram) · `05 Proposta`, mais a barra fixa ("Falar sobre apoio"). ⛔ **Saíram em
12/10/2026:** `03 Por que apoiar` (seis "motivos" em card — cada um repetia o público, o
alcance ou um ponto de contato) e a faixa de palavras (laço sem pausa, só atmosfera).
Mesma estrutura de herói de Participar — sem cartão e sem indicadores.

- **01 Abertura** — título curto **"Apoie o *Sweet & Coffee Week.*"** (destaque amarelo,
  6,2:1 sobre o marrom; espaço inseparável para o "&" nunca ficar sozinho no fim da
  linha), lead com os anos do festival, ações "Conversar sobre apoio" e "Ver alcance e
  formatos".
- **02 Alcance — métricas separadas, com data.** Dois grupos, **um por fonte**: "Nas
  casas participantes" (histórico comercial das edições: movimentação direta · combos
  vendidos) e "No Instagram oficial" (painel do perfil: visualizações · alcance ·
  interações · seguidores). **Cada grupo diz a fonte e "apurado em …"**
  (`festivalFacts.*.apurado`). ⚠️ **Visualizações, alcance e interações são métricas
  distintas: nunca somar, nunca chamar visualização de alcance** — a nota do grupo diz
  isso. Antes eram seis cards iguais lado a lado, e o leitor somava o que não se soma.
  ⛔ As comparações com a população de Natal saíram: visualização não é pessoa, e conta
  alcançada não é morador. Disco na cor da página em todos (§6.3, leitura de Apoiar):
  quem distingue o dado é o ícone.
- **`03 Quem vive o festival` é grade editorial**, não duas listas de bullets lado a lado: os seis
  traços do público viram itens com índice `01`–`06` e **filete horizontal** entre eles —
  bolinha de 7px é indicador de item de lista, **não de dado**. O texto do traço é
  `700 17–21px`: **ele é o argumento da seção**. A imprensa sai de dentro da grade e vira
  **bloco irmão embaixo, separado por 44–72px** — a distância entre argumento e prova é
  maior **de propósito**. ⛔ Não usar `--scw-gap-bloco` aí.
- **04 Onde a marca aparece (`OndeAparece.jsx`, `#formatos`)** — quatro canais (no
  digital · nas casas · relacionamento · Sweet Awards), cada um com foto e legenda de
  `imageLibrary.js` e o que cabe nele numa linha. Embaixo, **"Formatos que já
  aconteceram"**: seis exemplos reais de ativação (benefício cruzado, sorteio, prêmio de
  avaliação, ativação temática, título oficial da edição, parceria de origem), **sem
  nomear a marca**. ⛔ Saíram em 12/10/2026 as fotos `campanha/03`, `17` e `18` (display,
  adesivo e press kit: preço e data impressos e texto deformado — §2.2, §6.12) e
  `momentos/05`, cuja legenda afirmava uma "ação de marca" que o acervo não confirma.
- **A página não exibe patrocinadores.** Em vez de vitrine de logos, mostra **formatos de
  ativação** — o que já foi feito, sem nomear a marca (§9.6).
- **05 Proposta (`Proposta.jsx`)** — o formulário em destaque, fora do motor de
  movimento. Contrato de envio inalterado: `submit_support_interest` pela porta
  protegida (`src/lib/enviarFormulario.js`), lógica pura em `src/lib/supportInterest.js`.
  Erro junto do campo, foco no primeiro campo com erro, pelo menos um contato (e-mail
  ou WhatsApp). **Nunca afirma "enviado" se a gravação falhar** — sucesso ("Proposta
  registrada.") só quando o banco confirma.
- Os números vêm da fonte canônica, cada um com o que mede e quando foi apurado (§9.5).

### 7.6 Contato — `/contato`, bege `#F8E4C1`

**Onde mora (12/10/2026):** `src/pages/contato/` — `index.jsx` monta as seções e guarda
o estado da central (`useCentralDuvidas.js`), porque **duas seções escrevem nele**: a
busca da abertura e a da própria central (mais o "Ver dúvidas de suporte" da triagem).
`useFormularioContato.js` é o formulário; `rolar.js` faz as âncoras internas (o
roteador é por hash: `href="#mensagem"` cru trocaria de rota). Texto em
`src/data/conteudo/contato.js`; perguntas em `src/data/faqCentral.js`; CSS em
`scw-contato.css`.

**Três seções (12/10/2026):** `01 Abertura` · `02 Central de dúvidas` ·
`03 Falar com a equipe`. ⛔ `03 Caminhos` ("Cada assunto tem uma porta certa", três
cards) e `04 Mensagem` **viraram uma seção só**: a triagem é a coluna "Antes de
escrever", ao lado do formulário.

**01 Abertura — a busca É a ação principal.** Coluna única: rótulo, H1 ("Sua dúvida,
respondida aqui." — `.scw-h1` cheio, sem teto próprio de medida), lead com a contagem
real de respostas (`{total}`, nunca digitada) e o **campo de busca**, que escreve no
MESMO estado da central: "Buscar" rola até a lista já filtrada e leva o foco ao título
do resultado. Escrever para a organização é a segunda ação, em link. ⛔ Os dois botões
que só rolavam a página ("Ver as perguntas" / "Ir para o formulário") saíram — no
celular caíam embaixo do aviso de cookies. **Altura do conteúdo, não da tela**
(`min-height: 0`): a central já espia na primeira dobra do desktop. Celular: foto
**16:10** com teto `44svh` (2:1 entre 600 e 1000px), para a busca inteira caber acima do
aviso de cookies (§6.9). ⛔ A coluna de apoio à direita, com a nota "a central reúne N
respostas", **saiu em 20/08/2026**.

⛔ **A regra antiga "Contato é página simples, SEM hero" está superada** — a página abre
com herói compacto e banda de foto no mobile.

**Central de dúvidas: 93 perguntas em 10 assuntos** — Sobre o festival 9 · Edição atual 7
· Combos 10 · Atendimento 10 · Ingredientes e acessibilidade 7 · Rota da Doçura 9 · Sweet
Awards 13 · Participação 13 · Parcerias 8 · Suporte 7 (conferido em 13/10/2026).
**Fonte única das perguntas: `src/data/faqCentral.js`** (import default em
`src/pages/contato/index.jsx`). A central fica **fora do motor de movimento**
(`data-mo-fora`): quem chega para consultar não espera animação.

- **Entrada "Comece por aqui"** (`COMECE` em `conteudo/contato.js`): seleção editorial
  de oito perguntas — é o que a lista mostra antes de qualquer escolha.
- **"Todas" e o resultado da busca entram de 10 em 10, com "Mostrar mais"**
  (`LISTA = { inicial: 10, passo: 10 }`): 93 acordeões de uma vez eram uma parede. Um
  assunto escolhido (7 a 13 perguntas) aparece inteiro. O schema `FAQPage` leva as 93,
  inclusive as que a lista ainda não mostrou.
- **Só a primeira resposta abre sozinha** (eram duas).

⚠️ **`src/data/contactFaq.js` NÃO está morto** — conferido no código em 07/08/2026. Ele
exporta `FAQ_CATEGORIES`, `FAQ_ITEMS` e **`CONTACT_SUBJECTS`**, e é o `CONTACT_SUBJECTS`
que alimenta a triagem do formulário, importado por
`src/pages/contato/secoes/Mensagem.jsx` e por `src/lib/contactRequest.js`. **São duas coisas diferentes que a documentação antiga
confundia:** `faqCentral.js` são as 93 perguntas; `contactFaq.js` são os assuntos do
formulário. **Não remover.** O que sobra dele — `FAQ_CATEGORIES` e `FAQ_ITEMS`, a lista
de perguntas antiga — é que está morto, e some quando alguém confirmar que ninguém
importa esses dois nomes.

- Índice editorial à esquerda (linhas com filete, contagem à direita, ativo por peso +
  sublinhado de 2px na cor da página) e busca como linha com traço inferior.
- **No mobile o índice vira chips roláveis** — `flex: 0 0 auto` **obrigatório** no `<li>`,
  senão os chips colapsam.
- A busca **ignora acentos e maiúsculas, exige todos os termos (E) — pergunta, resposta,
  palavras-chave, rótulo e id do assunto — e muda o filtro para "Todas"
  automaticamente**; apagar volta à entrada.
- Cada pergunta é `h3 > button` com `aria-expanded`/`aria-controls`, painel
  `role="region"`. Schema `FAQPage` gerado da mesma fonte de dados.
- Os campos `mapa`, `regulamentoRota`, `regulamentoAwards`, `areaAvaliacao` e
  `pressKit` estão `null` (`imprensa` não: aponta para o formulário desta página).
  **Isso não é bug:** quando `null`, o link não aparece; preencher faz o link surgir
  sozinho. **Mapa, rota e avaliação pertencem à camada de edição e ficam `null` até a
  próxima edição existir.**

**O bloco "Edição atual" é reescrito para o estado entre-edições.** As perguntas que
apontavam para mapa, regulamento e área de avaliação passam a **explicar como funciona**,
sem prometer link que não existe.

**03 Falar com a equipe (`Mensagem.jsx`, `#mensagem`)** — triagem e formulário na MESMA
seção, lado a lado. A coluna **"Antes de escrever"** traz três caminhos (levar a marca
para a rota → Participar · apoiar ou patrocinar → Apoiar · problema com um pedido → as
dúvidas de suporte da central); no celular ela vem **antes** do formulário, que é quando
evita uma mensagem no lugar errado. Formulário (nome · e-mail · assunto · mensagem;
assuntos de `CONTACT_SUBJECTS`): rótulo real em cada campo, **erro junto do campo**
(`aria-invalid` + `aria-describedby`), foco no primeiro campo com problema, validação da
lib e não a bolha do navegador (`noValidate`). **Sem sucesso falso:** `submitContact`
(`src/lib/contactRequest.js`) só devolve sucesso quando a gravação confirma, e a tela só
diz "enviada" nesse caso; na falha, o que a pessoa escreveu fica no formulário.

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

### 7.8 Como manter — o caminho curto de cada pedido

Desde 12/10/2026 cada página do institucional é uma pasta (`src/pages/<pagina>/`) e
cada página carrega no próprio chunk (`React.lazy` via `src/pages/carregadores.js`).
`src/pages/institutional/*.jsx` só reexporta — **não editar ali**.

| Pedido | Onde mexer |
|---|---|
| Mudar uma seção (layout, ordem interna, peça) | `src/pages/<pagina>/secoes/<Secao>.jsx`. A ordem das seções está no `index.jsx` da pasta |
| Mudar texto | `src/data/conteudo/<pagina>.js` (`home`, `edicoes`, `sweet-awards`, `participar`, `apoiar`, `contato`). JSX não guarda texto (§5.6). Perguntas da central: `src/data/faqCentral.js` |
| Trocar foto | `src/data/imageLibrary.js` (`heroPhotos`, `fotosHome`, `fotoGanho`…). ⛔ **Nunca `imageVariants.js`** — é gerado por `scripts/gerar-variantes.mjs` |
| Ligar/desligar o destaque de edição na Home | **Ligado desde 13/10/2026.** `src/data/destaqueEdicao.js`: `ativo` liga/desliga; tema, período e ano vêm de `proximaEdicao.js` (nunca escritos aqui); lettering, fundo e vídeo de `fotoProximaEdicao()` em `imageLibrary.js`; o link do reel é `REEL_LANCAMENTO`; a ação só existe com pré-cadastro aberto. Obrigatórios: `titulo`, `tema`, `periodo`, `texto`; vídeo, marca e ação são opcionais, mas inteiros. Faltou um campo, `destaqueValido()` devolve `false` e a abertura institucional continua — nunca um bloco pela metade. Conferir com `npm run test:destaque`. Nada liga por data, e não mexe em flag de publicação (sob o gate atual a Home nem aparece). Decisão do Wilker, nunca automática |
| Validar antes de commitar | `npm run build && npm run test:casca-institucional` · `npm run test:motion` (depois de um build) · `node tests/responsive.mjs` — e o build de verificação fora do projeto (§3.2 da raiz) |

---

