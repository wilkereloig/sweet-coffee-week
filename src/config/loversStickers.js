// Adesivos decorativos por página. Arquivos em public/images/adesivos-site/.
// Posicionados na CAMADA 2 (atrás do conteúdo), em zonas de respiro (cantos/laterais,
// com recorte parcial via left/right negativos), nunca por cima de texto/cards/CTAs.
//
// Mapeamento TEMÁTICO por página:
//   sobre/Hub    → identidade/lovers ("EU VIVI", "AMEI", "FAVORITO", corações, "Memórias")
//   participantes→ explorar/rota ("PARTIU ROTA", mapa, pin, lupa, rota)
//   combos       → comida/fotos (cupcake, chocolates, câmera, "COMBOS QUE A GENTE AMA")
//   premiacao    → prêmios/avaliação ("MEU VOTO", "AVALIE!", carimbo, estrela, celular c/ notas)
//
// --rot rotação · --scale escala · --parallax intensidade do parallax no scroll.
// Espaço no nome = %20.
//
// POOLS: cada página tem um POOL amplo (antigos + v2). A função `pickStickers` sorteia
// N aleatórios por mount (chamada no LoversStickers via useMemo). Posições também
// são rotacionadas para nunca travar no mesmo layout.

const A = (n) => `/images/adesivos-site/adesivo%20(${n}).png`
const B = (n) => `/images/adesivos-site/adesivo-v2%20(${n}).png`

// Posições disponíveis para preencher os slots (wrapper style).
const POSITIONS = [
  { top: '10%',   left: '-10%',  width: 'clamp(120px,13vw,240px)', '--rot': '-6deg', '--scale': '1', '--parallax': '0.09' },
  { top: '14%',   right: '-10%', width: 'clamp(130px,14vw,260px)', '--rot': '7deg',  '--scale': '1', '--parallax': '0.08' },
  { top: '28%',   left: '-10%',  width: 'clamp(150px,16vw,300px)', '--rot': '-5deg', '--scale': '1', '--parallax': '0.10' },
  { top: '30%',   right: '-10%', width: 'clamp(140px,15vw,280px)', '--rot': '6deg',  '--scale': '1', '--parallax': '0.09' },
  { top: '44%',   left: '-10%',  width: 'clamp(160px,17vw,330px)', '--rot': '7deg',  '--scale': '1', '--parallax': '0.11' },
  { top: '46%',   right: '-10%', width: 'clamp(150px,16vw,300px)', '--rot': '-7deg', '--scale': '1', '--parallax': '0.10' },
  { top: '60%',   left: '-10%',  width: 'clamp(170px,18vw,350px)', '--rot': '-4deg', '--scale': '1', '--parallax': '0.12' },
  { top: '62%',   right: '-10%', width: 'clamp(150px,16vw,310px)', '--rot': '8deg',  '--scale': '1', '--parallax': '0.09' },
  { top: '76%',   left: '-9%',   width: 'clamp(140px,15vw,280px)', '--rot': '6deg',  '--scale': '1', '--parallax': '0.10' },
  { top: '78%',   right: '-9%',  width: 'clamp(130px,14vw,260px)', '--rot': '-6deg', '--scale': '1', '--parallax': '0.08' },
  { bottom: '20%',left: '-9%',   width: 'clamp(130px,14vw,250px)', '--rot': '-7deg', '--scale': '1', '--parallax': '0.11' },
  { bottom: '18%',right: '-9%',  width: 'clamp(140px,15vw,270px)', '--rot': '7deg',  '--scale': '1', '--parallax': '0.09' },
  { bottom: '6%', left: '-9%',   width: 'clamp(150px,16vw,300px)', '--rot': '8deg',  '--scale': '1', '--parallax': '0.12' },
  { bottom: '4%', right: '-9%',  width: 'clamp(130px,14vw,250px)', '--rot': '-5deg', '--scale': '1', '--parallax': '0.10' },
  { top: '34%',   left: '-10%',  width: 'clamp(140px,15vw,280px)', '--rot': '-7deg', '--scale': '1', '--parallax': '0.09' },
  { top: '52%',   right: '-9%',  width: 'clamp(130px,14vw,250px)', '--rot': '6deg',  '--scale': '1', '--parallax': '0.11' },
]

// Pools temáticos — só srcs; pickStickers() monta o objeto final com posição.
export const POOLS = {
  // Identidade Lovers: "EU VIVI", "AMEI", "FAVORITO", "Memórias", corações, lettering
  sobre: [
    B(2), B(15), B(14), B(4), B(6), B(16),
    A(43), A(44), A(19), A(35), A(31), A(17),
    A(25), A(33), A(8),  A(21), A(23), A(39),
    A(14), A(1),  A(46), A(27),
  ],
  // Explorar/rota: "PARTIU ROTA", mapa colorido, mapa c/ pin, lupa, comida na rota
  participantes: [
    B(5), B(3), B(1),
    A(47), A(3), A(6), A(15), A(41), A(48),
    A(1),  A(12), A(8), A(37),
  ],
  // Comida/foto: cupcake+café, chocolates, câmera+foto, "COMBOS QUE A GENTE AMA"
  combos: [
    B(17), B(19), B(11), B(12),
    A(12), A(37), A(42), A(14), A(6), A(41),
    A(3),  A(1),
  ],
  // Premiação/avaliação: "MEU VOTO", "Avalie", "AVALIE!", carimbo, celular c/ estrelas, estrela, "FAVORITO"
  premiacao: [
    B(8), B(9), B(10), B(7), B(13), B(18), B(14),
    A(10), A(50), A(5), A(29), A(27), A(23),
    A(8),  A(46), A(1), A(33),
  ],
  // Viva o Sweet: leve e arejado (identidade, aprovação)
  viva: [
    B(2), B(15), B(16), B(6),
    A(43), A(10), A(31), A(5),
  ],
  mapa: [],
}

// Sorteia N adesivos do pool e distribui nas posições (posições também sorteadas).
// Deve ser chamada dentro de um useMemo/useState no componente para randomizar a cada mount.
export function pickStickers(pool, n) {
  const count = n || Math.min(10, pool.length)
  const srcs = [...pool].sort(() => Math.random() - 0.5).slice(0, count)
  const pos  = [...POSITIONS].sort(() => Math.random() - 0.5)
  return srcs.map((src, i) => ({ src, style: pos[i % pos.length] }))
}

// Compat: LOVERS_STICKERS exportado como alias de POOLS (sem posição fixa).
export const LOVERS_STICKERS = POOLS
