# Números do site: fonte, período, estado e como atualizar

Registro de 16/11/2026, depois do encerramento da edição Cartoon (2026.2). Diz, para cada número que o site
mostra, o que ele mede, de onde vem, que período cobre, quando foi verificado e onde aparece. Diz também o que
ainda falta para atualizar os números comerciais e como publicar o resultado do Sweet Awards.

Regra geral: **o código é a fonte** (`src/data/festivalFacts.js` e a base `src/data/sweetCoffeeHistory.js`). Este
documento explica; se divergir do código, vale o código e este arquivo é corrigido.

## 1. Quatro famílias que não se misturam

| Família | O que é | Onde mora |
|---|---|---|
| A. Histórico acumulado do festival | contagens de edições, marcas e participações, e os totais comerciais somados ao longo dos anos | `festivalFacts.js` |
| B. Resultados da edição Cartoon | visitas, leituras de QR, avaliações, Caça aos Carimbos, Instagram da campanha, vendas lançadas | `docs/cartoon-2026-2/22-encerramento-da-edicao.md` §4 (uso interno) |
| C. Instagram do perfil oficial | visualizações, alcance, interações, seguidores e publicações do `@sweetcoffeeweek` | `festivalFacts.js` (campos `ig*`) |
| D. Números da F2 Experience | projetos, pessoas impactadas, atuação: dados da agência, não do festival | `F2_NUMEROS` em `src/data/conteudo/home.js` |

Um acumulado histórico nunca é apresentado como resultado da Cartoon, e um número da agência nunca entra na
conta do festival. A única ponte é "edições do festival assinadas" (família D), que é a mesma contagem do acervo
e por isso é lida de `festivalFacts.editions`.

## 2. Família A: histórico, derivado da base

Não se digita. Sai de `sweetCoffeeHistory.js` a cada carregamento, com os aliases de marca aplicados.

| Indicador | Valor | O que mede | Período | Verificado | Estado | Onde aparece |
|---|---|---|---|---|---|---|
| `editions` | 17 | edições realizadas | 2016 a 2026.2 | 16/11/2026 | confirmado | Home (abertura, Trajetória, Realização), Edições, Participar, `/em-breve`, página `/quero-participar/` |
| `participations` | 437 | uma criação autoral por marca em cada edição | 2016 a 2026.2 | 16/11/2026 | confirmado | Home (Trajetória), Edições |
| `brands` | 131 | marcas distintas (rede com várias lojas conta uma vez) | 2016 a 2026.2 | 16/11/2026 | confirmado | Home (abertura, Trajetória), Edições |
| `lastEdition` | Cartoon, 2026, 27 marcas | última edição realizada | 2026.2 | 16/11/2026 | confirmado | Home (abertura e agradecimento), Participar, central de dúvidas |
| `years` | 10 | anos de festival (decisão de 21/08/2026) | desde 2016 | 21/08/2026 | confirmado | Participar, Apoiar, `/quero-participar/` |
| `storesLovers` | 33 lojas | unidades das 21 marcas da edição Lovers | só 2026.1 | junho de 2026 | confirmado | nenhuma página (uso em relatório) |
| `returnRate`, `newPerEdition`, `daysPerEdition` | 66% · 7 · 11 | retorno de marcas, estreias por edição, duração padrão | 2016 a 2026.2 | 16/11/2026 | confirmado | nenhuma página hoje |

Marcas, unidades, participações e combos vendidos são conceitos diferentes. O campo que contava lojas se chamava
`storesLastEdition` e apontava para a Lovers: passou a `storesLovers`, com a edição no nome.

Prêmios do Sweet Awards (11 edições premiadas, 271 prêmios, 44 marcas) não moram em `festivalFacts`: saem de
`estatisticas()` em `src/pages/sweet-awards/consulta.js`, sobre `AWARDS_DADOS`. Só contam resultado publicado.

## 3. Famílias A e C: comerciais e Instagram, apuração de junho de 2026

Não deriváveis. Todos foram apurados em **junho de 2026, durante a edição Lovers**: cobrem as **16 primeiras
edições**. A Cartoon (17ª) **não está** em nenhum deles. Cada fato carrega no código: `mede`, `fonte`, `periodo`,
`apurado`, `verificado`, `estado` e `publica`.

| Indicador | Valor exibido | O que mede | Período | Fonte | Estado | Onde aparece |
|---|---|---|---|---|---|---|
| `combosSold` | +34 mil | combos vendidos | soma das 16 edições até a Lovers | histórico comercial da organização | confirmado até junho de 2026 | Home (Trajetória), Participar, Apoiar, `/em-breve` |
| `revenue` | +R$ 712 mil | movimentação direta no caixa das marcas | soma das 16 edições até a Lovers | histórico comercial da organização | confirmado até junho de 2026 | Home (Trajetória), Participar, Apoiar, `/em-breve` |
| `igViews` | +18 mi | visualizações do conteúdo do festival e das marcas | acumulado até a edição Lovers | painel do Instagram oficial | confirmado até junho de 2026 | Home (Trajetória), Apoiar |
| `igReach` | +200 mil | contas alcançadas | acumulado até a edição Lovers | painel do Instagram oficial | confirmado até junho de 2026 | Apoiar |
| `igInteractions` | +290 mil | curtidas, comentários, salvamentos e compartilhamentos | acumulado até a edição Lovers | painel do Instagram oficial | confirmado até junho de 2026 | Apoiar |
| `igFollowers` | +65 mil | seguidores do perfil | total na data da consulta | painel do Instagram oficial | confirmado em junho de 2026 | Apoiar |
| `igPosts` | +1.600 | publicações no perfil | de 2016 até a edição Lovers | painel do Instagram oficial | confirmado em junho de 2026 | nenhuma página hoje |

O que o site passou a dizer ao lado deles: a Trajetória mostra uma nota por grupo de apuração ("Combos vendidos e
movimento nas casas: apuração de junho de 2026, até a 16ª edição (Lovers)."), Participar repete o período na nota
e Apoiar traz o período na linha da fonte. Antes, "somando as 16 edições" aparecia colado em "17 edições".

Regras que valem para qualquer atualização:

- Visualizações, alcance, interações, seguidores e publicações são métricas distintas. Não se somam.
- Alcance de períodos diferentes não vira público único. Seguidores são um total na data da consulta.
- Receita: `revenue` é o número informado pela organização como movimentação direta. O site não multiplica
  combos por preço, e não soma o total histórico arredondado com parcial novo.
- Exportações com períodos sobrepostos não se somam sem tirar a sobreposição.

## 4. Família B: a edição Cartoon (uso interno)

Os valores estão em `docs/cartoon-2026-2/22-encerramento-da-edicao.md` §4 e no relatório geral
(`12_RELATORIO_GERAL_EDICAO`, na pasta da edição). Aqui fica só a governança.

| Indicador | Período | Fonte | Verificado | Estado | Publicação |
|---|---|---|---|---|---|
| Casas e unidades (27 casas, 42 unidades) | edição 2026.2 | banco da edição | 16/11/2026 | confirmado | 27 casas é público (acervo). Unidades: interno |
| Visitantes, sessões e origem | 05 a 15/11/2026 | Google Analytics | 16/11/2026 | confirmado | interno |
| Leituras de QR | até a leitura de 16/11/2026 | banco (`api/q.js`) | 16/11/2026 | confirmado | interno |
| Avaliações (quantas e de quantas pessoas) | 05 a 15/11/2026 | banco da edição | 16/11/2026 | confirmado | interno, entregue à organização |
| Caça aos Carimbos (mapas, carimbos, pedidos) | 05 a 15/11/2026 | banco da edição | 16/11/2026 | confirmado | interno |
| Instagram da campanha (99 posts, 428 stories, visualizações, interações) | 16/09 a 15/11/2026 | exportação do Meta Business Suite de 16/11 (`ig.json`) | 16/11/2026 | confirmado na janela | interno. Alcance somado por publicação não é público único e não se publica |
| Vendas lançadas pelas casas | 05 a 15/11/2026 | painel (lançamento diário das casas) | 16/11/2026 | **parcial**: 111 de 297 dias lançados, 8 casas sem lançar | não publicar |

Esses números não vão para página pública como comparação entre edições (regra do projeto: edições não competem).
Promover qualquer um deles a indicador público é decisão do Wilker, caso a caso.

## 5. Família D: F2 Experience

`F2_NUMEROS` em `conteudo/home.js`: +1K projetos, +400K pessoas impactadas, atuação nacional. Fornecidos pelo
Wilker, sem fonte no repositório. Ficam como estão. Só o terceiro item ("edições do festival assinadas") é lido
de `festivalFacts.editions`.

## 6. Pendências externas (não são trabalho de código)

1. **Vendas da Cartoon.** Faltam os lançamentos de 8 casas e os dias pendentes de outras 15. Com o total fechado
   e conferido pela organização, atualizar `combosSold` e `revenue`. Falta de lançamento não é venda zero.
2. **Método da movimentação.** O repositório não registra como os R$ 712 mil foram calculados (faturamento de
   combos, movimento total das casas ou estimativa). A organização precisa confirmar o método antes de somar a
   Cartoon.
3. **Instagram acumulado.** Para atualizar `igViews`, `igReach` e `igInteractions` é preciso a exportação do Meta
   Business Suite ano a ano (limite de um ano por arquivo), de 2016 a 2026, sem sobreposição de períodos. Para
   `igFollowers`, a consulta do total do perfil na data. Para `igPosts`, a contagem total do perfil.
4. **Resultados.** Sweet Awards (apuração da organização), pódio da Caça aos Carimbos e sorteios. Saem primeiro
   no Instagram do festival.
5. **Página da edição Cartoon.** Foto de capa (hoje a primeira da lista), combo da Parma Doces e nomes canônicos
   de duas casas (doc 22 §3).
6. **Aplicativo instalável.** `public/manifest.webmanifest` ainda instala a "Caça aos Tesouros SCW", que abre em
   `/cartoon/caca` (hoje cai na Home). Trocar afeta quem já instalou: decisão do Wilker.

## 7. Como atualizar um número comercial

Em `src/data/festivalFacts.js`, no fato:

1. `value` e, se mudou a ordem de grandeza, `unit` (`''`, `'mil'` ou `'milhões'`).
2. `apurado` (texto que aparece na página), `verificado` e `periodo`. Se o escopo mudou, `mede`.
3. Parcial: `estado: 'parcial'` (a nota passa a dizer "apuração parcial"). Ainda sem dado: `value: null` (o
   número some das páginas). Zero conferido: `value: 0` (aparece como 0, sem "+"). Dado interno: `publica: false`.

O texto exibido, o prefixo e a unidade saem de `textoDoFato` e `partesDoFato`. Nenhuma página digita "mil", "mi"
ou "R$". Conferir com `node --test tests/numeros.test.mjs`.

## 8. Publicar o resultado

Cada resultado tem o próprio estado. Divulgar um não muda os outros.

### Sweet Awards da Cartoon

Só depois da divulgação oficial pela organização.

1. Em `src/data/sweetCoffeeHistory.js`, edição `2026.2`, preencher `premiacao.categorias` com o pódio oficial
   (categoria, trilha `sweet_lovers`, colocações com os nomes das casas) **e** trocar `premiacao.status` de
   `em-apuracao` para `completa`. Os dois juntos: categoria sem pódio, ou pódio com status em apuração, não
   publica nada.
2. Em `src/data/handoff/awardsData.js`, acrescentar a linha da edição em `NOTAS`.
3. Opcional: texto próprio dos resultados em `RESULTADOS_DA_EDICAO` (`src/data/conteudo/sweet-awards.js`). Sem
   ele, a seção usa o texto montado dos dados.

O resto acompanha sozinho: a Home troca para "Conheça os vencedores", o Sweet Awards volta à abertura permanente
com os resultados da Cartoon no alto, o detalhe da edição mostra o primeiro lugar de cada categoria, e o Hall, as
contagens e o histórico passam a incluir a edição. Conferir com `node --test tests/numeros.test.mjs
tests/sweet-awards.test.mjs tests/edicoes.test.mjs` (os números do herói e do Hall fixados nos testes mudam com o
resultado real: atualizar para os valores oficiais).

Nenhuma fórmula de avaliação, regra de elegibilidade, desempate ou apuração mora no site institucional. O site só
exibe o resultado que a organização divulga.

### Caça aos Carimbos e sorteios

Em `src/data/resultadosEdicao.js`, `MANUAIS`: `estado: 'divulgado'` e `href` com o link da publicação oficial no
Instagram. Sem o link, o estado continua em apuração.

### Desligar a seção Cartoon da Home

`ativo: false` em `CAPITULO_CARTOON` (`src/data/conteudo/home.js`). A Home fica com a abertura institucional e
segue em "Como funciona", sem espaço vazio.
