<!-- Parte das regras do projeto. Índice e regras absolutas: CLAUDE.md da raiz. Movido sem reescrita em 03/10/2026. -->

## 11 · Decisões já testadas e reprovadas

**Não repetir o teste.** Cada linha custou uma rodada.

| Tentativa | Por que caiu |
|---|---|
| Card de 1º lugar do Awards em **4:5 exclusivo** | cortava a foto de forma inconsistente com as outras duas e, em fotos sem espaço vertical de sobra, dava zoom demais. As três fotos sempre 1:1 |
| **Vitrine dos 4 primeiros lugares** no herói do Awards | eram as mesmas quatro fotos que abrem a seção 02 logo abaixo, lá com pódio completo e medalha. O assunto da página contado duas vezes, a primeira pior |
| Barra da galeria de Edições com **5 peças** | três indicadores do mesmo estado ao mesmo tempo. Com 4 páginas por edição, o acesso aleatório dos pontos não pagava a largura |
| **"Como é decidido" com dois cards gêmeos** | escondia que a régua mudou ao longo do tempo |
| Gráfico de "participantes por edição" com pico e recorde | *"parece competição entre edições, isso não deve ocorrer"* |
| Fonte **mono** em rótulos institucionais (rejeitada 2×) | incomoda a face mono, não o caixa-alta |
| **Medalha de 3º em marrom** | ~1,5:1 sobre chocolate |
| Trilho de **1360px** | em tela larga sobrava faixa vazia dos dois lados — *"o site tem que acompanhar as dimensões da tela"* |
| `--sp-section clamp(56px, 11.5vw, 220px)` | inflava ≈440px entre seções em telas largas |
| Duas listas de bullets lado a lado em Apoiar 05 | bolinha de 7px é indicador de item de lista, não de dado |
| `.swa-hero::before`, degradê de 340px do topo | era o mesmo trabalho feito duas vezes — a banda já escurece onde a logo passa |
| Barra de 5px sob o cabeçalho | o herói já é a cor da página |
| Cartão 4:3 + 3 indicadores no herói de Participar/Apoiar | os três números já existiam idênticos na seção `03 Números` |
| Contato sem herói | a página abre com herói compacto desde o redesign 2026 |
| Herói de Participar com formulário integrado e selo girando | herói é rótulo + H1 + lead + duas ações |

---

## 12 · Fluxo Claude Design ⇄ Código

### 12.1 Regra de ouro

**O código é a fonte de verdade.** O Claude Design é onde a mudança é *desenhada*, nunca
onde ela passa a existir. **Nenhum valor visual nasce no Design e fica só lá.**

A sincronização é de mão única: `DesignSync` empurra código → Design. O caminho de volta é
manual, e é sempre um **patch por seletor**.

### 12.2 Divisão de trabalho

| Tipo de mudança | Onde fazer | Por quê |
|---|---|---|
| Layout, grade, hierarquia | **Design** | vê-se na hora, no site real congelado |
| Cor, tipografia, espaçamento | **Design** | os tokens no snapshot são os do site |
| Copy, títulos, textos editoriais | **Design** | edição direta no texto renderizado |
| Novas seções e blocos | **Design** | compor antes de implementar |
| **Movimento, timing, easing** | **Código** | o snapshot congela animação no estado final |
| Comportamento (acordeão, busca, filtro, formulário) | **Código** | snapshot é HTML sem React |
| Dados, contagens, acervo | **Código** | vêm de `src/data/*` |
| Acessibilidade, foco, teclado | **Código** | precisa do DOM real e de teste |

Se a mudança precisar de **layout + movimento** junto: desenhe o estado final no Design,
implemente o layout no código, e só então ajuste o movimento no código.

### 12.3 O ciclo

1. **Sincronize antes de começar.** Mexeu no CSS do site desde o último sync? Rode o
   `DesignSync` — desenhar por cima de snapshot velho gera patch que não aplica.
2. **Trabalhe em `paginas/*.html`.** O CSS embutido é cópia integral de `scw-2026.css` +
   `scw-motion.css`, então os seletores que você mexe são os reais.
3. **Feche o escopo por página.** Um patch por página, não um patch por sessão.
4. **Gere o patch** — seletor, valor antes, valor depois, arquivo destino.
5. **Aplique no código** e rode os testes que o patch listar.
6. **Rode o `DesignSync` de novo.** Fecha o ciclo.

### 12.4 Um arquivo só: o site inteiro

Nada de tela isolada, página de teste ou variação em arquivo próprio. Toda mudança
acontece dentro do **site único**, na seção ou no componente real — inclusive diálogos e
estados. **Duas cópias da mesma tela divergem na primeira rodada seguinte**, e aí o patch
passa a descrever algo que o site não tem.

### 12.5 Template de patch

```md
# PATCH — <página> / <o que mudou>

Origem: `paginas/<pagina>.html`
Destino: `src/styles/scw-2026.css` (+ `src/pages/institutional/<Pagina>.jsx` se houver markup novo)
Branch: `dev/site-completo`

## Alterações de CSS

| Seletor | Propriedade | Antes | Depois |
| --- | --- | --- | --- |

## Markup novo (se houver)
   trecho colável, com as classes já existentes do sistema

## Movimento
Nada aqui — ou: "este bloco precisa entrar com `.scw-reveal`".

Sempre válido: preservar as animações existentes e aplicar o movimento do
sistema às seções novas. Botões chapados, sem sombra.

## Checagens
- [ ] `npm run build`
- [ ] `node tests/redesign-2026.test.mjs`
- [ ] `node tests/responsive.mjs`
- [ ] Contraste AA nos textos tocados
- [ ] `DesignSync` rodado depois de aplicar
```

**O escopo do que vem do Design é visual:** layout, cor, tipografia, espaçamento,
hierarquia, copy, ícones, novas seções. **Não vem lógica, rota, dado nem estado.**

### 12.6 Armadilhas do fluxo

⚠️ **Patches podem ter premissas desatualizadas.** O Design trabalha sobre um snapshot
congelado; o código pode ter mudado desde o último `DesignSync`. **Sempre conferir contra
o estado real do arquivo antes de aplicar — se o patch e o código divergirem, o código
manda, e o patch é ajustado (nunca o contrário).**

⚠️ **Um patch pode contradizer outro da mesma leva.** Já aconteceu: um patch usou
`#D0055B` num token que o patch seguinte, na mesma rodada, removia da paleta. **Antes de
aplicar em sequência, confira se um patch posterior não bane uma cor ou token que um
anterior acabou de introduzir.** Vale ler o patch inteiro — se ele mesmo dá o motivo da
mudança, a lógica interna geralmente aponta qual dos dois valores é o correto.

⚠️ **Não aceitar handoff em prosa ou print.** Sem seletor, a mudança é reinterpretada — e
reinterpretação é como valor redigitado entra no sistema.

⚠️ **Um patch não reescreve arquivo.** Se está grande demais para caber em tabela, o
escopo estava errado: quebre por seção.

⚠️ **O conector do GitHub lê código, não renderiza.** Ele vê `Home.jsx` e `scw-2026.css`,
**não vê a Home**. Para o resultado visual existe o snapshot em `paginas/`.

⚠️ **O snapshot não tem interatividade** (sem React: acordeão, busca, filtros e
formulários ficam no estado inicial), traz **Edições em uma cena só** e **congela o
movimento no estado final** — que é justamente como se edita layout sem lutar com
animação.

### 12.7 Onde buscar cada coisa

| Precisa de | Use |
|---|---|
| Valor exato de token, classe ou medida | conector, direto no `src/styles/` |
| Regra ("posso usar roxo aqui?") | este documento |
| Ver a página como ela é | snapshot `paginas/*.html` |
| Compor com peça existente | cards de componente no projeto de design |

### 12.8 Projetos no Claude Design

| Projeto | ID | O que é |
|---|---|---|
| **Componentes (sync)** | `9e1564b3-a104-4667-8303-4388d9d91d9e` | Design System — **alvo atual do `DesignSync`**, gerado do código real |
| **Redesign 2026** | `b98b740b-4746-4ad5-8074-2ac47d03b4e6` | onde ficam os snapshots `paginas/*.html` e onde as páginas são desenhadas |
| **SITE SCW** | `1bdcc919-8ad5-42d1-b759-cb86fb9da5c0` | project imutável — **hoje consome o DS errado** |

⚠️ **Pendência do Eloi:** reapontar "SITE SCW" para `9e1564b3`. Só dá para fazer na
interface do claude.ai/design. **Enquanto não migrar, qualquer desenho novo nasce na
paleta errada, não importa a instrução colada junto.**

⛔ **Projetos antigos — não usar:** "Sweet & Coffee Week Design System" (paleta terracotta,
`--coral: #E8553A`, componentes `Sticker`/`SideNav`, sem roxo) e o DS handmade
`3f2c7a10-…`. **Sincronizar o sistema atual dentro de qualquer um deles misturaria duas
identidades no mesmo painel** e contaminaria qualquer conversa futura.

---

