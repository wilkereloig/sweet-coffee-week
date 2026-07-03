/*
 * ADAPTER — base oficial → shape `sweetEditions` (legado).
 *
 * Fonte única de verdade: src/data/sweetCoffeeHistory.js (SWEET_COFFEE_HISTORY,
 * 16 edições incl. Lovers 2026.1). Este módulo deriva o array no formato que os
 * componentes do Hall (HistoricoAwards.jsx) e o resolvedor editionAssets.js já
 * consomem — sem reescrever o render. Substitui o antigo src/data/sweetHistory.js
 * (base legada de 15 edições, curada à mão).
 *
 * Mapa de campos (oficial → legado): ver plano / CLAUDE.md §16.
 */
import { SWEET_COFFEE_HISTORY } from './sweetCoffeeHistory'
import { LOVERS_2026_AWARDS_RESULTS } from './loversAwardsResults'

// trilha oficial → rótulo de trilha usado no render (StatusBadge/groupByTrack).
const TRACK_LABEL = {
  juri_tecnico: 'Júri Técnico',
  sweet_lovers: 'Sweet Lovers',
}

// categorias[] (oficial) → awards[] (legado). Preserva empates: cada nome de uma
// colocação vira uma entrada com a MESMA colocação (ex.: dois "3º").
function toAwards(categorias = []) {
  return categorias.map((c) => ({
    category: c.categoria,
    track: c.trilha ? TRACK_LABEL[c.trilha] || c.trilha : null,
    winners: (c.colocacoes || []).flatMap((col) =>
      (col.nomes || []).map((name) => ({ place: `${col.pos}º`, name }))
    ),
  }))
}

// patrocinadores.parceiros[{nome,tipo}] → sponsors[{name,type}].
function toSponsors(patrocinadores) {
  const parceiros = (patrocinadores && patrocinadores.parceiros) || []
  return parceiros.map((p) => ({ name: p.nome, type: p.tipo || null }))
}

// CLAUDE.md §12: os pódios da edição atual (2026.1) ficam vazios de propósito na
// base histórica geral — o resultado estruturado real vive em loversAwardsResults.js
// (mesma fonte que SweetAwards.jsx já usa). Cruzar aqui pro Hall mostrar os vencedores.
const LOVERS_PREM = LOVERS_2026_AWARDS_RESULTS.premiacao

export const sweetEditions = SWEET_COFFEE_HISTORY.edicoes.map((e) => {
  const prem = e.id === LOVERS_2026_AWARDS_RESULTS.id ? LOVERS_PREM : (e.premiacao || {})
  const mh = prem.mencaoHonrosa
  return {
    id: e.id,
    code: e.id, // legado distingue id/code; aqui são o mesmo identificador.
    label: e.nome,
    theme: e.tema || e.nome, // 2016 tem tema:null → fallback p/ não renderizar vazio.
    participantsCount: e.participantesCount,
    awardsStatus: prem.status,
    // a observacao da 2026.1 é uma nota de bastidor ("Resultado oficial da Premiação
    // da 16ª edição...") — fora da voz pública; o título + badge já comunicam. Demais
    // edições mantêm a observacao (ex.: "Votação do público...").
    awardsNote: e.id === LOVERS_2026_AWARDS_RESULTS.id ? null : (prem.observacao || null),
    awards: toAwards(prem.categorias),
    honorableMention: mh ? { category: mh.categoria, names: mh.nomes || [] } : null,
    sponsors: toSponsors(e.patrocinadores),
  }
})
