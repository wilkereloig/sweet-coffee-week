/*
 * Vista Respostas — lógica pura, sem DOM. Porta fiel de `public/painel/
 * index.html` (ORIGENS, todos, filtrados, dataCurta), com `participar` já
 * fora — saiu do painel em 27/08/2026 (ver CLAUDE.md), substituído por
 * `quero_participar`.
 *
 * ⚠️ NÃO tem `escapar()`. A versão estática precisa dela porque monta HTML
 * por concatenação de string (`innerHTML`); componente React não — JSX
 * escapa sozinho todo texto interpolado. Adicionar `escapar()` aqui
 * escaparia DUAS vezes e mostraria entidade HTML crua na tela
 * ("Duart&#39;s" em vez de "Duart's").
 */
export const ORIGENS = {
  quero_participar: {
    rotulo: 'Quero participar', cor: '#01AFCC', rpc: 'get_quero_participar',
    // Único formulário público hoje — página estática, fora do SPA. Barra
    // final obrigatória (senão cai no fallback do SPA e abre a landing).
    form: '/quero-participar/',
    status: ['novo', 'em_analise', 'contatado', 'aprovado', 'nao_selecionado', 'aguardando_cadastro', 'cadastro_completo'],
    titulo: (r) => r.empresa || r.nome,
    meta: (r) => [r.nome, r.cidade, r.tipo].filter(Boolean).join(' · '),
    campos: {
      nome: 'Responsável', telefone: 'Telefone', email: 'E-mail', empresa: 'Negócio',
      tipo: 'Tipo', cidade: 'Cidade', instagram: 'Instagram', site: 'Site',
      carro_chefe: 'Carro-chefe',
    },
  },
  apoiar: {
    rotulo: 'Apoiar', cor: '#FF4810', rpc: 'get_support_interests',
    form: null, formNota: 'seção 06 da página Apoiar',
    status: ['novo', 'em_analise', 'contatado', 'em_negociacao', 'fechado', 'arquivado'],
    titulo: (r) => r.empresa,
    meta: (r) => [r.nome, r.segmento, r.interesse].filter(Boolean).join(' · '),
    campos: {
      nome: 'Contato', empresa: 'Empresa', email: 'E-mail', whatsapp: 'WhatsApp',
      segmento: 'Segmento', interesse: 'Interesse', mensagem: 'Mensagem',
    },
  },
  contato: {
    rotulo: 'Contato', cor: '#4D257E', rpc: 'get_contact_requests',
    form: null, formNota: 'seção 04 da página Contato',
    status: ['novo', 'em_analise', 'respondido', 'encerrado'],
    titulo: (r) => r.name,
    meta: (r) => [r.subject].filter(Boolean).join(' · '),
    campos: {
      name: 'Nome', email: 'E-mail', whatsapp: 'WhatsApp',
      subject: 'Assunto', message: 'Mensagem', source: 'Origem',
    },
  },
}

// Rótulo legível por status — todo status que qualquer origem aceita.
// ⚠️ Status novo no CHECK do banco precisa de entrada aqui NO MESMO COMMIT
// (CLAUDE.md §10.4-b), senão aparece como string crua na ficha.
export const ROTULO_STATUS = {
  novo: 'Novo', em_analise: 'Em análise', contatado: 'Contatado', respondido: 'Respondido',
  aprovado: 'Aprovado', nao_selecionado: 'Não selecionado', aguardando_cadastro: 'Aguardando cadastro',
  cadastro_completo: 'Cadastro completo', em_negociacao: 'Em negociação',
  fechado: 'Fechado', arquivado: 'Arquivado', encerrado: 'Encerrado',
}

// Motivo por código de erro de `organizacao_apagar_registro` — porta fiel de
// RECADO_APAGAR em public/organizacao/index.html.
export const RECADO_APAGAR = {
  nao_autorizado: 'A sessão não vale mais. Saia e entre de novo.',
  origem_invalida: 'Origem desconhecida. Isso é defeito do painel, não seu.',
  nao_encontrado: 'Esse registro já não existe. Alguém pode ter apagado antes.',
  tem_conta: 'Esta candidatura já virou conta de participante. Apagar aqui deixaria a ' +
    'conta órfã, apontando para nada. Remova a conta primeiro.',
}

// Motivo por código de erro de `criar-acesso-marca` quando chamada com
// `origem_id` (candidatura aprovada) — subconjunto do RECADO_MANUAL de
// participantes.js, que cobre o caminho de cadastro manual.
export const RECADO_ACESSO = {
  nao_autorizado: 'A sessão não vale mais. Saia e entre de novo.',
  candidatura_nao_encontrada: 'Essa candidatura não existe mais.',
  conta_ja_existe: 'Esta candidatura já tem conta. Veja em "Marcas".',
}

// O /quero-participar guarda as respostas longas no payload; os rótulos
// vieram do próprio formulário.
const ROT_PAYLOAD = {
  serve: 'O que serve', carroChefe: 'Carro-chefe', historia: 'A história',
  especial: 'O que tem de especial', experiencia: 'Experiência com o festival', extra: 'Mais alguma coisa',
}

// Campos conhecidos de um registro, com rótulo legível — nunca JSON cru.
// Pura e testável sem DOM: devolve pares [rótulo, valor], não HTML.
export function camposDetalhe(origem, reg) {
  const o = ORIGENS[origem]
  if (!o || !reg) return []
  const pares = Object.entries(o.campos)
    .filter(([k]) => reg[k])
    .map(([k, rot]) => [rot, String(reg[k])])
  if (reg.payload && typeof reg.payload === 'object') {
    Object.entries(ROT_PAYLOAD)
      .filter(([k]) => reg.payload[k] && !o.campos[k])
      .forEach(([k, rot]) => pares.push([rot, String(reg.payload[k])]))
  }
  return pares
}

const CHAVES_BUSCA = { nome: ['nome', 'name', 'responsavel', 'marca'], empresa: ['empresa', 'marca'], email: ['email'] }

export function campo(reg, quais) {
  for (const k of quais) if (reg[k]) return String(reg[k])
  return ''
}

export function todos(dados) {
  return Object.keys(ORIGENS)
    .flatMap((o) => (dados[o] || []).map((r) => ({ origem: o, reg: r })))
    .sort((a, b) => new Date(b.reg.created_at) - new Date(a.reg.created_at))
}

export function filtrados(dados, { aba, status, dias, termo }) {
  const corte = dias ? Date.now() - Number(dias) * 864e5 : null
  return todos(dados).filter(({ origem, reg }) => {
    if (aba !== 'tudo' && origem !== aba) return false
    if (status && reg.status !== status) return false
    if (corte && new Date(reg.created_at).getTime() < corte) return false
    if (termo) {
      const alvo = [campo(reg, CHAVES_BUSCA.nome), campo(reg, CHAVES_BUSCA.empresa), campo(reg, CHAVES_BUSCA.email)]
        .join(' ').toLowerCase()
      if (!alvo.includes(termo.toLowerCase())) return false
    }
    return true
  })
}

export function dataCurta(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
