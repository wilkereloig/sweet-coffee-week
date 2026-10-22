/*
 * Correções da auditoria geral do painel — 21/10/2026 (lote 1). Cada teste prende um defeito que já existiu.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { FUNCOES_ESCRITA } from '../painel-app/src/lib/sync/dominios.js'

const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')

test('Respostas › Criar acesso: a resposta da função não sombreia o rascunho da triagem (a conta nascia e a tela dizia "Não criou")', () => {
  const s = ler('painel-app/src/components/vistas/Respostas.jsx')
  const corpo = s.slice(s.indexOf('async function criarAcesso()'), s.indexOf('const naoAprovado'))
  assert.doesNotMatch(corpo, /const r = await chamarFuncao/, '`r` é o rascunho da triagem (useRascunhoOrg)')
  assert.match(corpo, /const resp = await chamarFuncao\('criar-acesso-marca'/)
  assert.match(corpo, /r\.editar\('status', 'aguardando_cadastro'\)/, 'o rascunho acompanha o status novo')
  assert.match(corpo, /senha: resp\.senha/)
})

test('criar-acesso-marca avisa a lista de candidaturas (o banco move a candidatura para "aguardando cadastro")', () => {
  assert.ok(FUNCOES_ESCRITA['criar-acesso-marca'].includes('respostas'))
})

test('Biblioteca: a arte em uso não vira "Apagada" só porque a primeira postagem a largou', () => {
  const sql = ler('supabase/migrations/20261026_social_biblioteca_arte_em_uso.sql')
  assert.match(sql, /order by a\.path, \(a\.removido_em is not null\), a\.criado_em/, 'entre as linhas do mesmo caminho, a ativa vem antes')
  assert.match(sql, /redes_exigir\(p_secret, 'redes\.ver'\)/)
  assert.doesNotMatch(sql, /drop |delete from/i)
})

test('Sair encerra só ESTE aparelho (sem escopo o GoTrue encerra a conta em todos)', () => {
  const app = ler('painel-app/src/App.jsx')
  assert.equal((app.match(/auth\('logout\?scope=local'/g) || []).length, 2, 'organização e marca')
  assert.doesNotMatch(app, /auth\('logout',/)
})

test('rascunhos do Social media não passam para a próxima conta na mesma aba', async () => {
  const { limparRascunhosSocial, PREFIXO_RASCUNHO, CHAVE_NOVA_POSTAGEM } = await import('../painel-app/src/lib/rascunhosSocial.js')
  const dados = { scw_redes_rascunho_abc: '1', scw_redes_rascunho_novo: '2', scw_social_nova_postagem: '3', scw_org: 'senha', outra: '4' }
  const st = { ...dados, removeItem(k) { delete this[k] } }
  limparRascunhosSocial(st)
  assert.deepEqual(Object.keys(st).filter((k) => k !== 'removeItem').sort(), ['outra', 'scw_org'], 'só os rascunhos saem')
  assert.doesNotThrow(() => limparRascunhosSocial(null))
  assert.doesNotThrow(() => limparRascunhosSocial({ removeItem() { throw new Error('bloqueado') }, scw_redes_rascunho_x: '1' }))
  // As chaves são as que as telas realmente gravam.
  assert.ok(ler('painel-app/src/components/vistas/RedesFicha.jsx').includes("'" + PREFIXO_RASCUNHO + "_novo'"))
  assert.ok(ler('painel-app/src/components/vistas/RedesFicha.jsx').includes("'" + PREFIXO_RASCUNHO + "_' + id"))
  assert.ok(ler('painel-app/src/components/vistas/SocialParticipantes.jsx').includes("'" + CHAVE_NOVA_POSTAGEM + "'"))
  const app = ler('painel-app/src/App.jsx')
  assert.match(app, /async function sairOrg[\s\S]*limparRascunhosSocial\(\)/)
  assert.match(app, /function trocaLocal\(\) \{\s*limparRascunhosSocial\(\)/)
})

test('pedido arquivado não conta como "faltando resposta" (a tela de destino não o mostra)', () => {
  assert.match(ler('painel-app/src/components/vistas/Mesa.jsx'), /s\.publicada_em && !s\.arquivada/)
  assert.match(ler('painel-app/src/lib/notificacoes.js'), /s\.publicada_em && !s\.arquivada && Number\(s\.pendentes/)
})

test('agenda de fotos: sessão remarcada ocupa o horário', () => {
  const fonte = ler('painel-app/src/lib/producao.js')
  assert.match(fonte, /x\.status === 'remarcada'/, 'o slot enxerga a sessão remarcada')
  assert.match(fonte, /s\.status === 'agendada' \|\| s\.status === 'remarcada'/, 'e a mostra como reservada')
})

test('Operação › Pedidos: restaurar o último arquivado não deixa a lista vazia sem saída', () => {
  assert.match(ler('painel-app/src/components/vistas/Producao.jsx'), /solicitacoes && \(verArquivados \|\| solicitacoes\.some\(\(s\) => s\.arquivada\)\)/)
})

test('aprovar tema e criar acessos em lote pedem confirmação', () => {
  for (const [arq, re] of [
    ['painel-app/src/components/vistas/Edicao.jsx', /status === 'aprovado' && !\(await confirmar\('Aprovar o tema/],
    ['painel-app/src/components/vistas/FichaOperacao.jsx', /status === 'aprovado' && !\(await confirmar\('Aprovar o tema/],
  ]) assert.match(ler(arq), re, arq)
  const m = ler('painel-app/src/components/vistas/Marcas.jsx')
  assert.equal((m.match(/confirmar\('Criar o acesso de '/g) || []).length, 2, 'botão do topo e ação em lote')
})
