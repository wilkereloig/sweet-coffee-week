# Dados aposentados — fora do bundle

Nada aqui é importado pelo site. O Vite não empacota estes arquivos (ninguém os
importa a partir de `src/main.jsx`). Ficam versionados porque guardam **conteúdo
editorial curado** do festival — apagar destruiria trabalho que não se recupera
derivando de novo das bases oficiais.

Regra: **não importar daqui em código vivo.** Se um dado voltar a ser necessário,
mova o arquivo de volta para `src/data/` e registre no guia visual
(`docs/GUIA-VISUAL.md`).

| Arquivo | O que é | Por que saiu |
| --- | --- | --- |
| `editions.js` | Metadados das edições (ano, nome, slug, etapa) | Superado por `src/data/sweetCoffeeHistory.js`, a base oficial de 16 edições |
| `editionHighlights.js` | Pódio + curadoria de frames "cena" por edição | Da direção **Cinema da Década**, substituída pelo redesign 2026 de Edições |
| `editionInsights.js` | Curiosidades verificadas por edição (máx. 3/edição) | Idem — a página Curiosidades foi descontinuada |
| `decadeCredits.js` | Créditos da década ("A Década em Cartaz") | Idem |
| `homeGalleries.js` | Galerias de fotos da Home por edição | Superado por `src/data/imageLibrary.js` |
| `supportMetrics.js` | Métricas de Instagram para a página Apoiar | Consumido só pelo `MetricsSection.jsx`, removido; os números vivem hoje na própria `Apoiar.jsx` |
| `edicoes-check.mjs` | Teste do layout "Década em Cartaz" | Testava `editionInsights` + `decadeCredits`; nunca esteve em `package.json` |

Todos os dados aqui eram **derivados** das fontes oficiais, que seguem vivas:
`sweetCoffeeHistory.js`, `loversAwardsResults.js`, `participants.js`.
