# Fluxo Claude Design ⇄ Claude Code

Complementa a seção 18 do `docs/GUIA-VISUAL.md`.

## Regra de ouro

O **código é a fonte de verdade**. O Claude Design é onde a mudança é *desenhada*,
nunca onde ela passa a existir. Nenhum valor visual nasce no Design e fica só lá.

A sincronização é de mão única: `DesignSync` empurra código → Design. O caminho de
volta é manual, e é sempre um **patch por seletor** (ver template abaixo).

## Sequência de cards nunca repete cor

Regra permanente, vale para toda fileira, grade ou lista de irmãos (cards, passos,
métricas, discos de ícone, pills, painéis): **cada item recebe uma cor diferente da
paleta, na ordem**, e a sequência só volta ao começo depois de esgotar as cores
disponíveis para aquele fundo. Dois irmãos com a mesma cor é defeito, não economia.

O ciclo canônico é `amarelo → cyan → magenta → roxo → laranja → marrom`.

**Mas nem toda cor serve de tinta em todo fundo.** Antes de aplicar o ciclo, filtre pelo
fundo (medidas reais, texto grande = 3:1, texto pequeno = 4,5:1):

| Fundo | Tintas que passam | Reprovam |
| --- | --- | --- |
| creme `#FEF0DD` | chocolate 12:1 · marrom 6,9:1 · roxo 6,7:1 · magenta 3,8:1¹ · laranja 3,0:1¹ | cyan 2,2 · amarelo 1,4 |
| bege `#F8E4C1` | chocolate 13:1 · marrom 6,3:1 · roxo 6,0:1 · magenta 3,4:1¹ | laranja 2,7 · cyan 2,1 · amarelo 1,4 |
| chocolate `#3D1308` | creme 12:1 · bege 13:1 · amarelo 9,5:1 · cyan 4,9:1 · laranja 4,8:1 | magenta 3,8¹ · roxo 1,45 · **marrom não sustenta** (~1,5:1 — os dois são marrons escuros próximos) |
| roxo `#4D257E` | creme 10:1 · bege 8,9:1 · amarelo 6,5:1 · cyan 4,3:1¹ | magenta · laranja · chocolate |
| cyan `#01AFCC` | chocolate 5,6:1 | creme 2,3 · amarelo 1,6 |
| magenta `#F10767` | — nenhuma tinta passa em texto pequeno | creme 3,8¹ · chocolate 3,8¹ |

¹ só a partir de 18,66px em peso 700+ (ou 24px normal), onde o mínimo cai para 3:1.

⚠️ **Marrom (`--scw-marrom`) nunca é fundo de emblema/badge com numeral chocolate** —
foi cogitado como cor do 3º lugar no pódio do Sweet Awards e descartado por isso:
marrom sobre chocolate falha tanto como emblema quanto como texto solto (Hall tem
fundo chocolate). A medalha de 3º lugar usa **laranja**, não marrom.

**Quando o fundo não oferece cores suficientes**, não force a tinta: mova a cor para o
grafismo. É o padrão `StatBlock` do design system — **régua pop de 4px acima do número**.
O numeral fica numa tinta legível (chocolate) e a régua carrega a cor própria do card:

```html
<span aria-hidden="true" class="scw-stat__regua" style="background:#FDBB1A"></span>
```

Assim as faixas de seis métricas sobre bege — onde só quatro tintas passam — têm seis
cores distintas sem nenhuma falha de contraste. Vale o mesmo raciocínio para disco de
ícone (a cor vai no disco, o traço fica chocolate ou creme conforme o fundo do disco),
pill, selo de canto e filete.

## Toda mudança feita no Design vira patch — sem exceção

Nada de "depois eu conto o que mudou". Ao fim de cada rodada no Design, o registro
sai junto: um `PATCH-*.md` com seletor, valor antes, valor depois e arquivo destino.
Mudança sem patch é mudança perdida — o Design não volta para o código sozinho.

**O escopo do que vem do Design é visual:** layout, cor, tipografia, espaçamento,
hierarquia, copy, ícones, novas seções. Não vem lógica, rota, dado nem estado.

**Patches podem ter premissas desatualizadas.** O Design trabalha sobre um snapshot
congelado; o código pode ter mudado desde o último `DesignSync`, ou dois patches da
mesma rodada podem se contradizer entre si (ex.: um patch introduz uma cor que outro
patch da mesma leva bane da paleta). Aplicar cegamente sem checar contra o código atual
reintroduz o problema que o patch tentava resolver. Sempre conferir contra o estado real
do arquivo antes de aplicar — se o patch e o código divergirem, o código manda, e o
patch é ajustado (nunca o contrário).

## O Claude Code preserva o movimento que já existe

Regra permanente, válida para todo patch:

1. **Não remover nem reescrever animação existente** ao aplicar um patch visual. O
   `scw-motion.css` é dono do movimento; um patch de layout não o toca a menos que
   diga explicitamente que toca.
2. **Seção ou página nova herda o movimento do sistema** — revelação no scroll
   (`.scw-reveal`), cascata dos filhos, press dos botões, `is-rolado` no cabeçalho,
   zoom lento nas fotos. Componente novo sem movimento é componente incompleto.
3. **Nada de curva ou duração nova.** Usar os tokens `--mo-*` que já existem. Se o
   patch pedir um tempo que não está no sistema, o certo é perguntar, não inventar.
4. **Botões são chapados** (jul/2026): sem `box-shadow`. O clique responde com
   deslocamento (`hover` sobe 2px, `active` volta). Patch que trouxer sombra em botão
   está desatualizado — ignore a sombra e mantenha o chapado.
5. **`prefers-reduced-motion` sempre**: todo movimento novo entra com a saída de
   emergência já escrita.

## Um arquivo só: o site inteiro

Nada de tela isolada, página de teste ou variação em arquivo próprio. Toda mudança
acontece dentro do **site único** (`Site Sweet Coffee Week.dc.html`), na seção ou no
componente real — inclusive diálogos e estados. Duas cópias da mesma tela divergem na
primeira rodada seguinte, e aí o patch passa a descrever algo que o site não tem.

## Divisão de trabalho

| Tipo de mudança | Onde fazer | Por quê |
| --- | --- | --- |
| Layout, grade, hierarquia | **Design** | Vê-se na hora, no site real congelado |
| Cor, tipografia, espaçamento | **Design** | Os tokens no snapshot são os do site |
| Copy, títulos, textos editoriais | **Design** | Edição direta no texto renderizado |
| Novas seções / novos blocos | **Design** | Compor antes de implementar |
| **Movimento, timing, easing** | **Código** | O snapshot congela animação no estado final |
| Comportamento (acordeão, busca, filtro, form) | **Código** | Snapshot é HTML sem React |
| Dados, contagens, acervo | **Código** | Vêm de `src/data/*` |
| Acessibilidade, foco, teclado | **Código** | Precisa do DOM real e de teste |

Se a mudança precisar de *layout + movimento* junto: desenhe o estado final no
Design, implemente o layout no código, e só então ajuste o movimento no código.

## O ciclo, passo a passo

1. **Sincronize antes de começar.** Mexeu no CSS do site desde o último sync?
   Rode o `DesignSync` — desenhar por cima de snapshot velho gera patch que não aplica.
2. **Trabalhe em `paginas/*.html`** no projeto *Redesign 2026*
   (`b98b740b-4746-4ad5-8074-2ac47d03b4e6`). O CSS embutido é cópia integral de
   `scw-2026.css` + `scw-motion.css`, então os seletores que você mexe são os reais.
3. **Feche o escopo por página.** Um patch por página, não um patch por sessão.
4. **Gere o patch** no formato abaixo — seletor, valor antes, valor depois, arquivo destino.
5. **Aplique no Claude Code** e rode os testes que o patch listar.
6. **Rode o `DesignSync` de novo.** Fecha o ciclo; o Design volta a espelhar o site.

## Template de patch (Design → Código)

```md
# PATCH — <página> / <o que mudou>

Origem: projeto Redesign 2026, `paginas/<pagina>.html`
Destino: `src/styles/scw-2026.css` (+ `src/pages/institutional/<Pagina>.jsx` se houver markup novo)
Branch: `dev/site-completo`

## Alterações de CSS

| Seletor | Propriedade | Antes | Depois |
| --- | --- | --- | --- |
| `.scw-hero__title` | `font-size` | `clamp(...)` | `clamp(...)` |

## Markup novo (se houver)

```jsx
// trecho colável, com as classes já existentes do sistema
```

## Movimento

Nada aqui — ou: "este bloco precisa entrar com `.scw-reveal`, ver `scw-motion.css`".

**Sempre válido:** preservar as animações existentes e aplicar o movimento do sistema
às seções novas deste patch. Botões chapados, sem sombra.

## Checagens

- [ ] `npm run build`
- [ ] `node tests/redesign-2026.test.mjs`
- [ ] `node tests/responsive.mjs` (390 / 768 / 1440)
- [ ] Contraste AA nos textos tocados
- [ ] `DesignSync` rodado depois de aplicar
```

## Armadilhas

- **Não mexer no design system anterior.** O projeto "Sweet & Coffee Week Design System"
  (terracotta, `--coral: #E8553A`, sem roxo) é arquivo do sistema antigo — vale só para
  `/pesquisa` e os painéis internos. Misturar as duas identidades contamina qualquer
  conversa futura.
- **Branch:** ler e aplicar sempre em `dev/site-completo`. `master` fica para trás.
- **Não aceitar handoff em prosa ou print.** Sem seletor, a mudança é reinterpretada — e
  reinterpretação é como valor redigitado entra no sistema.
- **Um patch não reescreve arquivo.** Se o patch está grande demais para caber em tabela,
  o escopo estava errado: quebre por seção.
- **Um patch pode contradizer outro da mesma leva.** Antes de aplicar em sequência,
  confira se um patch posterior não bane uma cor/token que um patch anterior acabou de
  introduzir (aconteceu em 29/07/2026: um patch usou `#D0055B` num token que o patch
  seguinte, na mesma rodada, remove da paleta). Vale a leitura completa do próprio patch
  — se ele mesmo já dá o motivo da mudança, a lógica interna geralmente aponta qual dos
  dois valores é o correto.
