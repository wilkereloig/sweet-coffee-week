# Sweet Awards Cerimônia Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finalizar a página Sweet Awards com uma hero humana preparada para o acervo e um carrossel por categoria que fotografa todos os colocados da Lovers 2026.1 sem criar uma grade excessiva.

**Architecture:** Manter `HistoricoAwardsPage` como componente da rota existente. A hero usa um carrossel acessível de slots editoriais; a navegação seleciona uma categoria e `CategoryWinnerCarousel` percorre todos os itens de `scene.winners`. A antiga `WinnerGallery` é removida para que resultados e fotos existam em um único palco.

**Tech Stack:** React + JSX, Vite, CSS inline do componente, dados JavaScript existentes, Node `node:test` para teste estrutural.

## Global Constraints

- A Home/O Festival é a página-mãe; não alterar sua estrutura.
- Usar somente espresso, creme, rosa, amarelo, azul/ciano, coral/vermelho, marrom e vinho.
- Não usar stickers, KV Lovers, embeds sociais ou elementos soltos sem função.
- Não inventar vencedores, fotos ou métricas; cruzar `loversAwardsResults.js` e `sweetCoffeeHistory.js`.
- Preservar empates, trilhas Júri Técnico/Sweet Lovers e fallbacks honestos.
- Manter `#/sweet-awards` e `#/historico-sweet-awards` funcionando.
- Validar desktop/mobile, `prefers-reduced-motion`, teste estrutural e `npm run build`.

### Task 1: Teste estrutural da cerimônia e da galeria

**Files:**
- Create: `tests/sweet-awards-ceremony.test.mjs`

- [ ] **Step 1: Escrever o teste de comportamento esperado**

Verificar que a hero não usa a foto de Melhor Combo, que os slots humanos estão identificados, que `getAwardGallery` preserva as oito categorias com `scenePhoto`, que a faixa de memória existe e que a galeria histórica redundante foi removida.

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run: `node --test tests/sweet-awards-ceremony.test.mjs`
Expected: FAIL porque a hero ainda usa Melhor Combo, a galeria deduplica marcas e os slots humanos ainda não existem.

### Task 2: Implementar hero humana e carrossel de vencedores

**Files:**
- Modify: `src/pages/institutional/HistoricoAwards.jsx`

- [ ] **Step 1: Substituir a mídia da hero**

Criar `HERO_PHOTO_SLOTS`, `ReservedMedia` e `HeroPhotoCarousel`. O carrossel deve ter botões anterior/próximo, contador, foco visível e molduras honestas quando `src` for `null`.

- [ ] **Step 2: Resolver a foto de cada colocado**

Criar `winnerPhoto(scene, winner)`, usando o slug de `resolveParticipant(winner.name)`, arquivos específicos para os 1º lugares repetidos de O Maestro e `main.jpg` para os demais.

- [ ] **Step 3: Renderizar o carrossel da categoria ativa**

Substituir `CategoryChapter` por `CategoryWinnerCarousel`. Usar `scene.winners` sem filtro de colocação, preservar empates como slides separados, mostrar medalha dinâmica, contador e botões “Vencedor anterior”/“Próximo vencedor”.

- [ ] **Step 4: Integrar a memória da cerimônia**

Criar `CEREMONY_PHOTO_SLOTS` e inserir as três molduras dentro de `.swa-context-section`, sem criar uma nova seção independente.

- [ ] **Step 5: Enxugar o arquivo**

Remover `getComboChampionsGallery`, a variável `comboGallery`, o bloco “Campeões de Melhor Combo” e seu CSS sem uso.

- [ ] **Step 6: Remover a galeria duplicada**

Remover `getAwardGallery`, `AwardGalleryCard`, `WinnerGallery`, `.swa-winners-gallery`, `.swa-winner-grid` e a renderização posterior ao palco.

### Task 3: Refinar responsividade, logos e movimento

**Files:**
- Modify: `src/pages/institutional/HistoricoAwards.jsx`

- [ ] **Step 1: Aplicar layout desktop/mobile**

Usar duas colunas no palco a partir de `960px`; abaixo disso, empilhar foto, título e pódio. Os controles devem quebrar ou permitir rolagem estática sem criar navegação sticky complexa.

- [ ] **Step 2: Corrigir proporção das logos**

Manter `object-fit: contain` em toda logo real, com moldura editorial e fallback de monograma.

- [ ] **Step 3: Aplicar movimento com redução respeitada**

Usar apenas opacity/transform para troca de cena, entrada curta do pódio e escala sutil da foto. Sob `prefers-reduced-motion`, remover deslocamento e manter conteúdo imediatamente visível.

### Task 4: Verificação

**Files:**
- Test: `tests/sweet-awards-ceremony.test.mjs`
- Inspect: `src/pages/institutional/HistoricoAwards.jsx`

- [ ] **Step 1: Rodar teste estrutural**

Run: `node --test tests/sweet-awards-ceremony.test.mjs`
Expected: PASS.

- [ ] **Step 2: Validar whitespace e build**

Run: `git diff --check` e `npm run build`.
Expected: sem erros de whitespace; build concluído.

- [ ] **Step 3: Revisar escopo**

Confirmar que somente o componente Awards, seu teste e os dois documentos da tarefa foram adicionados/modificados pela tarefa; WIP anterior permanece intacto.
