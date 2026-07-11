/*
 * FONTE ÚNICA — FAQ + taxonomia + assuntos da central de Dúvidas e contato.
 * Conteúdo institucional (respostas aprovadas, copy fiel). A lógica de busca/
 * filtro/validação/envio vive em src/lib/contactRequest.js (módulo puro,
 * testável). A página (Contato.jsx) só consome estes dados.
 *
 * Classificação por filtro: o spec agrupa a copy em 4 blocos, mas o controle
 * segmentado tem 6 chips (Todas, Público, Sweet Awards e rota, Estabelecimentos,
 * Parcerias e imprensa, Atendimento). Para nenhum filtro ficar vazio, as duas
 * perguntas de serviço ao visitante (reserva/consumo e restrições/acessibilidade)
 * entram em "Atendimento" — são dúvidas de atendimento no local, não sobre o
 * festival em si. Ajustável aqui se a organização preferir outra divisão.
 *
 * Nomenclatura (AGENTS.md §2): "Sweet & Coffee Week" / "o festival" — nunca
 * "Sweet" sozinho. Exceções de marca: Sweet Awards, Sweet Lovers.
 */

// Chips do controle segmentado. 'todas' é o pseudo-filtro que mostra tudo.
export const FAQ_CATEGORIES = [
  { id: 'todas',           label: 'Todas' },
  { id: 'publico',         label: 'Público' },
  { id: 'awards',          label: 'Sweet Awards e rota' },
  { id: 'estabelecimentos',label: 'Estabelecimentos' },
  { id: 'parcerias',       label: 'Parcerias e imprensa' },
  { id: 'atendimento',     label: 'Atendimento' },
]

const LABEL = Object.fromEntries(FAQ_CATEGORIES.map((c) => [c.id, c.label]))

// Perguntas cruas. `terms` = sinônimos de busca que não aparecem no texto
// (a busca já cobre pergunta + resposta + rótulo da categoria).
const RAW = [
  // ── Público ────────────────────────────────────────────────────────────────
  {
    id: 'o-que-e',
    category: 'publico',
    question: 'O que é o Sweet & Coffee Week?',
    answer:
      'O Sweet & Coffee Week é um festival gastronômico que reúne cafeterias, docerias, confeitarias, padarias, restaurantes e outros estabelecimentos em uma experiência de cidade. A cada edição, as marcas criam combos e experiências inspirados em um tema especial.',
    terms: ['o que e', 'definicao', 'sobre o festival', 'gastronomia'],
  },
  {
    id: 'como-funciona',
    category: 'publico',
    question: 'Como funciona o festival?',
    answer:
      'Cada edição tem um período, um tema e participantes definidos pela organização. Durante o festival, os estabelecimentos apresentam suas criações e o público monta a própria rota para conhecer sabores, lugares e histórias.',
    terms: ['tema', 'periodo', 'rota do publico'],
  },
  {
    id: 'proxima-edicao',
    category: 'publico',
    question: 'Quando acontece a próxima edição?',
    answer:
      'As datas são divulgadas nos canais oficiais do Sweet & Coffee Week e no site quando a nova edição é anunciada. Como o calendário pode variar, acompanhe os comunicados oficiais antes de programar sua visita.',
    terms: ['datas', 'calendario', 'quando', 'agenda'],
  },
  {
    id: 'onde-encontro',
    category: 'publico',
    question: 'Onde encontro participantes, endereços e horários?',
    answer:
      'Durante uma edição ativa, as informações dos participantes ficam disponíveis nas páginas e canais oficiais do festival. Horários, funcionamento e disponibilidade podem mudar, então confirme diretamente com o estabelecimento antes de sair.',
    terms: ['endereco', 'horario', 'mapa', 'onde fica', 'localizacao'],
  },
  {
    id: 'mesmo-combo',
    category: 'publico',
    question: 'Todos os estabelecimentos oferecem o mesmo combo?',
    answer:
      'Não. Cada participante desenvolve uma criação própria, conectada ao tema da edição. A diversidade entre sabores, apresentações e propostas faz parte da experiência do festival.',
    terms: ['combo', 'cardapio', 'produto', 'igual'],
  },
  // ── Atendimento (serviço ao visitante no local) ──────────────────────────────
  {
    id: 'reserva-consumo',
    category: 'atendimento',
    question: 'Preciso fazer reserva ou consumir no local?',
    answer:
      'Isso depende de cada estabelecimento. Alguns podem trabalhar com consumo no local, retirada, reserva, horários específicos ou disponibilidade limitada. Consulte diretamente o participante antes da visita.',
    terms: ['reserva', 'consumo', 'retirada', 'delivery', 'takeaway'],
  },
  {
    id: 'restricoes-acessibilidade',
    category: 'atendimento',
    question: 'Como confirmar ingredientes, restrições alimentares e acessibilidade?',
    answer:
      'Ingredientes, alergênicos, possibilidade de contaminação cruzada, acessibilidade e condições de atendimento variam de acordo com cada estabelecimento. Em caso de restrição alimentar, alergia ou necessidade específica de acesso, confirme diretamente com a equipe do local antes do consumo ou da visita.',
    terms: ['alergia', 'gluten', 'lactose', 'vegano', 'vegetariano', 'cadeirante', 'acessivel', 'restricao'],
  },
  // ── Sweet Awards e rota ──────────────────────────────────────────────────────
  {
    id: 'o-que-e-awards',
    category: 'awards',
    question: 'O que é o Sweet Awards?',
    answer:
      'O Sweet Awards é a premiação do Sweet & Coffee Week. Ele reconhece destaques das edições em categorias relacionadas aos produtos, à criatividade, à apresentação e à experiência oferecida pelos participantes.',
    terms: ['premiacao', 'premio', 'award', 'categorias'],
  },
  {
    id: 'avaliacoes-resultados',
    category: 'awards',
    question: 'Como funcionam as avaliações e os resultados?',
    answer:
      'Os critérios, canais de avaliação e prazos podem variar conforme cada edição. Quando houver uma premiação ativa, as regras oficiais ficam disponíveis na página do Sweet Awards e nos canais oficiais do festival.',
    terms: ['votacao', 'criterios', 'jurado', 'nota', 'avaliar'],
  },
  {
    id: 'empate',
    category: 'awards',
    question: 'O que acontece em caso de empate?',
    answer:
      'Quando dois ou mais participantes recebem a mesma colocação, o empate é preservado no resultado oficial.',
    terms: ['empate', 'empatados', 'mesma colocacao', 'tie'],
  },
  {
    id: 'rota-da-docura',
    category: 'awards',
    question: 'Como funciona a Rota da Doçura?',
    answer:
      'A Rota da Doçura é uma ação que pode estar presente em edições específicas para incentivar o público a descobrir diferentes participantes. Quando estiver ativa, as regras, os participantes e as formas de participação serão divulgados nos canais oficiais da edição.',
    terms: ['rota', 'docura', 'passaporte', 'selo'],
  },
  // ── Estabelecimentos ─────────────────────────────────────────────────────────
  {
    id: 'demonstrar-interesse',
    category: 'estabelecimentos',
    question: 'Como uma marca gastronômica demonstra interesse em participar?',
    answer:
      'Estabelecimentos interessados devem preencher o pré-cadastro disponível na página Participar. A organização analisa os interesses recebidos de acordo com o planejamento, o perfil da edição e a disponibilidade de vagas.',
    terms: ['participar', 'pre-cadastro', 'inscricao', 'cadastro', 'entrar na rota'],
  },
  {
    id: 'pre-cadastro-garante',
    category: 'estabelecimentos',
    question: 'O pré-cadastro garante participação?',
    answer:
      'Não. O envio demonstra interesse, mas a participação depende de curadoria, alinhamento com a edição, estrutura do estabelecimento e disponibilidade de vagas.',
    terms: ['garantia', 'vaga', 'selecao', 'curadoria'],
  },
  {
    id: 'experiencia-exclusiva',
    category: 'estabelecimentos',
    question: 'O estabelecimento precisa criar uma experiência exclusiva?',
    answer:
      'Cada edição apresenta orientações próprias para os participantes. Em geral, a proposta envolve uma criação autoral conectada ao tema do festival e à experiência que a marca deseja oferecer ao público.',
    terms: ['criacao', 'autoral', 'exclusivo', 'tema'],
  },
  {
    id: 'awards-para-participantes',
    category: 'estabelecimentos',
    question: 'Como funciona o Sweet Awards para participantes?',
    answer:
      'Quando uma edição tiver premiação, os participantes recebem da organização as categorias, os critérios, os prazos e as orientações aplicáveis. As regras são apresentadas antes do início da avaliação.',
    terms: ['premiacao', 'concorrer', 'regras', 'participante'],
  },
  // ── Parcerias e imprensa ─────────────────────────────────────────────────────
  {
    id: 'parceria-imprensa-contato',
    category: 'parcerias',
    question: 'Como uma marca, patrocinador ou profissional de imprensa entra em contato?',
    answer:
      'Para participar como estabelecimento, use a página Participar. Para propor parceria ou patrocínio, use a página Apoiar. Para imprensa, entrevistas, correções no site, sugestões ou outros assuntos, selecione o tema adequado no formulário abaixo.',
    terms: ['imprensa', 'patrocinio', 'parceria', 'entrevista', 'apoiar', 'jornalista', 'press'],
  },
]

// FAQ final: rótulo da categoria embutido para a busca cobrir "categoria".
export const FAQ_ITEMS = RAW.map((item) => ({
  ...item,
  categoryLabel: LABEL[item.category] || '',
}))

// Assuntos do formulário (select). Ordem = spec.
export const CONTACT_SUBJECTS = [
  'Dúvida sobre a edição',
  'Problema com informação no site',
  'Estabelecimento interessado',
  'Parceria ou patrocínio',
  'Imprensa e entrevistas',
  'Sugestão ou feedback',
  'Outro assunto',
]
