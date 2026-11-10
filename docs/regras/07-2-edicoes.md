<!-- Parte das regras do projeto. Índice: src/pages/CLAUDE.md. Movido sem reescrita de src/pages/CLAUDE.md em 10/11/2026. -->

### 7.2 Edições — `/edicoes` e `/edicoes/<código>`, laranja `#FF4810`

**Arquivo visual do festival em duas camadas — reconstruída em 13/10/2026** (pedido do
Wilker: a apresentação de slides não foi aprovada; "o visitante precisa perceber o
conjunto da história antes de entrar numa edição"). ⛔ **A apresentação de tela única
(16 cenas, régua fixa na base, cabeçalho próprio, painéis flutuantes, troca de edição
por seta/arraste na página inteira) saiu e não volta.**

**Onde mora:** `src/pages/edicoes/` — `index.jsx` lê o caminho e escolhe a camada;
`acervo.js` deriva tudo das fontes (funções puras: `EDICOES`, `anos()`,
`identificacao()`, `quando()`, `codigoDaRota()`, `detalhe()`, `fotosAbertura()`);
`teclado.js` decide quando uma tecla é da galeria; `icones.jsx` tem os glifos. Peças em
`secoes/`: visão geral = `Abertura` · `NavAnos` · `Colecao`; detalhe = `Detalhe` (topo e
ficha) · `GaleriaEdicao` · `Historia` · `Participantes` · `Premiacao` · `Continuidade`.
Texto de interface, etapa e **capa escolhida de cada edição** em
`src/data/conteudo/edicoes.js`; CSS em `scw-edicoes.css` (prefixo `.edx-`).

**Rota:** as duas camadas são a MESMA rota do App (`'edicoes'`, `resolverRota` em
`src/lib/rotas.js`); o App passa `path` e a página não remonta ao entrar e sair de uma
edição. `codigoDaRota()` só aceita código do acervo — `/edicoes/2026.2` ou um código
inexistente mostram a coleção. Título da aba por edição em `pageMeta.js`; o Analytics
registra tudo como `/edicoes` (`rotaLimpa`). **Voltar à coleção** (pelo link ou pelo
voltar do navegador) rola até o cartão da última edição vista e põe o foco nele (o
roteador leva ao topo; a página corrige dois quadros depois).

**Casca do site:** Edições usa cabeçalho, rodapé (com os documentos legais e
"Preferências de cookies") e abas como as outras páginas. Fica **fora do motor de
movimento** (arquivo de consulta: nada encenado).

**Visão geral (`/edicoes`):**
- **Abertura = herói fotográfico compartilhado (§6.9, desde 14/10/2026)** na chapa laranja
  (`--scw-heroi`): H1 "Cada edição, uma nova história à mesa." (sem rótulo desde 14/10), uma frase sobre
  temas e criações, a linha de números de `festivalFacts` (nunca digitados); na área de
  foto, os quatro registros de edições diferentes (`FOTOS_ABERTURA`) em crossfade. Sem
  faixa de palavras (pedido do Wilker). ⚠️ No celular a faixa de anos começa logo abaixo
  do herói e pode ficar sob o aviso de cookies na primeira visita; o contrato ali é o do
  herói sem ação (o H1 acima do aviso). No desktop segue: anos na dobra, fora do aviso.
- **Coleção por ano**, do mais recente à estreia; dentro do ano, 1ª antes da 2ª
  (calendário). Cada ano é um grupo com numeral em Slab e filete chocolate; ano com duas
  edições diz "duas edições", e cada cartão diz "1ª do ano · abril" (`quando()`, mês
  lido do período) — **nunca depende do ".1"/".2"**. A estreia diz "A estreia · setembro".
- **Grade de 4 colunas (2 abaixo de 1180px) com subgrid**: cada ano ocupa 1 ou 2
  colunas; o ano mais recente abre em **largura dupla** e a estreia fecha em **largura
  inteira** (foto e texto lado a lado). Com isso as linhas fecham sem buraco — conferido
  em `tests/edicoes.test.mjs`. ⚠️ Mudou o número de edições por ano? Rodar o teste: ele
  diz se a grade passou a deixar vão.
- **Cartão = foto + legenda, sem caixa**: capa 1:1 (`capa` em `conteudo/edicoes.js`,
  escolhida em 13/10/2026 entre as 190 fotos, alternando combo de perto, mesa montada e
  gente), marca oficial da edição no tamanho natural, quando, tema (Slab), "N marcas" e
  "Explorar →". O cartão inteiro é o link (nome acessível: tema + identificação +
  marcas). Nenhuma cor muda por edição: ⛔ os `TONS` por cena saíram.
- **Navegação por ano** (`NavAnos`): `<button>`, nunca âncora (`#ano` trocaria de rota);
  rola até o grupo e foca o numeral; `aria-current` acompanha a leitura e o ano clicado
  vale até sair da faixa (2020 e 2019 dividem a linha). Desktop: coluna à esquerda,
  presa em `--edx-topo-fixo` (160px — a linha do cabeçalho fixo termina em 144).
  Celular: faixa rolável presa no **topo** (o cabeçalho some ao rolar), longe das abas e
  do aviso. Presa só dentro da coleção.
- **Só as capas carregam** na visão geral (`tests/edicoes-navegador.mjs` reprova foto de
  galeria baixada ali).

**Detalhe (`/edicoes/<código>`), rolagem natural:**
1. **Topo bege**: "← Todas as edições", identificação ("2ª edição de 2019 · Imaginação";
   a primeira é "A estreia, em 2016" — o dado histórico não muda), tema (`<h1>`, recebe
   o foco ao abrir, sem anel), lead da narrativa, ficha (período · marcas · Sweet Awards)
   e a **marca da edição em posição própria**, no tamanho natural do arquivo, sem chapa
   atrás (§7.7). A marca permanente do festival continua no cabeçalho, levando à Home.
2. **Fotos** (`GaleriaEdicao`): **um combo de cada marca participante** ("Os combos da
   edição", legenda = nome da marca), de `imageLibrary.editionCombos()` — Lovers pelas
   pastas de `/images/combos/`, 2017.2 a 2025 por `src/data/editionCombos.js`, gerado por
   `scripts/combos-edicoes.py` a partir da escolha em `scripts/combos-edicoes.json` (uma
   foto por marca, de preferência o combo completo, escolhida olhando as pastas "combos
   por participante" do acervo bruto em 14/10/2026). Marca sem pasta no acervo fica de
   fora e a nota diz "X das N marcas têm foto". 2016, 2017.1 e 2018.2 não ligam foto e
   marca no acervo: ficam os registros da edição, sem legenda. Visor **quadrado** e
   **`cover`** (pedido do Wilker): o quadrado corta retrato e paisagem por igual; a
   coluna das miniaturas tem a altura da foto e rola por dentro. Miniaturas são a
   sequência manual (botões com `aria-current`, nome da marca), setas de 44px e contador
   "03 / 34". Nos registros sem marca, a nota diz que as fotos não identificam a marca e
   só a foto ampliada leva "Registro N de 12 · tema, ano"; a ampliada aparece inteira
   (`contain`). Teclado ←/→/Home/End **só com o foco dentro da galeria**. "Ampliar" (ou clique
   na foto) abre `<dialog>` de tela cheia: foco no fechar, Tab preso, ←/→, Esc fecha, foco
   volta à foto; a foto grande só baixa ao ampliar. ⛔ Sem autoplay.
3. **História** no fluxo (nada atrás de botão): por que marcou, um destaque, o que ficou,
   e as curiosidades do acervo ao lado (sem preço). ⛔ A narrativa não repete fato que uma
   curiosidade do acervo, na mesma tela, já conta (revisão de 14/10/2026), e a explicação
   geral do festival não entra no detalhe — ela é da Home.
4. **Marcas participantes** (bege): título com a contagem total, lista tipográfica em
   colunas, 18 visíveis e "Mostrar as N marcas" (`aria-expanded`). **Logo só na Lovers
   (2026.1)**, a única edição com vínculo marca × logo no acervo; nas outras, o nome.
5. **Sweet Awards** (chocolate, o contraponto escuro) **só quando houve**: 1º lugar de
   cada categoria (trilha só quando a categoria se repete), a nota pública de
   `awardsData.js` e "Ver o Sweet Awards" → `/sweet-awards` (cor do destino, anel creme).
   Sem premiação: uma linha na ficha ("Sem premiação nesta edição"), sem bloco.
6. **Continuidade** (chapa laranja): edição anterior e próxima com capa, tema e ano, e
   "Todas as edições". A Lovers não tem próxima: Cartoon não é histórico.

**Teclado (`teclado.js`, `tests/edicoes-teclado.test.mjs`):** ⛔ a página **não captura**
setas, PageUp/PageDown, Home/End nem gestos. `teclaDaGaleria` só responde com o foco numa
região `data-teclas-proprias`, e nunca com modificador, campo editável ou diálogo aberto.

**Dados (NÃO inventar):** período, marcas, curiosidades de `handoff/edicoesData.js`;
premiação de `handoff/awardsData.js`; fotos de `editionPhotos()`; marca de
`editionMark()`; texto longo de `edicoesNarrativa.js`. Nada copiado para outro catálogo.

**Testes:** `npm run test:edicoes` (dados e teclado, sem navegador) ·
`npm run build && npm run test:edicoes-navegador` (as 16 edições por link direto nas duas
telas, voltar/avançar e recarregar, galeria e foto ampliada, marcas e premiação,
movimento reduzido, documentos legais, sobreposição; capturas em
`tests/capturas-edicoes/`, não versionadas).

