/*
 * FATOS CANÔNICOS DO FESTIVAL — fonte única dos números do Sweet & Coffee Week.
 *
 * Mudou um número (nova edição, novo ano, mais marcas)? Muda AQUI e propaga.
 * A Home lê estes campos direto (bloco "Números", CountUp). A prosa institucional
 * (Home/Edições/Apoiar) ainda cita alguns destes valores como texto fixo — ao
 * atualizar, conferir também .label abaixo.
 *
 * Ver CLAUDE.md §16 (dados: não inventar; código é a verdade) e §9 (Home).
 */

export const festivalFacts = {
  editions:   { value: 16,  label: '16 edições' },
  years:      { value: 10,  label: '10 anos' },
  firstYear:  2016,
  brands:     { value: 100, label: '+100 marcas' },
  combosSold: { value: 34,  unit: 'mil',     label: '+34 mil combos' },
  igViews:    { value: 18,  unit: 'milhões', label: '+18 milhões de visualizações' },
}
