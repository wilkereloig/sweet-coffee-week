// Adesivos decorativos por página. Arquivos em public/images/adesivos/.
// Cada item posiciona um PNG no fundo da página (decorativo, aria-hidden).
// Tamanho via width clamp; rotação via --rot; escala responsiva via --scale.
// Arquivos com espaço no nome precisam de %20.
export const LOVERS_STICKERS = {
  sobre: [
    { src: '/images/adesivos/sobre-1.png', style: { top: '5%',  left: '3%',  width: 'clamp(170px,18vw,320px)', '--rot': '-8deg' } },
    { src: '/images/adesivos/sobre-2.png', style: { top: '16%', right: '4%', width: 'clamp(150px,16vw,280px)', '--rot': '7deg' } },
    { src: '/images/adesivos/sobre-3.png', style: { top: '50%', left: '2%',  width: 'clamp(190px,20vw,360px)', '--rot': '5deg' } },
    { src: '/images/adesivos/sobre-4.png', style: { top: '62%', right: '5%', width: 'clamp(170px,18vw,300px)', '--rot': '-6deg' } },
    { src: '/images/adesivos/sobre-5.png', style: { bottom: '12%', left: '6%', width: 'clamp(150px,16vw,280px)', '--rot': '9deg' } },
    { src: '/images/adesivos/sobre-6.png', style: { bottom: '6%', right: '3%', width: 'clamp(190px,20vw,360px)', '--rot': '-5deg' } },
  ],
  participantes: [
    { src: '/images/adesivos/sobre-1.png',       style: { top: '8%',    left: '3%',  width: 'clamp(150px,16vw,280px)', '--rot': '-7deg' } },
    { src: '/images/adesivos/Prancheta%202.png', style: { top: '40%',   right: '3%', width: 'clamp(190px,20vw,360px)', '--rot': '6deg' } },
    { src: '/images/adesivos/sobre-5.png',       style: { bottom: '8%', left: '5%',  width: 'clamp(150px,16vw,280px)', '--rot': '8deg' } },
  ],
  combos: [
    { src: '/images/adesivos/sobre-3.png',       style: { top: '10%',    right: '4%', width: 'clamp(150px,16vw,280px)', '--rot': '7deg' } },
    { src: '/images/adesivos/Prancheta%203.png', style: { bottom: '14%', left: '3%',  width: 'clamp(190px,20vw,360px)', '--rot': '-6deg' } },
  ],
  premiacao: [
    { src: '/images/adesivos/sobre-2.png',       style: { top: '12%',    left: '3%',  width: 'clamp(150px,16vw,280px)', '--rot': '-8deg' } },
    { src: '/images/adesivos/Prancheta%202.png', style: { top: '48%',    right: '4%', width: 'clamp(190px,20vw,360px)', '--rot': '6deg' } },
    { src: '/images/adesivos/sobre-6.png',       style: { bottom: '8%',  left: '6%',  width: 'clamp(150px,16vw,280px)', '--rot': '7deg' } },
  ],
  mapa: [],
}
