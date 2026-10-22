import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resumoMarca, agruparPendencias } from '../painel-app/src/lib/guia.js'

/*
 * Estados do resumo da marca (22/10/2026): enviar só quando faz sentido, requisitos da camada de edição no
 * Início, prazo crítico antes do preenchimento, agrupamento sem perder nem repetir pendência.
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

test('T1 combo em análise: nenhuma cobrança de envio e quem age é a organização', () => {
  const r = resumoMarca(com({ combo_status: 'em_analise' }))
  assert.ok(!tipos(r).includes('enviar'))
  assert.equal(r.proxima, null)
  const etapa = r.etapas.find((e) => e.chave === 'analise')
  assert.equal(etapa.estado, 'andamento')
  assert.match(etapa.detalhe, /em análise/)
})

test('T2 participação encerrada não cobra envio; aguardando cadastro cobra', () => {
  assert.ok(!tipos(resumoMarca(com({ status_cadastro: 'encerrado' }))).includes('enviar'))
  assert.ok(tipos(resumoMarca(com({ status_cadastro: 'aguardando_cadastro' }))).includes('enviar'))
})

test('T3 ajuste pedido sem linha de correção: o título já diz "novamente"', () => {
  const r = resumoMarca(com({ combo_status: 'correcao_solicitada', status_cadastro: 'cadastro_completo' }))
  const p = r.pendencias.find((x) => x.tipo === 'enviar')
  assert.ok(p, 'reenvio é a ação')
  assert.match(p.titulo, /novamente/)
})

test('T4 aprovado: só cobra envio se mudou depois da aprovação', () => {
  const aprovado = { combo_status: 'aprovado', status_cadastro: 'cadastro_completo' }
  assert.ok(!tipos(resumoMarca(com(aprovado))).includes('enviar'))
  assert.ok(!tipos(resumoMarca(com(aprovado, { publicacao: { alterado_apos_aprovacao: false } }))).includes('enviar'))
  const r = resumoMarca(com(aprovado, { publicacao: { alterado_apos_aprovacao: true } }))
  const p = r.pendencias.find((x) => x.tipo === 'enviar')
  assert.match(p.titulo, /alterações/)
  assert.equal(r.combo.alteradoAposAprovacao, true)
  assert.match(r.etapas.find((e) => e.chave === 'analise').detalhe, /alterações/)
})

test('T5 100% dos campos, mas a edição exige mais: sem "tudo pronto" nem "enviar"', () => {
  const faltando = ['combo_nome', 'unidade:u1:modos', 'item:2:alimentar']
  const r = resumoMarca(com({}, { faltandoEdicao: faltando }))
  assert.equal(r.progresso.pct, 100, 'o % continua sendo só dos campos obrigatórios')
  assert.equal(r.envio.pronto, false)
  assert.equal(r.envio.faltam, 3)
  assert.ok(!tipos(r).includes('enviar'))
  assert.equal(r.pendencias.filter((p) => p.codigo).length, 3)
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
  assert.ok(tipos(r).includes('enviar'))
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
  assert.equal(u.pendencias.filter((p) => p.campo === 'unidade-endereco').length, 1)
  // Leitura da edição ausente: o campo básico continua contando (não há outra fonte).
  const sem = resumoMarca(com({}, { unidades: [] }))
  assert.equal(sem.envio.faltam, 1)
  assert.equal(sem.pendencias.filter((p) => p.campo === 'unidade-endereco').length, 1)
})

test('participação encerrada: a etapa de aprovação não diz "pronto para enviar" nem passa a vez para a marca', () => {
  const r = resumoMarca(com({ status_cadastro: 'encerrado' }, { faltandoEdicao: [] }))
  assert.ok(!tipos(r).includes('enviar'))
  assert.equal(r.envio.podeEnviar, false)
  assert.match(r.etapas.find((e) => e.chave === 'analise').detalhe, /encerrada/)
  const livre = resumoMarca(com({}, { faltandoEdicao: [] }))
  assert.equal(livre.envio.podeEnviar, true)
  assert.match(livre.etapas.find((e) => e.chave === 'analise').detalhe, /pronto para enviar/)
})

test('T6 só a logo faltando: o envio é possível e a mensagem não diz "tudo preenchido"', () => {
  const r = resumoMarca(com({ logo_id: null }))
  assert.equal(r.envio.pronto, true)
  const p = r.pendencias.find((x) => x.tipo === 'enviar')
  assert.ok(p)
  assert.match(p.texto, /logo pode ser enviada depois/)
  assert.doesNotMatch(p.texto, /Tudo preenchido/)
  assert.equal(r.proxima.campo, 'logo', 'a logo vem antes do envio na ordem')
})

test('T7 correção aberta é a próxima ação; corrigida e em análise vira "em análise"', () => {
  const aberta = resumoMarca(com({}, { correcoes: [{ campo: 'telefone', bloco: 0, estado: 'aberta', comentario: 'Número errado' }] }))
  assert.equal(aberta.proxima.tipo, 'correcao')
  assert.equal(aberta.proxima.critica, true)
  const corrigida = resumoMarca(com({ combo_status: 'em_analise' }, { correcoes: [{ campo: 'telefone', bloco: 0, estado: 'corrigida' }] }))
  assert.deepEqual(corrigida.campo('telefone'), { estado: 'analise' })
  assert.ok(!tipos(corrigida).includes('enviar'))
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

test('T8 agrupar não perde nem repete: soma dos grupos = pendências, menos o destaque e o envio', () => {
  const r = resumoMarca({
    ...com({}, { itens: [{ ...itens[0], descricao: '' }, { ...itens[1], descricao: '' }, { ...itens[2], descricao: '' }] }),
    arquivosParaLer: 2, fotosParaLer: 1, vagasAbertas: 2,
    pedidos: [{ id: 'p1', titulo: 'A', bloco: 'livre', prioridade: 'normal', estado: 'pendente' }, { id: 'p2', titulo: 'B', bloco: 'combo', prioridade: 'normal', estado: 'pendente' }],
  })
  const grupos = agruparPendencias(r.pendencias, { fora: r.proxima })
  const total = grupos.reduce((n, g) => n + g.itens.length, 0)
  assert.equal(total, r.pendencias.filter((p) => p !== r.proxima && p.tipo !== 'enviar').length)
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
