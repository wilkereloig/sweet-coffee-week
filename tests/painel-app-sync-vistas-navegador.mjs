/*
 * Integração de NAVEGADOR das vistas reais que releem sozinhas (19/10/2026): Producao, ArquivosOrg,
 * MateriaisEdicao, PublicacaoEdicao, Publicacao e LogoEditor, contra um servidor falso (page.route) e a
 * camada de sincronização de verdade. Não precisa de build: o bundle é feito em memória.
 *
 *   node tests/painel-app-sync-vistas-navegador.mjs            # todos os cenários
 *   node tests/painel-app-sync-vistas-navegador.mjs "Logo"     # só os que têm "Logo" no nome
 *
 * O que ele prova (e a leitura do código não prova): releitura silenciosa (nenhum esqueleto
 * "Carregando…" por cima do que está na tela), o digitado nunca é trocado, o campo não tocado
 * acompanha o banco, conflito pede escolha, só o que mudou vai ao servidor, trocar de registro não herda
 * dados, resposta velha não sobrescreve, falha de releitura não derruba a tela.
 */
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'

const REPO = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1').replace(/\/$/, '')
const SO = process.argv[2] || ''   // filtro opcional: só os cenários cujo nome contém este texto
const require = createRequire(REPO + '/package.json')
const esbuild = require('esbuild')
const { chromium } = require('playwright')

// O bundle fica só em memória (nada é gravado) e usa os módulos reais de painel-app/src.
const r = await esbuild.build({
  entryPoints: [REPO + '/tests/helpers/vistas-sync-harness.jsx'],
  bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'transform',
  define: { 'import.meta.env': '{}', 'process.env.NODE_ENV': '"development"' },
  loader: { '.css': 'empty', '.svg': 'dataurl', '.png': 'dataurl', '.webp': 'dataurl' },
  nodePaths: [REPO + '/node_modules'], logLevel: 'error',
})
const js = r.outputFiles[0].text

// ── servidor falso ───────────────────────────────────────────────────────────
const agoraIso = new Date().toISOString()
const S = {}
const chamadas = []
const envios = { urls: 0, puts: 0 }
function reiniciarServidor() {
  Object.assign(S, {
    edicao_atual: '2026.2',
    sessoes: [{ id: 's1', participacao_id: 'p1', participante_id: 'pt1', nome_marca: 'Doce Sol', edicao_codigo: '2026.2', data_hora: '2026-11-06T13:00:00+00:00', local: 'Loja', status: 'agendada', observacoes: 'Levar bolo' }],
    solicitacoes: [{ id: 'q1', titulo: 'Logo em alta', texto: 'Mande a logo', escopo: 'geral', bloco: 'livre', publicada_em: '2026-10-01T10:00:00+00:00', arquivada: false, respondidas: 1, pendentes: 1, prazo_em: null },
      { id: 'q2', titulo: 'Rascunho', texto: 'x', escopo: 'geral', bloco: 'livre', publicada_em: null, arquivada: false, respondidas: 0, pendentes: 0, prazo_em: null }],
    pendentes: [{ participacao_id: 'p1', marca: 'Doce Sol', estado: 'pendente' },
      { participacao_id: 'p2', marca: 'Café Alfa', estado: 'respondido', respondido_em: '2026-10-02T10:00:00+00:00', respondido_por: 'Eloi', resposta: 'ok' }],
    participantes: [{ participacao_id: 'p1', id: 'pt1', nome_marca: 'Doce Sol', edicao_codigo: '2026.2' }, { participacao_id: 'p2', id: 'pt2', nome_marca: 'Café Alfa', edicao_codigo: '2026.2' }],
    arquivos: [{ id: 'a1', nome: 'Regulamento', descricao: '', categoria: 'documento', versao: 1, exige_leitura: false, escopo: 'geral', path: 'geral/reg.pdf', mime: 'application/pdf', tamanho: 1000, arquivado: false, publicado_em: '2026-10-01T10:00:00+00:00', leituras: 0 }],
    materiais: [{ id: 'm1', marca: 'Doce Sol', item: 'mesa', quantidade: 4, status: 'separado', descricao: null, unidade: 'Loja 1', unidade_id: 'u1', participacao_id: 'p1', observacao: null, recebido_por: null, entregue_em: null }],
    pubEdicao2: { fase: 'preparacao', participantes_publicos: false, combos_publicos: false, avaliacao_aberta: false, avaliacao_abre_em: null, avaliacao_fecha_em: null, resultados_publicos: false, atualizado_por: 'Ana', atualizado_em: '2026-10-11T10:00:00+00:00' },
    pubEdicao: { fase: 'preparacao', participantes_publicos: false, combos_publicos: false, avaliacao_aberta: false, avaliacao_abre_em: null, avaliacao_fecha_em: null, resultados_publicos: false, atualizado_por: 'Eloi', atualizado_em: '2026-10-10T10:00:00+00:00' },
    logos: {
      A: { estado: 'confirmada', atual: { id: 'la', path: '/logos/a.png', origem: 'participante', nome_original: 'logo-A.png', criado_em: '2026-10-01T10:00:00+00:00', usada_em: [] }, versoes: [] },
      B: { estado: 'confirmada', atual: { id: 'lb', path: '/logos/b.png', origem: 'participante', nome_original: 'logo-B.png', criado_em: '2026-10-01T10:00:00+00:00', usada_em: [] }, versoes: [] },
    },
    pubs: {
      p1: { estado: 'nao_publicado', vigente: null, ultima: null, atual: { casa: { nome: 'Doce Sol' }, unidades: [], combo: { itens: [] } }, pendencias: [], combo_status: 'rascunho', alterado_apos_aprovacao: false, slug: null, midias: [], unidades: [] },
      p2: { estado: 'nao_publicado', vigente: null, ultima: null, atual: { casa: { nome: 'Café Alfa' }, unidades: [], combo: { itens: [] } }, pendencias: [], combo_status: 'rascunho', alterado_apos_aprovacao: false, slug: null, midias: [], unidades: [] },
    },
    falhar: {},
  })
  chamadas.length = 0
  envios.urls = 0; envios.puts = 0
}
reiniciarServidor()

async function tratar(nome, c) {
  chamadas.push({ nome, corpo: c })
  if (S.falhar[nome]) return { __erro: S.falhar[nome] }
  switch (nome) {
    case 'admin_ping': return true
    case 'get_solicitacoes_admin': return S.solicitacoes
    case 'get_sessoes_fotos': return S.sessoes
    case 'get_config_admin': return { edicao_atual: S.edicao_atual }
    case 'get_participantes': return S.participantes
    case 'get_pendentes_solicitacao': return S.pendentes
    case 'atualizar_sessao_fotos': {
      const s = S.sessoes.find((x) => x.id === c.p_sessao_id)
      for (const [k, col] of [['p_status', 'status'], ['p_local', 'local'], ['p_observacoes', 'observacoes']]) if (c[k] != null) s[col] = c[k]
      return undefined
    }
    case 'abrir_vaga_fotos': { await new Promise((ok) => setTimeout(ok, 150)); S.sessoes.push({ id: 'v' + S.sessoes.length, status: 'aberto', data_hora: c.p_data_hora, edicao_codigo: c.p_edicao }); return 'v' }
    case 'fechar_vaga_fotos': { S.sessoes = S.sessoes.filter((x) => x.id !== c.p_sessao_id); return undefined }
    case 'arquivar_arquivo': { S.arquivos.find((x) => x.id === c.p_id).arquivado = c.p_arquivar; return undefined }
    case 'definir_edicao_atual': S.edicao_atual = c.p_codigo || null; return undefined
    case 'atualizar_solicitacao': { S.solicitacoes.find((x) => x.id === c.p_id).arquivada = c.p_arquivada; return undefined }
    case 'publicar_solicitacao': { S.solicitacoes.find((x) => x.id === c.p_id).publicada_em = agoraIso; return 2 }
    case 'marcar_solicitacao': { const p = S.pendentes.find((x) => x.participacao_id === c.p_participacao); p.estado = c.p_respondido ? 'respondido' : 'pendente'; return undefined }
    case 'get_arquivos_admin': return S.arquivos
    case 'publicar_arquivo': { S.arquivos.push({ id: 'a2', nome: c.p_nome, descricao: '', categoria: c.p_categoria, versao: 1, exige_leitura: false, escopo: c.p_escopo, path: c.p_path, mime: c.p_mime, tamanho: c.p_tamanho, arquivado: false, publicado_em: agoraIso, leituras: 0 }); return 'a2' }
    case 'atualizar_arquivo': {
      const a = S.arquivos.find((x) => x.id === c.p_id)
      Object.assign(a, c.p_dados)
      return undefined
    }
    case 'get_materiais': return S.materiais
    case 'salvar_material': {
      const m = S.materiais.find((x) => x.id === c.p_item.id)
      Object.assign(m, c.p_item)
      return m.id
    }
    case 'get_publicacao_edicao': {
      if (S.segurarEdicao && S.segurarEdicao[c.p_edicao]) await S.segurarEdicao[c.p_edicao]
      return c.p_edicao === '2027.1' ? S.pubEdicao2 : S.pubEdicao
    }
    case 'definir_publicacao_edicao': { Object.assign(S.pubEdicao, c.p_dados); return S.pubEdicao }
    case 'get_avaliacoes_resumo': return []
    case 'get_logo_marca': {
      const id = c.p_participante
      if (S.segurarLogo && S.segurarLogo[id]) await S.segurarLogo[id]
      return S.logos[id]
    }
    case 'remover_logo': { S.logos[c.p_participante] = { estado: 'nao_enviada', atual: null, versoes: [] }; return undefined }
    case 'get_publicacao': return S.pubs[c.p_participacao]
    case 'org_salvar_dados_publicos': { S.pubs[c.p_participacao].slug = c.p_dados.slug_publico; return undefined }
    case 'get_publicacoes_edicao': return (S.publicacoes && S.publicacoes[c.p_edicao]) || []
    default: return null
  }
}

const navegador = await chromium.launch()
const ctx = await navegador.newContext()
const pagina = await ctx.newPage()
const erros = []
pagina.on('pageerror', (e) => erros.push('pageerror: ' + String(e)))
pagina.on('console', (m) => { if (m.type() === 'error') erros.push('console: ' + m.text()) })
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }
await pagina.route('http://harness.test/**', (rt) => rt.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><body><div id="root"></div></body></html>' }))
await pagina.route('**/rest/v1/rpc/**', async (rt) => {
  const req = rt.request()
  if (req.method() === 'OPTIONS') return rt.fulfill({ status: 204, headers: CORS })
  const nome = req.url().split('/rpc/')[1].split('?')[0]
  const corpo = JSON.parse(req.postData() || '{}')
  const resp = await tratar(nome, corpo)
  if (resp && resp.__erro) return rt.fulfill({ status: 400, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ message: resp.__erro }) })
  if (resp === undefined) return rt.fulfill({ status: 204, headers: CORS })
  return rt.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(resp) })
})
await pagina.route('**/functions/v1/arquivo-url', async (rt) => {
  if (rt.request().method() === 'OPTIONS') return rt.fulfill({ status: 204, headers: CORS })
  envios.urls++
  return rt.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ url: 'http://storage.test/obj' }) })
})
await pagina.route('http://storage.test/**', async (rt) => {
  if (rt.request().method() === 'OPTIONS') return rt.fulfill({ status: 204, headers: CORS })
  envios.puts++
  return rt.fulfill({ status: 200, headers: CORS, body: '' })
})
await pagina.goto('http://harness.test/')
await pagina.addScriptTag({ content: js })

const pausa = (ms) => new Promise((ok) => setTimeout(ok, ms))
const ev = (f, a) => pagina.evaluate(f, a)
const chamadasDe = (nome) => chamadas.filter((c) => c.nome === nome)
async function ate(cond, msg, ms = 4000) {
  const t0 = Date.now()
  for (;;) {
    let v = false
    try { v = await cond() } catch { v = false }
    if (v) return
    if (Date.now() - t0 > ms) throw new Error('tempo esgotado: ' + msg)
    await pausa(25)
  }
}
let n = 0
const ok = (nome) => console.log('ok  ' + (++n) + ' ' + nome)
const cenarios = []
const cenario = (nome, fn) => cenarios.push([nome, fn])
async function limpar() {
  await ev(() => { window.__vigia.ligado = false; window.__vigia.viu = [] })
  await pagina.reload(); await pagina.addScriptTag({ content: js })
  reiniciarServidor()
}
const vigiar = () => ev(() => { window.__vigia.viu = []; window.__vigia.ligado = true })
const viuCarregando = () => ev(() => window.__vigia.viu)
const anunciar = (d) => ev((x) => window.__anunciar(x), d)

cenario('SANIDADE: o vigia enxerga o esqueleto numa carga inicial', async () => {
  await vigiar()
  await ev(() => window.__montarProducao('pedidos'))
  await pagina.getByText('Logo em alta').first().waitFor()
  assert.ok((await viuCarregando()).length > 0, 'o vigia não enxergou nada: os testes de "sem esqueleto" seriam vazios')
})

// ═══ Producao › fotos ════════════════════════════════════════════════════════
cenario('Producao fotos: folha de sessão aberta resiste à releitura (digitado intacto, não tocado acompanha, sem esqueleto)', async () => {
  await ev(() => window.__montarProducao('fotos'))
  await pagina.getByText('Doce Sol').first().waitFor()
  await pagina.getByRole('button', { name: 'Mudar' }).click()
  const local = pagina.getByLabel('Local', { exact: true })
  const obs = pagina.locator('textarea')
  await local.waitFor()
  assert.equal(await local.inputValue(), 'Loja')
  assert.equal(await obs.inputValue(), 'Levar bolo')
  await local.fill('Loja Centro')
  await vigiar()
  // outra pessoa mexe em Observações e na Situação
  S.sessoes[0].observacoes = 'Levar bolo e café'
  S.sessoes[0].status = 'remarcada'
  await anunciar(['fotos'])
  await ate(async () => (await obs.inputValue()) === 'Levar bolo e café', 'observações acompanharam o banco')
  assert.equal(await local.inputValue(), 'Loja Centro', 'o digitado foi trocado pela releitura')
  const aviso = await pagina.locator('.pn-aviso-externo').innerText()
  assert.match(aviso, /Atualizado por outra pessoa/)
  assert.match(aviso, /Observações/)
  assert.deepEqual(await viuCarregando(), [], 'apareceu esqueleto "Carregando…" durante a releitura')
  assert.deepEqual(await ev(() => window.__externas()), ['Sessão de fotos (alteração não salva)'])
  // salvar: só o campo mexido vai
  await pagina.getByRole('button', { name: 'Salvar', exact: true }).click()
  await ate(async () => chamadasDe('atualizar_sessao_fotos').length === 1, 'salvou')
  const corpo = chamadasDe('atualizar_sessao_fotos')[0].corpo
  assert.equal(corpo.p_local, 'Loja Centro')
  assert.equal(corpo.p_status, null, 'status não mexido não vai')
  assert.equal(corpo.p_observacoes, null, 'observações não mexidas não vão')
  assert.equal(corpo.p_data_hora, null)
  await pagina.getByText('Salvo.').waitFor()
  await ate(async () => (await pagina.locator('.og-item__meta').allInnerTexts()).some((t) => t.includes('Loja Centro')), 'lista mostra o local novo')
  assert.equal(S.sessoes[0].observacoes, 'Levar bolo e café', 'a alteração da outra pessoa foi preservada')
  assert.equal(S.sessoes[0].status, 'remarcada')
})

cenario('Producao fotos: conflito no mesmo campo bloqueia o salvar até escolher', async () => {
  await ev(() => window.__montarProducao('fotos'))
  await pagina.getByRole('button', { name: 'Mudar' }).click()
  const obs = pagina.locator('textarea')
  await obs.fill('minha obs')
  S.sessoes[0].observacoes = 'obs deles'
  await anunciar(['fotos'])
  await pagina.getByText('Esta informação mudou').waitFor()
  assert.equal(await obs.inputValue(), 'minha obs')
  assert.equal(await pagina.getByRole('button', { name: 'Salvar', exact: true }).isDisabled(), true)
  await pagina.getByRole('button', { name: 'Manter a minha' }).click()
  await ate(async () => !(await pagina.getByRole('button', { name: 'Salvar', exact: true }).isDisabled()), 'salvar liberado')
  await pagina.getByRole('button', { name: 'Salvar', exact: true }).click()
  await ate(async () => chamadasDe('atualizar_sessao_fotos').length === 1, 'salvou')
  assert.equal(chamadasDe('atualizar_sessao_fotos')[0].corpo.p_observacoes, 'minha obs')
})

cenario('Producao fotos: abrir vaga espera a agenda e não duplica no clique duplo', async () => {
  S.sessoes = []
  await ev(() => window.__montarProducao('fotos'))
  const slot = pagina.locator('.og-slot').first()
  await slot.waitFor()
  await slot.dblclick()
  await ate(async () => (await pagina.locator('.og-slot--aberto').count()) === 1, 'agenda mostra a vaga aberta')
  await pausa(300)
  assert.equal(chamadasDe('abrir_vaga_fotos').length, 1, 'clique duplo abriu duas vagas')
  assert.equal(S.sessoes.length, 1)
})

// ═══ Producao › edicao ═══════════════════════════════════════════════════════
cenario('Producao edicao: código digitado resiste à releitura; conflito pede escolha; salvar normaliza', async () => {
  await ev(() => window.__montarProducao('edicao'))
  const campo = pagina.getByLabel('Código da edição', { exact: true })
  await ate(async () => (await campo.inputValue()) === '2026.2', 'campo acompanhou o banco ao carregar')
  await campo.fill('2027')
  S.edicao_atual = '2026.3'
  await anunciar(['edicao', 'configuracao'])
  await pagina.getByText('Esta informação mudou').waitFor()
  assert.equal(await campo.inputValue(), '2027', 'digitado trocado')
  assert.equal(await pagina.getByRole('button', { name: 'Salvar edição' }).isDisabled(), true)
  await pagina.getByRole('button', { name: 'Usar a nova' }).click()
  await ate(async () => (await campo.inputValue()) === '2026.3', 'usou a nova')
  // sem digitar nada, uma mudança externa acompanha em silêncio (com aviso informativo)
  S.edicao_atual = '2026.4'
  await anunciar(['edicao', 'configuracao'])
  await ate(async () => (await campo.inputValue()) === '2026.4', 'não tocado acompanha')
  // salvar com espaços: o campo volta aparado
  await campo.fill('  2028 ')
  await pagina.getByRole('button', { name: 'Salvar edição' }).click()
  await ate(async () => chamadasDe('definir_edicao_atual').length === 1, 'salvou')
  assert.equal(chamadasDe('definir_edicao_atual')[0].corpo.p_codigo, '2028')
  await ate(async () => (await campo.inputValue()) === '2028', 'campo normalizado')
  assert.equal(await ev(() => window.__edicaoMudou), 1, 'onEdicaoMudou chamado')
  assert.deepEqual(await ev(() => window.__pendencias()), [], 'sem pendência depois de salvar')
})

// ═══ Producao › pedidos ══════════════════════════════════════════════════════
cenario('Producao pedidos: "Quem falta" aberto se atualiza sozinho, sem esqueleto', async () => {
  await ev(() => window.__montarProducao('pedidos'))
  await pagina.getByText('Logo em alta').first().waitFor()
  await pagina.getByRole('button', { name: 'Quem falta' }).click()
  await pagina.getByText('Dar por respondido').waitFor()
  await vigiar()
  S.pendentes[0].estado = 'respondido'     // a marca respondeu
  S.pendentes[0].respondido_em = agoraIso
  S.pendentes[0].respondido_por = 'Marca'
  await anunciar(['pedidos'])
  await ate(async () => (await pagina.getByRole('button', { name: 'Reabrir' }).count()) === 2, 'lista da folha atualizou')
  assert.deepEqual(await viuCarregando(), [], 'esqueleto durante a releitura da folha')
  // marcar manualmente
  await pagina.getByRole('button', { name: 'Reabrir' }).first().click()
  await ate(async () => chamadasDe('marcar_solicitacao').length === 1, 'marcou')
  await ate(async () => (await pagina.getByRole('button', { name: 'Dar por respondido' }).count()) === 1, 'patch local aplicado')
})

cenario('Producao pedidos: publicar/arquivar sem releitura bloqueante e sem esqueleto', async () => {
  await ev(() => window.__montarProducao('pedidos'))
  await pagina.getByText('Rascunho').first().waitFor()
  await vigiar()
  await pagina.getByRole('button', { name: 'Publicar', exact: true }).click()
  await pagina.getByRole('button', { name: 'Publicar', exact: true }).last().click()   // confirmação
  await pagina.getByText('Publicado para 2 marcas.').waitFor()
  await ate(async () => (await pagina.getByRole('button', { name: 'Publicar', exact: true }).count()) === 0, 'botão publicar sumiu')
  assert.deepEqual(await viuCarregando(), [])
})

cenario('Producao: falha de releitura depois da carga não derruba a tela (aviso + conteúdo), indicador em falha', async () => {
  await ev(() => window.__montarProducao('pedidos'))
  await pagina.getByText('Logo em alta').first().waitFor()
  S.falhar.get_solicitacoes_admin = 'servidor caiu'
  await anunciar(['pedidos'])
  await pagina.getByText('Não consegui atualizar').first().waitFor()
  assert.equal(await pagina.getByText('Logo em alta').first().isVisible(), true, 'a lista sumiu na falha')
  assert.equal((await ev(() => window.__estadoSync())).situacao, 'falha')
  delete S.falhar.get_solicitacoes_admin
  await pagina.getByRole('button', { name: 'Tentar de novo' }).first().click()
  await ate(async () => (await pagina.getByText('Não consegui atualizar').count()) === 0, 'aviso saiu depois da boa')
})

cenario('Producao: falha na carga inicial mostra a tela de erro com "Tentar de novo"', async () => {
  S.falhar.get_solicitacoes_admin = 'servidor caiu'
  await ev(() => window.__montarProducao('pedidos'))
  await pagina.getByText('Não consegui carregar').waitFor()
  delete S.falhar.get_solicitacoes_admin
  await pagina.getByRole('button', { name: 'Tentar de novo' }).click()
  await pagina.getByText('Logo em alta').first().waitFor()
})

// ═══ Arquivos ═══════════════════════════════════════════════════════════════
cenario('Arquivos: editar manda só o que mudou e não desfaz a versão trocada por outra pessoa', async () => {
  await ev(() => window.__montarArquivos('gerais'))
  await pagina.getByText('Regulamento').first().waitFor()
  await pagina.getByRole('button', { name: 'Editar Regulamento' }).click()
  const nome = pagina.getByLabel('Nome que a marca vê')
  await nome.fill('  Regulamento 2027 ')
  await vigiar()
  S.arquivos[0].versao = 2        // outra pessoa substituiu o arquivo
  S.arquivos[0].exige_leitura = true
  await anunciar(['arquivos'])
  await ate(async () => (await pagina.getByLabel(/^Versão/).inputValue()) === '2', 'versão acompanhou')
  assert.equal(await nome.inputValue(), '  Regulamento 2027 ', 'digitado trocado')
  assert.equal(await pagina.getByLabel('Pedir confirmação de leitura').isChecked(), true)
  assert.deepEqual(await viuCarregando(), [])
  await pagina.getByRole('button', { name: 'Salvar', exact: true }).click()
  await ate(async () => chamadasDe('atualizar_arquivo').length === 1, 'salvou')
  assert.deepEqual(chamadasDe('atualizar_arquivo')[0].corpo.p_dados, { nome: 'Regulamento 2027' })
  assert.equal(S.arquivos[0].versao, 2)
  assert.equal(S.arquivos[0].exige_leitura, true)
})

cenario('Arquivos: arquivar muda de aba na hora', async () => {
  await ev(() => window.__montarArquivos('gerais'))
  await pagina.getByText('Regulamento').first().waitFor()
  await pagina.getByRole('button', { name: 'Arquivar Regulamento' }).click()
  await pagina.getByRole('button', { name: 'Arquivar', exact: true }).last().click()
  await pagina.getByText('Nenhum arquivo aqui').waitFor()
})

cenario('Arquivos: registro que falha depois do envio não faz o arquivo subir duas vezes', async () => {
  await ev(() => window.__montarArquivos('gerais'))
  await pagina.getByText('Regulamento').first().waitFor()
  await pagina.getByRole('button', { name: 'Publicar arquivo' }).click()
  await pagina.getByLabel('Arquivo', { exact: true }).setInputFiles({ name: 'guia.pdf', mimeType: 'application/pdf', buffer: Buffer.from('conteudo') })
  S.falhar.publicar_arquivo = 'banco indisponivel'
  await pagina.getByRole('button', { name: 'Publicar', exact: true }).click()
  await pagina.getByText(/O arquivo já foi enviado/).waitFor()
  assert.equal(envios.puts, 1)
  delete S.falhar.publicar_arquivo
  await pagina.getByRole('button', { name: 'Publicar', exact: true }).click()
  await pagina.getByText('Publicado.').waitFor()
  assert.equal(envios.puts, 1, 'o arquivo subiu duas vezes')
  assert.equal(envios.urls, 1, 'assinou a URL duas vezes')
  assert.equal(chamadasDe('publicar_arquivo').length, 2)
  await ate(async () => (await pagina.getByText('guia.pdf').count()) > 0, 'a lista mostra o arquivo novo sem releitura manual')
})

// ═══ Materiais ══════════════════════════════════════════════════════════════
cenario('Materiais: "Marcar entregue" manda a linha de AGORA, não a do clique', async () => {
  await ev(() => window.__montarMateriais())
  await pagina.getByText('Doce Sol').first().waitFor()
  await pagina.getByRole('button', { name: 'Marcar entregue' }).click()
  const campo = pagina.locator('dialog input[type=text]')
  await campo.waitFor()
  // enquanto o diálogo está aberto, outra pessoa muda a quantidade
  S.materiais[0].quantidade = 9
  await anunciar(['materiais'])
  await ate(async () => (await pagina.getByText(/· 9/).count()) > 0, 'lista atualizou por baixo do diálogo')
  await campo.fill('Ana')
  await pagina.locator('dialog button[type=submit]').click()
  await ate(async () => chamadasDe('salvar_material').length === 1, 'salvou')
  assert.equal(chamadasDe('salvar_material')[0].corpo.p_item.quantidade, 9, 'a linha antiga foi regravada')
  assert.equal(chamadasDe('salvar_material')[0].corpo.p_item.recebido_por, 'Ana')
})

cenario('Materiais: se outra pessoa já entregou durante o diálogo, nada é gravado', async () => {
  await ev(() => window.__montarMateriais())
  await pagina.getByRole('button', { name: 'Marcar entregue' }).click()
  const campo = pagina.locator('dialog input[type=text]')
  await campo.waitFor()
  S.materiais[0].status = 'entregue'
  await anunciar(['materiais'])
  await ate(async () => (await pagina.getByRole('button', { name: 'Marcar entregue' }).count()) === 0, 'lista já mostra entregue')
  await campo.fill('Ana')
  await pagina.locator('dialog button[type=submit]').click()
  await pagina.getByText('Outra pessoa já marcou').waitFor()
  assert.equal(chamadasDe('salvar_material').length, 0)
})

// ═══ Publicação da edição ═══════════════════════════════════════════════════
cenario('Chaves da edição: janela digitada sobrevive a ligar/desligar outra chave e à releitura', async () => {
  await ev(() => window.__montarChaves('2026.2'))
  await pagina.getByText('Janela da avaliação').waitFor()
  const abre = pagina.getByLabel('Abre em')
  await abre.fill('2026-11-05T10:00')
  // outra pessoa liga uma chave; chega a releitura
  S.pubEdicao.participantes_publicos = true
  await anunciar(['edicao'])
  await ate(async () => (await pagina.getByText('Ligada').count()) >= 1, 'releitura chegou')
  assert.equal(await abre.inputValue(), '2026-11-05T10:00', 'janela digitada foi apagada pela releitura')
  // eu ligo outra chave (com confirmação): a janela continua
  await pagina.getByRole('button', { name: /Ligar Resultados no site/ }).click()
  await pagina.locator('dialog').waitFor()
  await pagina.locator('dialog button[type=submit]').click()
  await ate(async () => chamadasDe('definir_publicacao_edicao').length >= 1, 'chave aplicada')
  assert.equal(await abre.inputValue(), '2026-11-05T10:00', 'janela digitada foi apagada ao aplicar outra chave')
  assert.deepEqual(await ev(() => window.__pendencias()), ['Janela da avaliação (não salva)'])
  // salvar a janela
  await pagina.getByRole('button', { name: 'Salvar janela' }).click()
  await ate(async () => chamadasDe('definir_publicacao_edicao').length >= 2, 'janela salva')
  await ate(async () => (await ev(() => window.__pendencias())).length === 0, 'pendência saiu')
})

cenario('Chaves da edição: trocar de edição nunca mostra as chaves da anterior', async () => {
  await ev(() => window.__montarChaves('2026.2'))
  await pagina.getByText(/Última mudança: Eloi/).waitFor()
  let soltar
  S.segurarEdicao = { '2027.1': new Promise((ok) => { soltar = ok }) }
  await ev(() => window.__montarChaves('2027.1'))
  await pausa(200)
  assert.equal(await pagina.getByText(/Eloi/).count(), 0, 'as chaves de 2026.2 apareceram em 2027.1')
  soltar()
  await pagina.getByText(/Última mudança: Ana/).waitFor()
})

// ═══ Publicação da casa ═════════════════════════════════════════════════════
cenario('Aba Publicação: endereço digitado resiste à releitura; outra casa nunca herda o rascunho', async () => {
  await ev(() => window.__montarAba('p1', 'Doce Sol'))
  const slug = pagina.getByLabel(/Endereço \(só antes/)
  await slug.waitFor()
  await slug.fill('doce-sol')
  S.pubs.p1.pendencias = ['combo_nome']          // outra coisa mudou na ficha
  await anunciar(['cadastro'])
  await ate(async () => (await pagina.getByText('1 aberta').count()) > 0, 'releitura chegou')
  assert.equal(await slug.inputValue(), 'doce-sol', 'endereço digitado foi trocado')
  // trocar de casa
  await ev(() => window.__montarAba('p2', 'Café Alfa'))
  await ate(async () => (await pagina.getByLabel(/Endereço \(só antes/).count()) > 0 && (await pagina.getByLabel(/Endereço \(só antes/).inputValue()) === '', 'outra casa começa vazia')
  assert.deepEqual(await ev(() => window.__pendencias()), [], 'pendência da casa anterior ficou')
})

cenario('Aba Publicação: salvar o endereço sem esqueleto e sem reler a ficha inteira em tela de carregamento', async () => {
  await ev(() => window.__montarAba('p1', 'Doce Sol'))
  const slug = pagina.getByLabel(/Endereço \(só antes/)
  await slug.waitFor()
  await slug.fill('doce-sol')
  await vigiar()
  await pagina.getByRole('button', { name: 'Salvar endereço' }).click()
  await pagina.getByText('Endereço salvo.').waitFor()
  await ate(async () => (await ev(() => window.__mudou)) >= 1, 'onMudou do pai chamado')
  await pausa(400)
  assert.deepEqual(await viuCarregando(), [])
  assert.equal(await slug.inputValue(), 'doce-sol')
})

cenario('Lista de publicação e Avaliações: montam, releem por sinal e trocam de edição sem herdar', async () => {
  S.publicacoes = { '2026.2': [{ participacao_id: 'p1', participante_id: 'pt1', nome_marca: 'Doce Sol', combo_status: 'rascunho', estado_publicacao: 'nao_publicado', pendencias: 2, slug: null }], '2027.1': [] }
  await ev(() => window.__montarLista('2026.2'))
  await pagina.getByText('Doce Sol').waitFor()
  await vigiar()
  S.publicacoes['2026.2'][0].pendencias = 0
  await anunciar(['cadastro'])
  await pagina.getByText('Sem pendências').waitFor()
  assert.deepEqual(await viuCarregando(), [])
  await ev(() => window.__montarAvaliacoes('2026.2'))
  await pagina.getByText('Nenhuma avaliação ainda').waitFor()
})

// ═══ Logo ═══════════════════════════════════════════════════════════════════
cenario('Logo: trocar de marca nunca mostra a logo da anterior e descarta resposta atrasada dela', async () => {
  await ev(() => window.__montarLogo('A', 'Marca A'))
  await pagina.getByText(/logo-A\.png/).waitFor()
  // A próxima leitura de B demora
  let soltarB
  S.segurarLogo = { B: new Promise((ok) => { soltarB = ok }) }
  await ev(() => window.__montarLogo('B', 'Marca B'))
  await pausa(150)
  assert.equal(await pagina.getByText(/logo-A\.png/).count(), 0, 'logo da marca anterior apareceu para a nova')
  soltarB()
  await pagina.getByText(/logo-B\.png/).waitFor()
})

cenario('Logo: releitura por sinal troca a logo sem apagar o editor', async () => {
  await ev(() => window.__montarLogo('A', 'Marca A'))
  await pagina.getByText(/logo-A\.png/).waitFor()
  await vigiar()
  S.logos.A.atual.nome_original = 'logo-A-nova.png'
  await anunciar(['logos'])
  await pagina.getByText(/logo-A-nova\.png/).waitFor()
  assert.deepEqual(await viuCarregando(), [])
})

cenario('Logo: "Remover logo oficial" funciona (o nome local não esconde mais o diálogo de confirmação)', async () => {
  await ev(() => window.__montarLogo('A', 'Marca A'))
  await pagina.getByText(/logo-A\.png/).waitFor()
  await pagina.getByRole('button', { name: 'Remover logo oficial' }).click()
  await pagina.locator('dialog').waitFor()
  await pagina.locator('dialog button[type=submit]').click()
  await pagina.getByText('Logo removida.').waitFor()
  assert.equal(chamadasDe('remover_logo').length, 1)
  assert.equal(await ev(() => window.__logoMudou), 1)
})

cenario('Logo: falha ao reler depois de gravar não vira tela de erro', async () => {
  await ev(() => window.__montarLogo('A', 'Marca A'))
  await pagina.getByText(/logo-A\.png/).waitFor()
  S.falhar.get_logo_marca = 'servidor caiu'
  await anunciar(['logos'])
  await pagina.getByText('Não consegui atualizar a logo').waitFor()
  assert.equal(await pagina.getByText(/logo-A\.png/).count() > 0, true, 'o editor sumiu na falha')
})

// ── execução ────────────────────────────────────────────────────────────────
let falhas = 0
for (const [nome, fn] of cenarios) {
  if (SO && !nome.includes(SO)) continue
  await limpar()
  erros.length = 0
  try {
    await fn()
    const realmenteErros = erros.filter((e) => !/Failed to load resource/.test(e))
    assert.deepEqual(realmenteErros, [], 'erros no console: ' + realmenteErros.join(' | '))
    ok(nome)
  } catch (e) {
    falhas++
    console.log('FALHOU ' + nome + '\n   ' + String(e && e.message || e).split('\n').slice(0, 6).join('\n   '))
    try { console.log('   chamadas:', chamadas.map((c) => c.nome).join(', ')) } catch { /* nada */ }
  }
}
await navegador.close()
console.log(falhas ? falhas + ' FALHA(S)' : 'TUDO OK (' + n + ')')
process.exit(falhas ? 1 : 0)
