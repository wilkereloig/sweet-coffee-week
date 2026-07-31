# Achados — Apoiar

8 achados: 2 alta, 2 média, 4 baixa.

Auditoria visual da página Apoiar (`src/pages/institutional/Apoiar.jsx` +
`src/styles/scw-participar-apoiar.css`, lido por inteiro — arquivo compartilhado
com Participar) contra o checklist de 12 itens da rodada. `scw-2026.css` e
`scw-motion.css` usados só como referência (tokens, componentes de herói,
keyframes). Nenhum arquivo de código foi alterado; nenhum build/teste foi
rodado. Contrastes citados abaixo foram calculados manualmente (luminância
relativa WCAG) a partir dos hex reais do token, não medidos em navegador.

## Itens sem achado (conferidos, sem violação)

- **1 (paleta)** — nenhuma ocorrência de `#B3213B` ou `#E52C4B` em `src/`.
- **3 (cor por página)** — `body.route-apoiar` fecha `--scw-heroi:#01AFCC` /
  `--scw-heroi-tinta:#3D1308` e `--scw-pagina` igual; nenhum resquício de
  "barra de 5px". Em superfície escura o item de menu de Apoiar continua cyan
  (`MENU_ESCURO.apoiar = '#01AFCC'` em `src/components/nav.jsx:32`) — **não**
  virou amarelo à toa; só Awards/Participar trocam, como o CLAUDE.md descreve.
- **8 (botão/foto)** — `.scw-reserva` (scw-2026.css:330) é borda tracejada;
  não é acionada em Apoiar porque as 4 fotos de `ONDE` estão todas
  preenchidas com asset real.
- **9 (iconografia)** — os 4 `ScwIcon` novos (`topicos/alcance`,
  `topicos/onde-aparece`, `topicos/quem-vive`, `topicos/proposta`) existem no
  registro, batem com o rótulo da seção e são decorativos por construção
  (sem prop `titulo` ⇒ `aria-hidden`). Não achei, no acervo de ícones
  existente, nenhum candidato óbvio para a seção "Por que apoiar" — a
  ausência de ícone ali parece razoável, não uma lacuna a preencher.
- **12 (voz)** — sem "Sweet" desacompanhado (sempre "Sweet & Coffee Week",
  "Sweet Awards" ou "Sweet Lovers"); sem linguagem de escassez/urgência.

## Achados

| # | Seletor + arquivo:linha | Item da régua | O que está | O que deveria | Gravidade |
| --- | --- | --- | --- | --- | --- |
| 1 | `.pa-destaque` com `--dest:#01AFCC` — `src/pages/institutional/Apoiar.jsx:391` | 2 (Contraste) | O H2 da seção "Onde aparece" (fundo `--scw-bege` `#F8E4C1`, `Apoiar.jsx:386`) anima a palavra "contato com o público" de chocolate para cyan (`@keyframes scwDestaque`, `scw-2026.css:1183-1188`, `animation-fill-mode: both` — a cor final fica cyan, não volta). Contraste calculado cyan/bege ≈ **2,1:1**. | Não terminar em cyan sobre bege/creme — falha até o mínimo de 3:1 de texto grande. Trocar `--dest` por uma cor que sustente esse fundo (ex.: roxo, marrom, ou manter chocolate) neste destaque específico. | alta |
| 2 | 5 ocorrências de `font: 600 …` — `src/styles/scw-participar-apoiar.css:128, 595, 623, 710, 737` | 4 (Tipografia) | Peso 600 (proibido — só 500/700/800/900) em: `:128` `.pa-hero__rotulos span` (rótulo "@sweetcoffeeweek" do herói); `:595` `.pa-onde ul li` (itens de "Posts e stories" etc. em Onde aparece); `:623` `.pa-quem__lista li` (itens do perfil de público em Quem vive); `:710` `.pa-erro` (erro de campo do formulário); `:737` `.pa-form__status` (status de envio). *Nota: o pedido original citava as linhas 111/556/582/666/693 para este achado — o arquivo mudou desde aquela auditoria automatizada; as linhas acima foram reconferidas por leitura direta do arquivo atual.* | Usar 500 (texto corrido) ou 700/800 (ênfase) — nunca 600. | média |
| 3 | `ONDE[1]` "Cidade e PDV" — `src/pages/institutional/Apoiar.jsx:103`; consumido em `.pa-onde__tag` (`scw-participar-apoiar.css:577`) e `.pa-onde ul li::before` (`:604`) | 5 (Sequência de cor) | O card define `c:'var(--scw-marrom)'` (cor do chip sobre a foto) e `ponto:'var(--scw-magenta)'` (cor dos marcadores da lista) — divergentes. É o único dos 4 cards de "Onde aparece" em que chip e marcador não usam a mesma cor (os outros 3: roxo/roxo, cyan/cyan, amarelo/amarelo). | Se não for proposital, alinhar `ponto` a `c` (marrom/marrom) para manter o padrão de 1 cor por card dos outros 3. | baixa |
| 4 | `.pa-barra` — `src/styles/scw-participar-apoiar.css:799` | 6 (Grade e ritmo) | `padding: 10px clamp(24px, 5vw, 72px);` usa só o termo `clamp()` do trilho, não `var(--scw-trilho)` inteiro (`max(clamp(24px,5vw,72px), calc((100% - 1360px)/2))`, `scw-2026.css:21`). Acima de ≈1504px de viewport o trilho real continua abrindo para manter a coluna de 1360px centralizada, mas o padding da barra fixa trava em 72px — texto/botão da barra deixam de alinhar com a coluna das seções acima. CLAUDE.md lista 1920px entre as larguras testadas do site. | `padding: 10px var(--scw-trilho);` para acompanhar o mesmo trilho do resto da página em telas largas. | média |
| 5 | Herói mobile de Apoiar — `src/styles/scw-participar-apoiar.css:155-166` (≤1000px) e `:817` (≤900px) | 7 (Mobile) | Apoiar/Participar só têm 2 breakpoints próprios no CSS compartilhado: 1000px (herói empilha, `.pa-hero__aside`/`.pa-hero__forma` somem, banda assume) e 900px (`.pa-barra` some para a tab bar). Os demais grids da página (números, "onde aparece", "quem vive") não têm regra própria em 820/390 — dependem de `repeat(auto-fit, minmax(...))` fluido. | Não confirmado como quebrado — mas o reflow fino em 820/390 (corte de texto, overflow) não dá para validar por leitura estática. **Requer runtime.** (`tests/responsive.mjs` não foi rodado — já é achado conhecido/desatualizado.) | baixa |
| 6 | `.scw-hero-banda` (mobile) — `src/styles/scw-2026.css:1041-1048` | 7 (Mobile) | Código atual usa `height: 36vh; min-height: 232px;` (comentário no próprio arquivo: alterado em 30/07/2026 a pedido do Wilke, era 42vh/264px). O `CLAUDE.md` §4.2 ainda documenta "42vh / mínimo 264px". | Não é bug de código — é doc desatualizada (código é a fonte da verdade, por regra do próprio projeto). Vale atualizar o CLAUDE.md na próxima mexida nele, para não confundir a leitura seguinte. | baixa |
| 7 | `.pa-destaque`, `.pa-sucesso button`, `.pa-barra` — `src/styles/scw-participar-apoiar.css:207, 783, 804` | 10 (Movimento) | Três transições/animações com duração fixa fora da escala `--mo-*` (180/300/620/880ms): `:207` `animation: scwDestaque 760ms var(--scw-ease) 240ms both;`; `:783` `transition: background 240ms var(--scw-ease), color 240ms var(--scw-ease);`; `:804` `transition: transform 320ms cubic-bezier(.2,.7,.2,1);`. A curva `var(--scw-ease)` é equivalente a `var(--mo-ease)` (mesmo cubic-bezier — comentário em `scw-motion.css:36`), então o problema é só a duração não vir de um token nomeado. | Trocar os números soltos pelo `var(--mo-rapido\|estado\|entra\|longo)` mais próximo (ex.: 240ms → `--mo-estado`) para ficar rastreável pelo sistema de movimento único. | baixa |
| 8 | `.pa-hero__acoes .scw-btn--contorno-claro` (link "Ver o alcance do festival") — `src/pages/institutional/Apoiar.jsx:282-284`; `.pa-hero` (`scw-participar-apoiar.css:17`) e override de rota (`:82-85`); anel global (`src/styles/scw-2026.css:133`) | 11 (Acesso) | O herói de Apoiar tem fundo `var(--scw-heroi)` = `#01AFCC`. O override de `route-apoiar` para `.scw-btn--contorno-claro` só muda `border-color`/`color` (nunca `background`), então o botão fica transparente sobre o cyan do herói. O anel `:focus-visible` do site é fixo `outline: 3px solid var(--scw-cyan)` — mesmo hex `#01AFCC`. Ao tabular até esse botão o anel cai sobre o próprio fundo cyan do herói: contraste 1:1, anel efetivamente invisível (o botão em si continua legível pela borda/texto chocolate — só o indicador de foco some). | Dar um tratamento de foco dedicado nesse botão em `route-apoiar` (ex.: `outline-color: var(--scw-choco)`) para o indicador não desaparecer justo na página cuja cor é igual à do anel padrão. | alta |
