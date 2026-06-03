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
  // /lovers — sobre: identidade Lovers. Hero (top<28%) limpo.
  sobre: [
    { src: A(43), style: { top: '32%',   left: '-10%',  width: 'clamp(170px,19vw,380px)', '--rot': '-5deg', '--scale': '1', '--parallax': '0.10' } }, // lettering Sweet Lover
    { src: A(44), style: { top: '30%',   right: '-10%', width: 'clamp(150px,16vw,300px)', '--rot': '7deg',  '--scale': '1', '--parallax': '0.08' } }, // coração SWEET LOVERS
    { src: A(19), style: { top: '60%',   left: '-9%',   width: 'clamp(200px,22vw,440px)', '--rot': '-4deg', '--scale': '1', '--parallax': '0.12' } }, // trio Sweet Lover
    { src: A(35), style: { top: '58%',   right: '-10%', width: 'clamp(150px,16vw,300px)', '--rot': '6deg',  '--scale': '1', '--parallax': '0.09' } }, // menina + coração
    { src: A(31), style: { bottom: '8%', left: '-8%',   width: 'clamp(150px,16vw,300px)', '--rot': '8deg',  '--scale': '1', '--parallax': '0.11' } }, // Natal cidade mais doce
    { src: A(17), style: { bottom: '3%', right: '-10%', width: 'clamp(160px,17vw,330px)', '--rot': '-6deg', '--scale': '1', '--parallax': '0.07' } }, // café derramando corações
  ],
  // /lovers/participantes — explorar + rota + comida.
  participantes: [
    { src: A(47), style: { top: '32%',   left: '-10%',  width: 'clamp(180px,20vw,400px)', '--rot': '-6deg', '--scale': '1', '--parallax': '0.10' } }, // mapa com rota
    { src: A(3),  style: { top: '30%',   right: '-11%', width: 'clamp(150px,15vw,300px)', '--rot': '7deg',  '--scale': '1', '--parallax': '0.08' } }, // lupa + bolo
    { src: A(6),  style: { bottom: '6%', left: '-9%',   width: 'clamp(170px,18vw,360px)', '--rot': '6deg',  '--scale': '1', '--parallax': '0.12' } }, // café + bolo + croissant
  ],
  // /lovers/combos/:slug — comida + fotos. Áreas vazias; nunca sobre nome/CTA.
  combos: [
    { src: A(12), style: { top: '46%',    right: '-12%', width: 'clamp(160px,16vw,320px)', '--rot': '7deg',  '--scale': '1', '--parallax': '0.09' } }, // latte + salgado + doce
    { src: A(37), style: { bottom: '10%', left: '-11%',  width: 'clamp(150px,15vw,300px)', '--rot': '-6deg', '--scale': '1', '--parallax': '0.11' } }, // selo "feito de amor"
  ],
  // /lovers/premiacao (e /votar) — troféu, coroa, presente.
  premiacao: [
    { src: A(10), style: { top: '30%',   right: '-10%', width: 'clamp(150px,16vw,300px)', '--rot': '-8deg', '--scale': '1', '--parallax': '0.09' } }, // troféu
    { src: A(50), style: { top: '52%',   left: '-11%',  width: 'clamp(160px,17vw,330px)', '--rot': '6deg',  '--scale': '1', '--parallax': '0.10' } }, // coração com coroa
    { src: A(5),  style: { bottom: '6%', right: '-9%',  width: 'clamp(170px,18vw,360px)', '--rot': '7deg',  '--scale': '1', '--parallax': '0.12' } }, // presente / prêmio surpresa
  ],
  mapa: [],
}
