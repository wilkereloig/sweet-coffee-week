<!-- Parte das regras do projeto. Índice: src/pages/CLAUDE.md. Movido sem reescrita de src/pages/CLAUDE.md em 10/11/2026. -->

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
de ação. A faixa de palavras (`Marquee`) saiu em 12/10 e **voltou em 14/10/2026**, logo depois
da abertura (pedido do Wilker). ⛔ A seção
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

