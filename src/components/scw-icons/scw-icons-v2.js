// ============================================================
// Iconografia Sweet & Coffee Week — SISTEMA v2
// Direção 1a: contorno gordo puro. Aprovada em 04/08/2026.
// 05/08/2026: combos redesenhados — doce+café, trio e mini liam como bebida.
// Fonte de desenho: "Iconografia Sistema.dc.html" (Claude Design).
// NÃO editar à mão: alterar no Design e reexportar.
// ============================================================

export const SCW_ICON_SPEC = {
  viewBox: '0 0 32 32',
  strokeWidth: 3.2,
  linecap: 'round',
  linejoin: 'round',
  fill: 'none',
  stroke: 'currentColor'
};

// As regras que geram a família. Toda peça nova precisa passar por elas.
export const SCW_ICON_RULES = {
  grade: 32,
  areaViva: '3 a 29 — nada de ink fora disso',
  traco: 3.2,
  tracoDetalheInterno: 2.4,
  tracoTrilhaPontilhada: 4.0,
  // A regra que separa ícone legível de borrão. Descoberta na auditoria do piloto:
  // em forma FECHADA de contorno, o vão interno livre precisa ser >= 2x o traço.
  vazioMinimo: {
    regra: 'vão interno livre >= 2 * traço (6,4 no traço padrão)',
    circulo: 'raio >= 1,5 * traço — ou seja r >= 4,8 no traço 3,2',
    saida: 'não cabe? a forma vira PREENCHIDA (fill não tem vão) ou sai do ícone'
  },
  separacaoMinima: 'entre duas formas distintas: separação de path >= traço + 1,5 (4,7)',
  objetosPorIcone: 1,
  detalhePreenchido: 'ponto, contador e acento sólido são permitidos em qualquer tamanho — não contam como forma fechada',
  tamanhos: [16, 20, 24, 32, 48],
  cor: 'currentColor sempre — nunca fill ou stroke fixo no arquivo'
};

// Dois níveis, com piso de tamanho diferente.
export const SCW_ICON_TIERS = {
  funcional: {
    familias: ['ui', 'aviso', 'acesso'],
    tamanhos: [16, 20, 24],
    onde: 'botão, campo, aba, menu, tabela, feedback',
    regra: 'legibilidade acima de personalidade — no máximo 3 elementos'
  },
  expressivo: {
    familias: ['marca', 'simbolos', 'mapa', 'doces', 'salgados', 'bebidas', 'combos', 'sweet-gift', 'mecanica', 'premios', 'topicos', 'redes', 'comercial'],
    tamanhos: [24, 32, 48],
    onde: 'card, cabeça de seção, disco colorido, chapa, material impresso',
    regra: 'piso de 24px — abaixo disso o desenho perde o que o torna autoral'
  }
};

export const SCW_ICONS = {
  // ---------- ui (funcional) ----------
  'ui/seta-direita': "<path d=\"M5.6 16h17.2\"></path><path d=\"M16.4 9 23.6 16l-7.2 7\"></path>",
  'ui/seta-esquerda': "<path d=\"M26.4 16H9.2\"></path><path d=\"M15.6 9 8.4 16l7.2 7\"></path>",
  'ui/seta-diagonal': "<path d=\"M8.6 23.4 22.8 9.2\"></path><path d=\"M12.6 9.2h10.2v10.2\"></path>",
  'ui/abrir': "<path d=\"M6.8 12.6 16 21.8l9.2-9.2\"></path>",
  'ui/recolher': "<path d=\"M6.8 19.4 16 10.2l9.2 9.2\"></path>",
  'ui/fechar': "<path d=\"M8.8 8.8 23.2 23.2M23.2 8.8 8.8 23.2\"></path>",
  'ui/menu': "<path d=\"M5.4 10.4h21.2M5.4 16h21.2M5.4 21.6h13.6\"></path>",
  'ui/mais': "<path d=\"M16 5.8v20.4M5.8 16h20.4\"></path>",
  'ui/menos': "<path d=\"M5.8 16h20.4\"></path>",
  'ui/feito': "<path d=\"M6.2 17.2 12.6 23.6 25.8 9.4\"></path>",
  'ui/busca': "<circle cx=\"13.4\" cy=\"13.4\" r=\"8.4\"></circle><path d=\"M19.6 19.6 26.8 26.8\"></path>",
  'ui/filtro': "<path d=\"M8 5.4v21.2M16 5.4v21.2M24 5.4v21.2\"></path><circle cx=\"8\" cy=\"11\" r=\"3.4\" fill=\"currentColor\" stroke=\"none\"></circle><circle cx=\"16\" cy=\"20.2\" r=\"3.4\" fill=\"currentColor\" stroke=\"none\"></circle><circle cx=\"24\" cy=\"14.2\" r=\"3.4\" fill=\"currentColor\" stroke=\"none\"></circle>",
  'ui/ordenar': "<path d=\"M4.6 9.8h13.2M4.6 16h9M4.6 22.2h5\"></path><path d=\"M23.4 8.6v14.8\"></path><path d=\"M19.6 19.8 23.4 23.6l3.8-3.8\"></path>",
  'ui/calendario': "<path d=\"M5.4 9.4h21.2a2.4 2.4 0 0 1 2.4 2.4v13.8a2.4 2.4 0 0 1-2.4 2.4H5.4A2.4 2.4 0 0 1 3 25.6V11.8a2.4 2.4 0 0 1 2.4-2.4Z\"></path><path d=\"M3 15.4h26\"></path><path d=\"M10.2 5v6.2M21.8 5v6.2\"></path><circle cx=\"16\" cy=\"21.6\" r=\"2.8\" fill=\"currentColor\" stroke=\"none\"></circle>",
  'ui/horario': "<circle cx=\"16\" cy=\"17.4\" r=\"10.4\"></circle><path d=\"M16 12v5.4l4.2 2.6\"></path><path d=\"M13.6 3.4h4.8M16 5v2.6\"></path>",
  'ui/local': "<path d=\"M16 28.4s8.6-9.6 8.6-15.6a8.6 8.6 0 1 0-17.2 0c0 6 8.6 15.6 8.6 15.6Z\"></path><rect x=\"12.4\" y=\"9.2\" width=\"7.2\" height=\"7.2\" rx=\"2\" fill=\"currentColor\" stroke=\"none\"></rect>",
  'ui/link-externo': "<path d=\"M18.6 4.8h8.6v8.6\"></path><path d=\"M27.2 4.8 16 16\"></path><path d=\"M22.6 18.4V25a2.6 2.6 0 0 1-2.6 2.6H7A2.6 2.6 0 0 1 4.4 25V12a2.6 2.6 0 0 1 2.6-2.6h6.6\"></path>",
  'ui/baixar': "<path d=\"M16 5v14.4\"></path><path d=\"M9.4 13.6 16 20.2l6.6-6.6\"></path><path d=\"M6 25.8h20\"></path>",
  'ui/compartilhar': "<circle cx=\"7.6\" cy=\"16\" r=\"3.4\" fill=\"currentColor\" stroke=\"none\"></circle><circle cx=\"23.6\" cy=\"8.2\" r=\"3.4\" fill=\"currentColor\" stroke=\"none\"></circle><circle cx=\"23.6\" cy=\"23.8\" r=\"3.4\" fill=\"currentColor\" stroke=\"none\"></circle><path d=\"M11 14.4l9.2-4.4M11 17.6l9.2 4.4\"></path>",
  'ui/play': "<path d=\"M11.4 7.2 25 16l-13.6 8.8Z\" fill=\"currentColor\" stroke=\"none\"></path>",
  'ui/pausa': "<path d=\"M12.2 7.6v16.8M19.8 7.6v16.8\"></path>",
  'ui/favorito': "<path d=\"M16 27 5.4 16.4a6.3 6.3 0 0 1 8.9-8.9L16 9.2l1.7-1.7a6.3 6.3 0 0 1 8.9 8.9L16 27Z\"></path>",

  // ---------- aviso (funcional) ----------
  'aviso/sucesso': "<circle cx=\"16\" cy=\"16\" r=\"11.8\"></circle><path d=\"M10.4 16.4l4 4 7.2-8.4\"></path>",
  'aviso/alerta': "<path d=\"M16 5.2 28.8 26.8H3.2L16 5.2Z\"></path><path d=\"M16 13v5.6\"></path><circle cx=\"16\" cy=\"22.6\" r=\"1.5\" fill=\"currentColor\" stroke=\"none\"></circle>",
  'aviso/erro': "<circle cx=\"16\" cy=\"16\" r=\"11.8\"></circle><path d=\"M11.4 11.4 20.6 20.6M20.6 11.4 11.4 20.6\"></path>",
  'aviso/informacao': "<circle cx=\"16\" cy=\"16\" r=\"11.8\"></circle><path d=\"M16 14.8V22\"></path><circle cx=\"16\" cy=\"10.2\" r=\"1.5\" fill=\"currentColor\" stroke=\"none\"></circle>",

  // ---------- acesso (funcional) ----------
  'acesso/acessibilidade': "<circle cx=\"16\" cy=\"6.6\" r=\"2.7\" fill=\"currentColor\" stroke=\"none\"></circle><path d=\"M5.6 12.6h20.8\"></path><path d=\"M16 12.6v7.4\"></path><path d=\"M10.8 27.6 16 19.8l5.2 7.8\"></path>",
  'acesso/legenda': "<path d=\"M5 7.6h22a2.2 2.2 0 0 1 2.2 2.2v12.4a2.2 2.2 0 0 1-2.2 2.2H5A2.2 2.2 0 0 1 2.8 22.2V9.8A2.2 2.2 0 0 1 5 7.6Z\"></path><path d=\"M8.4 18.4h6.4M17.2 18.4h6.4\"></path>",
  'acesso/reduzir-movimento': "<path d=\"M4.6 20.6c4-6.8 8-10 11.4-10s7.4 3.2 11.4 10\"></path><path d=\"M8.6 8.6 23.4 23.4\"></path>",

  // ---------- marca (expressivo) ----------
  'marca/selo': "<circle cx=\"16\" cy=\"16\" r=\"11.8\" stroke-dasharray=\"0.1 6\"></circle><circle cx=\"16\" cy=\"16\" r=\"5.8\"></circle><circle cx=\"16\" cy=\"16\" r=\"1.9\" fill=\"currentColor\" stroke=\"none\"></circle>",
  'marca/estrela': "<path d=\"M16 3.4C18.6 10.6 21.4 13.4 28.6 16 21.4 18.6 18.6 21.4 16 28.6 13.4 21.4 10.6 18.6 3.4 16 10.6 13.4 13.4 10.6 16 3.4Z\"></path>",
  'marca/flor': "<circle cx=\"16\" cy=\"8\" r=\"4.9\" fill=\"currentColor\" stroke=\"none\"></circle><circle cx=\"23.6\" cy=\"13.5\" r=\"4.9\" fill=\"currentColor\" stroke=\"none\"></circle><circle cx=\"20.7\" cy=\"22.5\" r=\"4.9\" fill=\"currentColor\" stroke=\"none\"></circle><circle cx=\"11.3\" cy=\"22.5\" r=\"4.9\" fill=\"currentColor\" stroke=\"none\"></circle><circle cx=\"8.4\" cy=\"13.5\" r=\"4.9\" fill=\"currentColor\" stroke=\"none\"></circle>",
  'marca/coracao': "<path d=\"M16 27.2 5.2 16.4a6.4 6.4 0 0 1 9-9l1.8 1.8 1.8-1.8a6.4 6.4 0 0 1 9 9Z\" fill=\"currentColor\" stroke=\"none\"></path>",

  // ---------- simbolos (expressivo · exclusivos do festival) ----------
  'simbolos/sweet-lovers': "<circle cx=\"16\" cy=\"8.8\" r=\"3.8\" fill=\"currentColor\" stroke=\"none\"></circle><circle cx=\"6.6\" cy=\"14.8\" r=\"3.2\" fill=\"currentColor\" stroke=\"none\"></circle><circle cx=\"25.4\" cy=\"14.8\" r=\"3.2\" fill=\"currentColor\" stroke=\"none\"></circle><path d=\"M9.4 27a6.8 6.8 0 0 1 13.2 0\"></path><path d=\"M2.4 23.6a5.2 5.2 0 0 1 4.6-3.4M29.6 23.6a5.2 5.2 0 0 0-4.6-3.4\" stroke-width=\"2.4\"></path>",
  'simbolos/rota-da-docura': "<path d=\"M5.4 26c3.6-.5 5.8-2.7 6.4-6.4.6-3.6 2.8-5.8 6.4-6.4\" stroke-width=\"4\" stroke-dasharray=\"0.1 6\"></path><path fill=\"currentColor\" stroke=\"none\" fill-rule=\"evenodd\" d=\"M23.6 15s5-5.6 5-9.2a5 5 0 1 0-10 0c0 3.6 5 9.2 5 9.2Zm0-11.3a2.1 2.1 0 1 0 0 4.2 2.1 2.1 0 0 0 0-4.2Z\"></path>",
  'simbolos/combo-oficial': "<circle cx=\"16\" cy=\"16\" r=\"12.2\" stroke-dasharray=\"0.1 6.2\"></circle><path d=\"M10.8 16.4l4.2 4.2 6.6-8\"></path>",
  'simbolos/estabelecimento': "<path d=\"M5 13.6h22v12.6a1.6 1.6 0 0 1-1.6 1.6H6.6A1.6 1.6 0 0 1 5 26.2Z\"></path><path d=\"M3.4 13.6 6.4 5.6h19.2l3 8\"></path><path d=\"M13.2 27.8v-6.6h5.6v6.6Z\" fill=\"currentColor\" stroke=\"none\"></path>",
  'simbolos/avaliacao-do-publico': "<circle cx=\"16\" cy=\"16\" r=\"12.6\" stroke-width=\"3\" stroke-dasharray=\"0.1 6.4\"></circle><path fill=\"currentColor\" stroke=\"none\" d=\"M16 9 17.7 13.65 22.66 13.84 18.76 16.9 20.11 21.66 16 18.9 11.89 21.66 13.24 16.9 9.34 13.84 14.3 13.65Z\"></path>",
  'simbolos/destaque': "<circle cx=\"16\" cy=\"16\" r=\"11.8\"></circle><path fill=\"currentColor\" stroke=\"none\" d=\"M16 8.2c1.4 4 3.6 6.2 7.6 7.6-4 1.4-6.2 3.6-7.6 7.6-1.4-4-3.6-6.2-7.6-7.6 4-1.4 6.2-3.6 7.6-7.6Z\"></path>",
  'simbolos/edicao': "<path d=\"M16 4.4 28.6 11.2 16 18 3.4 11.2Z\"></path><path d=\"M3.4 16.6 16 23.4l12.6-6.8\"></path><path d=\"M3.4 21.6 16 28.4l12.6-6.8\"></path>",
  'simbolos/memoria': "<path d=\"M16 9.4c-3.2-2.6-7-3.4-11.4-2.6v16.4c4.4-.8 8.2 0 11.4 2.6Z\"></path><path d=\"M16 9.4c3.2-2.6 7-3.4 11.4-2.6v16.4c-4.4-.8-8.2 0-11.4 2.6Z\"></path>",
  'simbolos/feito-com-amor': "<path d=\"M16 27 5.4 16.4a6.3 6.3 0 0 1 8.9-8.9L16 9.2l1.7-1.7a6.3 6.3 0 0 1 8.9 8.9L16 27Z\"></path><path d=\"M16 22.4 10.2 16.6\" stroke-width=\"2.4\" stroke-dasharray=\"0.1 4.2\"></path>",
  'simbolos/descobrir': "<path d=\"M2.8 16S7.4 8.6 16 8.6 29.2 16 29.2 16 24.6 23.4 16 23.4 2.8 16 2.8 16Z\"></path><circle cx=\"16\" cy=\"16\" r=\"3.4\" fill=\"currentColor\" stroke=\"none\"></circle>",

  // ---------- mapa (expressivo) ----------
  'mapa/mapa': "<path d=\"M3.4 8.4 12.8 5.4l15.8 3v18l-15.8-3-9.4 3Z\"></path><path d=\"M12.8 5.4v18\"></path>",
  'mapa/ponto': "<path d=\"M16 25.6s7.8-8.8 7.8-14.2a7.8 7.8 0 1 0-15.6 0c0 5.4 7.8 14.2 7.8 14.2Z\"></path><rect x=\"12.8\" y=\"8.2\" width=\"6.4\" height=\"6.4\" rx=\"1.8\" fill=\"currentColor\" stroke=\"none\"></rect><path d=\"M10.4 29.2h11.2\"></path>",
  'mapa/trajeto': "<circle cx=\"6.4\" cy=\"24.6\" r=\"3\" fill=\"currentColor\" stroke=\"none\"></circle><circle cx=\"25.6\" cy=\"7.4\" r=\"3\" fill=\"currentColor\" stroke=\"none\"></circle><path d=\"M9.8 22.4c3-2.4 3.4-6.2 6.2-8.2 2.8-2 3.6-3.8 6.4-5.4\" stroke-width=\"4\" stroke-dasharray=\"0.1 6\"></path>",
  'mapa/bairro': "<path d=\"M4.6 4.8h22.8v22.4H4.6Z\"></path><path d=\"M4.6 15.4h22.8M15.4 15.4v11.8\"></path>",
  'mapa/distancia': "<path d=\"M5.4 16h21.2\"></path><path d=\"M5.4 10.4v11.2M26.6 10.4v11.2\"></path><circle cx=\"16\" cy=\"16\" r=\"2.4\" fill=\"currentColor\" stroke=\"none\"></circle>",

  // ---------- doces (expressivo) ----------
  'doces/cupcake': "<path d=\"M7 13.4a9 9 0 0 1 18 0Z\"></path><path d=\"M7.8 13.4h16.4l-2 11.6a2.2 2.2 0 0 1-2.2 1.8h-8a2.2 2.2 0 0 1-2.2-1.8Z\"></path><path d=\"M13.4 17.6l-.6 6.2M18.6 17.6l.6 6.2\" stroke-width=\"2.4\"></path>",
  'doces/bolo': "<path d=\"M6 15.4h20v8a2.4 2.4 0 0 1-2.4 2.4H8.4A2.4 2.4 0 0 1 6 23.4Z\"></path><path d=\"M6 15.4c0-3.2 4.5-5.8 10-5.8s10 2.6 10 5.8\"></path><path d=\"M11.6 20.4h8.8\" stroke-width=\"2.4\"></path><path d=\"M4.4 27.6h23.2\"></path>",
  'doces/torta': "<path d=\"M16 16 27.6 16A11.6 11.6 0 1 1 21.8 5.9Z\"></path>",
  'doces/fatia-de-bolo': "<path d=\"M5.6 24.4 24.4 10.4v14H5.6Z\"></path><path d=\"M11.4 20.4h13\" stroke-width=\"2.4\"></path><circle cx=\"21.4\" cy=\"5.8\" r=\"2.1\" fill=\"currentColor\" stroke=\"none\"></circle><path d=\"M4 27.6h24\"></path>",
  'doces/donut': "<path fill=\"currentColor\" stroke=\"none\" fill-rule=\"evenodd\" d=\"M16 4.4a11.6 11.6 0 1 1 0 23.2 11.6 11.6 0 0 1 0-23.2Zm0 7.6a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z\"></path>",
  'doces/macaron': "<path d=\"M6.2 14.4a9.8 9.8 0 0 1 19.6 0Z\"></path><path d=\"M25.8 19.6a9.8 9.8 0 0 1-19.6 0Z\"></path><rect x=\"7.4\" y=\"15.6\" width=\"17.2\" height=\"2.8\" rx=\"1.4\" fill=\"currentColor\" stroke=\"none\"></rect>",
  'doces/brigadeiro': "<path d=\"M7.6 17.4h16.8l-1.9 8.6a2 2 0 0 1-2 1.6h-9a2 2 0 0 1-2-1.6Z\"></path><circle cx=\"16\" cy=\"14.4\" r=\"6.6\"></circle>",
  'doces/cookie': "<circle cx=\"16\" cy=\"16\" r=\"11\"></circle><circle cx=\"12.4\" cy=\"13.2\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"></circle><circle cx=\"19.6\" cy=\"14.6\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"></circle><circle cx=\"14.6\" cy=\"20.4\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"></circle>",
  'doces/sorvete': "<path d=\"M6.6 17.6a9.4 9.4 0 0 1 18.8 0Z\"></path><path d=\"M10.6 17.6 16 28.4l5.4-10.8\"></path><path d=\"M16 8.6v9\" stroke-width=\"2.4\"></path>",
  'doces/paleta': "<path d=\"M10.4 4.6h11.2a2.8 2.8 0 0 1 2.8 2.8v11.2a2.8 2.8 0 0 1-2.8 2.8H10.4a2.8 2.8 0 0 1-2.8-2.8V7.4a2.8 2.8 0 0 1 2.8-2.8Z\"></path><rect x=\"9.4\" y=\"14.4\" width=\"13.2\" height=\"2.6\" rx=\"1.3\" fill=\"currentColor\" stroke=\"none\"></rect><path d=\"M16 21.4v6.2\"></path>",
  'doces/chocolate': "<path d=\"M6.4 8.6h19.2a2 2 0 0 1 2 2v10.8a2 2 0 0 1-2 2H6.4a2 2 0 0 1-2-2V10.6a2 2 0 0 1 2-2Z\"></path><path d=\"M16 8.6v14.8\" stroke-width=\"2.4\"></path>",
  'doces/croissant': "<path d=\"M4.6 21.6c.8-7 5.8-11.8 11.4-11.8s10.6 4.8 11.4 11.8c-3.4 1.5-5-1.8-6.8-1.8s-2.8 2-4.6 2-2.8-2-4.6-2-3.6 3.3-6.8 1.8Z\"></path><path d=\"M11.4 12.4c1 2.6.8 5.2-.4 7.4M20.6 12.4c-1 2.6-.8 5.2.4 7.4\" stroke-width=\"2.4\"></path>",
  'doces/pudim': "<path d=\"M8.6 12.4h14.8l-1.8 11.8a2.4 2.4 0 0 1-2.4 2h-6.4a2.4 2.4 0 0 1-2.4-2Z\"></path><path d=\"M7.6 12.4h16.8\"></path><path d=\"M5.4 27.4h21.2\"></path>",

  // ---------- salgados (expressivo) ----------
  'salgados/coxinha': "<path d=\"M16 4.2c4.6 5.8 8 10.4 8 15a8 8 0 0 1-16 0c0-4.6 3.4-9.2 8-15Z\"></path><path d=\"M9.4 27.4h13.2\"></path>",
  'salgados/pao-de-queijo': "<circle cx=\"11.4\" cy=\"18.4\" r=\"7.6\"></circle><circle cx=\"22.4\" cy=\"12\" r=\"6.4\"></circle>",
  'salgados/sanduiche': "<path d=\"M4.4 12.4 16 6.2l11.6 6.2L16 18.6Z\"></path><path d=\"M6.4 16.6 16 21.6l9.6-5M6.4 20.6 16 25.6l9.6-5\" stroke-width=\"2.8\"></path>",
  'salgados/torrada': "<path d=\"M8.4 13.4c0-2-3.2-2.4-3.2-5 0-2.8 4.8-4.6 10.8-4.6s10.8 1.8 10.8 4.6c0 2.6-3.2 3-3.2 5v10a2.6 2.6 0 0 1-2.6 2.6H11a2.6 2.6 0 0 1-2.6-2.6Z\"></path><circle cx=\"16\" cy=\"17.6\" r=\"3.6\" fill=\"currentColor\" stroke=\"none\"></circle>",
  'salgados/quiche': "<path d=\"M5.2 14.8h21.6l-2 11a2.4 2.4 0 0 1-2.4 1.9H9.6a2.4 2.4 0 0 1-2.4-1.9Z\"></path><path d=\"M5.6 14.8c1.8-2.6 3.8-2.6 5.6 0s3.9 2.6 5.7 0 3.9-2.6 5.7 0\" stroke-width=\"2.4\"></path>",
  'salgados/pizza': "<path d=\"M5.4 8.4h21.2L16 27.6Z\"></path><path d=\"M7.4 11.6h17.2\" stroke-width=\"2.4\"></path><circle cx=\"16\" cy=\"17.4\" r=\"2.3\" fill=\"currentColor\" stroke=\"none\"></circle>",
  'salgados/porcao': "<path d=\"M11 12.6h10l-1.5 13.2a2.2 2.2 0 0 1-2.2 1.9h-2.6a2.2 2.2 0 0 1-2.2-1.9Z\"></path><path d=\"M12.8 12.6V6.4M16 12.6V4.2M19.2 12.6V7.4\"></path>",
  'salgados/pastel': "<path d=\"M6.4 10.4h19.2a2.2 2.2 0 0 1 2.2 2.2v6.8a2.2 2.2 0 0 1-2.2 2.2H6.4a2.2 2.2 0 0 1-2.2-2.2v-6.8a2.2 2.2 0 0 1 2.2-2.2Z\"></path><path d=\"M22.4 10.4v11.2\" stroke-width=\"2.4\" stroke-dasharray=\"0.1 4\"></path>",
  'salgados/bowl': "<path d=\"M4.4 15.4h23.2a11.6 11.6 0 0 1-23.2 0Z\"></path><circle cx=\"10.6\" cy=\"11.8\" r=\"2.6\" fill=\"currentColor\" stroke=\"none\"></circle><circle cx=\"16\" cy=\"10.4\" r=\"2.6\" fill=\"currentColor\" stroke=\"none\"></circle><circle cx=\"21.4\" cy=\"11.8\" r=\"2.6\" fill=\"currentColor\" stroke=\"none\"></circle>",
  'salgados/brunch': "<circle cx=\"16\" cy=\"16\" r=\"11.6\"></circle><circle cx=\"12.2\" cy=\"15.4\" r=\"3\" fill=\"currentColor\" stroke=\"none\"></circle><circle cx=\"19.8\" cy=\"17\" r=\"3\" fill=\"currentColor\" stroke=\"none\"></circle>",

  // ---------- bebidas (expressivo) ----------
  'bebidas/espresso': "<path d=\"M7.4 12h11.2v4a5.6 5.6 0 0 1-11.2 0Z\"></path><path d=\"M18.6 13.8h2.2a2.8 2.8 0 0 1 0 5.6h-2.2\"></path><path d=\"M5.4 26.6h15.6\"></path>",
  'bebidas/coado': "<path d=\"M9 16.4h14l1.4 8.4a2.2 2.2 0 0 1-2.2 2.6H9.8a2.2 2.2 0 0 1-2.2-2.6Z\"></path><path d=\"M6.6 8.6h18.8l-5.6 8.8H12.2Z\"></path>",
  'bebidas/cappuccino': "<path d=\"M6 12h13.6v4.4a6.8 6.8 0 0 1-13.6 0Z\"></path><path d=\"M19.6 13.8h2.2a2.8 2.8 0 0 1 0 5.6h-2.2\"></path><path d=\"M4.4 27.8h17.2\"></path><path d=\"M11 7.6c-1.7-1.5-1.7-3.2 0-4.7M16.2 7.6c-1.7-1.5-1.7-3.2 0-4.7\" stroke-width=\"2.4\"></path>",
  'bebidas/latte-art': "<circle cx=\"16\" cy=\"16\" r=\"11.6\"></circle><path fill=\"currentColor\" stroke=\"none\" d=\"M16 21.8 11.2 17a3.4 3.4 0 0 1 4.8-4.8 3.4 3.4 0 0 1 4.8 4.8Z\"></path>",
  'bebidas/cafe-gelado': "<path d=\"M9.4 10.4h13.2l-1.4 15.2a2.2 2.2 0 0 1-2.2 2h-6a2.2 2.2 0 0 1-2.2-2Z\"></path><rect x=\"12\" y=\"13.6\" width=\"4.4\" height=\"4.4\" rx=\"1\" fill=\"currentColor\" stroke=\"none\"></rect><rect x=\"16.6\" y=\"18.8\" width=\"4\" height=\"4\" rx=\"1\" fill=\"currentColor\" stroke=\"none\"></rect><path d=\"M19.6 10.4 22.4 4.4\"></path>",
  'bebidas/para-viagem': "<path d=\"M9.4 11.4h13.2l-1.6 14.2a2.2 2.2 0 0 1-2.2 2h-5.6a2.2 2.2 0 0 1-2.2-2Z\"></path><path d=\"M7.4 9.4h17.2\"></path><path d=\"M10.8 18.6h10.4\" stroke-width=\"2.4\"></path>",
  'bebidas/cha': "<path d=\"M6.6 12h11.8v4a5.9 5.9 0 0 1-11.8 0Z\"></path><path d=\"M18.4 13.8h1.8a2.3 2.3 0 0 1 0 4.6h-1.8\"></path><path d=\"M5 26.6h15\"></path><path d=\"M13 12V8.4h4.2V6\" stroke-width=\"2.4\"></path><rect x=\"17.4\" y=\"2.6\" width=\"5.4\" height=\"4\" rx=\"1.2\" fill=\"currentColor\" stroke=\"none\"></rect>",
  'bebidas/milk-shake': "<path d=\"M9.4 13.4h13.2l-1.5 12.8a2 2 0 0 1-2 1.8h-6.2a2 2 0 0 1-2-1.8Z\"></path><path d=\"M9 13.4a7 7 0 0 1 14 0\"></path><path d=\"M20.4 12.4 23.6 5.2\"></path><circle cx=\"12.6\" cy=\"9.4\" r=\"2.2\" fill=\"currentColor\" stroke=\"none\"></circle>",
  'bebidas/suco': "<path d=\"M10.4 10.6h11.2l-1.2 15.2a2 2 0 0 1-2 1.9h-4.8a2 2 0 0 1-2-1.9Z\"></path><path d=\"M10.9 16.4h10.2\" stroke-width=\"2.4\"></path><path d=\"M18.6 10.6 21.6 4.4\"></path>",
  'bebidas/chocolate-quente': "<path d=\"M6.6 12.4h12.4v4.4a6.2 6.2 0 0 1-12.4 0Z\"></path><path d=\"M19 14.2h2a2.4 2.4 0 0 1 0 4.8h-2\"></path><circle cx=\"10.6\" cy=\"10\" r=\"2.4\" fill=\"currentColor\" stroke=\"none\"></circle><circle cx=\"15.4\" cy=\"9.4\" r=\"2.4\" fill=\"currentColor\" stroke=\"none\"></circle><path d=\"M5 26.8h16\"></path>",
  'bebidas/drinque': "<path d=\"M6.4 6.6h19.2L16 16.6Z\"></path><path d=\"M16 16.6V26\"></path><path d=\"M11.4 26.6h9.2\"></path><circle cx=\"16\" cy=\"10.6\" r=\"2.2\" fill=\"currentColor\" stroke=\"none\"></circle>",

  // ---------- combos (expressivo) ----------
  'combos/doce-cafe': "<path fill=\"currentColor\" stroke=\"none\" d=\"M3.1 17.6h9l-1.1 6.4a1.5 1.5 0 0 1-1.5 1.2H5.7a1.5 1.5 0 0 1-1.5-1.2Z\"></path><path fill=\"currentColor\" stroke=\"none\" d=\"M2.2 17.6a5.4 5.4 0 0 1 10.8 0Z\"></path><path stroke-width=\"1.6\" d=\"M6.2 20l-.35 3.2M9 20l.35 3.2\"></path><path fill=\"currentColor\" stroke=\"none\" d=\"M18.2 13.4h9.6l-1.3 9.8a2 2 0 0 1-2 1.8h-3a2 2 0 0 1-2-1.8Z\"></path><path stroke-width=\"2.6\" d=\"M28.2 16.2h.6a2.2 2.2 0 0 1 0 4.4h-1\"></path><path d=\"M1.8 27.4h28.4\"></path>",
  'combos/salgado-bebida': "<path fill=\"currentColor\" stroke=\"none\" d=\"M11 4.6c2.8 3.8 4.8 6.6 4.8 9a4.8 4.8 0 0 1-9.6 0c0-2.4 2-5.2 4.8-9Z\"></path><path fill=\"currentColor\" stroke=\"none\" d=\"M18.6 8h8.8l-1.2 10.4h-6.4Z\"></path><path stroke-width=\"2.4\" d=\"M27.6 10.8h.6a2.1 2.1 0 0 1 0 4.2h-.9\"></path><path d=\"M3.6 22.4h24.8\"></path><path d=\"M6.6 27.4h18.8\"></path>",
  'combos/para-dois': "<path fill=\"currentColor\" stroke=\"none\" d=\"M2.4 12h9.6l-1.2 9.4a2 2 0 0 1-2 1.7H5.6a2 2 0 0 1-2-1.7Z\"></path><path fill=\"currentColor\" stroke=\"none\" d=\"M20 12h9.6l-1.2 9.4a2 2 0 0 1-2 1.7h-3.2a2 2 0 0 1-2-1.7Z\"></path><path fill=\"currentColor\" stroke=\"none\" d=\"M16 10.2 12.9 7.1a2.2 2.2 0 0 1 3.1-3.1 2.2 2.2 0 0 1 3.1 3.1Z\"></path><path d=\"M2 26.4h28\"></path>",
  'combos/trio': "<path fill=\"currentColor\" stroke=\"none\" d=\"M2.6 17h7.4l-.8 4.6a1.3 1.3 0 0 1-1.3 1.1H4.7a1.3 1.3 0 0 1-1.3-1.1Z\"></path><circle cx=\"6.3\" cy=\"14\" r=\"3.4\" fill=\"currentColor\" stroke=\"none\"></circle><path fill=\"currentColor\" stroke=\"none\" d=\"M12 22.6 16.2 10.2l4.2 12.4Z\"></path><path fill=\"currentColor\" stroke=\"none\" d=\"M22.6 14.6h7.6l-1 6.8a1.4 1.4 0 0 1-1.4 1.2h-2.8a1.4 1.4 0 0 1-1.4-1.2Z\"></path><path d=\"M1.6 25.8h28.8\"></path>",
  'combos/mini': "<path d=\"M6.4 8.4v15.2M25.6 8.4v15.2\"></path><path fill=\"currentColor\" stroke=\"none\" d=\"M12 17.2h8l-.9 4.8a1.5 1.5 0 0 1-1.5 1.3h-3.2a1.5 1.5 0 0 1-1.5-1.3Z\"></path><circle cx=\"16\" cy=\"14\" r=\"3.7\" fill=\"currentColor\" stroke=\"none\"></circle>",
  'combos/combo-do-dia': "<path d=\"M6 20.4a10 10 0 0 1 20 0Z\"></path><circle cx=\"16\" cy=\"7.4\" r=\"2\" fill=\"currentColor\" stroke=\"none\"></circle><path d=\"M3.4 20.4h25.2\"></path><path d=\"M6.6 25.4h18.8\"></path>",

  // ---------- sweet-gift (expressivo) ----------
  'sweet-gift/caixa-fechada': "<path d=\"M5.6 13.4h20.8v11.8a2 2 0 0 1-2 2H7.6a2 2 0 0 1-2-2Z\"></path><path d=\"M4 11.4h24\"></path><path d=\"M16 11.4v15.8\" stroke-width=\"2.4\"></path><path fill=\"currentColor\" stroke=\"none\" d=\"M16 9.4c-2.6-3.4-5.6-4.4-6.4-2.4-.8 2 2.6 2.4 6.4 2.4Zm0 0c2.6-3.4 5.6-4.4 6.4-2.4.8 2-2.6 2.4-6.4 2.4Z\"></path>",
  'sweet-gift/caixa-aberta': "<path d=\"M6 16.4h20v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z\"></path><path d=\"M4.4 10.6 27.6 8\"></path><circle cx=\"11.6\" cy=\"20.6\" r=\"2.4\" fill=\"currentColor\" stroke=\"none\"></circle><circle cx=\"20.4\" cy=\"20.6\" r=\"2.4\" fill=\"currentColor\" stroke=\"none\"></circle>",
  'sweet-gift/laco': "<path fill=\"currentColor\" stroke=\"none\" d=\"M14.2 14.4C10.8 10 5 9.2 5 13.2s5.6 5.4 9.2 1.2ZM17.8 14.4C21.2 10 27 9.2 27 13.2s-5.6 5.4-9.2 1.2Z\"></path><circle cx=\"16\" cy=\"15.4\" r=\"2.4\" fill=\"currentColor\" stroke=\"none\"></circle><path d=\"M14.2 18.4 10.4 26.6M17.8 18.4 21.6 26.6\"></path>",
  'sweet-gift/doces-da-caixa': "<path d=\"M4.4 9.4h23.2a2 2 0 0 1 2 2v11.2a2 2 0 0 1-2 2H4.4a2 2 0 0 1-2-2V11.4a2 2 0 0 1 2-2Z\"></path><circle cx=\"8.6\" cy=\"16.8\" r=\"2.7\" fill=\"currentColor\" stroke=\"none\"></circle><circle cx=\"16\" cy=\"16.8\" r=\"2.7\" fill=\"currentColor\" stroke=\"none\"></circle><circle cx=\"23.4\" cy=\"16.8\" r=\"2.7\" fill=\"currentColor\" stroke=\"none\"></circle>",
  'sweet-gift/caixa-com-alca': "<path d=\"M8.4 12.4h17.2v13a2 2 0 0 1-2 2H10.4a2 2 0 0 1-2-2Z\"></path><path d=\"M13.6 12.4V9.8a3.4 3.4 0 0 1 6.8 0v2.6\"></path>",
  'sweet-gift/cartaozinho': "<path d=\"M5.4 8.6h21.2a2 2 0 0 1 2 2v11.6a2 2 0 0 1-2 2H5.4a2 2 0 0 1-2-2V10.6a2 2 0 0 1 2-2Z\"></path><path d=\"M8 13.8h8.4M8 18.4h5.4\" stroke-width=\"2.4\"></path><path fill=\"currentColor\" stroke=\"none\" d=\"M22.6 20.4 19.5 17.3a2.2 2.2 0 0 1 3.1-3.1 2.2 2.2 0 0 1 3.1 3.1Z\"></path>",
  'sweet-gift/etiqueta': "<path d=\"M27.4 15.6 16.4 26.6a2.2 2.2 0 0 1-3.1 0L5.4 18.7a2.2 2.2 0 0 1 0-3.1L16.4 4.6h9.9a1.1 1.1 0 0 1 1.1 1.1Z\"></path><circle cx=\"21.8\" cy=\"10.2\" r=\"2.2\" fill=\"currentColor\" stroke=\"none\"></circle>",
  'sweet-gift/surpresa': "<path d=\"M5.6 15.4h20.8v9.8a2 2 0 0 1-2 2H7.6a2 2 0 0 1-2-2Z\"></path><path fill=\"currentColor\" stroke=\"none\" d=\"M16 2c.9 2.7 2.3 4.1 5 5-2.7.9-4.1 2.3-5 5-.9-2.7-2.3-4.1-5-5 2.7-.9 4.1-2.3 5-5Z\"></path>",

  // ---------- mecanica (expressivo) ----------
  'mecanica/qr': "<path fill=\"currentColor\" stroke=\"none\" fill-rule=\"evenodd\" d=\"M4.6 4.6h9.4v9.4H4.6Zm2.8 2.8v3.8h3.8V7.4ZM18 4.6h9.4v9.4H18Zm2.8 2.8v3.8h3.8V7.4ZM4.6 18h9.4v9.4H4.6Zm2.8 2.8v3.8h3.8v-3.8Z\"></path><rect x=\"18\" y=\"18\" width=\"4.2\" height=\"4.2\" fill=\"currentColor\" stroke=\"none\"></rect><rect x=\"23.2\" y=\"23.2\" width=\"4.2\" height=\"4.2\" fill=\"currentColor\" stroke=\"none\"></rect>",
  'mecanica/voucher': "<path d=\"M5.4 9.6h21.2a1.8 1.8 0 0 1 1.8 1.8v3a2.8 2.8 0 0 0 0 5.4v3a1.8 1.8 0 0 1-1.8 1.8H5.4a1.8 1.8 0 0 1-1.8-1.8v-3a2.8 2.8 0 0 0 0-5.4v-3a1.8 1.8 0 0 1 1.8-1.8Z\"></path><path d=\"M19.4 11.4v9.2\" stroke-width=\"2.4\" stroke-dasharray=\"0.1 4\"></path>",
  'mecanica/entrega': "<circle cx=\"8\" cy=\"23.4\" r=\"4.2\" fill=\"currentColor\" stroke=\"none\"></circle><circle cx=\"24\" cy=\"23.4\" r=\"4.2\" fill=\"currentColor\" stroke=\"none\"></circle><path d=\"M4.4 7.6h10.4v10.4H4.4Z\"></path><path d=\"M6 21h12.8l2.8-9.4h3.6\"></path>",
  'mecanica/inscricao': "<path d=\"M7.4 4.6h17.2a2 2 0 0 1 2 2v18.8a2 2 0 0 1-2 2H7.4a2 2 0 0 1-2-2V6.6a2 2 0 0 1 2-2Z\"></path><path d=\"M10.6 11.4h10.8M10.6 16h10.8M10.6 20.6h5.4\" stroke-width=\"2.4\"></path>",
  'mecanica/guia': "<path d=\"M6.6 4.6h18.8a2 2 0 0 1 2 2v18.8a2 2 0 0 1-2 2H6.6a2 2 0 0 1-2-2V6.6a2 2 0 0 1 2-2Z\"></path><path d=\"M10.4 4.6v22.8\" stroke-width=\"2.4\"></path><path fill=\"currentColor\" stroke=\"none\" d=\"M18.6 4.6h5.6v9.6l-2.8-2.4-2.8 2.4Z\"></path>",
  'mecanica/loja': "<path d=\"M6.6 11.4h18.8l-1.4 14a2.2 2.2 0 0 1-2.2 2H10.2a2.2 2.2 0 0 1-2.2-2Z\"></path><path d=\"M11.8 11.4V9a4.2 4.2 0 0 1 8.4 0v2.4\"></path>",
  'mecanica/promocao': "<circle cx=\"16\" cy=\"16\" r=\"11.8\"></circle><path d=\"M11 21 21 11\" stroke-width=\"2.8\"></path><circle cx=\"11.8\" cy=\"12.2\" r=\"2.2\" fill=\"currentColor\" stroke=\"none\"></circle><circle cx=\"20.2\" cy=\"19.8\" r=\"2.2\" fill=\"currentColor\" stroke=\"none\"></circle>",
  'mecanica/regulamento': "<path d=\"M8.4 4.6h11.2l6.4 6.4v16.4a2 2 0 0 1-2 2H8.4a2 2 0 0 1-2-2V6.6a2 2 0 0 1 2-2Z\"></path><path d=\"M19.4 4.6v6.6h6.6\" stroke-width=\"2.4\"></path><path d=\"M10.8 20.4l3.4 3.4 7-8\" stroke-width=\"2.4\"></path>",
  'mecanica/publico': "<circle cx=\"12.4\" cy=\"10.6\" r=\"5\" fill=\"currentColor\" stroke=\"none\"></circle><path d=\"M4.6 25.6c0-4.4 3.5-7.8 7.8-7.8s7.8 3.4 7.8 7.8\"></path><circle cx=\"23.4\" cy=\"13\" r=\"3.4\" fill=\"currentColor\" stroke=\"none\"></circle><path d=\"M21.8 19.6c3.4.6 5.8 3.2 5.8 6.4\" stroke-width=\"2.4\"></path>",
  'mecanica/avaliar': "<path d=\"M4.6 8.6h22.8a2 2 0 0 1 2 2v10.8a2 2 0 0 1-2 2H4.6a2 2 0 0 1-2-2V10.6a2 2 0 0 1 2-2Z\"></path><circle cx=\"10\" cy=\"16\" r=\"2.2\" fill=\"currentColor\" stroke=\"none\"></circle><circle cx=\"16\" cy=\"16\" r=\"2.2\" fill=\"currentColor\" stroke=\"none\"></circle><circle cx=\"22\" cy=\"16\" r=\"2.2\" fill=\"currentColor\" stroke=\"none\"></circle>",

  // ---------- premios (expressivo · só no Sweet Awards) ----------
  'premios/medalha': "<path fill=\"currentColor\" stroke=\"none\" d=\"M10.4 3.8h11.2l-2.6 10.4h-6Z\"></path><circle cx=\"16\" cy=\"19.8\" r=\"7.6\"></circle><path fill=\"currentColor\" stroke=\"none\" d=\"M16 16.4l1.05 2.15 2.35.35-1.7 1.65.4 2.35-2.1-1.1-2.1 1.1.4-2.35-1.7-1.65 2.35-.35Z\"></path>",
  'premios/trofeu': "<path d=\"M10.4 5h11.2v6.6a5.6 5.6 0 0 1-11.2 0Z\"></path><path d=\"M10.4 7.4H6.6v2.6a4.4 4.4 0 0 0 3.8 4.4M21.6 7.4h3.8v2.6a4.4 4.4 0 0 1-3.8 4.4\" stroke-width=\"2.4\"></path><path d=\"M16 17.2v4.4\"></path><path d=\"M12.8 21.6 11.4 26.8M19.2 21.6l1.4 5.2M11 27.4h10\"></path>",
  'premios/coroa': "<path d=\"M4.6 23.4 6 8.6l6.6 5.6L16 5.4l3.4 8.8L26 8.6l1.4 14.8Z\"></path><path d=\"M6.6 27.4h18.8\"></path>",
  'premios/voto': "<path d=\"M5 17h22v8.6a1.9 1.9 0 0 1-1.9 1.9H6.9A1.9 1.9 0 0 1 5 25.6Z\"></path><path d=\"M11.4 21.2h9.2\" stroke-width=\"2.4\"></path><path fill=\"currentColor\" stroke=\"none\" transform=\"rotate(12 17 10)\" d=\"M12.4 4.6h9.6v11h-9.6Z\"></path>",
  'premios/curadoria': "<path d=\"M8.6 6h14.8a2 2 0 0 1 2 2v18a2 2 0 0 1-2 2H8.6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z\"></path><rect x=\"12.4\" y=\"3\" width=\"7.2\" height=\"4.4\" rx=\"1.2\" fill=\"currentColor\" stroke=\"none\"></rect><path fill=\"currentColor\" stroke=\"none\" d=\"M16 12.6c.9 2.6 2.2 3.9 4.8 4.8-2.6.9-3.9 2.2-4.8 4.8-.9-2.6-2.2-3.9-4.8-4.8 2.6-.9 3.9-2.2 4.8-4.8Z\"></path>",

  // ---------- topicos (expressivo) ----------
  'topicos/ciclo': "<path d=\"M27 16a11 11 0 0 1-18.6 8M5 16A11 11 0 0 1 23.6 8\"></path><path d=\"M8.4 19.6v4.4h4.4M23.6 12.4V8h-4.4\"></path>",
  'topicos/imprensa': "<path d=\"M4.6 7h17.2v18.4a2.4 2.4 0 0 1-2.4 2.4H7a2.4 2.4 0 0 1-2.4-2.4Z\"></path><path d=\"M21.8 12.6h3.6a2.4 2.4 0 0 1 2.4 2.4v10.4a2.4 2.4 0 0 1-4.8 0\"></path><path d=\"M8.4 11.4h9.6M8.4 16h9.6M8.4 20.6h6\" stroke-width=\"2.4\"></path>",
  'topicos/depoimento': "<path d=\"M27.4 14.6c0 5.6-5.1 10.2-11.4 10.2-1.4 0-2.7-.2-3.9-.6L5.6 27.4l2-5A9.8 9.8 0 0 1 4.6 14.6C4.6 9 9.7 4.4 16 4.4s11.4 4.6 11.4 10.2Z\"></path><rect x=\"10.8\" y=\"11.4\" width=\"3.6\" height=\"3.6\" rx=\"1\" fill=\"currentColor\" stroke=\"none\"></rect><rect x=\"17.6\" y=\"11.4\" width=\"3.6\" height=\"3.6\" rx=\"1\" fill=\"currentColor\" stroke=\"none\"></rect>",
  'topicos/video': "<path d=\"M5.6 7.4h20.8a2.4 2.4 0 0 1 2.4 2.4v12.4a2.4 2.4 0 0 1-2.4 2.4H5.6a2.4 2.4 0 0 1-2.4-2.4V9.8A2.4 2.4 0 0 1 5.6 7.4Z\"></path><path fill=\"currentColor\" stroke=\"none\" d=\"M13.4 11.4 21 16l-7.6 4.6Z\"></path>",
  'topicos/realizacao': "<path fill=\"currentColor\" stroke=\"none\" fill-rule=\"evenodd\" d=\"M16 3.4a12.6 12.6 0 1 1 0 25.2 12.6 12.6 0 0 1 0-25.2Zm6.4 8.4-8.6 9.8-4.2-4.2 2.5-2.5 1.7 1.7 6.1-6.9Z\"></path>",
  'topicos/circulacao': "<path d=\"M5.4 8.4h12.8a4.8 4.8 0 0 1 0 9.6H10a4.8 4.8 0 0 0 0 9.6h9.4\"></path><path d=\"M16.4 24.4l3 2.6-3 2.6\"></path>",
  'topicos/quem-pode': "<circle cx=\"12.6\" cy=\"10.6\" r=\"4.8\" fill=\"currentColor\" stroke=\"none\"></circle><path d=\"M4.6 24.6c0-4.4 3.6-7.8 8-7.8 1.2 0 2.4.2 3.4.6\"></path><path d=\"M18.4 21.4l3 3 5.6-6.2\"></path>",
  'topicos/alcance': "<path d=\"M5.6 12.6 21 6.4v19.2L5.6 19.4Z\"></path><path d=\"M9.4 20.6v4.4a2.2 2.2 0 0 0 4.4 0v-3\"></path><path d=\"M24.6 11.6a7.4 7.4 0 0 1 0 8.8\" stroke-width=\"2.4\"></path>",
  'topicos/quem-vive': "<circle cx=\"9.6\" cy=\"10.6\" r=\"4.4\" fill=\"currentColor\" stroke=\"none\"></circle><circle cx=\"22.4\" cy=\"10.6\" r=\"4.4\" fill=\"currentColor\" stroke=\"none\"></circle><path d=\"M3.4 24.4c0-3.6 2.8-6.4 6.2-6.4M28.6 24.4c0-3.6-2.8-6.4-6.2-6.4\"></path><path fill=\"currentColor\" stroke=\"none\" d=\"M16 27 12.2 23.2a2.7 2.7 0 0 1 3.8-3.8 2.7 2.7 0 0 1 3.8 3.8Z\"></path>",
  'topicos/proposta': "<path d=\"M7.4 4.6h11.2l6.6 6.6v16.4a2 2 0 0 1-2 2H7.4a2 2 0 0 1-2-2V6.6a2 2 0 0 1 2-2Z\"></path><path d=\"M18.6 4.6v6.6h6.6\" stroke-width=\"2.4\"></path><path d=\"M9.6 21.6c2-2.2 3.4 1.4 5.4 0s3-1.8 5-.4\" stroke-width=\"2.4\"></path>",
  'topicos/duvidas': "<path d=\"M27.4 15c0 5.6-5.1 10.2-11.4 10.2-1.3 0-2.6-.2-3.8-.6L5.6 27.6l2-5A9.7 9.7 0 0 1 4.6 15C4.6 9.4 9.7 4.8 16 4.8S27.4 9.4 27.4 15Z\"></path><path d=\"M12.8 12.4a3.4 3.4 0 0 1 6.6 1.2c0 2.2-3.2 2.6-3.2 4.4\" stroke-width=\"2.4\"></path><circle cx=\"16\" cy=\"21\" r=\"1.5\" fill=\"currentColor\" stroke=\"none\"></circle>",
  'topicos/caminhos': "<path d=\"M16 27.6V17.4l-7-7V6.6M16 17.4l7-7V6.6\"></path><path d=\"M6.4 8.8 9 6.2l2.6 2.6M20.4 8.8 23 6.2l2.6 2.6\"></path>",
  'topicos/mensagem': "<path d=\"M28.4 4.6 3.6 14.4l9.2 3.6 3.6 9.2Z\"></path><path d=\"M28.4 4.6 12.8 18\" stroke-width=\"2.4\"></path>",
  'topicos/ficha-da-edicao': "<path d=\"M6.6 6.4h18.8a2 2 0 0 1 2 2v15.2a2 2 0 0 1-2 2H6.6a2 2 0 0 1-2-2V8.4a2 2 0 0 1 2-2Z\"></path><rect x=\"8.4\" y=\"10.4\" width=\"7.2\" height=\"7.2\" rx=\"1.6\" fill=\"currentColor\" stroke=\"none\"></rect><path d=\"M18.8 11.6h5.2M18.8 15.8h5.2M8.4 21.6h15.6\" stroke-width=\"2.4\"></path>",
  'topicos/legado': "<path fill=\"currentColor\" stroke=\"none\" d=\"M16 13.4c0-4.6 3.6-8.2 8.2-8.2 0 4.6-3.6 8.2-8.2 8.2ZM16 19c0-3.8-3-6.8-6.8-6.8 0 3.8 3 6.8 6.8 6.8Z\"></path><path d=\"M16 27.4V13.4\"></path><path d=\"M9.6 27.4h12.8\"></path>",
  'topicos/tema-da-edicao': "<path d=\"M16 4.4a8.4 8.4 0 0 1 4.9 15.2v2.6h-9.8v-2.6A8.4 8.4 0 0 1 16 4.4Z\"></path><path d=\"M12.2 24.4h7.6M13.4 27.6h5.2\" stroke-width=\"2.4\"></path>",

  // ---------- redes (expressivo) ----------
  'redes/instagram': "<path d=\"M10.6 4.6h10.8a6 6 0 0 1 6 6v10.8a6 6 0 0 1-6 6H10.6a6 6 0 0 1-6-6V10.6a6 6 0 0 1 6-6Z\"></path><circle cx=\"16\" cy=\"16\" r=\"5.9\"></circle><circle cx=\"23.2\" cy=\"9.2\" r=\"1.5\" fill=\"currentColor\" stroke=\"none\"></circle>",
  'redes/conversa': "<path d=\"M27 15.6c0 5.9-4.9 10.6-11 10.6a12 12 0 0 1-3.6-.5L6 27.5l1.8-5A10.2 10.2 0 0 1 5 15.6C5 9.8 9.9 5 16 5s11 4.8 11 10.6Z\"></path><circle cx=\"11.6\" cy=\"15.6\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"></circle><circle cx=\"16\" cy=\"15.6\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"></circle><circle cx=\"20.4\" cy=\"15.6\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"></circle>",
  'redes/e-mail': "<path d=\"M6.4 7.4h19.2a2.2 2.2 0 0 1 2.2 2.2v12.8a2.2 2.2 0 0 1-2.2 2.2H6.4a2.2 2.2 0 0 1-2.2-2.2V9.6a2.2 2.2 0 0 1 2.2-2.2Z\"></path><path d=\"M4.6 9.8 16 18.6 27.4 9.8\" stroke-width=\"2.4\"></path>",
  'redes/celular': "<path d=\"M10.6 3.6h10.8a2.4 2.4 0 0 1 2.4 2.4v20a2.4 2.4 0 0 1-2.4 2.4H10.6a2.4 2.4 0 0 1-2.4-2.4V6a2.4 2.4 0 0 1 2.4-2.4Z\"></path><rect x=\"13.6\" y=\"23.8\" width=\"4.8\" height=\"2.4\" rx=\"1.2\" fill=\"currentColor\" stroke=\"none\"></rect>",
  'redes/perfil': "<circle cx=\"16\" cy=\"11\" r=\"5.4\" fill=\"currentColor\" stroke=\"none\"></circle><path d=\"M6.4 27c0-5.3 4.3-9.6 9.6-9.6s9.6 4.3 9.6 9.6\"></path>",

  // ---------- comercial (expressivo) ----------
  'comercial/patrocinador': "<path d=\"M4.6 9.4h22.8a2 2 0 0 1 2 2v11.2a2 2 0 0 1-2 2H4.6a2 2 0 0 1-2-2V11.4a2 2 0 0 1 2-2Z\"></path><path fill=\"currentColor\" stroke=\"none\" d=\"M16 12l1.5 3 3.3.5-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3-2.4-2.3 3.3-.5Z\"></path>",
  'comercial/parceiro': "<circle cx=\"12.4\" cy=\"16\" r=\"6.6\" fill=\"currentColor\" stroke=\"none\"></circle><circle cx=\"20.6\" cy=\"16\" r=\"6.6\"></circle>",
  'comercial/contrapartida': "<path d=\"M6.4 12.4h19.2\"></path><path d=\"M21.4 8.2l4.2 4.2-4.2 4.2\"></path><path d=\"M25.6 21.6H6.4\"></path><path d=\"M10.6 17.4l-4.2 4.2 4.2 4.2\"></path>",
  'comercial/midia-kit': "<path d=\"M6.6 5.6h18.8a2 2 0 0 1 2 2v16.8a2 2 0 0 1-2 2H6.6a2 2 0 0 1-2-2V7.6a2 2 0 0 1 2-2Z\"></path><rect x=\"8.6\" y=\"9.6\" width=\"8.4\" height=\"8.4\" rx=\"1.8\" fill=\"currentColor\" stroke=\"none\"></rect><path d=\"M20 11.4h3.6M20 16.2h3.6M8.6 22h15\" stroke-width=\"2.4\"></path>"
};

export const SCW_ICON_FAMILIES = {
  'ui': ['seta-direita', 'seta-esquerda', 'seta-diagonal', 'abrir', 'recolher', 'fechar', 'menu', 'mais', 'menos', 'feito', 'busca', 'filtro', 'ordenar', 'calendario', 'horario', 'local', 'link-externo', 'baixar', 'compartilhar', 'favorito', 'play', 'pausa'],
  'aviso': ['sucesso', 'alerta', 'erro', 'informacao'],
  'acesso': ['acessibilidade', 'legenda', 'reduzir-movimento'],
  'marca': ['selo', 'estrela', 'flor', 'coracao'],
  'simbolos': ['sweet-lovers', 'rota-da-docura', 'combo-oficial', 'estabelecimento', 'avaliacao-do-publico', 'destaque', 'edicao', 'memoria', 'feito-com-amor', 'descobrir'],
  'mapa': ['mapa', 'ponto', 'trajeto', 'bairro', 'distancia'],
  'doces': ['cupcake', 'bolo', 'torta', 'fatia-de-bolo', 'donut', 'macaron', 'brigadeiro', 'cookie', 'sorvete', 'paleta', 'chocolate', 'croissant', 'pudim'],
  'salgados': ['coxinha', 'pao-de-queijo', 'sanduiche', 'torrada', 'quiche', 'pizza', 'porcao', 'pastel', 'bowl', 'brunch'],
  'bebidas': ['espresso', 'coado', 'cappuccino', 'latte-art', 'cafe-gelado', 'para-viagem', 'cha', 'milk-shake', 'suco', 'chocolate-quente', 'drinque'],
  'combos': ['doce-cafe', 'salgado-bebida', 'para-dois', 'trio', 'mini', 'combo-do-dia'],
  'sweet-gift': ['caixa-fechada', 'caixa-aberta', 'laco', 'doces-da-caixa', 'caixa-com-alca', 'cartaozinho', 'etiqueta', 'surpresa'],
  'mecanica': ['qr', 'voucher', 'entrega', 'inscricao', 'guia', 'loja', 'promocao', 'regulamento', 'publico', 'avaliar'],
  'premios': ['medalha', 'trofeu', 'coroa', 'voto', 'curadoria'],
  'topicos': ['ciclo', 'imprensa', 'depoimento', 'video', 'realizacao', 'circulacao', 'quem-pode', 'alcance', 'quem-vive', 'proposta', 'duvidas', 'caminhos', 'mensagem', 'ficha-da-edicao', 'legado', 'tema-da-edicao'],
  'redes': ['instagram', 'conversa', 'e-mail', 'celular', 'perfil'],
  'comercial': ['patrocinador', 'parceiro', 'contrapartida', 'midia-kit']
};

export const SCW_FAMILY_META = {
  'ui': { titulo: 'ui', nivel: 'funcional', nota: 'Controles. 16 a 24px, dentro de botão, campo, aba e menu.' },
  'acesso': { titulo: 'acesso', nivel: 'funcional', nota: 'Acessibilidade e preferências de leitura.' },
  'aviso': { titulo: 'aviso', nivel: 'funcional', nota: 'Feedback. Nunca sozinho — sempre com texto ao lado.' },
  'simbolos': { titulo: 'símbolos', nivel: 'expressivo', nota: 'Exclusivos do festival. Valem carimbo, adesivo, sinalização e post.' },
  'marca': { titulo: 'marca', nivel: 'expressivo', nota: 'Formas da identidade. Também servem de ornamento em chapa colorida.' },
  'mapa': { titulo: 'mapa', nivel: 'expressivo', nota: 'Circulação pela cidade. Sem referência geográfica literal.' },
  'doces': { titulo: 'doces', nivel: 'expressivo', nota: 'O coração do festival. Um doce por ícone — nunca uma vitrine dentro de 32px.' },
  'salgados': { titulo: 'salgados', nivel: 'expressivo', nota: 'Contraponto ao doce. Mesma lógica de construção.' },
  'bebidas': { titulo: 'bebidas', nivel: 'expressivo', nota: 'Café em primeiro lugar. Vapor só a partir de 32px.' },
  'combos': { titulo: 'combos', nivel: 'expressivo', nota: 'Duas formas de contorno não cabem em 32px: quando o item se repete, ele vira chapado.' },
  'sweet-gift': { titulo: 'sweet gift', nivel: 'expressivo', nota: 'A caixa e o que vai dentro dela.' },
  'mecanica': { titulo: 'mecânica', nivel: 'expressivo', nota: 'Como o festival funciona: inscrição, QR, voucher, regulamento.' },
  'premios': { titulo: 'prêmios', nivel: 'expressivo', nota: 'Só no Sweet Awards. Prometer prêmio onde não existe é erro de conteúdo.' },
  'topicos': { titulo: 'tópicos', nivel: 'expressivo', nota: 'Assuntos das seções. Acompanham rótulo, nunca substituem.' },
  'redes': { titulo: 'redes', nivel: 'expressivo', nota: 'Canais. Instagram é o único com desenho de marca de terceiro.' },
  'comercial': { titulo: 'comercial', nivel: 'expressivo', nota: 'Patrocínio e parceria. Linguagem de interesse, nunca de garantia.' }
};

export const SCW_ICON_LABELS = {
  'ui/seta-direita': 'seta direita', 'ui/seta-esquerda': 'seta esquerda', 'ui/seta-diagonal': 'seta diagonal',
  'ui/abrir': 'abrir', 'ui/recolher': 'recolher', 'ui/fechar': 'fechar', 'ui/menu': 'menu',
  'ui/mais': 'mais', 'ui/menos': 'menos', 'ui/feito': 'feito', 'ui/busca': 'busca',
  'ui/filtro': 'filtro', 'ui/ordenar': 'ordenar', 'ui/calendario': 'calendário', 'ui/horario': 'horário',
  'ui/local': 'local', 'ui/link-externo': 'link externo', 'ui/baixar': 'baixar',
  'ui/compartilhar': 'compartilhar', 'ui/favorito': 'favorito',
  'ui/play': 'reproduzir', 'ui/pausa': 'pausar',
  'aviso/sucesso': 'sucesso', 'aviso/alerta': 'alerta', 'aviso/erro': 'erro', 'aviso/informacao': 'informação',
  'acesso/acessibilidade': 'acessibilidade', 'acesso/legenda': 'legenda', 'acesso/reduzir-movimento': 'reduzir movimento',
  'marca/selo': 'selo', 'marca/estrela': 'estrela', 'marca/flor': 'flor', 'marca/coracao': 'coração',
  'simbolos/sweet-lovers': 'sweet lovers', 'simbolos/rota-da-docura': 'rota da doçura',
  'simbolos/combo-oficial': 'combo oficial', 'simbolos/estabelecimento': 'estabelecimento',
  'simbolos/avaliacao-do-publico': 'avaliação do público', 'simbolos/destaque': 'destaque',
  'simbolos/edicao': 'edição', 'simbolos/memoria': 'memória', 'simbolos/feito-com-amor': 'feito com amor',
  'simbolos/descobrir': 'descobrir',
  'mapa/mapa': 'mapa', 'mapa/ponto': 'ponto no mapa', 'mapa/trajeto': 'trajeto',
  'mapa/bairro': 'bairro', 'mapa/distancia': 'distância',
  'doces/cupcake': 'cupcake', 'doces/bolo': 'bolo', 'doces/torta': 'torta',
  'doces/fatia-de-bolo': 'fatia de bolo', 'doces/donut': 'donut', 'doces/macaron': 'macaron',
  'doces/brigadeiro': 'brigadeiro', 'doces/cookie': 'cookie', 'doces/sorvete': 'sorvete',
  'doces/paleta': 'paleta', 'doces/chocolate': 'chocolate', 'doces/croissant': 'croissant',
  'doces/pudim': 'pudim',
  'salgados/coxinha': 'coxinha', 'salgados/pao-de-queijo': 'pão de queijo',
  'salgados/sanduiche': 'sanduíche', 'salgados/torrada': 'torrada', 'salgados/quiche': 'quiche',
  'salgados/pizza': 'pizza', 'salgados/porcao': 'porção', 'salgados/pastel': 'pastel',
  'salgados/bowl': 'bowl', 'salgados/brunch': 'brunch',
  'bebidas/espresso': 'espresso', 'bebidas/coado': 'coado', 'bebidas/cappuccino': 'cappuccino',
  'bebidas/latte-art': 'latte art', 'bebidas/cafe-gelado': 'café gelado',
  'bebidas/para-viagem': 'para viagem', 'bebidas/cha': 'chá', 'bebidas/milk-shake': 'milk-shake',
  'bebidas/suco': 'suco', 'bebidas/chocolate-quente': 'chocolate quente', 'bebidas/drinque': 'drinque',
  'combos/doce-cafe': 'doce + café', 'combos/salgado-bebida': 'salgado + bebida',
  'combos/para-dois': 'para dois', 'combos/trio': 'trio', 'combos/mini': 'mini',
  'combos/combo-do-dia': 'combo do dia',
  'sweet-gift/caixa-fechada': 'caixa fechada', 'sweet-gift/caixa-aberta': 'caixa aberta',
  'sweet-gift/laco': 'laço', 'sweet-gift/doces-da-caixa': 'doces da caixa',
  'sweet-gift/caixa-com-alca': 'caixa com alça', 'sweet-gift/cartaozinho': 'cartãozinho',
  'sweet-gift/etiqueta': 'etiqueta', 'sweet-gift/surpresa': 'surpresa',
  'mecanica/qr': 'QR do combo', 'mecanica/voucher': 'voucher', 'mecanica/entrega': 'entrega',
  'mecanica/inscricao': 'inscrição', 'mecanica/guia': 'guia', 'mecanica/loja': 'loja',
  'mecanica/promocao': 'promoção', 'mecanica/regulamento': 'regulamento',
  'mecanica/publico': 'público', 'mecanica/avaliar': 'avaliar',
  'premios/medalha': 'medalha', 'premios/trofeu': 'troféu', 'premios/coroa': 'coroa',
  'premios/voto': 'voto', 'premios/curadoria': 'curadoria',
  'topicos/ciclo': 'ciclo', 'topicos/imprensa': 'imprensa', 'topicos/depoimento': 'depoimento',
  'topicos/video': 'vídeo', 'topicos/realizacao': 'realização', 'topicos/circulacao': 'circulação',
  'topicos/quem-pode': 'quem pode', 'topicos/alcance': 'alcance', 'topicos/quem-vive': 'quem vive',
  'topicos/proposta': 'proposta', 'topicos/duvidas': 'dúvidas', 'topicos/caminhos': 'caminhos',
  'topicos/mensagem': 'mensagem', 'topicos/ficha-da-edicao': 'ficha da edição',
  'topicos/legado': 'legado', 'topicos/tema-da-edicao': 'tema da edição',
  'redes/instagram': 'instagram', 'redes/conversa': 'conversa', 'redes/e-mail': 'e-mail',
  'redes/celular': 'celular', 'redes/perfil': 'perfil',
  'comercial/patrocinador': 'patrocinador', 'comercial/parceiro': 'parceiro',
  'comercial/contrapartida': 'contrapartida', 'comercial/midia-kit': 'mídia kit'
};

// Gestos de movimento. Cada um tem gatilho e propósito — nenhum roda em laço solto.
export const SCW_ICON_MOTION = {
  avanco:  { duracao: 180, gatilho: 'hover', onde: 'ui/seta-*, links' },
  toque:   { duracao: 240, gatilho: 'active', onde: 'qualquer ícone dentro de botão' },
  varredura: { duracao: 520, gatilho: 'focus do campo', onde: 'ui/busca' },
  vapor:   { duracao: 2800, gatilho: 'laço, só a partir de 32px', onde: 'bebidas/*' },
  carimbo: { duracao: 420, gatilho: 'ação concluída', onde: 'simbolos/avaliacao-do-publico, aviso/sucesso' },
  rota:    { duracao: 2400, gatilho: 'enquanto visível na tela', onde: 'simbolos/rota-da-docura, mapa/trajeto', nota: 'única animação de stroke-dashoffset do sistema — exceção declarada' },
  pulso:   { duracao: 600, gatilho: 'ao favoritar', onde: 'ui/favorito, marca/coracao' }
};

// Decisões da auditoria do conjunto antigo (116 ícones, 11 famílias).
export const SCW_ICON_AUDIT = {
  removidos: [
    { nome: 'interface/som-ligado', motivo: 'resquício de player de vídeo — o site não tem áudio a controlar' },
    { nome: 'interface/som-desligado', motivo: 'idem' },
    { nome: 'topicos/o-que-e', motivo: 'três círculos genéricos, não representava nada' },
    { nome: 'topicos/participantes', motivo: 'grade de quadrados — layout de dashboard, não ícone de festival' },
    { nome: 'marca/cidade', motivo: 'silhueta de prédios lia como gráfico de barras; e referência à cidade fica na ilustração, não no ícone' }
  ],
  fundidos: [
    { de: ['marca/rota', 'topicos/jornada', 'topicos/linha-do-tempo'], para: 'mapa/trajeto + simbolos/rota-da-docura', motivo: 'três variações do mesmo pontilhado com nós' },
    { de: ['mecanica/para-levar', 'bebidas/para-viagem', 'sweet-gift/pronta-p-viagem'], para: 'bebidas/para-viagem + sweet-gift/caixa-com-alca', motivo: 'copo e caixa se repetiam em três nomes — confusão registrada no próprio guia' },
    { de: ['premios/destaque', 'marca/estrela'], para: 'simbolos/destaque + marca/estrela', motivo: 'a estrela da marca não é selo de premiação' },
    { de: ['topicos/onde-aparece', 'topicos/duvidas'], para: 'simbolos/descobrir + topicos/duvidas', motivo: 'o olho virou o símbolo de descoberta' },
    { de: ['mecanica/buscar', 'mecanica/filtrar'], para: 'ui/busca + ui/filtro', motivo: 'são controles de interface, não mecânica do festival' }
  ],
  redesenhadosPorSeremGenericos: ['marca/calendario', 'mecanica/horario', 'marca/local', 'mecanica/qr-do-combo', 'redes/compartilhar', 'interface/acesso'],
  aproveitadosComoBase: ['doces/*', 'salgados/*', 'bebidas/*', 'sweet-gift/*']
};
