<!-- Parte das regras do projeto. Índice: src/pages/CLAUDE.md. Movido sem reescrita de src/pages/CLAUDE.md em 10/11/2026. -->

### 7.7 Em breve — `/em-breve`

Landing própria. É o gate de publicação (`COMING_SOON_PUBLICATION`) e **é a única página
servida por `motion-system.css` + `useRevealOnScroll.js`.** ⛔ Não tocar sem pedido
explícito — é o que está no ar.

**Desde 25/08/2026 ela é a chamada do pré-cadastro**, e não mais "aviso de novo site + o
Sweet Awards da Lovers". Oito blocos, rolagem curta, **uma ação só — `Quero participar`
→ `/quero-participar/`**.

⛔ **Desde 25/08/2026 essa ação existe em UM lugar só: a barra presa na base** (pedido do
Eloi). Os três botões que moravam no herói, no fim dos passos e no fecho **saíram**, e a
barra deixou de ser peça de celular para valer em **toda largura**. **Não devolver botão
para dentro das seções**: a página tem uma conversão só, e espalhá-la de novo é a mesma
troca que já foi desfeita — o leitor reencontrar a ação três vezes em vez de ela nunca
sair da tela.

**A barra é a mesma casca da barra de abas do site** (`.scw-casca-base`, §6.10) — chapa
translúcida com desfoque, filete de creme e o mesmo ritmo vertical de 8px. Foi pedido do
Eloi: *"faz tipo como é o menu mobile, integrado, animado"*.

| Peça da barra | Regra |
|---|---|
| Chapa | `.scw-casca-base` — **não** redeclarar cor, desfoque nem `position` aqui |
| Indicador de 3px | é a peça da barra de abas, com **sentido próprio**: lá diz *onde* você está entre cinco destinos, aqui *quanto* da página já leu. `scaleX`, origem à esquerda, **sem transição** (§10.3) |
| Nota "Dois passos rápidos…" | acompanha o botão acima de 760px; **sai** abaixo, onde cada linha a mais é viewport a menos. A informação reaparece dentro do próprio `/quero-participar/`, que numera os passos na tela |
| Botão | `.eb-barra__btn`, tinta **prefixada** em chocolate (§10.1) |
| Altura | `--eb-barra-h`, escrito **no `body`** por `ResizeObserver` |

⛔ **O botão NÃO estica no celular.** Esticado ele vira uma lâmina amarela de ponta a
ponta, e a barra deixa de ler como casca de aplicativo — a barra de abas é **escura com
acentos contidos**, e é com ela que esta peça conversa. Na largura do conteúdo o alvo
ainda passa de 200px, muito acima dos 44px do §6.10.

✅ **A landing entrou no reset do sistema em 25/08/2026, e as duas exclusões caíram.**
Até então `scw-2026.css` a mantinha fora do `box-sizing: border-box` **e** do
`body { margin: 0 }`, por `body:not(.route-em-breve)`. A ressalva foi escrita quando a
página era a de antes — "calibrada em content-box e no ar" —, e a reescrita de 25/08 a
levou para as utilitárias do sistema: a partir dali a exclusão deixou de proteger e passou
a custar. **Não existe mais rota fora do reset**, e ⛔ não se redeclara `box-sizing` dentro
da landing: seria a segunda fonte de verdade do §5.2.

O que a exclusão custava, medido antes e depois nas três larguras:

| Sintoma | Antes | Depois |
|---|---|---|
| `.scw-btn` da barra | **84px** (54 de `min-height` + 30 de padding por cima) | **54px** |
| Controles da galeria | 51px (48 de caixa + 1,5 de borda dos dois lados) | 48px |
| Posição da página | `x = 8`, **16px mais estreita que a viewport** (374 de 390; 1424 de 1440) | `x = 0`, largura cheia |
| Faixas que sangram | uma tira do fundo do `<body>` descendo pelos dois lados | sem tira |
| Barra fixa da ação | 16px **mais larga** que a página (ela se posiciona contra a viewport, não contra o body) | do mesmo tamanho |

⚠️ **A faixa do topo encolheu junto, e isso é a zona de segurança do §6.7** — com
`border-box`, o `min-height` dela passa a **conter** o padding: 132 → 104px no desktop,
104 → 86px no celular. A folga entre o botão "Acesso" e o selo do herói caiu de 78 para
**52px** e continua sobrando. Ao mexer em `.eb-topo`, medir de novo.

⚠️ **O separador do rodapé é um VÃO DE FLEX, não um "·".** O caractere órfa nas duas
pontas e não existe posição que resolva: preso ao texto, a primeira linha terminava nele;
movido para dentro do link, a segunda linha passava a **começar** com ele. O link é
`inline-flex` com 44px de alvo (§10.2), então quebra cedo e a quebra sempre cai ali. O
"·" que é conteúdo continua dentro de "Week · Natal/RN".

⚠️ **O convite é FINITO, e isso é regra, não economia.** A página já tem dois laços
contínuos — o marquee e o gradiente dele —, que é o teto do §6.15. Um pulso permanente na
barra seria o terceiro, e ainda por cima **um que ninguém pode pausar**: diferente da
galeria, não há como parar um botão que pisca. O gesto dispara em **dois momentos e
para** — quando a barra chega, e quando o leitor alcança o fecho, que é onde ele decide.
Voltar ao fecho **não** redispara: insistir deixa de ser convite e vira cutucão.

⚠️ **A altura da barra se MEDE, não se calcula** — é o §10.4-b outra vez. O palpite
"padding + botão" deu 70px; o botão real tem **84px**, e a barra cobria 31px do rodapé e
se sobrepunha ao aviso de cookies **nas três larguras**. Quem escreve `--eb-barra-h` é o
próprio elemento, por `ResizeObserver`, e reescreve quando a fonte carrega, quando a tela
gira e quando a nota entra ou sai no ponto de 760px.

⚠️ **O token mora no `body`, não em `.eb-page`** — quem também precisa dele é o aviso de
cookies, que é peça de casca (§6.10), **irmã** desta página e não filha dela. Ele sobe a
altura da barra: banner de consentimento por cima da única conversão é as duas coisas
piores ao mesmo tempo — esconde a ação e faz o aviso legal parecer estorvo. A regra é
**escopada na rota**, porque o mesmo banner serve as sete e só esta tem barra fixa.

| Bloco | O que é |
|---|---|
| Topo | faixa chocolate com `MARCA_SCW`. O botão "Acesso" **não mora aqui** — vem do `<SiteHeader apenasAcesso>` do `App.jsx` |
| Herói | **grade de duas colunas**: rótulo + H1 + lead + ação à esquerda, a **galeria das 16 edições** à direita |
| Prova | 16 edições · +R$ 712 mil movimentação direta · +34 mil combos · desde 2016 — cada um com ícone. "+120 marcas" saiu em 26/08/2026 (pedido do Eloi): contagem de marca é número pequeno e gera dúvida; entrou o dado comercial (`F.revenue`, mesma fonte de §9.5 e de Apoiar 02), não redigitado |
| Marquee | os 16 temas, em `.scw-marquee` |
| Para quem é | os dez tipos de casa + os três chips do combo (doce · salgado · café) |
| Como funciona | três passos + a ação |
| Fecho | chapa chocolate, a ação e a linha do Instagram |
| Rodapé | **creme**, com a marca da F2 |

#### A galeria das 16 edições — herói reescrito em 25/08/2026

O herói **deixou de ter foto de fundo com texto por cima**. A grade
`repeat(auto-fit, minmax(min(100%,400px), 1fr))` colapsa sozinha, **sem media
query**, e por isso saíram junto: o véu diagonal, os tokens `--hv-*`, a emenda
de três paradas do celular, o `@media (max-width:1000px)` inteiro do herói e a
respiração de 26s (`ebRespira`) — a galeria tem movimento próprio e as duas
competiriam. ⛔ Não recriar nenhum deles: não há mais texto sobre foto, então
não há o que velar.

Quadro 1:1, 16 slides em `flex`, deslocados por **um custom property só**
(`--eb-i`) em vez de dezesseis regras. Cada slide traz foto, véu de **cinco
paradas**, marca da edição, pílula do rótulo e legenda com o vencedor do Melhor
Combo.

⚠️ **A pausa não é conforto, é requisito.** WCAG 2.2.2: movimento automático
acima de 5s que carrega informação tem de ser pausável. Ela para por mouse, por
foco e pelo botão, e **nunca liga** com `prefers-reduced-motion`. É também o que
impede a galeria de ser o **terceiro laço contínuo** da página, acima do teto de
dois (o marquee e o gradiente dele).

⚠️ **O ouvinte de mouse e foco fica no INVÓLUCRO, não no quadro.** O quadro não
tem nada focável dentro — os três botões moram nos controles, abaixo dele —,
então `onFocus` no quadro nunca dispararia e a pausa por teclado seria letra
morta.

⚠️ **A região viva anuncia só a troca MANUAL.** Um `aria-live` disparando a cada
5,2s, para sempre, interromperia a leitura de quem usa leitor de tela a cada
cinco segundos. Os 15 slides fora de vista são `aria-hidden`.

⛔ **Contorno claro no `drop-shadow` da marca, NUNCA chapa atrás dela** — a chapa
foi desenhada, mostrada e recusada. São 16 marcas de cores arbitrárias sobre
fotografia arbitrária, e o caso que quebra é escuro-sobre-escuro (a marca vinho
de Séries sobre uma cortina vinho). ⛔ **Escurecer o véu piora esse caso.**

⚠️ **A prova usa `repeat(4,1fr)` + `repeat(2,1fr)` abaixo de 900px, não
auto-fit.** Qualquer auto-fit desce de 4 para **3** antes de chegar a 2, e o
quarto item fica órfão com dois vãos ao lado — inclusive com o piso de 140px que
o handoff propunha. E **"desde 2016" é palavra, não numeral**: tem escala própria
(`clamp(30px,3.2vw,54px)`) e pode quebrar em duas linhas; na escala dos outros
três ela estoura a coluna e some no `overflow-x: clip`, sem barra que denuncie.

⚠️ **A barra final de `/quero-participar/` não é enfeite** (§10.4-b), e é `<a href>` de
navegador — nunca `navigate()`, nunca `#/`.

🐛 **`editionPhotos()` devolve OBJETO — `{src, alt, position, indice}` —, não
caminho.** Tratá-lo como string produz `url([object Object])`, e o **fallback do
SPA responde 200 com o index.html**: nenhum 404, nenhum erro de console, e a foto
simplesmente não aparece. Custou uma rodada inteira de teste verde com a galeria
em branco. **Status 200 não prova que o asset existe** — a checagem que vale é o
`content-type` da resposta e o `naturalWidth` depois do `onload`. O `alt` e o
ponto focal saem do mesmo objeto: escrever descrição de foto que ninguém viu
seria dado inventado por outro meio (A4).

⚠️ **Não usar backtick dentro do `<style>{\`…\`}`** da página. O CSS mora num
template literal; um backtick num comentário fecha a string e o build morre em
"Expected } but found …", com a linha apontando para o comentário, não para a
causa.

⚠️ **O rodapé é creme, e é decisão de contraste, não de gosto:** a logo da F2 é asset de
cor fixa (`#de1a59`) e sobre chocolate não fecha os 3:1 de elemento gráfico. Sobre creme
fecha. ⛔ Não devolver o rodapé para chocolate sem trocar o asset.

⚠️ **A página saiu da terceira paleta do projeto.** Ela consumia os tokens de
`em-breve.css` — espresso `#2B1810` + ouro `#F8B511`, a identidade do Sweet Awards de
antes do redesign — e agora consome a **paleta viva** (`--scw-*`) e as utilitárias do
sistema. ⛔ `em-breve.css` **continua no ar**: `icons.jsx` e `participants.js` ainda leem
tokens dele (§4.3).

⚠️ **A iconografia v2 entrou, mas ESTÁTICA — e é decisão, não esquecimento.** O
handoff de agosto/2026 pedia ícones que se montam peça por peça, com as props
`movimento`/`aoVivo`/`receita` do `ScwIcon`, as classes `.scw-icone-host--*` e os
tokens `--icon-mo-hover`/`--icon-ease-soft`. **Nada disso existe no repositório:**
o `PATCH-icones-animados.md` que os cria nunca foi aplicado, e a receita "recortar
o `d` em três `path`" exigiria editar `scw-icons-v2.js` à mão, que o §6.11 proíbe.
Os ícones entram pelo `ScwIcon` como está; o movimento fica com o sistema que a
página já tem (`motion-stagger` / `motion-reveal-up`).

⚠️ **Os tamanhos do handoff (18 · 28 · 30 · 34 · 44) NÃO estão na escala** do
§6.11, e `tests/regua-visual.mjs` reprova. Foram encaixados nos degraus reais:
seta de botão e controles **20**, chip **24**, prova e fecho **32**, disco de
passo **48** (os 60% de um disco de 80px, a proporção do §6.3).

⚠️ **A logo da F2 do rodapé NÃO foi trocada, e o handoff estava errado ali.** Ele
afirma que `logo-f2experience.svg` é um lockup claro `#F5F5F5` a 1,06:1; os dois
arquivos em `public/images/` são `#de1a59` na regra `.cls-1`. Só a altura mudou,
de 20px para 24px. É o §12.6 na prática: premissa de patch se confere contra o
código antes de aplicar.

⛔ **O bloco do Sweet Awards saiu, e é remoção de EXIBIÇÃO, não de dado.**
`sweetHistoryStats.js`, `loversAwardsResults.js` e as fotos seguem intactos — só
deixaram de ser importados ali. **Consequência a não esquecer: o resultado oficial da
Lovers deixou de ter endereço público** até o institucional ir ao ar.

