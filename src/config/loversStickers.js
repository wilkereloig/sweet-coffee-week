// Adesivos decorativos por página. Arquivos em public/images/adesivos/.
// Cada item posiciona um PNG na CAMADA 2 (atrás do conteúdo, sólido — sem opacity).
// Tamanho via width clamp; rotação via --rot; escala via --scale (responsiva no CSS).
// Sticker-colagem: presença visual forte, recorte parcial nas laterais (left/right negativos),
// posicionados em áreas de respiro — nunca por cima de texto/cards/CTAs.
// Arquivos com espaço no nome precisam de %20.
export const LOVERS_STICKERS = {
  sobre: [
    { src: '/images/adesivos/sobre-1.png', style: { top: '4%',    left: '-3%',  width: 'clamp(190px,22vw,420px)', '--rot': '-8deg', '--scale': '1' } },
    { src: '/images/adesivos/sobre-2.png', style: { top: '14%',   right: '-3%', width: 'clamp(170px,19vw,360px)', '--rot': '7deg',  '--scale': '1' } },
    { src: '/images/adesivos/sobre-3.png', style: { top: '49%',   left: '-4%',  width: 'clamp(210px,24vw,460px)', '--rot': '5deg',  '--scale': '1' } },
    { src: '/images/adesivos/sobre-4.png', style: { top: '61%',   right: '-4%', width: 'clamp(190px,21vw,400px)', '--rot': '-6deg', '--scale': '1' } },
    { src: '/images/adesivos/sobre-5.png', style: { bottom: '10%', left: '2%',  width: 'clamp(170px,19vw,360px)', '--rot': '9deg',  '--scale': '1' } },
    { src: '/images/adesivos/sobre-6.png', style: { bottom: '4%',  right: '-3%', width: 'clamp(210px,24vw,460px)', '--rot': '-5deg', '--scale': '1' } },
  ],
  participantes: [
    { src: '/images/adesivos/sobre-1.png',       style: { top: '7%',   left: '-3%',  width: 'clamp(170px,19vw,360px)', '--rot': '-7deg', '--scale': '1' } },
    { src: '/images/adesivos/Prancheta%202.png', style: { top: '40%',  right: '-3%', width: 'clamp(210px,24vw,460px)', '--rot': '6deg',  '--scale': '1' } },
    { src: '/images/adesivos/sobre-5.png',       style: { bottom: '6%', left: '-2%', width: 'clamp(170px,19vw,360px)', '--rot': '8deg',  '--scale': '1' } },
  ],
  combos: [
    { src: '/images/adesivos/sobre-3.png',       style: { top: '8%',     right: '-3%', width: 'clamp(170px,19vw,360px)', '--rot': '7deg',  '--scale': '1' } },
    { src: '/images/adesivos/Prancheta%203.png', style: { bottom: '12%', left: '-3%',  width: 'clamp(210px,24vw,460px)', '--rot': '-6deg', '--scale': '1' } },
  ],
  premiacao: [
    { src: '/images/adesivos/sobre-2.png',       style: { top: '10%',   left: '-3%',  width: 'clamp(170px,19vw,360px)', '--rot': '-8deg', '--scale': '1' } },
    { src: '/images/adesivos/Prancheta%202.png', style: { top: '47%',   right: '-3%', width: 'clamp(210px,24vw,460px)', '--rot': '6deg',  '--scale': '1' } },
    { src: '/images/adesivos/sobre-6.png',       style: { bottom: '6%',  left: '-2%', width: 'clamp(170px,19vw,360px)', '--rot': '7deg',  '--scale': '1' } },
  ],
  mapa: [],
}
