// Curiosidades verificadas por edição — cards editoriais da página Edições.
//
// REGRA DO PROJETO: nada inventado. Cada item é rastreável a uma fonte oficial
// do acervo (src/data/sweetCoffeeHistory.js — verdade —, loversAwardsResults.js
// ou editions.js). Edições sem curiosidade verificável ficam de fora (0 cards):
// a ausência é honesta, não vira placeholder. Máx. 3 cards por edição.
//
// NÃO comparar edições entre si nem criar ranking de "maiores/melhores edições"
// (CLAUDE.md §11). Comparações permitidas só entre PARTICIPANTES ou como
// evolução das categorias do Sweet Awards — nunca como tamanho/desempenho de
// uma edição contra outra. Por isso "edição com mais/menos participantes" está
// deliberadamente FORA (o número de participantes já aparece na meta da cena).
//
// Estrutura por item: { title, text, type, value?, source? }
//   type ∈ 'primeira-vez' | 'categoria' | 'acervo' | 'tema' | 'momento'
//   value  — string curta opcional (nº/preço), só quando existe na fonte
//   source — nota interna de rastreabilidade (não é exibida ao público)

export const EDITION_INSIGHTS = {
  '2016': [
    { title: 'Onde tudo começou', text: 'A primeira edição foi um circuito gastronômico, ainda sem premiação.', type: 'primeira-vez', source: 'sweetCoffeeHistory.js 2016 (ordem 1, premiacao.status "nao-teve")' },
  ],
  '2017.1': [
    { title: 'A primeira edição temática', text: 'A Páscoa estreou os temas: foi a primeira edição construída em torno de um tema.', type: 'primeira-vez', source: 'sweetCoffeeHistory.js (2016 tema:null; 2017.1 tema:"Páscoa")' },
  ],
  '2019.1': [
    { title: 'A premiação nasceu aqui', text: 'O Sweet Awards estreou nesta edição, com uma categoria única: Melhor Combo.', type: 'primeira-vez', source: 'sweetCoffeeHistory.js 2019.1 premiacao.observacao; editionHighlights null p/ 2016–2018' },
  ],
  '2019.2': [
    { title: 'Os primeiros parceiros', text: 'Foi a primeira edição a registrar patrocinadores e apoios no acervo.', type: 'acervo', source: 'sweetCoffeeHistory.js 2019.2 patrocinadores.parceiros (5 nomes); anteriores vazias' },
  ],
  '2020.1': [
    { title: 'O Sweet Awards cresceu', text: 'A premiação saltou de uma para sete categorias nesta edição.', type: 'categoria', value: '7 categorias', source: 'sweetCoffeeHistory.js 2020.1 observacao "em 7 categorias" + categorias(7)' },
  ],
  '2020.2': [
    { title: 'Júri e público lado a lado', text: 'Primeira edição a separar duas trilhas de avaliação: Júri Técnico e Sweet Lovers.', type: 'primeira-vez', source: 'sweetCoffeeHistory.js 2020.2 (Melhor Combo trilhas juri_tecnico + sweet_lovers)' },
  ],
  '2021.1': [
    { title: 'Doce, salgado e bebida', text: 'As categorias Melhor Doce, Melhor Salgado e Melhor Bebida entraram no Sweet Awards.', type: 'categoria', source: 'sweetCoffeeHistory.js — categorias ausentes até 2020.2, presentes em 2021.1' },
    { title: 'A única Menção Honrosa', text: 'É a única edição com Menção Honrosa registrada, em Envolvimento e Encantamento em Loja.', type: 'momento', source: 'sweetCoffeeHistory.js 2021.1 premiacao.mencaoHonrosa' },
  ],
  '2021.2': [
    { title: 'Parceria potiguar', text: 'Sebrae/RN e fornecedores locais apoiaram a edição de tema Terras Potiguares.', type: 'acervo', source: 'sweetCoffeeHistory.js 2021.2 parceiros (Sebrae/RN, Cecafés RN, Primar Orgânica, Ybiira, Fazenda Caju)' },
  ],
  '2022': [
    { title: 'Cinema de verdade', text: 'A Moviecom Cinemas entrou como parceira da edição de tema Movies.', type: 'acervo', source: 'sweetCoffeeHistory.js 2022 parceiros (Moviecom Cinemas)' },
  ],
  '2024': [
    { title: 'Parceria literária', text: 'O Book Club Natal foi parceiro temático da edição Books.', type: 'acervo', source: 'sweetCoffeeHistory.js 2024 parceiros ("Book Club Natal")' },
    { title: 'Livraria da Doçura', text: 'A edição Books também ficou conhecida pela atmosfera de Livraria da Doçura.', type: 'tema', source: 'editions.js 2024 desc' },
  ],
  '2026.1': [
    { title: 'Especial de 10 anos', text: 'Edição comemorativa da década: cada marca escolheu um tema antigo para recriar.', type: 'momento', source: 'editions.js 2026.1 etapa "Especial 10 anos"; sweetCoffeeHistory.js conceito' },
    { title: 'Combo de aniversário', text: 'O combo (1 doce + 1 salgado + 1 bebida) saiu a R$ 38,90.', type: 'momento', value: 'R$ 38,90', source: 'sweetCoffeeHistory.js 2026.1 comboValor + formato' },
  ],
}

// Curiosidades de uma edição (0–3). Array vazio quando não há dado verificado.
export function getEditionInsights(code) {
  return EDITION_INSIGHTS[code] || []
}

export default EDITION_INSIGHTS
