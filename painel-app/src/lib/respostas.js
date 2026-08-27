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
    status: ['novo', 'em_analise', 'contatado', 'aprovado', 'nao_selecionado', 'aguardando_cadastro', 'cadastro_completo'],
    titulo: (r) => r.empresa || r.nome,
    meta: (r) => [r.nome, r.cidade, r.tipo].filter(Boolean).join(' · '),
  },
  apoiar: {
    rotulo: 'Apoiar', cor: '#FF4810', rpc: 'get_support_interests',
    status: ['novo', 'em_analise', 'contatado', 'em_negociacao', 'fechado', 'arquivado'],
    titulo: (r) => r.empresa,
    meta: (r) => [r.nome, r.segmento, r.interesse].filter(Boolean).join(' · '),
  },
  contato: {
    rotulo: 'Contato', cor: '#4D257E', rpc: 'get_contact_requests',
    status: ['novo', 'em_analise', 'respondido', 'encerrado'],
    titulo: (r) => r.name,
    meta: (r) => [r.subject].filter(Boolean).join(' · '),
  },
}

const CHAVES_BUSCA = { nome: ['nome', 'name', 'responsavel', 'marca'], empresa: ['empresa', 'marca'], email: ['email'] }

function campo(reg, quais) {
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
