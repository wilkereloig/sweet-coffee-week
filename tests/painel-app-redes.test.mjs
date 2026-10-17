// Social media (16–17/10/2026): lógica pura do planejamento (painel-app/src/lib/redes.js),
// contrato com o banco (supabase/migrations/20261017_social_media.sql, que depende de
// 20261017_equipe_perfis_avisos.sql) e com a Edge Function arquivo-url.
// ⚠️ O comportamento das funções SQL foi validado num Postgres local (PGlite) nas
// sessões de 16 e 17/10/2026; aqui ficam os invariantes que dá para conferir sem banco.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import * as R from '../painel-app/src/lib/redes.js'
import { STATUS } from '../painel-app/src/lib/status.js'
import { rotaDoLink, lerRota, montarRota, migrarRota } from '../painel-app/src/lib/rota.js'

const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const SQL = ler('supabase/migrations/20261017_social_media.sql')
// Aprovação (18/10/2026): a situação e as etapas passaram a valer por esta.
const APROV = ler('supabase/migrations/20261018_social_aprovacao.sql')
const EQUIPE_SQL = ler('supabase/migrations/20261017_equipe_perfis_avisos.sql')
const BIB = ler('painel-app/src/components/vistas/SocialBiblioteca.jsx')
const PART = ler('painel-app/src/components/vistas/SocialParticipantes.jsx')
const PUSH = ler('supabase/functions/enviar-push/index.ts')
const EDGE = ler('supabase/functions/arquivo-url/index.ts')
const VISTA = ler('painel-app/src/components/vistas/Redes.jsx')
const FICHA = ler('painel-app/src/components/vistas/RedesFicha.jsx')
const ARQ = ler('painel-app/src/lib/redesArquivos.js')
const MODULOS = ler('painel-app/src/components/Modulos.jsx')
const checkDe = (coluna) => [...new RegExp(coluna + ' in \\(([^)]*)\\)').exec(SQL)[1].matchAll(/'([^']+)'/g)].map((m) => m[1])

test('fuso de Fortaleza: dia e hora não dependem do fuso do aparelho', () => {
  assert.equal(R.instanteDe('2026-10-16', '00:00'), '2026-10-16T03:00:00.000Z')
  assert.equal(R.instanteDe('2026-12-31', '23:30'), '2027-01-01T02:30:00.000Z')
  assert.deepEqual(R.partes('2026-10-17T02:59:00Z'), { data: '2026-10-16', hora: '23:59' })
  assert.equal(R.instanteDe('2026-13-01', '10:00'), null)
  assert.equal(R.partes(null), null)
  // Mesmo código rodando com o aparelho em Tóquio e em Los Angeles.
  for (const TZ of ['Asia/Tokyo', 'America/Los_Angeles', 'UTC']) {
    const saida = execFileSync(process.execPath, ['--input-type=module', '-e',
      "import * as R from './painel-app/src/lib/redes.js'; console.log(JSON.stringify([R.chaveDia('2026-10-17T02:59:00Z'), R.instanteDe('2026-10-16','09:00'), R.hoje(Date.parse('2026-10-17T02:00:00Z'))]))"],
      { env: { ...process.env, TZ }, cwd: new URL('..', import.meta.url) }).toString().trim()
    assert.deepEqual(JSON.parse(saida), ['2026-10-16', '2026-10-16T12:00:00.000Z', '2026-10-16'], TZ)
  }
})

test('semana de segunda a domingo; grade do mês cobre semanas inteiras; período anda certo', () => {
  const g = R.gradeMes('2026-10-16')
  assert.equal(g[0][0], '2026-09-28') // segunda
  assert.equal(g.length, 5)
  assert.equal(g[g.length - 1][6], '2026-11-01') // domingo
  assert.equal(R.MODOS[0], 'semana', 'a semana é a abertura')
  assert.deepEqual(R.DIAS_CABECALHO, ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'])
  assert.deepEqual(R.diasDaSemana('2026-10-16'), ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'])
  // Domingo pertence à semana que começou na segunda anterior.
  assert.equal(R.diasDaSemana('2026-10-18')[0], '2026-10-12')
  assert.equal(R.diasDaSemana('2026-10-19')[0], '2026-10-19')
  assert.equal(R.mover('mes', '2026-12-31', 1), '2027-01-01')
  assert.equal(R.mover('semana', '2026-10-30', 1), '2026-11-06')
  assert.equal(R.mover('dia', '2026-10-31', 1), '2026-11-01')
  assert.equal(R.tituloPeriodo('mes', '2026-10-16'), 'Outubro de 2026')
  assert.equal(R.tituloPeriodo('semana', '2026-10-16'), 'Seg, 12 a dom, 18 de out')
  assert.equal(R.tituloPeriodo('semana', '2026-10-30'), 'Seg, 26 de out a dom, 1 de nov')
  assert.equal(R.tituloPeriodo('semana', '2026-11-28'), 'Seg, 23 a dom, 29 de nov')
  assert.equal(R.tituloPeriodo('semana', '2026-11-01'), 'Seg, 26 de out a dom, 1 de nov')
  assert.equal(R.tituloPeriodo('dia', '2026-10-16'), 'Sexta, 16 de outubro')
  assert.equal(R.horaCurta('09:00'), '9h')
  assert.equal(R.horaCurta('18:30'), '18h30')
})

test('leitura do banco cabe no teto de 120 dias (mês e atalhos)', () => {
  for (const [d, a] of [['2026-10-16', ''], ['2026-02-01', ''], ['2026-10-16', 'atrasadas']]) {
    const { de, ate } = R.intervaloConsulta(d, a, Date.parse('2026-10-16T15:00:00Z'))
    const dias = (Date.parse(ate) - Date.parse(de)) / 864e5
    assert.ok(dias > 27 && dias <= 120, d + a + ' → ' + dias)
  }
  const { de } = R.intervaloConsulta('2026-10-16')
  assert.equal(de, '2026-09-28T03:00:00.000Z')
})

const AGORA = Date.parse('2026-10-16T15:00:00Z') // 12h em Fortaleza
const P = (x) => ({ id: x.id || Math.random().toString(36).slice(2), perfil: '@sweetcoffeeweek', situacao: 'preparacao', formato: 'feed', legenda: 'oi', responsavel_id: 'u1', programado_para: '2026-10-16T20:00:00Z', ...x })
const IMG = { mime: 'image/jpeg' }, VID = { mime: 'video/mp4' }

test('atraso é calculado, e nunca para publicado/cancelado', () => {
  assert.equal(R.atrasada(P({ programado_para: '2026-10-16T14:00:00Z' }), AGORA), true)
  assert.equal(R.atrasada(P({ programado_para: '2026-10-16T14:00:00Z', situacao: 'publicado' }), AGORA), false)
  assert.equal(R.atrasada(P({ programado_para: '2026-10-16T14:00:00Z', situacao: 'cancelado' }), AGORA), false)
  assert.equal(R.atrasada(P({ programado_para: null }), AGORA), false)
})

test('pendências por formato (mesmos códigos do banco); Story sem legenda vale', () => {
  assert.deepEqual(R.pendencias(P({}), [IMG], AGORA), [])
  assert.deepEqual(R.pendencias(P({}), [], AGORA), ['sem_arte'])
  assert.deepEqual(R.pendencias(P({}), [VID], AGORA), ['arte_incompativel'])
  assert.deepEqual(R.pendencias(P({ formato: 'carrossel' }), [IMG], AGORA), ['arte_incompativel'])
  assert.deepEqual(R.pendencias(P({ formato: 'carrossel' }), [IMG, VID], AGORA), [])
  assert.deepEqual(R.pendencias(P({ formato: 'reels' }), [VID], AGORA), [])
  assert.deepEqual(R.pendencias(P({ formato: 'reels' }), [IMG], AGORA), ['arte_incompativel'])
  assert.deepEqual(R.pendencias(P({ formato: 'story', legenda: '' }), [IMG, VID, IMG], AGORA), [])
  assert.deepEqual(R.pendencias(P({ legenda: '  ', responsavel_id: null, programado_para: null }), [IMG], AGORA), ['sem_responsavel', 'sem_legenda', 'sem_horario'])
  assert.deepEqual(R.pendencias(P({}), [{ mime: 'image/png', removido_em: 'x' }], AGORA), ['sem_arte'])
  assert.deepEqual(R.bloqueiosPronto(P({ programado_para: '2026-10-16T10:00:00Z' }), [IMG], AGORA), [])
  // Os códigos são os da função do banco, na mesma ordem.
  const corpo = SQL.slice(SQL.indexOf('function public.redes_pendencias'), SQL.indexOf('$$;', SQL.indexOf('function public.redes_pendencias')))
  const doBanco = [...corpo.matchAll(/r := r \|\| '([a-z_]+)'::text/g)].map((m) => m[1])
  assert.deepEqual(doBanco, Object.keys(R.PENDENCIAS))
})

test('conflito: mesmo perfil a menos de 30 min; cancelada e outro perfil não contam', () => {
  const a = P({ id: 'a', programado_para: '2026-10-20T15:00:00Z' })
  const b = P({ id: 'b', programado_para: '2026-10-20T15:20:00Z' })
  const c = P({ id: 'c', programado_para: '2026-10-20T15:10:00Z', perfil: '@outro' })
  const d = P({ id: 'd', programado_para: '2026-10-20T15:05:00Z', situacao: 'cancelado' })
  const e = P({ id: 'e', programado_para: '2026-10-20T15:40:00Z' })
  const m = R.conflitos([a, b, c, d, e])
  assert.deepEqual(Object.keys(m).sort(), ['a', 'b', 'e'])
  assert.deepEqual(m.a.map((x) => x.id), ['b'])
  assert.deepEqual(m.b.map((x) => x.id).sort(), ['a', 'e'])
})

test('filtros, atalhos e ordem sobre a mesma lista', () => {
  const lista = [
    P({ id: '1', titulo: 'Lançamento', responsavel_id: 'eu', programado_para: '2026-10-16T13:00:00Z' }), // atrasada, hoje
    P({ id: '2', titulo: 'Combo da Jolie', participante_nome: 'Jolie Café Pâtisserie', responsavel_id: null, programado_para: '2026-10-18T13:00:00Z', formato: 'reels' }),
    P({ id: '3', titulo: 'Bastidores', situacao: 'publicado', programado_para: '2026-10-15T13:00:00Z', edicao_codigo: '2026.2' }),
    P({ id: '4', titulo: 'Sem data', programado_para: null }),
  ]
  const ids = (f) => R.filtrar(lista, f, { eu: 'eu', agora: AGORA }).map((p) => p.id)
  assert.deepEqual(ids({ resp: 'eu' }), ['1'])
  assert.deepEqual(ids({ resp: 'ninguem' }), ['2'])
  assert.deepEqual(ids({ sit: 'abertas' }), ['1', '2', '4'])
  assert.deepEqual(ids({ sit: 'atrasada' }), ['1'])
  assert.deepEqual(ids({ fmt: 'reels' }), ['2'])
  assert.deepEqual(ids({ ed: '2026.2' }), ['3'])
  assert.deepEqual(ids({ q: 'patisserie' }), ['2'])
  assert.deepEqual(ids({ q: 'BASTIDORES' }), ['3'])
  assert.deepEqual(ids({ atalho: 'hoje' }), ['1'])
  assert.deepEqual(ids({ atalho: 'proximas' }), ['2'])
  assert.deepEqual(ids({ atalho: 'atrasadas' }), ['1'])
  assert.deepEqual(ids({ atalho: 'minhas' }), ['1'])
  assert.deepEqual(ids({ atalho: 'sem_resp' }), ['2'])
  const c = R.contarAtalhos(lista, { eu: 'eu', agora: AGORA })
  assert.deepEqual(c, { hoje: 1, proximas: 1, atrasadas: 1, minhas: 1, aprovacao: 0, ajuste: 0, aprovadas: 0, sem_resp: 1, sem_arte: 0, sem_legenda: 0, sem_data: 1 })
  assert.deepEqual(R.ordenar(lista, 'data').map((p) => p.id), ['3', '1', '2', '4'])
  assert.deepEqual(R.ordenar(lista, '-titulo').map((p) => p.id), ['4', '1', '2', '3'])
  assert.deepEqual(Object.keys(R.porDia(lista)), ['2026-10-15', '2026-10-16', '2026-10-18'])
})

test('filtros, dia aberto e item moram no endereço; endereço antigo cai na Social media', () => {
  const rota = { vista: 'social', aba: 'planejamento', filtros: { modo: 'semana', data: '2026-10-16', dia: '2026-10-16', resp: 'ninguem', part: 'x', q: 'jolie', item: 'abc' } }
  assert.deepEqual(lerRota(montarRota(rota)), rota)
  const id = '7d1c0f5e-3b2a-4c8e-9f10-2a3b4c5d6e7f'
  // Avisos e links antigos (operacao/redes/<id>) e os novos (social/planejamento/<id>).
  assert.deepEqual(rotaDoLink('operacao/redes/' + id), { vista: 'social', aba: 'planejamento', filtros: { item: id } })
  assert.deepEqual(rotaDoLink('social/planejamento/' + id), { vista: 'social', aba: 'planejamento', filtros: { item: id } })
  assert.deepEqual(rotaDoLink('social'), { vista: 'social', aba: 'planejamento', filtros: {} })
  // Favorito antigo com filtros: mesmo lugar, mesmos filtros.
  assert.deepEqual(migrarRota(lerRota('#operacao/redes?data=2026-10-16&item=' + id)), { vista: 'social', aba: 'planejamento', filtros: { data: '2026-10-16', item: id } })
  assert.deepEqual(migrarRota(lerRota('#operacao/pedidos')), lerRota('#operacao/pedidos'))
})

test('arquivos: tipo, tamanho e assinatura dos primeiros bytes', () => {
  const jpg = [0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0]
  const webp = [...'RIFF'].map((c) => c.charCodeAt(0)).concat([0, 0, 0, 0], [...'WEBP'].map((c) => c.charCodeAt(0)), [0, 0, 0, 0])
  const mp4 = [0, 0, 0, 0x18, ...[...'ftypmp42'].map((c) => c.charCodeAt(0)), 0, 0, 0, 0]
  assert.equal(R.validarArquivo({ nome: 'a.JPG', tipo: 'image/jpeg', tamanho: 10, cabecalho: jpg }).ext, 'jpg')
  assert.equal(R.validarArquivo({ nome: 'a.png', tipo: '', tamanho: 10, cabecalho: png }).mime, 'image/png')
  assert.equal(R.validarArquivo({ nome: 'a.webp', tipo: 'image/webp', tamanho: 10, cabecalho: webp }).ok, true)
  assert.equal(R.validarArquivo({ nome: 'video.mov', tipo: '', tamanho: 10, cabecalho: mp4 }).mime, 'video/quicktime')
  assert.equal(R.validarArquivo({ nome: 'falso.jpg', tipo: 'image/jpeg', tamanho: 10, cabecalho: png }).ok, false)
  assert.equal(R.validarArquivo({ nome: 'a.gif', tipo: 'image/gif', tamanho: 10, cabecalho: jpg }).ok, false)
  assert.equal(R.validarArquivo({ nome: 'a.jpg', tipo: 'image/jpeg', tamanho: R.LIMITE_BYTES + 1, cabecalho: jpg }).ok, false)
  assert.equal(R.validarArquivo({ nome: 'a.jpg', tipo: 'image/jpeg', tamanho: 0, cabecalho: jpg }).ok, false)
})

test('arquivos: o mesmo vocabulário no painel, na tabela, no bucket e na Edge Function', () => {
  assert.deepEqual(checkDe('mime').sort(), Object.keys(R.TIPOS).sort())
  const bucket = /'redes', 'redes', false, (\d+),\s*array\[([^\]]+)\]/.exec(SQL)
  assert.equal(Number(bucket[1]), R.LIMITE_BYTES)
  assert.deepEqual([...bucket[2].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort(), Object.keys(R.TIPOS).sort())
  const re = new RegExp(/const REDES = \/(.+)\/\n/.exec(EDGE)[1])
  const uuid = '7d1c0f5e-3b2a-4c8e-9f10-2a3b4c5d6e7f'
  for (const ext of Object.values(R.TIPOS)) assert.ok(re.test(R.caminhoArquivo(uuid, uuid, ext)), ext)
  assert.ok(!re.test('geral/' + uuid + '.jpg'))
  assert.ok(!re.test(uuid + '/../' + uuid + '.jpg'))
  assert.ok(!re.test(uuid + '/' + uuid + '.gif'))
})

test('Edge Function: redes e equipe com permissão própria; nunca sobrescreve', () => {
  assert.match(EDGE, /bucket === 'redes' \? \[acao === 'subir' \? 'redes\.arquivos' : 'redes\.ver'\]/)
  assert.match(EDGE, /bucket === 'equipe' \? \(acao === 'subir' \? \['acesso\.gerir'\] : \['dado\.ler', 'redes\.ver'\]\)/)
  // A própria foto: a pasta tem de ser o id do JWT (nunca um id mandado no corpo).
  assert.match(EDGE, /path\.split\('\/'\)\[0\] === uid/)
  // Material geral da campanha (pasta geral/) baixa com redes.ver; o de uma marca, não.
  assert.match(EDGE, /bucket === 'arquivos' && path\.startsWith\('geral\/'\) \? \['dado\.ler', 'redes\.ver'\]/)
  assert.match(EDGE, /upsert: bucket === 'arquivos' \|\| bucket === 'combos'/)
  assert.match(EDGE, /\(bucket !== 'redes' && bucket !== 'equipe'\) \|\| !paths\.length \|\| paths\.length > 60/)
  const re = new RegExp(/const EQUIPE = \/(.+)\/\n/.exec(EDGE)[1])
  const uuid = '7d1c0f5e-3b2a-4c8e-9f10-2a3b4c5d6e7f'
  assert.ok(re.test(uuid + '/' + uuid + '.webp') && re.test(uuid + '/' + uuid + '.jpg'))
  assert.ok(!re.test(uuid + '/' + uuid + '.png') && !re.test('geral/' + uuid + '.webp') && !re.test(uuid + '/../x.webp'))
  // Mesma regra no CHECK de perfis.avatar_path.
  assert.match(EQUIPE_SQL, /avatar_path ~ '\^\[0-9a-f-\]\{36\}\/\[0-9a-f-\]\{36\}\\\.\(webp\|jpg\)\$'/)
})

test('banco: tabelas fechadas, função Social media sem dado.ler, toda RPC exige permissão', () => {
  for (const t of ['redes_posts', 'redes_arquivos', 'redes_historico', 'redes_comentarios']) {
    assert.match(SQL, new RegExp('alter table public\\.' + t + ' enable row level security'))
  }
  assert.match(SQL, /revoke all on public\.redes_posts, public\.redes_arquivos, public\.redes_historico, public\.redes_comentarios\s+from public, anon, authenticated/)
  assert.doesNotMatch(SQL, /\('social', '(dado\.ler|redes\.gerir|acesso\.gerir|cadastro\.editar|curadoria\.decidir|pagamento\.gerir|relatorio\.ler)'\)/)
  assert.match(SQL, /select 'social', 'Social media'/)
  assert.doesNotMatch(SQL, /create policy/i)
  const publicas = [...SQL.matchAll(/^grant execute on function([\s\S]*?)to anon, authenticated;/gm)][0][1]
  const nomes = [...publicas.matchAll(/public\.((?:redes|social|editorial)_[a-z_]+)\(/g)].map((m) => m[1])
  for (const n of nomes) {
    const ini = SQL.indexOf('function public.' + n + '(')
    const corpo = SQL.slice(ini, SQL.indexOf('end $$;', ini))
    assert.match(corpo, /perform public\.redes_exigir\(p_secret, '(redes\.(ver|editar|arquivos|publicar|gerir)|editorial\.(ler|editar))'\)/, n)
  }
  // O painel só chama funções que a migration publica.
  const chamadas = new Set([...(VISTA + FICHA + ARQ + BIB + PART).matchAll(/rpc\('((?:redes|social|editorial)_[a-z_]+)'/g)].map((m) => m[1]))
  for (const c of chamadas) assert.ok(nomes.includes(c), 'RPC chamada e não publicada: ' + c)
})

test('banco: situação e formato batem com o painel; atrasada não é situação', () => {
  const situacoesAprov = [...APROV.match(/check \(situacao in \(([^)]*)\)\)/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
  assert.deepEqual(situacoesAprov, R.SITUACOES.map((s) => s.chave))
  assert.ok(checkDe('situacao').every((x) => situacoesAprov.includes(x)), 'a aprovação só acrescenta etapa')
  assert.deepEqual(Object.keys(STATUS.post_redes), R.SITUACOES.map((s) => s.chave))
  assert.deepEqual(checkDe('formato'), R.FORMATOS.map((f) => f.chave))
  assert.ok(!checkDe('situacao').includes('atrasada'))
  // Nada vira publicado sozinho: só redes_confirmar escreve situacao = 'publicado'.
  const escrevePublicado = [...SQL.matchAll(/situacao = 'publicado', publicado_em/g)].length
  assert.equal(escrevePublicado, 1)
  assert.doesNotMatch(SQL, /cron\.schedule/)
})

test('avisos: por pessoa (responsável e quem criou), nunca para quem fez; push pessoal atrás de chave', () => {
  const corpo = (src, f) => src.slice(src.indexOf('function public.' + f), src.indexOf('end $$;', src.indexOf('function public.' + f)))
  const avisar = corpo(SQL, 'redes_avisar')
  assert.match(avisar, /array\[p\.responsavel_id, p\.criado_por_id\]/)
  assert.match(avisar, /'social\/planejamento\/' \|\| p_post/)
  assert.doesNotMatch(SQL, /insert into public\.notificacoes/, 'aviso de redes só por avisar_pessoa')
  const pessoa = corpo(EQUIPE_SQL, 'avisar_pessoa')
  assert.match(pessoa, /p_user is not distinct from auth\.uid\(\)/) // quem fez não é avisado
  assert.match(pessoa, /interval '30 minutes'/) // agrupa gravações seguidas
  assert.match(pessoa, /push_pessoal/) // push só depois da enviar-push nova
  // Eventos pedidos: atribuído, arte, legenda, horário, ajuste, publicado, combo.
  for (const e of ["'atribuido'", "'arte'", "'legenda'", "'horario'", "'ajuste'", "'publicado'"]) assert.ok(SQL.includes(e), e)
  assert.match(SQL, /avisar_quem_pode\('curadoria\.decidir', 'combo'/)
  // Push: só os aparelhos do destinatário; geral, só quem pode ler o tipo.
  assert.match(EQUIPE_SQL, /when n\.para_user_id is not null then s\.user_id = n\.para_user_id/)
  assert.match(PUSH, /admin\.rpc\('push_destinos'/)
})

test('duplicar não copia execução; confirmação é explícita; nada fala com a Meta', () => {
  const dup = SQL.slice(SQL.indexOf('function public.redes_duplicar'), SQL.indexOf('end $$;', SQL.indexOf('function public.redes_duplicar')))
  for (const c of ['publicado_em', 'link_publicado', 'publicado_snapshot', 'programado_para', 'confirmado_em']) {
    assert.doesNotMatch(dup.slice(0, dup.indexOf('returning')), new RegExp('\\b' + c + '\\b'), c)
  }
  for (const f of [VISTA, FICHA, ARQ, BIB, PART]) {
    assert.doesNotMatch(f, /graph\.facebook|graph\.instagram|api\.instagram|localStorage/)
  }
  // Copiar/baixar não chamam a confirmação.
  const copiar = FICHA.slice(FICHA.indexOf('async function copiar'), FICHA.indexOf('// ── Arquivos ──'))
  assert.doesNotMatch(copiar, /redes_confirmar|redes_situacao/)
  assert.doesNotMatch(ARQ.slice(ARQ.indexOf('export async function baixarArquivo'), ARQ.indexOf('function esperar')), /rpc\(/)
})

test('edição simultânea: só vai o que mudou; conflito separa o que a outra pessoa também mexeu', () => {
  const base = { titulo: 'A', legenda: 'x', programado_para: null, responsavel_id: null }
  assert.deepEqual(R.diferencas(base, { ...base, legenda: 'y', responsavel_id: '' }), { legenda: 'y' })
  assert.deepEqual(R.diferencas(base, { ...base, programado_para: '' }), {})
  const salvo = { ...base, legenda: 'da outra', titulo: 'B' }
  assert.deepEqual(R.camposEmConflito(base, salvo, { legenda: 'minha', mencoes: '@a' }), ['legenda'])
  assert.deepEqual(R.camposEmConflito(base, salvo, { legenda: 'da outra' }), [])
})

test('módulo Social media: um calendário só, entrada da função, abas por permissão', () => {
  assert.match(MODULOS, /export function ModSocial/)
  assert.match(MODULOS, /chave: 'planejamento', rotulo: 'Planejamento'/)
  assert.match(MODULOS, /chave: 'participantes', rotulo: 'Participantes', mostrar: props\.pode\('editorial\.ler'\)/)
  assert.doesNotMatch(MODULOS, /chave: 'redes'/, 'Operação não tem mais o calendário: uma entrada só')
  assert.equal((MODULOS.match(/<Redes /g) || []).length, 1)
  assert.match(MODULOS, /props\.pode\('dado\.ler'\) \? <Mesa/)
  const APP = ler('painel-app/src/App.jsx')
  assert.match(APP, /funcaoCodigo === 'social' \? 'social\/planejamento'/)
  const SHELL = ler('painel-app/src/components/PainelShell.jsx')
  assert.match(SHELL, /social: \(pode\) => pode\('redes\.ver'\)/)
  assert.match(SHELL, /r = migrarRota\(r\)/)
})

test('editorial: só os campos da matriz; publicada intacta; legenda copiada é independente', () => {
  const salvar = SQL.slice(SQL.indexOf('function public.editorial_salvar'), SQL.indexOf('end $$;', SQL.indexOf('function public.editorial_salvar')))
  assert.match(salvar, /k not in \('combo_nome', 'combo_descricao', 'combo_proposta', 'itens'\)/)
  assert.doesNotMatch(salvar, /update public\.publicacoes|combo_condicoes =|combo_preco|tema_combo =|declaracoes_alimentares/)
  assert.match(salvar, /versao_desatualizada/)
  const ficha = SQL.slice(SQL.indexOf('function public.editorial_ficha'), SQL.indexOf('end $$;', SQL.indexOf('function public.editorial_ficha')))
  assert.doesNotMatch(ficha, /telefone|email|cnpj|pagamento|custo/)
  assert.match(ficha, /montar_publico/)
  // Criar postagem com a descrição: o texto vai COPIADO no momento (sessionStorage), sem vínculo.
  assert.match(PART, /const legenda = comDescricao \? \[f\.editavel\.combo_nome, f\.editavel\.combo_descricao\]/)
  assert.doesNotMatch(SQL, /legenda = .*combo_descricao/)
})

// ── Aprovação, atalhos certos, guia e barra (18/10/2026) ─────────────────────
import { atalhosDaBarra } from '../painel-app/src/lib/atalhosBarra.js'
import { passosDoGuia, quemAprova } from '../painel-app/src/lib/socialGuia.js'

test('aprovação (18/10/2026): Social media envia, quem aprova aprova; ajuste devolve; publicar só aprovado', () => {
  const corpo = (f) => APROV.slice(APROV.indexOf('function public.' + f + '('), APROV.indexOf('end $$;', APROV.indexOf('function public.' + f + '(')))
  assert.match(APROV, /\('administrador', 'redes\.aprovar'\)/)
  assert.doesNotMatch(APROV, /\('social', 'redes\.aprovar'\)/)
  const sit = corpo('redes_situacao')
  assert.match(sit, /case when p_situacao = 'pronto' then 'redes\.aprovar' else 'redes\.editar' end/)
  assert.match(sit, /if p_situacao not in \('rascunho', 'aprovacao', 'pronto', 'cancelado'\)/, '"preparacao" saiu do fluxo')
  assert.match(sit, /redes_avisar_aprovadores/)
  // Cancelar: redes.gerir, ou quem criou enquanto não aprovado.
  assert.match(sit, /p\.criado_por_id is not distinct from auth\.uid\(\)/)
  assert.match(corpo('redes_comentar'), /set situacao = 'rascunho'/)
  assert.doesNotMatch(corpo('redes_comentar'), /atualizado_em = now\(\)/, 'o selo de ajuste compara com atualizado_em')
  assert.match(corpo('redes_rever_etapa'), /not public\.pode_por_user\(auth\.uid\(\), 'redes\.aprovar'\)/)
  // A confirmação segue exigindo 'pronto' (= aprovado): a migration não mexe nela.
  assert.doesNotMatch(APROV, /function public\.redes_confirmar/)
  assert.match(SQL, /elsif p\.situacao <> 'pronto' then raise exception 'post_nao_pronto'/)
  for (const k of ['sem_arte', 'sem_legenda', 'aprovacao', 'aprovadas', 'ajuste']) assert.match(corpo('redes_resumo'), new RegExp("'" + k + "'"), k)
  assert.equal(STATUS.post_redes.pronto.rotulo, 'Aprovado')
  assert.equal(STATUS.post_redes.aprovacao.rotulo, 'Aguardando aprovação')
  assert.ok(!R.ETAPAS.some((e) => e.chave === 'preparacao'))
})

test('atalhos: contam pelo resumo do banco (não pelo mês aberto); à vista só o que tem algo', () => {
  const posts = [{ id: 'a', situacao: 'aprovacao', pendencias: [] }]
  const c = R.contagemAtalhos({ atrasadas: '3', aprovacao: 5, sem_responsavel: 2, hoje: 0 }, posts, { eu: 'eu', agora: 0 })
  assert.equal(c.atrasadas, 3)
  assert.equal(c.aprovacao, 5, 'o número é o do servidor, não o do mês na tela (1)')
  assert.equal(c.sem_resp, 2)
  assert.equal(R.contagemAtalhos(null, posts, { agora: 0 }).aprovacao, 1, 'sem resumo, conta o que carregou')
  assert.deepEqual(R.atalhosEmDestaque({ aprovacao: 2, atrasadas: 1, hoje: 0, ajuste: 0 }, { eu: 'x', aprova: true }), ['aprovacao', 'atrasadas', 'hoje'])
  assert.deepEqual(R.atalhosEmDestaque({ ajuste: 1, aprovacao: 2, aprovadas: 1, atrasadas: 1 }, { aprova: false, max: 3 }), ['ajuste', 'aprovadas', 'atrasadas'], 'quem publica vê o que já pode ir ao ar')
  assert.ok(R.atalhosEmDestaque({ minhas: 3 }, { eu: null }).every((k) => k !== 'minhas'))
  const lista = [{ id: '1', situacao: 'aprovacao' }, { id: '2', situacao: 'pronto' }, { id: '3', situacao: 'rascunho', ajuste_aberto: true }]
  assert.deepEqual(R.filtrar(lista, { atalho: 'aprovacao' }).map((p) => p.id), ['1'])
  assert.deepEqual(R.filtrar(lista, { atalho: 'aprovadas' }).map((p) => p.id), ['2'])
  assert.deepEqual(R.filtrar(lista, { atalho: 'ajuste' }).map((p) => p.id), ['3'])
})

test('texto completo e @ da casa', () => {
  assert.equal(R.textoCompleto('  Vem aí! #scw ', ' @jolie.cafe '), 'Vem aí! #scw\n\n@jolie.cafe')
  assert.equal(R.textoCompleto('', '@x'), '@x')
  assert.equal(R.textoCompleto('', ''), '')
  assert.equal(R.arrobaDe('https://www.instagram.com/jolie.cafe/'), '@jolie.cafe')
  assert.equal(R.arrobaDe('@jolie.cafe'), '@jolie.cafe')
  assert.equal(R.arrobaDe('jolie.cafe'), '@jolie.cafe')
  assert.equal(R.arrobaDe('Jolie Café (Natal)'), '')
  assert.equal(R.arrobaDe(null), '')
  assert.equal(R.LIMITE_LEGENDA_INSTAGRAM, 2200)
})

test('guia passo a passo: seis passos, de planejar a confirmar; diz quem aprova', () => {
  const p = passosDoGuia({ aprovador: 'Eline' })
  assert.equal(p.length, 6)
  assert.match(p[2].texto, /com Eline/)
  assert.match(p[5].texto, /Confirmar publicação/)
  assert.match(passosDoGuia({ aprova: true })[3].titulo, /Aprove/)
  assert.match(VISTA, /<SocialGuia /)
  assert.equal(quemAprova([{ nome: 'Eline Eulalia' }]), 'Eline')
  assert.equal(quemAprova([]), 'quem aprova')
})

test('barra do celular: escolha da pessoa, só o que ela vê, até 4; sem escolha vale o padrão', () => {
  const vis = ['visao', 'participantes', 'contatos', 'operacao', 'social', 'arquivos']
  const PADRAO = ['visao', 'participantes', 'social', 'operacao', 'contatos']
  assert.deepEqual(atalhosDaBarra(null, vis, PADRAO), ['visao', 'participantes', 'social', 'operacao'])
  assert.deepEqual(atalhosDaBarra(['social', 'arquivos', 'social'], vis, PADRAO), ['social', 'arquivos'])
  assert.deepEqual(atalhosDaBarra(['admin', 'edicao'], vis, PADRAO), ['visao', 'participantes', 'social', 'operacao'], 'nada visível na escolha → padrão')
  assert.deepEqual(atalhosDaBarra(['a', 'b', 'c', 'd', 'e'].map((_, i) => vis[i]), vis, PADRAO), vis.slice(0, 4))
  assert.deepEqual(atalhosDaBarra(null, ['visao', 'social'], PADRAO), ['visao', 'social'], 'a Social media vê as duas')
  const SHELL = ler('painel-app/src/components/PainelShell.jsx')
  assert.match(SHELL, /social: 'verde'/)
  assert.match(SHELL, /export const ATALHOS = \['visao', 'participantes', 'social'/)
  const CSS = ler('painel-app/src/styles/painel.css')
  assert.match(CSS, /--scw-verde:#22B573/)
  assert.match(CSS, /\[data-acento="verde"\] \.pn-acento-disco/)
  // Cada acento uma vez só (§6.3).
  const cores = Object.values(Function('return ' + SHELL.match(/export const ACENTO_VISTA = (\{[^}]+\})/)[1])())
  assert.equal(new Set(cores).size, cores.length)
})
