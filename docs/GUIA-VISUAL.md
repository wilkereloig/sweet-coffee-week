# Guia visual — Sweet & Coffee Week

> **Fonte única da verdade visual do site.** Consolidado em 29/07/2026 a partir do
> código real (não de versões antigas do projeto). Quando este guia divergir de
> qualquer outro documento, **vale este guia**; quando divergir do código em
> `src/styles/scw-2026.css`, **vale o código** — e este guia deve ser corrigido.
>
> Implementação: `src/styles/scw-2026.css` (tokens + casca + utilitárias) e
> `src/styles/scw-<pagina>.css` (peças de cada página).

---

## 1. Conceito institucional

O Sweet & Coffee Week é um festival de gastronomia doce e cafeteria de Natal/RN,
com 16 edições desde 2016. O site é **institucional e permanente**: existe antes,
durante e depois de qualquer edição.

O sistema visual traduz isso em três decisões:

1. **Fundo creme, tinta chocolate.** A base é comida e papel, não interface.
2. **Uma fonte só, com peso.** Nexa Slab em 900 nos títulos — o slab dá
   personalidade sem ilustração.
3. **Cor como sinalização, não como enfeite.** Cada página tem uma cor, e ela
   aparece em três pontos exatos (§4). O resto é creme e chocolate.

O que o KV institucional transmite: criatividade, gastronomia, descoberta,
comunidade, memória, cultura local. O que ele **não** faz: depender do visual de
uma edição específica.

---

## 2. Hierarquia de identidade (regra estrutural)

Três níveis, nunca misturados:

| Nível | O que é | Onde vive | Onde aparece |
| --- | --- | --- | --- |
| **Institucional** | Identidade permanente do festival | `src/styles/scw-2026.css`, `src/pages/institutional/` | Home, Edições, Sweet Awards, Participar, Apoiar, Contato |
| **Edição vigente** | Identidade temporária da edição atual | `src/styles/lovers-system.css`, wrapper `.kv-lovers` | Hoje: só o painel interno `/lovers/painel` |
| **Histórico** | Personalidade de cada edição passada | `src/data/handoff/edicoesData.js` (marca, foto, tema por edição) | Página Edições — a marca de cada edição entra no slot da logo |

**Regra absoluta:** nunca aplicar estilo Lovers em página institucional nem
vice-versa. O institucional organiza o site; a edição entra como **camada**
dentro dessa estrutura, nunca a substitui.

**Estado atual (jul/2026):** a edição Lovers foi encerrada e suas páginas
públicas removidas (`App.jsx` redireciona `/lovers/*` para a home). O KV Lovers
sobrevive apenas no painel admin, carregado sob demanda.

### Exceção declarada — seção 07 da Home

A seção "Realização" usa o KV da **F2 Experience** (a agência que realiza o
festival), não o do festival: fundo `#0B0B0C`, acento `#E50053`, tinta `#F5F5F5`,
tipografia **Archivo**. É a única quebra de paleta e de fonte do site,
proposital, restrita ao bloco `.f2-realiza*` em `scw-home.css`. O teste
`tests/redesign-2026.test.mjs` reprova essas cores e a fonte Archivo em qualquer
outro lugar.

---

## 3. Cores

Fonte única: bloco `:root` de `src/styles/scw-2026.css`. **Nenhuma cor fora
desta tabela.** Não escrever hex solto em componente — usar o token.

### 3.1 Institucionais e de apoio

| Token | Hex | Papel | Sobre ele usa |
| --- | --- | --- | --- |
| `--scw-creme` | `#FEF0DD` | Fundo base do site | `--scw-choco` |
| `--scw-bege` | `#F8E4C1` | Alternância de seção, chips | `--scw-choco` |
| `--scw-card` | `#FFF7E9` | Cards, painéis, campos | `--scw-choco` |
| `--scw-filete` | `#EBD6B4` | Bordas de 1px, divisores | — |
| `--scw-choco` | `#3D1308` | Tinta principal, seções escuras | `--scw-creme` |
| `--scw-marrom` | `#6A2C15` | Texto de apoio, rótulos | `--scw-creme` |

### 3.2 Acentos de página

| Token | Hex | Página |
| --- | --- | --- |
| `--scw-amarelo` | `#FDBB1A` | O festival (Home) |
| `--scw-cyan` | `#01AFCC` | Edições — também o anel de foco global |
| `--scw-roxo` | `#4D257E` | Sweet Awards |
| `--scw-magenta` | `#F10767` | Participar |
| `--scw-magenta-esc` | `#D0055B` | **Só** o selo do menu de Participar (contraste) |
| `--scw-vinho` | `#B3213B` | Apoiar |

### 3.3 Funcionais

| Token | Hex | Uso |
| --- | --- | --- |
| `--scw-ouro` | `#D19100` | Numerais sobre creme quando o amarelo falharia; 1º lugar |
| `--scw-prata` | `#D9BE95` | 2º lugar no pódio |
| `--scw-bronze` | `#C99A7E` | 3º lugar no pódio |

**Foco:** anel de foco global = `--scw-cyan`. É a única cor de estado
padronizada; hover/ativo usam a cor da própria página.

### 3.4 Cor por página — como aplicar

A cor da página **não é fundo de hero**. Aparece em três pontos, e só:

1. item ativo do menu (pill sólida);
2. barra de 5px sob o cabeçalho (transição 320ms);
3. selo do herói.

Por isso o acento não precisa ser tom claro. Definido em `body.route-*`:

| Rota | `--scw-pagina` | `--scw-pagina-tinta` | `--scw-pagina-menu` | Contraste |
| --- | --- | --- | --- | --- |
| `home` | `#FDBB1A` | `#3D1308` | `#FDBB1A` | 9,5:1 |
| `edicoes` | `#01AFCC` | `#3D1308` | `#01AFCC` | 6,2:1 |
| `historico-awards` | `#4D257E` | `#FEF0DD` | `#4D257E` | 9,95:1 |
| `participar` | `#F10767` | `#FEF0DD` | `#D0055B` | 4,86:1 |
| `apoiar` | `#B3213B` | `#FEF0DD` | `#B3213B` | 5,86:1 |
| `contato` | `#6A2C15` | `#FEF0DD` | `#6A2C15` | 9,44:1 |

Hover no menu mostra a cor daquela página (amarelo e cyan direto; as demais caem
no amarelo, por contraste sobre o véu escuro).

### 3.5 Proibido

- **`#E52C4B`** (vermelho-coral) — removido da paleta, não usar em nada.
- Verde, cinzas frios aleatórios, pretos puros.
- Qualquer hex fora das tabelas acima.
- Hex escrito direto em componente quando existe token.

**Superado (não reintroduzir):** paleta terracotta `#E8553A`, Edições `#2BC4E8`,
Awards dourado `#F8B511`, Participar `#F2693C`, Apoiar `#1B86C9`, Contato peach
`#F2B6A0`. O sistema `--page-accent` de `src/styles.css` sobrevive **apenas** em
`/pesquisa` e nos painéis internos.

---

## 4. Tipografia

**Fonte única: Nexa Slab.** Pesos 500 (Regular), 700 (Bold), 800 (xBold), 900
(Black). O peso 900 também é servido como família separada `'Nexa Slab Black'`.
Arquivos em `public/fonts/nexa-slab/` (woff2), declarados em
`src/styles/fonts-nexa-slab.css`.

```css
--scw-font:       'Nexa Slab', system-ui, sans-serif;
--scw-font-black: 'Nexa Slab Black', 'Nexa Slab', Georgia, serif;
```

### 4.1 Escala

| Papel | Classe | Valor |
| --- | --- | --- |
| H1 de herói | `.scw-h1` | `900 clamp(38px,4.8vw,84px)/.9`, `-.045em`, `max-width:17ch` |
| H1 compacto (Contato) | `.scw-h1--compacto` | `900 clamp(28px,3vw,44px)/1`, `-.035em` |
| H2 de seção | `.scw-h2` | `900 clamp(32px,3.8vw,58px)/.94`, `-.04em`, `20–24ch` |
| H3 de card | `.scw-h3` | `900 clamp(18px,1.7vw,24px)/1.1`, `-.03em` |
| Numeral grande | `.scw-numeral` | `900 clamp(38px,4.4vw,84px)/.82`, `-.06em`, `tabular-nums` |
| Corpo | `.scw-corpo` | `500 clamp(15px,1.2vw,17px)/1.55`, `text-wrap:pretty` |
| Lead de herói | `.scw-lead` | `500 clamp(16px,1.3vw,19px)/1.55`, `max-width:46ch` |
| Rótulo | `.scw-rotulo` | `800 12px/1`, `.16em`, uppercase, `#6A2C15` |
| Botão | `.scw-btn` | `800 15px/1` |
| Item de menu | — | `700 14px/1.4` (ativo `800 italic`), lowercase |

Tudo em `clamp()` — a escala é fluida, não há tamanho fixo por página. **Não
inventar tamanho novo:** usar a classe. Largura máxima de parágrafo já vem nas
classes (`17ch` / `46ch` / `20–24ch`) — respeitar, é o que mantém a leitura.

### 4.2 Rótulo / eyebrow

Rótulo curto em caixa-alta abrindo seções **é permitido e é o padrão**
(`.scw-rotulo`). A regra antiga "não usar eyebrow" está superada. O que continua
proibido é rótulo **sem função**: repetir o título, anunciar o óbvio, enfeitar.

Compensação óptica: caixa-alta dentro de pill leva 1px a mais de padding no topo
e 1px a menos na base — o caixa-alta da Nexa Slab renderiza ~2px acima do centro.

### 4.3 Proibido

**Nada de fonte mono** (`var(--font-mono)`, JetBrains Mono) em
rótulos/labels/eyebrows/metadados. Preferência registrada, rejeitada 2×. O
incômodo é a face mono, não o caixa-alta — caixa-alta + letter-spacing seguem
permitidos.

---

## 5. Grid, trilho e espaçamento

### 5.1 Trilho único

**Uma só regra de margem horizontal, para header, seções, rodapé e Edições:**

```css
--scw-trilho: max(clamp(24px, 5vw, 72px), calc((100% - 1360px) / 2));
```

Conteúdo com **largura máxima de 1360px, centralizado**, gutter mínimo de
24–72px. Aplicar como `padding-inline: var(--scw-trilho)` — a classe `.scw-secao`
já faz. Como o header usa o mesmo trilho, logo, menu, títulos, cards e rodapé
alinham na mesma coluna.

**Não** inventar largura ou gutter próprios. **Não** usar `max-width` em
container além disso. Seção que sangra até a borda (banda de foto) usa margem
negativa **do mesmo trilho** — nunca um valor solto.

*(Superados: `--hm-gutter` e o `.wrap` de 1280px — válidos só em `/pesquisa` e
painéis internos.)*

### 5.2 Ritmo vertical

```css
--scw-sec-y:          clamp(58px, 6vw, 100px);   /* padrão */
--scw-sec-y-compacta: clamp(48px, 5vw, 80px);
--scw-hero-topo:      clamp(216px, 19vw, 252px); /* reserva de topo das heros */
```

Heros com conteúdo ancorado embaixo (Home, Participar, Apoiar) usam
`padding-top: clamp(232px, 22vw, 290px)`; a hero compacta (Contato) usa
`--scw-hero-topo`.

### 5.3 Raios e sombras

```css
--scw-r-secao:     26px;   --scw-r-interno: 22px;   --scw-r-card: 20px;
--scw-sombra-card: 0 18px 42px rgba(61, 19, 8, .22);
--scw-sombra-foto: 0 14px 34px rgba(0, 0, 0, .34);
--scw-ease:        cubic-bezier(.22, .9, .24, 1);
```

### 5.4 Grades

- `.scw-grade` — grade responsiva padrão.
- `.scw-grade-fixa` — grade que **desconta o gap** na fórmula de largura.
  Obrigatória em faixas de 4 numerais: sem ela, a linha quebra a 3+1.

---

## 6. Zona de segurança entre menu e hero (regra estrutural)

O **fundo** da hero pode subir até o topo. O **conteúdo** (títulos, textos,
imagens, cards) só começa depois do offset de segurança do header. Nenhum
elemento da hero sobrepõe, compete ou encosta no menu.

A logo do cabeçalho **transborda metade abaixo** da linha do header
(`top:100%; transform:translateY(-50%)`), o que torna a reserva de topo maior que
a intuitiva — daí o valor de `--scw-hero-topo`.

Aplicar sempre no **padding da própria hero**. Nunca com `margin-top` solto,
empurrão manual no título, `position:absolute` improvisado ou ajuste que só
funcione numa tela.

No mobile (≤900px) a logo perde o overhang (`top:50%`, altura 52px).

---

## 7. Heroes

Todas as heroes compartilham estrutura; a cor e a foto mudam.

| Regra | Valor |
| --- | --- |
| Altura | **Proporcional ao conteúdo.** Nunca 1080px fixo, nunca `height` rígida |
| Reserva de topo | `--scw-hero-topo` (ou o valor ancorado, §5.2) |
| Título | `.scw-h1`, à esquerda, `max-width:17ch` |
| Lead | `.scw-lead`, `max-width:46ch` |
| Selo | `.scw-pill--pagina` — usa `--scw-pagina` |
| Foto | Fundo à direita com véu em degradê a 96° (`.97 → 0` entre 0% e 92%) |
| Botões | Depois do lead, alinhados à esquerda |
| Fundo | Chocolate `#3D1308` — **exceto Sweet Awards**, roxo `#4D257E` (ver abaixo) |

**Exceção — Sweet Awards (jul/2026, pedido do Wilke):** o herói é a própria cor
da página, roxo `#4D257E`, não chocolate. Um degradê chocolate a 42% desce 340px
do topo para dar profundidade onde passa o cabeçalho fixo e a logo transborda.
Como o fundo passou a ser a cor da página, **o selo inverte** —
`.swa-hero .scw-pill--pagina` fica creme com tinta roxa (mesmos 9,95:1) — senão
ele desapareceria contra o fundo. Título e lead seguem creme.

Toda hero deve: identificar a página, ter boa leitura, usar imagem coerente com o
assunto, respeitar o KV institucional, adaptar ao mobile, não ocupar espaço
excessivo e não esconder informação.

### 7.1 Hero no celular (regra estrutural)

Abaixo de **1000px** o herói vira dois blocos empilhados: **foto em cima,
informação embaixo — nenhum texto sobre imagem.**

- **Home** — foto 46vh, escurecimento mínimo (6% no meio, topo livre para a logo
  respirar, passagem para o chocolate na base); texto em bloco chocolate sólido.
- **Participar, Apoiar, Contato** — banda de foto sangrando
  (`.scw-hero-banda`, 42vh / mínimo 264px, `padding-top:0` na seção, margens
  negativas pelo mesmo trilho), `box-shadow` interno no topo para legibilidade da
  logo, passagem para o chocolate na base. O cartão de foto do desktop
  (`.scw-hero-cartao`) é ocultado para não duplicar imagem.
- **Sweet Awards não usa banda** — o herói já abre com a vitrine dos vencedores.

Fotos fixas por página: Participar `/images/combos/douce-di-maria/main.jpg` ·
Apoiar `/images/momentos/04.jpg` · Contato `/images/campanha/15.jpg`.

---

## 8. Componentes

Utilitárias globais em `scw-2026.css`. Peças de página usam prefixo próprio.

### 8.1 Casca (global)

| Componente | Classe | Arquivo |
| --- | --- | --- |
| Raiz | `.scw-raiz` | `scw-2026.css` |
| Cabeçalho | `.scw-header`, `.scw-header__linha`, `.scw-header__veu` | `components/nav.jsx` |
| Barra de cor da página | `.scw-barra-pagina` (5px, transição 320ms) | `nav.jsx` |
| Marca | `.scw-marca` → `MARCA_SCW` = `/images/logo-seal-sweet-coffee.svg` | `nav.jsx` (const exportada, reusada pelo `SiteFooter.jsx`) |
| Navegação | `.scw-nav` | `nav.jsx` |
| Barra inferior mobile | — | `components/MobileTabBar.jsx` (5 abas, ≤900px) |
| Folha "mais" | `.scw-folha*` | `components/MobileMenu.jsx` |
| Diálogo de acesso | `.scw-acesso*` | `components/AccessDialog.jsx` |
| Rodapé | `.scw-footer*` | `components/SiteFooter.jsx` |
| Pular para conteúdo | `.scw-skip` | `nav.jsx` |

### 8.2 Blocos

| Peça | Classe | Variações |
| --- | --- | --- |
| Seção | `.scw-secao` | `--creme` `--bege` `--choco` `--marrom` `--compacta` |
| Card | `.scw-card` | `--destaque` |
| Botão | `.scw-btn` | `800 15px/1` |
| Pill / selo | `.scw-pill` | `--bege` `--pagina` |
| Rótulo | `.scw-rotulo` | `--micro` |
| Foto | `.scw-foto` | `--banner` `--retrato` |
| Abas | `.scw-abas`, `.scw-aba` | `__icone` `__rotulo` `__indicador` |
| Campo de formulário | `.scw-campo` | — |
| Marquee | `.scw-marquee` | `__palavra` `__ponto` |
| Reserva (placeholder) | `.scw-reserva` | — |
| Destaque | `.scw-destaque` | — |

### 8.3 Prefixos por página

| Página | Prefixo | Arquivo |
| --- | --- | --- |
| Home | `.hm-` | `scw-home.css` |
| Edições | `.scw-` (cena própria) | `scw-edicoes.css` |
| Sweet Awards | `.swa-` | `scw-awards.css` |
| Contato | `.ctt-` | `scw-contato.css` |
| Participar / Apoiar | `.pa-` | `scw-participar-apoiar.css` |

**Regra:** peça usada por 2+ páginas vira utilitária `.scw-*` em `scw-2026.css`.
Peça de uma página só fica no CSS da página, com o prefixo dela. Não criar um
terceiro lugar.

---

## 9. Imagens

### 9.1 Fonte única

**Todo caminho de imagem sai de `src/data/imageLibrary.js`.** Nenhum componente
monta caminho na mão — há teste que reprova isso
(`tests/imagens.test.mjs`, "nenhum componente monta caminho de imagem na mão").
Exceções conscientes estão na allowlist do próprio teste.

Acervo em `public/images/`:

| Pasta | Conteúdo |
| --- | --- |
| `combos/<slug>/` | Fotos dos combos por participante (21 marcas) |
| `edicoes/<code>/` | **Fotos** — acervo normalizado das 16 edições (`NN.webp`) |
| `marcas-edicoes/<code>/logo.png` | **Marca** de cada edição (16). Renomeado de `editions/` em jul/2026: dois nomes quase idênticos para coisas diferentes era convite a erro |
| `momentos/` | Fotos institucionais de público e evento |
| `campanha/` | Peças de campanha |
| `lovers-publico/` | Público da edição Lovers |
| `imprensa/` | Material de imprensa |
| `shapes/` | Formas de apoio |
| `logos/participants/` | Logos reais dos participantes |

> O acervo bruto (~58 GB) vive em `acervo-bruto/` na **raiz**, fora de `public/` e
> fora do git. Não devolver para dentro de `public/` — o Vite copiava tudo a cada
> build.

### 9.2 Regras de uso

- Foto real sempre que existir; `object-fit: cover`; proporção preservada; alt
  text adequado.
- Logo real: `object-fit: contain`, nunca distorcer, limite de altura.
- **Coerência de conteúdo é obrigatória:** página de edição mostra fotos daquela
  edição; página de participante mostra o participante certo; Sweet Awards mostra
  a peça premiada (Melhor Doce → o doce, Melhor Salgado → o salgado, Melhor
  Bebida → a bebida, demais → o combo); página histórica não usa só imagem da
  edição atual; hero usa imagem do assunto da página.
- Proporções em uso: **1:1** (vitrine de vencedores, galerias), **4:5** (card de
  1º lugar no desktop, vira 1:1 até 820px), **4:3** (hero de Participar/Apoiar).

### 9.3 Inventário de identidade — arquivos de marca

Auditado em 29/07/2026 cruzando o disco com **todos** os caminhos que o código
gera (funções do `imageLibrary` resolvidas de verdade, não regex).

| Arquivo | Papel | Status |
| --- | --- | --- |
| `/images/logo-seal-sweet-coffee.svg` | **Marca oficial do cabeçalho e do rodapé** (`MARCA_SCW` em `nav.jsx`) | ✅ vivo |
| `/images/logo-sweet-coffee-week.svg` | Wordmark grande — landing EmBreve | ✅ vivo |
| `/images/logo-f2experience.svg`, `/images/f2-symbol.svg` | Marca da realizadora — seção 07 da Home | ✅ vivo |
| `/images/logo-sweet-coffee-week-header.svg` | Wordmark alternativo | ⚠️ sem uso — mantido |
| `/logos/lockup-scw-creme.svg` | Lockup creme | ⚠️ sem uso — mantido. **A CLAUDE.md dizia que era a marca do cabeçalho; não é** |
| `/images/logo-f2-experience.svg` | Variante da marca F2 (a viva é `logo-f2experience.svg`, sem hífen) | ⚠️ sem uso — mantido |
| `/images/selo-10-anos.svg` + `.png`, `/videos/video-selo10anos.webm` | Selo comemorativo de 10 anos | ⚠️ sem uso — mantido |
| `/images/lovers-logo.svg`, `/images/sweet-lovers-logo.svg`, `/images/email-logo-lovers.png` | Marcas da edição Lovers | ⚠️ sem uso — histórico, mantido |
| `/images/logo.svg` | Byte-idêntico a `logo-sweet-coffee-week.svg` | ❌ **removido** (duplicata) |
| `/images/sweet-logo.svg` | Byte-idêntico a `logo-sweet-coffee-week-header.svg` | ❌ **removido** (duplicata) |
| `/fonts/helvetica-ext/*` (4 woff2) | Helvetica Extended | ❌ **removido** — fora da identidade (Nexa Slab é a fonte única), zero referência |
| `/images/shapes/*` | 8 formas decorativas | ❌ **6 removidas** (decoração sem função, §10.1). Sobram as 2 com função: `shape-heart-yellow.svg` (herói de Participar) e `shape-arrow-yellow.svg` |

**Logos de participante:** `/logos/participants/<slug>.png`, resolvidos por
`resolveParticipant` com fallback em iniciais. Nunca inventar logo.

### 9.4 Acervo fotográfico não referenciado

29 fotos existem em `public/` sem nenhuma página apontando para elas hoje:
`campanha/` 12 · `lovers-publico/` 7 · `momentos/` 8 · `imprensa/` 2.

**Isso não é lixo — é acervo do festival.** A regra é explícita: não remover
conteúdo do festival só porque não aparece na Home. Ficam disponíveis para as
próximas páginas. Ao usar uma, registrar em `imageLibrary.js`.

**Duplicatas resolvidas** (jul/2026). Havia 4 fotos byte-idênticas em duas
pastas. Regra aplicada: **fica a cópia na pasta institucional permanente**
(`momentos/`), sai a da pasta de campanha ou de edição — coerente com a
hierarquia do §2, onde institucional é permanente e campanha é temporário.

| Removida | Preservada |
| --- | --- |
| `campanha/17.jpg` | `momentos/03.jpg` |
| `campanha/18.jpg` | `momentos/08.jpg` |
| `lovers-publico/01.jpg` | `momentos/09.jpg` |
| `lovers-publico/02.jpg` | `momentos/10.jpg` |

### 9.5 Padrão de nome de arquivo

Nome de arquivo explica o conteúdo. **Sem** parêntese, espaço, acento, `final`,
`novo`, `cópia` ou número de versão solto.

| Padrão | Exemplo |
| --- | --- |
| Foto de edição | `edicoes/<code>/NN.webp` |
| Marca de edição | `marcas-edicoes/<code>/logo.png` |
| Combo de participante | `combos/<slug>/main.jpg` |
| Logo de participante | `logos/participants/<slug>.png` |
| Foto de acervo numerada | `<pasta>/NN.jpg` |
| Peça de campanha | `<assunto>-<variante>.png` |

Renomeados em jul/2026: `moldura-lovers (1).png` → `moldura-lovers-01.png` ·
`moldura-lovers (2).png` → `moldura-lovers-02.png` ·
`moldura-namorados 16.png` → `moldura-lovers-namorados.png`.

### 9.6 Favicons

Seis arquivos em disco, **seis declarados** no `index.html` — sem sobra e sem
falta: `favicon-sweet.svg` (mestre vetorial) + PNG 32, 48, 96, 192 e o
`apple-touch-icon` de 180.

O `favicon-512.png` foi removido: não havia webmanifest para consumi-lo e
qualquer tamanho é regenerável a partir do SVG.

### 9.7 Ausência de imagem

Sem foto ou logo: **reserva honesta** (`.scw-reserva`) — moldura editorial, borda
sutil, fundo da paleta, texto curto ("Foto pendente"), proporção definida. Nunca
área vazia sem explicação, nunca imagem aleatória externa, nunca hotlink, nunca
esconder a ausência.

---

## 10. Elementos gráficos e ilustrações

### 10.1 A regra

Todo elemento visual precisa de **função**: estruturar layout, indicar
hierarquia, representar dado, organizar conteúdo, apoiar fotografia ou reforçar
identidade. Sem função clara → remover.

Teste: *"esse elemento carrega informação ou só enfeita?"* Carrega → fica.
Enfeita → sai.

**Isso proíbe decoração gratuita, não elemento funcional.** Medalhas, pódios e
selos de 1º lugar no Sweet Awards **codificam colocação** — são funcionais, não
stickers.

### 10.2 Stickers

**Não usar stickers por padrão nas institucionais.** Só em material de campanha
ou página específica, quando solicitado explicitamente. Em Edições, Participar,
Apoiar, Contato e Sweet Awards: não inserir stickers, doodles ou elementos soltos
sem aprovação.

Página Edições: linguagem editorial, histórica, fotográfica — **não** estética de
sticker/colagem.

### 10.3 Direção de ilustração (quando houver)

Hoje o site é **photo-first**: não há ilustração autoral em produção. Se entrar,
a direção é: flat artesanal, textura de pincel/rabisco, formas simples, cores
chapadas da paleta, aparência autoral, composição editorial, leitura rápida.

Evitar: 3D, sombras realistas, acabamento excessivamente digital, cartoon
infantil, elementos genéricos de banco de ilustração, excesso de detalhe,
estética sem relação com Natal ou com o festival.

**Sweet Lovers = comunidade de fãs, nunca casais românticos.** Podem aparecer
amigos, famílias, pessoas sozinhas, grupos, gente fotografando combo, seguindo
rota, avaliando, usando mapa/sticker/botton. Elementos regionais entram como
sticker, selo, padrão, símbolo pequeno ou detalhe de cenário.

---

## 11. Responsividade

**Escala de breakpoints canônica: 1000 · 900 · 820 · 760 · 420.** Não existe
token de breakpoint (CSS não aceita `var()` em `@media`) — a consistência é por
convenção.

| Ponto | Significado fixo |
| --- | --- |
| **1000px** | Herói vira dois blocos empilhados (foto em cima, texto embaixo) |
| **900px** | Casca vira aplicativo: logo perde o overhang (52px), botão de acesso do topo some, entra a barra inferior de 5 abas |
| **820px** | Card de 1º lugar do Sweet Awards passa de 4:5 para 1:1 |

Testado em 320, 360, 375, 388, 390, 430, 768, 1024, 1280, 1440, 1544 e 1920 — sem
rolagem horizontal, sem texto cortado.

Valor fora da escala só quando o conteúdo exigir ponto próprio — nunca por
inércia ou cópia. **Não renumerar em massa** breakpoints já calibrados.

*(Escala anterior — 1080 · 960 · 720 · 560 · 420 — vale só em `/pesquisa` e
painéis internos.)*

Mobile: evitar sticky horizontal complexo, evitar overflow lateral, manter
leitura clara, botões tocáveis, grids em coluna, logos e fotos proporcionais.

---

## 12. Movimento

**Fonte única do institucional: `src/styles/scw-motion.css` + o motor
`src/hooks/useSiteMotion.js`** (jul/2026). `src/styles/motion-system.css` é o
sistema ANTERIOR e sobrevive só para a landing `/em-breve` — não usar em página
nova.

### Ritmo (uma escala, quatro degraus)

| Token | Valor | Onde |
| --- | --- | --- |
| `--mo-rapido` | 180ms | botão, link, ícone |
| `--mo-estado` | 300ms | hover de card, acordeão, cabeçalho, menu |
| `--mo-entra` | 620ms | entrada de texto, bloco e card |
| `--mo-longo` | 880ms | herói e imagem grande |
| `--mo-passo` | 90ms | intervalo entre itens de uma sequência |
| `--mo-passo-card` | 70ms | card a card dentro de uma grade |
| `--mo-respiro` | 26s | laço de respiração da imagem |

Curvas: `--mo-ease` (saída suave, = `--scw-ease`), `--mo-mola` (chegada que
pousa), `--mo-suave` (laços de ida e volta). Deslocamento: `--mo-y` 22px,
`--mo-y-titulo` 30px, `--mo-y-texto` 14px, `--mo-x` 26px, `--mo-desfoque` 6px.
Abaixo de 900px todos encolhem e o desfoque zera.

### Como o motor decide

O JSX **não** carrega classe de animação. `useSiteMotion` varre a página, guarda
só a ocorrência mais externa de cada ramo (um `<p>` dentro de um card dentro de
uma grade não é item próprio — a grade é) e carimba:

- `data-mo="sobe|titulo|texto|foto|lado"` — o tipo de entrada;
- `--mo-i` — posição na sequência. **Reinicia a cada `<section>` e a cada
  rótulo** (`.scw-rotulo`), que é a "identificação da seção" da ordem de leitura;
- `data-mo-grade` + `--mo-j` nos filhos — cards entram um a um (teto de 8
  degraus: lista longa não vira espera).

Fica de fora: heróis (coreografados por `@keyframes`, estão acima da dobra),
página Edições (apresentação própria), painéis internos, `.ctt-perguntas` e
formulários (áreas de concentração), e qualquer elemento `position: fixed` ou
`sticky` — barra presa à base nunca entra na zona de disparo do observer e
ficaria invisível para sempre.

**Salvaguarda:** o estado oculto só existe sob `html.scw-mo-on`, classe que o
próprio motor adiciona. Script que não carrega, navegador sem
`IntersectionObserver` ou `prefers-reduced-motion` ligado → nada é escondido.

### Regras para criar movimento novo

1. reusar as classes/atributos existentes quando bastarem;
2. classes novas sempre consumindo os tokens `--mo-*`;
3. animar **só** `transform`, `opacity`, `filter` e `scale` — sem layout shift;
4. respeitar `prefers-reduced-motion`;
5. não instalar biblioteca de animação nova sem justificativa;
6. hover só onde existe ação. Card sem link não sobe: elevação sem destino é
   decoração (§5 do CLAUDE.md) e promete algo que não acontece.

### Movimentos em produção

- **Heróis** — sequência foto → selo → título → apoio → ação, com atrasos de 140
  a 760ms. Awards monta a vitrine card a card.
- **Respiração da imagem** — laço `alternate` na propriedade `scale` (nunca em
  `transform`, que fica livre para reveal e hover), então a volta refaz o mesmo
  caminho e não existe salto de reinício. Aplicado nas fotos dos heróis e, só no
  desktop, nas três fotos de Rotas da Home.
- **Transição de página** — `main.page-enter` em opacidade, 300ms. **Sem
  transform de propósito**: `transform` em `<main>` criaria bloco de contenção e
  quebraria os `position: fixed` de dentro das páginas (a régua de anos de
  Edições). A continuidade de identidade fica com a barra de 5px sob o
  cabeçalho, que já troca de cor em 320ms.
- **Cabeçalho** — `.is-rolado` adensa o véu. Não encolhe altura nem move a logo:
  a geometria é regra estrutural (§6 deste guia).
- **Menu mobile** — entra por `scwFolha` com itens escalonados; sai por
  `.is-fechando` (260ms) e só então desmonta.
- **Edições** — ken burns `scale(1.06) → scale(1.001)` em 12s; wipe direcional
  (`clip-path: inset()`) de 820ms escalonado 0/110/220ms; deriva de fundo em 46s.

**Armadilhas conhecidas:** não usar `backdrop-filter` sobre trilho animado (blur
+ readback de GPU a cada frame congela o compositor — usar fundo semi-opaco); não
colocar `transition` em `width`/`transform` de barra de progresso que precise de
valor exato; não pôr `transform` em `<main>` (ver acima).

**Teste:** `npm run build && npm run test:motion` percorre as seis páginas em
desktop e celular, com e sem `prefers-reduced-motion`, e reprova herói ilegível
na abertura, reveal preso invisível, rolagem horizontal e erro de console.

---

## 13. Mapa das páginas

Rotas em `src/App.jsx` (hash router). Flags de publicação: `AWARDS_ONLY_PUBLICATION
= false`; `COMING_SOON_PUBLICATION = true` (o domínio oficial mostra só a landing
EmBreve); `INSTITUTIONAL_PREVIEW` = computed (DEV + previews `*.vercel.app?preview=1`,
nunca no domínio oficial).

| Página | Rota | Cor | Hero | Seções | Identidade |
| --- | --- | --- | --- | --- | --- |
| **Home / O festival** | `/` | Amarelo `#FDBB1A` | Foto ao fundo à direita, texto à esquerda `min(60%,860px)` | 7: Abertura · O que é · Rotas · Ciclo · Números · Prova · Realização | Institucional (§07 = KV F2) |
| **Edições** | `/edicoes` | Cyan `#01AFCC` | Cena de 100vh, sem header do site | 16 cenas (uma por edição) | Institucional + marca histórica por edição |
| **Sweet Awards** | `/sweet-awards`, `/historico-sweet-awards` | Roxo `#4D257E` | Vitrine dos 4 primeiros lugares (sem banda) | Herói · Vencedores Lovers 2026.1 · Como é decidido · Hall dos mais premiados · Histórico 2019–2025 · Antes de 2019 | Institucional |
| **Participar** | `/participar` | Magenta `#F10767` (selo `#D0055B`) | Ancorado embaixo, foto 4:3 em crossfade | 8: Abertura · Números · Circulação · Quem pode · Depoimentos · Imprensa · Jornada · Pré-cadastro | Institucional |
| **Apoiar** | `/apoiar` | Vinho `#B3213B` | Ancorado embaixo, números de mídia | 6: Abertura · Alcance · Por que apoiar · Onde aparece · Quem vive · Proposta | Institucional |
| **Contato** | `/contato` | Marrom `#6A2C15` | Compacta (~368px) | 4: Abertura · Dúvidas (93 perguntas / 10 assuntos) · Caminhos · Mensagem | Institucional |
| **Em breve** | `/em-breve` | — | Landing própria | 1 | Institucional (gate de publicação) |
| **Pesquisa** | `/pesquisa` | `--page-accent` legado | — | — | **Legado** (`styles.css` + `pesquisa.css`) |
| **Painel admin** | `/painel-admin` | — | — | — | Interno |
| **Painel Lovers** | `/lovers/painel` | KV Lovers | — | — | Interno, lazy |

**Rotas aposentadas:** `/lovers/*`, `/mapa`, `/rota`, `/participantes` →
redirecionam para a home. `/curiosidades` → redireciona para `/edicoes`.

### Página Edições — nota estrutural

Em Edições o `App.jsx` **não renderiza** o header do site, a barra de 5px nem o
rodapé: a página tem cabeçalho próprio com a **mesma geometria** (mesmo
`--scw-trilho`, mesmo `padding:50px` vertical, marca da edição no slot da logo) —
o menu não muda de lugar entre páginas. A tab bar mobile continua montada por
fora. A navegação parece **controle de apresentação**, não segunda navbar.

Perf: janela `live/near ±1-2` monta foto e mosaico só perto do foco — 16 cenas
full-viewport de uma vez congelam o compositor.

---

## 14. Dados

Não inventar dado. Não criar ranking fake. Não esconder ausência de dado
importante.

| Arquivo | Papel |
| --- | --- |
| `src/data/sweetCoffeeHistory.js` | **Base oficial** — 16 edições, inclui Lovers |
| `src/data/loversAwardsResults.js` | Resultados da 16ª edição (na base histórica os pódios de 2026.1 ficam vazios de propósito) |
| `src/data/participants.js` | 21 participantes + slugs congelados |
| `src/data/sweetAwards.js` | Categorias e participantes do painel de votação |
| `src/data/faqCentral.js` | 93 perguntas em 10 assuntos + schema FAQPage |
| `src/data/imageLibrary.js` | **Fonte única de caminhos de imagem** |
| `src/data/handoff/*.js` | Snapshots derivados com curadoria editorial |
| `ACERVO.md` (raiz) | Resumo legível por IA de todo o acervo |

**Se `ACERVO.md` ou `handoff/` divergirem do código em `src/data/`, vale o
código** — e o resumo deve ser corrigido.

Regra de dados do Sweet Awards: descrições de categoria de `sweetCoffeeHistory.js`;
pódios da edição atual de `loversAwardsResults.js`; histórico das demais de
`sweetCoffeeHistory.js`. 2º e 3º lugares que o acervo não registra: ausência
honesta, nunca preenchida.

**Edições não competem entre si.** Nenhum gráfico ou dado comparando edições
(rejeição registrada, jul/2026). Comparação e ranking só entre **participantes**.
Linha do tempo só como marcos/primeiras vezes, sem números de tamanho por edição.

---

## 15. O que NÃO usar mais

| Aposentado | Substituto |
| --- | --- |
| `--hm-gutter`, `.wrap` de 1280px | `--scw-trilho` (1360px) |
| `--page-accent`, paleta terracotta | `--scw-pagina` + tokens `--scw-*` |
| `#E52C4B` | Removido, sem substituto |
| Awards em ouro `#F8B511` | Awards em roxo `#4D257E` (ouro só como medalha) |
| Contato peach `#F2B6A0` | Contato marrom `#6A2C15` |
| "Não usar eyebrow" | `.scw-rotulo` abre as seções |
| "Contato sem hero" | Hero compacta ~368px |
| Breakpoints 1080·960·720·560·420 | 1000·900·820·760·420 |
| Edições "Cinema da Década" | Edições tela cheia, cena de 100vh |
| `src/styles/hero.css`, `src/styles/layout.css` | **Removidos** — classes `.scw-hero*` em `scw-2026.css` |
| `components/layout/*` (PageShell, PageSection, SectionHeader, CardsGrid, CTASection, Hero) | **Removidos** — classes `.scw-secao`, `.scw-h2`, `.scw-grade` |
| `components/motion/index.jsx`, `hooks/useReveal.js` | **Removidos** — `hooks/useRevealOnScroll.js`, hoje só na landing `/em-breve` |
| `.photo-rotator`, `.brand-cycle`, `.hm-path`, `.hm-about__*`, `.motion-reveal-left/right`, `.motion-button-hover`, `.motion-press`, `.motion-float-soft` | **Removidos** de `motion-system.css` (jul/2026) — órfãos de componentes já apagados |
| `motion-system.css` no institucional | `src/styles/scw-motion.css` + `src/hooks/useSiteMotion.js` |
| `data/editions.js`, `editionHighlights.js`, `editionInsights.js`, `decadeCredits.js`, `homeGalleries.js`, `supportMetrics.js` | **Arquivados** em `src/data/_arquivo/` |

`src/styles.css` e `src/styles/swc-redesign.css` são o sistema anterior. Seguem
carregados porque `/pesquisa` e os painéis dependem deles. **Não construir página
nova em cima deles.**

---

## 16. Onde fica cada coisa

```
docs/GUIA-VISUAL.md          ← ESTE ARQUIVO (fonte única visual)
docs/AUDITORIA-FOTOS.md      ← auditoria do acervo fotográfico
ACERVO.md                    ← resumo do acervo de dados
CLAUDE.md                    ← regras de processo e operação
SITEMAP.md                   ← rotas

src/styles/scw-2026.css      ← SISTEMA VISUAL: tokens, casca, utilitárias
src/styles/scw-<pagina>.css  ← peças de cada página
src/styles/scw-motion.css    ← MOVIMENTO (tokens --mo-*, reveal, heróis, hover)
                               ↑ os dois são espelhados no Claude Design
                                 (ver "Claude Design" no fim deste arquivo)
src/hooks/useSiteMotion.js   ← motor de entrada (carimba data-mo + --mo-i)
src/styles/motion-system.css ← movimento do sistema ANTERIOR (só /em-breve)
src/styles/layout-tokens.css ← knobs de layout (e de motion do sistema anterior)
src/styles/fonts-nexa-slab.css
src/styles.css               ← sistema anterior (legado: /pesquisa + painéis)
src/styles/swc-redesign.css  ← sistema anterior
src/styles/lovers-system.css ← KV Lovers (só painel, lazy)
src/styles/pesquisa.css      ← legado

src/components/              ← casca (nav, footer, tab bar, folha, diálogo)
src/pages/institutional/     ← páginas do site
src/pages/lovers/            ← painel interno
src/data/                    ← dados vivos
src/data/_arquivo/           ← dados aposentados, fora do bundle
src/hooks/useRevealOnScroll.js

public/logos/participants/   ← logos reais dos participantes
public/fonts/nexa-slab/      ← woff2 (unica familia do site)
public/images/               ← acervo (ver §9.1) + marcas (ver §9.3)
public/images/marcas-edicoes/← marca de cada edicao (era editions/)
acervo-bruto/                ← acervo bruto, fora do git
```

**Onde adicionar material novo:** foto de combo → `public/images/combos/<slug>/`
e registrar em `imageLibrary.js`; foto de edição → `public/images/edicoes/<code>/`;
peça visual reutilizável → utilitária `.scw-*` em `scw-2026.css`; peça de uma
página só → CSS da página com o prefixo dela.

---

## 17. Como alterar o site sem quebrar o sistema

1. **Cor nova?** Não. Usar token existente. Se realmente faltar, adicionar em
   `:root` de `scw-2026.css` e registrar no §3 deste guia.
2. **Tamanho de texto novo?** Usar a classe da escala (§4.1).
3. **Margem lateral?** `var(--scw-trilho)`. Sempre.
4. **Breakpoint?** Escala do §11. Ponto próprio só se o conteúdo exigir.
5. **Peça visual nova?** Se 2+ páginas usam, vira `.scw-*`. Se é de uma página,
   fica no CSS dela com o prefixo.
6. **Imagem?** Caminho sai do `imageLibrary.js`.
7. **Antes de finalizar:** build de verificação **fora do projeto**
   (`npx vite build --outDir "$TEMP/scw_build_$$" --emptyOutDir`), depois
   `npm run test:redesign` e `npm run test:imagens`.

**Absolutos (só o Wilke executa):** não alterar `master`/`main`; trabalhar na
branch de dev; nenhum deploy de produção; não mudar URLs de QR Code
(`#/lovers/combos/:slug`, `#/lovers/awards`); não alterar flags de publicação; não
inventar dados; não expor `.env`/secrets; não misturar identidade institucional ×
Lovers.

---

## 18. Claude Design — onde o sistema vive fora do repositório

**Projeto vivo: "Sweet & Coffee Week — Redesign 2026"**
`b98b740b-4746-4ad5-8074-2ac47d03b4e6` (claude.ai/design, tipo design system).

Sincronizado a partir do código em 29/07/2026 pela ferramenta `DesignSync`.
Contém: `styles.css` (cópia integral de `scw-2026.css`), `motion.css` (cópia de
`scw-motion.css`), as 12 fontes Nexa Slab, quatro cards de fundamento (Cor,
Tipografia, Grid, Movimento) e sete de componente (Botão, Pill, Card, Reserva,
Campo, Seção, Herói).

**Os CSS são cópia, não transcrição** — nenhum valor foi redigitado, então o
Design não pode divergir do site por erro de digitação. Se divergir por
desatualização, **vale o código**: rode a sincronização de novo.

### ⚠️ Projetos antigos no Claude Design — não usar

| Projeto | O que é |
| --- | --- |
| "Sweet & Coffee Week Design System" (26/06/2026) | **Sistema ANTERIOR.** Paleta terracotta (`--coral: #E8553A`), creme `#FFF1E6`, ouro `#F8B511` no Awards, peach no Contato, componentes `Sticker`/`SideNav`. Não tem roxo. Corresponde ao que hoje sobrevive só em `/pesquisa` e nos painéis |
| "Sweet & Coffee Week Design System" (30/05/2026) | Versão ainda mais antiga do mesmo |

Sincronizar o sistema atual dentro de qualquer um deles misturaria duas
identidades no mesmo painel — e qualquer conversa futura no Design puxaria
valores errados sem avisar.

### Páginas espelhadas (`paginas/`)

Além da biblioteca, o projeto tem um **snapshot estático das seis páginas** —
HTML autocontido, desktop 1440px, CSS embutido, imagens rebaixadas para 1200px.
É o site como está, congelado para editar.

Regerar quando o site mudar:

```
npm run build && npm run design:snapshot
```

Sai em `tests/.snapshot-design/` (ignorado pelo git). Gerador:
`tests/snapshot-design.mjs`.

O snapshot **não** tem interatividade (sem React: acordeão, busca, filtros e
formulários ficam no estado inicial), traz Edições em **uma cena só** (a página
monta só a edição em foco, por desempenho) e congela o movimento no estado
final — que é justamente como se edita layout sem lutar com animação.

### Como continuar o trabalho visual lá

1. Abrir o projeto **Redesign 2026** no claude.ai/design. Os cards já mostram o
   estado real do site.
2. Iterar por cima disso — o Design parte dos tokens e componentes certos.
3. Trazer de volta para cá **é manual**: `DesignSync` só empurra (código →
   Design). O caminho de volta é descrever ou colar o resultado, e implementar
   no repositório com as regras deste guia.
4. Mexeu no CSS do site? Rode a sincronização de novo para o Design não
   envelhecer.
