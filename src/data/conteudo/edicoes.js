/*
 * Edições — identidade editorial das 17 edições e textos de interface da página.
 *
 * Aqui só mora o que é EDITORIAL: o tema como a página o apresenta, a etapa
 * (a frase curta que acompanha o ano no detalhe) e a foto de capa escolhida
 * para a coleção. Dado histórico (período, marcas, premiação, fotos) continua
 * vindo das fontes de sempre — src/data/handoff/edicoesData.js,
 * src/data/handoff/awardsData.js e src/data/imageLibrary.js — e o texto longo
 * (lead, marco, curiosidade, legado) de src/data/edicoesNarrativa.js.
 *
 * `capa` é o número da foto no acervo da edição (a ordem de editionPhotos),
 * escolhida em 13/10/2026 olhando as 190 fotos: a que melhor resume o tema,
 * alternando detalhe de combo, composição completa e registro de gente.
 * A Cartoon (2026.2, registrada em 16/11/2026) não tem registros avulsos: o
 * acervo dela são os 27 combos por marca, e a capa é um deles.
 * O índice é só uma escolha — o caminho continua sendo montado por
 * imageLibrary.editionPhotos().
 */
export const CENAS = [
  { code: '2016',   tema: 'Início',              etapa: 'O primeiro circuito',  capa: 2 },
  { code: '2017.1', tema: 'Páscoa',              etapa: 'Chocolate e presente', capa: 1 },
  { code: '2017.2', tema: 'Doces do Mundo',      etapa: 'Viagem gastronômica',  capa: 2 },
  { code: '2018.1', tema: 'Namorados',           etapa: 'Afeto à mesa',         capa: 12 },
  { code: '2018.2', tema: 'Sabores da Infância', etapa: 'Memória afetiva',      capa: 9 },
  { code: '2019.1', tema: 'Pâtisserie Francesa', etapa: 'Técnica e elegância',  capa: 1 },
  { code: '2019.2', tema: 'Contos de Fadas',     etapa: 'Imaginação',           capa: 7 },
  { code: '2020.1', tema: 'No Ritmo da Música',  etapa: 'Trilha sonora',        capa: 5 },
  { code: '2020.2', tema: 'Heróis & Vilões',     etapa: 'Cultura pop',          capa: 4 },
  { code: '2021.1', tema: 'Séries',              etapa: 'Maratona de sabores',  capa: 4 },
  { code: '2021.2', tema: 'Terras Potiguares',   etapa: 'Identidade local',     capa: 9 },
  { code: '2022',   tema: 'Movies',              etapa: 'Cinema',               capa: 7 },
  { code: '2023',   tema: 'Trip',                etapa: 'Rota pelo mundo',      capa: 5 },
  { code: '2024',   tema: 'Books',               etapa: 'Literatura e café',    capa: 8 },
  { code: '2025',   tema: 'Celebration',         etapa: 'Festa e rito',         capa: 2 },
  { code: '2026.1', tema: 'Lovers',              etapa: 'Especial 10 anos',     capa: 4 },
  /* `ilustrativa`: as fotos de combo da Cartoon trazem o cenário criado para o
     tema de cada casa — a galeria diz isso (§6.12: imagem que não é registro
     cru se identifica). */
  { code: '2026.2', tema: 'Cartoon',             etapa: 'Universo da animação', capa: 1, ilustrativa: true },
]

/* Vídeo de lançamento da edição no Instagram oficial (link limpo, sem parâmetro
   de rastreio). O arquivo e a capa vêm de imageLibrary.videoLancamentoEdicao().
   Cartoon: reel de 07/10/2026 — saiu da abertura da Home em 16/11/2026. */
export const LANCAMENTOS = {
  '2026.2': 'https://www.instagram.com/reel/DeNRdZvBubh/',
}

/* Abertura da página: quatro registros de edições diferentes — um par de mãos,
   uma mesa montada, um gesto de servir e um doce de perto. Mesma regra da
   capa: [edição, número da foto]; o caminho sai de editionPhotos(). */
export const FOTOS_ABERTURA = [
  ['2018.2', 11],
  ['2017.1', 9],
  ['2023', 6],
  ['2025', 8],
]

export const PREMIACAO = {
  'nao-teve': 'Sem premiação nesta edição',
  'nao-encontrada': 'Sem registro no acervo',
  completa: 'Premiação registrada',
  completa_em_publicacoes_oficiais: 'Premiação registrada',
  parcial: 'Premiação parcial',
  'em-apuracao': 'Premiação em apuração',
}

/* Textos de interface. Nada aqui é dado do festival. */
export const TEXTOS = {
  titulo: 'Cada edição, uma nova história à mesa.',
  lead: 'Desde 2017, cada edição tem um tema, e cada marca o transforma em doce, salgado e bebida.',
  rotuloAnos: 'Anos das edições',
  tituloColecao: 'As edições, ano a ano',
  duasNoAno: 'duas edições',
  explorar: 'Explorar',
  voltar: 'Todas as edições',
  galeria: 'Fotos da edição',
  galeriaCombos: 'Os combos da edição',
  fotoPendente: 'Foto pendente',
  galeriaPendente: 'Galeria pendente',
  marcasPendentes: 'Lista de participantes pendente.',
  /* O acervo não identifica qual foto é de qual marca (2016–2025): a galeria é
     o registro da EDIÇÃO, e a lista de marcas segue textual. Dizer isso evita
     que alguém leia a foto como sendo de uma casa da lista. */
  notaFotos: 'As fotos são registros da edição e não identificam a marca de cada combo.',
  /* Galeria por marca: um combo de cada participante. Quando nem toda marca tem
     foto no acervo, a nota diz quantas têm — a ausência fica dita. */
  notaCombos: (fotos, marcas) => (marcas && fotos < marcas
    ? `Um combo de cada marca participante. ${fotos} das ${marcas} marcas têm foto no acervo.`
    : 'Um combo de cada marca participante.'),
  /* Galeria com cenário ilustrativo (CENAS[].ilustrativa). */
  notaIlustrativa: 'Imagens ilustrativas: os combos aparecem em cenário criado para o tema de cada casa.',
  historia: 'A história da edição',
  marco: 'Por que essa edição marcou',
  destaque: 'Um destaque',
  legado: 'O que ficou',
  curiosidades: 'Curiosidades',
  premiacao: 'Sweet Awards desta edição',
  primeiros: 'Primeiro lugar em cada categoria',
  verAwards: 'Ver o Sweet Awards',
  /* Edição encerrada com resultado ainda não divulgado (premiação 'em-apuracao').
     ⚠️ A4: sem data e sem nome de casa. */
  apuracao: {
    estado: 'Resultados em apuração',
    texto: 'A avaliação do público passa pela conferência da organização. O resultado sai primeiro no Instagram do festival e depois entra nesta página.',
    acao: 'Acompanhar o Sweet Awards',
  },
  lancamento: {
    titulo: 'O lançamento da edição',
    texto: 'O vídeo que anunciou o tema e as datas, publicado no Instagram do festival.',
    video: (tema) => `Vídeo de lançamento da edição ${tema}`,
    instagram: 'Ver no Instagram',
  },
  anterior: 'Edição anterior',
  proxima: 'Próxima edição',
}
