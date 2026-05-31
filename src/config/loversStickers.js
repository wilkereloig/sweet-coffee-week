// Adesivos decorativos por página. Arquivos em public/images/adesivos/.
// Cada item posiciona um PNG na CAMADA 2 (atrás do conteúdo, sólido — sem opacity).
// Tamanho via width clamp; rotação via --rot; escala via --scale (responsiva no CSS).
// Sticker-colagem: presença visual forte, recorte parcial nas laterais (left/right negativos),
// posicionados em áreas de respiro — nunca por cima de texto/cards/CTAs.
// Arquivos com espaço no nome precisam de %20.
// Zonas seguras: stickers ficam em cantos/laterais, sempre com recorte parcial
// (left/right negativos), FORA do eixo central de leitura (hero/títulos/CTAs).
// Evitar top entre ~20% e ~45% no centro. --parallax: intensidade p/ futuro scroll.
export const LOVERS_STICKERS = {
  // /lovers — sobre: hero (faixa top<28%) fica LIMPO; stickers nas bordas das seções de baixo.
  sobre: [
    { src: '/images/adesivos/sobre-3.png', style: { top: '34%',    left: '-12%', width: 'clamp(180px,20vw,400px)', '--rot': '5deg',  '--scale': '1', '--parallax': '0.10' } },
    { src: '/images/adesivos/sobre-2.png', style: { top: '30%',    right: '-12%', width: 'clamp(160px,17vw,330px)', '--rot': '7deg',  '--scale': '1', '--parallax': '0.08' } },
    { src: '/images/adesivos/sobre-4.png', style: { top: '62%',    left: '-12%', width: 'clamp(170px,18vw,360px)', '--rot': '-6deg', '--scale': '1', '--parallax': '0.12' } },
    { src: '/images/adesivos/sobre-1.png', style: { top: '58%',    right: '-13%', width: 'clamp(180px,20vw,400px)', '--rot': '-8deg', '--scale': '1', '--parallax': '0.09' } },
    { src: '/images/adesivos/sobre-5.png', style: { bottom: '8%',  left: '-11%', width: 'clamp(160px,17vw,330px)', '--rot': '9deg',  '--scale': '1', '--parallax': '0.11' } },
    { src: '/images/adesivos/sobre-6.png', style: { bottom: '2%',  right: '-13%', width: 'clamp(180px,20vw,400px)', '--rot': '-5deg', '--scale': '1', '--parallax': '0.07' } },
  ],
  // /lovers/participantes — título centralizado: bordas laterais, longe do centro.
  participantes: [
    { src: '/images/adesivos/sobre-1.png',       style: { top: '34%',  left: '-12%', width: 'clamp(160px,17vw,330px)', '--rot': '-7deg', '--scale': '1', '--parallax': '0.10' } },
    { src: '/images/adesivos/Prancheta%202.png', style: { top: '30%',  right: '-12%', width: 'clamp(190px,21vw,420px)', '--rot': '6deg',  '--scale': '1', '--parallax': '0.08' } },
    { src: '/images/adesivos/sobre-5.png',       style: { bottom: '6%', left: '-11%', width: 'clamp(160px,17vw,330px)', '--rot': '8deg',  '--scale': '1', '--parallax': '0.12' } },
  ],
  // /lovers/combos/:slug — áreas vazias; nunca sobre nome/logo/CTA/endereço.
  combos: [
    { src: '/images/adesivos/sobre-3.png',       style: { top: '12%',    right: '-12%', width: 'clamp(160px,17vw,330px)', '--rot': '7deg',  '--scale': '1', '--parallax': '0.09' } },
    { src: '/images/adesivos/Prancheta%203.png', style: { bottom: '10%', left: '-12%',  width: 'clamp(190px,21vw,420px)', '--rot': '-6deg', '--scale': '1', '--parallax': '0.11' } },
  ],
  // /lovers/premiacao — hero alinhado à esquerda: stickers à direita/cantos, longe do título.
  premiacao: [
    { src: '/images/adesivos/sobre-2.png',       style: { top: '32%',   right: '-12%', width: 'clamp(160px,17vw,330px)', '--rot': '-8deg', '--scale': '1', '--parallax': '0.09' } },
    { src: '/images/adesivos/Prancheta%202.png', style: { top: '52%',   left: '-13%', width: 'clamp(190px,21vw,420px)', '--rot': '6deg',  '--scale': '1', '--parallax': '0.10' } },
    { src: '/images/adesivos/sobre-6.png',       style: { bottom: '6%',  right: '-11%', width: 'clamp(160px,17vw,330px)', '--rot': '7deg',  '--scale': '1', '--parallax': '0.12' } },
  ],
  mapa: [],
}
