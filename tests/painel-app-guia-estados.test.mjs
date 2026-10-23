import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resumoMarca, agruparPendencias } from '../painel-app/src/lib/guia.js'

/*
 * Estados do resumo da marca (22/10/2026): requisitos da camada de edição no Início, prazo crítico antes do
 * preenchimento, agrupamento sem perder nem repetir pendência. Desde 23/10/2026 a marca só SALVA: nenhuma pendência
 * de "enviar" existe, em estado nenhum.
 */
const itens = [
  { posicao: 1, tipo: 'doce', nome: 'Bolo', descricao: 'd' },
  { posicao: 2, tipo: 'salgado', nome: 'Coxinha', descricao: 'd' },
  { posicao: 3, tipo: 'bebida', nome: 'Café', descricao: 'd' },
]
const completo = {
  participante: { nome_marca: 'Casa', responsavel: 'Ana', telefone: '(84) 99999-8888' },
  participacao: { id: 'pa', logo_id: 'l1', tema_combo: 'Moana', tema_justificativa: 'x', combo_status: 'rascunho', status_cadastro: 'em_preenchimento', foto_liberacao: 'liberado' },
  itens,
  unidades: [{ endereco: 'Rua A', id_publico: 'u1', participa: true }],
}
const com = (participacao, extra = {}) => ({ ...completo, ...extra, participacao: { ...completo.participacao, ...participacao } })
const tipos = (r) => r.pendencias.map((p) => p.tipo)

test('T0 nenhum estado cria pendência de "enviar" (a marca só salva)', () => {
  const estados = [{}, { combo_status: 'em_analise' }, { status_cadastro: 'encerrado' }, { status_cadastro: 'aguardando_cadastro' },
    { combo_status: 'correcao_solicitada', status_cadastro: 'em_preenchimento' }, { combo_status: 'aprovado', status_cadastro: 'cadastro_completo' }]
  for (const pa of estados) {
    for (const extra of [{}, { faltandoEdicao: [] }, { publicacao: { alterado_apos_aprovacao: true } }]) {
      const r = resumoMarca(com(pa, extra))
      assert.ok(!tipos(r).includes('enviar'), JSON.stringify(pa))
      assert.ok(!('podeEnviar' in r.envio))
      assert.doesNotMatch(JSON.stringify(r.pendencias) + JSON.stringify(r.etapas), /enviar|envie/i, JSON.stringify(pa))
    }
  }
})

test('T1 combo em análise: nenhuma cobrança e quem age é a organização', () => {
  const r = resumoMarca(com({ combo_status: 'em_analise' }))
  assert.ok(!tipos(r).includes('enviar'))
  assert.equal(r.proxima, null)
  const etapa = r.etapas.find((e) => e.chave === 'analise')
  assert.equal(etapa.estado, 'andamento')
  assert.match(etapa.detalhe, /em análise/)
})

test('T2 cadastro completo e em rascunho (antes do gatilho): está com a organização', () => {
  const r = resumoMarca(com({ status_cadastro: 'cadastro_completo' }))
  const etapa = r.etapas.find((e) => e.chave === 'analise')
  assert.equal(etapa.estado, 'andamento')
  assert.match(etapa.detalhe, /em análise pela organização/)
})

test('T3 ajuste pedido: a etapa diz "ajuste pedido" e é a vez da marca', () => {
  const r = resumoMarca(com({ combo_status: 'correcao_solicitada', status_cadastro: 'em_preenchimento' }))
  const etapa = r.etapas.find((e) => e.chave === 'analise')
  assert.equal(etapa.estado, 'atencao')
  assert.match(etapa.detalhe, /ajuste pedido/)
})

test('T4 aprovado e alterado depois: a organização vai atualizar o site (nada para a marca enviar)', () => {
  const aprovado = { combo_status: 'aprovado', status_cadastro: 'cadastro_completo' }
  assert.equal(resumoMarca(com(aprovado)).pendencias.length, 0)
  const r = resumoMarca(com(aprovado, { publicacao: { alterado_apos_aprovacao: true } }))
  assert.equal(r.pendencias.length, 0)
  assert.equal(r.combo.alteradoAposAprovacao, true)
  assert.match(r.etapas.find((e) => e.chave === 'analise').detalhe, /atualizar o site com as suas alterações/)
})

test('T5 100% dos campos, mas a edição exige mais: sem "tudo pronto" nem "enviar"', () => {
  const faltando = ['combo_nome', 'unidade:u1:modos', 'item:2:alimentar']
  const r = resumoMarca(com({}, { faltandoEdicao: faltando }))
  assert.equal(r.progresso.pct, 100, 'o % continua sendo só dos campos obrigatórios')
  assert.equal(r.envio.pronto, false)
  assert.equal(r.envio.faltam, 3)
  assert.equal(r.pendencias.filter((p) => p.codigo).length, 3)
  assert.ok(r.pendencias.filter((p) => p.codigo).every((p) => p.texto === 'É obrigatório para a página no site.'))
  const nome = r.pendencias.find((p) => p.codigo === 'combo_nome')
  assert.equal(nome.link, 'combo/3/combo_nome')
  const modos = r.pendencias.find((p) => p.codigo === 'unidade:u1:modos')
  assert.equal(modos.vista, 'cadastro', 'atendimento (bloco 6) é do Meu cadastro')
  assert.equal(r.etapas.find((e) => e.chave === 'preco').estado, 'pendente')
  assert.equal(r.etapas.find((e) => e.chave === 'itens').faltam, 1)
  assert.equal(r.proxima.tipo, 'campo')
})

test('T5b leitura da edição ausente: não afirma nada (conhecido = false), comportamento de antes', () => {
  const r = resumoMarca(com({}))
  assert.equal(r.envio.conhecido, false)
  assert.equal(r.envio.pronto, true)
  assert.equal(r.etapas.find((e) => e.chave === 'analise').detalhe, 'depois de completar o cadastro', 'sem a leitura, não diz "completo"')
  const lido = resumoMarca(com({}, { faltandoEdicao: [] }))
  assert.equal(lido.envio.conhecido, true)
  assert.equal(lido.envio.faltam, 0)
})

test('T5c a falta de endereço vem do servidor e do campo básico: conta UMA vez, e vale a do servidor', () => {
  // Sem nenhuma unidade participando: o servidor diz "sem_unidade", o campo básico diz "endereço".
  const r = resumoMarca(com({}, { unidades: [], faltandoEdicao: ['sem_unidade'] }))
  assert.equal(r.envio.faltam, 1)
  assert.equal(r.pendencias.filter((p) => p.campo === 'unidade-endereco').length, 1)
  assert.equal(r.pendencias.find((p) => p.campo === 'unidade-endereco').codigo, 'sem_unidade')
  // Unidade participando sem endereço: o servidor aponta a unidade certa (não a "primeira").
  const u = resumoMarca(com({}, { unidades: [{ id_publico: 'u2', participa: true }], faltandoEdicao: ['unidade:u2:endereco', 'unidade:u2:horario'] }))
  assert.equal(u.envio.faltam, 2, 'endereço + horário, cada um uma vez')
  const horario = u.pendencias.find((p) => p.codigo === 'unidade:u2:horario')
  assert.match(horario.titulo, /^Informar o horário no festival de /, 'a falta do horário usa o nome novo, sem "da loja" nem "do combo"')
  assert.equal(horario.link, 'cadastro/6/atendimento-horario', 'e leva ao seletor, no bloco 6 de Meu cadastro')
  assert.equal(u.pendencias.filter((p) => p.campo === 'unidade-endereco').length, 1)
  // Leitura da edição ausente: o campo básico continua contando (não há outra fonte).
  const sem = resumoMarca(com({}, { unidades: [] }))
  assert.equal(sem.envio.faltam, 1)
  assert.equal(sem.pendencias.filter((p) => p.campo === 'unidade-endereco').length, 1)
})

test('participação encerrada: a etapa de aprovação diz "encerrada"; completo e lido vai para a conferência', () => {
  const r = resumoMarca(com({ status_cadastro: 'encerrado' }, { faltandoEdicao: [] }))
  assert.match(r.etapas.find((e) => e.chave === 'analise').detalhe, /encerrada/)
  const livre = resumoMarca(com({}, { faltandoEdicao: [] }))
  assert.match(livre.etapas.find((e) => e.chave === 'analise').detalhe, /vai para a conferência da organização/)
})

test('T6 só a logo faltando: o cadastro está completo e a logo é a próxima ação', () => {
  const r = resumoMarca(com({ logo_id: null }))
  assert.equal(r.envio.pronto, true)
  assert.equal(r.proxima.campo, 'logo')
  assert.deepEqual(tipos(r), ['campo'])
})

test('T7 correção aberta é a próxima ação; corrigida e em análise vira "em análise"', () => {
  const aberta = resumoMarca(com({}, { correcoes: [{ campo: 'telefone', bloco: 0, estado: 'aberta', comentario: 'Número errado' }] }))
  assert.equal(aberta.proxima.tipo, 'correcao')
  assert.equal(aberta.proxima.critica, true)
  const corrigida = resumoMarca(com({ combo_status: 'em_analise' }, { correcoes: [{ campo: 'telefone', bloco: 0, estado: 'corrigida' }] }))
  assert.deepEqual(corrigida.campo('telefone'), { estado: 'analise' })
})

test('prazo curto ou vencido sobe na frente do preenchimento; prazo longo não', () => {
  const agora = '2026-10-22T12:00:00Z'
  const parcial = com({}, { itens: itens.map((i, n) => (n === 1 ? { ...i, descricao: '' } : i)), agora })
  const longe = resumoMarca({ ...parcial, pedidos: [{ id: 'p1', titulo: 'Longe', bloco: 'livre', prioridade: 'normal', estado: 'pendente', prazo_em: '2026-11-20T12:00:00Z' }] })
  assert.equal(longe.proxima.tipo, 'campo')
  assert.equal(longe.proxima.critica, false)
  const perto = resumoMarca({ ...parcial, pedidos: [{ id: 'p2', titulo: 'Amanhã', bloco: 'livre', prioridade: 'normal', estado: 'pendente', prazo_em: '2026-10-23T12:00:00Z' }] })
  assert.equal(perto.proxima.link, 'pedidos/p2')
  assert.equal(perto.proxima.critica, true)
  const vencido = resumoMarca({ ...parcial, pedidos: [{ id: 'p3', titulo: 'Atrasado', bloco: 'livre', prioridade: 'normal', estado: 'pendente', prazo_em: '2026-10-20T12:00:00Z' }] })
  assert.equal(vencido.proxima.link, 'pedidos/p3')
  assert.match(vencido.pendencias.find((p) => p.link === 'pedidos/p3').texto, /vencido/)
  // Correção ainda vem antes de qualquer prazo.
  const ambos = resumoMarca({ ...parcial, correcoes: [{ campo: 'telefone', bloco: 0, estado: 'aberta', comentario: 'x' }], pedidos: [{ id: 'p2', titulo: 'Amanhã', bloco: 'livre', prioridade: 'normal', estado: 'pendente', prazo_em: '2026-10-23T12:00:00Z' }] })
  assert.equal(ambos.proxima.tipo, 'correcao')
})

test('T8 agrupar não perde nem repete: soma dos grupos = pendências, menos o destaque', () => {
  const r = resumoMarca({
    ...com({}, { itens: [{ ...itens[0], descricao: '' }, { ...itens[1], descricao: '' }, { ...itens[2], descricao: '' }] }),
    arquivosParaLer: 2, fotosParaLer: 1, vagasAbertas: 2,
    pedidos: [{ id: 'p1', titulo: 'A', bloco: 'livre', prioridade: 'normal', estado: 'pendente' }, { id: 'p2', titulo: 'B', bloco: 'combo', prioridade: 'normal', estado: 'pendente' }],
  })
  const grupos = agruparPendencias(r.pendencias, { fora: r.proxima })
  const total = grupos.reduce((n, g) => n + g.itens.length, 0)
  assert.equal(total, r.pendencias.filter((p) => p !== r.proxima).length)
  const ids = grupos.flatMap((g) => g.itens)
  assert.equal(new Set(ids).size, ids.length, 'nenhuma pendência em dois grupos')
  assert.ok(!ids.includes(r.proxima), 'o destaque não se repete na lista')
  const chaves = grupos.map((g) => g.chave)
  assert.deepEqual(chaves.filter((c, i) => chaves.indexOf(c) === i), chaves)
  const docs = grupos.find((g) => g.chave === 'documentos')
  assert.equal(docs.total, 2, 'dois arquivos para ler contam dois')
  assert.ok(grupos.find((g) => g.chave === 'fotos').itens.some((p) => p.tipo === 'arquivo'), 'foto oficial a conferir mora em Fotos')
  const combo = grupos.find((g) => g.chave === 'combo')
  assert.ok(combo.aVista.length <= 3 && combo.aVista.length + combo.recolhidas.length === combo.itens.length)
})

test('T8b contagem por aba conta quantos arquivos há para ler', () => {
  const r = resumoMarca({ ...com({}), arquivosParaLer: 3 })
  assert.equal(r.contagem.arquivos, 3)
})

test('T11 etapas de fotos e aprovação dizem em palavras o que está acontecendo', () => {
  const etapa = (r, chave) => r.etapas.find((e) => e.chave === chave)
  assert.match(etapa(resumoMarca(com({ foto_liberacao: 'pendente' })), 'fotos').detalhe, /aguardando liberação/)
  assert.match(etapa(resumoMarca(com({}, { vagasAbertas: 0 })), 'fotos').detalhe, /sem horários/)
  assert.match(etapa(resumoMarca(com({}, { vagasAbertas: 3 })), 'fotos').detalhe, /escolher/)
  assert.equal(etapa(resumoMarca(com({}, { sessoes: [{ status: 'agendada' }] })), 'fotos').estado, 'andamento')
  assert.equal(etapa(resumoMarca(com({}, { sessoes: [{ status: 'realizada' }] })), 'fotos').estado, 'feito')
  assert.equal(etapa(resumoMarca(com({ combo_status: 'correcao_solicitada' })), 'analise').estado, 'atencao')
})
