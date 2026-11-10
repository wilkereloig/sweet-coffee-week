/*
 * Apoiadores da edição no mapa (pedido do Wilker, 10/11/2026). Cadastro ÚNICO dos dois mapas: o ilustrado e o real leem daqui
 * a marca, os locais, os endereços e o texto do cartão; só a posição muda (x/y na arte, lat/lng no mapa real).
 * Não são casas: ficam fora de contagem, ranking e carimbo, como o Sicredi.
 *   · Senac: as cinco unidades de Natal. Endereços de rn.senac.br/unidades, pontos conferidos no Google Maps (busca pelo nome)
 *     em 10/11/2026. No mapa ilustrado é UM pin (a arte tem um lugar só); no real, um pin por unidade. Os dois abrem o mesmo cartão,
 *     com todas as unidades.
 *   · Espaço Reduzido: ponto oficial de retirada dos vouchers (`tipo: 'retirada'`). Ponto conferido no Google Maps em 10/11/2026.
 * `tipo: 'retirada'`: o pin ganha o selo com o ícone e o rótulo "Retirada de vouchers" (sempre à vista) e o cartão usa só a frase
 * oficial. Serve a qualquer outro ponto de retirada que entrar.
 * `x`/`y`: posição na arte ilustrada (0 a 1), escolhida num ponto livre do desenho. A arte é ilustrativa: para mover, mude aqui.
 * Ids: o apoiador é `apoio-<marca>`; no mapa real cada unidade de um apoiador com vários locais é `apoio-<marca>@<local>`.
 */
export const RETIRADA = { rotulo: 'Retirada de vouchers', frase: 'Ponto oficial de retirada dos vouchers.' }

export const APOIOS = [
  {
    id: 'apoio-senac', marca: 'senac', nome: 'Senac', descricao: 'Unidades do Senac em Natal.',
    x: 0.24, y: 0.45, // ponto livre do desenho (10/11): no Alecrim calculado caía no meio de muitos pins; aqui afastarPins não o agrupa nem desloca ninguém
    locais: [
      { id: 'alecrim', nome: 'Senac Alecrim', endereco: 'Av. Almirante Alexandrino de Alencar, 556, Alecrim, Natal', lat: -5.7975216, lng: -35.2141529 },
      { id: 'barreira-roxa', nome: 'Senac Barreira Roxa', endereco: 'Via Costeira Senador Dinarte Medeiros Mariz, 4020, Mãe Luiza, Natal', lat: -5.7970483, lng: -35.1823519 },
      { id: 'centro', nome: 'Senac Centro', endereco: 'Rua São Tomé, 444, Cidade Alta, Natal', lat: -5.7826935, lng: -35.2064605 },
      { id: 'zona-norte', nome: 'Senac Zona Norte', endereco: 'Travessa Macaé, 2875, Potengi, Natal', lat: -5.7592272, lng: -35.2497544 },
      { id: 'zona-sul', nome: 'Senac Zona Sul', endereco: 'Av. Ayrton Senna, 1362, Neópolis, Natal', lat: -5.8620495, lng: -35.2055215 },
    ],
  },
  {
    id: 'apoio-espaco-reduzido', marca: 'espacoReduzido', nome: 'Espaço Reduzido', tipo: 'retirada',
    // Ponto livre do desenho (10/11), para o lado de Parnamirim: com a etiqueta "Retirada de vouchers", o ponto calculado (0.783, 0.4114)
    // caía junto da Sicredi Cidade Verde e o pin entrava num selo "+9" no celular, escondendo a retirada. Aqui não agrupa nem desloca ninguém.
    x: 0.87, y: 0.57,
    locais: [
      { id: 'nova-parnamirim', nome: 'Espaço Reduzido', endereco: 'Av. Abel Cabral, 366, Nova Parnamirim, Parnamirim', lat: -5.8742499, lng: -35.2169532 },
    ],
  },
]

export const ehApoio = (id) => typeof id === 'string' && id.startsWith('apoio-')
export const ehRetirada = (a) => a?.tipo === 'retirada'

/** O apoiador de um id de qualquer um dos dois mapas (`apoio-senac` ou `apoio-senac@centro`), ou null. */
export const apoioDoId = (id, apoios = APOIOS) => (ehApoio(id) ? apoios.find((a) => id === a.id || id.startsWith(`${a.id}@`)) || null : null)

/** Texto do cartão: no ponto de retirada, só a frase oficial; nos outros, a descrição e o lembrete de que não é casa. */
export const textoDoApoio = (a) => (ehRetirada(a) ? RETIRADA.frase : `${a.descricao} Não conta como casa nem como carimbo.`)

const nomeAcessivel = (a, local = null) => [
  local && a.locais.length > 1 ? local.nome : a.nome,
  ehRetirada(a) ? RETIRADA.rotulo : 'apoio da edição, não conta como casa',
  local ? local.endereco : a.locais.length > 1 ? `${a.locais.length} endereços` : a.locais[0].endereco,
].join('. ')

/** Mapa ilustrado: um pin por apoiador, no formato das agências do Sicredi. */
export const apoiosNoMundo = (logos, apoios = APOIOS) => apoios.map((a) => ({
  id: a.id, nome: a.nome, endereco: '', x: a.x, y: a.y, apoio: true, retirada: ehRetirada(a), logo: logos[a.marca]?.src, nomeAcessivel: nomeAcessivel(a),
}))

/** Mapa real: um pin por LOCAL, no formato dos marcadores do Sicredi (placa com a marca). Apoiador de um local só usa o id dele. */
export const pontosApoio = (logos, apoios = APOIOS) => apoios.flatMap((a) => a.locais.map((l) => ({
  id: a.locais.length > 1 ? `${a.id}@${l.id}` : a.id, apoio: a.id, lat: l.lat, lng: l.lng, titulo: a.locais.length > 1 ? l.nome : a.nome,
  sicredi: true, largo: true, retirada: ehRetirada(a), nomeMarcador: nomeAcessivel(a, l), pin: { src: logos[a.marca]?.src, largo: true },
})))

export const linkComoChegarLocal = (l) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${l.lat},${l.lng}`)}`
