# 10 · Sistema visual e páginas do site da edição

**Spec de 27/10/2026.** Desenho aprovado pelo Wilker em conversa, parte por parte.
Esta spec aguarda a revisão dele antes do plano de execução.

**Escopo:** só o servidor local (`npm run dev` → `localhost/cartoon`).
**Não publicar nada:**
- nenhum commit em `master`;
- nenhum push;
- nenhuma flag ligada (`CARTOON_PUBLICA` e `ENTRADA_PRINCIPAL` ficam como estão);
- nenhum dado gravado no banco.

Os commits ficam locais em `dev/site-completo` até ordem em contrário.

## 10.1 Origem e precedência

- **Direção visual:** `MANUAL-DIRECAO-VISUAL-CARTOON-v03` (27/10).
  - Caminho: `00_BRIEFING_E_DIRECAO/01_SISTEMA_KV/MANUAL-DIRECAO-VISUAL-v02/` na pasta da edição no Dropbox F2.
  - Elementos prontos em `assets/` da mesma pasta.
- **O manual corrige o código** onde os dois divergem (§10.3). É exceção combinada ao §0.1 do `CLAUDE.md`. A correção entra no código na etapa 1 e, dali em diante, o código volta a ser a fonte.
- **Esta spec substitui** trechos do [05-paginas-e-wireframes.md](05-paginas-e-wireframes.md) e a D-04 do [08-decisoes-pendentes.md](08-decisoes-pendentes.md):

  | Antes | Agora |
  |---|---|
  | Tipografia "indefinida" (05) / texto em Nexa (D-04) | Grandstander em toda a camada (§10.3) |
  | "Olhos que seguem o cursor" e "piscar em loop" proibidos (05) | Olhinhos vivos com contenção (§10.5) |

## 10.2 Decisões de 27/10

| Tema | Decisão |
|---|---|
| Dados no local | Retrato real do painel, só campos públicos, em arquivo fora do git (§10.9) |
| Títulos | **Misto.** Títulos fixos de seção = letreiro desenhado em imagem, com o texto real no HTML. Títulos dinâmicos (casa, combo) = Grandstander 900 com efeito de letreiro em CSS |
| Texto | Grandstander em tudo, peso por papel |
| Olhinhos | Vivos com contenção. O protótipo de 16/10 é refeito: desenho, movimento, expressões, lugar e tamanho (§10.5) |
| Canais de cor | Cor do canal no topo de cada página; corpo creme; cabeçalho igual em todas |
| Páginas | As 7 atuais, repensadas. Nenhuma página nova |

## 10.3 Tokens (`src/styles/scw-cartoon.css`, sob `.ct-edicao`)

### Cor

| Token | HEX | Papel | Muda |
|---|---|---|---|
| `--ct-creme` | `#FDF0DE` | base, respiro, corpo das páginas | era `#FDF2DF` |
| `--ct-amarelo` | `#FDB901` | cena, faixa, botão primário, canal Estreia | — |
| `--ct-chocolate` | `#3A150F` | todo texto, contorno de interface, sombra | **novo** |
| `--ct-preto` | `#050505` | contorno de desenho (olhinhos, ilustração) | — |
| `--ct-vermelho` | `#ED1C20` | ação focal, carimbo, tracejado de rota | — |
| `--ct-rosa` | `#E8195A` | destaque curto, canal Cardápio (bloco do combo) | **novo** |
| `--ct-branco` | `#FCFCFC` | quadro de logo/foto, brilho | — |
| `--ct-azul` | `#0184E4` | canal Serviço ("como funciona") | — |
| `--ct-turquesa` | `#05BEBA` | canal Rota | — |
| `--ct-roxo` | `#6424AB` | só em detalhe (barras de sinal) | — |

- `--ct-amarelo-heroi` (`#FAC506`) **sai**.
- Dourado não é token: só existe no troféu oficial, como arquivo.

**Contraste** (medido no manual; um teste recalcula a partir dos tokens):

| Combinação | Uso |
|---|---|
| Chocolate sobre creme (14:1), amarelo (9:1) e turquesa (7:1) | livre |
| Creme sobre chocolate | livre |
| Creme sobre vermelho ou rosa (~4:1) | só texto ≥ 18,66 px em peso ≥ 700 (texto grande, WCAG AA) |
| Chocolate sobre roxo ou azul | **proibido** |
| Texto sobre azul | preto (~5:1); creme só em texto grande (~3,5:1); nunca chocolate |

### Tipografia

Grandstander, variável, servida pelo projeto: `public/fonts/grandstander/`, em woff2, com `OFL.txt` ao lado. Sai do caminho da camada a Nexa (Typekit e Nexa Slab), que continua no institucional.

| Token | Papel | Peso | Tamanho | Entrelinha |
|---|---|---|---|---|
| `--ct-fs-display` | título dinâmico de herói (nome da casa) | 900 | `clamp(40px, 6vw, 72px)` | 0,95 |
| `--ct-fs-titulo` | título de seção sem letreiro | 900 | `clamp(28px, 3.6vw, 44px)` | 1 |
| `--ct-fs-sub` | chamada, nome do combo, rótulo grande | 800 | `clamp(20px, 2.2vw, 26px)` | 1,1 |
| `--ct-fs-texto` | texto corrido | 500 (600 em destaque) | `clamp(17px, 0.4vw + 15.5px, 18px)` | 1,5 |
| `--ct-fs-servico` | data, @, rótulo de serviço | 700, caixa alta, `letter-spacing: .1em` | 14px | 1,3 |

Medida de linha do texto corrido: até 62ch.

### Forma

| Token | Valor |
|---|---|
| `--ct-traco` | `2.5px solid var(--ct-chocolate)` (interface) |
| `--ct-traco-desenho` | `2.5px solid var(--ct-preto)` (ilustração) |
| `--ct-sombra` | `4px 4px 0 var(--ct-chocolate)`, sem desfoque |
| `--ct-sombra-p` | `3px 3px 0 var(--ct-chocolate)` |
| `--ct-raio` | 18px |
| `--ct-raio-p` | 14px |
| pílula | 999px |
| `--ct-trilho` | o atual, largura útil de até 1440px |
| `--ct-mo` | o atual |

- **Quebras de tela:** 600, 900 e 1200 px, pensando primeiro no celular. Substituem 600/760/900.
- **Alvo de toque:** 44px no mínimo.

## 10.4 Componentes (`src/edicao/componentes/sistema/`)

Um arquivo por componente, sem estilo inline. Os estilos ficam em `scw-cartoon.css`, sobre os tokens.

| Componente | Faz | Contrato |
|---|---|---|
| `Letreiro` | título de seção | `texto` (sempre), `imagem?` (letreiro desenhado), `nivel` (h1–h3). Com imagem: `<hN>` com `<img alt="">` e o texto real visível só para leitor de tela. Sem imagem: o texto em Grandstander 900 com contorno chocolate, filete creme e sombra curta |
| `Etiqueta` | fita amarela com nome de seção | `children`; leve inclinação (−2° a −4°) |
| `Pilula` | dado curto em chocolate | `children` |
| `Placa` | dado duro (data, nº de casas, preço) | `numero`, `rotulo`, `cor` (contrasta com o canal); até 2 linhas |
| `Carimbo` | selo/nota em vermelho | `children` |
| `Botao` | ação | `tipo`: `primario` (amarelo + contorno + sombra) · `acao` (vermelho, texto creme ≥ 18,66px/800) · `secundario` (creme + contorno). Renderiza `<a>` ou `<button>` |
| `Quadro` | quadro branco com fita para logo/foto | `children`, `fita` (cantos) |
| `BarrasSinal` | creme, amarelo, turquesa, rosa, vermelho, azul, roxo | só em transição (topo do rodapé); nunca fundo de texto |
| `TopoCanal` | herói/topo da página no canal | `canal`: `estreia` · `elenco` · `cardapio` · `rota` · `gala` · `servico` |
| `Olhinhos` | personagem da edição | §10.5 |

`Foto`, `Logo`, `Carregando`, `Falha` e os avisos de `base.jsx` passam a usar os tokens novos sem mudar de contrato.

## 10.5 Olhinhos

- **Desenho:** SVG próprio, refeito do zero. Nada de recorte do PNG.
  - Ovais brancos com contorno de nanquim e filete branco externo.
  - Pupila grande e dois brilhos.
  - Pálpebra e sobrancelha desenhadas.
  - Sem boca, sem corpo.
- **Expressões** (as três do manual) e onde aparecem:
  - *encantado*: novidade e combo;
  - *esperto*: dica, mapa, rota;
  - *surpreso*: contagem, "abre em", última chance.
  - Troca entre expressões animada, não por corte seco.
- **Movimento:** linguagem de animação clássica (antecipação, exagero, quique).
  - Piscada com intervalo aleatório de 3 a 6 s, às vezes dupla.
  - O olhar aponta para o assunto da tela.
  - Seguir o cursor ou o toque: **só no herói da Entrada**, com atraso e suavização.
  - Com `prefers-reduced-motion`: parados, na expressão do contexto.
- **Lugar:** um par por tela, na diagonal oposta ao protagonista.
  - Só no herói da Entrada, no topo de Participantes, no estado "abre em" de Avaliar e no topo de Premiação.
  - Nunca perto de formulário, endereço, ingrediente ou mapa.
- **Aprovação:** primeiro na vitrine (§10.12, etapa 2). Só depois entram nas páginas.

## 10.6 Casca (`cartoon/index.jsx`)

- **Cabeçalho creme, igual em todas as páginas:**
  - selo Cartoon à esquerda, como arquivo oficial e nunca centralizado;
  - navegação em Grandstander 800;
  - fixo no topo a partir de 900px.
- **Celular (< 900px):**
  - selo e botão "Menu" no topo; o menu abre uma folha com todos os links e fecha por Esc, véu ou link;
  - embaixo, barra de abas creme com contorno: Início · Casas · Mapa · Rota · Avaliar;
  - depois dos resultados, Avaliar dá lugar a "Prêmio";
  - abas de 44px ou mais.
- **Rodapé chocolate:**
  - `BarrasSinal` no topo;
  - realização F2 (logo oficial);
  - links das páginas e documentos legais;
  - preferências de cookies.

## 10.7 Páginas

O corpo de todas as páginas é creme. O topo de cada uma usa o `TopoCanal` do seu canal.

| Página | Canal | Conteúdo, em ordem |
|---|---|---|
| **Entrada** `/cartoon` | Estreia (amarelo) | Herói: selo, letreiro "Agora é hora de provar!", TV-cidade e olhinhos seguindo o cursor; placas só com o que é fato (5 a 15 de novembro, nº de casas publicadas) · Como funciona (escolha · prove · avalie) com etiqueta azul · "Nosso elenco": logos em `Quadro`, levando a Participantes · Onde ficam: bairros, levando ao Mapa · Avalie · Dúvidas |
| **Participantes** | Elenco (creme) | Letreiro "Nosso elenco", contagem, busca, filtros (bairro, aberto hoje, vegano, diet, para viagem, delivery) · cartão com a foto do combo como protagonista (sem foto: "Foto em produção" com a logo no `Quadro`), logo, nome, tema ("inspirado em …"), bairros e selos |
| **Ficha da casa** | Elenco no topo; Cardápio (rosa) no bloco do combo | Logo, nome (display) e tema · combo: foto grande, nome, itens e condições, preço só se vier do dado · unidades: endereço, horário, Como chegar, WhatsApp autorizado, "Adicionar à rota" · restrições alimentares e trocas · galeria |
| **Mapa** | Rota (turquesa) | Mapa e lista; filtros "aberto agora" e bairro; unidade sem coordenada conferida entra na lista com "localização em conferência" |
| **Minha rota** | Rota (turquesa) | Paradas em placas numeradas, tracejado vermelho, Google Maps em trechos, compartilhar |
| **Avaliar** | Serviço (creme + azul) | Letreiro "Avalie sua experiência", três passos, formulário. Fora da janela: estado "abre em 5 de novembro", com olhinhos surpresos longe do formulário |
| **Premiação** | Gala (chocolate) | Antes dos resultados: troféu oficial sob holofote, "resultados depois de 15/11". Depois: pódio por categoria. 2º e 3º sem registro ficam ausentes, nunca inventados |

- O nome "Mapa" fica até o Wilker decidir entre "Rota da Doçura" e "Mapa da Doçura" (pendência do manual).
- A lógica atual de cada página fica: rota, filtros, Turnstile, cache e RPC. Muda a composição e o visual.
- O painel importa a `FichaParticipante` de `Participante.jsx` como prévia da página pública. Ela muda junto, de propósito, e o teste do painel que a usa continua verde.

## 10.8 Estados

Toda página cobre os estados abaixo, cada um com texto honesto. Nunca área vazia.

- carregando;
- erro;
- vazio ("ainda não publicado");
- cópia antiga;
- demonstração;
- retrato local.

## 10.9 Retrato local de dados

- **Fonte:** o banco, só com consulta de leitura (MCP do Supabase do SCW).
  - Mesmo formato que a RPC `edicao_publica` devolve (projeção pública, [03-modelo-de-dados.md](03-modelo-de-dados.md)).
  - Inclui as casas ainda não publicadas, porque o objetivo é ver a edição como ela está.
- **Nunca entram:** contato da equipe, WhatsApp não autorizado, custos, pagamento, nota de revisão, dados de conta.
- **Arquivo:** `src/edicao/dados/retrato/cartoon.local.json`, listado no `.gitignore`. O repositório é público.
- **Logos:** se o storage for privado, os PNG oficiais (pasta PRINCIPAIS, versão transparente) são copiados para `public/retrato-local/`, também no `.gitignore`.
- **Ordem de leitura no DEV:**
  1. `?demo=1`: demonstração;
  2. senão, o retrato, se o arquivo existir;
  3. senão, a RPC ao vivo.
- **Aviso visível:** "Retrato local do painel · dd/mm".
- **Produção:** o build nunca carrega o retrato. Teste junto do que já protege a demonstração.
- **Atualização:** sob pedido (consulta de novo e regrava o arquivo).

## 10.10 Assets

Os arquivos vêm da pasta `assets/` do manual. São otimizados em WebP (480/960/original) e registrados em `src/data/imageLibrary.js`, como os da edição que já existem.

- **Entram:**
  - selo (`logo-scw-cartoon.png`);
  - letreiros `ig-titulo-elenco` e `ig-titulo-provar`;
  - "Avalie sua experiência", em versão de fundo transparente;
  - `ig-tv-cidade`;
  - `ig-trofeu-dourado`;
  - `logo-f2.svg`;
  - a fonte.
- **Letreiros que faltam:** "Onde ficam", "Minha rota" e "Sweet Awards" começam em CSS (§10.4, `Letreiro` sem imagem). A imagem só é gerada depois que a página for aprovada.

## 10.11 Testes

- **Continuam verdes:**
  - `test:cartoon`;
  - `test:cartoon-navegador`;
  - `test:casca-institucional`;
  - `tests/responsive.mjs`;
  - `test:motion`;
  - `test:redesign` (o estilo da edição não vaza).
- **Novos:**
  - contraste de cada par de tokens em uso, recalculado a partir do CSS;
  - build de produção sem o retrato;
  - cada página em 360, 768 e 1440px: sem rolagem lateral, alvos de 44px ou mais, um `<h1>`, olhinhos parados com movimento reduzido, menu do celular abrindo e fechando.
- **Conferência visual:** é do Wilker, no `localhost`. A verificação aqui é técnica.

## 10.12 Ordem de execução

Cada etapa vira um commit local, sem push.

1. Tokens + Grandstander + vitrine `/cartoon/sistema` (só no DEV): cores, tipos e componentes em celular e desktop. **Parar para aprovação.**
2. Olhinhos novos, na vitrine. **Parar para aprovação.**
3. Retrato local dos dados.
4. Casca: cabeçalho, menu, abas, rodapé.
5. Entrada.
6. Participantes + ficha da casa.
7. Mapa + Minha rota.
8. Avaliar + Premiação.
9. Letreiros que faltarem e passada final de testes.

## 10.13 Fora do escopo e pendências

- **Fora do escopo:** institucional, Home (`/`), painel, flags de publicação, banco (nada gravado) e Edge Functions.
- **Do Wilker, sem travar a execução:**
  - nome da página do mapa;
  - preço do combo como dado público;
  - letreiros novos a gerar.
- **Da organização, no painel:** coordenadas das unidades. Hoje só 2 das 40 têm coordenada, então o mapa aparece quase vazio até a conferência.
