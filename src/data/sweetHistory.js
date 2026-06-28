/*
 * BASE HISTÓRICA — Sweet & Coffee Week (2016–2025, 15 edições).
 * Fonte: acervo histórico do festival. NÃO inclui a edição 2026.1 Lovers.
 *
 * Honestidade dos dados (regra: não inventar):
 * - `participantsCount` é conhecido por edição; os NOMES dos participantes ainda
 *   não foram carregados → `participants: []` (preencher quando a base chegar).
 * - `awards` só traz vencedores CONFIRMADOS. Quando o status é "completa" mas os
 *   nomes por categoria ainda não foram carregados, `winnersPending: true` sinaliza
 *   "resultados a carregar" — a UI mostra isso em vez de inventar.
 * - Empate: repetir a mesma colocação (ex.: dois "3º"), nunca criar "4º".
 *
 * Status possíveis: 'nao-teve' | 'nao-encontrada' | 'completa' | 'parcial' | 'a-conferir'
 */

export const AWARD_STATUS = {
  'nao-teve':       { label: 'Não teve premiação',        tone: 'muted'  },
  'nao-encontrada': { label: 'Premiação não encontrada',  tone: 'warn'   },
  'completa':       { label: 'Premiação completa',         tone: 'ok'     },
  'parcial':        { label: 'Premiação parcial',          tone: 'info'   },
  'a-conferir':     { label: 'A conferir',                 tone: 'info'   },
}

// winners: [{ place: '1º', name: '...' }]. track opcional (Sweet Lovers / Júri
// Técnico / Votação / não informado). category conforme a base (não unificar).
export const sweetEditions = [
  { id: '2016',   number: 1,  year: '2016', code: '2016',   label: 'S&C / Início',           theme: 'Início',              participantsCount: 13, participants: [], awardsStatus: 'nao-teve',       awardsNote: 'Primeira edição, realizada como circuito.', awards: [] },
  { id: '2017-1', number: 2,  year: '2017', code: '2017.1', label: 'S&C Páscoa',             theme: 'Páscoa',              participantsCount: 17, participants: [], awardsStatus: 'nao-encontrada', awardsNote: '', awards: [] },
  { id: '2017-2', number: 3,  year: '2017', code: '2017.2', label: 'S&C Doces do Mundo',     theme: 'Doces do Mundo',      participantsCount: 22, participants: [], awardsStatus: 'nao-encontrada', awardsNote: '', awards: [] },
  { id: '2018-1', number: 4,  year: '2018', code: '2018.1', label: 'S&C Namorados',          theme: 'Namorados',           participantsCount: 21, participants: [], awardsStatus: 'nao-encontrada', awardsNote: '', awards: [] },
  { id: '2018-2', number: 5,  year: '2018', code: '2018.2', label: 'S&C Sabores da Infância', theme: 'Sabores da Infância', participantsCount: 25, participants: [], awardsStatus: 'nao-encontrada', awardsNote: '', awards: [] },
  {
    id: '2019-1', number: 6, year: '2019', code: '2019.1', label: 'S&C Pâtisserie Francesa', theme: 'Pâtisserie Francesa',
    participantsCount: 28, participants: [], awardsStatus: 'completa', winnersPending: true,
    awardsNote: 'Primeiro resultado de Melhor Combo encontrado no acervo.',
    awards: [
      { category: 'Melhor Combo', winners: [
        { place: '1º', name: 'Jolie' },
        { place: '2º', name: 'Mr Cupcake' },
        { place: '3º', name: 'Sonho de Brownie' },
      ] },
    ],
  },
  { id: '2019-2', number: 7,  year: '2019', code: '2019.2', label: 'S&C Contos de Fadas',     theme: 'Contos de Fadas',     participantsCount: 36, participants: [], awardsStatus: 'completa', winnersPending: true, awardsNote: '', awards: [] },
  { id: '2020-1', number: 8,  year: '2020', code: '2020.1', label: 'S&C No Ritmo da Música',  theme: 'No Ritmo da Música',  participantsCount: 18, participants: [], awardsStatus: 'completa', winnersPending: true, awardsNote: '', awards: [] },
  { id: '2020-2', number: 9,  year: '2020', code: '2020.2', label: 'S&C Heróis & Vilões',     theme: 'Heróis & Vilões',     participantsCount: 27, participants: [], awardsStatus: 'completa', winnersPending: true, awardsNote: 'Kyara como possível participante adicional/substituição — a conferir.', awards: [] },
  { id: '2021-1', number: 10, year: '2021', code: '2021.1', label: 'S&C Séries',             theme: 'Séries',              participantsCount: 30, participants: [], awardsStatus: 'nao-encontrada', awardsNote: 'Vencedores anunciados apenas na live de encerramento; sem post de card no feed.', awards: [] },
  { id: '2021-2', number: 11, year: '2021', code: '2021.2', label: 'S&C Terras Potiguares',  theme: 'Terras Potiguares',   participantsCount: 30, participants: [], awardsStatus: 'completa', winnersPending: true, awardsNote: 'Parceria com o Sebrae/RN e foco em produtos regionais.', awards: [] },
  { id: '2022',   number: 12, year: '2022', code: '2022',   label: 'S&C Movies',             theme: 'Movies',              participantsCount: 33, participants: [], awardsStatus: 'completa', winnersPending: true, awardsNote: '', awards: [] },
  { id: '2023',   number: 13, year: '2023', code: '2023',   label: 'S&C Trip',               theme: 'Trip',                participantsCount: 33, participants: [], awardsStatus: 'completa', winnersPending: true, awardsNote: '', awards: [] },
  { id: '2024',   number: 14, year: '2024', code: '2024',   label: 'S&C Books',              theme: 'Books',               participantsCount: 29, participants: [], awardsStatus: 'completa', winnersPending: true, awardsNote: '', awards: [] },
  {
    id: '2025', number: 15, year: '2025', code: '2025', label: 'S&C Celebration', theme: 'Celebration',
    participantsCount: 26, participants: [], awardsStatus: 'completa', winnersPending: true, awardsNote: '',
    awards: [
      { category: 'Melhor Combo',  winners: [ { place: '1º', name: 'Bolomania' }, { place: '2º', name: 'O Maestro Café' }, { place: '3º', name: 'Delicato' } ] },
      { category: 'Melhor Doce',   winners: [ { place: '1º', name: 'Jolie' }, { place: '2º', name: 'Bolomania' }, { place: '3º', name: 'Marlon Vinicius' } ] },
      { category: 'Melhor Bebida', winners: [ { place: '1º', name: 'O Maestro Café' }, { place: '2º', name: 'Delicato' }, { place: '3º', name: 'Mr. Cupcake' } ] },
    ],
  },
]

// ---- Derivações (calculadas a partir do array — sem números hardcoded soltos) ----
export const historyStats = (() => {
  const total = sweetEditions.reduce((s, e) => s + (e.participantsCount || 0), 0)
  const biggest = sweetEditions.reduce((a, b) => (b.participantsCount > a.participantsCount ? b : a))
  const completa = sweetEditions.filter((e) => e.awardsStatus === 'completa').length
  const semResultado = sweetEditions.filter((e) => e.awardsStatus === 'nao-encontrada').length
  const firstAward = sweetEditions.find((e) => e.awards && e.awards.length > 0)
  return {
    editions: sweetEditions.length,
    range: '2016–2025',
    totalParticipations: total,
    biggest,
    completa,
    semResultado,
    firstAwardYear: firstAward ? firstAward.year : null,
  }
})()

// Top edições por nº de participantes (desc).
export const biggestEditions = [...sweetEditions]
  .sort((a, b) => b.participantsCount - a.participantsCount)
  .slice(0, 6)

// Só edições com algum vencedor carregado (para a página de histórico destacar).
export const editionsWithResults = sweetEditions.filter((e) => e.awards && e.awards.length > 0)
