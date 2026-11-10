/*
 * Apoiadores da edição no mapa (pedido do Wilker, 10/11/2026): UM pin por marca; o cartão lista todos os locais dela, cada um
 * com endereço e "Como chegar". Não são casas: ficam fora de contagem, ranking e carimbo, como o Sicredi.
 *   · Senac: as cinco unidades de Natal. Endereços de rn.senac.br/unidades e pontos do Google Maps, conferidos em 10/11/2026.
 *     O pin único fica na unidade Alecrim, a mais central das cinco.
 *   · Espaço Reduzido: local de retirada dos vouchers físicos da Caça (9 a 13/11). Endereço e ponto do Google Maps, 10/11/2026.
 * Os pins ficam só no mapa ILUSTRADO. No mapa real eles entravam no afastamento e empurravam pin de casa para a borda,
 * debaixo do rodapé do Google (tests/cartoon-mapa-layout-navegador.mjs reprovava); o cartão leva ao Google Maps por "Como chegar".
 * `x`/`y`: posição na arte ilustrada (0 a 1), calculada do lat/lng pela mesma transformação que leva as três agências do
 * Sicredi às posições delas em src/data/mundoEdicao.js. A arte é ilustrativa: para mover um pin no desenho, mude x/y aqui.
 */
export const APOIOS = [
  {
    id: 'apoio-senac', marca: 'senac', nome: 'Senac', descricao: 'Unidades do Senac em Natal.',
    lat: -5.7975216, lng: -35.2141529, x: 0.3984, y: 0.3243,
    locais: [
      { nome: 'Senac Alecrim', endereco: 'Av. Almirante Alexandrino de Alencar, 556, Alecrim, Natal', lat: -5.7975216, lng: -35.2141529 },
      { nome: 'Senac Barreira Roxa', endereco: 'Via Costeira Senador Dinarte Medeiros Mariz, 4020, Mãe Luiza, Natal', lat: -5.7970483, lng: -35.1823519 },
      { nome: 'Senac Centro', endereco: 'Rua São Tomé, 444, Cidade Alta, Natal', lat: -5.7826935, lng: -35.2064605 },
      { nome: 'Senac Zona Norte', endereco: 'Travessa Macaé, 2875, Potengi, Natal', lat: -5.7592272, lng: -35.2497544 },
      { nome: 'Senac Zona Sul', endereco: 'Av. Ayrton Senna, 1362, Neópolis, Natal', lat: -5.8620495, lng: -35.2055215 },
    ],
  },
  {
    id: 'apoio-espaco-reduzido', marca: 'espacoReduzido', nome: 'Espaço Reduzido',
    descricao: 'Aqui você retira o voucher físico da Caça aos Carimbos, se ganhar um de 9 a 13/11.',
    lat: -5.8742499, lng: -35.2169532, x: 0.783, y: 0.4114,
    locais: [
      { nome: 'Espaço Reduzido', endereco: 'Av. Abel Cabral, 366, Nova Parnamirim, Parnamirim', lat: -5.8742499, lng: -35.2169532 },
    ],
  },
]

export const ehApoio = (id) => typeof id === 'string' && id.startsWith('apoio-')

const nomeAcessivel = (a) => `${a.nome}, apoio da edição, não conta como casa. ${a.locais.length > 1 ? `${a.locais.length} endereços` : a.locais[0].endereco}`

/** Para a arte ilustrada: mesmo formato das agências do Sicredi, com a logo e o nome acessível próprios. */
export const apoiosNoMundo = (logos, apoios = APOIOS) => apoios.map((a) => ({ id: a.id, nome: a.nome, endereco: '', x: a.x, y: a.y, apoio: true, logo: logos[a.marca]?.src, nomeAcessivel: nomeAcessivel(a) }))

export const linkComoChegarLocal = (l) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${l.lat},${l.lng}`)}`
