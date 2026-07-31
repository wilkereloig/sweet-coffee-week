# Achados — Contato

**12 achados: 0 alta, 7 média, 5 baixa.**

Auditoria de leitura de código (sem build, sem testes, sem edição) contra o checklist de 12 itens da
régua visual, cruzado com `src/pages/institutional/Contato.jsx`, `src/styles/scw-contato.css` e, como
referência, `src/styles/scw-2026.css` / `src/styles/scw-motion.css` / `src/data/faqCentral.js`.

**Nota sobre os 5 achados de peso 600 pré-confirmados:** o pedido citava `scw-contato.css:80, :142,
:184, :202, :473`. Lendo o arquivo hoje (confirmado também via grep de `font:\s*600`), as mesmas 5
ocorrências estão em `:97, :160, :204, :223, :494` — o arquivo teve edições depois que o teste
automatizado rodou pela última vez (deslocamento não constante: +17 a +21 linhas, sinal de que os
ajustes aconteceram em vários pontos, não só no topo). As linhas abaixo são as reais, conferidas agora.

| # | Seletor + arquivo:linha | Item da régua | O que está | O que deveria | Gravidade |
| - | --- | --- | --- | --- | --- |
| 1 | `.ctt-abertura__nota` — `scw-contato.css:97` | 4 | `font: 600 14.5px/1.5` — nota de apoio no herói ("A central de dúvidas reúne {TOTAL} respostas..."). | Peso 500, 700, 800 ou 900 — 600 é proibido pela escala tipográfica. | média |
| 2 | `.ctt-busca input` — `scw-contato.css:160` | 4 | `font: 600 15px/1.2` — texto digitado no campo de busca da central de dúvidas. | Peso 500/700/800/900. | média |
| 3 | `.ctt-cat` — `scw-contato.css:204` | 4 | `font: 600 15px/1.2` — rótulo de cada assunto na lista lateral (desktop), estado padrão/inativo. | Peso 500/700/800/900. | média |
| 4 | `.ctt-cat__n` — `scw-contato.css:223` | 4 | `font: 600 12.5px/1` — contador de perguntas ao lado de cada assunto (ex. "9"). | Peso 500/700/800/900. | média |
| 5 | `.ctt-form__aviso` — `scw-contato.css:494` | 4 | `font: 600 14px/1.5` — texto de aviso de erro/validação no formulário de mensagem. | Peso 500/700/800/900. | média |
| 6 | `.ctt-cat__n` — `scw-contato.css:226` | 2 | `color: rgba(106, 44, 21, .6)` (marrom a 60%) sobre fundo creme `#FEF0DD`. Contraste calculado ≈ 3,4:1. Texto real (contador de perguntas), 12,5px, não entra na faixa de "texto grande" mesmo em negrito. | ≥ 4,5:1 para texto pequeno — usar `var(--scw-marrom)` sólido (≈ 9,4:1 sobre creme, pelo mesmo cálculo) ou subir a opacidade. | média |
| 7 | `.ctt-lateral__rotulo` — `scw-contato.css:176` | 2 | `color: rgba(106, 44, 21, .65)` sobre creme — legenda "Assuntos" acima da lista de assuntos, marcada `aria-hidden="true"` (Contato.jsx:267). Contraste calculado ≈ 3,8:1. | ≥ 4,5:1 — `aria-hidden` tira o texto da árvore de acessibilidade, mas não isenta o contraste visual (1.4.3 vale para qualquer texto visível, com ou sem leitor de tela). | baixa |
| 8 | `.ctt-busca input::placeholder` — `scw-contato.css:162` | 2 | `color: rgba(106, 44, 21, .6)` — mesma marrom a 60% no placeholder "Buscar por palavra", única pista visível permanente do campo (o `<label>` não tem texto próprio, só o ícone). Contraste ≈ 3,4:1. | Reforçar para ≥ 4,5:1 já que funciona como rótulo visual do campo. Aplicabilidade estrita do 1.4.3 a placeholder é debatida, por isso severidade baixa — mas mesma causa-raiz do achado #6/#7. | baixa |
| 9 | Comentário de topo — `Contato.jsx:17` | 1 | Comentário do cabeçalho do arquivo diz que a cor da página "(marrom #6A2C15) vem de `body.route-contato` → `--scw-pagina`". O código real (`scw-2026.css:81`) define `--scw-pagina: #F8E4C1` (bege) para essa rota desde o fechamento de paleta de 29/07 — o comentário não foi atualizado quando a cor mudou. | Comentário deveria dizer bege `#F8E4C1`, coerente com CLAUDE.md §3 e com o código real. Risco: comentário desatualizado numa base de código onde IA lê comentário como contexto pode reintroduzir a cor antiga por engano. | média |
| 10 | `.ctt-sec--mensagem` — `scw-contato.css:16` | 6 | `padding: clamp(60px, 6.4vw, 104px) var(--scw-trilho)` — ritmo vertical próprio, levemente diferente do token do sistema `--scw-sec-y` (`clamp(58px, 6vw, 100px)`) usado pelas outras 3 seções da mesma página via `.ctt-sec`. | Usar `var(--scw-sec-y)` como as demais seções, ou registrar em comentário por que a seção Mensagem precisa de 2-4px a mais — o comentário do topo do arquivo (linhas 8-11) só documenta o alinhamento de `.ctt-sec`, não essa exceção. | baixa |
| 11 | `@media (max-width: 560px)` — `scw-contato.css:604` | 7 | Breakpoint em 560px para colapsar o formulário em 1 coluna — fora da escala canônica do redesign (1000·900·820·760·420); 560px era um valor da escala antiga (pré-redesign, §17 do CLAUDE.md). Não há comentário justificando o valor. | Confirmar se é decisão de conteúdo (e registrar por quê) ou resquício da escala antiga — pelo cálculo de largura disponível em 560px (≈219px por coluna), 420px provavelmente também funcionaria. Requer runtime para decidir com segurança. | baixa |
| 12 | `.ctt-pill--roxo` / `--choco` / `--cyan` — `scw-contato.css:425-427` | 5 | Os 3 selos da seção Caminhos (Estabelecimentos/Empresas/Imprensa) usam roxo, chocolate (tinta) e cyan. Não repetem cor entre si, mas "chocolate" não é uma das 6 cores do ciclo de irmãos (`amarelo → cyan → magenta → roxo → laranja → marrom`) — é a tinta de texto, usada aqui como cor de selo. | Se a intenção é seguir o ciclo, trocar `var(--scw-choco)` por uma cor do ciclo ainda não usada no trio (ex. marrom ou amarelo); se é decisão deliberada (chocolate como "neutro"), vale registrar a exceção perto da regra do ciclo. | baixa |

## Itens conferidos sem achado

Para deixar claro o que foi checado e passou, sem inflar a tabela acima com linhas "ok":

- **Item 1 (paleta)** — nenhum hex fora da tabela em `scw-contato.css` (todo `rgba()` decompõe para choco/marrom/creme já na paleta); `--scw-pagina`/`--scw-pagina-sobre-creme` usados corretamente no CSS (só o comentário do achado #9 ficou para trás).
- **Item 3 (cor por página)** — hero compacta usa `--scw-heroi`/`--scw-heroi-tinta` = bege/choco corretamente; nenhum resquício de barra de 5px no arquivo da página.
- **Item 7 (chips e toque)** — `.ctt-cats > li { flex: 0 0 auto }` presente (scw-contato.css:189); `.ctt-busca input { min-height: 44px }` sob `@media (max-width: 900px)` presente (scw-contato.css:166-168) — o bug antigo de alvo de toque não regrediu. Todos os demais controles interativos da página têm `min-height` ≥ 44px.
- **Item 9 (iconografia)** — os 3 `ScwIcon` novos (`topicos/duvidas`, `topicos/caminhos`, `topicos/mensagem`) existem no registro e o desenho de cada um (balão de pergunta, caminhos se separando, avião de papel) bate com o rótulo ao lado; tamanho 16 está na escala permitida. Os 6 SVGs desenhados à mão (seta, Instagram, busca, fechar, chevron, checkmark) batem com ícones já existentes no registro (`interface/seta`, `redes/instagram`, `mecanica/buscar`, `interface/fechar`) — confirma a duplicação já sinalizada em outra tarefa; nenhuma duplicata NOVA encontrada.
- **Item 10 (movimento)** — tokens conferem com scw-2026.css/scw-motion.css. `Contato.jsx` não tem `data-mo` manual, mas isso é esperado: `useSiteMotion.js` varre o DOM automaticamente (headings, `p`, grids, `form`) e exclui `.ctt-abertura` (hero, animada por `@keyframes` fixo) e `.ctt-perguntas`/`.ctt-cats` (listas longas, ficam sem stagger de propósito — comentário do próprio hook cita a central de 93 perguntas).
- **Item 11 (acesso)** — 1 único `<h1>` na página; hierarquia h1→h2 (Dúvidas/Caminhos/Mensagem)→h3 (categoria ativa + cada pergunta) sem pular nível; cada pergunta tem `aria-expanded`/`aria-controls` no botão e `role="region"`/`aria-labelledby` no painel (Contato.jsx:312-334); estado de sucesso usa `role="status"`, erro usa `role="alert"`; anel de foco herdado do global (`scw-2026.css`), sem override local.
- **Item 12 (voz)** — sem "o Sweet" solto, sem clichê de escassez; nomenclatura "Sweet & Coffee Week" completa na única ocorrência.
- **Item 6 (creme→bege→creme)** — confirmado: Dúvidas creme, Caminhos bege, Mensagem creme.
- **Item 8 (botões chapados)** — nenhum `box-shadow` em botão desta página (o único `box-shadow` do arquivo é em `.ctt-item.is-aberta`, um card, não um botão). Página não tem slot de foto opcional além do herói (que sempre tem foto real via `heroPhoto('contato')`), então o placeholder tracejado não se aplica aqui.

**Não confirmado por leitura (requer runtime):** contraste exato de `.ctt-abertura__nota`/`.ctt-abertura__lead`
(texto choco a 80-84% sobre véu translúcido em cima de foto real) — a lógica é a mesma dos achados
#6-8 (opacidade reduzindo contraste), mas aqui há duas camadas translúcidas sobre uma foto real, o que
impede calcular um número exato por leitura estática. Risco baixo (choco é quase preto), mas fica como
ponto para conferência visual.
