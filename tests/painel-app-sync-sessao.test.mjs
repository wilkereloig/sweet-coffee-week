import { test } from 'node:test'
import assert from 'node:assert/strict'
import { criarSincronizacao, usuarioDoToken, CONFERENCIA_MS, PERIODICO_MS, VOLTA_MINIMA_MS } from '../painel-app/src/lib/sync/sessao.js'
import { criarBarramento } from '../painel-app/src/lib/sync/barramento.js'
import { relogioFalso, fluxo } from './helpers/phoenix-falso.mjs'

function jwt(sub) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  return b64({ alg: 'HS256' }) + '.' + b64({ sub, role: 'authenticated' }) + '.assinatura'
}

function montar() {
  const rel = relogioFalso()
  const barramento = criarBarramento({ agora: rel.agora, agendar: rel.agendar, cancelar: rel.cancelar })
  const ctx = { rel, barramento, transportes: [], visivel: true, online: true, ouvintesAmbiente: {}, avisos: [] }
  const ambiente = {
    ouvir: (ev, fn) => { (ctx.ouvintesAmbiente[ev] ||= new Set()).add(fn); return () => ctx.ouvintesAmbiente[ev].delete(fn) },
    visivel: () => ctx.visivel,
    online: () => ctx.online,
  }
  ctx.emitir = (ev, arg) => { for (const f of [...(ctx.ouvintesAmbiente[ev] || [])]) f(arg) }
  ctx.sync = criarSincronizacao({
    barramento,
    anunciar: (dominios, o) => barramento.anunciar(dominios, o),
    ambiente,
    criarTransporte: ({ aoSinal, aoReconectar }) => {
      const ouvintes = new Set()
      const t = {
        estadoAtual: { conexao: 'conectando', erro: null, ativo: false, canais: {}, negados: [], tentativas: 0 },
        iniciou: 0, parou: 0, agora: 0, canaisAtualizados: 0, aoSinal, aoReconectar,
        iniciar() { t.iniciou += 1 }, parar() { t.parou += 1 }, conectarAgora() { t.agora += 1 }, atualizarCanais() { t.canaisAtualizados += 1 },
        estado: () => t.estadoAtual,
        ouvirEstado: (f) => { ouvintes.add(f); return () => ouvintes.delete(f) },
        mudar(parcial) { t.estadoAtual = { ...t.estadoAtual, ...parcial }; for (const f of [...ouvintes]) f(t.estadoAtual) },
      }
      ctx.transportes.push(t)
      return t
    },
    agendar: rel.agendar, cancelar: rel.cancelar, agora: rel.agora,
  })
  ctx.ouvir = (dominios) => { const recebidos = []; barramento.ouvir(dominios, (a) => recebidos.push(a)); return recebidos }
  return ctx
}
const ativar = (t) => t.mudar({ conexao: 'aberto', ativo: true, canais: { 'scw:org': 'ativo' } })

test('usuarioDoToken lê só o sub; token inválido não quebra', () => {
  assert.equal(usuarioDoToken(jwt('u-123')), 'u-123')
  assert.equal(usuarioDoToken('lixo'), null)
  assert.equal(usuarioDoToken(null), null)
})

test('acesso compartilhado (legado): sem canal, modo "periodico" a cada 45 s só com aba visível e rede', async () => {
  const c = montar()
  const rec = c.ouvir(['participantes'])
  c.sync.iniciar({ tipo: 'legado' })
  assert.equal(c.transportes.length, 0, 'sem token não há canal, e a senha nunca vai a canal nenhum')
  assert.equal(c.sync.estado().modo, 'periodico')
  assert.equal(c.sync.estado().tempoRealAtivo, false)
  await c.rel.avancar(PERIODICO_MS + 300)
  assert.equal(rec.length, 1)
  assert.deepEqual(rec[0].origens, ['reconciliacao'])
  c.visivel = false
  await c.rel.avancar(PERIODICO_MS)
  assert.equal(rec.length, 1, 'aba escondida não consulta')
  c.visivel = true; c.online = false
  await c.rel.avancar(PERIODICO_MS)
  assert.equal(rec.length, 1, 'sem rede não consulta')
})

test('"tempo real" só aparece com os canais confirmados; antes disso o modo é periódico', async () => {
  const c = montar()
  c.sync.iniciar({ tipo: 'org', uid: 'u1' })
  const t = c.transportes[0]
  assert.equal(t.iniciou, 1)
  assert.equal(c.sync.estado().modo, 'periodico')
  assert.equal(c.sync.estado().tempoRealAtivo, false)
  assert.equal(c.sync.estado().conectando, true)
  ativar(t)
  assert.equal(c.sync.estado().modo, 'tempo_real')
  assert.equal(c.sync.estado().tempoRealAtivo, true)
})

test('com tempo real ativo a conferência de segurança é a cada 3 min; sem ele, a cada 45 s', async () => {
  const c = montar()
  const rec = c.ouvir(['avisos'])
  c.sync.iniciar({ tipo: 'org', uid: 'u1' })
  const t = c.transportes[0]
  await c.rel.avancar(PERIODICO_MS + 300)
  assert.equal(rec.length, 1, 'ainda sem canal: 45 s')
  ativar(t)
  await c.rel.avancar(PERIODICO_MS)
  assert.equal(rec.length, 1, 'com canal confirmado não consulta a cada 45 s')
  await c.rel.avancar(CONFERENCIA_MS)
  assert.equal(rec.length, 2, 'conferência de segurança')
})

test('sinal do servidor vira aviso "remota" com id opaco; o resto do mundo não é tocado', async () => {
  const c = montar()
  const rec = c.ouvir(['participantes']); const outro = c.ouvir(['redes'])
  c.sync.iniciar({ tipo: 'org', uid: 'u1' })
  c.transportes[0].aoSinal({ topico: 'scw:org', dominio: 'participantes', ref: 'p9', t: 1 })
  await c.rel.avancar(300)
  assert.equal(rec.length, 1)
  assert.deepEqual(rec[0].origens, ['remota'])
  assert.deepEqual(rec[0].refs, ['p9'])
  assert.equal(outro.length, 0)
})

test('reconexão do canal relê tudo o que está na tela (cobre evento perdido)', async () => {
  const c = montar()
  const rec = c.ouvir(['pedidos', 'fotos'])
  c.sync.iniciar({ tipo: 'org', uid: 'u1' })
  c.transportes[0].aoReconectar()
  await c.rel.avancar(300)
  assert.equal(rec.length, 1)
  assert.deepEqual(rec[0].origens, ['reconciliacao'])
  assert.deepEqual([...rec[0].dominios].sort(), ['fotos', 'pedidos'])
})

test('voltar ao app: relê se ficou fora ≥ 3 s; pisca rápido não relê; reconecta se o canal caiu', async () => {
  const c = montar()
  const rec = c.ouvir(['mensagens'])
  c.sync.iniciar({ tipo: 'marca', uid: 'm1' })
  const t = c.transportes[0]
  c.visivel = false; c.emitir('visibilitychange')
  await c.rel.avancar(1000)
  c.visivel = true; c.emitir('visibilitychange')
  await c.rel.avancar(300)
  assert.equal(rec.length, 0, 'ficou fora só 1 s')
  c.visivel = false; c.emitir('visibilitychange')
  await c.rel.avancar(VOLTA_MINIMA_MS + 500)
  c.visivel = true; c.emitir('visibilitychange')
  await c.rel.avancar(300)
  assert.equal(rec.length, 1)
  assert.ok(t.agora >= 1, 'canal não estava ativo: reconecta já em vez de esperar o recuo')
})

test('rede voltou: reconecta e relê; sem rede a situação é "sem_conexao"', async () => {
  const c = montar()
  const rec = c.ouvir(['unidades'])
  c.sync.iniciar({ tipo: 'org', uid: 'u1' })
  ativar(c.transportes[0])
  c.online = false; c.emitir('offline')
  assert.equal(c.sync.estado().situacao, 'sem_conexao')
  c.online = true; c.emitir('online')
  await c.rel.avancar(300)
  assert.equal(c.sync.estado().situacao, 'atualizado')
  assert.ok(c.transportes[0].agora >= 1, 'pede ao transporte para reconectar já (ele mesmo ignora se o canal está ativo)')
  assert.equal(rec.length, 1)
})

test('rastrear: atualizando → atualizado; falha de leitura aparece; sessão expirada não é falha de sincronização', async () => {
  const c = montar()
  c.sync.iniciar({ tipo: 'org', uid: 'u1' })
  ativar(c.transportes[0])
  let soltar
  const p = c.sync.rastrear(new Promise((r) => { soltar = r }))
  assert.equal(c.sync.estado().situacao, 'atualizando')
  soltar('ok'); await p
  assert.equal(c.sync.estado().situacao, 'atualizado')
  assert.ok(c.sync.estado().ultimaEm !== null)
  await assert.rejects(c.sync.rastrear(Promise.reject(new Error('HTTP 500'))))
  assert.equal(c.sync.estado().situacao, 'falha')
  assert.equal(c.sync.estado().detalhe, 'leitura_falhou')
  await c.sync.rastrear(Promise.resolve(1))
  assert.equal(c.sync.estado().situacao, 'atualizado', 'uma leitura boa limpa a falha')
  await assert.rejects(c.sync.rastrear(Promise.reject(new Error('sessao_expirada'))))
  assert.equal(c.sync.estado().situacao, 'atualizado')
})

test('canal negado ou tempo real instável aparece como falha de sincronização (e continua conferindo a cada 45 s)', async () => {
  const c = montar()
  const rec = c.ouvir(['arquivos'])
  c.sync.iniciar({ tipo: 'org', uid: 'u1' })
  const t = c.transportes[0]
  t.mudar({ conexao: 'aberto', negados: ['scw:org'], canais: { 'scw:org': 'negado' } })
  assert.equal(c.sync.estado().situacao, 'falha')
  assert.equal(c.sync.estado().detalhe, 'canal_negado')
  assert.equal(c.sync.estado().modo, 'periodico')
  await c.rel.avancar(PERIODICO_MS + 300)
  assert.equal(rec.length, 1)
  t.mudar({ negados: [], conexao: 'caido', tentativas: 4 })
  assert.equal(c.sync.estado().detalhe, 'tempo_real_indisponivel')
})

test('troca de conta: o transporte antigo para, o barramento muda de época e o novo nasce limpo', async () => {
  const c = montar()
  const rec = c.ouvir(['participantes'])
  c.sync.iniciar({ tipo: 'org', uid: 'u1' })
  const epoca = c.barramento.epoca()
  c.barramento.anunciar(['participantes'])           // aviso pendente da conta antiga
  c.sync.iniciar({ tipo: 'marca', uid: 'm1' })
  assert.equal(c.transportes.length, 2)
  assert.equal(c.transportes[0].parou, 1)
  assert.equal(c.transportes[1].iniciou, 1)
  assert.ok(c.barramento.epoca() > epoca, 'resposta da conta antiga perde o direito de gravar em tela')
  await c.rel.avancar(500)
  assert.equal(rec.length, 0, 'o aviso da conta anterior foi descartado')
})

test('StrictMode: iniciar duas vezes com a mesma pessoa não duplica transporte nem ouvinte de ambiente', async () => {
  const c = montar()
  c.sync.iniciar({ tipo: 'org', uid: 'u1' })
  c.sync.iniciar({ tipo: 'org', uid: 'u1' })
  assert.equal(c.transportes.length, 1)
  assert.equal(c.ouvintesAmbiente.visibilitychange.size, 1)
  c.sync.parar()
  assert.equal(c.ouvintesAmbiente.visibilitychange.size, 0)
  assert.equal(c.rel.pendentes(), 0, 'nenhum timer sobrando')
  c.sync.parar()                                       // parar duas vezes é inofensivo
})

test('outra aba: sair ou entrar como OUTRA pessoa encerra este contexto; renovar o token não', async () => {
  const c = montar()
  const avisos = []
  c.sync.iniciar({ tipo: 'org', uid: 'u1', chaveStorage: 'scw_org_conta', aoTrocaDeConta: (m) => avisos.push(m) })
  c.emitir('storage', { key: 'scw_org_conta', newValue: JSON.stringify({ access_token: jwt('u1') }) })
  c.emitir('storage', { key: 'outra_chave', newValue: null })
  assert.deepEqual(avisos, [], 'mesmo usuário (token renovado) e outra chave: ignora')
  c.emitir('storage', { key: 'scw_org_conta', newValue: JSON.stringify({ access_token: jwt('u2') }) })
  assert.deepEqual(avisos, ['outra_conta_em_outra_aba'])
  assert.equal(c.transportes[0].parou, 1)
  assert.equal(c.sync.estado().modo, 'parado')
  const d = montar()
  const av2 = []
  d.sync.iniciar({ tipo: 'marca', uid: 'm1', chaveStorage: 'scw_marca', aoTrocaDeConta: (m) => av2.push(m) })
  d.emitir('storage', { key: 'scw_marca', newValue: null })
  assert.deepEqual(av2, ['saiu_em_outra_aba'])
})

test('perfil da própria pessoa mudou: refaz a lista de canais (permissão revogada ou concedida)', async () => {
  const c = montar()
  c.sync.iniciar({ tipo: 'org', uid: 'u1' })
  c.transportes[0].aoSinal({ topico: 'scw:pessoa:u1', dominio: 'perfis', ref: 'u1', t: 1 })
  assert.equal(c.transportes[0].canaisAtualizados, 1)
  c.transportes[0].aoSinal({ topico: 'scw:org', dominio: 'perfis', ref: 'u2', t: 1 })
  assert.equal(c.transportes[0].canaisAtualizados, 1, 'perfil de outra pessoa não mexe nos canais')
})

test('o estado devolvido é estável enquanto nada muda (necessário para useSyncExternalStore)', async () => {
  const c = montar()
  c.sync.iniciar({ tipo: 'org', uid: 'u1' })
  const a = c.sync.estado()
  assert.equal(c.sync.estado(), a)
  c.sync.rastrear(Promise.resolve(1)); await fluxo()
  const b = c.sync.estado()
  assert.equal(c.sync.estado(), b)
  const vistos = []
  c.sync.ouvirEstado((e) => vistos.push(e))
  c.emitir('offline'); c.emitir('offline')
  assert.equal(vistos.length, 0, 'sem mudança real (online segue true) ninguém é avisado')
  c.online = false; c.emitir('offline'); c.emitir('offline')
  assert.equal(vistos.length, 1, 'mudou uma vez → avisa uma vez')
})
