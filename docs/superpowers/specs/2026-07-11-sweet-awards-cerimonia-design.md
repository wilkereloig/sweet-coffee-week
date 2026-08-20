# Sweet Awards: Cerimônia Lovers 2026.1

## Objetivo

Transformar a página `#/sweet-awards` em uma experiência de premiação centrada na edição Sweet & Coffee Week Lovers 2026.1. O visitante deve descobrir os vencedores atuais primeiro; o histórico deve funcionar como arquivo secundário, sem competir com a edição em destaque.

## Direção visual

- Identidade institucional do festival: espresso, creme e dourado de medalha.
- Usar fotos reais dos combos vencedores da Lovers 2026.1.
- A hero não destaca uma categoria ou marca específica: sua mídia é um carrossel de pessoas, público e participantes.
- Enquanto as fotos humanas não estiverem no acervo, mostrar molduras editoriais identificadas com o enquadramento necessário, sem usar fotos de combo como substituição.
- Não usar o KV Lovers, stickers, embeds sociais ou ornamentos sem função.
- O título abre a hero diretamente, sem eyebrow.
- Logos reais usam proporção preservada; fallback de monograma quando a logo não existir.

## Experiência

1. Hero de cerimônia: apresenta `Sweet Awards Lovers 2026.1`, conduz para os resultados e reserva três slides para público, marcas e foto coletiva.
2. Capítulos de categorias: uma categoria ativa por vez, com foto, vencedor e pódio completo. O usuário navega por botões acessíveis; não há autoplay na troca dos resultados.
3. Carrossel de vencedores por categoria: a navegação superior mantém as oito categorias, mas apenas uma categoria aparece por vez. Dentro do palco ativo, setas percorrem todos os 1º, 2º e 3º lugares; marcas empatadas recebem slides separados com a mesma colocação. Cada slide usa a foto real do combo daquela marca.
4. Não existe uma galeria adicional em grade: o carrossel do palco é a única apresentação visual dos resultados atuais, evitando repetição e excesso de cards.
5. Contexto curto: explica o papel do Sweet Awards e incorpora três molduras para bastidores, entrega dos prêmios e celebração dos vencedores.
6. Arquivo histórico: recordes, evolução e acordeões das edições anteriores ficam depois da premiação atual. Não repetir uma segunda galeria de campeões antes dos acordeões.
7. CTA final único para conhecer as edições do festival.

## Dados

- Premiação atual: `src/data/loversAwardsResults.js`, exposta por `getCurrentEditionScenes()`.
- Histórico: `src/data/sweetCoffeeHistory.js` via `sweetEditionsCompat.js`.
- Logos: `resolveParticipant`.
- Fotos: `winnerPhoto(scene, winner)` resolve a foto pelo slug do participante. Para os 1º lugares repetidos de O Maestro, Melhor Salgado e Melhor Criatividade usam arquivos próprios; os demais colocados usam `main.jpg` da marca.
- Slots humanos: manter constantes explícitas com `src: null`, rótulo editorial e caminho futuro sob `/images/awards/lovers-2026-1/`.
- Empates e trilhas de avaliação devem continuar preservados.

## Responsividade e acessibilidade

- Desktop: palco dividido entre foto dominante e resultado da categoria, com navegação compacta de capítulos.
- Desktop: um único palco de categoria em duas colunas, com foto do combo e dados do colocado ativo; molduras de memória integradas ao contexto.
- Mobile: foto, categoria e pódio empilhados; controles tocáveis e sem overflow lateral obrigatório.
- Mobile: carrossel e molduras empilhados, com controles tocáveis, contador e leitura clara das colocações.
- Botões têm `aria-label`, `aria-current`/estado equivalente e foco visível.
- Sem conteúdo dependente de animação para aparecer.
- `prefers-reduced-motion` remove deslocamentos e mantém transições instantâneas.

## Fora de escopo

- Não alterar Home, rotas, fontes de dados ou página Lovers.
- Não criar um segundo componente Sweet Awards.
- Não alterar a publicação `COMING_SOON_PUBLICATION` nem flags de produção.
