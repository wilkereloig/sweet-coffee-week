<!-- Parte das regras do projeto. Índice: src/CLAUDE.md. Movido sem reescrita de src/CLAUDE.md em 10/11/2026. -->

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

⚠️ **Ícone de marca de terceiro é outra história.** Não há glifo oficial do WhatsApp no
repositório, e desenhar a marca de memória seria **inventar logo (A4)**. O botão usa
`mensagem` do próprio sistema; o glifo oficial só entra se alguém trouxer o SVG da brand
page do WhatsApp, e aí entra em `icones/marcas/` (traço fixo, sem disco nem cor SCW) —
como o Instagram desde 14/10/2026.

#### Exceção declarada — a camada da edição (27/10/2026)

A camada de edição (`.ct-edicao`, `src/styles/scw-cartoon.css`, rota `/cartoon`) tem
**paleta, fonte e forma próprias**: é o KV da edição (§2.1 do `CLAUDE.md` raiz), não o
festival institucional. Fonte: `docs/cartoon-2026-2/10-sistema-visual-e-paginas.md` §10.3
(manual v03). Lá dentro **não valem** a tabela de 9 cores deste §6.1, a família Nexa do
§6.5 nem o "botão chapado, sem sombra" do §6.6 — valem a paleta da edição, a
**Grandstander** e a sombra curta de desenho animado. Fora de `.ct-edicao` nada disso
existe: `tests/rotas-edicao.test.mjs` reprova vazamento de `--ct-*`, e
`tests/cartoon-sistema.test.mjs` reprova a fonte declarada fora da camada e mede o
contraste a partir dos tokens.

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
| `scw-edicoes.css` · `scw-awards.css` · `scw-contato.css` | ✅ migrados em 12/10/2026 — Slab (`--scw-font-black`, uma vez `--scw-font-slab` em Edições) em título, tema e numeral; `--scw-font-ui` em rótulo, botão e dado; `--scw-font-texto` no texto corrido. Nenhum consome mais `--scw-font` |
| `scw-aguarde.css` | ⏳ ainda em `--scw-font` (Slab) |
| `em-breve.css` | ⏳ idem — escreve `'Nexa Slab'` / `'Nexa Slab Black'` direto, sem token |
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
| Foto | **área própria à direita, 52% da largura** (`.scw-hero-banda`), com degradê horizontal curto na cor da página — §6.9. Sem véu de largura total |
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

### 6.9 Herói fotográfico — uma geometria para todas as páginas institucionais

**Desde 14/10/2026 Participar, Apoiar, Sweet Awards, Contato e Edições usam a MESMA construção**
(`.scw-heroi-foto` + `HeroFotos`, regras em `scw-2026.css`, seção "HERÓI FOTOGRÁFICO").
O CSS da página só dá cor e conteúdo — **nunca geometria**. ⛔ **Sem rótulo acima do
H1** em Edições, Sweet Awards e Contato (saiu em 14/10/2026, pedido do Wilker — o menu
já diz a página). Só a Home (`.hm-abre`, Cartoon)
fica fora (§7.1, pedido do Wilker). O detalhe de uma edição (`/edicoes/<código>`) e os
documentos legais não têm herói fotográfico.

| Peça | Desktop (≥1001px) | Celular (≤1000px) |
|---|---|---|
| Seção | `.scw-heroi-foto`, altura `--scw-heroi-foto-altura` = `clamp(640px, 54.5vw, 740px)` — igual em todas (cabe o Awards, o mais alto); conjunto de texto centrado abaixo do cabeçalho | `display: block`, sem piso de altura |
| Texto | `.scw-heroi-foto__texto`, à esquerda, sobre `var(--scw-heroi)`; reserva `--scw-heroi-texto-reserva` (52vw) + folga | embaixo da foto, sobre a chapa da página |
| Foto | `.scw-hero-banda` à direita, largura `--scw-heroi-foto-largura` (**52vw**; texto ~48%), altura da seção | no fluxo, largura cheia: **2:1** (600–1000px) · **4:3** (380–599px) · **16:10** (<380px) |
| Degradê | `::before` horizontal, tokens `--scw-heroi-degrade-de/-ate`: opaco em 0%, some em **46%** da área, curva em S (smoothstep, 9 paradas) — "mais suave", 14/10/2026 | mesma curva na base, até 32% da foto, + scrim chocolate no topo (logo e menu) |
| Pausa | `.scw-pausa-fotos` dentro da banda: chocolate sólido, anel creme, acima do degradê; no desktop sobe a altura do aviso de cookies (`--scw-aviso-h`) | mesmo botão, canto inferior da foto |
| Imagem | `<img>` com `srcSet` + `SIZES.heroi` (`(max-width: 1000px) 100vw, 52vw`) — mudar a largura da banda exige mudar `SIZES.heroi` junto | idem |

**Sweet Awards:** título + lead + ação "Ver os premiados" (leva a
`#swa-resultados` pelo `irPara` do índice) + números, num conjunto; o texto **não anima**
(abre legível).

**Medido em 14/10/2026 (build de produção), igual nas quatro páginas:** foto 360×225 ·
390×293 · 599×449 · 600×300 · 768×384 · 1000×500 · 1001: 521×640 · 1150: 598×640 ·
1280: 666×698 · 1440: 749×740. Rolagem horizontal zero em todas.

⚠️ **A chapa é obrigatória no celular**: a cor do herói é `--scw-heroi` na seção, não na
foto. Sem ela o Contato sairia chocolate sobre chocolate.

**Contrastes medidos, todos acima de 4,5:1:** chocolate sobre cyan 5,6:1 · creme sobre
marrom 9,44:1 · chocolate sobre bege 13:1 · creme sobre roxo 9,95:1.

⛔ **Não recriar:** véu de largura total, geometria por página (`.pa-hero`, `.swa-hero`,
`.ctt-abertura` só dão cor), foto em `inset: 0` atrás do texto, proporção diferente por
página. As construções de 21/08 (foto cobrindo o herói) e de 22/08 a 14/10/2026 (quadrado
do sistema sobrescrito por página) estão revogadas.

⚠️ **Participar e Apoiar foram a primeira exceção ao quadrado: 4:3**, pedido do Eloi em
22/08/2026 ("encurtar o herói"). Eram as duas mais altas das cinco porque levavam o selo
em duas linhas e a nota de curadoria embaixo das ações; os dois saíram depois (selo em
27/08/2026), e o título encurtou em 12/10/2026. Entre 600 e 1000px passaram a **2:1**:
em 4:3 a foto passava de 600px de altura e a ação descia abaixo da dobra (y=909 em
900×900).

⛔ **A alavanca das "ações lado a lado" não existe, e está medido:** os dois botões dão
**241px + 287px numa linha de 342px**. Lado a lado quebrariam o rótulo dentro do botão e
devolveriam a altura economizada. Não testar de novo.

Se um dia a uniformidade voltar a pesar mais que a altura, o certo é **levar as cinco
para a mesma proporção**, não devolver estas duas para o quadrado.
⛔ **A rampa em S por máscara MORREU junto com o véu.** Até 22/08/2026 a banda era
recortada por `mask-image` em smoothstep `t²(3−2t)`, com os tokens `--scw-esfuma` /
`--scw-esfuma-topo` e `--scw-banda-base`. **Os três tokens não existem mais no CSS**, e a
geometria de `44vh / 340px` da banda de desktop do Awards saiu junto: as cinco páginas
usam a mesma foto no fluxo (a proporção de cada uma está na tabela acima). A emenda hoje é a linha da tabela acima — `::after`
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

✅ **O relógio é um só desde 12/10/2026: `src/hooks/useCrossfade.js`**, usado por
`HeroFotos` e pela abertura da Home (que repetia a mesma lógica). Ele garante índice
válido com lista vazia/única, **decodifica a próxima foto antes da troca** (rede lenta não
acende camada vazia), **pausa com a aba oculta**, escuta `prefers-reduced-motion` ao vivo
e oferece **pausa manual** — o botão `PausaFotos` (`.scw-pausa-fotos`, só ícone, nome no
hover/foco) aparece quando há rotação de fato. A composição (banda × moldura) continua em
cada componente; só o tempo mora no hook.

| Rota | Série | Nº |
|---|---|---|
| Home | pessoas da Lovers (`lovers-publico/08, 07, 04`) + um combo por foto | 3 |
| Participar | `participantes-lojas/02, 04–11` | 9 |
| Apoiar | `participantes-lojas/12–22` | 11 |
| Contato | `sweet-lovers/03–05` | 3 |
| Sweet Awards | `awards-entrega/01–06` | 6 |

⚠️ **As 22 fotos de loja são divididas, não compartilhadas:** Participar leva a primeira
metade, Apoiar a segunda, e **nenhuma imagem se repete entre os dois heróis**. Ao
acrescentar foto, manter a divisão — repetir quebra a intenção sem quebrar nada visível.
⛔ **`participantes-lojas/01` e `03` e `sweet-lovers/01` e `02` saíram dos heróis em
13/10/2026:** mostram o painel de apoio do Sebrae, e o site não exibe patrocinador (§2.2).
Seguem no acervo.

