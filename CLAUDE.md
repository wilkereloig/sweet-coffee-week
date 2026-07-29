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

**Paleta oficial (redesign 2026 — aprovada pelo Wilke no handoff de design).** Tokens
em `src/styles/scw-2026.css`. Nenhuma cor fora desta lista:

| Papel | Hex | Uso |
| --- | --- | --- |
| Creme (fundo base) | `#FEF0DD` | fundo do site, texto sobre chocolate |
| Bege de seção | `#F8E4C1` | alternância de seção, chips |
| Card claro | `#FFF7E9` | cards, painéis, campos |
| Filete | `#EBD6B4` | bordas de 1px, divisores |
| Chocolate (tinta) | `#3D1308` | texto principal, seções escuras |
| Marrom secundário | `#6A2C15` | texto de apoio, rótulos pequenos |
| Amarelo | `#FDBB1A` | acento — **O festival** |
| Cyan | `#01AFCC` | acento — **Edições**; também o anel de foco |
| Roxo | `#4D257E` | acento — **Sweet Awards** |
| Magenta | `#F10767` | acento — **Participar** |
| Magenta profundo | `#D0055B` | só no selo do menu de Participar (contraste) |
| Vinho | `#B3213B` | acento — **Apoiar** |
| Ouro escuro | `#D19100` | numerais sobre creme quando o amarelo falharia |
| Prata / bronze do pódio | `#D9BE95` / `#C99A7E` | 2º e 3º lugares no Sweet Awards |

**Removida da paleta: `#E52C4B`** (vermelho-coral) — não usar em nada.

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
| `edicoes` | `#01AFCC` | `#3D1308` (6,2:1) |
| `historico-awards` | `#4D257E` | `#FEF0DD` (9,95:1) |
| `participar` | `#F10767` (selo do menu `#D0055B`) | `#FEF0DD` (4,86:1) |
| `apoiar` | `#B3213B` | `#FEF0DD` (5,86:1) |
| `contato` | `#6A2C15` | `#FEF0DD` (9,44:1) |

Passar o mouse em qualquer item do menu mostra a cor daquela página (amarelo e cyan
direto; as demais caem no amarelo, por contraste sobre o véu escuro).

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
- Fotos fixas por página: Participar `/images/combos/douce-di-maria/main.jpg` · Apoiar
  `/images/momentos/04.jpg` · Contato `/images/campanha/15.jpg`.
- **Sweet Awards não usa banda** — o herói já abre com a vitrine dos vencedores.

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

Estrutura (redesign 2026):
- **Herói**: título editorial + 4 números (11 edições · 82 categorias · 262 colocações ·
  44 marcas) + vitrine com as fotos dos 4 primeiros lugares (todas 1:1) + índice das 8
  categorias. **Não usa banda de foto** — o herói já abre com a vitrine.
  **Fundo roxo `#4D257E`** (jul/2026, pedido do Wilke) — é a única hero que não é
  chocolate; um degradê chocolate a 42% desce 340px do topo para a logo respirar.
  Como o fundo virou a cor da página, o selo inverte para creme com tinta roxa.
- **Vencedores Lovers 2026**: 8 categorias × 3 colocações, cada card com a **foto da
  peça premiada** (Melhor Doce mostra o doce, Melhor Salgado o salgado, Melhor Bebida a
  bebida, as demais o combo). 1º lugar em card maior (4:5 no desktop, 1:1 até 820px),
  medalha ouro/prata/bronze. Empates no mesmo card.
- **Como é decidido**: Júri Técnico (2020.2–2021.2) e Sweet Lovers; critério de cada
  categoria.
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

Oito seções (redesign 2026): `01 Abertura` · `02 Números` · `03 Circulação` ·
`04 Quem pode` · `05 Depoimentos` · `06 Imprensa` · `07 Jornada` · `08 Pré-cadastro`.
Herói com rótulo do público, dois CTAs, 3 indicadores e foto 4:3 com rotação em
crossfade. Três faixas alternando lado, imagem e texto com **larguras iguais** (408px
cada em 1360px).

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
Participar, com números de mídia.

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
  components/   # nav.jsx (SiteHeader + PAGE_COLORS), SiteFooter.jsx, MobileTabBar.jsx,
                # MobileMenu.jsx (folha "mais"), AccessDialog.jsx, icons.jsx, ...
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
  App.jsx · router.js · DevTools.jsx (DevViewportSwitcher é DEV-only)
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