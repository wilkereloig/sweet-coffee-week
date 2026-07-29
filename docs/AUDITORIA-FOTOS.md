# Auditoria fotográfica do site institucional — 29/07/2026

Levantamento de todo o acervo de imagem do repositório, do vínculo entre cada foto
e o conteúdo que ela ilustra, e do que ainda falta. Fonte única de imagem no
código: **`src/data/imageLibrary.js`**.

---

## 1. O que o acervo tem

| Pasta | Arquivos | O que é | Vínculo confirmado |
| --- | --- | --- | --- |
| `public/images/edicoes/<code>/NN.webp` | 190 (11–12 por edição, 16 edições) | Registros de cada edição: combos, vitrines, lojas, público | **Edição** — sim. **Participante** — não |
| `public/images/combos/<slug>/` | 230 em 21 marcas | Combo de cada participante | **Participante + edição Lovers 2026.1** — sim |
| `public/images/marcas-edicoes/<code>/logo.png` | 16 | Marca de cada edição | sim |
| `public/logos/participants/<slug>.png` | 21 | Marca de cada participante da Lovers | sim |
| `public/images/momentos/` | 12 | Público e bastidores | edição não identificada |
| `public/images/campanha/` | 18 | Campanha e atendimento | edição não identificada |
| `public/images/lovers-publico/` | 11 | Público da edição Lovers | edição sim, marca não |
| `public/images/imprensa/` | 3 | Institucional de imprensa | — |
| `public/images/shapes/` | 8 | Formas gráficas (SVG) | decorativo |

### A limitação central da auditoria

**O acervo não diz qual foto é de qual participante nas edições de 2016 a 2025.**
As fotos em `images/edicoes/<code>/` são registros da edição, sem rótulo de marca.
O único vínculo participante↔combo confirmado é o da edição **Lovers 2026.1**,
em `images/combos/<slug>/`.

Consequência prática: o pedido de "pelo menos uma foto do combo de cada
participante" só é cumprível hoje na edição Lovers. Nas demais, atribuir uma foto
de edição a um participante seria invenção — e usar a foto do combo Lovers de uma
marca para representar o combo dela em 2023 seria misturar edições. Nenhuma das
duas coisas foi feita. Está tudo listado na seção 5.

---

## 2. Cobertura por edição

| Edição | Tema | Participantes | Fotos da edição | Combos por participante |
| --- | --- | ---: | ---: | --- |
| 2016 | (sem tema) | 13 | 11 | — |
| 2017.1 | Páscoa | 17 | 12 | — |
| 2017.2 | Doces do Mundo | 22 | 12 | — |
| 2018.1 | Namorados | 19 | 12 | — |
| 2018.2 | Sabores da Infância | 25 | 12 | — |
| 2019.1 | Pâtisserie Francesa | 28 | 12 | — |
| 2019.2 | Contos de Fadas | 37 | 12 | — |
| 2020.1 | No Ritmo da Música | 20 | 12 | — |
| 2020.2 | Heróis & Vilões | 27 | 12 | — |
| 2021.1 | Séries | 30 | 12 | — |
| 2021.2 | Terras Potiguares | 30 | 12 | — |
| 2022 | Movies | 35 | 12 | — |
| 2023 | Trip | 33 | 12 | — |
| 2024 | Books | 29 | 12 | — |
| 2025 | Celebration | 26 | 12 | — |
| **2026.1** | **Lovers** | **21** | **11** | **21 de 21** |

---

## 3. Correções aplicadas

1. **Galeria de Edições usava 3 fotos por edição; o acervo tem 11–12.** O
   manifesto completo (`src/data/editionGallery.js`) já existia e não estava
   sendo consumido. Passou a ser a fonte da galeria.
2. **Dois participantes da Lovers não tinham foto de combo** — Casa de Taipa
   Tapiocaria e Olí Gastrô. As fotos existiam em `images/fotos-combos-site/`,
   pasta que nenhum arquivo do código referenciava. Foram convertidas para o
   padrão `combos/<slug>/main.jpg` + `photo-NN.jpg` (1333×2000, mesmo recorte das
   outras 19 marcas). Cobertura da edição atual: **21 de 21**.
3. **Fotos de herói repetidas entre páginas.** `momentos/02.jpg` servia de herói
   na Home e em Apoiar; `campanha/15.jpg`, em Participar e Contato. Cada rota
   passou a ter foto própria.
4. **237 MB de imagem sem uso saíam em todo build** — `fotos-combos-site`
   (204 MB), `adesivos-site` (30 MB) e `adesivos` (2,9 MB), sem uma única
   referência no código. Movidos para `acervo-bruto/sem-uso-no-site/` (fora do
   git, no disco). Build: **364 MB → 131 MB**.
5. **Caminhos de imagem espalhados pelos componentes** foram centralizados em
   `src/data/imageLibrary.js`. Um teste impede a reincidência.
6. **Enquadramento por foto**: `src/data/focalPoints.js` já trazia o ponto focal
   calculado por imagem e era pouco usado. Agora o sistema central devolve
   `position` junto de cada foto, e as páginas aplicam em `object-position`.

---

## 4. Sistema central de imagens

`src/data/imageLibrary.js` — nenhum componente monta caminho de imagem na mão.

| Função | Devolve |
| --- | --- |
| `editionPhotos(code)` | todas as fotos da edição, com `alt` e ponto focal |
| `editionCover(code)` / `editionMosaic(code, n)` | capa / recorte da galeria |
| `comboPhotos(nome ou slug)` | fotos do combo do participante (só Lovers) |
| `comboMain(nome)` | foto principal do combo |
| `awardPhoto(nome, code, variacao)` | foto da colocação — **`null`** fora da Lovers |
| `heroPhotos(rota)` | fotos do herói, com enquadramento de desktop e de celular |
| `bgStyle(foto, { mobile })` | `style` pronto, já com o ponto focal |
| `RESERVA` | texto do placeholder honesto |

Cada foto vem como `{ src, alt, position, mobilePosition?, slug?, indice? }`.
O `alt` é montado com edição, participante e contexto — nunca "imagem" ou "foto".

Guarda: `tests/imagens.test.mjs` (`npm run test:imagens`) confere que todo caminho
existe no disco, que a contagem por marca bate com a pasta, que nenhuma foto de
herói se repete entre rotas, que todo `alt` nomeia o festival, que o Sweet Awards
só recebe foto quando o vínculo marca↔combo existe, e que nenhum componente
escreve caminho de imagem à mão.

---

## 5. RELATÓRIO DE FOTOS AUSENTES

### 5.1 Combos por participante — edições 2016 a 2025

**391 fotografias**, uma por participante por edição.

| Item | Valor |
| --- | --- |
| Aplicação | galeria da edição, na página Edições |
| Tipo de imagem | fotografia principal do combo daquele participante **naquela edição** |
| Proporção | 4:5 ou 1:1 |
| Resolução mínima | 1600 px no maior lado |
| Formato | WebP (ou JPG de origem, convertemos) |
| Nomeação sugerida | `<code>-<slug-do-participante>-01.webp` |
| Motivo da ausência | o acervo tem fotos da edição, mas nenhuma identifica a marca retratada |

Quantidade por edição: 2016 · 13 · 2017.1 · 17 · 2017.2 · 22 · 2018.1 · 19 ·
2018.2 · 25 · 2019.1 · 28 · 2019.2 · 37 · 2020.1 · 20 · 2020.2 · 27 · 2021.1 · 30 ·
2021.2 · 30 · 2022 · 35 · 2023 · 33 · 2024 · 29 · 2025 · 26.

> Alternativa mais barata, se as fotos existirem sem rótulo: enviar a **lista de
> qual arquivo do acervo é de qual marca**, por edição. Nesse caso não é preciso
> foto nova — só a legenda. O código já está preparado para receber esse vínculo.

### 5.2 Peça premiada por categoria — Sweet Awards, edição Lovers 2026.1

**8 fotografias.** Hoje cada card mostra a foto do combo da marca vencedora; o
handoff pede a foto da peça específica.

| Categoria | Vencedor | Imagem necessária | Proporção |
| --- | --- | --- | --- |
| Melhor Doce | Jolie Café Pâtisserie | o doce premiado, isolado | 4:5 |
| Melhor Salgado | O Maestro Café | o salgado premiado, isolado | 4:5 |
| Melhor Bebida | Sweet Duo Confeitaria | a bebida premiada, isolada | 4:5 |
| Melhor Combo | O Maestro Café | o combo completo | 4:5 |
| Melhor Atendimento | Rollab Confeitaria | atendimento na loja | 4:5 |
| Melhor Apresentação | Just Food&Coffee | a apresentação do combo | 4:5 |
| Melhor Criatividade | O Maestro Café | a peça que sustenta o prêmio | 4:5 |
| Encantamento em Loja | Mr. Cupcake Confeitaria | ambientação da loja | 4:5 |

Aplicação: cards da seção "Vencedores Lovers 2026". Resolução mínima 1600 px.
Motivo da ausência: o acervo não rotula foto por peça, só por marca.

### 5.3 Pódios do histórico — Sweet Awards 2019 a 2025

**10 edições**, todas as colocações. Aplicação: acordeão do histórico.
Imagem necessária: combo premiado de cada colocação, na edição correspondente.
Proporção 1:1, mínimo 1200 px. Motivo: mesma limitação de 5.1 — sem vínculo
marca↔foto no acervo. Hoje esses cards mostram ausência honesta, o que está
correto: usar a foto do combo Lovers da mesma marca misturaria edições.

### 5.4 Sweet Gift — seção "02 O que é" da Home

**4 fotografias**: caixa fechada, caixa aberta, doces da caixa, pronta para
viagem. Proporção 1:1, mínimo 1200 px. Aplicação: galeria irmã da seção.
Motivo: o handoff já entregou essa área como espaço reservado — não há foto.

### 5.5 Retrato de depoimento — seção "06 Prova" da Home

**1 fotografia**: retrato autorizado de Carol Barreto (Jolie Café Pâtisserie).
Proporção 1:1, mínimo 800 px. Hoje o círculo mostra o logo real da marca.
Motivo: não há retrato de pessoa no acervo, e publicar exige autorização.

### 5.6 Imprensa — seção "06 Imprensa" de Participar

**17 miniaturas** (uma por matéria) — opcional. Proporção 16:10, mínimo 800 px.
Motivo: as matérias entram hoje como cards de texto; ainda faltam também as URLs
de parte delas.

### 5.7 Logos de participantes das edições antigas

Existem **21 logos**, todos da edição Lovers. As marcas que participaram de 2016
a 2025 e não voltaram na Lovers não têm logo no acervo — o hall dos mais
premiados cai em iniciais para elas (Bocaditos, Marlon Vinicius e outras).
Formato: PNG com fundo transparente, mínimo 600 px de largura.

---

## 6. Páginas citadas no pedido que não existem neste repositório

Não foram auditadas porque não são rotas do projeto. Constam como pendência no
próprio handoff de design (`README.md`, § Pendências):

Curiosidades (rota aposentada, redireciona para Edições) · Rota da Doçura ·
Participantes · Estabelecimentos · Guia do Sweet Lover · Loja · Parcerias e
imprensa (página própria) · página individual por edição · página de combo.

Quando qualquer uma delas for criada, o herói já tem lugar reservado:
basta acrescentar a rota em `HEROES`, dentro de `src/data/imageLibrary.js`.

---

## 7. O que depende de conferência visual sua

1. **Casa de Taipa e Olí Gastrô** — as 4 fotos de cada foram tiradas de
   `fotos-combos-site` e recortadas para 1333×2000. Confirme que retratam mesmo o
   combo da marca e que o recorte não cortou nada importante.
2. **Ordem das fotos dentro de cada edição** — a galeria segue a ordem do acervo
   (`01`, `02`, `03`…). Se houver uma ordem editorial preferida, ela precisa vir
   de você; o código respeita a ordem do manifesto.
3. **Fotos de herói** — a escolha por página está na seção `HEROES` de
   `imageLibrary.js`, um lugar só. Trocar é editar uma linha.
