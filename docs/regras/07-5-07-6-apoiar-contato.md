<!-- Parte das regras do projeto. Índice: src/pages/CLAUDE.md. Movido sem reescrita de src/pages/CLAUDE.md em 10/11/2026. -->

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
alcance ou um ponto de contato) A faixa de palavras saiu junto e **voltou em 14/10/2026**, logo depois da abertura.
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

**01 Abertura — a busca É a ação principal.** Coluna única: H1 (sem rótulo desde 14/10/2026) ("Sua dúvida,
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

