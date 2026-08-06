# Dossiê completo — Sweet & Coffee Week

> Documento gerado a partir do código-fonte do site institucional
> (`site-sweet-coffee-week-home-v2`, branch `dev/site-completo`) em 06/08/2026.
> **Nada aqui foi escrito de memória**: cada número, nome, data e texto foi lido
> direto dos módulos de dados.
>
> **Para regerar depois de mexer nos dados:**
> `node --import ./scripts/esm-registrar.mjs ./scripts/gerar-dossie.mjs`

## Como ler este documento

**Hierarquia de verdade** (regra do projeto, `CLAUDE.md` §16):

1. `src/data/*.js` — **a verdade**. É o que o site renderiza.
2. `ACERVO.md` — transcrição legível do acervo. Se divergir do código, vale o código.
3. `src/data/handoff/*.js` — snapshots derivados do design. Se divergirem, vale o código.

**Regra permanente: não inventar dado.** Onde o acervo não registra, este documento
diz "não registrado" em vez de preencher. A seção final lista as lacunas conhecidas —
para um site novo, elas são tão importantes quanto os dados que existem.

**Fontes declaradas na própria base:**

- Instagram @sweetcoffeeweek
- Acervo de criação da agência (Experience)
- Dados consolidados no projeto ChatGPT/Claude para a edição Sweet & Coffee Week Lovers 2026.1
- src/data/participants.js
- src/data/sweetAwards.js

> Base geral com participantes, premiações (Sweet Awards), períodos e metadados das 16 edições do Sweet & Coffee Week, de 2016 a 2026.1.

---

## 1. Identidade e nomenclatura

**Grafias oficiais** — o erro mais comum do acervo é escrever "Sweet" sozinho.

| Papel | Grafia oficial |
| --- | --- |
| Festival | **Sweet & Coffee Week** |
| Sigla | **SCW** (só depois do nome completo aparecer) |
| Edição atual | **Sweet & Coffee Week Lovers** |
| Premiação | **Sweet Awards** / **Sweet & Coffee Week Awards** |
| Público fiel | **Sweet Lovers** |
| Genéricos aceitos | o festival · o evento · a edição |

**Nunca usar:** "o Sweet", "do Sweet", "no Sweet", "história do Sweet",
"Sweet Coffee Week" (sem o &), "Sweet Coffee Awards", "Sweet & Coffee Lovers".

**Duas identidades visuais que nunca se misturam:** a institucional do festival
e o KV da edição Lovers. Um site novo precisa decidir isso desde o começo.

---

## 2. Números canônicos do festival

Fonte única: `src/data/festivalFacts.js`. É daqui que a Home lê os contadores.

| Dado | Valor | Como aparece |
| --- | --- | --- |
| Edições realizadas | 16 | 16 edições |
| Anos de festival | 10 | 10 anos |
| Primeiro ano | 2016 | — |
| Marcas participantes (acumulado) | 100 | +100 marcas |
| Combos vendidos | 34 mil | +34 mil combos |
| Visualizações no Instagram | 18 milhões | +18 milhões de visualizações |

**Outros dados gerais registrados na base histórica:**

```json
{
  "nomeOficial": "Sweet & Coffee Week",
  "sigla": "SCW",
  "criadoEm": 2016,
  "cidadeOrigem": "Natal/RN",
  "formatoClassico": "1 doce + 1 salgado + 1 bebida",
  "edicoesRealizadas": 16,
  "observacaoNomenclatura": "Quando se referir ao festival, usar Sweet & Coffee Week, SCW, o festival ou a edição. Não usar Sweet sozinho como apelido do festival."
}
```

**Números de alcance usados na página Apoiar** (origem: acervo de mídia da
organização, citados no site): +200 mil pessoas alcançadas · +18 milhões de
visualizações no Instagram · +290 mil interações do público.

---

## 3. Quem realiza, patrocina e apoia

- **Realização:** Experience (F2 Experience)
- **Apoio recorrente:** Espaço Reduzido (edições recentes, confirmado em 2025)
- **Plataforma de votação:** Easy Menu (edições 2020–2021)
- **Fotografia:** @andreylourenco · @breno_sillva

**Parceiros registrados por edição.** Só 4 das 16 edições têm parceiro na base —
12 estão com `patrocinadores.parceiros` vazio.
É a maior lacuna comercial do acervo: quem apoiou as outras 12 edições não está registrado.

| Edição | Parceiros e tipo de relação |
| --- | --- |
| 2019.2 — S&C Contos de Fadas | Eloi Chaves _(patrocínio)_ · Romance Brazil _(patrocínio)_ · Adega Perlage _(apoio)_ · Cia Era uma Vez _(apoio)_ · Espaço Festejar _(cerimônia)_ |
| 2021.2 — S&C Terras Potiguares | Sebrae/RN _(parceria)_ · Cecafés RN _(fornecedor)_ · Primar Orgânica _(fornecedor)_ · Ybiira _(fornecedor)_ · Fazenda Caju _(fornecedor)_ |
| 2022 — S&C Movies | Supernordestão _(patrocínio/parceria)_ · Moviecom Cinemas _(parceiro)_ · Eline _(patrocínio)_ |
| 2024 — S&C Books | Book Club Natal _(parceiro temático)_ |

**Tipos de relação já usados:** patrocínio · apoio · cerimônia · parceria · fornecedor · patrocínio/parceria · parceiro · parceiro temático.
Não há taxonomia fechada — cada edição nomeou do seu jeito. Um site novo precisa
padronizar isso antes de montar página de cotas.

---

## 4. As 16 edições — visão geral

| # | Código | Nome | Tema | Período | Marcas | Premiação |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `2016` | S&C / Início | — | 01 a 11 de setembro de 2016 | 13 | Não teve premiação |
| 2 | `2017.1` | S&C Páscoa | Páscoa | 03 a 12 de abril de 2017 | 17 | Não teve premiação |
| 3 | `2017.2` | S&C Doces do Mundo | Doces do Mundo | 05 a 15 de outubro de 2017 | 22 | Não teve premiação |
| 4 | `2018.1` | S&C Namorados | Namorados | 07 a 16 de junho de 2018 | 19 | Não teve premiação |
| 5 | `2018.2` | S&C Sabores da Infância | Sabores da Infância | 12 a 21 de outubro de 2018 | 25 | Não teve premiação |
| 6 | `2019.1` | S&C Pâtisserie Francesa | Pâtisserie Francesa | 15 a 25 de maio de 2019 | 28 | Premiação completa |
| 7 | `2019.2` | S&C Contos de Fadas | Contos de Fadas | 05 a 15 de setembro de 2019 | 37 | Premiação completa |
| 8 | `2020.1` | S&C No Ritmo da Música | No Ritmo da Música | julho de 2020 | 20 | Premiação completa |
| 9 | `2020.2` | S&C Heróis & Vilões | Heróis & Vilões | 12 a 22 de novembro de 2020 | 27 | Premiação completa |
| 10 | `2021.1` | S&C Séries | Séries | 22 de julho a 01 de agosto de 2021 | 30 | Premiação completa |
| 11 | `2021.2` | S&C Terras Potiguares | Terras Potiguares | 18 a 28 de novembro de 2021 | 30 | Premiação completa |
| 12 | `2022` | S&C Movies | Movies | 06 a 16 de outubro de 2022 | 35 | Premiação completa |
| 13 | `2023` | S&C Trip | Trip | 02 a 12 de novembro de 2023 | 33 | Premiação completa |
| 14 | `2024` | S&C Books | Books | 14 a 24 de novembro de 2024 | 29 | Premiação completa |
| 15 | `2025` | S&C Celebration | Celebration | 06 a 16 de novembro de 2025 | 26 | Premiação completa |
| 16 | `2026.1` | Sweet & Coffee Week Lovers | Lovers | 04 a 14 de junho de 2026 | 21 | completa_em_publicacoes_oficiais |

**Somatório de participações:** 412 (marca contada uma vez por edição).
**Marcas distintas na base:** 131 nomes diferentes.

---

## 5. Ficha completa de cada edição

### 1. S&C / Início — `2016`

| Campo | Valor |
| --- | --- |
| Tema | sem tema |
| Período | 01 a 11 de setembro de 2016 |
| Marcas participantes | 13 |
| Status da premiação | Não teve premiação |
| Observação | 1ª edição — apenas circuito gastronômico. |

**O que propôs.** O começo: um circuito reunindo docerias, confeitarias e cafeterias com combos especiais e preço único, para aproximar do público as marcas que estavam surgindo na cidade.

**Por que marcou.** Aqui nasceram as características que o festival mantém até hoje: marcas diferentes reunidas em um mesmo circuito, produtos criados especialmente para a edição, preço único, duração limitada e público circulando por várias regiões da cidade.

**Curiosidade.** A ideia partiu da jornalista e diretora criativa Eline Eulália, que percebeu que muitos lugares interessantes estavam nascendo em Natal sem que o público os conhecesse.

**Legado.** Visitar uma cafeteria ou uma doceria virou programa. Em vez de escolher um lugar só, o público começou a montar roteiros e comparar experiências.

**Marcas (13):** LaSweets por Larissa Pio · Bocaditos · Liliane Moura Confiserie · Jolie Café Pâtisserie · Margarita Café & Ateliê de Doces · Realize Gourmet · Rafaela Fontes Chocolateria · Chapelatto Coffee Shop · Jana's Cakes · Cecília Mindêlo · Boca D'Água · Rosa Lemos Chocolate & Café · Barões do Café

_Sem premiação nesta edição._

---

### 2. S&C Páscoa — `2017.1`

| Campo | Valor |
| --- | --- |
| Tema | Páscoa |
| Período | 03 a 12 de abril de 2017 |
| Marcas participantes | 17 |
| Status da premiação | Não teve premiação |
| Observação | Sem premiação (Sweet Awards começou em 2019). |

**O que propôs.** A Páscoa estreou os temas: chocolate, símbolos da data e a ideia de presente inspiraram as criações de cada casa.

**Por que marcou.** Foi a primeira vez que o festival trabalhou com um tema central — e ficou claro que o tema podia ir muito além da decoração: inspirava ingrediente, apresentação, nome do produto, embalagem e comunicação.

**Curiosidade.** O público deixou de encontrar apenas combos promocionais e passou a encontrar várias interpretações de uma mesma celebração.

**Legado.** O Sweet & Coffee Week deixou de ser um circuito de produtos e virou um festival de experiências temáticas.

**Marcas (17):** Realize Gourmet · Engenho Doce · Jana's Cakes · Doce Arthe Confeitaria · Barões do Café · Boca D'Água · Casa de Taipa Tapiocaria · TuttiMac · Berlin Cafeteria · FitNeza Coffee · Chocolateria Sandra Maia · Bocaditos · Very Sugar · Jolie Café Pâtisserie · Cecília Mindêlo · Chapelatto Coffee Shop · Rafaela Fontes Chocolateria

_Sem premiação nesta edição._

---

### 3. S&C Doces do Mundo — `2017.2`

| Campo | Valor |
| --- | --- |
| Tema | Doces do Mundo |
| Período | 05 a 15 de outubro de 2017 |
| Marcas participantes | 22 |
| Status da premiação | Não teve premiação |
| Observação | Sem premiação. |

**O que propôs.** Uma viagem pelo mundo através dos sabores: cada casa escolheu um país, uma cultura ou uma tradição gastronômica como ponto de partida.

**Por que marcou.** Doces do Mundo ampliou o repertório criativo do festival. Os participantes precisaram pesquisar receitas, conhecer outras culturas e adaptar essas referências à identidade da própria casa.

**Curiosidade.** A ideia de viajar pela gastronomia voltaria anos depois, muito maior, na edição Trip.

**Legado.** Ficou claro que comida também conta história sobre lugares, costumes e culturas.

**Marcas (22):** Barões do Café · Boca D'Água · Café da Ordem · Caroli Douces · Croasonho · Daguia Tortas Finas · Suisse Brownie · Berlin Cafeteria · Bocaditos · Bolo da Vovó · Cecília Mindêlo · Crooks Cookies · Engenho Doce · Fritz · Jana's Cakes · Jolie Café Pâtisserie · LaSweets por Larissa Pio · Pinga Fogo Doceria · Rafaela Fontes Chocolateria · Realize Gourmet · Chocolateria Sandra Maia · Very Sugar

_Sem premiação nesta edição._

---

### 4. S&C Namorados — `2018.1`

| Campo | Valor |
| --- | --- |
| Tema | Namorados |
| Período | 07 a 16 de junho de 2018 |
| Marcas participantes | 19 |
| Status da premiação | Não teve premiação |
| Observação | Sem premiação. |

**O que propôs.** Perto do Dia dos Namorados, combos pensados para dividir ou presentear — o encontro entrou na proposta junto com o sabor.

**Por que marcou.** O festival passou a ser visto como programa para casais, amigos e grupos: não só uma chance de experimentar produtos, mas um motivo para sair e encontrar gente.

**Curiosidade.** Foi quando muita gente passou a aproveitar os dias do festival para visitar vários estabelecimentos, criando roteiros afetivos pela cidade.

**Legado.** O combo é só uma parte da experiência. O lugar, o atendimento e a memória criada ao redor da mesa também contam.

**Marcas (19):** A Doceria · Barões do Café · Berlin Cafeteria · Bolo da Vovó · Caroli Douces · Cecília Mindêlo · Chapelatto Coffee Shop · Crooks Cookies · Daguia Tortas Finas · FitNeza Coffee · Jana's Cakes · LaSweets por Larissa Pio · Mr. Cupcake Confeitaria · Parma Doces · Rafaela Fontes Chocolateria · Realize Gourmet · Chocolateria Sandra Maia · Suisse Brownie · Very Sugar

_Sem premiação nesta edição._

---

### 5. S&C Sabores da Infância — `2018.2`

| Campo | Valor |
| --- | --- |
| Tema | Sabores da Infância |
| Período | 12 a 21 de outubro de 2018 |
| Marcas participantes | 25 |
| Status da premiação | Não teve premiação |
| Observação | Sem premiação. |

**O que propôs.** Receita de família, lanche da escola, festa de aniversário e almoço de domingo viraram ponto de partida — a lembrança como ingrediente.

**Por que marcou.** Sabores da Infância mostrou a força emocional da comida: as pessoas escolhiam o combo pela lembrança que ele despertava, não só pelo ingrediente ou pela aparência.

**Curiosidade.** Alguns participantes criaram brincadeiras, brindes e pequenas surpresas dentro das lojas, aproximando a visita do universo da infância.

**Legado.** A memória afetiva entrou de vez na identidade do festival.

**Marcas (25):** A Doceria · Barões do Café · Berlin Cafeteria · Boca D'Água · Bolo da Vovó · Cacau Show · Caroli Douces · Cecília Mindêlo · Chapelatto Coffee Shop · Chocolateria Sandra Maia · Crooks Cookies · Daguia Tortas Finas · Das Melo · Edileuza Doces Finos · FitNeza Coffee · Jana's Cakes · Jolie Café Pâtisserie · LaSweets por Larissa Pio · Mr. Cupcake Confeitaria · Parma Doces · Rafaela Fontes Chocolateria · Realize Gourmet · Sodiê Doces · Suisse Brownie · Very Sugar

_Sem premiação nesta edição._

---

### 6. S&C Pâtisserie Francesa — `2019.1`

| Campo | Valor |
| --- | --- |
| Tema | Pâtisserie Francesa |
| Período | 15 a 25 de maio de 2019 |
| Marcas participantes | 28 |
| Status da premiação | Premiação completa |
| Observação | Votação do público (categoria única: Melhor Combo). |

**O que propôs.** A tradição da confeitaria francesa como inspiração: massas delicadas, cremes, tortas e apresentações cuidadosas.

**Por que marcou.** A edição elevou o cuidado com receita e apresentação. Os participantes passaram a olhar com mais atenção para acabamento, combinação e para a forma como o combo chega à mesa.

**Curiosidade.** Entre as criações estavam releituras de gâteau, quiche Lorraine e cafés com apresentação especial. Em algumas casas, a inspiração francesa não acabou com o festival: decoração e produtos continuaram no cardápio.

**Legado.** O festival também virou um convite a aprender, testar técnica nova e melhorar o produto.

**Marcas (28):** Balzac Café · Boca D'Água · Bocaditos · Bolo da Vovó · Cacau Show · Caffeina · Café Brigadeiro · Caroli Douces · Casa Nacre · Cecília Mindêlo · Chapelatto Coffee Shop · Crooks Cookies · Cuore di Panna · Das Melo · FitNeza Coffee · Flor e Flor · Flora Cafeteria · Frans Café · Jolie Café Pâtisserie · LaSweets por Larissa Pio · Mr. Cupcake Confeitaria · Parma Doces · Rafaela Fontes Chocolateria · Realize Gourmet · Sodiê Doces · Sonho de Brownie · Suisse Brownie · Very Sugar

**Pódios:**

- **Melhor Combo**
  - 1º — Jolie Café Pâtisserie
  - 2º — Mr. Cupcake Confeitaria
  - 3º — Sonho de Brownie

---

### 7. S&C Contos de Fadas — `2019.2`

| Campo | Valor |
| --- | --- |
| Tema | Contos de Fadas |
| Período | 05 a 15 de setembro de 2019 |
| Marcas participantes | 37 |
| Status da premiação | Premiação completa |
| Observação | Votação do público (categoria única: Melhor Combo). |

**O que propôs.** Cafeterias, docerias e confeitarias viraram cenário encantado — histórias clássicas inspiraram nome, cor, formato, ingrediente e embalagem.

**Por que marcou.** Foi uma das edições que mais exploraram o lado visual do festival: decoração temática, cenário, figurino, embalagem e apresentação pensada para fotografia. A experiência começava antes de provar o combo.

**Curiosidade.** Entre as criações divulgadas estavam o “Chá de Desaniversário”, inspirado em Alice no País das Maravilhas, e cestas ligadas à história de Chapeuzinho Vermelho. Foi também a edição que estreou o Sweet Gift, o formato para viagem ou presente.

**Legado.** A força das redes sociais ficou evidente: o público não só consumia, fotografava, gravava e compartilhava.

**Marcas (37):** LaSweets por Larissa Pio · Atelier Mine Confeitaria · Balzac Café · Boca D'Água · Bocaditos · Bolo da Vovó · Cacau Show · Café Brigadeiro · Caffeina · Camila Melo · Caroli Douces · Casa Nacre · Casa de Taipa Tapiocaria · Cecília Mindêlo · Chapelatto Coffee Shop · Chef Fits · Cookorote · Crooks Cookies · Cuore di Panna · Das Melo · Edileuza Doces Finos · Flor e Flor · Flora Cafeteria · Frans Café · Jana's Cakes · Jolie Café Pâtisserie · Mr. Cupcake Confeitaria · Nick Buffet · Paneer Pâtisserie · Parma Doces · Pinga Fogo Doceria · Rafaela Fontes Chocolateria · Realize Gourmet · Sodiê Doces · Sonho de Brownie · Suisse Brownie · Very Sugar

**Pódios:**

- **Melhor Combo**
  - 1º — Bocaditos
  - 2º — Mr. Cupcake Confeitaria
  - 3º — Chapelatto Coffee Shop

---

### 8. S&C No Ritmo da Música — `2020.1`

| Campo | Valor |
| --- | --- |
| Tema | No Ritmo da Música |
| Período | julho de 2020 |
| Marcas participantes | 20 |
| Status da premiação | Premiação completa |
| Observação | Votação do público (Sweet Awards) em 7 categorias. |

**O que propôs.** A música virou sabor — gêneros, artistas e canções inspiraram cor, textura, ingrediente e apresentação.

**Por que marcou.** A edição aconteceu em um dos períodos mais difíceis do setor. Com a circulação restrita pela pandemia, delivery e retirada deixaram de ser alternativa e viraram essenciais. O festival ganhou a missão de manter as marcas visíveis e o público perto delas.

**Curiosidade.** Na Páscoa daquele ano, antes da edição, a campanha do festival falava do “abraço adiado” e mostrava um coelho fazendo entregas de motocicleta — a adaptação daquele momento contada com leveza.

**Legado.** O Sweet & Coffee Week provou ser mais do que um evento dentro das lojas: virou também rede de divulgação e conexão entre marcas e consumidores.

**Marcas (20):** Petra Holanda · Café Brigadeiro · Papo de Anjo · Atelier Mine Confeitaria · Bella Petit · Bocaditos · Cecília Mindêlo · Momento Gourmet · Caroli Douces · Casa Nacre · Casa dos Salgados Gourmet · Cuore di Panna · Das Melo · Kopenhagen · Stephany Santos · Cookorote · Rafaela Fontes Chocolateria · Very Sugar · Crooks Cookie Shop · Realize Gourmet

**Pódios:**

- **Melhor Combo**
  - 1º — Bocaditos
  - 2º — Rafaela Fontes Chocolateria
  - 3º — Momento Gourmet
- **Melhor Atendimento**
  - 1º — Casa dos Salgados Gourmet
  - 2º — Momento Gourmet
  - 3º — Bocaditos
- **Melhor Criatividade**
  - 1º — Cookorote
  - 2º — Bocaditos
  - 3º — Caroli Douces
- **Melhor Sabor**
  - 1º — Bocaditos
  - 2º — Atelier Mine Confeitaria e Rafaela Fontes Chocolateria _(empate)_
  - 3º — Momento Gourmet
- **Melhor Apresentação**
  - 1º — Rafaela Fontes Chocolateria
  - 2º — Bocaditos
  - 3º — Momento Gourmet
- **Melhor Take Away**
  - 1º — Cuore di Panna
  - 2º — Rafaela Fontes Chocolateria
  - 3º — Atelier Mine Confeitaria
- **Melhor Delivery**
  - 1º — Café Brigadeiro
  - 2º — Casa dos Salgados Gourmet
  - 3º — Bocaditos

---

### 9. S&C Heróis & Vilões — `2020.2`

| Campo | Valor |
| --- | --- |
| Tema | Heróis & Vilões |
| Período | 12 a 22 de novembro de 2020 |
| Marcas participantes | 27 |
| Status da premiação | Premiação completa |
| Observação | Sweet Awards. Melhor Combo teve Júri Técnico e Sweet Lovers; demais categorias sem distinção de trilha nas peças. |

**O que propôs.** Cultura pop no centro da mesa: doce e amargo, claro e escuro, força e delicadeza traduzidos em sabor e apresentação.

**Por que marcou.** Ainda sob os efeitos da pandemia, os participantes precisaram cuidar de tudo ao mesmo tempo — segurança, embalagem, transporte, retirada e a apresentação nas redes. O combo tinha de chegar bonito também na casa de quem pediu.

**Curiosidade.** Reunir todos os participantes em uma campanha só ajudou cada marca a alcançar mais gente, e o público era incentivado a variar os pedidos e conhecer casas fora da sua rotina.

**Legado.** A experiência do festival passou a caber também em caixas, sacolas e entregas.

**Marcas (27):** Bella Petit · Bell's Café · Bocaditos · Café Brigadeiro · Café com Bike · Caroli Douces · Casa de Taipa Tapiocaria · Casa dos Salgados Gourmet · Casa Nacre · Cecília Mindêlo · Chocolatudos · Cookorote · Das Melo · Delizeu · Dolce Gelato · Edileuza Doces Finos · Frans Café · Jolie Café Pâtisserie · Mangai · Atelier Mine Confeitaria · Momento Gourmet · Mr. Cupcake Confeitaria · Paneer Pâtisserie · Rafaela Fontes Chocolateria · Realize Gourmet · Suisse Brownie · Very Sugar

**Pódios:**

- **Melhor Combo** _(trilha: juri tecnico)_
  - 1º — Bocaditos
  - 2º — Mr. Cupcake Confeitaria
  - 3º — Cookorote e Paneer Pâtisserie _(empate)_
- **Melhor Combo** _(trilha: sweet lovers)_
  - 1º — Mr. Cupcake Confeitaria
  - 2º — Bocaditos
  - 3º — Casa dos Salgados Gourmet
- **Melhor Takeaway/Delivery**
  - 1º — Momento Gourmet
  - 2º — Bocaditos
  - 3º — Casa dos Salgados Gourmet
- **Melhor Atendimento**
  - 1º — Casa dos Salgados Gourmet
  - 2º — Jolie Café Pâtisserie
  - 3º — Mr. Cupcake Confeitaria
- **Melhor Sabor**
  - 1º — Bocaditos
  - 2º — Casa dos Salgados Gourmet
  - 3º — Mr. Cupcake Confeitaria
- **Melhor Criatividade**
  - 1º — Mr. Cupcake Confeitaria
  - 2º — Bocaditos
  - 3º — Jolie Café Pâtisserie
- **Melhor Apresentação**
  - 1º — Mr. Cupcake Confeitaria
  - 2º — Das Melo
  - 3º — Jolie Café Pâtisserie

---

### 10. S&C Séries — `2021.1`

| Campo | Valor |
| --- | --- |
| Tema | Séries |
| Período | 22 de julho a 01 de agosto de 2021 |
| Marcas participantes | 30 |
| Status da premiação | Premiação completa |
| Observação | Sweet Awards com Júri Técnico e Sweet Lovers + Menção Honrosa. Vencedores lidos nos cards do acervo (não foram postados no feed). |

**O que propôs.** O universo das séries e do streaming: personagens, episódios e cenários viraram combo, no ano em que maratonar fazia parte da rotina.

**Por que marcou.** A edição conversou diretamente com o hábito daquele momento. O público reconhecia as referências, escolhia pelo que gostava de assistir e isso puxava comentário, foto e compartilhamento.

**Curiosidade.** Toda a comunicação brincava com o streaming: o festival virou “temporada”, os combos formavam um “catálogo” e o público era chamado para uma “maratona”. O lançamento foi ao vivo no Instagram.

**Legado.** O festival mostrou que consegue transformar em experiência gastronômica qualquer assunto que esteja no dia a dia das pessoas.

**Marcas (30):** Lulu Café · Bem Eu Confeitaria · Aumer Restaurante · Bell's Café · Café Leviz · Casa dos Salgados Gourmet · Bendita Confeitaria · Chocolatudos · Cacau Show · Marlon Vinicius · Bella Petit · Cássia Ribeiro · Paneer Pâtisserie · Casa Nacre · Royal Trudel · Frans Café · Very Sugar · Cecília Mindêlo · Bocaditos · Rafaela Fontes Chocolateria · Caroli Douces · Atelier Mine Confeitaria · Das Melo · Mangai · Suisse Brownie · Mr. Cupcake Confeitaria · Momento Gourmet · Rádio Café · Carol Dantas · Café Brigadeiro

**Pódios:**

- **Melhor Combo** _(trilha: juri tecnico)_
  - 1º — Cássia Ribeiro
  - 2º — Atelier Mine Confeitaria
  - 3º — Bocaditos
- **Melhor Doce** _(trilha: juri tecnico)_
  - 1º — Cássia Ribeiro
  - 2º — Cecília Mindêlo
  - 3º — Das Melo
- **Melhor Salgado** _(trilha: juri tecnico)_
  - 1º — Cássia Ribeiro
  - 2º — Marlon Vinicius
  - 3º — Cecília Mindêlo
- **Melhor Bebida** _(trilha: juri tecnico)_
  - 1º — Cássia Ribeiro
  - 2º — Atelier Mine Confeitaria
  - 3º — Very Sugar
- **Melhor Criatividade** _(trilha: juri tecnico)_
  - 1º — Bocaditos
  - 2º — Mr. Cupcake Confeitaria
  - 3º — Atelier Mine Confeitaria
- **Melhor Apresentação** _(trilha: juri tecnico)_
  - 1º — Bell's Café
  - 2º — Atelier Mine Confeitaria
  - 3º — Das Melo
- **Melhor Combo** _(trilha: sweet lovers)_
  - 1º — Mr. Cupcake Confeitaria
  - 2º — Atelier Mine Confeitaria e Bendita Confeitaria _(empate)_
  - 3º — Bell's Café
- **Melhor Sabor** _(trilha: sweet lovers)_
  - 1º — Mr. Cupcake Confeitaria
  - 2º — Cecília Mindêlo
  - 3º — Bell's Café
- **Melhor Apresentação** _(trilha: sweet lovers)_
  - 1º — Mr. Cupcake Confeitaria
  - 2º — Bell's Café
  - 3º — Atelier Mine Confeitaria
- **Melhor Atendimento** _(trilha: sweet lovers)_
  - 1º — Bendita Confeitaria
  - 2º — Atelier Mine Confeitaria
  - 3º — Mr. Cupcake Confeitaria
- **Melhor Criatividade** _(trilha: sweet lovers)_
  - 1º — Mr. Cupcake Confeitaria
  - 2º — Atelier Mine Confeitaria
  - 3º — Bocaditos
- **Melhor Delivery** _(trilha: sweet lovers)_
  - 1º — Bell's Café
  - 2º — Bocaditos
  - 3º — Casa dos Salgados Gourmet

---

### 11. S&C Terras Potiguares — `2021.2`

| Campo | Valor |
| --- | --- |
| Tema | Terras Potiguares |
| Período | 18 a 28 de novembro de 2021 |
| Marcas participantes | 30 |
| Status da premiação | Premiação completa |
| Observação | Sweet Awards com Júri Técnico e Sweet Lovers. |

**O que propôs.** Ingredientes, paisagens, costumes e memórias do Rio Grande do Norte no centro da criação, em parceria com o Sebrae-RN.

**Por que marcou.** A edição aproximou as lojas urbanas de pequenos produtores e da cadeia agroindustrial do estado: apresentou produtos regionais a novos consumidores, incentivou o uso de ingrediente local e fortaleceu o orgulho pela gastronomia potiguar.

**Curiosidade.** Castanha de caju, mel de abelha Jandaíra, queijos do Seridó, camarão, nata, coco e frutas regionais entraram nas receitas. O lançamento foi ligado à Festa do Boi, reforçando o vínculo com o setor produtivo.

**Legado.** Ficou claro que o festival beneficia muito mais gente do que as casas participantes — produtores, fornecedores e artesãos também fazem parte da história.

**Marcas (30):** Atelier Mine Confeitaria · Aumer Restaurante · Bell's Café · Bem Eu Confeitaria · Bendita Confeitaria · Bocaditos · Café Brigadeiro · Carol Dantas · Caroli Douces · Cássia Ribeiro · Cecília Mindêlo · Chefit · Chocolatudos · Da Terra · Delizeu · Doce Lelê · Douce Bien · Duart's Confeitaria · Frans Cidade Jardim · Frans Cidade Verde · Le Paradis · Lulu Café · Marlon Vinicius · Mr. Cupcake Confeitaria · Paneer Pâtisserie · Parma Doces · Recanto da Prosa · Chocolateria Sandra Maia · Suisse Brownie · Very Sugar

**Pódios:**

- **Melhor Combo** _(trilha: juri tecnico)_
  - 1º — Bocaditos
  - 2º — Mr. Cupcake Confeitaria
  - 3º — Caroli Douces
- **Melhor Doce** _(trilha: juri tecnico)_
  - 1º — Caroli Douces
  - 2º — Mr. Cupcake Confeitaria
  - 3º — Bocaditos
- **Melhor Salgado** _(trilha: juri tecnico)_
  - 1º — Bocaditos
  - 2º — Chocolateria Sandra Maia
  - 3º — Chocolatudos
- **Melhor Bebida** _(trilha: juri tecnico)_
  - 1º — Very Sugar
  - 2º — Cássia Ribeiro
  - 3º — Recanto da Prosa
- **Melhor Apresentação** _(trilha: juri tecnico)_
  - 1º — Bocaditos
  - 2º — Marlon Vinicius
  - 3º — Atelier Mine Confeitaria
- **Melhor Criatividade** _(trilha: juri tecnico)_
  - 1º — Bocaditos
  - 2º — Marlon Vinicius
  - 3º — Atelier Mine Confeitaria
- **Melhor Atendimento** _(trilha: juri tecnico)_
  - 1º — Bem Eu Confeitaria
  - 2º — Duart's Confeitaria
  - 3º — Delizeu
- **Melhor Combo** _(trilha: sweet lovers)_
  - 1º — Marlon Vinicius
  - 2º — Mr. Cupcake Confeitaria
  - 3º — Delizeu
- **Melhor Sabor** _(trilha: sweet lovers)_
  - 1º — Marlon Vinicius
  - 2º — Chocolatudos
  - 3º — Delizeu
- **Melhor Apresentação** _(trilha: sweet lovers)_
  - 1º — Marlon Vinicius
  - 2º — Mr. Cupcake Confeitaria
  - 3º — Chocolatudos
- **Melhor Criatividade** _(trilha: sweet lovers)_
  - 1º — Marlon Vinicius
  - 2º — Mr. Cupcake Confeitaria
  - 3º — Delizeu
- **Melhor Atendimento** _(trilha: sweet lovers)_
  - 1º — Marlon Vinicius
  - 2º — Mr. Cupcake Confeitaria
  - 3º — Recanto da Prosa
- **Melhor Envolvimento** _(trilha: sweet lovers)_
  - 1º — Mr. Cupcake Confeitaria
  - 2º — Atelier Mine Confeitaria
  - 3º — Delizeu
- **Melhor Envolvimento/Encantamento em Loja** _(trilha: juri tecnico)_
  - 1º — Bocaditos
  - 2º — Atelier Mine Confeitaria
  - 3º — Mr. Cupcake Confeitaria
- **Melhor Delivery/Takeaway** _(trilha: sweet lovers)_
  - 1º — Bell's Café
  - 2º — Delizeu
  - 3º — Marlon Vinicius

---

### 12. S&C Movies — `2022`

| Campo | Valor |
| --- | --- |
| Tema | Movies |
| Período | 06 a 16 de outubro de 2022 |
| Marcas participantes | 35 |
| Status da premiação | Premiação completa |
| Observação | Sweet Awards — votação Sweet Lovers. |

**O que propôs.** Depois das séries, o cinema: filmes, personagens e cenas marcantes viraram ponto de partida das criações.

**Por que marcou.** Movies reuniu tudo o que o festival havia desenvolvido até ali — história, força visual, referência conhecida, decoração temática e produto exclusivo. Cada casa criou a sua própria sessão.

**Curiosidade.** O tema permitiu trabalhar a experiência inteira de ir ao cinema: pipoca, doces de sessão, bebida temática, ingresso e cena icônica.

**Legado.** O Sweet & Coffee Week se firmou como experiência que mistura gastronomia e entretenimento — parte da graça era reconhecer as referências.

**Marcas (35):** Adocee Doceria · Aroma Café · Aumer Restaurante · KNVE Casa Café · Supermercado Nordestão · Bell's Café · Bem Eu Confeitaria · Bistrô NL · Bocaditos · Café Leviz · Canuto's · Caramel Healthy Food · Caroli Douces · Cecília Mindêlo · Chocolateria Sandra Maia · Cássia Ribeiro · Daniel Bezerra · Dedo de Moça · Delicato · Doce Lelê · Doce Suspiro · Douce di Maria · Duart's Confeitaria · Kfé da Vila · Mangai · Marlon Vinicius · Petit Poti · Petra Holanda · Recanto da Prosa · Rádio Café · Suisse Brownie · Sweet Duo Confeitaria · Very Sugar · Wanessa Cakes · Wolya Pedrosa

**Pódios:**

- **Melhor Combo** _(trilha: sweet lovers)_
  - 1º — Duart's Confeitaria
  - 2º — Daniel Bezerra
  - 3º — Marlon Vinicius
- **Melhor Doce** _(trilha: sweet lovers)_
  - 1º — Daniel Bezerra
  - 2º — Canuto's
  - 3º — Duart's Confeitaria
- **Melhor Bebida** _(trilha: sweet lovers)_
  - 1º — Duart's Confeitaria
  - 2º — Daniel Bezerra
  - 3º — Canuto's
- **Melhor Salgado** _(trilha: sweet lovers)_
  - 1º — Chocolateria Sandra Maia
  - 2º — Douce di Maria
  - 3º — Marlon Vinicius
- **Encantamento de Loja** _(trilha: sweet lovers)_
  - 1º — Bistrô NL
  - 2º — Adocee Doceria
  - 3º — Marlon Vinicius
- **Melhor Criatividade** _(trilha: sweet lovers)_
  - 1º — Duart's Confeitaria
  - 2º — Marlon Vinicius
  - 3º — Canuto's
- **Melhor Apresentação** _(trilha: sweet lovers)_
  - 1º — Marlon Vinicius
  - 2º — Canuto's e Daniel Bezerra _(empate)_
  - 3º — Duart's Confeitaria
- **Melhor Atendimento** _(trilha: sweet lovers)_
  - 1º — Recanto da Prosa
  - 2º — Dedo de Moça
  - 3º — Daniel Bezerra

---

### 13. S&C Trip — `2023`

| Campo | Valor |
| --- | --- |
| Tema | Trip |
| Período | 02 a 12 de novembro de 2023 |
| Marcas participantes | 33 |
| Status da premiação | Premiação completa |
| Observação | Sweet Awards — votação Sweet Lovers. |

**O que propôs.** Uma volta ao mundo pelo sabor: cada casa escolheu um destino e traduziu sua cultura, sua cozinha ou sua paisagem em combo.

**Por que marcou.** Trip ampliou a ideia de circuito. O público percorria endereços de Natal e Parnamirim e, ao mesmo tempo, conhecia referências de vários lugares do mundo. A edição também fortaleceu a presença do festival em Parnamirim.

**Curiosidade.** Os destinos misturavam Brasil e exterior, das praias do Havaí às ruas de Paris. O contorno do Rio Grande do Norte, que lembra um elefante, virou ponto de partida da viagem na comunicação.

**Legado.** Visitar os participantes virou coleção: destinos, carimbos e descobertas.

**Marcas (33):** Adocee Doceria · Aroma Café · Bocaditos · Canuto's · Caracol · Carcará · Doce Lelê · Caroli Douces · Chocolateria Sandra Maia · Daniel Bezerra · Dedo de Moça · Dekacau · Delicato · Douce di Maria · Duart's Confeitaria · Fabiana Melo · Jefferson Albano · Just Food&Coffee · Kale do Bem · Lu Doces · Mangai · Marlon Vinicius · Mint Coffee · O Maestro Café · Parma Doces · Petit Poti · Pudinharia · Rádio Café · Suisse Brownie · Sweet Duo Confeitaria · Wanessa Cakes · Wow Cookies · Xodó

**Pódios:**

- **Melhor Combo** _(trilha: sweet lovers)_
  - 1º — O Maestro Café
  - 2º — Canuto's
  - 3º — Marlon Vinicius
- **Melhor Doce** _(trilha: sweet lovers)_
  - 1º — Canuto's
  - 2º — Adocee Doceria
  - 3º — Marlon Vinicius e Suisse Brownie _(empate)_
- **Melhor Salgado** _(trilha: sweet lovers)_
  - 1º — Sweet Duo Confeitaria
  - 2º — Douce di Maria e Dedo de Moça _(empate)_
  - 3º — O Maestro Café
- **Melhor Bebida** _(trilha: sweet lovers)_
  - 1º — Canuto's
  - 2º — Just Food&Coffee
  - 3º — Adocee Doceria e Marlon Vinicius _(empate)_
- **Melhor Encantamento** _(trilha: sweet lovers)_
  - 1º — O Maestro Café
  - 2º — Adocee Doceria
  - 3º — Suisse Brownie e Duart's Confeitaria _(empate)_
- **Melhor Atendimento** _(trilha: sweet lovers)_
  - 1º — Jefferson Albano
  - 2º — O Maestro Café
  - 3º — Sweet Duo Confeitaria e Duart's Confeitaria _(empate)_
- **Melhor Criatividade** _(trilha: sweet lovers)_
  - 1º — Canuto's
  - 2º — O Maestro Café
  - 3º — Duart's Confeitaria e Marlon Vinicius _(empate)_
- **Melhor Apresentação** _(trilha: sweet lovers)_
  - 1º — Canuto's
  - 2º — O Maestro Café
  - 3º — Douce di Maria e Marlon Vinicius _(empate)_

---

### 14. S&C Books — `2024`

| Campo | Valor |
| --- | --- |
| Tema | Books |
| Período | 14 a 24 de novembro de 2024 |
| Marcas participantes | 29 |
| Status da premiação | Premiação completa |
| Observação | Sweet Awards — votação Sweet Lovers (vencedores lidos nos cards). |

**O que propôs.** A Livraria da Doçura: obras literárias viraram combo — clássicos, romances, aventuras e histórias infantis em nova versão.

**Por que marcou.** Books aprofundou a capacidade do festival de contar história. Cada combo funcionava quase como um livro: o nome era o título, os ingredientes contavam a trama, a apresentação criava o cenário e o público completava a experiência.

**Curiosidade.** Durante a edição, Eline Eulália relembrou a primeira, de 2016, que reuniu 13 estabelecimentos — e destacou como a criação de temas tornou o festival mais criativo e reconhecível.

**Legado.** O Sweet & Coffee Week já tinha um jeito próprio de transformar assunto cultural em experiência gastronômica.

**Marcas (29):** Adocee Doceria · Bella Douces · Bell's Café · Bocaditos · Bolomania · Canuto's · Caramel Healthy Food · Carcará · Caroli Douces · Casa Bauducco · Casa Moscou · Dedo de Moça · Delicato · Diva Café · Duart's Confeitaria · Fabiana Melo · Jefferson Albano · Just Food&Coffee · Lu Doces · Mangai · Marlon Vinicius · O Maestro Café · Parma Doces · Puro Café · Sol e Café · Suisse Brownie · Sweet Duo Confeitaria · Wanessa Cakes · Wow Cookies

**Pódios:**

- **Melhor Combo** _(trilha: sweet lovers)_
  - 1º — Delicato
  - 2º — O Maestro Café
  - 3º — Bocaditos
- **Melhor Doce** _(trilha: sweet lovers)_
  - 1º — Bocaditos
  - 2º — O Maestro Café
  - 3º — Sweet Duo Confeitaria
- **Melhor Bebida** _(trilha: sweet lovers)_
  - 1º — Delicato
  - 2º — Duart's Confeitaria
  - 3º — O Maestro Café
- **Melhor Salgado** _(trilha: sweet lovers)_
  - 1º — Bocaditos
  - 2º — Delicato
  - 3º — Just Food&Coffee
- **Melhor Apresentação** _(trilha: sweet lovers)_
  - 1º — Delicato
  - 2º — O Maestro Café
  - 3º — Duart's Confeitaria e Just Food&Coffee _(empate)_
- **Melhor Criatividade** _(trilha: sweet lovers)_
  - 1º — Delicato
  - 2º — Just Food&Coffee
  - 3º — Canuto's e Bocaditos _(empate)_
- **Melhor Atendimento** _(trilha: sweet lovers)_
  - 1º — O Maestro Café
  - 2º — Canuto's
  - 3º — Bella Douces
- **Melhor Encantamento em Loja** _(trilha: sweet lovers)_
  - 1º — O Maestro Café
  - 2º — Delicato
  - 3º — Marlon Vinicius

---

### 15. S&C Celebration — `2025`

| Campo | Valor |
| --- | --- |
| Tema | Celebration |
| Período | 06 a 16 de novembro de 2025 |
| Marcas participantes | 26 |
| Status da premiação | Premiação completa |
| Observação | Sweet Awards — votação Sweet Lovers (vencedores lidos nos cards). |

**O que propôs.** Festas, cerimônias e momentos de encontro como inspiração: carnaval, São João, aniversários, premiações e celebrações imaginárias.

**Por que marcou.** Celebration preparou o festival para o ciclo dos dez anos, celebrando a continuidade, a criatividade dos participantes, a presença dos Sweet Lovers e as marcas que cresceram junto.

**Curiosidade.** Apesar de ser a 15ª edição, o festival ainda não completava quinze anos: nos primeiros ciclos houve mais de uma edição por ano.

**Legado.** A edição transformou em tema aquilo que o festival sempre fez — criar motivo para as pessoas saírem de casa e sentarem à mesa juntas.

**Marcas (26):** Adocee Doceria · Aroma Café · Bella Douces · Bolomania · Canuto's · Caramel Healthy Food · Caroli Douces · Casa Bauducco · Delicato · Duart's Confeitaria · Estação Açaí · Fabiana Melo · Jolie Café Pâtisserie · Just Food&Coffee · Mangai · Marlon Vinicius · Mr. Cupcake Confeitaria · O Maestro Café · Padoca do Bosque · Paneer Pâtisserie · Parma Doces · Rollab Confeitaria · Suisse Brownie · Sweet Duo Confeitaria · Território Mexicano · Wow Cookies

**Pódios:**

- **Melhor Combo** _(trilha: sweet lovers)_
  - 1º — Bolomania
  - 2º — O Maestro Café
  - 3º — Delicato
- **Melhor Doce** _(trilha: sweet lovers)_
  - 1º — Jolie Café Pâtisserie
  - 2º — Bolomania
  - 3º — Marlon Vinicius
- **Melhor Bebida** _(trilha: sweet lovers)_
  - 1º — O Maestro Café
  - 2º — Delicato
  - 3º — Mr. Cupcake Confeitaria
- **Melhor Salgado** _(trilha: sweet lovers)_
  - 1º — Rollab Confeitaria
  - 2º — Bolomania
  - 3º — O Maestro Café
- **Melhor Apresentação** _(trilha: sweet lovers)_
  - 1º — Marlon Vinicius
  - 2º — Delicato
  - 3º — O Maestro Café
- **Melhor Criatividade** _(trilha: sweet lovers)_
  - 1º — Marlon Vinicius
  - 2º — Delicato
  - 3º — Duart's Confeitaria
- **Melhor Atendimento** _(trilha: sweet lovers)_
  - 1º — Bolomania
  - 2º — Marlon Vinicius
  - 3º — Rollab Confeitaria

---

### 16. Sweet & Coffee Week Lovers — `2026.1`

| Campo | Valor |
| --- | --- |
| Tema | Lovers |
| Período | 04 a 14 de junho de 2026 |
| Marcas participantes | 21 |
| Slogan | Feito de amor, recriando sabores. |
| Conceito | Edição comemorativa dos 10 anos do Sweet & Coffee Week, criada como homenagem aos Sweet Lovers e à memória construída pelo público, participantes, parceiros e cidade. A proposta convidou cada participante a escolher um tema já realizado na história do festival e recriá-lo com um combo inédito. |
| Formato do combo | 1 doce + 1 salgado + 1 bebida |
| Valor do combo | R$ 38,90 |
| Status da premiação | completa_em_publicacoes_oficiais |
| Observação | Sweet Awards — avaliação do público. Categorias e posts oficiais registrados no projeto. Pódios estruturados por categoria devem ser preenchidos a partir dos cards/posts oficiais caso ainda não estejam em arquivo estruturado. |

**Status dos dados desta edição:**

```json
{
  "participantes": "completo",
  "premiacaoCategorias": "completo",
  "premiacaoPodios": "pendente_estruturacao",
  "observacao": "Não inventar pódios de Lovers se ainda não estiverem estruturados; usar posts oficiais ou preencher manualmente com os dados validados."
}
```

**O que propôs.** Dez anos: em vez de um tema novo, cada marca revisitou um universo marcante da história do festival e apresentou uma nova leitura. Não era repetir, era recriar.

**Por que marcou.** Lovers colocou no centro quem construiu o festival: as pessoas que acompanham as edições, montam roteiros, dividem combos, visitam bairros diferentes, fotografam, avaliam e indicam. Em dez anos o Sweet & Coffee Week construiu memória, comunidade e uma ligação forte com a cidade.

**Curiosidade.** Cinema, séries, música, viagens, contos de fadas, celebrações e referências potiguares voltaram em novas versões. Ao longo dos anos, grupos de amigos passaram a montar agenda para aproveitar melhor o festival, e dividir os combos virou estratégia comum para provar mais sabores.

**Legado.** A edição dos dez anos fechou uma etapa e abriu outra: o festival chegou a 2026 como encontro entre gastronomia, cultura, criatividade, marcas locais e pessoas.

**Marcas (21):** Adocee Doceria · Bolomania · Caffè Basilico’s · Canuto’s · Caroli Douces · Casa 1190 - Restaurant e Coffee · Casa de Taipa Tapiocaria · Delicato Bolos · Douce di Maria · Jolie Café Pâtisserie · Just Food&Coffee · Mangai · Mr. Cupcake Confeitaria · O Maestro Café · Olí Gastrô · Padoca do Bosque · Paneer Pâtisserie · Parma Doces · Rollab Confeitaria · Sweet Duo Confeitaria · Wow Cookies

**Pódios:**

> ⚠️ As categorias estão registradas, mas **os pódios desta edição não vivem aqui** —
> na base histórica eles estão vazios de propósito. O resultado oficial completo
> está em `src/data/loversAwardsResults.js` e foi transcrito na **seção 6.3**.

- **Melhor Combo** _(trilha: sweet lovers)_
- **Melhor Atendimento** _(trilha: sweet lovers)_
- **Melhor Criatividade** _(trilha: sweet lovers)_
- **Melhor Apresentação** _(trilha: sweet lovers)_
- **Melhor Doce** _(trilha: sweet lovers)_
- **Melhor Salgado** _(trilha: sweet lovers)_
- **Melhor Bebida** _(trilha: sweet lovers)_
- **Encantamento em Loja** _(trilha: sweet lovers)_

---

## 6. Sweet Awards

### 6.1 Como funciona hoje

Janela de votação da última edição: **2026-06-03T00:00:00-03:00** até **2026-06-15T23:59:59-03:00** (fuso de Natal/RN).

Escala de notas: **5 · 6 · 7 · 8 · 9 · 10** (5 menor, 10 maior).

São **7 categorias avaliadas no formulário**. "Melhor Combo" **não** é pergunta:
é derivado da média de Doce + Salgado + Bebida, calculado no banco.

| Categoria | Pergunta ao público | O que avalia |
| --- | --- | --- |
| **Atendimento** | Qual nota você dá para o atendimento? | Simpatia, agilidade e cuidado da equipe. |
| **Criatividade** | Qual nota você dá para a criatividade do combo? | Originalidade e ousadia na criação do combo. |
| **Apresentação** | Qual nota você dá para a apresentação do combo? | Capricho e beleza visual na montagem. |
| **Doce** | Qual nota você dá para o doce? | Sabor e qualidade do item doce. |
| **Salgado** | Qual nota você dá para o salgado? | Sabor e qualidade do item salgado. |
| **Bebida** | Qual nota você dá para a bebida? | Sabor e harmonia da bebida. |
| **Encantamento em Loja** | Qual nota você dá para o encantamento da loja com o tema? | Como a loja viveu o tema: ativação, ações, cenários, vestimenta diferenciada, espaço instagramável — tudo que encantou o público dentro da loja. |

**Dados de público captados junto com o voto** (obrigatórios):

- Gênero: Feminino · Masculino · Prefiro não informar · Outro
- Escolaridade: Ensino básico · Ensino médio · Ensino superior · Pós-graduação ou mais · Prefiro não informar
- Faixa etária: Até 17 · 18–24 · 25–39 · 40–59 · 60+

**Descrição pública de cada categoria:**

- **melhor_combo** — Reconhece o melhor combo da edição — média das notas de Doce, Salgado e Bebida.
- **envolvimento** — Reconhece a loja que mais viveu o tema: ativações, cenários, vestimenta e espaços instagramáveis.
- **apresentacao** — Reconhece o combo com melhor montagem, estética e impacto visual.
- **atendimento** — Reconhece o estabelecimento com melhor atendimento ao público.
- **criatividade** — Reconhece o combo com proposta mais criativa e conectada ao tema da edição.
- **salgado** — Reconhece o melhor item salgado entre os combos avaliados.
- **doce** — Reconhece o melhor item doce entre os combos avaliados.
- **bebida** — Reconhece a melhor bebida entre os combos avaliados.

### 6.2 Quem dá a nota — evolução

A régua mudou ao longo da história. Três momentos:

| Período | Quem julga |
| --- | --- |
| 2019 | Categoria única, sem trilhas |
| 2020.2 a 2021.2 | Júri Técnico **e** Sweet Lovers (trilhas separadas) |
| 2022 em diante | Só Sweet Lovers — o público |

Trilhas registradas na base: `juri_tecnico` · `sweet_lovers`.
Quando `trilha` é `null`, a peça de origem não distinguia trilha.

### 6.3 Resultado oficial da edição atual — Lovers 2026.1

> Resultado oficial da Premiação da 16ª edição do Sweet & Coffee Week Lovers.

⚠️ **Atenção de fonte:** na base histórica os pódios de 2026.1 estão vazios de
propósito. Os resultados da edição atual vivem em `src/data/loversAwardsResults.js`.

**Melhor Combo** `melhor_combo`

- 1º — O Maestro Café
- 2º — Mr. Cupcake Confeitaria
- 3º — Jolie Café Pâtisserie

**Melhor Atendimento** `atendimento`

- 1º — Rollab Confeitaria — 5 pontos
- 2º — O Maestro Café — 3 pontos
- 3º — Jolie Café Pâtisserie — 1 ponto

**Melhor Apresentação** `apresentacao`

- 1º — Just Food&Coffee — 5 pontos
- 2º — Mr. Cupcake Confeitaria — 3 pontos
- 3º — Paneer Pâtisserie — 2 pontos

**Melhor Doce** `doce`

- 1º — Jolie Café Pâtisserie — 5 pontos
- 2º — Douce di Maria — 3 pontos
- 3º — Parma Doces e Bolomania — 1 ponto _(empate)_

**Melhor Bebida** `bebida`

- 1º — Sweet Duo Confeitaria — 5 pontos
- 2º — Canuto’s e Casa 1190 - Restaurant e Coffee — 3 pontos _(empate)_
- 3º — Mr. Cupcake Confeitaria — 1 ponto

**Melhor Salgado** `salgado`

- 1º — O Maestro Café — 5 pontos
- 2º — Bolomania — 3 pontos
- 3º — Casa 1190 - Restaurant e Coffee — 1 ponto

**Melhor Criatividade** `criatividade`

- 1º — O Maestro Café — 5 pontos
- 2º — Mr. Cupcake Confeitaria — 3 pontos
- 3º — Bolomania — 1 ponto

**Encantamento em Loja** `envolvimento`

- 1º — Mr. Cupcake Confeitaria — 5 pontos
- 2º — Jolie Café Pâtisserie e O Maestro Café — 3 pontos _(empate)_
- 3º — Just Food&Coffee — 1 ponto

### 6.4 Hall dos mais premiados

Contagem de todas as colocações de pódio da história (45 marcas já subiram ao pódio).
Calculado somando a base histórica + o resultado oficial da 16ª edição.

| # | Marca | 1º | 2º | 3º | Total |
| --- | --- | --- | --- | --- | --- |
| 1 | Mr. Cupcake Confeitaria | 9 | 13 | 6 | **28** |
| 2 | Bocaditos | 13 | 6 | 7 | **26** |
| 3 | Marlon Vinicius | 8 | 5 | 11 | **24** |
| 4 | O Maestro Café | 8 | 9 | 4 | **21** |
| 5 | Atelier Mine Confeitaria | 0 | 9 | 5 | **14** |
| 6 | Duart's Confeitaria | 3 | 2 | 7 | **12** |
| 7 | Canuto's | 4 | 4 | 3 | **11** |
| 8 | Delicato | 4 | 5 | 1 | **10** |
| 9 | Jolie Café Pâtisserie | 3 | 2 | 4 | **9** |
| 10 | Bolomania | 2 | 3 | 2 | **7** |
| 11 | Casa dos Salgados Gourmet | 2 | 2 | 3 | **7** |
| 12 | Bell's Café | 3 | 1 | 2 | **6** |
| 13 | Just Food&Coffee | 1 | 2 | 3 | **6** |
| 14 | Delizeu | 0 | 1 | 5 | **6** |
| 15 | Cássia Ribeiro | 4 | 1 | 0 | **5** |
| 16 | Daniel Bezerra | 1 | 3 | 1 | **5** |
| 17 | Momento Gourmet | 1 | 1 | 3 | **5** |
| 18 | Sweet Duo Confeitaria | 2 | 0 | 2 | **4** |
| 19 | Rafaela Fontes Chocolateria | 1 | 3 | 0 | **4** |
| 20 | Adocee Doceria | 0 | 3 | 1 | **4** |
| 21 | Douce di Maria | 0 | 3 | 1 | **4** |
| 22 | Rollab Confeitaria | 2 | 0 | 1 | **3** |
| 23 | Caroli Douces | 1 | 0 | 2 | **3** |
| 24 | Recanto da Prosa | 1 | 0 | 2 | **3** |
| 25 | Cecília Mindêlo | 0 | 2 | 1 | **3** |
| 26 | Chocolatudos | 0 | 1 | 2 | **3** |
| 27 | Das Melo | 0 | 1 | 2 | **3** |
| 28 | Bendita Confeitaria | 1 | 1 | 0 | **2** |
| 29 | Chocolateria Sandra Maia | 1 | 1 | 0 | **2** |
| 30 | Cookorote | 1 | 0 | 1 | **2** |
| 31 | Very Sugar | 1 | 0 | 1 | **2** |
| 32 | Casa 1190 - Restaurant e Coffee | 0 | 1 | 1 | **2** |
| 33 | Dedo de Moça | 0 | 2 | 0 | **2** |
| 34 | Paneer Pâtisserie | 0 | 0 | 2 | **2** |
| 35 | Suisse Brownie | 0 | 0 | 2 | **2** |
| 36 | Bem Eu Confeitaria | 1 | 0 | 0 | **1** |
| 37 | Bistrô NL | 1 | 0 | 0 | **1** |
| 38 | Café Brigadeiro | 1 | 0 | 0 | **1** |
| 39 | Cuore di Panna | 1 | 0 | 0 | **1** |
| 40 | Jefferson Albano | 1 | 0 | 0 | **1** |
| 41 | Bella Douces | 0 | 0 | 1 | **1** |
| 42 | Canuto’s | 0 | 1 | 0 | **1** |
| 43 | Chapelatto Coffee Shop | 0 | 0 | 1 | **1** |
| 44 | Parma Doces | 0 | 0 | 1 | **1** |
| 45 | Sonho de Brownie | 0 | 0 | 1 | **1** |

### 6.5 Evolução das categorias

**18 categorias distintas** já foram julgadas na história do Sweet Awards.

| Categoria | Edições em que existiu |
| --- | --- |
| Encantamento de Loja | 2022 _(1)_ |
| Encantamento em Loja | 2026.1 _(1)_ |
| Melhor Apresentação | 2020.1, 2020.2, 2021.1, 2021.2, 2022, 2023, 2024, 2025, 2026.1 _(9)_ |
| Melhor Atendimento | 2020.1, 2020.2, 2021.1, 2021.2, 2022, 2023, 2024, 2025, 2026.1 _(9)_ |
| Melhor Bebida | 2021.1, 2021.2, 2022, 2023, 2024, 2025, 2026.1 _(7)_ |
| Melhor Combo | 2019.1, 2019.2, 2020.1, 2020.2, 2021.1, 2021.2, 2022, 2023, 2024, 2025, 2026.1 _(11)_ |
| Melhor Criatividade | 2020.1, 2020.2, 2021.1, 2021.2, 2022, 2023, 2024, 2025, 2026.1 _(9)_ |
| Melhor Delivery | 2020.1, 2021.1 _(2)_ |
| Melhor Delivery/Takeaway | 2021.2 _(1)_ |
| Melhor Doce | 2021.1, 2021.2, 2022, 2023, 2024, 2025, 2026.1 _(7)_ |
| Melhor Encantamento | 2023 _(1)_ |
| Melhor Encantamento em Loja | 2024 _(1)_ |
| Melhor Envolvimento | 2021.2 _(1)_ |
| Melhor Envolvimento/Encantamento em Loja | 2021.2 _(1)_ |
| Melhor Sabor | 2020.1, 2020.2, 2021.1, 2021.2 _(4)_ |
| Melhor Salgado | 2021.1, 2021.2, 2022, 2023, 2024, 2025, 2026.1 _(7)_ |
| Melhor Take Away | 2020.1 _(1)_ |
| Melhor Takeaway/Delivery | 2020.2 _(1)_ |

### 6.6 Empates registrados

16 empates na história. Cada colocação guarda um array `nomes`;
empate = mais de um nome na mesma posição.

| Edição | Categoria | Posição | Marcas |
| --- | --- | --- | --- |
| 2020.1 | Melhor Sabor | 2º | Atelier Mine Confeitaria e Rafaela Fontes Chocolateria |
| 2020.2 | Melhor Combo | 3º | Cookorote e Paneer Pâtisserie |
| 2021.1 | Melhor Combo | 2º | Atelier Mine Confeitaria e Bendita Confeitaria |
| 2022 | Melhor Apresentação | 2º | Canuto's e Daniel Bezerra |
| 2023 | Melhor Doce | 3º | Marlon Vinicius e Suisse Brownie |
| 2023 | Melhor Salgado | 2º | Douce di Maria e Dedo de Moça |
| 2023 | Melhor Bebida | 3º | Adocee Doceria e Marlon Vinicius |
| 2023 | Melhor Encantamento | 3º | Suisse Brownie e Duart's Confeitaria |
| 2023 | Melhor Atendimento | 3º | Sweet Duo Confeitaria e Duart's Confeitaria |
| 2023 | Melhor Criatividade | 3º | Duart's Confeitaria e Marlon Vinicius |
| 2023 | Melhor Apresentação | 3º | Douce di Maria e Marlon Vinicius |
| 2024 | Melhor Apresentação | 3º | Duart's Confeitaria e Just Food&Coffee |
| 2024 | Melhor Criatividade | 3º | Canuto's e Bocaditos |
| 2026.1 | Melhor Doce | 3º | Parma Doces e Bolomania |
| 2026.1 | Melhor Bebida | 2º | Canuto’s e Casa 1190 - Restaurant e Coffee |
| 2026.1 | Encantamento em Loja | 2º | Jolie Café Pâtisserie e O Maestro Café |

---

## 7. Participantes da edição atual (Lovers 2026.1)

**21 marcas.** Cada uma tem slug congelado — os QR Codes da edição
apontam para `/#/lovers/combos/{slug}` e **essas URLs não podem mudar**.

| Marca | Slug | Instagram | Bairro | Cidade | Tema escolhido | Unidades |
| --- | --- | --- | --- | --- | --- | --- |
| Adocee Doceria | `adocee-doceria` | @adoceedoceriaecreperia | Ponta Negra | Natal/RN | Brasil na Copa do Mundo | 1 |
| Bolomania | `bolomania` | @bolomania_natal | Ponta Negra | Natal/RN | Japão | 1 |
| Caffè Basilico's | `caffe-basilicos` | @caffe.basilicos | Petrópolis | Natal/RN | Viagem pela Itália | 1 |
| Canuto's | `canutos` | @canutos.coffee | Nova Parnamirim | Parnamirim/RN | Disney | 1 |
| Caroli Douces | `caroli-douces` | @carolidouces | Ponta Negra | Natal/RN | Caroli in Love: "É o amor" | 5 |
| Casa 1190 - Restaurant e Coffee | `casa-1190` | @sigacasa1190 | Lagoa Nova | Natal/RN | The Vampire Diaries | 1 |
| Casa de Taipa Tapiocaria | `casa-de-taipa-tapiocaria` | @casadetaipatapiocaria | Ponta Negra | Natal/RN | Aniversário de 25 anos | 1 |
| Delicato Bolos | `delicato-bolos` | @delicato_bolos | Potengi | Natal/RN | Confeitaria Francesa | 1 |
| Douce di Maria | `douce-di-maria` | @doucedimaria | Candelária | Natal/RN | Uma Volta ao Mundo da Doçura | 1 |
| Jolie Café Pâtisserie | `jolie-cafe-patisserie` | @joliecafepatisserie | Nova Parnamirim | Parnamirim/RN | São João | 4 |
| Just Food&Coffee | `just-food-coffee` | @just_foodcoffee_ | Capim Macio | Natal/RN | A Just Encantada | 1 |
| Mangai | `mangai` | @mangairestaurantes | Ponta Negra | Natal/RN | "Isso aqui tá bom demais" | 3 |
| Mr. Cupcake Confeitaria | `mr-cupcake-confeitaria` | @mrcupcakeconfeitaria | Candelária | Natal/RN | Harry Potter | 2 |
| O Maestro Café | `o-maestro-cafe` | @omaestrocafe | Barro Vermelho | Natal/RN | Sweet Lover Day | 1 |
| Olí Gastrô | `oli-gastro` | @oligastro.olimpo | Tirol | Natal/RN | Conexão Natal/Lisboa | 1 |
| Padoca do Bosque | `padoca-do-bosque` | @padocadobosque | Tirol | Natal/RN | Vamos Passear no Bosque | 1 |
| Paneer Pâtisserie | `paneer-patisserie` | @paneernatal | Tirol | Natal/RN | Chapeuzinho Vermelho | 1 |
| Parma Doces | `parma-doces` | @parmadoces | Capim Macio | Natal/RN | Festival da Primavera | 1 |
| Rollab Confeitaria | `rollab-confeitaria` | @sigarollab | Lagoa Nova | Natal/RN | "Asa Branca", de Luiz Gonzaga | 2 |
| Sweet Duo Confeitaria | `sweet-duo-confeitaria` | @sweetduoconfeitaria | Lagoa Seca | Natal/RN | "Magic Shop", do BTS | 1 |
| Wow Cookies | `wow-cookies` | @sigawowcookies | Capim Macio | Natal/RN | Caicó | 2 |

### 7.1 Ficha de cada participante

#### Adocee Doceria

- **Slug (congelado):** `adocee-doceria`
- **Instagram:** @adoceedoceriaecreperia
- **WhatsApp:** não registrado
- **Tema escolhido:** Brasil na Copa do Mundo
- **Edição temática:** Sweet Celebration
- **Logo:** /logos/participants/adocee-doceria.png
- **Unidades:** 1
  - **Ponta Negra** — Av. Praia de Ponta Negra, 8880, Ponta Negra, Natal/RN
    - Coordenadas: `-5.868422, -35.1827929`
    - Maps: https://maps.google.com/?cid=10659498387037037785
    - Horários: Segunda: 15h às 22h · Terça: 15h às 22h · Quarta: 15h às 22h · Quinta: 14h30 às 23h · Sexta: 14h30 às 23h · Sábado: 14h30 às 23h · Domingo: 12h às 22h

#### Bolomania

- **Slug (congelado):** `bolomania`
- **Instagram:** @bolomania_natal
- **WhatsApp:** não registrado
- **Tema escolhido:** Japão
- **Edição temática:** Sweet Trip
- **Logo:** /logos/participants/bolomania.png
- **Unidades:** 1
  - **Ponta Negra** — Av. Praia de Búzios, 9031, Ponta Negra, Natal/RN
    - Coordenadas: `-5.8758439, -35.1829647`
    - Maps: https://maps.google.com/?cid=11450492681847294540
    - Horários: Horário de funcionamento para o Sweet & Coffee Week: 12h às 20h

#### Caffè Basilico's

- **Slug (congelado):** `caffe-basilicos`
- **Instagram:** @caffe.basilicos
- **WhatsApp:** não registrado
- **Tema escolhido:** Viagem pela Itália
- **Edição temática:** Sweet Trip
- **Logo:** /logos/participants/caffe-basilicos.png
- **Unidades:** 1
  - **Petrópolis** — Av. Rodrigues Alves, 433, Petrópolis, Natal/RN
    - Coordenadas: `-5.7861202, -35.1977948`
    - Maps: https://maps.google.com/?cid=9124941309187684674
    - Horários: 11h às 19h

#### Canuto's

- **Slug (congelado):** `canutos`
- **Instagram:** @canutos.coffee
- **WhatsApp:** não registrado
- **Tema escolhido:** Disney
- **Edição temática:** Sweet Trip
- **Logo:** /logos/participants/canutos.png
- **Unidades:** 1
  - **Nova Parnamirim** — R. Aníbal Brandão, Nova Parnamirim, Parnamirim/RN
    - Coordenadas: `-5.895684, -35.2002278`
    - Maps: https://maps.app.goo.gl/Yq14NKKeBwzwjKst9
    - Horários: Segunda a sexta: 13h às 21h · Sábado e domingo: 13h às 20h

#### Caroli Douces

- **Slug (congelado):** `caroli-douces`
- **Instagram:** @carolidouces
- **WhatsApp:** não registrado
- **Tema escolhido:** Caroli in Love: "É o amor"
- **Edição temática:** Sweet Music
- **Logo:** /logos/participants/caroli-douces.png
- **Unidades:** 5
  - **Ponta Negra** — Av. Praia de Ponta Negra, 9060, Ponta Negra, Natal/RN
    - Coordenadas: `-5.8746828, -35.1802763`
    - Maps: https://maps.app.goo.gl/5YfTbqxQ39yH4PAU6
    - Horários: Segunda a sexta: 12h às 21h · Sábado e domingo: 12h às 21h30
  - **Nova Parnamirim** — Rio Grande Mall - Av. Ayrton Senna, 2441, Lojas 30/31, Nova Parnamirim, Parnamirim/RN
    - Coordenadas: `-5.883505, -35.2006692`
    - Maps: https://maps.app.goo.gl/YaA9x3z5daWyBg1L9
    - Horários: Segunda a sábado: 11h às 21h · Domingo: 12h às 20h
  - **Lagoa Seca** — R. Pres. Quaresma, 1232, Lagoa Seca, Natal/RN
    - Coordenadas: `-5.8057895, -35.2112178`
    - Maps: https://maps.app.goo.gl/GekJayYSUHoroLfv7
    - Horários: Todos os dias: 10h45 às 18h30
  - **Zona Norte** — Av. Sr. do Bonfim, 4037, Potengi, Natal/RN
    - Coordenadas: `-5.7539182, -35.2526801`
    - Maps: https://maps.app.goo.gl/CSQqySeqEzqSptHL6
    - Horários: Todos os dias: 12h às 19h30
  - **Lagoa Nova** — R. Almeida Barreto, 442, Lagoa Nova, Natal/RN
    - Coordenadas: `-5.8200523, -35.2055021`
    - Maps: https://maps.app.goo.gl/2ZGGDq997swC4Hzc9
    - Horários: Todos os dias: 12h às 19h

#### Casa 1190 - Restaurant e Coffee

- **Slug (congelado):** `casa-1190`
- **Instagram:** @sigacasa1190
- **WhatsApp:** não registrado
- **Tema escolhido:** The Vampire Diaries
- **Edição temática:** Sweet Series
- **Logo:** /logos/participants/casa-1190.png
- **Unidades:** 1
  - **Lagoa Nova** — Av. Xavier da Silveira, 1190, Lagoa Nova, Natal/RN
    - Coordenadas: `-5.823829, -35.2030473`
    - Maps: https://maps.google.com/?cid=12991928301385588552
    - Horários: Terça a domingo: 15h30 às 18h

#### Casa de Taipa Tapiocaria

- **Slug (congelado):** `casa-de-taipa-tapiocaria`
- **Instagram:** @casadetaipatapiocaria
- **WhatsApp:** não registrado
- **Tema escolhido:** Aniversário de 25 anos
- **Edição temática:** Sweet Celebration
- **Logo:** /logos/participants/casa-de-taipa-tapiocaria.png
- **Unidades:** 1
  - **Ponta Negra** — Av. Praia de Ponta Negra, 8868, Ponta Negra, Natal/RN
    - Coordenadas: `-5.8680281, -35.1830215`
    - Maps: https://maps.google.com/?cid=7706377528852827574
    - Horários: Segunda a sábado: 18h às 23h

#### Delicato Bolos

- **Slug (congelado):** `delicato-bolos`
- **Instagram:** @delicato_bolos
- **WhatsApp:** não registrado
- **Tema escolhido:** Confeitaria Francesa
- **Edição temática:** Sweet Trip
- **Logo:** /logos/participants/delicato-bolos.png
- **Unidades:** 1
  - **Potengi** — Av. Maranguape, 741, Potengi, Natal/RN
    - Coordenadas: `-5.7590543, -35.259236`
    - Maps: https://maps.google.com/?cid=7441970895626009538
    - Horários: Terça a sábado: 12h às 20h

#### Douce di Maria

- **Slug (congelado):** `douce-di-maria`
- **Instagram:** @doucedimaria
- **WhatsApp:** não registrado
- **Tema escolhido:** Uma Volta ao Mundo da Doçura
- **Edição temática:** Sweet Trip
- **Logo:** /logos/participants/douce-di-maria.png
- **Unidades:** 1
  - **Candelária** — Rua Ataulfo Alves, 3465, Candelária, Natal/RN
    - Coordenadas: `-5.8390956, -35.2154265`
    - Maps: https://maps.google.com/?cid=4959753408182331760
    - Horários: Segunda a sábado: 9h às 17h

#### Jolie Café Pâtisserie

- **Slug (congelado):** `jolie-cafe-patisserie`
- **Instagram:** @joliecafepatisserie
- **WhatsApp:** não registrado
- **Tema escolhido:** São João
- **Edição temática:** Sweet Celebration
- **Logo:** /logos/participants/jolie-cafe-patisserie.png
- **Unidades:** 4
  - **Cidade Verde** — Shopping Cidade Verde - Av. Ayrton Senna, 1904, Nova Parnamirim, Parnamirim/RN
    - Coordenadas: `-5.8966397, -35.1982122`
    - Maps: https://maps.google.com/?cid=6155464360832551674
    - Horários: Todos os dias: 12h às 20h
  - **Capim Macio** — Av. Miguel Alcídes de Araújo, 1908, Capim Macio, Natal/RN
    - Coordenadas: `-5.8472334, -35.206695`
    - Maps: https://maps.app.goo.gl/frf1Ev1PVanM2PRu8
    - Horários: Segunda a sábado: 12h às 20h · Domingo: 12h às 19h
  - **Petrópolis** — Av. Afonso Pena, 506, Tirol, Natal/RN
    - Coordenadas: `-5.7866015, -35.1969079`
    - Maps: https://maps.app.goo.gl/essQoAjgp3TJNKJK9
    - Horários: Segunda a sábado: 12h às 20h · Domingo: 12h às 19h
  - **Lagoa Nova** — Rua São José, 2184, Lagoa Nova, Natal/RN
    - Coordenadas: `-5.8210566, -35.2159141`
    - Maps: https://maps.app.goo.gl/Pr9TfSEuC5iJnoBo6
    - Horários: Segunda a sábado: 12h às 20h · Domingo: 12h às 19h

#### Just Food&Coffee

- **Slug (congelado):** `just-food-coffee`
- **Instagram:** @just_foodcoffee_
- **WhatsApp:** não registrado
- **Tema escolhido:** A Just Encantada
- **Edição temática:** Contos de Fada
- **Logo:** /logos/participants/just-food-coffee.png
- **Unidades:** 1
  - **Capim Macio** — Rua Dr. Orlando de Azevedo, 1981, Capim Macio, Natal/RN
    - Coordenadas: `-5.856683, -35.2022567`
    - Maps: https://maps.app.goo.gl/LAmKyybkSgtYqP4h8
    - Horários: 15h às 21h

#### Mangai

- **Slug (congelado):** `mangai`
- **Instagram:** @mangairestaurantes
- **WhatsApp:** não registrado
- **Tema escolhido:** "Isso aqui tá bom demais"
- **Edição temática:** Sweet Music
- **Logo:** /logos/participants/mangai.png
- **Unidades:** 3
  - **Ponta Negra** — Rua Des. João Vicente da Costa, 8861, Ponta Negra, Natal/RN
    - Coordenadas: `-5.8670956, -35.1814933`
    - Maps: https://maps.app.goo.gl/GhyRCoy98VVLMJtf7
    - Horários: 18h às 22h
  - **Lagoa Nova** — Av. Amintas Barros, 3300 - Lagoa Nova, Natal - RN, 59075-250, Lagoa Nova, Natal/RN
    - Coordenadas: `-5.819761, -35.212238`
    - Maps: https://maps.app.goo.gl/6EtKEgbbjwLUVFJRA
    - Horários: 18h às 22h
  - **Midway** — Av. Nevaldo Rocha, 3775 - Tirol, Área Gourmet, Piso L3, Tirol, Natal/RN
    - Coordenadas: `-5.8113416, -35.2054806`
    - Maps: https://maps.app.goo.gl/ZJPDbn6Jd5D1oPNK6
    - Horários: 18h às 22h

#### Mr. Cupcake Confeitaria

- **Slug (congelado):** `mr-cupcake-confeitaria`
- **Instagram:** @mrcupcakeconfeitaria
- **WhatsApp:** não registrado
- **Tema escolhido:** Harry Potter
- **Edição temática:** Filmes
- **Logo:** /logos/participants/mr-cupcake-confeitaria.png
- **Unidades:** 2
  - **Candelária** — Rua Frei Henrique de Coimbra, 3482, Candelária, Natal/RN
    - Coordenadas: `-5.8394768, -35.2152597`
    - Maps: https://maps.app.goo.gl/WPf474uvEpgpnXFx6
    - Horários: 12h às 19h
  - **Cidade Satélite** — Rua Oiti, 20, Loja 03, Pitimbu, Natal/RN
    - Coordenadas: `-5.8735183, -35.2244843`
    - Maps: https://maps.app.goo.gl/Rb9rjDQiivXLJ6Ft5
    - Horários: 11h às 20h

#### O Maestro Café

- **Slug (congelado):** `o-maestro-cafe`
- **Instagram:** @omaestrocafe
- **WhatsApp:** não registrado
- **Tema escolhido:** Sweet Lover Day
- **Edição temática:** Sweet Celebration
- **Logo:** /logos/participants/o-maestro-cafe.png
- **Unidades:** 1
  - **Barro Vermelho** — Rua Pinheiro Borges, 648, Barro Vermelho, Natal/RN
    - Coordenadas: `-5.7962639, -35.2107899`
    - Maps: https://maps.google.com/?cid=9380843386229300776
    - Horários: 12h às 19h30

#### Olí Gastrô

- **Slug (congelado):** `oli-gastro`
- **Instagram:** @oligastro.olimpo
- **WhatsApp:** não registrado
- **Tema escolhido:** Conexão Natal/Lisboa
- **Edição temática:** Sweet Trip
- **Logo:** /logos/participants/oli-gastro.png
- **Unidades:** 1
  - **Tirol** — Sede do América - Av. Rodrigues Alves, 950, Tirol, Natal/RN
    - Coordenadas: `-5.7943141, -35.2013458`
    - Maps: https://maps.google.com/?cid=11078498997587378404
    - Horários: Segunda a sábado: 15h às 18h

#### Padoca do Bosque

- **Slug (congelado):** `padoca-do-bosque`
- **Instagram:** @padocadobosque
- **WhatsApp:** não registrado
- **Tema escolhido:** Vamos Passear no Bosque
- **Edição temática:** Contos de Fadas
- **Logo:** /logos/participants/padoca-do-bosque.png
- **Unidades:** 1
  - **Tirol** — Av. Alm. Alexandrino de Alencar, 1398, Tirol, Natal/RN
    - Coordenadas: `-5.8086907, -35.2008022`
    - Maps: https://maps.google.com/?cid=8730356709231337200
    - Horários: Segunda a sábado: 6h às 20h30 · Domingo: 6h às 19h30

#### Paneer Pâtisserie

- **Slug (congelado):** `paneer-patisserie`
- **Instagram:** @paneernatal
- **WhatsApp:** não registrado
- **Tema escolhido:** Chapeuzinho Vermelho
- **Edição temática:** Contos de Fadas
- **Logo:** /logos/participants/paneer-patisserie.png
- **Unidades:** 1
  - **Tirol** — Espaço Casa 893 - Av. Afonso Pena, 893, Tirol, Natal/RN
    - Coordenadas: `-5.7933734, -35.1989566`
    - Maps: https://maps.app.goo.gl/nXspbRTLYizsE7838
    - Horários: Segunda a sexta: 8h às 19h · Sábado e domingo: 7h às 18h

#### Parma Doces

- **Slug (congelado):** `parma-doces`
- **Instagram:** @parmadoces
- **WhatsApp:** não registrado
- **Tema escolhido:** Festival da Primavera
- **Edição temática:** Sweet Celebration
- **Logo:** /logos/participants/parma-doces.png
- **Unidades:** 1
  - **Capim Macio** — Dunnas Shopping - Av. Engenheiro Roberto Freire, 2632, Loja A05/A06, Capim Macio, Natal/RN
    - Coordenadas: `-5.8634359, -35.189333`
    - Maps: https://maps.google.com/?cid=1076074248665951297
    - Horários: Terça a Sábado: 12h às 19h · Domingo e feriado: 12h às 18h

#### Rollab Confeitaria

- **Slug (congelado):** `rollab-confeitaria`
- **Instagram:** @sigarollab
- **WhatsApp:** não registrado
- **Tema escolhido:** "Asa Branca", de Luiz Gonzaga
- **Edição temática:** Sweet Music
- **Logo:** /logos/participants/rollab-confeitaria.png
- **Unidades:** 2
  - **Lagoa Nova** — Rua Almeida Barreto, 430, Lagoa Nova, Natal/RN
    - Coordenadas: `-5.8197845, -35.2062818`
    - Maps: https://maps.google.com/?cid=17531256088081568032
    - Horários: Segunda a sexta: 11h às 20h · Sábado e domingo: 13h às 19h
  - **Tirol - AABB** — Avenida Hermes da Fonseca, 1017, Tirol. Dentro da AABB., Tirol, Natal/RN
    - Coordenadas: `-5.796705, -35.1987711`
    - Maps: https://maps.app.goo.gl/dZyNYEXyxngv62H76
    - Horários: Segunda a sexta: 13h às 21h · Sábado, domingo e feriado: 10h30 às 16h30

#### Sweet Duo Confeitaria

- **Slug (congelado):** `sweet-duo-confeitaria`
- **Instagram:** @sweetduoconfeitaria
- **WhatsApp:** não registrado
- **Tema escolhido:** "Magic Shop", do BTS
- **Edição temática:** Sweet Music
- **Logo:** /logos/participants/sweet-duo-confeitaria.png
- **Unidades:** 1
  - **Lagoa Seca** — Rua Antônio China, 490, Lagoa Seca, Natal/RN
    - Coordenadas: `-5.8063977, -35.2072515`
    - Maps: https://maps.google.com/?cid=17845245524481505898
    - Horários: 14h às 20h

#### Wow Cookies

- **Slug (congelado):** `wow-cookies`
- **Instagram:** @sigawowcookies
- **WhatsApp:** não registrado
- **Tema escolhido:** Caicó
- **Edição temática:** Terras Potiguares
- **Logo:** /logos/participants/wow-cookies.png
- **Unidades:** 2
  - **Capim Macio** — Vela Trade - Rua Neuza Farache, 1870, Loja 6, Capim Macio, Natal/RN
    - Coordenadas: `-5.8587143, -35.1987554`
    - Maps: https://maps.google.com/?cid=1695958296571675087
    - Horários: Terça a domingo: 11h às 19h
  - **Tirol** — Rua Jundiaí, 438, Tirol, Loja 4 - Aliança Mall, Tirol, Natal/RN
    - Coordenadas: `-5.7893256, -35.2024926`
    - Maps: https://maps.app.goo.gl/479r2zt13dJyKm1JA
    - Horários: Terça a domingo: 11h às 19h

---

## 8. Todas as marcas da história

**131 nomes distintos** aparecem nas listas de participantes das 16 edições.

⚠️ Nome distinto ≠ marca distinta: a base tem `participantAliases` para reconciliar
grafias (a mesma casa aparece com nomes diferentes ao longo dos anos). Um site novo
deveria normalizar isso na origem.

**Aliases registrados:**

```json
{
  "Mr. Cupcake": [
    "Mr Cupcake",
    "Mr. Cupcake",
    "Mr. Cupcake Confeitaria"
  ],
  "Canuto's": [
    "Canutos",
    "Canuto's",
    "Canuto’s"
  ],
  "Duart's": [
    "Duarts",
    "Duart's",
    "Duart’s",
    "Duart's Confeitaria",
    "Duart’s Confeitaria"
  ],
  "Suisse Brownie": [
    "Suisse",
    "Suisse Brownie",
    "Swiss Brownie"
  ],
  "O Maestro Café": [
    "O Maestro",
    "O Maestro Café",
    "O Maestro Café & Art"
  ],
  "Just Food&Coffee": [
    "Just",
    "Just Coffee",
    "Just Food&Coffee"
  ],
  "Bocaditos": [
    "Bocaditos",
    "Bocaditos Doceria & Café",
    "Bocaditos Confeitaria Artesanal"
  ],
  "Cecília Mindêlo": [
    "Cecilia Mindelo",
    "Cecília Mindêlo",
    "Cecilia Brownie",
    "Cecilia Mindêlo Brownies",
    "Cecilia Mindêlo"
  ],
  "Caroli Douces": [
    "Caroli",
    "Caroli Douces"
  ],
  "Bella Douces": [
    "Bella Petit",
    "Bella Peti",
    "Bella Pettit",
    "Bella Douces"
  ],
  "Atelier Mine": [
    "Atelier Mine",
    "Atelier Mine Confeitaria",
    "Mine",
    "Mine Confeitaria"
  ],
  "Marlon Vinicius": [
    "Marlon",
    "Marlon Vinicius",
    "Marlon Gastronomia",
    "Marlon Doceria"
  ],
  "Bolomania": [
    "Bolo Mania",
    "Bolomania"
  ],
  "Very Sugar": [
    "Very Sugar",
    "Verysugar"
  ],
  "Chocolatudos": [
    "Chocolatudos",
    "Chocolatudo",
    "Chocolatudos por Laís"
  ],
  "Casa dos Salgados Gourmet": [
    "Casa dos Salgados",
    "Casa dos Salgados Gourmet"
  ],
  "Jolie": [
    "Jolie",
    "Jolie Pâtisserie",
    "Jolie Café Pâtisserie",
    "Jolie Parissiere"
  ],
  "Parma Doces": [
    "Parma",
    "Parma Doces"
  ],
  "Delicato": [
    "Delicato",
    "Delicato Bolos"
  ],
  "Rollab": [
    "Rollab",
    "Rollab Confeitaria"
  ],
  "Paneer": [
    "Paneer",
    "Paneer Pâtisserie",
    "Paneer Patisserie"
  ],
  "Bell's Café": [
    "Bell's",
    "Bell's Café",
    "Bell's Cafeteria"
  ],
  "LaSweets por Larissa Pio": [
    "La Sweets",
    "LaSweets",
    "LaSweets por Larissa Pio"
  ],
  "Jona's Cakes": [
    "Jana's Cakes",
    "Jana's Cake",
    "Jona's Cakes"
  ],
  "Boca D'Água": [
    "Boca D'Água",
    "Boca D'Água Delicatessen"
  ],
  "Rafaela Fontes Chocolateria": [
    "Rafaela Fontes",
    "Rafaela Fontes Chocolateria",
    "Chocolateria Rafaela Fontes"
  ],
  "Chocolateria Sandra Maia": [
    "Sandra Maia",
    "Chocolateria Sandra Maia"
  ],
  "Berlin Cafeteria": [
    "Berlin",
    "Berlim",
    "Berlin Cafeteria"
  ],
  "FitNeza Coffee": [
    "Fitneza",
    "FitNeza Coffee"
  ],
  "Realize Gourmet": [
    "Realize",
    "Realize Gourmet"
  ],
  "Daguia Tortas Finas": [
    "Daguia",
    "Daguia Tortas Finas"
  ],
  "Crooks Cookies": [
    "Crooks",
    "Crooks Cookies"
  ],
  "Frans Café": [
    "Frans Café",
    "Franz Café",
    "Frans Cidade Jardim",
    "Frans Cidade Verde"
  ],
  "Balzac Café": [
    "Balzac Café",
    "Siga Balzac",
    "Siga Balzac Café"
  ],
  "Flora Cafeteria": [
    "Flora Cafeteria",
    "Flora Café"
  ],
  "Casa de Taipa Tapiocaria": [
    "Casa de Taipa",
    "Casa de Taipa Tapiocaria"
  ],
  "Lulu Café": [
    "Lulu Café",
    "Lulu Cake"
  ],
  "Caramel Healthy Food": [
    "Caramel",
    "Caramel Healthy Food"
  ],
  "Casa Bauducco": [
    "Casa Bauduco",
    "Casa Baudocco",
    "Casa Bauducco"
  ],
  "Adocee Doceria": [
    "Adocee",
    "Adocee Doceria"
  ],
  "Sweet Duo Confeitaria": [
    "Sweet Duo",
    "Sweet Duo Confeitaria"
  ],
  "Wanessa Cakes": [
    "Wanessa Cake",
    "Wanessa Cakes"
  ],
  "Chefit": [
    "Chefit",
    "Chef Fits"
  ],
  "Bem Eu Confeitaria": [
    "Bem Eu",
    "Bem Eu Confeitaria"
  ],
  "Sodiê Doces": [
    "Sodiê",
    "Sodiê Doces"
  ],
  "Edileuza Doces Finos": [
    "Edileuza Doces",
    "Edileuza Doces Finos"
  ],
  "Pinga Fogo Doceria": [
    "Pinga Fogo",
    "Pinga Fogo Doceria"
  ]
}
```

| Marca | Participações | Edições |
| --- | --- | --- |
| Caroli Douces | 14 | 2017.2, 2018.1, 2018.2, 2019.1, 2019.2, 2020.1, 2020.2, 2021.1, 2021.2, 2022, 2023, 2024, 2025, 2026.1 |
| Bocaditos | 12 | 2016, 2017.1, 2017.2, 2019.1, 2019.2, 2020.1, 2020.2, 2021.1, 2021.2, 2022, 2023, 2024 |
| Cecília Mindêlo | 12 | 2016, 2017.1, 2017.2, 2018.1, 2018.2, 2019.1, 2019.2, 2020.1, 2020.2, 2021.1, 2021.2, 2022 |
| Suisse Brownie | 12 | 2017.2, 2018.1, 2018.2, 2019.1, 2019.2, 2020.2, 2021.1, 2021.2, 2022, 2023, 2024, 2025 |
| Very Sugar | 11 | 2017.1, 2017.2, 2018.1, 2018.2, 2019.1, 2019.2, 2020.1, 2020.2, 2021.1, 2021.2, 2022 |
| Rafaela Fontes Chocolateria | 10 | 2016, 2017.1, 2017.2, 2018.1, 2018.2, 2019.1, 2019.2, 2020.1, 2020.2, 2021.1 |
| Jolie Café Pâtisserie | 9 | 2016, 2017.1, 2017.2, 2018.2, 2019.1, 2019.2, 2020.2, 2025, 2026.1 |
| Mr. Cupcake Confeitaria | 9 | 2018.1, 2018.2, 2019.1, 2019.2, 2020.2, 2021.1, 2021.2, 2025, 2026.1 |
| Parma Doces | 9 | 2018.1, 2018.2, 2019.1, 2019.2, 2021.2, 2023, 2024, 2025, 2026.1 |
| Realize Gourmet | 9 | 2016, 2017.1, 2017.2, 2018.1, 2018.2, 2019.1, 2019.2, 2020.1, 2020.2 |
| Chocolateria Sandra Maia | 7 | 2017.1, 2017.2, 2018.1, 2018.2, 2021.2, 2022, 2023 |
| Mangai | 7 | 2020.2, 2021.1, 2022, 2023, 2024, 2025, 2026.1 |
| Boca D'Água | 6 | 2016, 2017.1, 2017.2, 2018.2, 2019.1, 2019.2 |
| Café Brigadeiro | 6 | 2019.1, 2019.2, 2020.1, 2020.2, 2021.1, 2021.2 |
| Chapelatto Coffee Shop | 6 | 2016, 2017.1, 2018.1, 2018.2, 2019.1, 2019.2 |
| Das Melo | 6 | 2018.2, 2019.1, 2019.2, 2020.1, 2020.2, 2021.1 |
| Jana's Cakes | 6 | 2016, 2017.1, 2017.2, 2018.1, 2018.2, 2019.2 |
| LaSweets por Larissa Pio | 6 | 2016, 2017.2, 2018.1, 2018.2, 2019.1, 2019.2 |
| Marlon Vinicius | 6 | 2021.1, 2021.2, 2022, 2023, 2024, 2025 |
| Paneer Pâtisserie | 6 | 2019.2, 2020.2, 2021.1, 2021.2, 2025, 2026.1 |
| Adocee Doceria | 5 | 2022, 2023, 2024, 2025, 2026.1 |
| Atelier Mine Confeitaria | 5 | 2019.2, 2020.1, 2020.2, 2021.1, 2021.2 |
| Barões do Café | 5 | 2016, 2017.1, 2017.2, 2018.1, 2018.2 |
| Bell's Café | 5 | 2020.2, 2021.1, 2021.2, 2022, 2024 |
| Bolo da Vovó | 5 | 2017.2, 2018.1, 2018.2, 2019.1, 2019.2 |
| Casa Nacre | 5 | 2019.1, 2019.2, 2020.1, 2020.2, 2021.1 |
| Crooks Cookies | 5 | 2017.2, 2018.1, 2018.2, 2019.1, 2019.2 |
| Duart's Confeitaria | 5 | 2021.2, 2022, 2023, 2024, 2025 |
| Sweet Duo Confeitaria | 5 | 2022, 2023, 2024, 2025, 2026.1 |
| Berlin Cafeteria | 4 | 2017.1, 2017.2, 2018.1, 2018.2 |
| Cacau Show | 4 | 2018.2, 2019.1, 2019.2, 2021.1 |
| Canuto's | 4 | 2022, 2023, 2024, 2025 |
| Casa de Taipa Tapiocaria | 4 | 2017.1, 2019.2, 2020.2, 2026.1 |
| Delicato | 4 | 2022, 2023, 2024, 2025 |
| FitNeza Coffee | 4 | 2017.1, 2018.1, 2018.2, 2019.1 |
| Frans Café | 4 | 2019.1, 2019.2, 2020.2, 2021.1 |
| Just Food&Coffee | 4 | 2023, 2024, 2025, 2026.1 |
| O Maestro Café | 4 | 2023, 2024, 2025, 2026.1 |
| Wow Cookies | 4 | 2023, 2024, 2025, 2026.1 |
| Aroma Café | 3 | 2022, 2023, 2025 |
| Aumer Restaurante | 3 | 2021.1, 2021.2, 2022 |
| Bella Petit | 3 | 2020.1, 2020.2, 2021.1 |
| Bem Eu Confeitaria | 3 | 2021.1, 2021.2, 2022 |
| Bolomania | 3 | 2024, 2025, 2026.1 |
| Caramel Healthy Food | 3 | 2022, 2024, 2025 |
| Casa dos Salgados Gourmet | 3 | 2020.1, 2020.2, 2021.1 |
| Cássia Ribeiro | 3 | 2021.1, 2021.2, 2022 |
| Chocolatudos | 3 | 2020.2, 2021.1, 2021.2 |
| Cookorote | 3 | 2019.2, 2020.1, 2020.2 |
| Cuore di Panna | 3 | 2019.1, 2019.2, 2020.1 |
| Daguia Tortas Finas | 3 | 2017.2, 2018.1, 2018.2 |
| Dedo de Moça | 3 | 2022, 2023, 2024 |
| Doce Lelê | 3 | 2021.2, 2022, 2023 |
| Douce di Maria | 3 | 2022, 2023, 2026.1 |
| Edileuza Doces Finos | 3 | 2018.2, 2019.2, 2020.2 |
| Fabiana Melo | 3 | 2023, 2024, 2025 |
| Momento Gourmet | 3 | 2020.1, 2020.2, 2021.1 |
| Rádio Café | 3 | 2021.1, 2022, 2023 |
| Sodiê Doces | 3 | 2018.2, 2019.1, 2019.2 |
| Wanessa Cakes | 3 | 2022, 2023, 2024 |
| A Doceria | 2 | 2018.1, 2018.2 |
| Balzac Café | 2 | 2019.1, 2019.2 |
| Bella Douces | 2 | 2024, 2025 |
| Bendita Confeitaria | 2 | 2021.1, 2021.2 |
| Café Leviz | 2 | 2021.1, 2022 |
| Caffeina | 2 | 2019.1, 2019.2 |
| Carcará | 2 | 2023, 2024 |
| Carol Dantas | 2 | 2021.1, 2021.2 |
| Casa Bauducco | 2 | 2024, 2025 |
| Daniel Bezerra | 2 | 2022, 2023 |
| Delizeu | 2 | 2020.2, 2021.2 |
| Engenho Doce | 2 | 2017.1, 2017.2 |
| Flor e Flor | 2 | 2019.1, 2019.2 |
| Flora Cafeteria | 2 | 2019.1, 2019.2 |
| Jefferson Albano | 2 | 2023, 2024 |
| Lu Doces | 2 | 2023, 2024 |
| Lulu Café | 2 | 2021.1, 2021.2 |
| Padoca do Bosque | 2 | 2025, 2026.1 |
| Petit Poti | 2 | 2022, 2023 |
| Petra Holanda | 2 | 2020.1, 2022 |
| Pinga Fogo Doceria | 2 | 2017.2, 2019.2 |
| Recanto da Prosa | 2 | 2021.2, 2022 |
| Rollab Confeitaria | 2 | 2025, 2026.1 |
| Sonho de Brownie | 2 | 2019.1, 2019.2 |
| Bistrô NL | 1 | 2022 |
| Café com Bike | 1 | 2020.2 |
| Café da Ordem | 1 | 2017.2 |
| Caffè Basilico’s | 1 | 2026.1 |
| Camila Melo | 1 | 2019.2 |
| Canuto’s | 1 | 2026.1 |
| Caracol | 1 | 2023 |
| Casa 1190 - Restaurant e Coffee | 1 | 2026.1 |
| Casa Moscou | 1 | 2024 |
| Chef Fits | 1 | 2019.2 |
| Chefit | 1 | 2021.2 |
| Croasonho | 1 | 2017.2 |
| Crooks Cookie Shop | 1 | 2020.1 |
| Da Terra | 1 | 2021.2 |
| Dekacau | 1 | 2023 |
| Delicato Bolos | 1 | 2026.1 |
| Diva Café | 1 | 2024 |
| Doce Arthe Confeitaria | 1 | 2017.1 |
| Doce Suspiro | 1 | 2022 |
| Dolce Gelato | 1 | 2020.2 |
| Douce Bien | 1 | 2021.2 |
| Estação Açaí | 1 | 2025 |
| Frans Cidade Jardim | 1 | 2021.2 |
| Frans Cidade Verde | 1 | 2021.2 |
| Fritz | 1 | 2017.2 |
| Kale do Bem | 1 | 2023 |
| Kfé da Vila | 1 | 2022 |
| KNVE Casa Café | 1 | 2022 |
| Kopenhagen | 1 | 2020.1 |
| Le Paradis | 1 | 2021.2 |
| Liliane Moura Confiserie | 1 | 2016 |
| Margarita Café & Ateliê de Doces | 1 | 2016 |
| Mint Coffee | 1 | 2023 |
| Nick Buffet | 1 | 2019.2 |
| Olí Gastrô | 1 | 2026.1 |
| Papo de Anjo | 1 | 2020.1 |
| Pudinharia | 1 | 2023 |
| Puro Café | 1 | 2024 |
| Rosa Lemos Chocolate & Café | 1 | 2016 |
| Royal Trudel | 1 | 2021.1 |
| Sol e Café | 1 | 2024 |
| Stephany Santos | 1 | 2020.1 |
| Supermercado Nordestão | 1 | 2022 |
| Território Mexicano | 1 | 2025 |
| TuttiMac | 1 | 2017.1 |
| Wolya Pedrosa | 1 | 2022 |
| Xodó | 1 | 2023 |

---

## 9. Acervo de imagens disponível no site

| Pasta | Arquivos | Para que serve |
| --- | --- | --- |
| `public/images/edicoes/` | 190 | fotos por edição (`/images/edicoes/<code>/`) |
| `public/images/combos/` | 229 | foto do combo de cada participante (`/images/combos/<slug>/main.jpg`) |
| `public/images/marcas-edicoes/` | 16 | marca visual de cada edição |
| `public/images/momentos/` | 12 | registros de público e de rua |
| `public/images/campanha/` | 19 | peças e bastidores de campanha |
| `public/images/imprensa/` | 4 | registros em TV e veículos |
| `public/images/shapes/` | 2 | formas de apoio gráfico |
| `public/logos/participants/` | 21 | logo real de cada participante |

**Fora do repositório:** o acervo bruto (~58 GB) vive em `acervo-bruto/` na raiz,
fora do `public/` e fora do git. Foi movido para lá porque o Vite copiava tudo a cada build.

⚠️ **Nada gerado por IA entra como registro do festival.** O acervo externo tem pelo
menos uma peça assim (um mapa falso da Rota da Doçura com texto deformado). Sinais de
alerta: nome tipo "Imagem N gerada", texto ilegível, logo com forma inconsistente.

⚠️ **Nome de pasta do acervo não descreve o conteúdo** — já falhou duas vezes
("encantamento em loja" e "patrocínios e apoios" eram fotos de festa a fantasia).

---

## 10. Central de dúvidas — as 93 perguntas

Fonte única: `src/data/faqCentral.js`. Alimenta a interface e o schema `FAQPage`.

**Dados da edição usados nas respostas** (mudam a cada edição — ficam isolados em `EDICAO`):

```json
{
  "tema": null,
  "periodo": null,
  "duracao": null,
  "valorCombo": null,
  "formatoCombo": "1 doce + 1 salgado + 1 bebida",
  "cidades": "Natal e Parnamirim",
  "avaliacoes": null,
  "resultados": null,
  "ultima": {
    "code": "2026.1",
    "tema": "Lovers",
    "periodo": "4 a 14 de junho de 2026",
    "valorCombo": "R$ 38,90",
    "edicoes": 16
  }
}
```

**Aviso padrão:** As informações serão divulgadas no site e nos canais oficiais do Sweet & Coffee Week.

| Assunto | Perguntas |
| --- | --- |
| Sobre o festival | 9 |
| Edição atual | 7 |
| Combos e estabelecimentos | 10 |
| Atendimento e consumo | 10 |
| Ingredientes e acessibilidade | 7 |
| Rota da Doçura | 9 |
| Sweet Awards | 13 |
| Participação de estabelecimentos | 13 |
| Parcerias, imprensa e criadores | 8 |
| Suporte e problemas | 7 |
| **Total** | **93** |

### Sobre o festival

**O que é o Sweet & Coffee Week?**

O Sweet & Coffee Week é um festival gastronômico criado em Natal, em 2016. Em cada edição, cafeterias, docerias, confeitarias, restaurantes e outras marcas participantes desenvolvem combos e experiências exclusivas inspirados em um tema central.
Tradicionalmente, o combo reúne um doce, um salgado e uma bebida por um valor definido para a edição.

**Como funciona o festival?**

O público consulta os participantes, conhece os combos disponíveis e escolhe quais estabelecimentos quer visitar. Cada marca cria uma receita própria para o tema da edição, seguindo as regras gerais definidas pela organização.

**O Sweet & Coffee Week acontece em um único local?**

Não. O festival funciona como um circuito realizado nos próprios estabelecimentos participantes. Endereços e horários ficam disponíveis no site e no mapa oficial da edição.

**Quem pode participar do festival como público?**

Qualquer pessoa pode visitar os estabelecimentos e consumir os combos. Não é necessário fazer inscrição para participar do circuito.

**Preciso comprar ingresso?**

Não. O acesso ao festival é gratuito. O público paga apenas pelos produtos consumidos em cada estabelecimento.

**O festival acontece somente em Natal?**

Natal é a principal cidade do circuito. Dependendo da edição, também há participantes em Parnamirim ou em outros municípios da região metropolitana.

**Por que cada edição tem um tema?**

O tema orienta a criação dos combos, das apresentações e das experiências oferecidas pelas marcas. Ao longo da história, o festival já trabalhou referências como infância, música, cinema, livros, viagens, cultura potiguar e celebrações.

**Quem são os Sweet Lovers?**

Sweet Lovers é o nome dado à comunidade de pessoas que acompanha, visita, compartilha, avalia e ajuda a construir a história do Sweet & Coffee Week. O termo representa os fãs do festival, e não apenas quem consome uma vez.

**Quem idealizou o Sweet & Coffee Week?**

O festival foi idealizado por Eline Eulália e desenvolvido como uma plataforma de experiências gastronômicas, fortalecimento de marcas locais e conexão entre público, criatividade e cidade.

### Edição atual

**Quando acontece a próxima edição?**

As datas são divulgadas no site e nos canais oficiais do Sweet & Coffee Week. Como o calendário muda a cada edição, consulte sempre as informações da edição vigente.

**Quanto tempo dura o festival?**

A duração é definida pela organização de cada edição. Normalmente, o circuito acontece durante vários dias consecutivos, incluindo mais de um fim de semana.

**Qual é o tema da edição atual?**

O tema aparece na página principal da edição, com a proposta, a identidade visual e as regras criativas para os participantes.

**Qual é o valor do combo?**

O valor oficial é anunciado antes do início de cada edição. Todos os estabelecimentos respeitam o preço definido para o combo oficial, salvo produtos adicionais pedidos pelo cliente.

**O preço é o mesmo em todos os estabelecimentos?**

O valor do combo oficial é padronizado. Pedidos extras, substituições, adicionais, taxa de entrega e outros produtos do cardápio podem ter cobrança separada.

**O combo fica disponível depois do encerramento?**

Não há garantia. Os combos são criações especiais para o período do festival. Depois do encerramento, cada estabelecimento decide se mantém algum produto no cardápio.

**Onde acompanho novidades e mudanças da programação?**

As atualizações são publicadas no site e nos canais oficiais do Sweet & Coffee Week. Mudanças de horário, indisponibilidade e comunicados específicos também podem ser divulgados pelos próprios participantes.

### Combos e estabelecimentos

**Os combos são iguais em todos os estabelecimentos?**

Não. Todos seguem a estrutura e o tema da edição, mas cada participante desenvolve receitas, nomes, apresentações e experiências próprias.

**O que normalmente vem no combo?**

O formato tradicional reúne um doce, um salgado e uma bebida. A composição exata pode ser adaptada pela organização em edições especiais.

**Posso comprar apenas uma parte do combo?**

O preço promocional corresponde ao combo completo. A venda separada dos itens depende da disponibilidade e da política de cada estabelecimento, e pode ter outro valor.

**Posso trocar um item do combo?**

As substituições dependem do estabelecimento. Como o combo foi desenvolvido como uma experiência completa, algumas trocas podem não ser possíveis ou podem alterar o preço e a proposta original.

**Os produtos são criados especialmente para o festival?**

Sim. O combo oficial é desenvolvido para a edição e segue o tema, as regras e os critérios definidos pela organização.

**Existe limite de combos por pessoa?**

Normalmente não. O estabelecimento pode estabelecer limites temporários quando houver grande demanda ou estoque reduzido.

**Os combos podem acabar antes do fim do dia?**

Sim. Os produtos dependem da capacidade de produção e da disponibilidade de ingredientes de cada participante. Em dias de maior movimento, alguns itens podem se esgotar.

**Como encontro participantes, endereços e horários?**

As informações ficam reunidas no site e no mapa oficial da edição. Antes de sair, confirme o horário no perfil ou no canal de atendimento do estabelecimento.

**Todos os estabelecimentos participam durante todos os dias?**

Nem sempre. Cada participante segue seus próprios dias e horários de funcionamento, e algumas marcas podem não abrir em determinados dias da semana.

**Posso montar um roteiro com vários participantes?**

Sim. A proposta do festival é estimular a descoberta de diferentes marcas e endereços. O mapa pode ser usado para organizar visitas por região, horário ou combo de interesse.

### Atendimento e consumo

**Preciso fazer reserva?**

Depende do estabelecimento. Em locais pequenos, para grupos maiores ou em horários de grande movimento, a reserva pode ser recomendada ou obrigatória.

**Posso consumir no local?**

Depende da estrutura de cada participante. Alguns oferecem mesas e atendimento completo; outros trabalham principalmente com retirada ou entrega.

**Os combos estão disponíveis para delivery?**

A disponibilidade de delivery é definida por cada estabelecimento. Taxas, regiões atendidas, aplicativos e horários podem variar.

**Posso retirar o pedido no estabelecimento?**

Quando o participante oferece retirada, o pedido pode ser solicitado pelos canais informados pela própria marca. Confirme prazo, pagamento e disponibilidade antes de se deslocar.

**Quais formas de pagamento são aceitas?**

Cada estabelecimento define suas formas de pagamento. Consulte antes se aceita dinheiro, Pix, cartão, vale ou pagamento por aplicativo.

**Posso usar cupons, descontos ou programas de fidelidade?**

O uso de benefícios externos depende das regras do estabelecimento, e eles podem não ser cumulativos com o preço promocional do festival.

**Crianças podem participar?**

Sim. O festival é aberto ao público. A presença de espaço infantil, cadeiras para crianças ou produtos adequados a determinadas idades depende de cada local.

**Animais são permitidos?**

A política para animais varia entre os estabelecimentos. Confirme diretamente se o local é pet friendly e quais regras precisam ser respeitadas.

**Posso levar o combo para viagem?**

Na maioria dos casos sim, mas depende do tipo de produto e da embalagem oferecida. Alguns itens ficam melhores quando consumidos na hora.

**O estabelecimento pode cobrar taxa de serviço?**

A cobrança segue a política do próprio local e deve ser informada ao consumidor. O valor oficial do combo não inclui automaticamente serviços ou produtos adicionais.

### Ingredientes e acessibilidade

**Como confirmar ingredientes e possíveis alergênicos?**

Entre em contato diretamente com o estabelecimento antes de fazer o pedido. A marca responsável pela produção é quem pode informar ingredientes, modo de preparo e possíveis alergênicos.

**Existem opções sem lactose, sem glúten, veganas ou vegetarianas?**

Alguns participantes podem oferecer opções específicas, mas isso não é obrigatório para todos. Use os filtros do site, quando disponíveis, e confirme diretamente com o estabelecimento.

**Uma opção sem determinado ingrediente é livre de contaminação cruzada?**

Não necessariamente. Mesmo quando uma receita não usa determinado ingrediente, ela pode ser preparada em uma cozinha que também manipula leite, glúten, ovos, castanhas ou outros alergênicos.

**Pessoas com alergias graves devem tomar algum cuidado especial?**

Sim. Informe claramente a restrição antes do pedido e confirme ingredientes, utensílios, armazenamento e risco de contato cruzado. Em caso de dúvida, não consuma o produto.

**Como confirmar informações nutricionais?**

O festival não padroniza fichas nutricionais dos combos. Quando essas informações existirem, devem ser solicitadas diretamente ao estabelecimento responsável.

**Como verificar a acessibilidade de um estabelecimento?**

A estrutura física varia entre os participantes. Consulte previamente, com o próprio estabelecimento, informações sobre entrada acessível, banheiro adaptado, estacionamento, elevador e circulação interna.

**Posso solicitar atendimento ou adaptação específica?**

A solicitação deve ser feita diretamente ao estabelecimento, com antecedência sempre que possível. A viabilidade depende da estrutura e da equipe disponível.

### Rota da Doçura

**O que é a Rota da Doçura?**

A Rota da Doçura é uma ação de engajamento que incentiva o público a visitar diferentes participantes e registrar sua jornada pelo festival. Dependendo da edição, pode incluir carimbos, desafios, sorteios, brindes ou premiações.

**A Rota da Doçura acontece em todas as edições?**

Não necessariamente. A ação depende do planejamento de cada edição e é anunciada oficialmente quando está ativa.

**Como participo da Rota da Doçura?**

Consulte o regulamento vigente, obtenha o material indicado e siga as regras de validação. A participação pode exigir compras em estabelecimentos diferentes, registros, carimbos ou publicações nas redes sociais.

**Como consigo um carimbo ou validação?**

A validação normalmente acontece após a compra do combo oficial. É necessário apresentar o material da rota ao estabelecimento e seguir o procedimento informado pela organização.

**Compras repetidas no mesmo estabelecimento contam mais de uma vez?**

Depende do regulamento da edição. Algumas ações consideram apenas participantes diferentes; outras podem permitir mais de um registro no mesmo local.

**Posso participar sem publicar nas redes sociais?**

Depende da mecânica da ação. Quando uma publicação fizer parte da validação ou do sorteio, essa exigência estará indicada no regulamento.

**O que acontece se eu perder meu mapa, cartão ou passaporte?**

Registros perdidos podem não ser recuperados. Guarde o material em bom estado e, quando permitido, fotografe-o para manter um registro pessoal.

**Como sei se fui contemplado?**

Os resultados são divulgados pelos canais oficiais, conforme o cronograma da promoção. A organização também pode entrar em contato usando os dados fornecidos pelo participante.

**Onde encontro o regulamento completo da Rota da Doçura?**

O regulamento fica disponível na página oficial da Rota da Doçura durante a edição vigente.

### Sweet Awards

**O que é o Sweet Awards?**

O Sweet Awards é o reconhecimento oficial das experiências que mais se destacam durante o festival. A premiação valoriza qualidade, criatividade, sabor, apresentação, atendimento e envolvimento dos participantes.

**Quais são as categorias avaliadas?**

As categorias podem mudar por edição. Entre as já utilizadas estão Melhor Combo, Melhor Doce, Melhor Salgado, Melhor Bebida, Melhor Atendimento, Melhor Apresentação, Melhor Criatividade e Encantamento em Loja.

**Quem pode votar?**

A forma de avaliação é definida no regulamento de cada edição. Algumas categorias contam com participação do público, outras com análise técnica, e há edições que combinam as duas trilhas.

**Como faço uma avaliação?**

Acesse a área de avaliação no site, selecione o estabelecimento ou combo consumido e siga as instruções. Podem ser solicitadas informações para evitar votos duplicados ou inválidos.

**Preciso consumir o combo para avaliar?**

Sim. A avaliação deve representar uma experiência real de consumo. Não é adequado votar apenas com base em fotos, divulgação ou preferência pessoal pela marca.

**O que deve ser considerado na avaliação?**

Considere sabor, equilíbrio entre os itens, apresentação, criatividade, relação com o tema, atendimento e a experiência geral no estabelecimento.

**Posso alterar minha avaliação depois de enviá-la?**

Depende do funcionamento da plataforma. Antes de confirmar, revise com cuidado as notas e as informações preenchidas.

**Como os votos são validados?**

O sistema e a organização podem aplicar critérios para identificar duplicidades, comportamentos incomuns, cadastros inválidos ou tentativas de manipulação.

**O estabelecimento com mais seguidores vence automaticamente?**

Não. O resultado segue os critérios e o processo de avaliação definidos para cada categoria.

**O que acontece em caso de empate?**

A organização pode aplicar critérios de desempate previstos no regulamento ou reconhecer mais de um participante na mesma colocação.

**Quando os resultados são divulgados?**

Os vencedores são anunciados após o encerramento das avaliações, a conferência dos resultados e a validação da organização.

**Onde encontro os vencedores das edições anteriores?**

Os resultados históricos ficam na página do Sweet Awards, com o pódio de cada categoria por edição.

_Leva para:_ Ver o histórico do Sweet Awards

**Os vencedores recebem prêmio em dinheiro?**

A premiação e os benefícios variam por edição. O reconhecimento pode incluir troféus, certificados, divulgação, materiais de comunicação ou outros benefícios previstos no regulamento.

### Participação de estabelecimentos

**Como uma marca gastronômica demonstra interesse em participar?**

A marca preenche o pré-cadastro na página Participar ou fala com a organização pelo canal indicado. Quando um novo processo de seleção abrir, a equipe envia as orientações.

_Leva para:_ Ir para a página Participar

**Quais tipos de negócios podem participar?**

A seleção pode incluir cafeterias, docerias, confeitarias, restaurantes, sorveterias, padarias, marcas autorais e outros negócios gastronômicos compatíveis com a proposta da edição.

**É obrigatório ter loja física?**

Depende do formato da edição. Marcas sem ponto físico podem ser aceitas quando houver estrutura de produção, retirada, entrega ou participação presencial compatível com o regulamento.

**O pré-cadastro garante participação?**

Não. O pré-cadastro registra o interesse da marca. A participação depende da análise da organização, da disponibilidade de vagas, da adequação ao projeto e do cumprimento dos requisitos.

**Como os participantes são selecionados?**

A organização pode considerar qualidade, regularidade do negócio, capacidade operacional, atendimento, localização, proposta de combo, alinhamento com o tema e disponibilidade de vagas.

**Existe taxa de participação?**

As condições comerciais são apresentadas diretamente às marcas durante o processo de inscrição ou seleção.

**O estabelecimento precisa criar um combo exclusivo?**

Sim. O participante desenvolve uma experiência inédita e alinhada ao tema, respeitando a composição, o valor, os prazos e as orientações do festival.

**É obrigatório decorar o estabelecimento?**

A ambientação completa pode não ser obrigatória, mas a marca deve usar corretamente os materiais oficiais e apresentar o festival de forma clara. Experiências adicionais são estimuladas quando forem viáveis.

**O participante precisa oferecer o combo durante todo o festival?**

Sim, nos dias e horários previamente informados. Eventuais indisponibilidades devem ser comunicadas ao público e à organização.

**A marca pode alterar o combo depois de aprovado?**

Alterações devem ser comunicadas e autorizadas pela organização. Mudanças sem aprovação podem comprometer a divulgação e a participação no festival.

**O estabelecimento pode usar personagens, filmes ou marcas conhecidas?**

Qualquer referência deve respeitar direitos autorais, marcas registradas e direitos de imagem. A participação no festival não autoriza o uso indevido de propriedades intelectuais de terceiros.

**Como os estabelecimentos participam do Sweet Awards?**

Os participantes concorrem de acordo com as categorias e as regras da edição. A inscrição no festival não garante indicação, colocação ou prêmio.

**A organização fornece materiais de divulgação?**

Os participantes recebem orientações e materiais oficiais definidos para a edição. Cada marca também é responsável por divulgar sua participação e apresentar corretamente seu combo ao público.

### Parcerias, imprensa e criadores

**Como uma empresa pode patrocinar ou apoiar o festival?**

A empresa fala com a organização pelo canal comercial, apresentando dados, objetivos e interesse. A equipe avalia formatos de patrocínio, ativações, benefícios e compatibilidade com o projeto.

_Leva para:_ Ir para a página Apoiar

**Quais tipos de parceria são possíveis?**

As possibilidades incluem patrocínio, apoio institucional, fornecimento de produtos, benefícios para o público, mídia, conteúdo, experiências, infraestrutura e ações promocionais.

**Como profissionais de imprensa solicitam informações?**

Jornalistas e veículos podem usar o canal de imprensa para solicitar releases, dados, imagens, entrevistas, credenciamento e materiais oficiais. Enquanto não houver um endereço próprio, o pedido pode ser enviado pelo formulário de contato, selecionando o assunto de imprensa.

_Leva para:_ Enviar solicitação de imprensa

**O festival possui press kit?**

Quando disponível, o press kit reúne apresentação institucional, releases, imagens, logos, informações da edição e contatos para entrevistas.

**Como criadores de conteúdo podem propor uma parceria?**

A proposta deve ser enviada pelo canal indicado, com apresentação, perfil, público, formatos de conteúdo e ideia de participação. O envio não garante contratação ou credenciamento.

_Leva para:_ Falar com a organização

**Existe credenciamento para influenciadores?**

O credenciamento depende da estratégia de comunicação de cada edição. Critérios, vagas e contrapartidas são definidos pela organização.

**Posso usar a marca do Sweet & Coffee Week em uma publicação ou produto?**

O uso editorial para divulgar a participação deve seguir os materiais e as orientações oficiais. Aplicações comerciais, produtos, eventos ou campanhas próprias exigem autorização prévia.

**Como solicitar entrevista com a organização?**

Envie a pauta, o veículo, o formato, o prazo e os dados de contato pelo canal de imprensa. A equipe responde conforme a disponibilidade.

_Leva para:_ Falar com a organização

### Suporte e problemas

**O que faço se tiver um problema com meu pedido?**

Fale primeiro com o estabelecimento responsável. A produção, a cobrança, a entrega, a troca e o atendimento do pedido são feitos diretamente pela marca participante.

**Quem é responsável por cobranças, cancelamentos ou reembolsos?**

O estabelecimento que realizou a venda é responsável pela transação e deve orientar o consumidor conforme sua política e a legislação aplicável.

**Como relato uma experiência inadequada?**

Registre as informações importantes, como estabelecimento, data, horário e descrição do ocorrido. Depois, procure a marca e, se necessário, envie o relato para o atendimento do festival.

_Leva para:_ Falar com a organização

**O Sweet & Coffee Week pode obrigar um estabelecimento a realizar uma troca?**

A organização pode intermediar a comunicação e verificar o cumprimento das regras do festival, mas a solução comercial é tratada com o estabelecimento responsável.

**Encontrei uma informação incorreta no site. Como aviso?**

Use o canal de atendimento e informe a página, o estabelecimento e o dado que precisa de correção. A equipe faz a verificação.

_Leva para:_ Falar com a organização

**Como denunciar votos ou ações suspeitas?**

Envie o relato pelo canal oficial, incluindo evidências quando possível. A organização pode analisar registros e aplicar as regras do regulamento.

_Leva para:_ Falar com a organização

**Como entro em contato com o Sweet & Coffee Week?**

Use o formulário desta página ou os canais oficiais do festival. Para agilizar, selecione o assunto correto e inclua todas as informações necessárias.

_Leva para:_ Ir para o formulário

**Links que ainda não existem** (quando `null`, o link não aparece na interface —
preencher faz o link surgir sozinho):

- `mapa`
- `regulamentoRota`
- `regulamentoAwards`
- `areaAvaliacao`
- `pressKit`

---

## 11. Canais e contato

- **instagram** — https://www.instagram.com/sweetcoffeeweek/ (@sweetcoffeeweek)

**Assuntos do formulário de contato** (fonte: `src/data/contactFaq.js`):

- Dúvida sobre a edição
- Problema com informação no site
- Estabelecimento interessado
- Parceria ou patrocínio
- Imprensa e entrevistas
- Sugestão ou feedback
- Outro assunto

**Filtros da central de dúvidas na página Contato:**

- Todas (`todas`)
- Público (`publico`)
- Sweet Awards e rota (`awards`)
- Estabelecimentos (`estabelecimentos`)
- Parcerias e imprensa (`parcerias`)
- Atendimento (`atendimento`)

**Backup de formulário:** todo briefing/formulário do ecossistema cai também por
e-mail no Formspree. O painel só recebe com o Supabase ativo.

---

## 12. Lacunas conhecidas — o que o acervo NÃO tem

Para planejar um site novo, isto vale tanto quanto os dados que existem.

| Lacuna | Onde |
| --- | --- |
| Edição sem período registrado | nenhuma |
| Edição sem tema | 2016 |
| Edição sem contagem de marcas | nenhuma |
| Edição sem lista de marcas | nenhuma |
| Edição com premiação mas sem pódio estruturado | 2026.1 |
| Parceiros/patrocinadores por edição | vazio em 12 das 16 (só 2019.2, 2021.2, 2022, 2024 têm) |
| Valor do combo por edição | só 2026.1 |

**Outras lacunas estruturais:**

- **2º e 3º lugares que o acervo não registra** ficam como ausência honesta — nunca preenchidos.
- **5 edições não tiveram premiação nenhuma** (2016, 2017.1, 2017.2, 2018.1, 2018.2) — isso precisa ser dito, não escondido.
- **Crédito de imprensa:** o acervo não traz veículo, data nem pessoa confiáveis para as fotos de TV. Por isso o alt text é genérico.
- **Logo de participante sem arquivo** cai em fallback de iniciais — nunca inventar logo.
- **O wordmark desenhado ainda letra "ELOI Design Studio"** (assunto da agência, não do festival).

---

## 13. Restrições que qualquer site novo herda

- **URLs de QR Code são permanentes:** `/#/lovers/combos/{slug}` e `/#/lovers/awards`.
  Os QR Codes já foram impressos. Trocar hash routing por path routing quebra todos.
  Os 21 slugs estão congelados (seção 7).
- **Não inventar dado histórico, ranking ou vencedor.**
- **Edições não competem entre si** — nada de gráfico comparando tamanho de edição.
  Comparação só entre participantes (premiados, recorrentes).
- **Institucional e Lovers nunca se misturam** visualmente.
- **Nada gerado por IA como registro do festival.**
