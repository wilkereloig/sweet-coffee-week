import { test } from 'node:test'
import assert from 'node:assert/strict'
import { STATUS, TONS, rotulo, tom, rotulos } from '../painel-app/src/lib/status.js'

// Valores aceitos pelos CHECKs do banco (conferidos em 29/09/2026 contra
// pg_constraint). Status novo no banco entra aqui E em lib/status.js.
const CHECKS = {
  candidatura: ['novo', 'em_analise', 'contatado', 'aprovado', 'nao_selecionado', 'aguardando_cadastro',
    'cadastro_completo', 'em_negociacao', 'fechado', 'arquivado', 'respondido', 'encerrado'],
  cadastro: ['aguardando_cadastro', 'em_preenchimento', 'cadastro_completo', 'encerrado'],
  combo: ['rascunho', 'em_analise', 'correcao_solicitada', 'aprovado'],
  tema: ['proposto', 'aprovado', 'recusado', 'substituido'],
  pagamento: ['nao_informado', 'pendente', 'parcial', 'quitado', 'isento'],
  foto: ['pendente', 'liberado', 'nao_liberado'],
  sessao: ['aberto', 'agendada', 'realizada', 'cancelada', 'remarcada'],
  pedido: ['pendente', 'respondido'],
  historico: ['nao_avaliado', 'recorrente_confirmado', 'novo_confirmado', 'possivel_correspondencia',
    'sem_correspondencia_no_acervo', 'revisar'],
  vinculo: ['possivel', 'confirmado', 'rejeitado'],
  material: ['mesas', 'adesivo_prisma', 'prisma_mesa', 'placa_externa', 'display_balcao', 'voucher', 'outro'],
  material_status: ['previsto', 'separado', 'entregue', 'cancelado'],
  presskit: ['constou_na_lista', 'selecionado', 'confirmado', 'enviado', 'entregue', 'nao_entregue', 'cancelado'],
  tipo_contato: ['influenciador', 'convidado', 'parceiro', 'imprensa', 'outro'],
  pendencia: ['dado_inconsistente', 'possivel_correspondencia', 'possivel_duplicidade', 'conflito_tema',
    'dado_ausente', 'outro'],
  revisao: ['aberta', 'resolvida', 'descartada'],
  importacao_lote: ['staging', 'validado', 'promovido', 'revertido', 'cancelado'],
  importacao_linha: ['pendente', 'importado', 'ignorado', 'rejeitado'],
  envio: ['copiado', 'whatsapp_aberto', 'enviado_manual'],
  correcao: ['aberta', 'corrigida', 'resolvida'],
  prioridade: ['normal', 'importante'],
}

test('todo valor dos CHECKs do banco tem rótulo e tom válido', () => {
  for (const [dom, valores] of Object.entries(CHECKS)) {
    assert.ok(STATUS[dom], 'domínio ausente: ' + dom)
    for (const v of valores) {
      const e = STATUS[dom][v]
      assert.ok(e && e.rotulo, dom + '.' + v + ' sem rótulo')
      assert.ok(TONS.includes(e.tom), dom + '.' + v + ' com tom inválido: ' + (e && e.tom))
    }
  }
})

test('valor desconhecido não some nem quebra', () => {
  assert.equal(rotulo('sessao', 'algo_novo'), 'algo novo')
  assert.equal(rotulo('sessao', null), '—')
  assert.equal(tom('sessao', 'algo_novo'), 'neutro')
  assert.equal(rotulo('inexistente', 'x'), 'x')
})

test('rotulos() junta domínios sem o segundo sobrescrever o primeiro', () => {
  const m = rotulos('candidatura', 'cadastro')
  assert.equal(m.aguardando_cadastro, 'Aguardando cadastro')
  assert.equal(m.em_preenchimento, 'Em preenchimento')
  assert.equal(m.sem_participacao, 'Sem participação')
})

test('o mesmo estado tem o mesmo nome nos rótulos da organização e da marca', () => {
  assert.equal(rotulo('cadastro', 'cadastro_completo'), rotulo('candidatura', 'cadastro_completo'))
  assert.equal(rotulo('cadastro', 'aguardando_cadastro'), rotulo('candidatura', 'aguardando_cadastro'))
})
