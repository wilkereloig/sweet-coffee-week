# Aprovação de carimbos por foto: o que melhorar na próxima edição

**14/11/2026.** Registro do que a edição Cartoon (2026.2) mostrou sobre os pedidos de carimbo por **visita anterior** e **delivery**, e do que muda na próxima edição.

> **Decisão do Wilker (14/11/2026):** nenhum carimbo da 2026.2 será anulado. A aprovação automática por foto foi a regra desta edição, e vale o que ela aprovou. Este documento serve para a próxima edição, não para rever esta.

---

## 1. O que aconteceu

Em 10/11 a foto passou a ser obrigatória no pedido de visita anterior. Em seguida a organização ligou a **aprovação automática**: pedido com foto virava carimbo em cerca de 1 minuto, sem ninguém olhar. A aprovação automática ficou ligada até 14/11, quando foi desligada (`caca_config`: `auto_aprovar_visita_anterior` e `auto_aprovar_delivery` = `false`).

Números de 14/11:

| | |
|---|---|
| Pedidos de carimbo (todos os tipos) | 412, de 204 pessoas |
| Pedidos de visita anterior | 362 |
| Pedidos de visita anterior com foto | 254, de 123 pessoas |

No ranking "Quem mais conheceu casas", 4 dos 7 primeiros chegaram lá quase só pelo GPS: Ana Flávia, augustomatiass, Matheus Mariz e Suellen Thuany. Os outros três subiram com visitas anteriores aprovadas pela automação:

| Pessoa | Visitas anteriores | GPS | O que chamou atenção |
|---|---|---|---|
| Kami | 27 (as 27 casas) | 3 | Criou o mapa em 12/11 às 09h06 e mandou 15 pedidos na primeira hora; avaliou 25 combos no mesmo dia, sem comentário; ganhou o voucher de 12/11 |
| Iranilton Sousa | 25 | 20 | 13 visitas declaradas depois de já ter o mapa; relatos detalhados |
| Maira Grazielle | 10 | 8 | As 10 visitas são de depois de ter o mapa, em dias em que ela também carimbou pelo GPS |

### O que as fotos mostraram

Análise de 16 das 27 fotos da Kami (baixadas pelo painel):

- **Nenhuma** era foto original da câmera. Todas eram print de tela ou recorte de print.
- 2 eram telas inteiras de stories do Instagram ("5ª parada da @sweetcoffeeweek"), capturadas às 09h08 de 12/11, dois minutos depois de criar o mapa.
- 3 tinham figurinhas de story coladas; 1 tinha o botão de voltar de um visualizador de fotos.
- 1 era print de WhatsApp com o pagamento em nome dela. Comprova a compra, mas era delivery, pedido como visita.
- Não foi possível saber se os stories eram dela ou de outra pessoa.

---

## 2. Por que não dava para provar

**O site apaga os metadados da foto.** Antes de enviar, o celular reduz a foto (lado maior até 1600 px) e grava uma imagem nova (`src/edicao/caca/delivery/imagem.js`, por canvas). A imagem nova não tem data de captura, aparelho nem local. Isso vale para todas as fotos recebidas, de todo mundo.

**O que sobra é a medida da imagem.** Foto da câmera do celular é grande e chega com o lado maior em exatamente 1600 px, em proporção de câmera (3:4, 16:9, 1:1). Print de tela chega estreito (tela inteira: 738 × 1600) ou menor que 1600 (recorte de print; a largura de tela do iPhone é 1179 px). Mas foto recebida pelo WhatsApp também chega menor, então a medida é **pista, não prova**.

---

## 3. O que melhorar na próxima edição

Por ordem de impacto.

### 3.1 Aprovação automática só para foto com cara de câmera
- Aprovar sozinho apenas foto em formato de câmera (lado maior 1600 px e proporção de câmera).
- Print, recorte ou imagem menor vai para **revisão humana**.
- Pedidos em rajada (vários em poucos minutos, ou logo depois de criar o mapa) também vão para revisão, mesmo com foto.

### 3.2 Guardar os metadados no envio
- No celular, **antes** de reduzir a foto, ler os metadados do arquivo original: data e hora da captura, marca e modelo do aparelho, e se a imagem é captura de tela.
- Enviar esses dados junto com a foto e guardar no pedido.
- No painel, mostrar ao lado da foto: "tirada em 10/11 às 15h12 · iPhone 15" ou "sem dados de câmera (provável print)".
- Comparar a data da foto com a data de visita declarada.
- Limite conhecido: ao escolher foto da galeria pelo navegador, o iPhone costuma manter data e aparelho, mas tirar a localização. Dá para provar **quando**, não **onde**.

### 3.3 Visita anterior só para antes do mapa
- O pedido de visita anterior serve para quem foi à casa **antes de ter o mapa**.
- Depois que a pessoa tem o mapa, o caminho é o GPS na casa. Se o GPS falhar ali, o pedido é de "revisão de presença" (com distância e margem do celular), não de visita anterior.

### 3.4 Limite e prazo
- Número máximo de pedidos de visita anterior por pessoa por dia.
- Prazo curto contado da data da visita (por exemplo, 48 horas).

### 3.5 Confirmação da casa
- Como no delivery, permitir que a casa confirme a visita: código mostrado no balcão ou confirmação da marca no painel.
- Com a confirmação da casa, a foto deixa de ser a única prova.

### 3.6 Regulamento claro sobre a foto
- Dizer no regulamento que a foto tem de ser **tirada pela própria pessoa na visita**, e que print de rede social, de foto de outra pessoa ou de material da casa não vale.
- Dizer que a organização pode pedir o arquivo original.

---

## 4. O que já existe no painel (desde 14/11/2026)

Em **Edição › Carimbos › Pedidos de presença**:

| Ferramenta | O que faz |
|---|---|
| Filtro **Pessoa** | Mostra todos os pedidos de uma pessoa, de qualquer situação, com a foto à vista em cada cartão |
| Selo da foto | Pela medida: "Formato de foto da câmera", "Parece print de tela inteira" ou "Menor que foto da câmera". Só em visita anterior |
| **Analisar todas as fotos** | Mede todas as fotos de visita anterior (lê só o começo de cada arquivo, 4 por vez) e mostra por pessoa quantas parecem print, com "Ver pedidos" |
| Delivery com código vencido | A organização aprova ou nega quando o código da casa venceu |

Código: `painel-app/src/components/vistas/caca/Excecoes.jsx`, `painel-app/src/lib/medidaImagem.js` e `pistaDaFoto` em `painel-app/src/lib/cacaGps.js`. Banco: migrations `20270202`, `20270203` e `20270204`.

Essas ferramentas são o ponto de partida dos itens 3.1 e 3.2: a regra de medida já está escrita e testada (`tests/painel-app-medida-imagem.test.mjs`, `tests/painel-app-delivery.test.mjs`).
