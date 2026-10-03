<!-- Parte das regras do projeto. Índice e regras absolutas: CLAUDE.md da raiz. Movido sem reescrita em 03/10/2026. -->

## 6 · Sistema visual

Fonte única: `src/styles/scw-2026.css`. **Se este capítulo divergir do arquivo, vale o
arquivo.**

### 6.1 Paleta — 9 cores fechadas

**Nenhuma cor fora desta tabela. Não escrever hex solto em componente — usar o token.**

| Token | Hex | Papel | Sobre ele usa |
|---|---|---|---|
| `--scw-creme` | `#FEF0DD` | fundo base do site; texto sobre chocolate | `--scw-choco` |
| `--scw-bege` | `#F8E4C1` | alternância de seção, chips; cor da página Contato | `--scw-choco` |
| `--scw-choco` | `#3D1308` | tinta principal, seções escuras, fundo de card com filete | `--scw-creme` |
| `--scw-marrom` | `#6A2C15` | texto de apoio, rótulos pequenos; cor da página Apoiar | `--scw-creme` |
| `--scw-amarelo` | `#FDBB1A` | acento da Home; medalha de 1º lugar | `--scw-choco` |
| `--scw-cyan` | `#01AFCC` | acento de Participar; **anel de foco global** | `--scw-choco` |
| `--scw-roxo` | `#4D257E` | acento do Sweet Awards | `--scw-creme` |
| `--scw-magenta` | `#F10767` | destaque de título; **só texto grande** (3,8:1 sobre creme) | `--scw-creme` |
| `--scw-laranja` | `#FF4810` | acento de Edições; **superfície preenchida**; medalha de 3º lugar | `--scw-choco` |

**Foco:** o anel de foco global é `--scw-cyan`. É a **única cor de estado padronizada**;
hover e ativo usam a cor da própria página.

**Filete e card claro não são tokens de cor** — viram `rgba()` ou creme por papel:

- filete geral = `rgba(61,19,8,.14)`
- borda de campo de formulário = `rgba(61,19,8,.22)`
- placeholder de foto = `--scw-bege`
- card claro = `--scw-creme` (o filete é que carrega o recorte visual)

⚠️ **Cor de acento não é tinta** (11/09/2026). Amarelo, cyan, laranja e magenta em
**texto pequeno** sobre creme ou chocolate reprovam — a tabela do §6.3 diz quais, e a do
§10.6 diz por quanto. Onde a cor precisa aparecer num rótulo, **a tinta é `#6A2C15`
(9,4:1) ou `#3D1308` e a cor vira filete de 4px ao lado**, que é o padrão já usado no
sistema. Magenta sobre chocolate só a partir de 24px/700.

**Proibido:** `#E52C4B` (vermelho-coral, removido da paleta — não usar em nada); verde;
cinza frio aleatório; preto puro; **qualquer hex fora da tabela**; hex escrito direto em
componente quando existe token.

**Regra permanente de substituição: troca-se cor por PAPEL, não por aparência.** Foi
assim que saíram, sem substituto direto, `#B3213B` (vinho), `#EBD6B4` (filete),
`#FFF7E9` (card claro), `#D0055B` (magenta profundo) e `#D19100`/`#D9BE95`/`#C99A7E`
(ouro/prata/bronze de medalha).

**O roxo entrou na paleta em julho de 2026** e é o acento oficial do Sweet Awards. A
regra antiga "evitar roxo" está **superada** — ela nasceu de um lavanda `#B38CFF` fora da
identidade, não deste roxo.

#### Exceções declaradas — marca de terceiro dentro de bloco isolado

A seção de realização usa a marca da **F2 Experience**, a agência que realiza o festival,
não a marca do festival: fundo `#0B0B0C`, acento `#E50053`, tinta `#F5F5F5`, tipografia
**Archivo**. É a única quebra de **fonte** do site, proposital, restrita ao bloco
`.f2-realiza*` em `src/styles/scw-home.css`. O teste `tests/redesign-2026.test.mjs`
reprova essas cores em qualquer outro lugar e reprova `Archivo` fora dessa seção.

Contraste medido: tinta **18,05:1** sobre o preto; o magenta dá **4,18:1**, então ele
fica em **texto grande e elemento gráfico** — rótulo pequeno e CTA usam a tinta clara.

**A segunda exceção é o verde do WhatsApp** (2026-08-22, a pedido do Eloi): o botão
"Enviar no WhatsApp" da página estática `/quero-participar/` usa `#25D366`, a cor de
marca do WhatsApp. Restrito ao seletor `.pa-whats`; `tests/quero-participar.test.mjs`
reprova o hex em qualquer outro ponto do arquivo.

⚠️ **A tinta é chocolate, não o branco que o WhatsApp usa:** branco sobre `#25D366` dá
**1,98:1** e reprovaria. Chocolate dá **8,18:1**.

**O princípio que as duas compartilham, e que vale para a próxima:** cor de marca de
terceiro não entra na paleta — entra **escopada num seletor, com teste que reprova o
vazamento**. A regra "nenhuma cor fora da tabela" continua valendo para o festival; ela
nunca teve como objeto a marca de outra empresa.

⚠️ **Ícone de marca de terceiro é outra história.** Não existe `redes/whatsapp` em
`scw-icons-v2.js`, e §6.11 proíbe editar esse arquivo à mão. Desenhar a marca de memória
seria **inventar logo (A4)**. O botão usa `redes/conversa` do próprio sistema; o glifo
oficial só entra se alguém trouxer o SVG da brand page do WhatsApp, e aí entra como
**asset**, igual à logo da F2 — nunca como ícone SCW.

### 6.2 Cor por página

Tokens em `body.route-*`: `--scw-pagina` · `--scw-pagina-tinta` · `--scw-pagina-menu` ·
`--scw-pagina-sobre-creme`.

| Rota | `--scw-pagina` | tinta | contraste |
|---|---|---|---|
| `home` | `#FDBB1A` amarelo | `#3D1308` | 9,5:1 |
| `edicoes` | `#FF4810` laranja | `#3D1308` | 4,78:1 |
| `historico-awards` | `#4D257E` roxo | `#FEF0DD` | 9,95:1 |
| `participar` | `#01AFCC` cyan | `#3D1308` | 6,2:1 |
| `apoiar` | `#6A2C15` marrom | `#FEF0DD` | 9,44:1 |
| `contato` | `#F8E4C1` bege | `#3D1308` | 13:1 |

- **A cor da página não é fundo de herói.** Ela aparece em **dois** pontos exatos: o item
  ativo do menu (pill sólida) e o selo do herói.
  ⛔ **A barra de 5px sob o cabeçalho foi REMOVIDA** no fechamento de 29/07/2026 — o
  herói já é a cor da página. **Não recriar.** Onde a documentação antiga falava dela,
  leia "dois pontos", não três.
- **Por isso o acento não precisa ser tom claro.** A regra antiga que exigia tom claro
  vinha de quando a cor pintava a hero inteira.
- **Nenhuma página repete a cor da vizinha.** É o propósito da regra.
- **Sobre superfície escura FIXA** (rodapé, folha do menu) cada página usa
  `pageColorDark()` em vez da cor cheia: **roxo (1,45:1) e marrom (1,53:1) não sustentam
  texto sobre chocolate e caem no amarelo; laranja (4,78:1) e cyan (6,23:1) passam e
  ficam.** Ali a chapa é chocolate fixo porque a folha lista as 6 páginas ao mesmo
  tempo — não há uma "página corrente" para colorir o fundo.
  ⚠️ **A barra de abas do celular NÃO usa mais `pageColorDark()`** (27/08/2026, pedido
  do Wilke): ela é a única superfície escura com uma página corrente só, então virou a
  própria `--scw-pagina`/`--scw-pagina-tinta` — ver §10.6.
- **Espelho em JS:** `PAGE_COLORS` / `MENU_ESCURO` em `src/components/nav.jsx`.
  ⚠️ **Mudou o CSS, muda o JS no mesmo commit.**
- **Hover no menu** mostra a cor daquela página — amarelo e cyan direto; as demais caem
  no amarelo, por contraste sobre o véu escuro.
- **O herói tem par próprio, distinto de `--scw-pagina`:** `--scw-heroi` /
  `--scw-heroi-tinta`. A chapa do herói é a cor da página, e **a Home é a única exceção**
  — segue chocolate, porque a foto sangra e a cor já aparece no véu.
  Edições laranja · Awards roxo · Participar cyan · Apoiar marrom · Contato bege.
- **As compensações de contraste do herói seguem a COR, não a página.** Chapa **clara**
  (hoje só o cyan de Participar) precisa de selo, CTA e **anel de foco em chocolate** —
  o anel global é cyan e sumiria. Chapa **escura** (marrom, roxo) usa as regras base em
  creme.
- **Destaque do H1 — um acento por chapa**, sempre da paleta e sempre diferente da tinta
  do título: Home **magenta** · Edições **amarelo** · Awards **amarelo** · Participar
  **roxo** (4,25:1, texto grande) · Apoiar **amarelo** · Contato **marrom**.
  ⚠️ `--base` do `scwDestaque` tem que ser a **tinta real daquele título** — senão o
  destaque começa invisível sobre o próprio fundo.
- **Card ou CTA que navega usa a cor do DESTINO**, não a da página onde está. Onde a
  chapa do destino não separa do card (<3:1 de forma) entra um **anel de 2px** na tinta
  do card. Em **link com filete quem recebe a cor é o filete, não a tinta** — cyan e
  laranja não fecham 4,5:1 como texto sobre creme.

### 6.3 Sequência de irmãos nunca repete cor

Regra permanente, vale para toda fileira, grade ou lista de irmãos: cards, passos,
métricas, discos de ícone, pills, painéis. **Cada item recebe uma cor diferente da
paleta, na ordem**, e a sequência só volta ao começo depois de esgotar as cores
disponíveis para aquele fundo. **Dois irmãos com a mesma cor é defeito, não economia.**

Ciclo canônico: `amarelo → cyan → magenta → roxo → laranja → marrom`.

**Mas nem toda cor serve de tinta em todo fundo.** Filtrar pelo fundo antes de aplicar o
ciclo (texto grande = 3:1, texto pequeno = 4,5:1):

| Fundo | Tintas que passam | Reprovam |
|---|---|---|
| creme `#FEF0DD` | chocolate 12:1 · marrom 6,9:1 · roxo 6,7:1 · magenta 3,8:1¹ · laranja 3,0:1¹ | cyan 2,2 · amarelo 1,4 |
| bege `#F8E4C1` | chocolate 13:1 · marrom 6,3:1 · roxo 6,0:1 · magenta 3,4:1¹ | laranja 2,7 · cyan 2,1 · amarelo 1,4 |
| chocolate `#3D1308` | creme 12:1 · bege 13:1 · amarelo 9,5:1 · cyan 4,9:1 · laranja 4,8:1 | magenta 3,8¹ · roxo 1,45 · **marrom não sustenta** (~1,5:1) |
| roxo `#4D257E` | creme 10:1 · bege 8,9:1 · amarelo 6,5:1 · cyan 4,3:1¹ | magenta · laranja · chocolate |
| cyan `#01AFCC` | chocolate 5,6:1 | creme 2,3 · amarelo 1,6 |
| magenta `#F10767` | nenhuma tinta passa em texto pequeno | creme 3,8¹ · chocolate 3,8¹ |

¹ só a partir de 18,66px em peso 700+ (ou 24px normal), onde o mínimo cai para 3:1.

**Quando o fundo não oferece cores suficientes, não force a tinta: mova a cor para o
grafismo.** O numeral fica numa tinta sempre legível (chocolate) e quem carrega a cor é
**o disco de ícone** acima dele — a tinta do traço vira chocolate ou creme conforme o
fundo do disco:

```html
<span class="scw-disco" style="--c:var(--scw-magenta);--tinta:var(--scw-creme)">
```

Assim uma faixa de métricas sobre bege — onde só quatro tintas passam — tem uma cor por
dado sem nenhuma falha de contraste. Vale o mesmo raciocínio para pill, selo de canto e
filete.

⛔ **A régua pop de 4px (`.scw-stat__regua`, padrão StatBlock) saiu em 20/08/2026** — o
desenho passou a abrir cada dado com disco de ícone, que diz o que o número mede em vez
de só colorir. **Não recriar.**

**Duas leituras diferentes do mesmo padrão, e a diferença é proposital:**

| Onde | Disco | Cor |
|---|---|---|
| Home `05 Números` | `clamp(64px, 6vw, 80px)`, ícone a 60% | **uma cor por dado** — a faixa é o resumo do festival, cada número é um assunto |
| Apoiar `02` | `54px`, ícone a 58%, dentro de card creme | **cor da página em todos** (`--scw-pagina` / `--scw-pagina-tinta`) — ali a cor diz "isto é Apoiar"; quem distingue o dado é o ícone |
| Participar `04` | `54px`, **card chapado** na cor do ciclo | **uma cor por card** — amarelo · cyan · roxo · laranja (15/09/2026, pedido do Wilke; magenta fica fora, não fecha texto pequeno). O disco inverte: chapa na tinta do card, ícone na cor dele |

### 6.4 Medalhas do Sweet Awards

Codificam colocação, não decoram.

| Posição | Token | Hex |
|---|---|---|
| 1º | `--scw-amarelo` | `#FDBB1A` |
| 2º | `--scw-cyan` | `#01AFCC` |
| 3º | `--scw-laranja` | `#FF4810` |

**Numeral sempre chocolate.** O 2º passou a **cyan** em 20/08/2026 (handoff `06-SWEET-AWARDS.md`) — 4,9:1 sobre chocolate, e separa melhor do amarelo do 1º que o bege separava. ⚠️ **O 3º lugar não é marrom:** marrom sobre chocolate dá
~1,5:1 e falha tanto como emblema quanto como texto solto — testado e descartado.

### 6.5 Tipografia — uma família, duas vozes

**Revisão de 11/09/2026.** A regra anterior ("Nexa Slab, fonte única") está **superada**:
a slab em tudo deixou a leitura carregada — o título não sobressai quando o corpo também
tem serifa e peso. A Nexa Slab volta a ser a **voz** do festival; a **Nexa** (sem serifa,
mesma família) assume a interface e a leitura.

| Voz | Família | Token | Papel |
|---|---|---|---|
| **Expressão** | Nexa Slab (arquivo local) | `--scw-font-slab` / `--scw-font-black` | H1, H2, H3 de card, numeral, chamada editorial, citação, ênfase em itálico Black, marquee |
| **Interface** | `nexa` (Typekit `ngx4uek`) | `--scw-font-ui` | rótulo/eyebrow, botão, pill, chip, aba, menu, nome em lista, dado, data, **lead**, selo de estado, casca do painel |
| **Leitura** | `nexa-text` (Typekit `ngx4uek`) | `--scw-font-texto` | parágrafo, descrição, legenda, crédito, texto de campo, célula de tabela |

```css
--scw-font-slab:  'Nexa Slab', system-ui, sans-serif;
--scw-font-black: 'Nexa Slab Black', 'Nexa Slab', Georgia, serif;
--scw-font-ui:    'nexa', 'Nexa Slab', system-ui, sans-serif;
--scw-font-texto: 'nexa-text', 'Nexa Slab', system-ui, sans-serif;
--scw-font:       var(--scw-font-slab);   /* LEGADO — ver abaixo */
```

⚠️ **`--scw-font` é nome legado, não apelido permanente da slab.** Ele aponta para a
Slab, que é o que sempre significou, e existe só enquanto as páginas migram uma a uma: o
CSS de página que ainda o consome fica com a aparência de hoje em vez de trocar de fonte
sem ninguém ter olhado. **Sai quando a última página migrar.** Estado da migração:

| Arquivo | Estado |
|---|---|
| `scw-2026.css` (o sistema: corpo, lead, rótulo, botão, pill, menu, campo, casca) | ✅ migrado — **e isso alcança as seis páginas de uma vez** |
| `scw-home.css` | ✅ migrado |
| `scw-participar-apoiar.css` | ✅ migrado em 15/09/2026 — alcança Participar **e** Apoiar |
| `scw-edicoes.css` · `scw-awards.css` · `scw-contato.css` · `scw-aguarde.css` | ⏳ ainda em `--scw-font` (Slab) |
| `em-breve.css` | ⏳ idem |
| `painel-app/src/styles/painel.css` | ✅ usa `--f-titulo`/`--f-ui`/`--f-texto` (Slab só em título; Fase 15) |

⛔ **O kit não tem 500, 800 nem 900 na sem serifa.** Por isso `font-synthesis: none` no
reset: peso que falta é peso que não existe, e deixar o navegador simular engorda o traço
sem avisar. **Não substituir a Nexa por outra sem serifa "parecida".**

| Papel | Classe | Valor |
|---|---|---|
| H1 de herói | `.scw-h1` | Slab `900 clamp(38px,4.8vw,84px)/.9`, `-.045em`, **17ch** |
| H1 compacto (Contato) | `.scw-h1--compacto` | Slab `900 clamp(28px,3vw,44px)/1`, `-.035em` |
| H2 de seção | `.scw-h2` | Slab `900 clamp(32px,3.8vw,58px)/.94`, `-.04em`, **22ch** |
| H3 de card | `.scw-h3` | Slab `900 clamp(18px,1.7vw,22px)/1.06`, `-.026em`, **28ch** |
| Numeral grande | `.scw-numeral` | Slab `900 clamp(38px,4.4vw,74px)/.84`, `-.06em`, `tabular-nums` |
| Ênfase editorial | `.scw-italico` | Slab Black `900` itálico — **uma por título** |
| Corpo | `.scw-corpo` | **Nexa Text** `400 clamp(15.5px,1.2vw,17px)/1.6`, `pretty`, **62ch** (limite absoluto 68) |
| Lead | `.scw-lead` · `.scw-hero__lead` | **Nexa** `400 clamp(17px,1.4vw,21px)/1.5`, **46ch** |
| Rótulo | `.scw-rotulo` | **Nexa** `700 12px/1`, **`.14em`**, uppercase, `#6A2C15` |
| Rótulo com ícone | `.scw-rotulo--com-icone` | **42ch, uma linha** |
| Botão | `.scw-btn` | Nexa `700 15px/1`, sem caixa-alta |
| Item de menu | `.scw-nav a` | Nexa `700 14px/1.4` (ativo itálico), lowercase |
| Campo | `.scw-campo input` | Nexa Text `400 16px/1.4`; rótulo Nexa `700 11px` |

**Pesos por voz, e nada entre eles:** Slab 900 (título, numeral, ênfase) · Slab 800
(chamada curta em card) · Nexa 700 (rótulo, botão, menu, nome, dado) · Nexa Text 400
(corpo, legenda, campo) e 700 (destaque em linha). **Slab 500 e Slab 700 em texto corrido
estão superados** — eram o peso de leitura antes da Nexa entrar. 600 não existe em
nenhuma das três.

**Três regras de convívio:**

1. **Uma troca de família por bloco.** Slab no título, Nexa no resto do mesmo bloco.
   Alternar dentro do parágrafo, Slab em botão ou Nexa em H2 quebra o contrato.
2. **O tamanho compensa a troca.** A Nexa Text tem olho maior que a Slab: o corpo desce
   de `…18px/1,55` para **`…17px/1,6`** e lê maior, não menor. Rótulo caixa-alta baixa o
   tracking de `.16em` para **`.14em`** — a Nexa é mais estreita e o valor antigo abria
   buraco entre as letras.
3. **Piso de leitura não muda:** corpo nunca abaixo de 15px no celular, rótulo nunca
   abaixo de 11px em qualquer tela.

⚠️ **O que segura a leitura não é o trilho — é a medida de linha.** Com trilho de 2200px
e sem esses tetos, um parágrafo daria ~200 caracteres por linha. **Não remover teto de
medida "porque agora tem espaço": é o inverso.** `tests/redesign-2026.test.mjs` reprova
se saírem.

⚠️ **O teste de peso mudou junto** (`tests/regua-visual.mjs`, item 4). Ele afere o par
**peso + família na mesma declaração**, não o número solto: 400 só com `--scw-font-ui` ou
`--scw-font-texto`; 600 em lugar nenhum; 500 ainda permitido enquanto houver página em
`--scw-font`. **Quem escrever `font-weight: 400` solto, longe da família, é reprovado** —
é a forma de escapar do par sem ninguém notar.

**Rótulo / eyebrow é o padrão.** A regra antiga "não usar eyebrow acima dos títulos" está
**superada**. Forma canônica `.scw-rotulo`. **Continua proibido rótulo sem função:**
repetir o título, anunciar o óbvio, enfeitar.

**Itálico** só no Black e **só em uma expressão por título**. Dois itálicos na mesma tela
cancelam o efeito. A única exceção fora da Slab é a legenda de foto em Nexa Text itálico.

**Compensação óptica:** caixa-alta dentro de pill leva **1px a mais de padding no topo e
1px a menos na base** — o caixa-alta da Nexa Slab renderiza ~2px acima do centro.

⛔ **Proibida a fonte mono** (JetBrains Mono e afins) em rótulos, labels, eyebrows e
metadados — rejeitada duas vezes pelo Eloi. **Incomoda a face mono, não o caixa-alta:**
caixa-alta com letter-spacing seguem permitidos.

Tudo em `clamp()`. **Não inventar tamanho novo: usar a classe.**

### 6.6 Trilho, grade e espaçamento

**Trilho único — uma só regra de margem horizontal para cabeçalho, seções, rodapé e
Edições:**

```css
--scw-trilho: max(clamp(24px, 5vw, 96px), calc((100% - 2200px) / 2));
```

- Largura máxima de conteúdo **2200px, centralizada**, gutter de **24–96px**. Aplicar
  como `padding-inline: var(--scw-trilho)` — a classe `.scw-secao` já faz.
- **Não inventar largura nem gutter próprios. Não usar `max-width` em container além
  disso.**
- Seção que **sangra até a borda** (banda de foto) usa **margem negativa do mesmo
  trilho**, nunca um valor solto.
- O gutter vale até **2392px** de viewport; acima disso a grade centraliza.

**Ritmo vertical:**

```css
--scw-sec-y:          clamp(60px, 6.4vw, 104px); /* entre seções */
--scw-sec-y-compacta: clamp(44px, 4.8vw, 76px);
--scw-hero-topo:      clamp(216px, 19vw, 252px); /* reserva de topo das heros */
```

**Respiro interno de seção:** `--scw-gap-cabeca` (34–56px) · `--scw-gap-bloco` (20–32px)
· `--scw-gap-grade` (16–28px). **O ritmo ENTRE seções continua `--scw-sec-y`.**

**Raios, sombras, easing:**

```css
--scw-r-secao:     26px;   --scw-r-interno: 22px;   --scw-r-card: 20px;
--scw-sombra-card: 0 18px 42px rgba(61, 19, 8, .22);
--scw-sombra-foto: 0 14px 34px rgba(0, 0, 0, .34);
--scw-ease:        cubic-bezier(.22, .9, .24, 1);
```

- `var(--scw-r-card)` = **20px** em **todo** card institucional.
- `--scw-transicao`: **200ms** para cor/borda/sombra/gap, **180ms** para transform.
- **Desabilitado tem um estado só:** `.45` / `cursor: default` / `pointer-events: none`.
- **Botões são chapados:** sem `box-shadow`. O clique responde com deslocamento — hover
  sobe 2px, active volta. **Handoff que trouxer sombra em botão está desatualizado.**

**Grades:**

- `.scw-grade` — grade responsiva padrão.
- `.scw-grade-fixa` — **desconta o gap na fórmula de largura. Obrigatória em faixas de 4
  numerais:** sem ela a linha quebra a 3+1.

**Cabeça de seção:**

- Ícone do rótulo de seção: `tamanho={20}`. **16 fica só em chip e legenda.**
- Gap do rótulo: **10px**.
- **Lead só quando informa** o que o H2 não dá; senão rótulo + H2 em bloco único.

### 6.7 Zona de segurança entre menu e herói — regra estrutural

- O **fundo** do herói pode subir até o topo. O **conteúdo** — títulos, textos, imagens,
  cards — só começa **depois** do offset de segurança do cabeçalho. **Nenhum elemento do
  herói sobrepõe, compete ou encosta no menu.**
- A logo do cabeçalho **transborda metade abaixo** da linha do header
  (`top:100%; transform:translateY(-50%)`), então a reserva de topo é maior que a
  intuitiva — daí `--scw-hero-topo: clamp(216px, 19vw, 252px)`.
- Heróis com conteúdo **ancorado embaixo** (Home, Participar, Apoiar):
  `padding-top: clamp(232px, 22vw, 290px)`. Herói **compacto** (Contato):
  `var(--scw-hero-topo)`.
- **Aplicar sempre no `padding` do próprio herói.** Nunca com `margin-top` solto,
  empurrão manual no título, `position:absolute` improvisado ou ajuste que só funcione
  numa tela.
- **No mobile (≤900px) a logo perde o overhang** — `top:50%`, altura **52px**.

### 6.8 Heróis

| Regra | Valor |
|---|---|
| Altura | **proporcional ao conteúdo** — nunca 1080px fixo, nunca `height` rígida |
| Reserva de topo | `--scw-hero-topo` ou o valor ancorado |
| Título | `.scw-h1`, à esquerda, `max-width:17ch` |
| Lead | `.scw-lead`, `max-width:46ch` |
| Selo | `.scw-pill--pagina`, usa `--scw-pagina` — **saiu de Participar, Apoiar e Sweet Awards em 27/08/2026** (pedido do Wilke); segue vivo só onde outra página o usa |
| Foto | fundo à direita com **véu em degradê a 96°** (`.97 → 0` entre 0% e 92%) |
| Botões | depois do lead, alinhados à esquerda |
| Fundo | cor da página via `--scw-heroi`; **só a Home segue chocolate** |

⚠️ **Sem selo, o H1 não herda mais a margem-superior que separava dele.** Nas
três páginas acima o título virou o primeiro filho do bloco de texto do herói
e ganhou `margin-top: 0` — regra por `:first-child` em `.pa-hero__titulo`
(`scw-participar-apoiar.css`) e direto em `.swa-hero__texto .scw-h1`
(`scw-awards.css`). Página que ainda tem selo (nenhuma hoje) não é afetada.

- ⛔ **`.swa-hero::before` não existe mais** — o degradê chocolate que descia 340px do
  topo saiu; a própria banda de foto escurece onde a logo passa. Era o mesmo trabalho
  feito duas vezes. **Não recriar.**
- **Home:** desde 28/09/2026 **não usa `.scw-hero`**: é a abertura `.hm-abre`, em duas
  colunas (texto + fotos em moldura), altura do conteúdo — ver §7.1.
- **Participar e Apoiar:** herói = **H1 + lead + duas ações. Nada mais** (sem selo
  desde 27/08/2026).
  ⛔ O cartão 4:3 em crossfade e os 3 indicadores **saíram** — os três números já
  existiam idênticos na seção `03 Números`. **Não reintroduzir.**
- Todo herói deve: identificar a página, ter boa leitura, usar imagem coerente com o
  assunto, respeitar o KV institucional, adaptar ao mobile, não ocupar espaço excessivo e
  não esconder informação.

### 6.9 Herói no celular (<1000px) — regra estrutural

**DOIS BLOCOS, NAS CINCO PÁGINAS — construção fechada em 22/08/2026** (pedido do Eloi:
*"aplica a mesma lógica e regras em todas, pra ficarem com tamanho igual, mas cada uma
mantém a sua cor"*). Foto quadrada de largura cheia em cima, esfumada na base, texto
embaixo sobre a chapa sólida da página.

| Peça | Regra |
|---|---|
| Foto | `.scw-hero-banda` (`.scw-hero__fotos` na Home) **no fluxo**, `aspect-ratio: 1`, largura cheia. Em 390px são 390px — ~46% de um viewport de 844 |
| Emenda | `::after` na própria foto, rampa de **três** paradas, na cor do bloco. A foto dissolve na chapa em vez de terminar numa aresta |
| Chapa | `background: var(--scw-heroi)` + `color: var(--scw-heroi-tinta)` — chocolate na Home, cyan em Participar, marrom em Apoiar, bege em Contato, roxo no Awards |
| Véu | `display: none`. Existia para segurar texto SOBRE foto, e não há mais texto sobre foto |
| Altura | `min-height: 0` — foto + texto, sem piso (§6.8) |

⚠️ **A chapa é obrigatória, e é o erro que custaria caro.** Antes quem pintava a cor do
herói era o VÉU, por cima da foto; o bloco podia ficar no chocolate padrão. Sem véu e sem
esta linha, o título de **Contato sairia chocolate sobre chocolate** — a tinta do herói
dele é escura.

**Contrastes medidos, todos acima de 4,5:1:** creme sobre chocolate 12:1 · chocolate
sobre cyan 5,6:1 · creme sobre marrom 9,44:1 · chocolate sobre bege 13:1 · creme sobre
roxo 9,95:1.

**O zoom é consequência da caixa, não de enquadramento:** `cover` num quadrado corta ~33%
da largura de uma foto 3:2, contra ~70% na caixa alta de antes. Foi o que motivou a
mudança, junto com o título caindo sobre rostos e áreas claras.

⛔ **Não devolver a foto para `inset: 0`, não recriar o véu no celular, não devolver piso
de altura.** A construção anterior (foto cobrindo o herói, texto por cima, véu segurando
a leitura) valeu de 21/08 a 22/08/2026 e está revogada.

**Alturas medidas em 390×844:** Home 920px (foto 16:10, §7.1) · **Participar e Apoiar 886px** · Contato
770px · Awards 826px.

⚠️ **Participar e Apoiar são a exceção da proporção: a foto delas é 4:3, não 1:1**
(`.pa-hero .scw-hero-banda`, pedido do Eloi em 22/08/2026 — "encurtar o herói"). Eram as
duas mais altas das cinco, com 983px, porque levam 89px de conteúdo que as outras não
têm: o selo quebra em duas linhas (48px) e há a nota de curadoria embaixo das ações
(41px). O 4:3 tirou 98px e trouxe a última ação para dentro do viewport.

⛔ **A alavanca das "ações lado a lado" não existe, e está medido:** os dois botões dão
**241px + 287px numa linha de 342px**. Lado a lado quebrariam o rótulo dentro do botão e
devolveriam a altura economizada. Não testar de novo.

Se um dia a uniformidade voltar a pesar mais que a altura, o certo é **levar as cinco
para a mesma proporção**, não devolver estas duas para o quadrado.
⛔ **A rampa em S por máscara MORREU junto com o véu.** Até 22/08/2026 a banda era
recortada por `mask-image` em smoothstep `t²(3−2t)`, com os tokens `--scw-esfuma` /
`--scw-esfuma-topo` e `--scw-banda-base`. **Os três tokens não existem mais no CSS**, e a
geometria de `44vh / 340px` da banda de desktop do Awards saiu junto: as cinco páginas
usam a mesma foto quadrada no fluxo. A emenda hoje é a linha da tabela acima — `::after`
na própria foto, rampa de três paradas, na cor do bloco.

> **O que continua valendo dessa história, e por que:** degradê **linear** em alpha lê
> como faixa dura — *o olho enxerga a derivada, não o valor* —, então a rampa de três
> paradas existe pelo mesmo motivo que a smoothstep existia. Mudou o mecanismo (cor sobre
> a foto, não máscara), não a razão. Rampa de duas paradas volta a marcar aresta.

⚠️ **Ponto focal por breakpoint:** `bgStyle()` resolve **um** valor, e style inline
**vence media query**. Elemento único que aparece nas duas telas com enquadramento
diferente manda os dois como custom property (`--foco` / `--foco-mobile`) e deixa o CSS
escolher. É o arranjo que `HeroFotos.jsx` usa.

**As fotos vêm de `heroPhotos(rota)`** em `src/data/imageLibrary.js` — **caminho de
imagem não se escreve à mão na página** (§6.12). ⚠️ **Deixaram de ser foto única e viraram
séries em crossfade**, montadas por `HeroFotos.jsx` a cada 6,2s:

| Rota | Série | Nº |
|---|---|---|
| Home | pessoas da Lovers (`lovers-publico/08, 07, 04`) + um combo por foto | 3 |
| Participar | `participantes-lojas/01–11` | 11 |
| Apoiar | `participantes-lojas/12–22` | 11 |
| Contato | `sweet-lovers/01–05` | 5 |
| Sweet Awards | `awards-entrega/01–06` | 6 |

⚠️ **As 22 fotos de loja são divididas, não compartilhadas:** Participar leva a primeira
metade, Apoiar a segunda, e **nenhuma imagem se repete entre os dois heróis**. Ao
acrescentar foto, manter a divisão — repetir quebra a intenção sem quebrar nada visível.

### 6.10 Componentes

**Casca (global):**

| Componente | Classe | Arquivo |
|---|---|---|
| Raiz | `.scw-raiz` | `scw-2026.css` |
| Cabeçalho | `.scw-header`, `.scw-header__linha`, `.scw-header__veu` | `nav.jsx` |
| Marca | `.scw-marca` → `MARCA_SCW` = `/images/logo-seal-sweet-coffee.svg` | `nav.jsx` (const exportada, reusada pelo rodapé) |
| Navegação | `.scw-nav` | `nav.jsx` |
| Chapa das barras da base | `.scw-casca-base` | `scw-2026.css` — fixa, `rgba(43,14,6,.96)`, `blur(14px)`, filete de creme a .14. **Duas peças a usam**: a barra de abas do site e a barra da ação da `/em-breve`. ⚠️ O chocolate é mais fundo que `--scw-choco` de propósito: sob desfoque a chapa clareia com o que passa atrás |
| Barra inferior mobile | — | `MobileTabBar.jsx` (**5 abas, ≤900px**) — compõe `.scw-casca-base` |
| Folha "mais" | `.scw-folha*` | `MobileMenu.jsx` |
| Painel (organização + marca) | `.og-*` / `.pn-*` | `painel-app/` — app React, entry Vite próprio, servido em `/painel`, `/organizacao` e `/marca` por rewrite (`docs/PAINEL-REACT-MAPA.md`) |
| Diálogo de acesso | `.scw-acesso*` | `AccessDialog.jsx` — duas faixas (topo chocolate + corpo creme), botão "Acesso" **com rótulo**, sem marca-d'água. **Os dois cartões têm peso diferente de propósito**: Organização em chapa chocolate com ação amarela; Participante em card bege com filete sólido e **ação chocolate** (14,46:1). A régua de 5px segue a ordem dos cartões: cyan à esquerda, roxo à direita. ⛔ Não igualar os dois. ⚠️ **Mas o motivo do peso mudou em 25/08/2026, e a regra antiga não vale mais:** até então o cartão do participante era **reserva honesta** (§6.12) — moldura tracejada, selo "Painel · em breve", sem ação — porque `/marca/` não existia. Existe desde 25/08, e o diálogo é a **única porta pública do domínio** enquanto o gate está ligado: manter o selo seria a interface negando a área que ela abre, para a marca que acabou de receber as credenciais. Tracejado e selo saíram; o peso hoje diz **público**, não disponibilidade. ⚠️ **Desde 25/08/2026 a ação do cartão também não é mais `<a>`:** igual à Organização, ela abre um passo de login dentro do MESMO diálogo (nome do estabelecimento + senha), com Supabase Auth de verdade — ver §6.10-b, ponto 4. **Reformulado em 22/08/2026 e 25/08/2026** (§6.10-b) |
| Voltar ao topo | `.scw-topo` | `BotaoTopo.jsx`, flutuante, aparece após **1,5 tela**. **Só o ícone** desde 18/09/2026 (pedido do Wilke): disco chocolate de 46px, `aria-label` e o nome no hover/foco por `.scw-icone-rotulo--esquerda` (§6.11) |
| Rodapé | `.scw-footer*` | `SiteFooter.jsx` |
| Pular para conteúdo | `.scw-skip` | `nav.jsx` |

**Blocos:**

| Peça | Classe | Variações |
|---|---|---|
| Seção | `.scw-secao` | `--creme` `--bege` `--choco` `--marrom` `--compacta` |
| Card | `.scw-card` | `--destaque` |
| Botão | `.scw-btn` | — |
| Pill / selo | `.scw-pill` | `--bege` `--pagina` |
| Rótulo | `.scw-rotulo` | `--micro` `--com-icone` |
| Foto | `.scw-foto` | `--banner` `--retrato` |
| Abas | `.scw-abas`, `.scw-aba` | `__icone` `__rotulo` `__indicador` |
| Campo | `.scw-campo` | — |
| Marquee | `.scw-marquee` | `__palavra` `__ponto` |
| Reserva | `.scw-reserva` | — |
| Destaque | `.scw-destaque` | — |
| Métrica | `.scw-disco` + `.scw-numeral` | disco na cor do ciclo **+ ícone que diz do que o número fala** → numeral chocolate (`white-space: nowrap`) → rótulo. **Número sem ícone não existe** |

**Prefixos por página:** Home `.hm-` · Edições `.scw-` (cena própria) · Sweet Awards
`.swa-` · Contato `.ctt-` · Participar e Apoiar `.pa-`.

**Regra:** peça usada por **2+ páginas** vira utilitária `.scw-*` em `scw-2026.css`. Peça
de **uma página só** fica no CSS da página, com o prefixo dela. **Não criar um terceiro
lugar.**

**Pisos de toque:** **44px** para qualquer controle — inclusive link de texto e item de
acordeão — **46px** para pílula de ação dentro de card, **54px** no herói. ⚠️ **O piso
vale para o controle real, não para a linha que o contém.**

#### 6.10-b Tela de acesso — reformulada em 22/08/2026 e 25/08/2026

Pedido do Eloi, três frentes.

**1 · Entra pela borda, e cada tela tem a sua.** A caixa centrada acabou nas duas.

| Tela | Peça | Geometria | Entrada / saída |
|---|---|---|---|
| ≤900px | **folha**, a mesma da aba "mais" | colada na base, largura cheia, raio `30px 30px 0 0`, puxador dentro da faixa chocolate, `max-height: 88svh` | `scwFolha` 340ms · `moFolhaSai` 260ms |
| >900px | **gaveta** | colada à direita, do alto ao pé, **520px**, raio `30px 0 0 30px`, sombra para a esquerda | `moGavetaEntra` 340ms · `moGavetaSai` 260ms |

Mesmas durações e curvas da folha nas duas — **só a direção muda** (§6.15.7). A gaveta
tem 520px e não os 760px da caixa antiga: nessa largura os dois cartões empilham, que é
a leitura certa numa peça alta. Fechar é movimento nas duas: `.is-fechando` por 260ms
antes de desmontar, como o `MobileMenu`.
⚠️ A faixa chocolate + a régua ficam num invólucro `.scw-acesso__cabecalho` com
`position: sticky` — quem rola é a caixa, e sem isso o **X sai de cena** junto com o
conteúdo. Na gaveta alta, isso é perder a saída do painel.

**2 · "Entrar" não sai do diálogo.** O botão era um `<a>` para `/organizacao/` e a senha
era pedida lá. Agora o corpo do próprio diálogo **vira o campo de senha**.
⚠️ **Não há autenticação nova aqui — é a mesma, um passo antes.** A lógica vive em
`src/lib/adminAccess.js`, no padrão dos formulários (§4.1): a lib não importa supabase,
a `rpc` é injetada. Ela chama `admin_ping` e, **só com `=== true`**, grava a senha em
`sessionStorage.scw_org` — a chave que `public/organizacao/` **já lê na abertura** para
montar o painel direto. Mesma origem, mesma aba, mesma chave: nada novo é exposto, e a
senha continua morrendo com a aba.
**Nada afirma que entrou sem o banco confirmar**, e os quatro motivos têm recados
diferentes (`vazio`, `senha`, `rede`, `sessao`).

**3 · Contraste.** ⚠️ O rótulo "Falar com a equipe" estava **chocolate sobre chocolate,
1:1, invisível** desde que o pé foi desenhado — a armadilha nº 1 do §10.1 de novo:
`.scw-raiz a { color: inherit }` (0,1,1) vencia `.scw-acesso__cta` (0,1,0). Corrigido por
**prefixo de seletor**, nunca `!important`. O "Entrar" saiu de `<a>` para `<button>` e,
de quebra, saiu do alcance do mesmo reset: antes ele herdava creme e ficava creme sobre
amarelo (~1,4:1); agora é chocolate sobre amarelo, 9,5:1.
⚠️ **Peça que troca de `<a>` para `<button>` precisa de `border: 0` explícito** — senão
herda a borda `2px outset` padrão do navegador. E o hover de `.scw-acesso__acao` inverte
para creme, leitura que só funciona sobre a chapa chocolate do cartão: no passo da senha,
que mora no corpo creme, o botão inverte para **chocolate** (12:1), senão sumiria.

**4 · A marca entra pelo mesmo caminho — 25/08/2026.** Pedido do Eloi: *"a área da marca
deve funcionar igual a área de login da organização"*. Até então "Sou participante" era
um `<a href="/marca/">` puro — a pessoa saía do diálogo direto para o formulário estático,
sem nenhuma casca da folha/gaveta. Agora ele abre o passo `'marca'` no MESMO diálogo,
desenho idêntico ao passo da organização, só o selo trocando para roxo (a cor do próprio
cartão na escolha).
⚠️ **A autenticação NÃO é a senha compartilhada da organização.** `/marca/` já usava
Supabase Auth de verdade (e-mail sintético `<slug>@marcas.…` + senha, §10.4-b) — o diálogo
só antecipa esse MESMO passo, em `src/lib/marcaAccess.js` (mesmo padrão de
`adminAccess.js`: lib pura, `signIn` injetado, sem import de supabase). A sessão gravada
em `sessionStorage.scw_marca` é o formato exato que `sessaoSalvar()` de
`public/marca/index.html` já produz (`access_token`, `refresh_token`, `expira_em`
calculado, `email`) — é por isso que `window.location.href = '/marca/'`, já autenticado,
abre direto no painel em vez de pedir login de novo.
⚠️ **`slugificar`/`enderecoDeLogin` viraram TRÊS cópias**, não duas: a página estática, a
Edge Function `criar-acesso-marca` e agora `marcaAccess.js`. `tests/marca.test.mjs`
("as três slugificações casam") compara as três — divergir uma faz a marca digitar o nome
certo e não entrar, com erro genérico de propósito.
🔴 **A brecha que isso quase abriu:** `public/marca/index.html` decidia, no boot, "achei
sessão em sessionStorage → `carregar()` direto", sem checar `deve_trocar_senha`. Era
seguro só porque a ÚNICA forma de a sessão nascer era o próprio formulário, que sempre
passava por essa checagem antes. Com o diálogo plantando sessão por um segundo caminho,
esse atalho puparia a troca de senha obrigatória do primeiro acesso — a marca cairia no
painel ainda com a senha que veio por WhatsApp (§10.4-b). Corrigido: o boot agora chama
`precisaTrocarSenha()` sempre que acha sessão pronta, **não importa de onde ela veio**.

**5 · Os dois formulários na mesma tela — 25/08/2026.** A partir do handoff
"Painel SCW app" (`painel-scw.html`), os três passos do diálogo (escolha →
senha → marca) viraram **um**: os dois cards já carregam o campo e o botão de
entrar, sem clique intermediário para revelar o formulário. Cada card é o
próprio `<form>`, com erro e envio independentes — os dois ficam visíveis ao
mesmo tempo. ⚠️ **A cor dos selos trocou**: Organização passa a **amarelo**
(era cyan), Participante passa a **cyan** (era roxo/transparente) — a régua de
5px abaixo do cabeçalho segue a mesma troca. O campo de identidade da marca
virou dois (nome **e** senha): o handoff mostra só um campo ("Login da
marca"), mas entrar de verdade exige senha (Supabase Auth) — um campo a mais
aqui é a leitura compatível, não um desvio do desenho. "Primeiro acesso da
marca" é um link que revela uma nota, não uma tela nova: o primeiro acesso já
usa os MESMOS dois campos, e quem troca a senha é `/marca/`, depois do login
(item 4 acima) — duplicar aqui a tela de senha nova seria um segundo caminho
para o mesmo passo (§5.2).
⛔ **REVERTIDO no item 6 abaixo (27/08/2026).**

**6 · A escolha volta a ser passo próprio, e o botão de entrada padroniza —
27/08/2026.** Pedido do Eloi. Dois ajustes juntos:

- **Três estados, não um.** `passo` (`'boasVindas' | 'organizacao' | 'marca'`)
  em vez dos dois formulários sempre visíveis do item 5. Abre em
  `'boasVindas'`: título **"Bem-vindo ao Painel SCW"**, lead, e os MESMOS dois
  cartões de antes — mas sem campo nenhum, só ícone + "Sou da organização" /
  "Sou participante" + descrição. O cartão inteiro é o gatilho (`<button
  type="button">`, não mais `<form>`) que troca `passo`. Clicar leva à tela de
  login correspondente, com um "‹ Voltar" que só troca `passo` de volta — não
  limpa o que já foi digitado (só fechar o diálogo limpa tudo, efeito que já
  existia). **Nada mudou na autenticação** — `enviarOrg`/`enviarMarca`,
  `RECADO`/`RECADO_MARCA`, tudo igual; só a ORDEM DE REVELAÇÃO voltou a ser
  passo próprio.
  ⚠️ **`.scw-acesso__cartao` virou alvo de `<button>` também** (era só
  `<form>`): ganhou `border:0; background:none; appearance:none; font:inherit`
  na regra base — mesma armadilha do item 3 acima (borda 2px outset do
  navegador), resolvida na fonte em vez de repetida por cartão. Só os dois
  cartões de ESCOLHA levam o modificador `.scw-acesso__cartao--escolha`
  (`width:100%; cursor:pointer`) — os de login continuam `<form>`, sem isso.
  Hover/press (`translateY(-3px)`/`scale(.985)`) já existiam na classe base e
  vieram de graça pros dois cartões novos.
- **Botão de entrada padronizado em todo o site: ícone `ChaveIcon` + texto
  "Painel SCW".** Antes eram três variações — `.scw-acesso-topo` (nav.jsx +
  Edicoes.jsx, que já duplicava a mesma marcação) dizia "Acesso" com
  `ChaveIcon`; `.scw-folha__acesso` do MobileMenu dizia "Área de acesso" com
  um SVG de pessoa desenhado à mão, sem relação com o resto do sistema. Os
  três agora dizem "Painel SCW"; o MobileMenu trocou o SVG solto por
  `ChaveIcon` importado de `nav.jsx` — mesma peça, três lugares, zero ícone
  inventado.
  ⚠️ **`redes/perfil` existe no sistema oficial** (§6.11) e é visualmente quase
  idêntico ao SVG de pessoa que saiu — mas é ícone **expressivo** (piso 24px),
  e os três botões usam 18–20px. `ChaveIcon` (hand-rolled, fora de
  `scw-icons-v2.js`, já usado em dois dos três antes desta mudança) continua
  sendo a peça certa nesse tamanho — não um ícone improvisado.
  ⚠️ **No topo, desde 18/09/2026, é SÓ o ícone** (pedido do Wilke: "só o ícone,
  mas discreto"). O botão do cabeçalho virou o componente **`AcessoTopo`**
  (`nav.jsx`), usado pelos dois cabeçalhos — o do site e o próprio de Edições,
  que repetiam a marcação. Disco de 44px em creme a 78%, chave chocolate de
  18px, sem texto e sem relevo; o nome "Painel SCW" aparece no hover e no foco
  (`.scw-icone-rotulo--esquerda`) e é o `aria-label`. ⛔ **Não tirar o disco:**
  o cabeçalho é fixo e passa por herói cyan, foto escura e seção creme sob
  véu — a chave solta sumiria em pelo menos um. A folha "mais" do celular
  segue com ícone + texto: ali é item de lista, não botão flutuante.
- **`public/painel/index.html` ganhou a MESMA reversão, mesmo dia.** A tela de
  login estática (`.pn-porta`) tinha o próprio desenho — dois `.pn-setor`
  sempre visíveis, nunca passou pela fusão de 25/08/2026 nem pela reversão do
  React ao mesmo tempo — e ficou divergente do diálogo do site: duas telas de
  "entrar no painel" com desenhos diferentes é exatamente a confusão que a
  reversão do item 6 tentava resolver. Mesmo padrão agora: `#pnEscolha`
  (default) mostra os dois `.pn-setor--escolha` sem campo (`<button>`, não
  `<form>`), `#pnOrg`/`#pnMarca` (escondidos por `hidden`) carregam os forms
  reais, cada um com "‹ Voltar" (`.pn-porta__voltar`) chamando
  `verEntrada('escolha')`. `ver('login')` sempre reseta pra `'escolha'` — reabrir
  o login (inclusive depois de `sair()`) nunca pousa num formulário de senha
  achado. `.pn-setor` ganhou o mesmo reset de chrome nativo do
  `.scw-acesso__cartao` acima (`border:0; appearance:none; text-align:left;
  font:inherit; width:100%`), e só o modificador `.pn-setor--escolha` leva
  `cursor:pointer`.

### 6.11 Iconografia v2

`<ScwIcon nome="familia/nome" tamanho={20} />` — fonte única em
`src/components/scw-icons/scw-icons-v2.js`: **136 ícones em 16 famílias, traço 3.2**.
Único importador é `ScwIcon.jsx`; **nenhum CSS crava `stroke-width` de ícone
institucional**. ⛔ **O arquivo não se edita à mão** — muda no Design e reexporta.

| Regra | Valor |
|---|---|
| Grade / área viva | **32** · ink só entre **3 e 29** |
| Traço | **3.2** (detalhe interno 2.4 · trilha pontilhada 4.0) |
| Cor | `currentColor` **sempre** — nunca `fill`/`stroke` fixo, nunca cor por prop |
| Tamanhos | **16 · 20 · 24 · 32 · 48**, e nada entre eles |
| Objetos por ícone | **1** |
| Vão interno livre | ≥ 2× o traço (6,4). Não cabe? a forma vira preenchida ou sai |
| Separação entre formas | ≥ traço + 1,5 (4,7) |

**Dois níveis, com piso de tamanho diferente:**

- **funcional** (`ui`, `aviso`, `acesso`) — **16 a 24px**, dentro de botão, campo, aba,
  menu e feedback. **No máximo 3 elementos**: legibilidade acima de personalidade.
- **expressivo** (as outras 13 famílias) — **piso de 24px**. Abaixo disso o desenho perde
  o que o torna autoral.

**Onde entra hoje:** rótulo de seção (`tamanho={20}`), chip e legenda (16), disco de dado
ou etapa. **Ícone acompanha rótulo, nunca o substitui.**

**Documentação embutida no próprio arquivo** — consultar antes de inventar regra de
ícone: `SCW_ICON_RULES`, `SCW_ICON_TIERS`, `SCW_ICON_MOTION`, `SCW_ICON_AUDIT`.

**Movimento:** 7 gestos prontos em `SCW_ICON_MOTION`, cada um com gatilho — avanço
(hover), toque (active), varredura (foco de campo), vapor (laço, só ≥32px), carimbo (ação
concluída), rota (`stroke-dashoffset`, exceção declarada) e pulso. **Nenhum roda em laço
solto. Ainda não aplicados no site** — a prancha existe, a decisão de animar é separada.

⚠️ **Ícone que não existe não quebra a página:** `ScwIcon` devolve `null` e avisa no
console só em DEV. Por isso a checagem é **manual** — ao mexer em ícone, **varrer as
chaves de `nome=` contra `SCW_ICONS` antes de commitar.**

### 6.12 Imagens

**Fonte única:** todo caminho de imagem sai de `src/data/imageLibrary.js`. **Nenhum
componente monta caminho na mão** — `tests/imagens.test.mjs` reprova; exceções
conscientes ficam na allowlist do próprio teste.

| Pasta (`public/images/`) | Conteúdo |
|---|---|
| `combos/<slug>/` | fotos dos combos por participante |
| `edicoes/<code>/` | **fotos** — acervo normalizado das 16 edições (`NN.webp`) |
| `marcas-edicoes/<code>/logo.png` | **marca** de cada edição (16) |
| `momentos/` | fotos institucionais de público e evento |
| `campanha/` | peças de campanha |
| `imprensa/` | material de imprensa |
| `shapes/` | formas de apoio (restam 2 com função) |
| `logos/participants/` | logos reais dos participantes |

**Regras de uso:**

- Foto real sempre que existir; `object-fit: cover`; proporção preservada; alt adequado.
- **Logo preenche 100% do slot** (11/09/2026): logo de participante e marca de edição
  usam `object-fit: cover` no slot inteiro — o arquivo já traz fundo e respiro próprios, e
  `contain` com margem interna soma respiro em cima de respiro, deixando a marca pequena
  no meio de um vazio. ⛔ Nunca `contain` com margem interna. Sem logo, iniciais sobre
  bege. **Nunca inventar logo** — `resolveParticipant` com fallback em iniciais.
  ⚠️ A regra vale para o **slot de marca**, não para toda imagem de logo: a marca da F2
  e a logo do cabeçalho são assets de proporção própria e seguem como estão.
  ✅ **O PAINEL segue a mesma regra (01/10/2026, pedido do Wilker):** `LogoMarca` /
  `.ui-logo` preenche 100% da caixa com `cover`, sem margem interna. A exceção de
  29/09/2026 (`contain` com margem) foi revogada — ver §10.4-b, Fase 15.
- **Coerência de conteúdo é obrigatória:** página de edição mostra fotos daquela edição;
  página de participante mostra o participante certo; **Sweet Awards mostra a peça
  premiada** (Melhor Doce → o doce, Melhor Salgado → o salgado, Melhor Bebida → a bebida,
  demais → o combo); página histórica não usa só imagem da edição atual; herói usa imagem
  do assunto da página.
- Proporções em uso: **1:1** (pódio, galerias) e **4:5** (card de 1º lugar no desktop,
  vira 1:1 até 820px).

⛔ **Nada gerado por IA entra como registro do festival.** O acervo externo tem pelo menos
uma peça assim, que imita um mapa com lista de participantes em texto deformado. **Uma
peça gerada que finge ser material real é dado inventado por outro meio.** Sinais de
alerta ao varrer acervo: nome de arquivo tipo "Imagem N gerada", texto ilegível ou
derretido em rótulos, logo com forma inconsistente. **Na dúvida, ampliar e ler o texto da
peça antes de usar.**

**Padrão de nome de arquivo** — o nome explica o conteúdo, **sem** parêntese, espaço,
acento, `final`, `novo`, `cópia` ou número de versão solto:

| Padrão | Exemplo |
|---|---|
| Foto de edição | `edicoes/<code>/NN.webp` |
| Marca de edição | `marcas-edicoes/<code>/logo.png` |
| Combo de participante | `combos/<slug>/main.jpg` |
| Logo de participante | `logos/participants/<slug>.png` |
| Foto de acervo numerada | `<pasta>/NN.jpg` |
| Peça de campanha | `<assunto>-<variante>.png` |

**Identidade em disco:**

| Arquivo | Status |
|---|---|
| `/images/logo-seal-sweet-coffee.svg` | ✅ **marca oficial do cabeçalho e do rodapé** |
| `/images/logo-sweet-coffee-week.svg` | ✅ wordmark grande — landing `/em-breve` |
| `/images/logo-f2experience.svg`, `/images/f2-symbol.svg` | ✅ marca da realizadora — seção 07 da Home |
| `/images/logo-sweet-coffee-week-header.svg` | ⚠️ sem uso — mantido |
| `/logos/lockup-scw-creme.svg` | ⚠️ sem uso — **não é a marca do cabeçalho** |
| `/images/logo-f2-experience.svg` (com hífen) | ⚠️ sem uso — a viva é sem hífen |
| `/images/selo-10-anos.svg` + `.png`, `/videos/video-selo10anos.webm` | ⚠️ sem uso — mantido |

**Favicons:** `favicon-sweet.svg` (mestre vetorial) + PNG 32, 48, 96, 192 e
`apple-touch-icon` de 180. Seis em disco, seis declarados no `index.html`.

⚠️ **Acervo não referenciado não é lixo.** As fotos sem página apontando para elas são
acervo do festival. **Não remover conteúdo do festival só porque não aparece na Home.**
Ao usar uma, registrar em `imageLibrary.js`.

**Ausência de imagem:** **reserva honesta** (`.scw-reserva`) — moldura editorial, borda
sutil, fundo da paleta, texto curto ("Foto pendente" / "Galeria pendente"), proporção
definida. **Nunca área vazia sem explicação, nunca imagem aleatória externa, nunca
hotlink, nunca esconder a ausência.**

### 6.13 Elementos gráficos e ilustração

- Todo elemento visual precisa de **função**: estruturar layout, indicar hierarquia,
  representar dado, organizar conteúdo, apoiar fotografia, reforçar identidade. Sem
  função clara → remover.
- **Teste:** *"esse elemento carrega informação ou só enfeita?"* Carrega → fica. Enfeita
  → sai.
- **A regra proíbe decoração gratuita, não elemento visual funcional.** Medalhas,
  pódios, selos de 1º lugar e destaques de categoria **codificam colocação e resultado**
  — são funcionais. Indicador de dado e feedback de UI também.
- ⛔ **Não usar stickers por padrão nas institucionais.** Só em material de campanha ou
  página específica, quando solicitado explicitamente.
- **Página Edições:** linguagem editorial, histórica, fotográfica — **não** estética de
  sticker ou colagem.
- **Ilustração:** hoje o site é **photo-first** e não há ilustração autoral em produção.
  Se entrar: flat artesanal, textura de pincel, formas simples, cores chapadas da paleta,
  aparência autoral, composição editorial, leitura rápida. **Evitar:** 3D, sombra
  realista, acabamento excessivamente digital, cartoon infantil, elemento genérico de
  banco, excesso de detalhe, estética sem relação com Natal ou com o festival.
- **Sweet Lovers = comunidade de fãs, nunca casais românticos.** Podem aparecer amigos,
  famílias, pessoas sozinhas, grupos, gente fotografando combo, seguindo rota, avaliando.

### 6.14 Responsividade

**Escala canônica: 1000 · 900 · 820 · 760 · 420.** Não existe token de breakpoint (CSS
não aceita `var()` em `@media`) — **a consistência é por convenção.**

| Ponto | Significado fixo |
|---|---|
| **1000px** | herói vira dois blocos empilhados — foto em cima, texto embaixo |
| **900px** | a casca vira aplicativo: logo perde o overhang (52px), botão de acesso do topo some, entra a **barra inferior de 5 abas** |
| **820px** | card de 1º lugar do Awards passa de 4:5 para 1:1; a grade de vencedores vira **carrossel de arrasto com snap** |

- Testado em 320, 360, 375, 388, 390, 430, 768, 1024, 1280, 1440, 1544 e 1920 — sem
  rolagem horizontal e sem texto cortado.
- Viewports do script Playwright: 390×844 · 414×896 · 430×932 · 768×1024 · 1024×768 ·
  1366×768.
- **Valor fora da escala só quando o conteúdo exigir ponto próprio — nunca por inércia ou
  cópia. Não renumerar em massa breakpoints já calibrados.**
- **Alvo de toque mínimo 44px no celular**, auditado em 390px nas 6 rotas.
- Mobile: evitar sticky horizontal complexo; evitar overflow lateral; manter leitura
  clara; botões tocáveis; reorganizar grades em coluna; manter logos e fotos
  proporcionais.

### 6.15 Movimento

**Fonte única do institucional:** `src/styles/scw-motion.css` + o motor
`src/hooks/useSiteMotion.js`. ⛔ `src/styles/motion-system.css` é o sistema **anterior** e
sobrevive **só** para a landing `/em-breve` — **não usar em página nova.** O mesmo vale
para `useRevealOnScroll.js` e para as classes `.motion-reveal-left/right`,
`.motion-button-hover`, `.motion-press`, `.motion-float-soft`, todas **removidas** do
institucional.

**Ritmo — uma escala, quatro degraus:**

| Token | Valor | Onde |
|---|---|---|
| `--mo-rapido` | **180ms** | botão, link, ícone |
| `--mo-estado` | **300ms** | hover de card, acordeão, cabeçalho, menu |
| `--mo-entra` | **620ms** | entrada de texto, bloco e card |
| `--mo-longo` | **880ms** | herói e imagem grande |
| `--mo-passo` | **90ms** | intervalo entre itens de uma sequência |
| `--mo-passo-card` | **70ms** | card a card dentro de uma grade |
| `--mo-respiro` | **26s** | laço de respiração da imagem |

**Quatro camadas — para que serve cada duração** (Caderno cap. 09, 11/09/2026). Os tokens
não mudam; o que entra é o critério de quando cada um cabe:

| Camada | Token | Gatilho | Repetição | No celular |
|---|---|---|---|---|
| **1 · Resposta** | `--mo-rapido` 180ms | ação direta | a cada ação | igual, sem hover |
| **2 · Continuidade** | `--mo-estado` 300ms | navegação | a cada troca | 260ms; folha sobe de baixo |
| **3 · Narrativa** | `--mo-entra` 620ms | seção entra na tela | **uma vez por sessão** | deslocamento 22 → 14px, degrau 70ms |
| **4 · Atmosfera** | 26–28s, linear | carga da página | infinita, **com pausa** | só um por tela |

**Resposta** confirma que o sistema ouviu: botão, chip, ícone, validação — e o gesto é o
deslocamento de 1px no `active` e de 4px na seta, nunca o `gap` do botão crescendo.
**Continuidade** diz que mudou de lugar, não de página: abas, acordeão, folha, filtro.
**Narrativa** estabelece hierarquia pela ordem de entrada. **Atmosfera** é o único
movimento sem gatilho — e por isso **a pausa visível é obrigatória**, nunca escondida no
hover.

⚠️ **Atmosfera nunca carrega informação.** A faixa de rótulos repete o que já está escrito
na página; se a animação não rodar, nada se perde. **Conteúdo que só existe dentro de um
laço contínuo é conteúdo que alguém vai perder** — ver a pendência da fita de galerias da
Home no §7.1.

⚠️ **Marquee — invariante de laço.** Em faixa contínua com duas cópias e
`translateX(-50%)`, **metade da largura tem que ser exatamente uma cópia**. `gap` no
contêiner animado quebra isso e o laço salta a cada volta: o espaçamento vai como
`padding-right` **dentro** de cada cópia. ✅ `.scw-marquee` já faz assim — conferido em
11/09/2026; a regra existe para a próxima faixa, não para corrigir esta.

⛔ **A faixa de palavras NÃO tem pausa em página nenhuma — exceção declarada, decisão
do Wilke em 18/09/2026.** O botão `<Marquee comPausa />` (15/09/2026) existia só em
Participar e saiu a pedido dele, avisado de que isso descumpre a camada 4 e a WCAG 2.2.2
(nível A). Com ele saíram a prop, `.is-pausado` e `.scw-marquee__pausa`. **As quatro
faixas (Home, Participar, Apoiar, Awards) descumprem a camada 4 hoje.** O que ainda
segura: com `prefers-reduced-motion` a faixa não anda, e ela é `aria-hidden` — repete o
que a página já diz (atmosfera nunca carrega informação). Se a regra voltar a pesar, o
caminho é religar a pausa na fonte (`Marquee.jsx`), não página a página.
A utilitária `.scw-icone-rotulo` (`data-rotulo`, `--esquerda`) **fica**: é a peça do
§6.11 para botão só com ícone, usada pelo som do palco de depoimentos e pelo botão Topo.

**Curvas:** `--mo-ease` (saída suave, **igual a `--scw-ease`**) · `--mo-mola` (chegada que
pousa) · `--mo-suave` (laços de ida e volta).

**Deslocamento:** `--mo-y` 22px · `--mo-y-titulo` 30px · `--mo-y-texto` 14px · `--mo-x`
26px · `--mo-desfoque` 6px. **Abaixo de 900px todos encolhem e o desfoque zera.**

**Como o motor decide.** O JSX **não** carrega classe de animação. `useSiteMotion` varre a
página, guarda **só a ocorrência mais externa de cada ramo** (um `<p>` dentro de um card
dentro de uma grade não é item próprio — a grade é) e carimba:

- `data-mo="sobe|titulo|texto|foto|lado"` — o tipo de entrada;
- `--mo-i` — posição na sequência; **reinicia a cada `<section>` e a cada `.scw-rotulo`**;
- `data-mo-grade` + `--mo-j` nos filhos — cards entram um a um, **teto de 8 degraus**.

**Fica de fora:** heróis (coreografados por `@keyframes`), página Edições (apresentação
própria), `.ctt-perguntas` e formulários (áreas de concentração), e **qualquer elemento
`position: fixed` ou `sticky`** — barra presa à base nunca entra na zona de disparo do
observer e ficaria invisível para sempre.

**Salvaguarda:** o estado oculto **só existe sob `html.scw-mo-on`**, classe que o próprio
motor adiciona. Script que não carrega, navegador sem `IntersectionObserver` ou
`prefers-reduced-motion` ligado → **nada é escondido**.

**Regras para criar movimento novo:**

1. reusar as classes e atributos existentes quando bastarem;
2. classe nova **sempre consumindo os tokens `--mo-*`**;
3. animar **só** `transform`, `opacity`, `filter` e `scale` — **sem layout shift**;
4. respeitar `prefers-reduced-motion`, **sempre**, escrito junto;
5. não instalar biblioteca de animação nova sem justificativa;
6. **hover só onde existe ação. Card sem link não sobe** — elevação sem destino é
   decoração e promete algo que não acontece.
7. **Nada de curva ou duração nova.** Se um handoff pedir um tempo que não está no
   sistema, o certo é perguntar, não inventar.

**Movimentos em produção:**

- **Heróis** — sequência foto → selo → título → apoio → ação, com atrasos de 140 a 760ms.
  Em Awards a banda surge e o texto sobe atrás dela.
- **Ciclo da anatomia** (Home 02) — quatro desenhos por ingrediente em 8,8s. Desde
  28/09/2026 é o **único laço contínuo** da Home, além do crossfade da abertura: a faixa
  de palavras, a respiração das fotos e as fitas saíram dela.
- **Respiração da imagem** — laço `alternate` na propriedade **`scale`** (nunca em
  `transform`, que fica livre para reveal e hover), então a volta refaz o mesmo caminho e
  **não existe salto de reinício**. Nas fotos dos heróis e, só no desktop, nas três fotos
  de Rotas da Home.
- **Transição de página** — `main.page-enter` em **opacidade, 300ms. Sem transform, de
  propósito** (ver §10.3).
- **Cabeçalho** — `.is-rolado` adensa o véu no desktop e recolhe o overhang da logo.
  **Não encolhe altura nem move a logo** — a geometria é regra estrutural.
  ⚠️ **No celular (≤900px) `.is-rolado` faz o cabeçalho SAIR de cena** (opacidade 0 +
  `pointer-events: none`, volta em `:focus-within` por causa do "pular para o
  conteúdo"). Motivo: abaixo de 900px `.scw-nav` e `.scw-acesso-topo` estão em
  `display: none` — sobra só a marca, e a navegação inteira mora na barra de abas.
  Uma barra fixa com conteúdo decorativo passava por cima do texto rolado (o rótulo
  "A anatomia do combo" virava "TOMIA DO COMBO") e o véu, longe do herói, lia como
  mancha marrom sobre a seção creme. Abaixo de 40px de rolagem nada muda: o herói
  continua como desenhado. **A landing `/em-breve` fica de fora** (`--so-acesso`) —
  ali o cabeçalho reduzido é a única porta de acesso (§10.4-b).
- **Menu mobile** — entra por `scwFolha` com itens escalonados; sai por `.is-fechando`
  (260ms) e só então desmonta.
- **Edições** — ken burns `scale(1.06) → scale(1.001)` em 12s; wipe direcional
  (`clip-path: inset()`) de 820ms escalonado 0/110/220ms; deriva de fundo em 46s.

**Seção ou página nova herda o movimento do sistema** — revelação no scroll, cascata dos
filhos, press dos botões, `is-rolado` no cabeçalho, zoom lento nas fotos. **Componente
novo sem movimento é componente incompleto.** E **um patch de layout não toca animação
existente** a menos que diga explicitamente que toca.

---

### 6.16 Cards — seis famílias, comportamento próprio

**Revisão de 11/09/2026** (Caderno cap. 05). **Interativo não é subir 2px.** Cada família
de conteúdo responde do seu jeito, e o essencial fica visível **sem hover**. Teclado e
toque fazem o mesmo caminho do ponteiro.

| Família | Comportamento próprio |
|---|---|
| **Participante** | fundo vira bege, filete escurece, seta avança 4px. O card inteiro é o link |
| **Combo** | foto protagonista 1:1; troca de foto **só por escolha** — crossfade 620ms, a que entra chega em `scale(1.04)` e assenta em 880ms; indicador alonga 8 → 28px |
| **Edição** | expande a curiosidade **no lugar** (300ms, seta gira), sem sair da lista. O botão de destino leva a cor da página de destino |
| **Percurso** | seleção com **três pistas simultâneas** — chapa vira a cor do destino, disco cresce, ponto preenche. Nunca só cor. Funciona como `radiogroup` |
| **Editorial** | resumo → detalhe crescendo no lugar (620ms): a foto recua de 1,04 para 1 e o véu sobe. Sem modal para conteúdo curto |
| **Operacional** | a situação muda em disco + numeral + texto da próxima ação, tudo junto |

**Anatomia comum.** Raio 20, padding 20. **Três superfícies legítimas:** creme com filete
(lista, operação) · fotográfica (foto sangrada, véu chocolate, tinta creme) · chapada (cor
da paleta com a tinta que passa). **Nunca branco.** Rodapé do card em `margin-top: auto`
para irmãos fecharem na mesma altura.

**Estados.** Inicial já diz tudo que importa · hover em 200ms muda **cor**, nunca só
sombra · foco é o anel cyan de 3px · toque responde com `active` de 1px · seleção com
três pistas · expansão no lugar, 300–620ms.

⚠️ **Hover só onde existe ação, e isso não mudou** (§6.15, regra 6). Card sem link não
sobe e não acende: elevação sem destino promete o que não acontece. Nas rotas e nas
etapas da Home quem leva ao destino é o CTA — por isso o card ali não tem estado, e isso
é decisão, não falta.

**Prazo e situação em card operacional:** numeral à direita, separado por filete vertical
— dígito grande em Slab Black, unidade em caixa-alta embaixo. ⛔ **Não usar filete
colorido na lateral do card** (genérico) **nem selo pousado na borda** (colide com o card
vizinho). Respondido vira disco chocolate com a marca de feito.

⛔ **Evitar:** flip que esconde texto · inclinação 3D · informação que só aparece no hover
· card inteiro clicável com botão dentro sem área própria · autoplay de fotos dentro de
card · card idêntico para conteúdos diferentes — participante não é combo, combo não é
edição.

**No celular:** raio cai de 20 para **16** dentro de trilha ou agrupador; **hover não
existe** — o retorno é o `active`; participante vira linha (logo 64px, nome, seta); combo
mantém a foto 1:1 em largura total e a troca vira gesto de arrastar com os mesmos
indicadores; editorial fica em 4:5 e a expansão abre **abaixo** da foto, não sobre ela.

---

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

⚠️ **16 cenas full-viewport de uma vez congelam o compositor.** Por isso a janela
`live/near ±1-2` em Edições.

⚠️ **Não colocar `transition` em `width`/`transform` de barra de progresso que precise de
valor exato** — travava o valor. A régua de anos usa `transform: scaleX` com origem à
esquerda, sem transição.

⚠️ **Não pôr `transform` em `<main>`.** Criaria bloco de contenção e **quebraria os
`position: fixed` de dentro das páginas** (a régua de anos de Edições). Por isso a
transição de página é só opacidade.

⚠️ **Elemento `position: fixed`/`sticky` nunca entra na zona de disparo do observer** —
ficaria invisível para sempre. Por isso fica fora do motor de movimento.

⚠️ **A respiração da imagem usa a propriedade `scale`, nunca `transform`** — senão haveria
salto de reinício.

### 10.4 Degradês, máscaras e emendas

⚠️ **Degradê linear em alpha lê como faixa dura.** *"O olho enxerga a derivada, não o
valor."* Uma rampa de **duas** paradas marca aresta nos dois pontos onde começa e termina;
é preciso ao menos **três**, com a do meio quebrando a reta.

⚠️ **O mecanismo mudou em 22/08/2026, o princípio não.** A rampa era uma **máscara** em
smoothstep `t²(3−2t)` (`--scw-esfuma`); hoje é **cor sobre a foto**, em três paradas, no
`::after` da própria imagem (§6.9). ⛔ **`--scw-esfuma`, `--scw-esfuma-topo` e
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

