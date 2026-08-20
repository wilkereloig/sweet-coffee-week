# Achados — Edições

**8 achados: 0 alta, 2 média, 6 baixa.**

Auditoria de leitura de código (sem build, sem testes, sem edição) contra o checklist de 12 itens da
régua visual (corrigido contra o código real por uma rodada automatizada prévia — `docs/REGUA-VISUAL.md`
não existe no repo), cruzado com `src/pages/institutional/Edicoes.jsx`, `src/styles/scw-edicoes.css` e,
como referência, `src/styles/scw-2026.css` / `src/styles/scw-motion.css` / `src/components/nav.jsx` /
`src/components/scw-icons/scw-icons.js` / `tests/redesign-2026.test.mjs` / `tests/regua-visual.mjs`.

Edições não usa `.scw-raiz` header/footer compartilhado nem `.scw-rotulo` (cabeçalho próprio com a mesma
geometria, `scw-edx__rotulo`/`scw-edx-mob__rotulo` no lugar) — isso é arquitetura intencional (App.jsx,
CLAUDE.md §10) e não entra como achado. Itens 1, 8 e 12 têm cobertura automatizada confirmada por leitura
de `tests/redesign-2026.test.mjs` e `tests/regua-visual.mjs` (paleta fechada, `.scw-btn` chapado, escala
de `ScwIcon`, família `premios` restrita ao Awards, frases proibidas) — não foram recaçados linha a linha.

## Investigação do `<h1>` (achado pré-sinalizado)

As 3 ocorrências literais de `<h1` em `Edicoes.jsx`:

1. **`Edicoes.jsx:391`** — dentro do comentário de bloco que documenta a hierarquia da página ("Hierarquia:
   o `<h1>` da página é o tema da edição; aqui os rótulos são `<h2>`."). Não é código executado, não gera
   nó no DOM.
2. **`Edicoes.jsx:643`** — `<h1 className="scw-edx-mob__tema">{e.tema}</h1>`, dentro do `return` do ramo
   `if (estreito) { ... }` (mobile), que começa na linha 617 e termina na 758.
3. **`Edicoes.jsx:842`** — `<h1 className="scw-edx__tema">{e.tema}</h1>`, dentro do `return` alcançado
   **depois** desse `if` (desktop), linhas 761–974.

**Conclusão: (b) falso alarme.** Não existem 2 `<h1>` simultâneos no DOM. `estreito` é um único booleano de
estado (`React.useState(false)`, avaliado por `window.matchMedia('(max-width: 900px)')` em
`Edicoes.jsx:488-495`) e os dois blocos acima são um `if/return` clássico — **early return**, não
`display:none` sobre dois nós montados ao mesmo tempo. React nunca chega a criar a árvore do ramo não
tomado; quando `estreito` muda, a subárvore antiga desmonta e a nova monta. Isso é estruturalmente
diferente dos 3 bugs de especificidade documentados no CLAUDE.md §17 (que são, de fato, dois nós
simultâneos escondidos por CSS) — aqui não há CSS escondendo nada, é ramificação em JS. Não é o padrão de
acessibilidade real que o achado pré-sinalizado temia.

Efeito colateral notado (não é o achado do h1, registrado à parte na tabela abaixo): como a troca é por
`if/return` e não por CSS, cruzar os 900px remonta a subárvore inteira — perde posição de rolagem interna
da galeria/painel e foco do teclado. Não vira linha própria na tabela por ser uma implicação arquitetural,
não uma divergência de regra da régua.

## Achados

| # | Seletor + arquivo:linha | Item da régua | O que está | O que deveria | Gravidade |
| - | --- | --- | --- | --- | --- |
| 1 | `.scw-gal__pontos button.is-ativo span` — `scw-edicoes.css:234-238` (fundo bege em `scw-edicoes.css:175`; tom em `Edicoes.jsx:99-104`) | 2 | Ponto ativo do carrossel mobile (variante `--par`, barra `background: var(--scw-bege)`) pinta com `var(--scw-edx-tom)`. Contraste calculado (fórmula WCAG): roxo ≈8,96:1 e magenta ≈3,39:1 passam; **cyan ≈2,11:1** (edições 2017.2, 2020.1, 2021.2, 2025) e **amarelo ≈1,37:1** (2018.1, 2019.2, 2022, 2026.1) ficam abaixo do mínimo. | Indicador não-textual de estado precisa 3:1 contra o fundo adjacente (WCAG 1.4.11). 8 das 16 edições falham nesse ponto — mitigado em parte por o ponto ativo também crescer (`scale(1.4)`) e virar opaco (`opacity:1` vs `.4`), mas a cor em si não cumpre a régua. | média |
| 2 | `.scw-edx__meta dt` — `scw-edicoes.css:391-396` — e `.scw-edx__rodape-dica` — `scw-edicoes.css:729-732` | 2 | Rótulos pequenos (10,5px/11,5px, uppercase, peso 800) em creme a 50%/52% de opacidade (`rgba(254,240,221,.5)` / `.52`) sobre o fundo do herói (foto desfocada + véu chocolate 87%) e do rodapé (chocolate sólido). Contraste calculado sobre chocolate liso ≈4,54:1 e ≈4,6:1. | Texto pequeno pede 4,5:1 — passa, mas sem margem nenhuma; sobre a foto real (não lisa) o valor pode variar alguns décimos para baixo. Requer runtime/foto real para confirmar com folga. | baixa |
| 3 | Nav do cabeçalho próprio — `Edicoes.jsx:802-819` (falta `--scw-nav-hover`; comparar `nav.jsx:113-117` e fallback em `scw-2026.css:427`) | 3 | O `<nav>` que Edições monta por conta própria (porque a página não usa o `SiteHeader` compartilhado) passa só `--scw-nav-cor`/`--scw-nav-tinta` no `style` inline — não passa `--scw-nav-hover` como `SiteHeader` faz. | `.scw-nav a:hover { color: var(--scw-nav-hover, var(--scw-amarelo)) }` cai no fallback amarelo. Resultado: passar o mouse no item "apoiar" (também cyan, mesmo `hoverColor()`) dentro da página de Edições mostra amarelo, não o cyan que aparece nas outras 5 páginas. Só esse par de rota+link diverge. | baixa |
| 4 | `@media (max-width: 1080px)` — `scw-edicoes.css:735-738` | 7 | Único breakpoint CSS de Edições fora da escala canônica (1000·900·820·760·420) — comprime a fonte da trilha de 16 anos e esconde a dica do rodapé entre ~901–1080px (a troca mobile/desktop em si é via JS em 900px, `Edicoes.jsx:490`, dentro da escala). | Escala oficial não tem 1080. Pode ser ponto justificado por conteúdo (16 botões de ano cabendo na trilha) — mas não achei comentário registrando esse motivo, e a regra pede não inventar ponto por inércia. | baixa |
| 5 | Página inteira — nenhum `<ScwIcon>` em `Edicoes.jsx` | 9 | A família `topicos` já tem ícones com nome direto para conceitos desta página — `linha-do-tempo`, `ficha-da-edicao`, `participantes`, `historia`, `legado`, `tema-da-edicao` (`src/components/scw-icons/scw-icons.js:97-102,135`) — nenhum é usado; Edições ficou de fora da rodada de ícones. | Sugestão, não erro: `topicos/tema-da-edicao` no rótulo de etapa (`.scw-edx__rotulo`), `topicos/participantes` no botão "Ver participantes", `topicos/linha-do-tempo` na régua/rodapé (que já tem `aria-label="Linha do tempo das edições"` sem ícone algum). Confirmado: os 5 SVGs à mão (SetaEsq/SetaDir/Chevron/XisFechar/Mais) só batem com os já sinalizados (`interface/seta`, `interface/abrir`, `interface/fechar`, `interface/mais`) — nenhuma duplicata nova. | baixa |
| 6 | `.scw-edx-mob__capa-foto` dentro de `@media (prefers-reduced-motion: reduce)` — `scw-edicoes.css:1152` | 10 | Só zera `clip-path`/`transform`, não `animation` — diferente do padrão correto usado 5 linhas abaixo para `.scw-gal__quadro`/`.scw-gal__foto--entra` (`scw-edicoes.css:1157-1158`), que usa `animation: none`. | Como as keyframes (`scwEdxRevelaDir`, `scwEdxKen`) têm `fill-mode: both`, a cascata deixa o valor final da animação (origem "Animation", acima de author normal) vencer o `transform:none`/`clip-path:none` declarado aqui — que na prática nunca se aplica. Sem bug visível hoje (o estado final da animação, `scale(1.001)` e clip-path totalmente revelado, já é visualmente neutro), mas não é determinístico feito assim. | baixa |
| 7 | Listener global de teclado — `Edicoes.jsx:498-511` (fecha o painel via `setPainel(null)` incondicional em `vaiPara`/`passo`, `Edicoes.jsx:472-485`) | 11 | `window.addEventListener('keydown', ...)` só ignora `INPUT/TEXTAREA/SELECT` e alvos dentro de `[data-galeria]`. Não exclui o foco dentro do painel flutuante/sanfona editorial, que pode ter bastante texto rolável (história do festival + marco + curiosidade + legado + lista de curiosidades). | PageUp/PageDown/Home/End/setas são as teclas naturais para rolar esse texto; hoje elas trocam de EDIÇÃO e fecham o painel em vez de rolar, em qualquer lugar da página fora de inputs e da galeria. Rolagem nativa do navegador fica sequestrada globalmente enquanto a página está montada. Requer runtime/leitor de tela para confirmar o alcance exato (como cada AT trata teclas de navegação em modo de exploração), mas a lacuna no código — painel não excluído — é real. | média |
| 8 | `.scw-edx-mob__seta--ant` / `--prox` — `scw-edicoes.css:1091-1104` | 11 | Botões reais, focáveis, `position:fixed`, ~19px pra fora da viewport de propósito (`left:-19px`/`right:-19px`) — peça de convite visual documentada (CLAUDE.md §4.2/§10), não é bug de layout. | Ao tabular até um desses botões, o anel de foco (cyan 3px+3px, herdado do global) fica parcialmente fora da área visível da janela. Não é um erro do padrão em si, mas é um efeito colateral de acessibilidade dele que vale registrar — requer runtime pra confirmar o comportamento exato por navegador/leitor de tela. | baixa |

## Itens conferidos sem achado

- **Item 1 (paleta)** — coberto por `tests/redesign-2026.test.mjs` (varre `Edicoes.jsx` e `scw-edicoes.css`
  linha a linha contra a paleta fechada de 9 cores); leitura própria não achou nada além disso.
- **Item 3 (fundo do herói / selo)** — `--scw-heroi`/`--scw-heroi-tinta` = chocolate/creme em
  `body.route-edicoes` (`scw-2026.css:86`), igual à Home — proposital (foto sangrada), não devia ser cyan.
  Sem barra de 5px em nenhum lugar do arquivo. Não existe "selo" de acento de página nesta hero — no lugar
  dele fica a marca própria de cada edição (`scwEdxSelo`), que é conteúdo editorial, não o selo genérico.
- **Item 4 (tipografia)** — nenhum peso 400/600 na leitura de `scw-edicoes.css`; nenhuma fonte mono;
  numeral "01/16" do contador mobile (`.scw-edx-mob__contagem b`) em `var(--scw-creme)` sobre a foto,
  como manda a regra — não achei um numeral grande equivalente sobre foto crua no desktop (o texto
  "2016 · edição 01" do cabeçalho está sob véu de 87%, quase chocolate liso, e passa contraste calculado).
- **Item 5 (sequência de cor)** — o modelo é "um tom ativo por vez" (`--scw-edx-tom` compartilhado por toda
  a cena da edição corrente), não uma fileira de irmãos cada um com cor própria simultânea — não há
  colisão de adjacência pra checar.
- **Item 6 (grade e trilho)** — cabeçalho, coluna editorial, painéis e rodapé usam `var(--scw-trilho)`
  consistentemente (`scw-edicoes.css:282,286,348,443,604`); `.scw-edx__marcas` (lista de participantes) usa
  `repeat(auto-fill, minmax(210px,1fr))` em vez da fórmula `.scw-grade`, mas é uma lista de texto com
  marcador, não um grid de cards — fora do escopo que o item pede.
- **Item 8 (botões chapados)** — `.scw-edx__botao`/`.scw-edx-mob__sanfona` não usam `.scw-btn` (classe
  própria da página), mas seguem o mesmo espírito: sem `box-shadow`, resposta ao clique por
  `transform: translateY(1px)`.
- **Item 9 (construção do ícone)** — não aplicável: Edições não usa `ScwIcon`, então não há escala nem
  família pra violar (ver achado #5 pela oportunidade).
- **Item 11 (resto)** — anel de foco cyan 3px+3px funciona por herança: `.scw-edx` é filho de `.scw-raiz`
  (via `<main id="conteudo">` em `App.jsx:177-181`), e `scw-edicoes.css` não tem nenhuma regra
  `:focus`/`outline` própria que sobrescreva. Heading não pula nível: h1 (tema) → h2 (`.scw-edx__bloco-rot`,
  vários, mesmo nível, sem h3). Os painéis flutuantes usam `role="region"` (não `dialog`) e não têm
  backdrop — corretamente não prendem foco, o que é o comportamento certo para um painel não-modal.
- **Item 12 (voz)** — coberto por `tests/redesign-2026.test.mjs`/`regua-visual.mjs` (frases proibidas);
  nomenclatura conferida à parte: as únicas ocorrências de "do Sweet" em arquivos de Edições vêm seguidas
  de "& Coffee Week" (nome completo), não "o Sweet" solto.
