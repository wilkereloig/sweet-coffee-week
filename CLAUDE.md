# CLAUDE.md — Regras do Projeto Sweet & Coffee Week

> Regras permanentes de layout, design, conteúdo, nomenclatura. Futuras páginas
> respeitam mesmo sistema visual, não repetem decisões rejeitadas. **Atualizar
> arquivo sempre que usuário rejeitar ou aprovar regra** (ver seção 19).
>
> 🎨 **O guia visual completo vive em [`docs/GUIA-VISUAL.md`](docs/GUIA-VISUAL.md)**
> — fonte única de cores, tipografia, grid, espaçamento, heroes, componentes,
> imagens, responsividade, mapa das páginas e do que não usar mais. Este CLAUDE.md
> cuida de **processo e operação**; o guia cuida do **sistema visual**. Se os dois
> divergirem sobre um valor visual, vale o guia — e se o guia divergir de
> `src/styles/scw-2026.css`, vale o código.

## 0. Como interpretar regras sem bloquear pedidos do usuário

As regras deste projeto existem para orientar **qualidade, consistência e segurança**.
Elas **não** são motivo automático para recusar, adiar ou esvaziar uma solicitação
explícita do usuário. Quando um pedido (melhorar transições, adicionar movimento, criar
microinterações, redesenhar uma página, ajustar layout) parecer conflitar com uma regra,
**a regra orienta como fazer — não é permissão para não fazer**.

Ao receber um pedido que toca alguma regra, classifique-a primeiro:

1. **Absoluta de segurança/operação** — respeitar sempre, sem exceção (ver lista abaixo).
2. **Regra de marca/conteúdo** — nomenclatura, paleta, não inventar dados. Respeitar,
   adaptando a execução ao pedido.
3. **Preferência visual** — decisões estéticas já registradas (ex.: sem eyebrow, sem
   mono em rótulos). Manter coerência; se o usuário pedir direção nova, seguir o pedido
   e registrar a nova preferência (§19).
4. **Regra temporária/desatualizada** — se contradiz o código atual, **parar e avisar**
   (ver ponto final).
5. **Orientação técnica** — motion system, tokens, componentes. São **base para
   construir**, não parede.

**Absolutas — nunca enfraquecer, mesmo a pedido (só o usuário executa):**
não alterar `master`/`main`; trabalhar na branch de dev correta; nenhum deploy de
produção sem autorização; não mudar URLs públicas de QR Code (`#/lovers/combos/:slug`,
`#/lovers/awards`); não alterar flags de publicação (`AWARDS_ONLY_PUBLICATION`,
`COMING_SOON_PUBLICATION`, `INSTITUTIONAL_PREVIEW`) sem pedido explícito; não inventar
dados históricos/rankings/vencedores; não expor `.env`/secrets/tokens; não mexer na
Home/O Festival sem solicitação; não misturar identidade institucional × Lovers.

**"Evitar" ≠ "proibir".** Onde uma regra diz *evitar*, o padrão é o julgamento, não o
veto:
- Evitar stickers/ornamentos **não proíbe** elemento visual com função (medalha, pódio,
  selo de vencedor, indicador de dado, feedback de UI). Ver §5.
- Evitar duplicação **não proíbe** criar variação justificada quando o padrão existente
  não resolve a experiência pedida. Ver `AI_RULES.md` §2.2.
- Evitar animação decorativa **não proíbe** transições e microinterações — ver ponto
  Motion abaixo.
- Evitar mudança global página-por-página **não proíbe** refatorar a fonte única quando
  o pedido é global. Ver `AI_RULES.md` §2.4.

**Motion é base, não bloqueio.** Quando o usuário pedir transições, movimento,
microinterações ou animação, **implementar** usando ou expandindo o sistema de
movimento — `src/styles/scw-motion.css` + `src/hooks/useSiteMotion.js` (jul/2026;
`motion-system.css` é o sistema anterior e só serve à landing `/em-breve`): (1)
reusar os atributos/classes existentes quando bastarem; (2) criar peças novas
sempre consumindo os tokens `--mo-*`; (3) animar só `transform`, `opacity`,
`filter` e `scale`, sem layout shift; (4) respeitar `prefers-reduced-motion`; (5)
não instalar biblioteca de animação nova sem justificativa; (6) hover só onde
existe ação — card sem link não sobe. A existência do sistema **não** significa
que novas transições são proibidas — significa que há uma base pronta para partir.
Detalhamento completo (tokens, motor, armadilhas): `docs/GUIA-VISUAL.md` §12.

**Se a regra estiver desatualizada ou contradizer o código, parar e avisar** — dizer
qual regra conflita, qual é o estado real do código, qual atualização será feita e como
seguir sem quebrar segurança. Depois seguir. **Toda resposta deve levar a uma execução
ou a um plano objetivo — nunca usar regra como justificativa para não fazer nada.**

## 1. Objetivo do projeto

Repositório = site institucional Sweet & Coffee Week. Apresenta festival, edições,
história, curiosidades, Sweet Awards, páginas de participação, patrocínio/apoio, contato.

**Home/O Festival = página-mãe** do sistema visual. Demais páginas respeitam sua
lógica de margens, respiro, hierarquia, grid, linguagem, ritmo.

## 2. Nomenclatura obrigatória

Não usar "Sweet" sozinho pro festival.

Usar: **Sweet & Coffee Week**; **SCW** (só após nome completo já aparecer);
**o festival**; **o evento**; **a edição**.

Não usar: "o Sweet", "do Sweet", "no Sweet", "sobre o Sweet", "história do Sweet",
"participar do Sweet".

Exceções: **Sweet Awards**, **Sweet Lovers**, **Sweet & Coffee Week Lovers**, nomes
oficiais, hashtags, arrobas, nomes de arquivos quando necessário.

Grafias oficiais (evitar erradas: "Sweet Coffee Week", "Sweet Coffee",
"Sweet Coffee Awards", "Sweet & Coffee Lovers"):
- Festival: **Sweet & Coffee Week**
- Edição Lovers: **Sweet & Coffee Week Lovers**
- Premiação: **Sweet Awards** / **Sweet & Coffee Week Awards**

## 3. Paleta de cores

**Paleta fechada em nove cores (redesign 2026, fechamento em 29/07/2026).** Tokens
em `src/styles/scw-2026.css`. Nenhuma cor fora desta lista:

| Papel | Hex | Uso |
| --- | --- | --- |
| Creme (fundo base) | `#FEF0DD` | fundo do site, texto sobre chocolate |
| Bege de seção | `#F8E4C1` | alternância de seção, chips, cor da página **Contato** |
| Chocolate (tinta) | `#3D1308` | texto principal, seções escuras, fundo de card com filete |
| Marrom secundário | `#6A2C15` | texto de apoio, rótulos pequenos |
| Amarelo | `#FDBB1A` | acento — **O festival** |
| Cyan | `#01AFCC` | acento — **Participar**; também o anel de foco |
| Roxo | `#4D257E` | acento — **Sweet Awards** |
| Magenta | `#F10767` | destaque de título; só texto grande (3,8:1 sobre creme) |
| Laranja | `#FF4810` | acento — **Edições**; superfície preenchida (nunca tinta pequena sobre creme, 3,0:1), medalha de 3º lugar |

**Removida da paleta: `#E52C4B`** (vermelho-coral) — não usar em nada.

**Fechamento de 29/07/2026 — saíram sem substituto de token:** `#B3213B` (vinho, era
o acento de Apoiar), `#EBD6B4` (filete — vira `rgba(61,19,8,.14)` genérico,
`rgba(61,19,8,.22)` em borda de campo de formulário, ou `#F8E4C1` em placeholder de
foto), `#FFF7E9` (card claro — vira `#FEF0DD`, o filete carrega o recorte),
`#D0055B` (magenta profundo do selo de Participar — o pill virou chocolate com tinta
creme), `#D19100`/`#D9BE95`/`#C99A7E` (ouro/prata/bronze de medalha — viram
`#FDBB1A`/`#F8E4C1`/`#FF4810`; **não marrom** — marrom sobre chocolate dá ~1,5:1,
falha como emblema e como texto solto). Regra permanente de troca por papel (não por
aparência) em `docs/FLUXO-DESIGN-CODIGO.md`.

**Apoiar mudou de vinho para cyan; Contato mudou de marrom para bege** nesse mesmo
fechamento — ver tabela de cor por página abaixo.

**Sequência de irmãos nunca repete cor** (cards, passos, métricas, discos de ícone,
pills, painéis): ciclo `amarelo → cyan → magenta → roxo → laranja → marrom`, filtrado
pela tabela de contraste do fundo. Quando o fundo não sustenta as seis tintas em texto
(ex.: bege só aguenta quatro), a cor migra para uma **régua de 4px** acima do numeral
(classe `.scw-stat__regua`) e o numeral fica sempre em chocolate — padrão StatBlock,
detalhado em `docs/FLUXO-DESIGN-CODIGO.md`.

**Exceção declarada — seção 07 da Home (KV da F2 Experience).** A seção de
realização usa a marca da agência que realiza o festival, não a do festival:
fundo `#0B0B0C`, acento `#E50053`, tinta `#F5F5F5` e tipografia **Archivo**.
É a única quebra de paleta e de fonte do site, proposital (decisão do Wilke,
jul/2026), restrita ao bloco `.f2-realiza*` em `src/styles/scw-home.css`.
O teste `tests/redesign-2026.test.mjs` reprova essas cores em qualquer outro
lugar e reprova `Archivo` fora dessa seção.
Contraste medido: tinta 18,05:1 sobre o preto; o magenta dá 4,18:1, então ele
fica em **texto grande e elemento gráfico** — rótulos pequenos e CTA usam a
tinta clara.

**Roxo entrou na paleta** (jul/2026): `#4D257E` é o acento oficial do Sweet Awards.
A regra antiga "evitar roxo" está superada — ela nasceu de um lavanda `#B38CFF` fora
da identidade, não deste roxo. Continuam fora: verde, cinzas frios aleatórios, pretos
puros e qualquer hex fora da tabela acima.

**Acento por página ≠ fundo da hero.** A cor da página aparece em **três pontos**:
item ativo do menu (pill sólida), **barra de 5px sob o cabeçalho** (transição 320ms) e
**selo do herói**. Não é mais fundo cheio de hero, e por isso o acento **não** precisa
ser tom claro. Definido em `body.route-*` (`src/styles/scw-2026.css`) como
`--scw-pagina` / `--scw-pagina-tinta` / `--scw-pagina-menu`:

| Rota | Cor | Texto sobre a cor |
| --- | --- | --- |
| `home` | `#FDBB1A` | `#3D1308` (9,5:1) |
| `edicoes` | `#FF4810` (era cyan — PATCH 01, ago/2026) | `#3D1308` (4,78:1) |
| `historico-awards` | `#4D257E` | `#FEF0DD` (9,95:1) |
| `participar` | `#01AFCC` (era magenta; a pill do menu volta a ser a cor da página) | `#3D1308` (6,2:1) |
| `apoiar` | `#6A2C15` (era cyan, antes vinho `#B3213B`) | `#FEF0DD` (9,44:1) |
| `contato` | `#F8E4C1` (era marrom `#6A2C15`; texto/sublinhado sobre creme usa `--scw-pagina-sobre-creme` = `#6A2C15`, bege não sustenta) | `#3D1308` (13:1) |

**Nenhuma página repete a cor da vizinha** — é o propósito da regra, e o cyan cobrindo
Edições *e* Apoiar era o que a derrotava. Sobre superfície ESCURA (rodapé, folha do
menu, barra de abas) cada página usa `pageColorDark()` em vez da cor cheia: roxo
(1,45:1) e marrom (1,53:1) não sustentam texto sobre chocolate e caem no amarelo;
laranja (4,78:1) e cyan (6,23:1) passam e ficam. Espelho em JS: `PAGE_COLORS` /
`MENU_ESCURO` em `src/components/nav.jsx` — mudou o CSS, muda o JS no mesmo commit.

**Herói com fundo próprio por página** (`--scw-heroi` / `--scw-heroi-tinta`; PATCH 01
§2, ago/2026): a chapa do herói é a cor da página, e **a Home é a única exceção** —
segue chocolate porque a foto sangra e a cor já aparece no véu e na barra. Edições
laranja; Sweet Awards roxo; Participar cyan; Apoiar marrom; Contato bege.

As compensações de contraste do herói seguem a **cor, não a página**: chapa CLARA
(hoje só o cyan de Participar) precisa de selo/CTA/anel de foco em chocolate — o anel
global é cyan e sumiria; chapa ESCURA (marrom, roxo) usa as regras base em creme. O
tratamento especial que o magenta exigia (lead em texto grande, nota em pílula
chapada) morreu com o herói magenta. Ver `docs/FLUXO-DESIGN-CODIGO.md`.

**Destaque do H1 — um acento por chapa**, sempre da paleta e sempre diferente da tinta
do título: Home magenta · Edições amarelo · Awards amarelo · Participar roxo (4,25:1,
texto grande) · Apoiar amarelo · Contato marrom. `--base` é a tinta **real** daquele
título, senão `scwDestaque` começa invisível sobre o próprio fundo.

**Card/CTA que navega usa a cor do DESTINO**, não a da página onde está (PATCH 01 §4).
Onde a chapa do destino não separa do card (<3:1 de forma) entra o anel de 2px do
§1.1 na tinta do card. Em link com filete quem recebe a cor é **o filete**, não a
tinta — cyan e laranja não fecham 4,5:1 como texto sobre creme.

*(Superada a paleta anterior — terracotta `#E8553A`, Edições `#2BC4E8`, Awards dourado
`#F8B511`, Participar `#F2693C`, Apoiar `#1B86C9`, Contato peach `#F2B6A0`. O `--page-accent`
antigo só sobrevive em telas legadas: `/pesquisa` e painéis internos.)*

## 4. Margens, grid e respiro

Todas páginas internas respeitam sistema de margens da Home/O Festival. Não deixar
textos, imagens, componentes colados no menu principal.

Hero **não deve ter altura fixa de 1080px**. Usar altura proporcional ao conteúdo,
com respiro no topo, conteúdo ancorado mais pra baixo.

**Margem horizontal — REGRA: trilho único, igual ao MENU em TODAS as páginas**
(redesign 2026). Um só valor, usado por header, seções, rodapé e Edições:

```css
--scw-trilho: max(clamp(24px, 5vw, 72px), calc((100% - 1360px) / 2));
```

Ou seja: **largura máxima de conteúdo 1360px, centralizada**, com gutter mínimo de
24–72px. Aplicar como `padding-inline: var(--scw-trilho)` (a classe `.scw-secao` já
faz). O header usa o mesmo trilho, então logo, menu, títulos, cards e rodapé alinham
na mesma coluna. Não inventar largura nem gutter próprios; não usar `max-width` em
container além disso.

Ritmo vertical de seção: `--scw-sec-y: clamp(58px, 6vw, 100px)` (padrão) e
`--scw-sec-y-compacta: clamp(48px, 5vw, 80px)`.

*(Superados: `--hm-gutter` (clamp 28/11.5vw/150px) e o `.wrap` de 1280px — continuam
válidos só nas telas legadas `/pesquisa` e painéis internos.)*

Regras: topo da hero respira; conteúdo não briga com menu; alinhamentos consistentes;
elementos seguem grid; nada solto por acaso; evitar blocos grandes vazios sem função.

### 4.1 Zona de segurança entre menu e hero (REGRA ESTRUTURAL)

Todas páginas internas respeitam **zona de segurança** entre header/menu e conteúdo da
hero. **Fundo** da hero pode subir até o topo, mas **conteúdo** (títulos, textos,
imagens, cards) só começa **depois** do offset de segurança do header. Nenhum elemento
da hero sobrepõe, compete ou encosta no menu.

Implementação (redesign 2026): a logo do cabeçalho **transborda metade abaixo** da
linha do header (`top:100%; transform:translateY(-50%)`), então a reserva de topo das
heros é maior que antes — token em `src/styles/scw-2026.css`:

```css
--scw-hero-topo: clamp(216px, 19vw, 252px);   /* reserva mínima de topo nas heros */
```

Heros com conteúdo ancorado embaixo (Home, Participar, Apoiar) usam
`padding-top: clamp(232px, 22vw, 290px)`; a hero compacta (Contato) usa
`var(--scw-hero-topo)`. Aplicar sempre no **padding da própria hero**, nunca com
`margin-top` solto, empurrão manual no título, `position:absolute` improvisado ou
ajuste que só funcione numa tela.

No mobile (≤900px) a logo perde o overhang (`top:50%`, altura 52px) e o herói vira
dois blocos empilhados — **foto em cima, informação embaixo**, nenhum texto sobre
imagem (ver §4.2).

*(Superados os tokens `--header-safe-offset` / `--hero-top-clearance` /
`--hero-content-start` de `styles.css` — valem só nas telas legadas.)*

### 4.2 Herói no celular (REGRA ESTRUTURAL)

Abaixo de 1000px o herói vira dois blocos empilhados: **foto em cima, informações
embaixo** — nenhum texto sobre imagem.

- **Home**: a foto ocupa 46vh com escurecimento mínimo (6% no meio, topo para a logo
  respirar, passagem para o chocolate na base) e o texto vem em bloco chocolate sólido.
- **Participar, Apoiar e Contato**: uma **banda de foto sangrando** (`.scw-hero-banda`,
  42vh / mínimo 264px, `padding-top:0` na seção, margens negativas pelo mesmo trilho)
  com `box-shadow` interno no topo (legibilidade da logo) e passagem para o chocolate
  na base. O cartão de foto do desktop (`.scw-hero-cartao`) é ocultado para não
  duplicar imagem.
- Fotos fixas por página: vêm de `heroPhotos(rota)` em `src/data/imageLibrary.js`
  (Participar `/images/combos/douce-di-maria/main.jpg` · Apoiar `/images/momentos/04.jpg`
  · Contato `/images/campanha/15.jpg` · Sweet Awards `/images/edicoes/2026.1/01.webp`).
  Caminho de imagem não se escreve à mão na página.
- **Sweet Awards passou a usar banda** (30/07/2026, a pedido do Wilke). A regra antiga
  — "não usa banda, o herói já abre com a vitrine" — valia no desktop, mas no celular a
  vitrine cai pra depois da dobra e sobrava uma reserva de topo de 216px de roxo
  chapado. A banda fecha no roxo (`--scw-banda-base: var(--scw-roxo)`) e o
  `.swa-hero::before` some no mobile (a própria banda escurece onde a logo passa).

**Corte da foto — rampa em S, não `box-shadow`.** O corte da banda (topo e base) vem de
`.scw-hero-banda::before/::after` mascarados pelo token `--scw-esfuma` /
`--scw-esfuma-topo` (`src/styles/scw-2026.css`): uma rampa smoothstep `t²(3−2t)`. Motivo:
degradê **linear** em alpha lê como faixa — o olho enxerga a derivada, não o valor, então
o ponto onde a rampa começa e onde termina viram arestas; a curva em S cola em 0 e em 1
nas duas pontas. É **máscara** e não degradê colorido de propósito: a mesma rampa serve
qualquer cor de fechamento. Base = 62% da altura da banda (~164px); o véu do herói da Home
no celular usa a mesma curva embutida no gradiente, cobrindo 60% da altura.

**A banda fecha na cor do BLOCO, não do herói.** `--scw-banda-base` tem como padrão o
chocolate de `.scw-hero-bloco`. Só `.pa-hero` repinta o bloco (`--scw-heroi`: cyan em
Participar, marrom em Apoiar) e por isso sobrescreve; Contato pinta bege no celular e
sobrescreve também. Errar isso deixa uma linha dura na emenda — o `box-shadow` curto de
antes escondia, a rampa longa expõe.

## 5. Elementos soltos

Evitar elementos gráficos soltos sem função. Não adicionar formas, stickers, blobs,
rabiscos, ícones ou ornamentos só pra "decorar".

Todo elemento visual precisa função: estruturar layout, indicar hierarquia,
representar dado, organizar conteúdo, apoiar fotografia, reforçar identidade. Sem
função clara → remover.

**A regra proíbe decoração gratuita, não elemento visual funcional.** Elemento com
função narrativa, estrutural, de hierarquia, navegação, feedback ou representação de
dado é permitido e às vezes necessário. Ex.: no Sweet Awards, medalhas, pódios, selos de
1º lugar e destaques de categoria **codificam colocação/resultado** — são funcionais,
não stickers (ver §12). Na dúvida, pergunte "esse elemento carrega informação ou só
enfeita?": carrega → fica; só enfeita → remove.

**Rótulo/eyebrow voltou (redesign 2026).** A regra antiga "não usar eyebrow acima dos
títulos" está **superada**: o handoff aprovado usa rótulo curto caixa-alta abrindo as
seções, e é assim que o site é. Forma canônica (classe `.scw-rotulo`):
`800 12px/1`, `letter-spacing:.16em`, `text-transform:uppercase`, cor `#6A2C15`.
O que continua proibido é rótulo **sem função** — repetir o título, anunciar o óbvio
ou enfeitar. Compensação óptica: caixa-alta dentro de pill leva 1px a mais de padding
no topo e 1px a menos na base (o caixa-alta da Nexa Slab renderiza ~2px acima do centro).

**Fonte única: Nexa Slab.** Pesos 500 (Regular), 700 (Bold), 800 (xBold), 900 (Black).
O peso 900 também é servido como família separada `'Nexa Slab Black'` — títulos usam
`font-family: 'Nexa Slab Black','Nexa Slab',Georgia,serif` (token `--scw-font-black`).
**Nada de fonte mono** (`var(--font-mono)`, JetBrains Mono) em rótulos/labels/eyebrows/
metadados — preferência registrada, rejeitada 2x (chip do Sweet Awards e rótulos da
seção Números). Caixa-alta + letter-spacing podem ficar: incomoda a face mono, não o
caixa-alta.

Escala tipográfica (tokens/classes em `src/styles/scw-2026.css`):

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

## 6. Stickers e ilustrações

**Não usar stickers por padrão nas institucionais.** Stickers só em materiais de
campanha ou páginas específicas, quando solicitados explicitamente.

Em Edições, Curiosidades, Participar, Apoiar, Contato, Sweet Awards: não inserir
stickers, doodles, elementos soltos sem aprovação.

Página **Edições**: linguagem editorial, histórica, fotográfica — não estética de
sticker/colagem.

## 7. Logos e fotos

Página que fala de edição ou participante: reservar espaço pra logo e/ou foto quando
fizer sentido.

Logo real: usar logo real; manter proporção; não distorcer; `object-fit: contain`;
limite de altura; alt text adequado.
Sem logo: manter espaço reservado; fallback claro e elegante; não inventar logo; não
esconder ausência.

Foto real: usar foto real; preservar proporção; `object-fit: cover` quando apropriado;
alt text adequado.
Sem foto: fallback em moldura editorial; texto claro ("Foto pendente"/"Galeria
pendente"); não deixar área vazia sem explicação; nunca imagem aleatória externa nem
hotlink.

**Nada gerado por IA entra como registro do festival** (auditoria de 05/08/2026). O
acervo externo tem pelo menos uma peça assim — `materiais impressos para lojas e
brindes colecionaveis/Imagem 1 gerada (8).png` — que imita o mapa da Rota da Doçura
Lovers com a lista de participantes em texto deformado. Uma peça gerada que finge
ser material real é dado inventado por outro meio (§16). Sinais de alerta ao varrer
acervo: nome de arquivo tipo "Imagem N gerada", texto ilegível/derretido em
rótulos, logo com forma inconsistente. **Na dúvida, ampliar e ler o texto da peça
antes de usar.**

**Nome de pasta do acervo não é descrição de conteúdo** — já falhou duas vezes
("encantamento em loja" e "patrocínios e apoios" eram fotos de festa a fantasia).
Inspecionar visualmente antes de confiar. Contraexemplo útil: a pasta `sinalização/`
tem 9 arquivos chamados `nao usar essas (N).jpg` — aí o nome **é** a instrução.

## 8. Placeholders e fallbacks

Placeholders parecem parte do sistema visual, não erro técnico.

Evitar: blocos vazios; áreas gigantes sem conteúdo; texto perdido no meio; aparência
de protótipo.
Preferir: moldura editorial; borda sutil; fundo da paleta; texto curto; proporção
definida.

## 9. Home/O Festival

Home/O Festival = página-mãe. **Não alterar Home sem solicitação explícita.** Demais
páginas usam Home como referência de margens, largura máxima, respiro, hierarquia,
ritmo, nível de acabamento, tom institucional-afetivo.

Sete seções (redesign 2026): `01 Abertura` · `02 O que é` · `03 Rotas` · `04 Ciclo` ·
`05 Números` · `06 Prova` · `07 Realização`.
- **Herói**: texto à esquerda limitado a `min(60%,860px)`, foto ocupando o fundo à
  direita, véu em degradê a 96° (`.97 → 0` entre 0% e 92%). Abaixo de 1000px o véu
  passa a vertical e o texto ocupa 100% (ver §4.2).
- **O que é**: anatomia do combo (3 ingredientes ligados por "+"), sem card — filete
  separando. Duas galerias irmãs de mesmo peso: combos de edições anteriores e Sweet
  Gift (2×2, fotos 1:1).
- **Números**: 4 numerais grandes em uma linha, com a fórmula de grade que desconta o
  gap (`.scw-grade-fixa`) — sem isso, faixas de 4 números quebram a 3+1.

## 10. Página Edições

**Experiência de tela cheia** (redesign 2026) — apresentação editorial photo-first da
história do festival. Substitui a direção "Cinema da Década" de jul/2026.

Em Edições o `App.jsx` **não renderiza** o header do site, a barra de 5px nem o rodapé:
a página tem cabeçalho próprio com a **mesma geometria** (mesmo `--scw-trilho`, mesmo
`padding:50px` vertical, marca da edição no slot da logo) — o menu não muda de lugar
entre páginas. A tab bar mobile continua montada por fora.

**Desktop**: cena de 100vh. Metade direita com mosaico de 3 fotos sangrando (uma larga
em cima, duas embaixo, filete de 3px). Metade esquerda com rótulo, tema, frase, meta
(período / marcas / Sweet Awards) e dois botões que abrem painéis flutuantes de
**participantes** e **curiosidades**. Fundo: foto do combo com `blur(64px)` sob véu
chocolate a 87%, com deriva lenta de 46s. Rodapé com trilha das 16 edições (dots +
anos), setas e barra de progresso. Navegação por setas do teclado, clique na trilha e
arraste.

**Mobile**: cabeçalho compacto com a marca da edição e progresso `01/16`; foto 4:5 com
tema; mosaico de 2 fotos 1:1; dados; palavras-chave; sanfonas de marcas e curiosidades.
Navegação em três peças:
1. **Régua de anos fixa na base** — trilha horizontal com os 16 anos + barra de
   progresso (`transform:scaleX` com origem à esquerda, **sem** transição em
   `width`/`transform`, que travava o valor). Rola e centraliza no ano ativo. O
   deslocamento acima da tab bar é **condicional**, nunca literal.
2. **Setas laterais** a 31% da altura, **metade fora da tela** (`left:-19px` /
   `right:-19px`, 62×52px, canto arredondado só no lado interno, sem borda no lado que
   sai). Pulso em loop de 2,8s como convite a percorrer as edições.
3. Nos extremos a seta sem destino recebe `disabled` (não só `opacity:0`), para sair
   da tabulação.

Movimento: ken burns `scale(1.06) → scale(1.001)` em 12s; wipe direcional de entrada
(`clip-path: inset()`) de 820ms, escalonado 0/110/220ms. O numeral da edição é sempre
`#FEF0DD` (o vinho sobre foto dava 2,08:1).

Dados: `src/data/handoff/edicoesData.js` (16 edições — período, participantes,
premiação, curiosidades, logo e fotos), derivado de `sweetCoffeeHistory.js`.
*(O antigo `src/data/editionHighlights.js` — pódio e curadoria de frames da
direção "Cinema da Década" — foi aposentado em `src/data/_arquivo/`.)* Perf: janela
`live/near ±1-2` monta foto e mosaico só perto do foco (16 cenas full-viewport de uma
vez congelam o compositor).

Não usar stickers. Não usar grid comum de cards. Não usar `backdrop-filter` sobre o
trilho animado (blur + readback de GPU a cada frame congela o compositor — usar fundo
semi-opaco). Navegação das edições parece **controle de apresentação**, não segunda
navbar — não pode brigar com o menu.

**A barra da galeria de fotos (`.scw-gal__barra`) é `seta · contador · seta` — três
peças, nada mais** (rejeição do Wilke, 05/08/2026: "não gosto dessa barra,
reconstrua e simplifique"). Antes tinha cinco: rótulo `Fotos · <ano>`, seta, quatro
pontos, contador e seta — **três indicadores do mesmo estado ao mesmo tempo**. O ano
já está no cabeçalho da cena e na trilha do rodapé; pontos e contador diziam a mesma
posição em duas linguagens. Com 4 páginas por edição o acesso aleatório dos pontos
não pagava a largura que custava. Não reintroduzir pontos, rótulo nem "N de N" por
extenso. As duas variantes (`--mosaico` no desktop, `--par` no celular) usam o
**mesmo** flex: a `par` só troca cor e abre com `space-between`. Se voltar a
precisar de layouts diferentes, é sinal de que peça a mais entrou. O que **não** se
mexe ao simplificar: as setas de 44px (piso de toque, §17) e o teclado
←/→/Home/End.

## 11. Página Curiosidades

Não repetir Edições. **Não incluir**: timeline completa das 16 edições; lista
cronológica de todas; cards de todas; ranking de "maiores edições"; "edições com mais
participantes" como destaque.

**Edições não competem entre si (rejeição registrada, jul/2026).** Nenhum gráfico ou
dado comparando edições — ex.: gráfico de linha de "participantes por edição" com
pico/recorde rejeitado no redesign ("parece competição entre edições, isso não deve
ocorrer"). Comparação/ranking só entre **participantes** (premiados, recorrentes),
nunca entre edições. Linha do tempo permitida só como **marcos/primeiras vezes**
(criação do Sweet Awards, trilhas de júri, Menção Honrosa única, edição comemorativa),
sem números de tamanho por edição.
**Exceção aprovada (jul/2026):** seção de homenagens da Lovers pode agrupar e contar as
21 marcas pela edição que escolheram reviver ("Sweet Trip, 6 marcas") — dado é escolha
das marcas, não tamanho/desempenho da edição; aprovado nos mocks D e E.

Deve mostrar (dados reais do acervo): achados do acervo; rankings criativos; marcas
recorrentes; participantes mais premiados; vencedores por categoria; evolução das
categorias do Sweet Awards; primeiras vezes; momentos marcantes.

## 12. Página Sweet Awards

**Reconstruída** em `src/pages/institutional/HistoricoAwards.jsx` (componente
`HistoricoAwardsPage`, route interna `historico-awards`, paths públicos `/sweet-awards`
e `/historico-sweet-awards` em `App.jsx`; antigo `Agradecimento.jsx` removido). *(Não
existe `SweetAwards.jsx` — não criar arquivo novo só para casar com doc antiga.)*
Aparência de premiação/hall de vencedores — não embeds de Instagram.

**A página pode ser alterada com pedido explícito do usuário** (layout, seções,
movimento, conteúdo editorial). O que **não** muda sem autorização: flags de publicação,
rotas congeladas, dados oficiais (cruzados das fontes em §16, nunca inventados) e deploy
de produção. Não tratar Awards como intocável — a restrição é sobre flags/rotas/dados,
não sobre a página em si. Identidade **institucional do festival**, NUNCA o KV Lovers.
Cor da página: **roxo `#4D257E`** com texto creme (redesign 2026 — antes ouro
`#F8B511`); o ouro/prata/bronze seguem como cores de **medalha** no pódio
(`#D19100` / `#D9BE95` / `#C99A7E`).

Estrutura (redesign 2026, ajustada em 29/07/2026):
- **Herói**: título editorial + 3 números (edições premiadas · categorias julgadas ·
  marcas premiadas — "colocações no pódio" saiu, era redundante com categorias) +
  vitrine com as fotos dos 4 primeiros lugares (todas 1:1) + índice das 8 categorias.
  **Não usa banda de foto** — o herói já abre com a vitrine. **Fundo roxo `#4D257E`**
  — é a única hero que não é chocolate (fundo próprio via `--scw-heroi`); um degradê
  chocolate a 42% desce 340px do topo para a logo respirar. Como o fundo virou a cor
  da página, o selo inverte para creme com tinta roxa.
- **Vencedores Lovers 2026**: 8 categorias × 3 colocações, cada card com a **foto da
  peça premiada** (Melhor Doce mostra o doce, Melhor Salgado o salgado, Melhor Bebida a
  bebida, as demais o combo). Medalha dentro da legenda do card (ao lado do rótulo de
  colocação), não solta no canto da foto. Numeral **sempre chocolate**: 1º amarelo,
  2º bege, **3º laranja** (marrom foi cogitado e descartado — falha como emblema e
  como texto solto sobre chocolate, ~1,5:1). 1º lugar em coluna larga (span de 2
  linhas), 2º/3º empilhados ao lado — **as três fotos sempre 1:1** (mesma direção,
  mesmo recorte; 1º só é maior por ocupar coluna mais larga, não por um aspect-ratio
  próprio — um 4:5 exclusivo do 1º foi testado e descartado em 30/07/2026: cortava a
  foto de forma inconsistente com as outras duas e, em fotos sem espaço vertical de
  sobra, zoom demais). Empates no mesmo card. **No celular** (≤820px) vira carrossel
  de arrasto com snap — 24 cards empilhados não cabem.
- **Quem dá a nota** (era "Como é decidido"): trilha do tempo de três momentos
  cronológicos — 2019 (categoria única) → 2020.2–2021.2 (Júri Técnico) → 2022 em
  diante (só Sweet Lovers, com selo "hoje") — não mais dois cards gêmeos lado a lado
  (isso escondia que a régua mudou ao longo do tempo). Espinha tracejada atrás dos
  discos; no celular vira vertical com o disco fora do fluxo.
- **Hall dos mais premiados**: barra segmentada por colocação, contagem `9×1º 13×2º
  6×3º` e total. Líderes: Mr. Cupcake 28, Bocaditos 26, Marlon Vinicius 24.
- **Histórico 2019–2025**: acordeão com 10 edições, pódio completo por categoria,
  separado por trilha quando houve júri e público.
- **Antes de 2019**: as cinco primeiras edições não tiveram premiação — dizer isso.

Regra de dados (cruzar fontes, não inventar): descrições das categorias vêm de
`sweetCoffeeHistory.js` (edição 2026.1); **pódios da edição atual vêm de
`loversAwardsResults.js`** (na base histórica os pódios de 2026.1 estão vazios de
propósito); histórico das demais vem de `sweetCoffeeHistory.js`; o agregado pronto do
handoff está em `src/data/handoff/awardsData.js` (derivado — se divergir do código em
`src/data/`, vale o código). Medalhas, pódios e selo de 1º lugar **codificam colocação**
— são funcionais, não stickers. Logos reais via `resolveParticipant` (fallback em
iniciais). 2º e 3º lugares que o acervo não registra: ausência honesta, nunca preenchida.

## 13. Página Participar

Segue lógica visual da Home. Deve ter: proposta clara; imagens/fotos quando disponíveis;
depoimentos; **formulário em destaque**; linguagem voltada a participantes; visual
editorial e comercial. Não parecer formulário genérico.

Oito seções: `01 Abertura` · `02 Depoimentos` · `03 Números` · `04 Circulação` ·
`05 Quem pode` · `06 Imprensa` · `07 Jornada` · `08 Pré-cadastro`.
Herói com rótulo do público, título, lead e dois CTAs — **nada mais** (PATCH 01 §6,
ago/2026: a abertura é rótulo + H1 + lead + ações; vitrine, cartão de foto e bloco de
número entram nas seções seguintes). O cartão 4:3 em crossfade e os 3 indicadores
saíram; os três números já existiam, idênticos, na seção `03 Números`, então nada de
dado se perdeu. No celular a foto continua, sangrando na `.scw-hero-banda`.
**Quatro** faixas alternando lado, imagem e texto com **larguras iguais** (408px
cada em 1360px).

A 4ª faixa (`04 · Materiais`, ago/2026) fecha a Circulação com o material que chega
na loja — display, adesivo, mapa e brinde temático. O `--fundo` da faixa pinta o
**painel inteiro** e todo o texto dela é creme: cyan e amarelo reprovam como fundo
de texto normal, então o ciclo de irmãos (§5) fecha em **magenta** (4,86:1). Não
trocar por tom claro "porque o ciclo pede".

A seção **06 Imprensa** abre com galeria de 3 registros reais em TV
(`.pa-imprensa__fotos`, `public/images/imprensa/01–03`) antes dos chips de veículo.
Alt genérico de propósito: o acervo não traz crédito confiável de veículo, data nem
pessoa — nomear alguém ali seria dado inventado (§16). A grade usa
`auto-fit / minmax(min(100%,220px),1fr)` e empilha sozinha, sem media query.

**Depoimentos vêm logo depois da abertura** (decisão do Wilke, 30/07/2026 — no
redesign original eram a seção 05, entre "Quem pode" e "Imprensa"). São a prova
social da página: quem cogita participar quer ouvir quem já participou antes de
ler número ou processo, e vários depoimentos são em vídeo. Mover a seção exige
conferir a alternância de fundo das seções vizinhas — creme/bege alternam, e a
saída dos Depoimentos do meio deixou "Quem pode" e "Imprensa" ambos bege
(Imprensa virou creme por isso).

*(O kit `PageShell`/`PageSection`/`SectionHeader`/`CardsGrid`/`CTASection` de
`src/components/layout/` foi **removido** em jul/2026 — estava morto, nenhuma
página o importava. O redesign 2026 usa as classes `.scw-*` de
`src/styles/scw-2026.css`.)*

## 14. Página Apoiar

Lógica parecida com Participar. Precisa: **formulário em destaque**; explicação visual
de oportunidades de apoio; benefícios pra marcas; exemplos de presença da marca no
festival; linguagem comercial alinhada ao tom. Não parecer página institucional fria.

Seis seções (redesign 2026): `01 Abertura` · `02 Alcance` · `03 Por que apoiar` ·
`04 Onde aparece` · `05 Quem vive` · `06 Proposta`. Mesma estrutura de herói da
Participar — sem cartão e sem indicadores desde ago/2026 (§13).

Os três indicadores de audiência que viviam no herói (`+200 mil` alcançadas, `+18 mi`
visualizações, `+290 mil` interações) **mudaram de lugar, não sumiram**: abrem a seção
`02 Alcance`, que é sobre exatamente isso. Diferente de Participar, eles não se repetem
em `ALCANCE` — são dado próprio. Vão no padrão disco + ícone + numeral + rótulo
(`.pa-alcance-topo`), com o disco de 54px na cor da página.

**`05 Quem vive`** é grade editorial, não duas listas de bullets lado a lado (PATCH 04,
ago/2026): os seis traços do público viram itens com índice `01`–`06` gerado do array
`PUBLICO` e filete horizontal entre eles — bolinha de 7px é indicador de item de lista,
não de dado. O texto do traço é `700 17–21px`: ele é o argumento da seção. A imprensa
sai de dentro da grade e vira bloco irmão embaixo, separado por 44–72px — a distância
entre argumento e prova é maior de propósito, não use `--scw-gap-bloco` ali.

## 14.1 Página Contato

Quatro seções (redesign 2026): `01 Abertura` (compacta, ~368px) · `02 Dúvidas` ·
`03 Caminhos` · `04 Mensagem`. **A regra antiga "Contato é página simples, SEM hero"
está superada** — a página abre com hero compacta e banda de foto no mobile.

**Central de dúvidas**: 93 perguntas em 10 assuntos (Sobre o festival 9, Edição atual 7,
Combos 10, Atendimento 10, Ingredientes e acessibilidade 7, Rota da Doçura 9, Sweet
Awards 13, Participação 13, Parcerias 8, Suporte 7) — fonte única em
`src/data/faqCentral.js`. Índice editorial à esquerda (linhas com filete, contagem à
direita, ativo por peso + sublinhado de 2px na cor da página) e busca como linha com
traço inferior. No mobile o índice vira chips roláveis (`flex:0 0 auto` obrigatório no
`<li>`, senão os chips colapsam). Busca ignora acentos e maiúsculas, casa múltiplos
termos e **muda o filtro para "Todas" automaticamente**. Cada pergunta é `h3 > button`
com `aria-expanded`/`aria-controls`, painel `role="region"`. Schema `FAQPage` gerado da
mesma fonte de dados. Campos `mapa`, `regulamentoRota`, `regulamentoAwards`,
`areaAvaliacao`, `imprensa` e `pressKit` estão `null`: quando `null`, o link não
aparece — preencher faz o link surgir sozinho.

## 15. Textos e tom de voz

Claro, afetivo, institucional na medida. Evitar: texto técnico/longo demais; repetição
de dados; tom burocrático; excesso de adjetivos genéricos. Preferir: frases objetivas;
linguagem calorosa; ritmo de leitura; conexão com Natal, gastronomia, marcas locais,
Sweet Lovers.

Posts/comunicações ao público: linguagem mais leve. Páginas institucionais: equilibrar
afeto e credibilidade.

## 16. Dados históricos

Fontes principais (verificar antes de rankings/históricos/cards):
- `ACERVO.md` (raiz) — **resumo legível por IA** de TODO o acervo (16 edições,
  Sweet Awards + vencedores com empates, Lovers 2026.1, 21 participantes, métricas,
  curiosidades). Transcrição fiel das fontes abaixo; pra gerar texto/responder usar
  `ACERVO.md`, mas **código em `src/data/` é a verdade** (se divergir, vale o código —
  e atualize o `ACERVO.md`);
- `src/data/sweetCoffeeHistory.js` — **base oficial, 16 edições (inclui Lovers)**;
- `src/data/loversAwardsResults.js` — resultados da 16ª edição (Lovers);
- `src/data/participants.js`, `src/data/sweetAwards.js`.

Dados aposentados vivem em `src/data/_arquivo/` (fora do bundle, ninguém importa):
`editions.js`, `editionHighlights.js`, `editionInsights.js`, `decadeCredits.js`,
`homeGalleries.js`, `supportMetrics.js`. Ver `src/data/_arquivo/LEIA-ME.md`.
**Não importar de lá em código vivo.**

Dados novos do redesign 2026 (convertidos do handoff de design):
- `src/data/faqCentral.js` — **conteúdo novo**: 93 perguntas em 10 assuntos da central
  de dúvidas + `edicao`/`links`/`aviso`. Fonte única da interface e do schema FAQPage.
- `src/data/handoff/edicoesData.js` e `src/data/handoff/awardsData.js` — **snapshots
  derivados** de `sweetCoffeeHistory.js` / `loversAwardsResults.js`, com curadoria
  editorial (curiosidades, notas por edição) e caminhos de asset já apontando pra
  `public/`. Se divergirem do código em `src/data/`, **vale o código**.

Não inventar dados. Não criar ranking fake. Não esconder ausência de dado importante.
(Migração da base antiga `sweetHistory.js` concluída: nenhuma página a importa mais;
páginas consomem `sweetCoffeeHistory.js` direto ou via `sweetEditionsCompat.js`.)

## 17. Responsividade

Validar em desktop, tablet, mobile. Mobile: evitar sticky horizontal complexo; evitar
overflow lateral; manter leitura clara; botões tocáveis; reorganizar grids em coluna;
manter logos/fotos proporcionais.

**Escala de breakpoints canônica (redesign 2026).** Não existe token de breakpoint
(CSS não aceita `var()` em `@media`), consistência é por convenção. Ao criar/ajustar
`@media (max-width: …)`, usar a escala do handoff: **1000 · 900 · 820 · 760 · 420**.
Pontos com significado fixo:
- **1000px** — herói vira dois blocos empilhados (foto em cima, texto embaixo, §4.2);
- **900px** — casca vira aplicativo: logo perde o overhang (52px), botão de acesso do
  topo some, entra a barra inferior de 5 abas;
- **820px** — card de 1º lugar do Sweet Awards passa de 4:5 para 1:1.

**Especificidade é a armadilha nº 1 do mobile.** Três bugs distintos, mesma causa: um
reset genérico com seletor de 2 níveis vence a regra específica de 1 nível, e o efeito só
aparece no celular porque é lá que a regra específica existe. Casos já corrigidos —
`.scw-raiz a { color: inherit }` (0,1,1) vencia `.scw-aba` (0,1,0), apagando os rótulos da
barra de abas; `.scw-raiz img { display: block }` (0,1,1) vencia
`.ctt-abertura__fundo { display: none }` (0,1,0), montando a foto de tela cheia atrás do
texto do Contato. **Ao esconder ou recolorir um elemento no mobile, conferir se existe
reset genérico em `.scw-raiz` para aquela tag** — e prefixar o seletor, nunca usar
`!important`.

**Alvo de toque mínimo 44px no celular.** Vale para o controle real, não para a linha que
o contém: clicar no padding de um flex não foca o `<input>` filho (foi o caso da busca do
Contato, campo de 26px dentro de uma linha de 46px). Auditado em 390px nas 6 rotas.

Testado em 320, 360, 375, 388, 390, 430, 768, 1024, 1280, 1440, 1544 e 1920 — sem
rolagem horizontal e sem texto cortado. Valores fora da escala só quando o conteúdo
exigir ponto próprio — nunca por inércia/cópia. Não renumerar em massa breakpoints já
calibrados. *(A escala anterior — 1080 · 960 · 720 · 560 · 420, com reflow principal em
960 — vale só nas telas legadas: `/pesquisa` e painéis internos.)*

## 18. Validação antes de finalizar

1. Home não alterada sem necessidade.
2. Flags de publicação em `App.jsx` não alteradas sem pedido explícito. Estado real
   (jul/2026): `AWARDS_ONLY_PUBLICATION = false`; `COMING_SOON_PUBLICATION = true` (gate
   ativo — domínio oficial mostra só a landing EmBreve); `INSTITUTIONAL_PREVIEW` =
   computed (DEV + previews `*.vercel.app?preview=1`, nunca no domínio oficial). Não
   trocar valores sem autorização; ver `AI_RULES.md` §1.6.
3. Nenhuma cor fora da tabela do §3. Nunca `#E52C4B`.
4. Nenhum sticker sem solicitação (elemento funcional é permitido — §5).
5. Margens no trilho único `--scw-trilho` (§4).
6. Sem elementos soltos sem função.
7. Placeholders claros e elegantes — reserva honesta, nunca área vazia.
8. Desktop e mobile funcionam (breakpoints do §17; sem rolagem horizontal).
9. Rodar build de verificação **fora do projeto** (ver "Build de verificação" abaixo).
10. Rodar lint/typecheck se existir.
11. Mexeu em movimento/animação? `npm run build && npm run test:motion` — reprova
    herói ilegível na abertura, reveal preso invisível, rolagem horizontal, erro de
    console e desrespeito a `prefers-reduced-motion`, nas 6 páginas × 2 telas.

## 19. Como registrar novas preferências

Sempre que usuário disser que não gosta de algo ou aprovar regra de layout, **atualizar
arquivo**. Exemplos já registrados: "não gosto de elementos soltos"; "não quero
stickers"; "hero com conteúdo ancorado embaixo"; "formulário em destaque"; "não usar
cores fora da paleta"; "hero não pode ter 1080px fixo"; "zona de segurança entre menu e
hero" (ver 4.1).

### Redesign 2026 — regras que MUDARAM (28/07/2026)

Origem: pacote `design_handoff_site_institucional/` que o Wilke produziu no Claude
Design (alta fidelidade, contraste AA verificado nas seis páginas). O handoff é a
especificação visual; o repositório é a implementação. Regras superadas — **não
reintroduzir as antigas**:

| Regra antiga | Regra atual |
| --- | --- |
| "Evitar roxo" | Roxo `#4D257E` é o acento oficial do Sweet Awards (§3) |
| Awards em ouro `#F8B511` | Awards em roxo; ouro/prata/bronze só como medalha (§12) |
| Acento = fundo cheio da hero, tom claro | Acento em 3 pontos: pill do menu, barra de 5px, selo do herói (§3) |
| Contato peach `#F2B6A0` | Contato marrom `#6A2C15` (§3) |
| "Não usar eyebrow/kicker" | Rótulo `.scw-rotulo` abre as seções (§5) |
| "Contato é página simples, SEM hero" | Contato abre com hero compacta ~368px (§14.1) |
| Trilho `--hm-gutter` full-width | Trilho único de 1360px `--scw-trilho` (§4) |
| Breakpoints 1080·960·720·560·420 | 1000·900·820·760·420 (§17) |
| Edições "Cinema da Década" | Edições tela cheia com cena de 100vh (§10) |
| Movimento em `motion-system.css` | `scw-motion.css` + `useSiteMotion.js`; o antigo só serve `/em-breve` |

O que **não** mudou e segue absoluto: proteção de branch e deploy, URLs de QR Code,
flags de publicação, "não inventar dados", separação institucional × Lovers, nomenclatura
(§2) e a proibição de fonte mono em rótulos.

### Fechamento de paleta e patches de cor (29/07/2026)

Origem: cinco patches (`PATCH-selo-preto.md`, `PATCH-acesso.md`, `PATCH-acesso-v2.md`,
`PATCH-cores-pagina-e-navegacao.md`, `PATCH-paleta-e-contraste.md`) gerados no Claude
Design a partir do projeto "Redesign 2026". Fluxo completo em
`docs/FLUXO-DESIGN-CODIGO.md` (novo). Regras superadas — **não reintroduzir**:

> Um sexto patch da mesma origem, **`PATCH-realizacao-f2.md`**, é de outra leva
> (não é de cor): trocou a seção 07 da Home pelo KV da F2 Experience. **Já
> aplicado** — vive em `.f2-realiza*` de `src/styles/scw-home.css` e é a exceção
> de paleta/fonte documentada no §3. Registrado aqui só para fechar o rastreio.

| Regra antiga | Regra atual |
| --- | --- |
| Paleta com filete/card/vinho/ouro/prata/bronze como hex próprios | Paleta fechada em 9 cores; filete/card viram `rgba()`/`creme` por papel (§3) |
| Apoiar vinho `#B3213B` | Apoiar cyan `#01AFCC` |
| Contato marrom `#6A2C15` | Contato bege `#F8E4C1` (texto/sublinhado sobre creme usa `--scw-pagina-sobre-creme`) |
| Medalha 3º lugar bronze/marrom | Medalha 3º lugar **laranja** `#FF4810` (marrom falha sobre chocolate) |
| Selo do menu de Participar `#D0055B` | Pill vira chocolate com tinta creme (10:1) |
| Botão "Acesso" só ícone; painel uma faixa | Botão com rótulo; painel em duas faixas (topo chocolate + corpo creme), sem marca-d'água, card com selo+título na mesma linha, rodapé com CTA "Falar com a equipe" |
| Barra de 5px sob o cabeçalho (`#barra-pagina`) | Removida — o herói já é a cor da página |
| "Como é decidido" com dois cards gêmeos | Trilha do tempo de três momentos cronológicos |
| Sem botão de voltar ao topo | `BotaoTopo.jsx`, aparece após 1,5 tela de rolagem |

Nota de processo: patches da mesma leva podem se contradizer entre si (um introduziu
`#D0055B` num token que o patch seguinte, na mesma rodada, bane da paleta) ou assumir
estado do código diferente do real (ex.: SVG do selo já tinha `<style>`, só com hex
fora do token). Ver `docs/FLUXO-DESIGN-CODIGO.md` § Armadilhas antes de aplicar a
próxima leva de patches.

### Alinhamento, medida e ritmo interno (05/08/2026)

Origem: zip `SWEET & COFFEE WEEK.zip` (export completo do projeto Claude Design),
patch `PATCH-layout-e-responsivo.md`. **Aplicado.** O que entrou:

| Regra | Onde |
| --- | --- |
| Três tokens de respiro **interno** de seção | `--scw-gap-cabeca` (26–40px) · `--scw-gap-bloco` (20–32px) · `--scw-gap-grade` (16–28px), em `scw-2026.css`. O ritmo ENTRE seções continua `--scw-sec-y` |
| Medida de linha por papel | `.scw-h2` 20ch → **22ch** · `.scw-h3` **28ch** (não tinha) · `.scw-corpo` **62ch** (não tinha; limite absoluto 68) · `.scw-rotulo--com-icone` **32ch, uma linha** |
| Ícone do rótulo de seção | `tamanho={16}` → **20** nas 26 chamadas de `.scw-rotulo--com-icone`. 16 fica só em chip e legenda |
| Gap do rótulo | 8px → **10px** |
| Filete é do link, não da coluna | `.pa-cabeca__link` ganhou `width: fit-content` |

**Item do patch que já estava feito:** `align-items:end` + margem na cabeça de seção —
`.hm-cab`, `.pa-cabeca` e `.ctt-cabeca` já tinham. O patch foi escrito contra um
estado anterior do código; conferir antes de "corrigir" o que não está quebrado.

**Não aplicado, e por quê:**
- **`PATCH-icones-animados.md`** — o próprio patch (§6) diz "nesta rodada o Design
  entrega só a prancha, a aplicação no site é decisão separada". Além disso depende
  de `scw-icons-v2.js`, que o repo não tem (está em `scw-icons.js`, v1). Entra quando
  houver decisão de migrar o conjunto de ícones.
- **Varredura px cravado → token de gap** nos CSS de página. Os tokens existem, mas
  trocar cada `margin`/`gap` fixo é refatoração ampla com risco visual — vale fazer
  por página, conferindo, não em massa.
- **Overrides de `max-width:24ch`** em `.hm-h2--marrom` e `.pa-cabeca h2`. O patch pede
  medida "na classe do papel, não por página"; 24ch está dentro da faixa 20–24 do §5,
  então não conflita — mas remover é decisão de design, não limpeza.

⚠️ **`tests/responsive.mjs` reprova 4/6 viewports com "menu-toggle invisível no
mobile" — falha PRÉ-EXISTENTE, não regressão.** `.menu-toggle` é do sistema legado
(`styles.css`) e tem **zero** referência em JSX: não renderiza, logo não pode estar
visível. O redesign 2026 trocou o hambúrguer pela `MobileTabBar`. O que o teste mede
de útil (`overflow=0px`) passa nos 6. Não "consertar" o menu-toggle — o teste é que
está desatualizado.

### Cor por destino, interação e composição (06/08/2026)

Origem: zip `SWEET & COFFEE WEEK.zip` → `design_handoff_ago-2026/`, quatro patches
aplicados na ordem 01 → 02 → 03 → 04, um commit cada. Regras superadas — **não
reintroduzir as antigas**:

| Regra antiga | Regra atual |
| --- | --- |
| Edições cyan · Participar magenta · Apoiar cyan | Edições **laranja** · Participar **cyan** · Apoiar **marrom** (§3) |
| Cyan como acento de duas páginas | Nenhuma página repete a cor da vizinha — é o propósito da regra |
| Herói de Edições chocolate | Herói na cor da página; **só a Home** segue chocolate (§3) |
| Compensação de contraste por PÁGINA | Compensação segue a **COR**: chapa clara pede selo/CTA/anel chocolate; chapa escura usa a base |
| CTA pintado com a cor da página onde está | CTA que navega usa a cor do **destino**; link com filete colore **o filete**, não a tinta (§3) |
| Herói de Participar/Apoiar com cartão 4:3 + 3 indicadores | Herói = rótulo + H1 + lead + ações (§13, §14) |
| Durações de transição livres (120–300ms) | `--scw-transicao`: 200ms cor/borda/sombra/gap, 180ms transform |
| Desabilitado com aparência por página (.35/.55/.72) | Um estado só: `.45` / `default` / `pointer-events:none` |
| Raio de card 18/24px por página | `var(--scw-r-card)` (20px) em todo card institucional |
| Lead em toda cabeça de seção | Lead **só quando informa** o que o H2 não dá; senão rótulo + H2 em bloco único |
| Apoiar 05 em duas listas de bullets | Grade editorial com índice `01`–`06` e filete (§14) |

**Pisos de toque (PATCH 02 §2):** 44px para qualquer controle — inclusive link de texto
e item de acordeão — 46px para pílula de ação dentro de card, 54px no herói. O piso vale
para o **controle real**, não para a linha que o contém: clicar no padding de um flex
não foca o `<input>` filho.

**Duas coisas que o handoff pediu e NÃO entraram, e por quê:**
- **PATCH 02 §5** (disco 54px + ícone em toda seção de dado/etapa) — as premissas não
  batem com o repo: não existem discos de 44/48/60px para unificar, e o §5 substituiria
  o padrão **StatBlock** (régua de 4px + numeral chocolate) que o §3 documenta como
  decisão deliberada. O PATCH 04 também contradiz o §5, mantendo `.pa-quem` sem disco.
  Só o bloco novo de Apoiar 02 nasceu no padrão. Decidir antes de aplicar em lote.
- **PATCH 03 §4** (varredura das outras cabeças) — o próprio patch manda trazer a lista
  antes de remover, "cada uma é uma decisão de conteúdo". Feita a varredura das 14
  cabeças; 3 candidatas aguardam decisão.

⚠️ `tests/icones.mjs`, que o README do handoff manda rodar, **não existe** no repo.

---

# Regras técnicas e operacionais (preservadas)

## Proteção de branch e deploy — ABSOLUTO

- Confirmar branch antes de alterar: `git branch --show-current`. Trabalhar na **branch
  de desenvolvimento ativa** (atualmente **`dev/site-completo`**). Se em `master`/`main`:
  **parar e avisar; não continuar.**
- Nunca alterar `master`/`main`. Nunca publicar produção. Nunca usar `vercel --prod`.
  Nunca promover Preview para Production. Nunca fazer merge para `master`/`main` sem
  autorização explícita.
- Site oficial em `sweetcoffeeweek.com.br` não deve ser afetado por essas operações.

### Fluxo ao finalizar
1. **Build local:** `npm run build`. Falhou → parar, mostrar erro, não commitar/push.
2. `git status` → conferir alterações.
3. Commit pequeno e claro: `git add <arquivos da tarefa>` + `git commit -m "tipo: descrição"`
   (tipos: `fix:` / `feat:` / `style:` / `chore:` / `docs:`).
4. `git push origin dev/site-completo`.
5. Reportar: build, hash+mensagem do commit, push, link/preview da Vercel se houver.
6. � � Repo pode ter WIP local não relacionado — commitar **só** os arquivos da tarefa.

## URLs estáveis para QR Codes — REGRA PERMANENTE

URLs públicas dos QR Codes da edição Sweet & Coffee Week Lovers **NÃO podem mudar**
depois de definidas.

Padrões fixos:
- Combo: `https://www.sweetcoffeeweek.com.br/#/lovers/combos/{slug-do-participante}`
- Premiação: `https://www.sweetcoffeeweek.com.br/#/lovers/awards`

Regras: nunca alterar rota `#/lovers/combos/:slug` nem `#/lovers/awards`; slug do combo
= slug do participante; não renomear slugs já definidos em `src/data/participants.js`;
não trocar hash routing por path routing; mudança em URL/rota/slug exige parar e avisar
antes — nunca automático. Lista dos 21 slugs congelados: seção 9 de `CODE_REVIEW_GRAPH.md`.

## Duas identidades visuais — nunca misturar

**Institucional** — `src/pages/institutional/` (Home, Edições, Sweet Awards, Participar,
Apoiar, Contato). Sistema visual do **redesign 2026** em `src/styles/scw-2026.css`:
paleta creme/chocolate (`--scw-creme`, `--scw-choco`, `--scw-marrom`, `--scw-bege`),
trilho `--scw-trilho`, tipografia Nexa Slab, classes com prefixo `.scw-`. Cor-acento por
página via `--scw-pagina` (definido em `body.route-*` no mesmo arquivo).
*(A paleta terracotta `--bg`/`--ink`/`--accent`/`--peach` e o `--page-accent` de
`src/styles.css` são do sistema anterior — sobrevivem só em `/pesquisa` e nos painéis.)*

**Edição Lovers** — `src/pages/lovers/` (Hub, Combos, Mapa, Awards). Paleta cream,
`--lovers-red`, burgundy, pink, yellow. Tipografia Sofia Pro Comp via Typekit. Wrapper
obrigatório `.kv-lovers`. Fontes via `--font-lovers-display` / `--font-lovers-body`.

Nunca aplicar estilos Lovers em Institucionais nem vice-versa sem pedido explícito.

## Estrutura, stack e variáveis

```
src/
  components/   # nav.jsx (SiteHeader + PAGE_COLORS/pageColorDark), SiteFooter.jsx,
                # MobileTabBar.jsx, MobileMenu.jsx (folha "mais"), AccessDialog.jsx
                # (duas faixas: topo chocolate + corpo creme, botão "Acesso" com
                # rótulo), BotaoTopo.jsx (flutuante, aparece após 1,5 tela), icons.jsx
  pages/institutional/ | lovers/
  data/         # editions.js, sweetCoffeeHistory.js, loversAwardsResults.js,
                # participants.js, sweetAwards.js, participantAssets.js, editionAssets.js,
                # faqCentral.js (93 dúvidas), handoff/{edicoesData,awardsData}.js
  hooks/        # useSiteMotion.js (motor de movimento do institucional),
                # useRevealOnScroll.js (sistema anterior, só /em-breve)
  styles/scw-2026.css   # SISTEMA VISUAL ATUAL: tokens --scw-*, casca, utilitárias
  styles/scw-motion.css # MOVIMENTO: tokens --mo-*, reveal, heróis, hover, páginas
  styles/scw-<pagina>.css  # CSS específico de cada página do redesign
  styles.css    # sistema anterior (route-* / --page-accent) — legado, editar com cuidado
  styles/       # motion-system.css, lovers-system.css, etc.
  App.jsx · router.js
public/images/  # logos, combos (/images/combos/<slug>/main.jpg), edicoes/ (fotos),
                # marcas-edicoes/ (marca de cada edição),
                # momentos/, campanha/, shapes
public/logos/   # lockup-scw-creme.svg (SEM USO) + participants/<slug>.png
                # marca do cabeçalho/rodapé = /images/logo-seal-sweet-coffee.svg
public/fonts/nexa-slab/  # woff2 (pesos 100–900 + itálicos + alias 'Nexa Slab Black')
```

- Vite + React (JSX). Hash router customizado. Adobe Fonts/Typekit + Google Fonts.
- Dev server: `npm run dev`. Build: `npm run build`.
- **Build de verificação: SEMPRE fora do projeto, uma vez só.** Rodar em pasta temp:
  `npx vite build --outDir "$TEMP/scw_build_$$" --emptyOutDir && rm -rf "$TEMP/scw_build_$$"`.
  Nunca disparar 2 builds ao mesmo tempo; esperar o anterior. `dist*/` já está no
  `.gitignore` — não versiona.
  *(Causa raiz dos builds de GBs resolvida em jul/2026: o acervo bruto de ~58 GB
  morava em `public/images/EDIÇÕES DO FESTIVAL/` e o Vite copiava tudo por build.
  Movido para `acervo-bruto/` na raiz — fora de `public/`, fora do git. Build agora
  ~364 MB / ~5 s. Não devolver o acervo pra dentro de `public/`.)*

```css
--accent: #E8553A;  --ink: #2B1810;  --peach: #F7D9B5;
--lovers-red: #D63648;  --lovers-cream: #FFF1E6;
--font-lovers-display: 'sofia-pro-comp', 'Caprasimo', serif;
--font-lovers-body:    'sofia-pro-comp', 'DM Sans', sans-serif;
```

## Escopo, qualidade e segurança

- Listar arquivos a modificar **antes** de editar. Alterar só o que se relaciona ao
  pedido. Usar `Edit` (não `Write`) em arquivos existentes, salvo reconstrução pedida.
  Resumo curto após cada conjunto de edições.
- Preservar padrão do projeto, tipagem, acessibilidade, responsividade. Evitar
  dependências novas sem justificativa. Não reescrever arquivo inteiro se ajuste local
  resolve.
- Não ler/exibir/versionar `.env`, secrets, tokens, chaves, credenciais.
- Pedir confirmação antes de ações destrutivas (apagar, reset, force-push, deploy de
  produção, remover dependência principal, mexer em config de produção).

## Princípio principal

Repositório é a fonte da verdade. Buscar contexto em arquivos, docs, commits, configs
antes de pedir ao usuário; não pedir o que pode ser inferido com segurança do repo.
Nunca fingir ter usado uma ferramenta.