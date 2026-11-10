<!-- Parte das regras do projeto. Índice: src/CLAUDE.md. Movido sem reescrita de src/CLAUDE.md em 10/11/2026. -->

## 10 · Armadilhas conhecidas

Cada uma destas custou tempo pelo menos uma vez. Ler antes de mexer na área
correspondente.

### 10.1 Especificidade — a armadilha nº 1 do mobile

⚠️ **Um reset genérico com seletor de dois níveis vence a regra específica de um nível**,
e o efeito **só aparece no celular**, porque é lá que a regra específica existe. Dois
casos já corrigidos:

- `.scw-raiz a { color: inherit }` (0,1,1) vencia `.scw-aba` (0,1,0) → **apagava os
  rótulos da barra de abas**;
- `.scw-raiz img { display: block }` (0,1,1) vencia `.ctt-abertura__fundo { display:
  none }` (0,1,0) → **montava a foto de tela cheia atrás do texto do Contato**.

**Regra:** ao esconder ou recolorir um elemento no mobile, **conferir se existe reset
genérico em `.scw-raiz` para aquela tag** — e **prefixar o seletor, nunca usar
`!important`**.

### 10.2 Toque e acessibilidade

⚠️ **O piso de 44px vale para o CONTROLE real, não para a linha que o contém.** Clicar no
padding de um flex **não foca o `<input>` filho** — foi o caso da busca do Contato: campo
de 26px dentro de uma linha de 46px.

⚠️ **`disabled` de verdade, não `opacity:0`.** Só transparência mantém o elemento na
tabulação.

### 10.3 Compositor, GPU e performance

⚠️ **Não usar `backdrop-filter` sobre trilho animado.** Blur + readback de GPU a cada
frame congela o compositor — usar fundo semi-opaco.

⚠️ **16 cenas full-viewport de uma vez congelam o compositor.** Foi o que levou a antiga
apresentação de Edições a montar uma cena só; a página atual é coleção + detalhe e só
carrega as capas na visão geral.

⚠️ **Não colocar `transition` em `width`/`transform` de barra de progresso que precise de
valor exato** — travava o valor. Barra de progresso usa `transform: scaleX` com origem à
esquerda, sem transição.

⚠️ **Não pôr `transform` em `<main>`.** Criaria bloco de contenção e **quebraria os
`position: fixed` de dentro das páginas** (a barra fixa de Participar/Apoiar) e o
`sticky` da navegação por ano de Edições. Por isso a
transição de página é só opacidade.

⚠️ **Elemento `position: fixed`/`sticky` nunca entra na zona de disparo do observer** —
ficaria invisível para sempre. Por isso fica fora do motor de movimento.

⚠️ **Laço contínuo em imagem usa a propriedade `scale`, nunca `transform`** — senão haveria
salto de reinício. (A respiração do herói e o token `--mo-respiro` saíram em 13/10/2026:
nenhum elemento os usava desde que os heróis passaram a ser `HeroFotos` em crossfade.)

### 10.4 Degradês, máscaras e emendas

⚠️ **Degradê linear em alpha lê como faixa dura.** *"O olho enxerga a derivada, não o
valor."* Uma rampa de **duas** paradas marca aresta nos dois pontos onde começa e termina;
é preciso ao menos **três**, com a do meio quebrando a reta.

✅ **O véu do cabeçalho (`.scw-header__veu`) segue a mesma razão desde 14/10/2026:**
rampa "scrim" de 12 paradas, topo a .48, zerando em 70% — as 4 paradas lineares
anteriores marcavam uma faixa marrom sobre o amarelo da Home. Vale em todas as páginas.

⚠️ **O mecanismo mudou em 22/08/2026, o princípio não.** A rampa era uma **máscara** em
smoothstep `t²(3−2t)` (`--scw-esfuma`); hoje é **cor sobre a foto**, em três paradas, no
`::before` da área de foto (`.scw-hero-banda`, §6.9). ⛔ **`--scw-esfuma`, `--scw-esfuma-topo` e
`--scw-banda-base` não existem mais — não reintroduzir.**

⚠️ **A emenda fecha na cor do BLOCO, não do herói.** Errar isso deixa uma linha dura —
o `box-shadow` curto de antes escondia, a rampa longa expõe. **É por isso que a chapa do
bloco é obrigatória no celular** (§6.9): sem ela o Contato sairia chocolate sobre
chocolate.

⚠️ **`bgStyle()` resolve UM valor e style inline vence media query.** Elemento que aparece
nas duas telas com enquadramento diferente **tem** que mandar `--foco` e `--foco-mobile`.

### 10.5 Grade e layout

⚠️ **`.scw-grade-fixa` desconta o gap na fórmula de largura** — sem ela, faixas de 4
numerais quebram a 3+1.

⚠️ **`flex: 0 0 auto` é obrigatório no `<li>` de chips roláveis no mobile** — senão os
chips colapsam.

⚠️ **Alargar o trilho tornou os tetos de medida de linha OBRIGATÓRIOS, não dispensáveis.**
Não remover teto "porque agora tem espaço" — é o inverso.

⚠️ **Mover uma seção exige conferir a alternância de fundo das vizinhas.** Creme e bege
alternam; a saída dos Depoimentos do meio de Participar deixou duas seções seguidas em
bege.

⚠️ **Pontuação órfã em títulos grandes: nenhuma linha pode conter só pontuação** (`:`,
`,`, `.`). **Causa raiz:** um destaque com `display: inline-block` vira **token atômico**,
e a pontuação seguinte ganha oportunidade de quebra própria. **Solução:** agrupar
palavra-destaque **+ sua pontuação** num wrapper com `white-space: nowrap`; **o espaço
fica FORA do wrapper**, para preservar a quebra natural entre grupos. **`nowrap` só em
grupos curtos — nunca em frase inteira, causa overflow horizontal.** `text-wrap: balance`
(títulos) e `pretty` (parágrafos) convivem com os grupos. **Revisar títulos grandes em
mobile, tablet e desktop antes de aprovar qualquer página.**

⚠️ **Container queries `cqi` escalam pela largura do card, não pelo comprimento do
texto** — limitar o teto do `clamp` quando o conteúdo for longo (ex.: `+R$ 712 mil`),
**sem aumentar só um card**.

### 10.6 Cor e contraste — números que já derrubaram decisões

| Combinação | Contraste | Consequência |
|---|---|---|
| Marrom `#6A2C15` sobre chocolate | **~1,5:1** | falha como emblema **e** como texto → 3º lugar não é marrom |
| Roxo `#4D257E` sobre chocolate | 1,45:1 | cai no amarelo em `pageColorDark()` — só rodapé e folha do menu, que são chocolate fixo (§6.2) |
| Marrom sobre chocolate (menu escuro) | 1,53:1 | cai no amarelo, mesmo caso acima |
| Laranja `#FF4810` sobre chocolate | 4,78:1 | passa, fica — é também o pior caso da barra de abas, que desde 27/08/2026 usa `--scw-pagina`/`--scw-pagina-tinta` como fundo (não mais chocolate fixo), então roxo e marrom nem chegam a precisar do fallback ali |
| Cyan `#01AFCC` sobre chocolate | 6,23:1 | passa, fica |
| Laranja como tinta pequena sobre creme | 3,0:1 | **só superfície preenchida** |
| Magenta `#F10767` sobre creme | 3,8:1 | **só texto grande** |
| Roxo como destaque de H1 em Participar | 4,25:1 | só texto grande |
| Magenta `#E50053` sobre `#0B0B0C` (F2) | 4,18:1 | só texto grande e elemento gráfico |
| Tinta `#F5F5F5` sobre `#0B0B0C` (F2) | 18,05:1 | rótulos pequenos e CTA usam esta |
| Magenta como fundo de texto creme (Participar 04) | 4,86:1 | passa — por isso o ciclo fecha em magenta ali |
| Vinho sobre foto (numeral de Edições) | 2,08:1 | por isso o numeral é `#FEF0DD` |
| Pill chocolate com tinta creme (menu Participar) | 10:1 | substituiu `#D0055B` |

⚠️ **Cyan e laranja não fecham 4,5:1 como texto sobre creme** → em link com filete, quem
recebe a cor é **o filete**, não a tinta.

⚠️ **O anel de foco global é cyan** → em chapa clara cyan (Participar) ele sumiria; usar
chocolate no selo, no CTA e no anel.

⚠️ **`--base` do `scwDestaque` tem que ser a tinta REAL daquele título** — senão o destaque
começa invisível sobre o próprio fundo.

### 10.7 Sincronia CSS ↔ JS

⚠️ **`PAGE_COLORS` / `MENU_ESCURO` em `src/components/nav.jsx` são espelho JS do CSS.
Mudou o CSS, muda o JS no mesmo commit.**

⚠️ **Ícone que não existe não quebra a página** — a checagem é manual, ver §6.11.

