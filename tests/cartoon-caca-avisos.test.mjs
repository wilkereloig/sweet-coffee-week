// Caça aos Carimbos — central de avisos do visitante, preferências e contrato do banco/edge (migration 20261230).
// Sem navegador, sem rede e sem banco: lógica pura, api com chamada falsa e conferências estáticas dos arquivos.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { organizarAvisos, destinoSeguro, quandoCurto, CHAVES_PREFS, PREFS_PADRAO } from '../src/edicao/caca/notificacoes/logica.js'
import { criarApi } from '../src/edicao/caca/api.js'
import { EXTRAS } from '../src/edicao/caca/textos-extras.js'

const raiz = path.resolve(import.meta.dirname, '..')
const ler = (rel) => fs.readFileSync(path.join(raiz, rel), 'utf8')
const semComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
const CHAVE = 'a'.repeat(32) // formato aceito por chaveValida? (conferido abaixo)
const UUID = '11111111-1111-4111-8111-111111111111'

test('central: só avisos bem formados, mais novos primeiro, destino só dentro da Caça', () => {
  const lista = organizarAvisos([
    { id: 'a', categoria: 'edicao', titulo: 'Velho', corpo: 'c', destino: '/cartoon/caca', quando: '2026-11-05T10:00:00Z', visto: true },
    { id: 'b', categoria: 'imprevisto', urgente: true, titulo: 'Novo', corpo: 'c', destino: '/cartoon/caca/grupos', quando: '2026-11-06T10:00:00Z', visto: false },
    { id: 'c', categoria: 'edicao', titulo: 'Fora', corpo: 'c', destino: 'https://exemplo.com', quando: '2026-11-04T10:00:00Z' },
    { titulo: 'sem id', corpo: 'x' }, null, 7,
  ])
  assert.deepEqual(lista.map((a) => a.id), ['b', 'a', 'c'])
  assert.equal(lista[0].urgente, true)
  assert.equal(lista[0].visto, false)
  assert.equal(lista[2].destino, null, 'link externo nunca vira botão')
  assert.deepEqual(organizarAvisos(undefined), [])
  assert.equal(organizarAvisos(Array.from({ length: 100 }, (_, i) => ({ id: String(i), titulo: 't', corpo: 'c' }))).length, 60)
})

test('central: destino só aceita caminho interno da Caça', () => {
  assert.equal(destinoSeguro('/cartoon/caca'), '/cartoon/caca')
  assert.equal(destinoSeguro('/cartoon/caca/metas'), '/cartoon/caca/metas')
  assert.equal(destinoSeguro('/cartoon/mapa?painel=premios'), '/cartoon/mapa?painel=premios', 'única saída: o painel de Prêmios')
  assert.equal(destinoSeguro('/cartoon/ter-com-quem-contar'), '/cartoon/ter-com-quem-contar', 'segunda saída: a página da campanha Ter com quem contar')
  for (const ruim of ['/cartoon/ter-com-quem-contar/x', '/cartoon/ter-com-quem-contar?a=1', '/cartoon/mapa?painel=outro', '/cartoon/mapa', '//evil.com', 'https://x.com', '/painel', '/cartoon/caca/../x?a=1', '/cartoon/cacaxxx', '', null, undefined, 3]) assert.equal(destinoSeguro(ruim), null, String(ruim))
})

test('central: data no fuso de Natal; data torta vira vazio', () => {
  assert.match(quandoCurto('2026-11-06T15:30:00Z'), /6/)
  assert.match(quandoCurto('2026-11-06T15:30:00Z'), /12:30/, 'UTC-3: 15:30Z = 12:30 em Natal')
  assert.equal(quandoCurto('não é data'), '')
  assert.equal(quandoCurto(''), '')
})

test('api: avisosLer e avisosVisto falam com as RPCs certas e não aceitam chave torta', async () => {
  const chamadas = []
  const api = criarApi({ chamar: async (nome, corpo) => { chamadas.push([nome, corpo]); return nome === 'caca_avisos_ler' ? { avisos: [{ id: UUID, titulo: 't', corpo: 'c' }], novos: 1 } : { ok: true, marcados: 1 } } })
  const torta = await api.avisosLer('x')
  assert.equal(torta.ok, false); assert.equal(chamadas.length, 0, 'chave torta nem chega ao banco')
  const chave = await descobrirChaveValida()
  const r = await api.avisosLer(chave)
  assert.equal(r.ok, true); assert.equal(r.novos, 1); assert.equal(r.avisos.length, 1)
  const v = await api.avisosVisto(chave, [UUID])
  assert.equal(v.ok, true)
  assert.deepEqual(chamadas.map((c) => c[0]), ['caca_avisos_ler', 'caca_avisos_visto'])
  assert.deepEqual(chamadas[1][1].p_ids, [UUID])
  const sem = criarApi({ chamar: async () => ({ avisos: 'nada' }) })
  assert.equal((await sem.avisosLer(chave)).ok, false, 'resposta torta não vira lista')
  const nula = criarApi({ chamar: async () => null })
  assert.equal((await nula.avisosLer(chave)).motivo, 'mapa_desconhecido')
})

async function descobrirChaveValida () {
  // chaveValida é privada em api.js: tenta formatos até a api aceitar (a chave real tem 32+ caracteres base64url).
  for (const c of [CHAVE, 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6', 'abcdefghijklmnopqrstuvwxyz012345', 'a'.repeat(43), 'a'.repeat(22)]) {
    let chamou = false
    const api = criarApi({ chamar: async () => { chamou = true; return { avisos: [], novos: 0 } } })
    await api.avisosLer(c)
    if (chamou) return c
  }
  throw new Error('nenhum formato de chave aceito pelo teste')
}

test('preferências: as chaves do app são as do banco, todas com texto, e o padrão não liga divulgação', () => {
  const sql = ler('supabase/migrations/20261234_caca_campanha_sicredi.sql') // a definição vigente das categorias e do padrão (substitui a de 20261232)
  const norm = sql.match(/unnest\(array\[([^\]]+)\]\) k/)[1].split(',').map((s) => s.trim().replace(/'/g, ''))
  assert.deepEqual([...CHAVES_PREFS].sort(), [...norm].sort(), 'CHAVES_PREFS = caca_push_prefs_norm')
  const padrao = JSON.parse(sql.match(/v_padrao constant jsonb := '(\{[^']+\})'/)[1])
  assert.deepEqual(padrao, { ...PREFS_PADRAO }, 'padrão do app = padrão do servidor')
  for (const k of CHAVES_PREFS) assert.ok(EXTRAS.push.categorias[k]?.rotulo && EXTRAS.push.categorias[k]?.texto, `texto de ${k}`)
  assert.equal(PREFS_PADRAO.edicao, false); assert.equal(PREFS_PADRAO.voucher, false); assert.equal(PREFS_PADRAO.campanha, false, 'campanha vem desligada, como a divulgação da edição')
  assert.equal(CHAVES_PREFS.length, 9)
  assert.equal(EXTRAS.avisos.acaoPorCategoria.campanha, 'Ver a campanha')
  const cats = sql.match(/add constraint caca_aviso_categoria_check\s+check \(categoria in \(([^)]+)\)\)/)[1].split(',').map((s) => s.trim().replace(/'/g, ''))
  assert.deepEqual([...cats].sort(), [...CHAVES_PREFS].sort(), 'toda categoria de aviso é uma preferência que a pessoa controla')
})

test('banco: tabelas fechadas, funções internas sem grant, permissão no servidor e sem dado pessoal', () => {
  const sql = ler('supabase/migrations/20261230_caca_avisos.sql')
  for (const t of ['caca_aviso', 'caca_aviso_entrega']) {
    assert.match(sql, new RegExp(`alter table public\\.${t} enable row level security`))
    assert.match(sql, new RegExp(`revoke all on table public\\.${t} from public, anon, authenticated`))
  }
  for (const f of ['caca_aviso_entregas_pendentes\\(uuid, int\\)', 'caca_aviso_entrega_marcar\\(text, uuid, uuid\\[\\]\\)', 'caca_avisos_gerar_automaticos\\(timestamptz\\)', 'caca_aviso_publico\\(public\\.caca_aviso\\)']) {
    assert.match(sql, new RegExp(`revoke all on function public\\.${f} from public, anon, authenticated`))
    assert.ok(!new RegExp(`grant execute on function public\\.${f}`).test(sql), `${f} não pode ter grant`)
  }
  for (const f of ['caca_aviso_criar', 'caca_aviso_enviar', 'caca_aviso_cancelar', 'caca_avisos_auto_definir']) {
    const corpo = sql.slice(sql.indexOf(`function public.${f}(`)); const ate = corpo.indexOf('end $$')
    assert.match(corpo.slice(0, ate), /public\.pode\(p_secret, 'producao\.gerir'\)/, `${f} exige producao.gerir`)
  }
  const gerar = sql.slice(sql.indexOf('function public.caca_avisos_gerar_automaticos'))
  assert.match(gerar, /'ligado'\)::boolean, false\) is not true then return/, 'automático nasce desligado')
  assert.match(sql, /unique \(aviso_id, mapa_id\)|primary key \(aviso_id, mapa_id\)/, 'idempotência por (aviso, mapa)')
  assert.match(sql, /chave_dedupe text unique/)
  assert.ok(!/service_role|VAPID|secret_key|password/i.test(sql.replace(/p_secret/g, '')), 'sem segredo na migration')
  // a leitura do visitante nunca devolve mapa_id, e-mail ou chave
  const lerFn = sql.slice(sql.indexOf('function public.caca_avisos_ler'), sql.indexOf('function public.caca_avisos_visto'))
  const saida = lerFn.slice(lerFn.indexOf('return jsonb_build_object('))
  assert.ok(!/email|whatsapp|chave_hash|apelido|'mapa_id'/.test(saida), 'central não devolve dado pessoal')
})

test('edge caca-push: simulação é o padrão e o modo aviso lê o conteúdo do BANCO, nunca da chamada', () => {
  const src = ler('supabase/functions/caca-push/index.ts')
  assert.match(src, /const dryRun = payload\.dry_run !== false/)
  const bloco = src.slice(src.indexOf('if (payload.aviso_id !== undefined)'), src.indexOf("const tipo = (payload.tipo || '').trim()"))
  assert.ok(bloco.length > 500)
  assert.match(bloco, /from\('caca_aviso'\)/)
  assert.match(bloco, /estado !== 'enviado'/, 'só aviso já enviado pelo painel')
  assert.ok(!/payload\.(titulo|corpo|url)/.test(bloco), 'título/corpo/destino não vêm do corpo da chamada')
  assert.match(bloco, /if \(dryRun\) return/)
  assert.match(bloco, /processarAviso\(/)
  const fn = src.slice(src.indexOf('async function processarAviso'), src.indexOf('// ── A função'))
  assert.match(fn, /caca_aviso_entregas_pendentes/); assert.match(fn, /caca_aviso_entrega_marcar/)
  assert.ok(!/payload/.test(fn), 'o processamento não enxerga a chamada')
  // o ciclo roda sem credencial: só lê o que o banco manda e não aceita nada da chamada além do gatilho
  const ciclo = src.slice(src.indexOf('if (payload.ciclo === true)'), src.indexOf('// Autenticação de organização'))
  assert.match(ciclo, /caca_avisos_para_processar/); assert.match(ciclo, /\.slice\(0, 5\)/)
  assert.ok(!/payload\.(titulo|corpo|url|mapa_ids|secret|tipo|aviso_id)/.test(ciclo), 'ciclo não escolhe conteúdo nem destinatário')
  // fora do ciclo, a autorização continua antes de tudo
  assert.ok(src.indexOf('nao_autorizado') < src.indexOf('if (payload.aviso_id !== undefined)'))
  assert.ok(!/console\.log\([^)]*(endpoint|p256dh|auth_chave)/.test(src))
})

test('agendador: job de 15 min; ligar grava o instante e só vale o que vem DEPOIS; funções internas sem grant', () => {
  const sql = ler('supabase/migrations/20261230_caca_avisos_ciclo.sql')
  assert.match(sql, /cron\.schedule\('scw-caca-avisos', '\*\/15 \* \* \* \*'/)
  assert.match(sql, /'ligado', true, 'desde', now\(\)/)
  assert.match(sql, /caca_ranking_v2\(v_ed, v_desde\)/); assert.match(sql, />= v_desde/)
  assert.match(sql, /revoke all on function public\.caca_avisos_ciclo\(\) from public, anon, authenticated/)
  assert.match(sql, /revoke all on function public\.caca_avisos_para_processar\(\) from public, anon, authenticated/)
  assert.ok(!/grant execute on function public\.caca_avisos_(ciclo|para_processar)/.test(sql))
  assert.match(sql, /pode\(p_secret, 'producao\.gerir'\)/)
})

test('central no app: estados de carregando, falha e vazio; link do aviso usa aoIr (onClick sobrescreve a navegação)', () => {
  const jsx = semComentarios(ler('src/edicao/caca/notificacoes/CentroDeAvisos.jsx'))
  for (const t of ['T.carregando', 'T.falha', 'T.tentar', 'T.semAvisos', 'T.marcarLida', 'T.marcarTodas']) assert.ok(jsx.includes(t), t)
  assert.match(jsx, /aoIr=\{/)
  assert.ok(!/<Link[^>]*onClick=/.test(jsx), 'Link com onClick perde a navegação do router')
  assert.match(jsx, /role="alert"/); assert.match(jsx, /role="status"/)
  assert.ok(!/dangerouslySetInnerHTML/.test(jsx), 'texto do aviso entra como texto')
})

test('service worker: clique abre só caminho dentro da Caça e a carga não tem dado pessoal', () => {
  const sw = ler('public/caca-sw.js')
  assert.match(sw, /function destino\(url\)/)
  assert.match(sw, /ESCOPO \+ '\/'\) === 0 \? url : CENTRAL/)
  assert.match(sw, /var PREMIOS = '\/cartoon\/mapa\?painel=premios'/, 'saída permitida além do escopo: painel de Prêmios')
  assert.match(sw, /var CAMPANHA = '\/cartoon\/ter-com-quem-contar'/, 'saída permitida além do escopo: campanha da Sicredi')
  assert.match(sw, /url === PREMIOS \|\| url === CAMPANHA/)
  assert.ok(!/(apelido|email|whatsapp|chave)/i.test(sw.replace(/\/\*[\s\S]*?\*\//g, '')), 'o SW não lê nem mostra dado pessoal')
})

test('atualizar o app não mexe na inscrição de push: só "desligar" (aparelho.js) cancela, e o service worker é o mesmo arquivo e escopo', () => {
  for (const rel of ['src/edicao/caca/pwa/atualizacao.js', 'src/edicao/caca/pwa/AtualizacaoDaCaca.jsx', 'public/caca-sw.js']) {
    assert.ok(!/unsubscribe|unregister|pushManager/.test(semComentarios(ler(rel))), `${rel} não pode cancelar nem recriar a inscrição`)
  }
  const manifesto = ler('src/edicao/caca/pwa/manifesto.js')
  assert.match(manifesto, /\/caca-sw\.js/); assert.match(manifesto, /scope/)
  assert.match(semComentarios(ler('src/edicao/caca/notificacoes/aparelho.js')), /unsubscribe\(\)/)
})

test('sino da central: contagem de não lidas, diálogo, marcar como lida e oferta de push sem insistência', () => {
  const sino = semComentarios(ler('src/edicao/caca/notificacoes/SinoDeAvisos.jsx'))
  assert.match(sino, /<dialog /); assert.match(sino, /showModal\(\)/)
  assert.match(sino, /aria-haspopup="dialog"/); assert.match(sino, /rotuloNovos\(naoLidas\)/)
  assert.match(sino, /gravarDispensa/, '"Agora não" fica lembrado')
  assert.match(sino, /estado !== 'desligado'/, 'a oferta só aparece com permissão ainda não negada e sem assinatura')
  const central = semComentarios(ler('src/edicao/caca/Central.jsx'))
  assert.match(central, /<SinoDeAvisos /, 'o sino mora no painel da Caça')
  assert.ok(!/<CentroDeAvisos/.test(ler('src/edicao/caca/secoes/Notificacoes.jsx')), 'a lista não aparece duas vezes')
  // toda ação de aviso tem texto e todo destino do banco abre algo
  for (const c of ['premio', 'voucher', 'meta', 'avaliacao_pendente', 'incentivo']) assert.ok(EXTRAS.avisos.acaoPorCategoria[c], c)
})

test('banco (20261232): programação lê as datas da edição, respeita janela e dedupe, e só a organização mexe', () => {
  const sql = ler('supabase/migrations/20261232_caca_programacao.sql')
  const gerar = sql.slice(sql.indexOf('function public.caca_programacao_gerar'), sql.indexOf('revoke all on function public.caca_programacao_gerar'))
  assert.match(gerar, /'ligado'\)::boolean, false\) is not true then return/, 'nasce atrás do interruptor avisos_auto')
  assert.match(gerar, /from public\.edicoes where codigo = v_ed/, 'datas oficiais da edição, não escritas aqui')
  assert.match(gerar, /America\/Fortaleza/); assert.match(gerar, /fora_do_horario/); assert.match(gerar, /fora_do_festival/)
  assert.match(gerar, /on conflict \(chave_dedupe\) do nothing/, 'reprocessar não duplica')
  assert.match(gerar, /vigente_ate|v_ate/, 'a mensagem vence no fim do dia')
  assert.match(gerar, /'ultimo'/); assert.match(gerar, /'penultimo'/); assert.match(gerar, /'voucher'/)
  for (const f of ['caca_programacao_gerar(timestamptz)', 'caca_avisos_gerar_premios(timestamptz)', 'caca_avisos_ciclo()']) {
    assert.ok(sql.includes(`revoke all on function public.${f} from public, anon, authenticated`), `${f} fechada`)
    assert.ok(!sql.includes(`grant execute on function public.${f}`), `${f} não pode ter grant`)
  }
  const definir = sql.slice(sql.indexOf('function public.caca_programacao_definir'))
  assert.match(definir.slice(0, definir.indexOf('end $$')), /public\.pode\(p_secret, 'producao\.gerir'\)/)
  const entregas = sql.slice(sql.indexOf('function public.caca_aviso_entregas_pendentes'), sql.indexOf('function public.caca_avisos_para_processar'))
  assert.match(entregas, /y\.categoria <> 'incentivo'/, 'incentivo não tira a vez de prêmio e pendência')
  assert.match(entregas, /incentivo_intervalo_dias/)
  assert.ok(!/service_role|VAPID|secret_key|password/i.test(sql.replace(/p_secret/g, '')), 'sem segredo na migration')
})
