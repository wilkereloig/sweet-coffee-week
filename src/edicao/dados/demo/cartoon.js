/*
 * DADOS DE DEMONSTRAÇÃO — nada aqui é real (§5.8 do plano).
 *
 * Só carregado em DEV com ?demo=1 (src/edicao/dados/publico.js). Nunca é plano
 * B de erro de consulta, e tests/cartoon-demo-fora.test.mjs reprova o build de
 * produção se qualquer texto daqui aparecer no dist/.
 *
 * Mesmo formato de edicao_publica() (supabase/migrations/20261014_cartoon_02_publicacao.sql).
 */
const NAO = (a) => ({ aspecto: a, estado: 'nao_contem' })
const NI = (a) => ({ aspecto: a, estado: 'nao_informado' })
const C = (a) => ({ aspecto: a, estado: 'contem' })
const TODOS = ['gluten', 'leite', 'ovo', 'amendoim', 'castanhas', 'soja', 'peixe', 'crustaceos']

const DIAS = ['2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10',
  '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15']
const faixa = (abre, fecha) => DIAS.map((data) => ({ data, abre, fecha }))

export const DEMO_EDICAO = {
  edicao: { codigo: '2026.2', tema: 'CARTOON', inicio: '2026-11-05', fim: '2026-11-15' },
  fase: 'em_andamento',
  participantes_publicos: true,
  combos_publicos: true,
  avaliacao: { aberta: false, abre_em: null, fecha_em: null },
  resultados_publicos: false,
  participantes: [
    {
      slug: 'demo-casa-aurora', nivel: 'marca_e_combo',
      casa: { nome: '[DEMO] Casa Aurora', apresentacao: '[DEMO] Texto de demonstração da apresentação da casa.', instagram: '@demo' },
      unidades: [
        {
          id: 'udemo1', nome: '[DEMO] Unidade Centro',
          endereco: { logradouro: '[DEMO] Rua Exemplo', numero: '100', bairro: 'Tirol', cidade: 'Natal', uf: 'RN' },
          coordenada: { lat: -5.7945, lng: -35.2110 },
          whatsapp: '84900000000',
          combo: { modos: { local: 'sim', retirada: 'sim', delivery: 'sim' }, canais: [{ tipo: 'whatsapp', link: 'https://wa.me/5584900000000' }],
            delivery_taxa: '[DEMO] taxa conforme a região', disponibilidade: faixa('14:00', '20:00') },
        },
        {
          id: 'udemo2', nome: '[DEMO] Unidade Sul',
          endereco: { logradouro: '[DEMO] Avenida Exemplo', numero: '2000', bairro: 'Lagoa Nova', cidade: 'Natal', uf: 'RN' },
          combo: { modos: { local: 'sim', retirada: 'nao', delivery: 'nao' }, disponibilidade: faixa('16:00', '22:00'),
            observacao: '[DEMO] Nesta unidade a bebida é servida gelada.' },
        },
      ],
      combo: {
        nome: '[DEMO] Combo Traço Doce', descricao: '[DEMO] Descrição geral de demonstração.', preco: 38.9,
        itens: [
          { tipo: 'doce', posicao: 1, nome: '[DEMO] Doce', descricao: '[DEMO] Descrição do doce.', ingredientes: '[DEMO] farinha de trigo, leite, ovos, açúcar',
            alimentar: [C('gluten'), C('leite'), C('ovo'), ...['amendoim', 'castanhas', 'soja', 'peixe', 'crustaceos'].map(NAO), { aspecto: 'lactose', estado: 'sim' }],
            substituicoes: [{ original: '[DEMO] leite integral', alternativa: '[DEMO] bebida de aveia', disponibilidade: 'sempre', acrescimo: 0, como_solicitar: '[DEMO] peça no caixa' }] },
          { tipo: 'salgado', posicao: 2, nome: '[DEMO] Salgado', descricao: '[DEMO] Descrição do salgado.', ingredientes: '[DEMO] farinha de trigo, frango',
            alimentar: [C('gluten'), { aspecto: 'amendoim', estado: 'pode_conter' }, ...['leite', 'ovo', 'castanhas', 'soja', 'peixe', 'crustaceos'].map(NAO)] },
          { tipo: 'bebida', posicao: 3, nome: '[DEMO] Bebida', descricao: '[DEMO] Descrição da bebida.', ingredientes: '[DEMO] café, leite sem lactose',
            alimentar: [C('leite'), ...['gluten', 'ovo', 'amendoim', 'castanhas', 'soja', 'peixe', 'crustaceos'].map(NAO), { aspecto: 'lactose', estado: 'nao' }] },
        ],
      },
    },
    {
      slug: 'demo-casa-bico-de-pena', nivel: 'marca_e_combo',
      casa: { nome: '[DEMO] Casa Bico de Pena' },
      unidades: [{
        id: 'udemo3', endereco: { logradouro: '[DEMO] Rua Exemplo B', numero: '5', bairro: 'Ponta Negra', cidade: 'Natal', uf: 'RN' },
        combo: { modos: { local: 'sim', retirada: 'sim', delivery: 'nao' }, disponibilidade: faixa('09:00', '12:00') },
      }],
      combo: {
        nome: '[DEMO] Combo Nanquim', preco: 38.9,
        itens: [
          { tipo: 'doce', posicao: 1, nome: '[DEMO] Doce B', descricao: '[DEMO] Descrição.', ingredientes: '[DEMO] ingredientes', alimentar: TODOS.map(NI) },
          { tipo: 'doce', posicao: 2, nome: '[DEMO] Segundo doce B', descricao: '[DEMO] Descrição.', ingredientes: '[DEMO] ingredientes', alimentar: TODOS.map(NI) },
          { tipo: 'bebida', posicao: 3, nome: '[DEMO] Bebida B', descricao: '[DEMO] Descrição.', ingredientes: '[DEMO] ingredientes', alimentar: TODOS.map(NI) },
        ],
      },
    },
    {
      slug: 'demo-casa-quadro-a-quadro', nivel: 'marca',
      casa: { nome: '[DEMO] Casa Quadro a Quadro', apresentacao: '[DEMO] Casa confirmada, combo ainda não divulgado.' },
      unidades: [{ id: 'udemo4', endereco: { logradouro: '[DEMO] Rua Exemplo C', bairro: 'Tirol', cidade: 'Natal', uf: 'RN' } }],
    },
  ],
}
