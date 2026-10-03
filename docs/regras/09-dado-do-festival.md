<!-- Parte das regras do projeto. Índice e regras absolutas: CLAUDE.md da raiz. Movido sem reescrita em 03/10/2026. -->

## 9 · O dado do festival

O acervo completo e verificado está em **`acervo/ACERVO-OFICIAL.md`**, e as decisões que o
produziram em **`acervo/decisoes-acervo-2026-08.md`**. Este capítulo traz só o que o
código precisa saber.

### 9.1 Números canônicos

| Dado | Valor |
|---|---|
| Primeira edição | setembro de **2016** |
| Edições realizadas | **16** |
| Participações somadas | **410** |
| Marcas distintas | **123** |
| Marcas que já subiram ao pódio | **44** |
| Colocações no total | **271** |
| Edições premiadas | **11** (as 5 primeiras não tiveram premiação) |

### 9.2 Participantes por edição

| Edição | Tema | Marcas |
|---|---|---|
| 2016 | Início | 13 |
| 2017.1 | Páscoa | 17 |
| 2017.2 | Doces do Mundo | 22 |
| 2018.1 | Namorados | 19 |
| 2018.2 | Sabores da Infância | 25 |
| 2019.1 | Pâtisserie Francesa | 28 |
| 2019.2 | Contos de Fadas | 37 |
| 2020.1 | No Ritmo da Música | 20 |
| 2020.2 | Heróis & Vilões | 27 |
| 2021.1 | Séries | 30 |
| 2021.2 | Terras Potiguares | **29** |
| 2022 | Movies | **34** |
| 2023 | Trip | 33 |
| 2024 | Books | 29 |
| 2025 | Celebration | 26 |
| 2026.1 | Lovers | 21 |

⚠️ **As duas mudanças em relação ao código (2021.2 e 2022) vêm de duplicação de marca,
não de participante a mais ou a menos.** A Fran's conta uma vez em 2021.2; a Caramel
conta uma vez em 2022. **Nenhuma edição perdeu ou ganhou participante real.**

### 9.3 Marcas — regras de exibição

- **Aplicar todos os aliases.** Uma marca = uma entrada no histórico e no Hall.
- **Exibir sempre o nome atual**, inclusive nas edições antigas.
- **Exibir a forma longa do nome:** *Mr. Cupcake Confeitaria*, *Jolie Café Pâtisserie*,
  *Paneer Pâtisserie*, *Rollab Confeitaria*, *Duart's Confeitaria*, *Atelier Mine
  Confeitaria*, *Delicato Bolos*, *Crooks Cookie Shop*.
- **Rede com várias unidades conta como 1 marca por edição.**
- O nome correto é **Jana's Cakes** (não "Jona's Cakes") e **Supermercado Nordestão**
  (não "Supernordestão").
- **`KNVE Casa Café` não é marca** — é transcrição truncada de "Café Casa Verde by
  Caramel", ou seja, a própria **Caramel Healthy Food**. Vira alias.
- **Cuidado com o apóstrofo:** `'` reto e `'` curvo partiram Canuto's e Caffè Basilico's
  em duas marcas cada. Normalizar.

### 9.4 Hall dos mais premiados — valores corretos

| # | Marca | 1º | 2º | 3º | Total |
|---|---|---|---|---|---|
| 1 | Mr. Cupcake Confeitaria | 9 | 14 | 6 | **29** |
| 2 | Bocaditos | 12 | 7 | 7 | **26** |
| 3 | Marlon Vinicius | 9 | 5 | 12 | **26** |
| 4 | O Maestro Café | 9 | 9 | 4 | **22** |
| 5 | Atelier Mine Confeitaria | 0 | 9 | 5 | **14** |
| 6 | Canuto's | 4 | 5 | 3 | **12** |
| 7 | Duart's Confeitaria | 3 | 2 | 7 | **12** |
| 8 | Delicato Bolos | 5 | 4 | 2 | **11** |
| 9 | Jolie Café Pâtisserie | 3 | 2 | 4 | **9** |
| 10 | Bolomania | 2 | 4 | 3 | **9** |

✅ **Aplicado no código em 07/08/2026.** O Hall deixou de ser digitado: `HistoricoAwards`
o calcula de `handoff/awardsData.js`, que por sua vez deriva de `sweetCoffeeHistory.js` a
cada import. **Nenhum número desta tabela existe escrito em lugar nenhum** — todos saem
da contagem. Antes das correções o código dava Mr. Cupcake 28, Bocaditos 13 primeiros
lugares e Marlon Vinicius 24.

**Correções de pódio aplicadas** (conferidas card a card contra os cards oficiais):

- **2024 · Melhor Salgado** — 1º **Bolomania** · 2º **Bocaditos** · 3º **Delicato e Just
  Food&Coffee**.
- **2024 · Melhor Doce** — 1º **Bocaditos e Delicato** (empate) · 2º O Maestro Café · 3º
  Sweet Duo.
- **2025 · Melhor Combo** — 1º **Marlon Vinicius** · 2º **O Maestro Café e Bolomania** ·
  3º Delicato.
- **2025 · Encantamento em Loja** — categoria inteira ausente do código, com empate nas
  três posições: 1º **Just Food&Coffee e O Maestro Café** · 2º **Mr. Cupcake e Adocee** ·
  3º **Marlon Vinicius e Bolomania**.

**Outras correções — estado:**

- ✅ **Nomes de categoria unificados.** **18 grafias na base viram 10 categorias
  canônicas** pelo `categoryAliases`: as 6 variações de encantamento são
  **"Encantamento em Loja"**, as 5 de entrega são **"Delivery/Takeaway"**. O nome
  histórico fica na base; a unificação acontece na leitura.
- ✅ **Campo `pontos`** — já não existia no código.
- ✅ **Trilhas preenchidas.** Restou **um** `null`, e é correto: **2019.1 não nomeia
  júri** no card oficial. 2019.2 e 2020.1 são Sweet Lovers; as 5 categorias sem trilha de
  2020.2 viraram Sweet Lovers, ao lado do Júri Técnico do Melhor Combo.
- ✅ **Contagens.** 2021.2 passou a 29 e 2022 a 34. A lista `participantes` **preserva o
  registro histórico** — as três unidades da Fran's continuam lá —, mas `n` conta
  **marcas**, aplicando os aliases. Somadas dão **410**, com **123 marcas distintas**.
- ✅ **Nomes na forma longa** (§9.3) viraram os canônicos: Mr. Cupcake Confeitaria,
  Duart's Confeitaria, Atelier Mine Confeitaria, Jolie Café Pâtisserie, Paneer
  Pâtisserie, Rollab Confeitaria, Delicato Bolos, Crooks Cookie Shop, Fran's Café,
  Jana's Cakes. `KNVE Casa Café` e `Café Casa Verde by Caramel` viraram alias de Caramel
  Healthy Food; `Supernordestão` virou Supermercado Nordestão.
- ✅ **Menção Honrosa de 2021.1** — já vivia na base como `premiacao.mencaoHonrosa`,
  **fora de `categorias`**, e é por isso que nunca contaminou o Hall. O que faltava era
  aparecer: agora `awardsData` a carrega no campo `mencao` e o acordeão da edição a
  mostra em bloco próprio (`.swa-mencao`), sem medalha e sem numeral.
  ⚠️ **Regra permanente: menção não é colocação.** Se algum dia ela entrar em
  `categorias`, vira sete colocações fantasma e o Hall mente.
- ✅ **Edição homenageada na Lovers.** `participants.js` ganhou **`editionCode`**, e
  `edition` passou a trazer o nome real em vez do rótulo de campanha: "Sweet Music" →
  No Ritmo da Música (2020.1) · "Filmes" → Movies (2022) · "Sweet Series" → Séries
  (2021.1) · "Sweet Trip" → Trip (2023) · "Sweet Celebration" → Celebration (2025) ·
  "Contos de Fada" → Contos de Fadas (2019.2). A **Delicato Bolos passou para Pâtisserie
  Francesa (2019.1)** — o `theme` dela, "Confeitaria Francesa", confirmava o acervo.
  `getHomageGroups()` agrupa por **código**, não por string: **8 edições revividas**.

### 9.5 Números comerciais

Cinco números, com data de apuração e definição do que medem. A página Apoiar **lê da
fonte canônica**, não de valores cravados no JSX.

| Número | O que mede |
|---|---|
| **+R$ 712 mil** | movimentação direta |
| **+200 mil** | alcance |
| **+290 mil** | interações |
| **+18 milhões** | visualizações |
| **+65 mil** | seguidores |
| **+1.600** | posts |

⚠️ **Alcance, interações e visualizações são métricas distintas — nunca somar.**

⛔ **A série histórica de preços (11 edições, R$ 16,90 → R$ 38,90) fica no acervo marcada
como NÃO PUBLICAR.**

### 9.6 Patrocinadores e parceiros

⛔ **Patrocinadores e parceiros não são exibidos por enquanto.** A página Apoiar mostra
**formatos de ativação** — o que já foi feito, sem nomear a marca:

| Formato | Exemplo real (não nomeado no site) |
|---|---|
| Benefício cruzado em parceiro | cupom fiscal do combo dava 50% off no cinema |
| Sorteio para o público | like no participante concorria a uma máquina de café |
| Prêmio de avaliação | quem avaliava concorria a uma mesa de jantar |
| Ativação temática | distribuidora de ingredientes assinando "os ingredientes mais mágicos" |
| Título oficial da edição | "Cinema Oficial" |
| Parceria de origem | Sebrae e fornecedores locais em Terras Potiguares |

Os nomes documentados ficam no acervo, não no site.

### 9.7 Sweet Gift

**O Sweet Gift é o combo em versão presente ou viagem** — o doce especial para levar,
para saborear em casa, no escritório ou com amigos, embalado para presentear. Em geral
sem bebida.

**Estreou na Páscoa (2017.1)**, com o Bolo da Vovó e o "Petit Bolo da Vovó" — não em
2017.2 nem em 2019.2, como versões anteriores diziam. Confirmado pelo Instagram oficial
do festival: post de 03/04/2017 já anuncia o Sweet Gift do Bolo da Vovó na edição de
Páscoa. A Rafaela Fontes Chocolateria entrou na modalidade depois, em Doces do Mundo
(2017.2).

⚠️ **Não há foto de Sweet Gift no acervo.** O Eloi vai selecionar. Até lá, `.scw-reserva`.

### 9.8 Fotos de combo

- **Galeria de 3 a 5 fotos por marca por edição** — cerca de 1.500 selecionadas das 4.891
  do acervo bruto.
- As **13 edições com pastas por marca** (2017.2 → 2026.1) ganham vínculo **foto ↔ marca ↔
  edição**.
- **2016, 2017.1 e 2018.2** têm foto de combo mas sem identificação de marca. Entram como
  **"combos da edição"**, sem atribuir a ninguém.
- ⚠️ **Hoje existem só 21 logos de marca no acervo** (os da Lovers). Os outros 102 saem
  dos **cards "Confirmado"** de cada edição, que trazem o logo em alta.

### 9.9 Modelo de dados alvo

| Entidade | Chave | Liga com |
|---|---|---|
| **Edição** | código (`2023`) | participantes, prêmios, fotos |
| **Marca** | slug estável | participações, pódios, fotos, logo |
| **Participação** | marca + edição | combo, fotos, tema escolhido |
| **Prêmio** | edição + categoria + colocação | marcas, empates |
| **Foto** | caminho | edição, marca, crédito, alt |
| **Depoimento** | pessoa + marca | vídeo, edição, autorização |
| **Pergunta** | id | assunto, validade |

**Todo dado volátil carrega três campos:** de onde veio · quando foi verificado · se pode
publicar. É o que impede preço, endereço e horário de voltarem ao ar por descuido.

⚠️ **Os slugs deixaram de ser congelados** — os QR Codes impressos que os travavam
pertenciam à edição Lovers e foram aposentados. **A convenção de nome de arquivo
(`combos/<slug>/main.jpg`, `logos/participants/<slug>.png`) continua valendo**; o que
morreu foi o congelamento, não a convenção.

---

