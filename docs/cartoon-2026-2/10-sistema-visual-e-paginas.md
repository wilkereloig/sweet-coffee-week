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

`Letreiro.jsx`, `TopoCanal.jsx` e (etapa 2) `Olhinhos.jsx` têm arquivo próprio. As peças
pequenas ficam juntas em `pecas.jsx`. Sem estilo inline; o desenho fica em
`scw-cartoon.css`, sobre os tokens. O `Botao` reusa as classes `.ct-botao` que as páginas
já usam, então o botão novo vale para a camada inteira de uma vez.

| Componente | Faz | Contrato |
|---|---|---|
| `Letreiro` | título de seção | `texto` (sempre), `imagem?` (letreiro desenhado), `nivel` (h1–h3). Com imagem: `<hN>` com `<img alt="">` e o texto real visível só para leitor de tela. Sem imagem: o texto em Grandstander 900 com contorno chocolate, filete creme e sombra curta |
| `Etiqueta` | fita amarela com nome de seção | `children`; leve inclinação (−2° a −4°) |
| `Pilula` | dado curto em chocolate | `children` |
| `Placa` | dado duro (data, nº de casas, preço) | `numero`, `rotulo`, `cor` (amarelo · creme · turquesa; a tinta é sempre chocolate); até 2 linhas |
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

## 10.14 Acréscimos do Wilker (27/10, noite)

Tudo abaixo vale para o servidor local, com as mesmas restrições do topo desta spec. Nada vai para o banco.

**Conteúdo completo em cada página.** Nenhum dado que o painel tem fica de fora, e tudo vem bem distribuído, organizado e com link.

| Bloco | O que mostra |
|---|---|
| Combo | valor (da organização, por edição; o preço é sempre o mesmo para todas as casas), itens, condições |
| Restrições alimentares | vegano, diet, sem glúten etc.; o que contém e o que pode conter; trocas |
| Atendimento | no local, para viagem, delivery e entrega, cada um com o seu canal e link |
| Unidades | endereço, horário, WhatsApp autorizado, "Como chegar" |
| Galeria | fotos bem montadas |

O retrato local (§10.9) passa a carregar esses campos. Onde o painel ainda não tem o dado, a página mostra "não informado", sem esconder a ausência.

**Logos desenhadas.**
- **Arquivos:** `10_LOGOS_PARTICIPANTES/ILUSTRACOES_DERIVADAS/` no Dropbox da edição. São 29 pares: `PRETAS/<slug>_A-rascunho.png` e `COLORIDAS/<slug>_B-colorido.png`, quadrados com fundo branco, que entram no `Quadro` com fita.
- **Efeito.** A versão preta vira colorida com a cor espalhando como tinta:
  - no desktop, a partir do ponto do mouse, voltando ao sair;
  - no celular, pinta sozinha uma vez quando o cartão chega ao meio da tela;
  - com movimento reduzido, mostra a colorida direto.
- **Só o desenho representa a casa no site, sem a logo oficial ao lado.** Decisão do Wilker, 27/10.
  - Risco registrado: o desenho é uma releitura da logo feita por IA, o manual v03 diz que "a IA nunca desenha logo", e o LEIA da pasta diz que a identidade oficial continua nas fontes originais.
  - Uma marca pode não aprovar a releitura da própria logo. Se isso acontecer, aquela casa passa a mostrar a logo oficial.

**Mapa e painel do Sweet Lover.** Substitui a linha do Mapa e da Minha rota em §10.7.
- O mapa mostra a edição inteira num plano geral: todas as casas, a rota e "perto de mim" (localização do visitante, com permissão).
- Por casa, o visitante marca:
  - **"quero ir"**, que entra na lista dele;
  - **"já fui"**, que completa a rota e aparece como progresso, "x de N casas".
- A página Minha rota vira o painel do Sweet Lover. Lista, visitadas, progresso e compartilhamento por link ficam **salvos no aparelho, sem conta**, como a Minha rota de hoje. Decisão do Wilker, 27/10.
- Registro no servidor (conta ou envio) fica fora. Exigiria base legal, consentimento e tabela nova.

**Coordenadas.** Em 28/10, 13 das 40 unidades têm coordenada conferida no banco. O retrato local soma 21 aproximadas (Nominatim, por número ou por rua, marcadas "a conferir"), e 6 seguem sem coordenada.
- **Proposta para a E3:** geocodificar os endereços via OpenStreetMap (Nominatim) e gravar **só no retrato local**, marcadas como "a conferir". No banco nada é gravado.
- A organização confere no painel antes de publicar.

**Mapa ilustrado de Natal (depois do mapa pronto).**
- Com as coordenadas das casas, gerar um desenho do mapa de Natal em estilo cartoon, misturando os temas das casas.
- É peça de arte da edição e pode virar camada do mapa do site.
- Segue o manual v03: sem personagem de franquia, e o universo do tema aparece em objetos.

## 10.15 Elementos novos da edição (28/10)

**Pedido do Wilker:** a vitrine estava correta, mas sem vida. Ele pediu ícones e elementos **novos**, todos no mesmo estilo e pensados para o lugar onde vão ser usados. Nada vem do acervo de stories e stickers: os estilos ali são misturados.

**Estilo de todas as peças.** É o mesmo do manual v03 (§06 "Estilo do desenho"):
- contorno de nanquim (chocolate ou preto);
- cor chapada da paleta, uma sombra cel e um brilho pequeno;
- forma sintética, legível em 1 segundo;
- fundo transparente.

Gerado com a skill `gerar-imagem-openai` em qualidade medium. Uma família sai de uma folha só, para o traço e o peso ficarem iguais; depois a folha é recortada em PNG individuais e convertida em WebP. Cada peça entra no `imageLibrary`, nunca montada na página.

**Limite fixo:** sem personagem, logo, nome, bordão ou texto da franquia. O universo de cada desenho aparece em lugar, paisagem, objeto e paleta.

### Família 1 · Ícones de interface ilustrados

Sempre acompanhados de texto (nunca sozinhos com função). Tamanho de exibição de 32, 48 ou 64px; nada abaixo de 28px.

| Grupo | Ícones | Onde |
|---|---|---|
| Navegação | início (TV antiga), casas (fachada com toldo), mapa (mapa dobrado), rota (placa de trilha), avaliar (prancheta com estrela), prêmio (roseta de prêmio — o troféu oficial nunca é redesenhado) | abas do celular, menu, rodapé |
| Atendimento | no local (mesa com xícara), para viagem (sacola de papel), delivery (motoca com caixa) | selos do combo e da unidade, filtros |
| Restrições | vegano (folha), sem glúten (espiga riscada), sem lactose (garrafa de leite riscada), sem açúcar (cubo riscado) | selos do combo, filtros, bloco alimentar |
| Unidade | endereço (pin), horário (relógio despertador), aberto agora (porta aberta com luz), conversar (balão — sem marca de aplicativo), como chegar (bússola) | cartão da unidade, mapa |
| Painel do Sweet Lover | quero ir (coração com pin), já fui (carimbo de visto), progresso (bandeira de chegada), compartilhar (aviãozinho de papel) | mapa, cartão, ficha, Minha rota |
| Estados | vazio (lupa), erro (TV com chiado) | estados das páginas e 404 |

### Família 2 · Cenografia da edição

Uma peça grande por canal, usada no topo de página (`TopoCanal`), nunca mais de uma por tela.

| Canal | Peça | Onde |
|---|---|---|
| Estreia | TV antiga grande, com antena, tela vazia para conteúdo | herói da Entrada |
| Elenco | cabine de camarim com estrelas e lâmpadas | topo de Participantes |
| Cardápio | mesa de café com xícara, fatia e colher | bloco do combo na ficha |
| Rota | placas de rua cartoon fincadas na grama | topo do Mapa e da Minha rota |
| Gala | holofote e cortina | topo da Premiação |
| Serviço | prancheta com lápis | topo do Avaliar |
| Todos | faixa de paisagem de Natal em cartoon (ponte, forte, farol, dunas, mar) | rodapé da casca; base do mapa ilustrado (E10) |

### Família 3 · Cenário por tema (uma casa, um universo)

Cada casa ganha um kit próprio, gerado a partir do tema que está no painel (`tema_combo`).

| Peça | Formato | Onde |
|---|---|---|
| Faixa de cenário | panorama horizontal 4:1, base do cenário, topo transparente | base do topo da ficha da casa (atrás do nome, sem cobrir texto) |
| Objeto de cenário A | recorte quadrado | ao lado do nome, no topo da ficha |
| Objeto de cenário B | recorte quadrado | espia do canto do cartão da casa no catálogo (hover e foco; no celular, ao entrar na tela) |

- **Antes de gerar cada kit** (memória `combos-ia-cenario-primeiro`): pesquisar o universo do desenho e anotar, numa linha, o lugar, dois objetos, a paleta e o que evitar. Kits diferentes entre si, mesmo quando dois temas se parecem.
- **Exemplo de direção:** um tema de praia havaiana vira coqueiros, prancha, casa sobre pilotis e flores; um tema da Idade da Pedra vira casas de pedra, palmeiras antigas e roda de pedra. Nada do personagem.
- **Dados:** `src/edicao/dados/temas.js` liga cada slug ao kit (caminhos via `imageLibrary`). Casa sem kit cai no cenário genérico do canal Elenco.

### Movimento

- Letreiro pula ao entrar (antecipação, quique).
- Placa balança uma vez.
- Cartão com compressão e estiramento no hover e no foco.
- Objeto de cenário entra deslizando e reage ao mouse.
- Barras de sinal na troca de página.
- Nada em laço infinito perto de conteúdo. Tudo desligado com `prefers-reduced-motion`.

### Regras de superfície (28/10, adotadas por padrão)

- Sobre amarelo (canal Estreia e abertura da Entrada), o botão primário vira o de ação: vermelho com texto creme em 19px/800. É texto grande, então vale 3:1, e o par dá 3,9:1.
- O rosa é moldura. Texto pequeno dentro do canal Cardápio mora num `.ct-painel` creme.
- O anel de foco é chocolate por padrão. Fica amarelo só sobre chocolate: rodapé, abas e canal Gala.
- No letreiro chocolate, o contorno vira creme e a sombra vira amarela, para os vãos das letras não fecharem.

### Piloto (antes de produzir tudo)

São cerca de 9 gerações:
1. folha de ícones;
2. TV antiga e faixa de Natal;
3. kits de 2 casas aprovadas: Casa Alice Doceria (Alice no País das Maravilhas) e Boldfood (Ursinhos Carinhosos).

Tudo vai para a vitrine, com uma ficha de casa de exemplo, para aprovação. Só depois saem os outros 25 kits.

## 10.13 Fora do escopo e pendências

- **Fora do escopo:** institucional, Home (`/`), painel, flags de publicação, banco (nada gravado) e Edge Functions.
- **Do Wilker, sem travar a execução:**
  - nome da página do mapa;
  - preço do combo como dado público;
  - letreiros novos a gerar.
- **Da organização, no painel:** coordenadas das unidades. Hoje só 2 das 40 têm coordenada, então o mapa aparece quase vazio até a conferência.
