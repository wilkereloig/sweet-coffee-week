/*
 * Edições — identidade editorial das 16 cenas e textos de interface da página.
 *
 * Aqui só mora o que é EDITORIAL: o tema como a página o apresenta, a etapa
 * (a frase curta do selo), as palavras-chave e o ícone de cada cena. Dado
 * histórico (período, marcas, premiação, fotos) continua vindo das fontes de
 * sempre — src/data/handoff/edicoesData.js e src/data/imageLibrary.js — e o
 * texto longo (lead, marco, curiosidade, legado) de src/data/edicoesNarrativa.js.
 *
 * Ícone: um por edição, o assunto da edição num símbolo (desenho de
 * 20/08/2026), conferido contra as chaves de SCW_ICONS.
 */
export const CENAS = [
  { code: '2016', tema: 'Início', etapa: 'A estreia', icone: 'bebidas/espresso',
    palavras: ['Xícara', 'Vitrine', 'Bolo', 'Balcão de cafeteria'] },
  { code: '2017.1', tema: 'Páscoa', etapa: 'Chocolate e presente', icone: 'doces/chocolate',
    palavras: ['Ovos', 'Coelhos', 'Chocolate derretido', 'Cestas'] },
  { code: '2017.2', tema: 'Doces do Mundo', etapa: 'Viagem gastronômica', icone: 'mapa/mapa',
    palavras: ['Globo', 'Mala', 'Passaporte', 'Mapas'] },
  { code: '2018.1', tema: 'Namorados', etapa: 'Afeto à mesa', icone: 'marca/coracao',
    palavras: ['Corações', 'Mesa para dois', 'Envelopes', 'Fitas'] },
  { code: '2018.2', tema: 'Sabores da Infância', etapa: 'Memória afetiva', icone: 'doces/paleta',
    palavras: ['Lancheira', 'Pirulito', 'Brinquedos', 'Bolo de vó'] },
  { code: '2019.1', tema: 'Pâtisserie Francesa', etapa: 'Técnica e elegância', icone: 'doces/croissant',
    palavras: ['Croissant', 'Éclair', 'Macaron', 'Vitrine francesa'] },
  { code: '2019.2', tema: 'Contos de Fadas', etapa: 'Imaginação', icone: 'marca/estrela',
    palavras: ['Castelos', 'Coroas', 'Livros mágicos', 'Estrelas'] },
  { code: '2020.1', tema: 'No Ritmo da Música', etapa: 'Trilha sonora', icone: 'topicos/alcance',
    palavras: ['Vinil', 'Microfone', 'Notas musicais', 'Palco'] },
  { code: '2020.2', tema: 'Heróis & Vilões', etapa: 'Cultura pop', icone: 'simbolos/destaque',
    palavras: ['Máscaras', 'Capas', 'Raios', 'Emblemas'] },
  { code: '2021.1', tema: 'Séries', etapa: 'Maratona de sabores', icone: 'topicos/video',
    palavras: ['Tela', 'Botão play', 'Sofá', 'Pipoca'] },
  { code: '2021.2', tema: 'Terras Potiguares', etapa: 'Identidade local', icone: 'mapa/ponto',
    palavras: ['Caju', 'Castanha', 'Queijo coalho', 'Dunas'] },
  { code: '2022', tema: 'Movies', etapa: 'Cinema', icone: 'mecanica/voucher',
    palavras: ['Claquete', 'Ingresso', 'Projetor', 'Rolo de filme'] },
  { code: '2023', tema: 'Trip', etapa: 'Rota pelo mundo', icone: 'mapa/trajeto',
    palavras: ['Mala', 'Avião', 'Bússola', 'Postal'] },
  { code: '2024', tema: 'Books', etapa: 'Literatura e café', icone: 'mecanica/guia',
    palavras: ['Livro aberto', 'Marcador', 'Pena', 'Biblioteca'] },
  { code: '2025', tema: 'Celebration', etapa: 'Festa e rito', icone: 'doces/bolo',
    palavras: ['Confete', 'Balões', 'Convite', 'Bandeirinhas'] },
  { code: '2026.1', tema: 'Lovers', etapa: 'Especial 10 anos', icone: 'simbolos/sweet-lovers',
    palavras: ['Stickers', 'Mapa', 'Câmera', 'Corações'] },
]

/* Acento por edição, rodando pela paleta. Cada tom leva a tinta que passa AA
   SOBRE ele (`tinta`) e a cor que ele assume como TEXTO sobre o chocolate
   (`txt`). Até 12/10/2026 o segundo tom era magenta — e creme sobre magenta dá
   3,8:1, que reprova no texto pequeno da pill, do botão e da sanfona (§6.3).
   Entrou o laranja da própria página: chocolate sobre ele dá 4,78:1, e ele
   mesmo passa como texto no escuro. Roxo sobre chocolate dá 1,45:1, por isso o
   texto dele cai no creme. */
export const TONS = [
  { cor: 'var(--scw-roxo)',    tinta: 'var(--scw-creme)', txt: 'var(--scw-creme)' },
  { cor: 'var(--scw-laranja)', tinta: 'var(--scw-choco)', txt: 'var(--scw-laranja)' },
  { cor: 'var(--scw-cyan)',    tinta: 'var(--scw-choco)', txt: 'var(--scw-cyan)' },
  { cor: 'var(--scw-amarelo)', tinta: 'var(--scw-choco)', txt: 'var(--scw-amarelo)' },
]

export const PREMIACAO = {
  'nao-teve': 'Sem premiação',
  'nao-encontrada': 'Sem registro disponível',
  completa: 'Premiação registrada',
  completa_em_publicacoes_oficiais: 'Premiação registrada',
  parcial: 'Premiação parcial',
}

/* Textos de interface. Nada aqui é dado do festival. */
export const TEXTOS = {
  rotuloPagina: 'Edições do Sweet & Coffee Week',
  linhaDoTempo: 'Linha do tempo das edições',
  dica: '← → trocam de edição · clique num ano ou arraste a cena',
  galeriaPendente: 'Galeria pendente',
  fotoPendente: 'Foto pendente',
  marcaPendente: 'Marca pendente',
  marcasPendentes: 'Lista de participantes pendente.',
  /* O acervo não identifica qual foto é de qual marca (2016–2025): a galeria é
     o registro da EDIÇÃO, e a lista de marcas segue textual. Dizer isso evita
     que alguém leia a foto como sendo de uma casa da lista. */
  notaFotos: 'As fotos são registros da edição e não identificam a marca de cada combo.',
  editorialAbertura: 'A história do festival',
  editorialEdicao: 'Marcos, curiosidades e legado',
}
