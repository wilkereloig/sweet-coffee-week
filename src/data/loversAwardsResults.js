// Resultado oficial da Premiação — 16ª edição do Sweet & Coffee Week
// Edição: Sweet & Coffee Week Lovers 2026.1
// Estrutura compatível com a base histórica: categoria -> trilha -> colocacoes.
// Empates permanecem na mesma posição, com mais de um nome no array `nomes`.

export const LOVERS_2026_AWARDS_RESULTS = {
  id: '2026.1',
  ordem: 16,
  edicao: 'Sweet & Coffee Week Lovers',
  tema: 'Lovers',
  trilhaPadrao: 'sweet_lovers',
  premiacao: {
    status: 'completa',
    observacao: 'Resultado oficial da Premiação da 16ª edição do Sweet & Coffee Week Lovers.',
    categorias: [
      {
        categoria: 'Melhor Combo',
        key: 'melhor_combo',
        trilha: 'sweet_lovers',
        colocacoes: [
          { pos: 1, pontos: null, nomes: ['O Maestro Café'] },
          { pos: 2, pontos: null, nomes: ['Mr. Cupcake Confeitaria'] },
          { pos: 3, pontos: null, nomes: ['Jolie Café Pâtisserie'] },
        ],
      },
      {
        categoria: 'Melhor Atendimento',
        key: 'atendimento',
        trilha: 'sweet_lovers',
        colocacoes: [
          { pos: 1, pontos: 5, nomes: ['Rollab Confeitaria'] },
          { pos: 2, pontos: 3, nomes: ['O Maestro Café'] },
          { pos: 3, pontos: 1, nomes: ['Jolie Café Pâtisserie'] },
        ],
      },
      {
        categoria: 'Melhor Apresentação',
        key: 'apresentacao',
        trilha: 'sweet_lovers',
        colocacoes: [
          { pos: 1, pontos: 5, nomes: ['Just Food&Coffee'] },
          { pos: 2, pontos: 3, nomes: ['Mr. Cupcake Confeitaria'] },
          { pos: 3, pontos: 2, nomes: ['Paneer Pâtisserie'] },
        ],
      },
      {
        categoria: 'Melhor Doce',
        key: 'doce',
        trilha: 'sweet_lovers',
        colocacoes: [
          { pos: 1, pontos: 5, nomes: ['Jolie Café Pâtisserie'] },
          { pos: 2, pontos: 3, nomes: ['Douce di Maria'] },
          { pos: 3, pontos: 1, nomes: ['Parma Doces', 'Bolomania'] },
        ],
      },
      {
        categoria: 'Melhor Bebida',
        key: 'bebida',
        trilha: 'sweet_lovers',
        colocacoes: [
          { pos: 1, pontos: 5, nomes: ['Sweet Duo Confeitaria'] },
          { pos: 2, pontos: 3, nomes: ['Canuto’s', 'Casa 1190 - Restaurant e Coffee'] },
          { pos: 3, pontos: 1, nomes: ['Mr. Cupcake Confeitaria'] },
        ],
      },
      {
        categoria: 'Melhor Salgado',
        key: 'salgado',
        trilha: 'sweet_lovers',
        colocacoes: [
          { pos: 1, pontos: 5, nomes: ['O Maestro Café'] },
          { pos: 2, pontos: 3, nomes: ['Bolomania'] },
          { pos: 3, pontos: 1, nomes: ['Casa 1190 - Restaurant e Coffee'] },
        ],
      },
      {
        categoria: 'Melhor Criatividade',
        key: 'criatividade',
        trilha: 'sweet_lovers',
        colocacoes: [
          { pos: 1, pontos: 5, nomes: ['O Maestro Café'] },
          { pos: 2, pontos: 3, nomes: ['Mr. Cupcake Confeitaria'] },
          { pos: 3, pontos: 1, nomes: ['Bolomania'] },
        ],
      },
      {
        categoria: 'Encantamento em Loja',
        key: 'envolvimento',
        trilha: 'sweet_lovers',
        colocacoes: [
          { pos: 1, pontos: 5, nomes: ['Mr. Cupcake Confeitaria'] },
          { pos: 2, pontos: 3, nomes: ['Jolie Café Pâtisserie', 'O Maestro Café'] },
          { pos: 3, pontos: 1, nomes: ['Just Food&Coffee'] },
        ],
      },
    ],
  },
}

export default LOVERS_2026_AWARDS_RESULTS
