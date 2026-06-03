// Adesivos decorativos por página. Arquivos em public/images/adesivos-site/.
// Posicionados na CAMADA 2 (atrás do conteúdo, sólidos — sem opacity), em zonas
// de respiro (cantos/laterais, com recorte parcial via left/right negativos),
// nunca por cima de texto/cards/CTAs.
// Mapeamento TEMÁTICO por página:
//   sobre        → identidade/lovers (lettering, corações, "Sweet Lover")
//   participantes→ explorar/rota/comida (mapa, lupa, café+bolo)
//   combos       → comida/fotos ("feito de amor", latte+salgado+doce)
//   premiacao    → troféu, coroa, presente (prêmios)
// --rot rotação · --scale escala · --parallax intensidade do parallax no scroll.
// Espaço no nome do arquivo = %20.
const A = (n) => `/images/adesivos-site/adesivo%20(${n}).png`

export const LOVERS_STICKERS = {
  // /lovers — sobre: identidade Lovers. Hero (top<28%) mais leve.
  sobre: [
    { src: A(43), style: { top: '32%',   left: '-10%',  width: 'clamp(170px,19vw,380px)', '--rot': '-5deg', '--scale': '1', '--parallax': '0.10' } },
    { src: A(44), style: { top: '30%',   right: '-10%', width: 'clamp(150px,16vw,300px)', '--rot': '7deg',  '--scale': '1', '--parallax': '0.08' } },
    { src: A(19), style: { top: '60%',   left: '-9%',   width: 'clamp(200px,22vw,440px)', '--rot': '-4deg', '--scale': '1', '--parallax': '0.12' } },
    { src: A(35), style: { top: '58%',   right: '-10%', width: 'clamp(150px,16vw,300px)', '--rot': '6deg',  '--scale': '1', '--parallax': '0.09' } },
    { src: A(31), style: { bottom: '8%', left: '-8%',   width: 'clamp(150px,16vw,300px)', '--rot': '8deg',  '--scale': '1', '--parallax': '0.11' } },
    { src: A(17), style: { bottom: '3%', right: '-10%', width: 'clamp(160px,17vw,330px)', '--rot': '-6deg', '--scale': '1', '--parallax': '0.07' } },
    { src: A(25), style: { top: '44%',   right: '-9%',  width: 'clamp(140px,14vw,270px)', '--rot': '5deg',  '--scale': '1', '--parallax': '0.08' } },
    { src: A(33), style: { top: '76%',   left: '-8%',   width: 'clamp(150px,16vw,300px)', '--rot': '-7deg', '--scale': '1', '--parallax': '0.11' } },
    { src: A(8),  style: { top: '16%',   left: '-9%',   width: 'clamp(120px,13vw,240px)', '--rot': '6deg',  '--scale': '1', '--parallax': '0.09' } },
    { src: A(21), style: { top: '22%',   right: '-8%',  width: 'clamp(120px,13vw,230px)', '--rot': '-8deg', '--scale': '1', '--parallax': '0.10' } },
    { src: A(23), style: { top: '50%',   left: '-9%',   width: 'clamp(130px,14vw,250px)', '--rot': '7deg',  '--scale': '1', '--parallax': '0.08' } },
    { src: A(39), style: { top: '70%',   right: '-9%',  width: 'clamp(130px,14vw,250px)', '--rot': '-6deg', '--scale': '1', '--parallax': '0.11' } },
    { src: A(14), style: { bottom: '22%',left: '-9%',   width: 'clamp(120px,13vw,240px)', '--rot': '8deg',  '--scale': '1', '--parallax': '0.09' } },
    { src: A(1),  style: { bottom: '40%',right: '-8%',  width: 'clamp(120px,13vw,230px)', '--rot': '-7deg', '--scale': '1', '--parallax': '0.12' } },
    { src: A(46), style: { bottom: '54%',left: '-8%',   width: 'clamp(110px,12vw,210px)', '--rot': '6deg',  '--scale': '1', '--parallax': '0.07' } },
    { src: A(27), style: { bottom: '30%',right: '-9%',  width: 'clamp(130px,14vw,250px)', '--rot': '7deg',  '--scale': '1', '--parallax': '0.10' } },
  ],
  // /lovers/participantes — explorar + rota + comida.
  participantes: [
    { src: A(47), style: { top: '32%',   left: '-10%',  width: 'clamp(180px,20vw,400px)', '--rot': '-6deg', '--scale': '1', '--parallax': '0.10' } },
    { src: A(3),  style: { top: '30%',   right: '-11%', width: 'clamp(150px,15vw,300px)', '--rot': '7deg',  '--scale': '1', '--parallax': '0.08' } },
    { src: A(6),  style: { bottom: '6%', left: '-9%',   width: 'clamp(170px,18vw,360px)', '--rot': '6deg',  '--scale': '1', '--parallax': '0.12' } },
    { src: A(15), style: { top: '56%',   right: '-10%', width: 'clamp(150px,16vw,310px)', '--rot': '6deg',  '--scale': '1', '--parallax': '0.09' } },
    { src: A(41), style: { bottom: '8%', right: '-10%', width: 'clamp(140px,14vw,270px)', '--rot': '-7deg', '--scale': '1', '--parallax': '0.11' } },
    { src: A(48), style: { top: '14%',   right: '-10%', width: 'clamp(140px,15vw,290px)', '--rot': '7deg',  '--scale': '1', '--parallax': '0.08' } },
    { src: A(1),  style: { top: '46%',   left: '-9%',   width: 'clamp(120px,13vw,230px)', '--rot': '-7deg', '--scale': '1', '--parallax': '0.10' } },
    { src: A(12), style: { top: '72%',   right: '-11%', width: 'clamp(150px,16vw,300px)', '--rot': '6deg',  '--scale': '1', '--parallax': '0.12' } },
    { src: A(8),  style: { bottom: '26%',right: '-9%',  width: 'clamp(120px,13vw,240px)', '--rot': '-6deg', '--scale': '1', '--parallax': '0.09' } },
    { src: A(37), style: { bottom: '42%',left: '-10%',  width: 'clamp(140px,15vw,280px)', '--rot': '8deg',  '--scale': '1', '--parallax': '0.11' } },
  ],
  // /lovers/combos/:slug — comida + fotos. Áreas vazias; nunca sobre nome/CTA.
  combos: [
    { src: A(12), style: { top: '46%',    right: '-12%', width: 'clamp(160px,16vw,320px)', '--rot': '7deg',  '--scale': '1', '--parallax': '0.09' } },
    { src: A(37), style: { bottom: '10%', left: '-11%',  width: 'clamp(150px,15vw,300px)', '--rot': '-6deg', '--scale': '1', '--parallax': '0.11' } },
    { src: A(42), style: { top: '20%',    left: '-11%',  width: 'clamp(140px,14vw,270px)', '--rot': '-6deg', '--scale': '1', '--parallax': '0.08' } },
    { src: A(14), style: { bottom: '42%', right: '-12%', width: 'clamp(140px,14vw,260px)', '--rot': '7deg',  '--scale': '1', '--parallax': '0.10' } },
    { src: A(6),  style: { top: '12%',    right: '-12%', width: 'clamp(140px,14vw,270px)', '--rot': '6deg',  '--scale': '1', '--parallax': '0.08' } },
    { src: A(41), style: { top: '66%',    left: '-12%',  width: 'clamp(130px,13vw,250px)', '--rot': '-7deg', '--scale': '1', '--parallax': '0.11' } },
    { src: A(3),  style: { bottom: '26%', right: '-12%', width: 'clamp(130px,13vw,250px)', '--rot': '7deg',  '--scale': '1', '--parallax': '0.09' } },
    { src: A(1),  style: { bottom: '58%', left: '-12%',  width: 'clamp(110px,12vw,210px)', '--rot': '-6deg', '--scale': '1', '--parallax': '0.12' } },
  ],
  // /lovers/premiacao (e /votar) — troféu, coroa, presente.
  premiacao: [
    { src: A(10), style: { top: '30%',   right: '-10%', width: 'clamp(150px,16vw,300px)', '--rot': '-8deg', '--scale': '1', '--parallax': '0.09' } },
    { src: A(50), style: { top: '52%',   left: '-11%',  width: 'clamp(160px,17vw,330px)', '--rot': '6deg',  '--scale': '1', '--parallax': '0.10' } },
    { src: A(5),  style: { bottom: '6%', right: '-9%',  width: 'clamp(170px,18vw,360px)', '--rot': '7deg',  '--scale': '1', '--parallax': '0.12' } },
    { src: A(29), style: { bottom: '32%',left: '-11%',  width: 'clamp(150px,16vw,300px)', '--rot': '-6deg', '--scale': '1', '--parallax': '0.10' } },
    { src: A(27), style: { top: '76%',   right: '-10%', width: 'clamp(140px,14vw,270px)', '--rot': '7deg',  '--scale': '1', '--parallax': '0.08' } },
    { src: A(33), style: { top: '14%',   left: '-10%',  width: 'clamp(140px,15vw,280px)', '--rot': '-7deg', '--scale': '1', '--parallax': '0.09' } },
    { src: A(23), style: { top: '40%',   right: '-9%',  width: 'clamp(130px,14vw,250px)', '--rot': '6deg',  '--scale': '1', '--parallax': '0.11' } },
    { src: A(8),  style: { bottom: '20%',left: '-10%',  width: 'clamp(120px,13vw,240px)', '--rot': '8deg',  '--scale': '1', '--parallax': '0.08' } },
    { src: A(46), style: { bottom: '46%',right: '-9%',  width: 'clamp(110px,12vw,210px)', '--rot': '-6deg', '--scale': '1', '--parallax': '0.12' } },
    { src: A(1),  style: { top: '90%',   left: '-9%',   width: 'clamp(120px,13vw,230px)', '--rot': '7deg',  '--scale': '1', '--parallax': '0.10' } },
  ],
  mapa: [],
}
