// Movimento nas casas (docs/cartoon-2026-2/20-movimento-nas-casas.md): migrations 20270125 (parte A) e 20270128 (parte D:
// índice somado, foto em segundo plano, parte pública), o resumo do painel e o que o site diz.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resumoMovimento, NIVEL_MOVIMENTO, PROBLEMA_DISPLAY } from '../painel-app/src/lib/caca.js'
import { mapaDoMovimento, seloDoMovimento } from '../src/edicao/caca/movimento.js'
import { contarFiltros } from '../src/edicao/caca/mapa/tela.js'
import { MAPA } from '../src/edicao/cartoon/textos.js'

const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const sqlA = ler('supabase/migrations/20270125_caca_movimento.sql')
const sql = ler('supabase/migrations/20270128_caca_movimento_indice.sql')
const rev = ler('supabase/reverter/20270128_caca_movimento_indice.sql')

test('parte A: só leitura, só para quem lê dados do painel, presença = carimbo por GPS', () => {
  assert.match(sqlA, /if not public\.pode\(p_secret, 'dado\.ler'\) then raise exception 'nao_autorizado'/)
  assert.match(sqlA, /where origem = 'gps' and anulado_em is null/)
  assert.match(ler('supabase/reverter/20270125_caca_movimento.sql'), /drop function if exists public\.caca_movimento_estado\(text, timestamptz\)/)
})

test('índice: avaliações e carimbos por GPS uma vez por pessoa, QR da casa pela metade e sem robô, janela de 2 h', () => {
  assert.match(sql, /count\(distinct ev\.quem\)::numeric pessoas/)
  assert.match(sql, /c\.origem = 'gps' and c\.anulado_em is null/)
  assert.match(sql, /q\.tipo = 'display_face1'[\s\S]*?where not coalesce\(l\.robo, false\)/)
  assert.match(sql, /coalesce\(pe\.pessoas, 0\) \+ 0\.5 \* coalesce\(qr\.n, 0\) \/ un\.enderecos/)
  assert.match(sql, /make_interval\(days => k\.k\) - interval '2 hours'/)
})

test('níveis: alto só com 4+ presenças e 1,5 × o normal; tranquila nunca é alta e fica até a mediana', () => {
  assert.match(sql, /when l\.indice >= 4 and l\.indice > 1\.5 \* l\.normal then 'alto'/)
  assert.match(sql, /when l\.normal >= 3 and l\.indice < 0\.5 \* l\.normal then 'baixo'/)
  assert.match(sql, /n\.nivel <> 'alto' and n\.indice <= coalesce\(\(select m from med\), 0\)/)
})

test('público: nasce desligado, sem número, só foto recente e casa publicada; cálculo e gravação fechados', () => {
  assert.match(sql, /values \('movimento_publico', '\{"ligado":false\}'::jsonb/)
  const pub = sql.slice(sql.indexOf('function public.movimento_publico'), sql.indexOf('function public.caca_movimento_publico_definir'))
  assert.match(pub, /returns table \(unidade text, alto boolean, tranquila boolean\)/)
  assert.match(pub, /select u\.id_publico, f\.nivel = 'alto', f\.tranquila/)
  assert.match(pub, /f\.calculado_em > now\(\) - interval '40 minutes'/)
  assert.match(pub, /chave = 'movimento_publico'\), false\)/)
  assert.match(pub, /pb\.vigente and pb\.nivel = 'marca_e_combo'/)
  assert.match(sql, /revoke all on function public\.caca_movimento_calc\(timestamptz\), public\.caca_movimento_gravar\(timestamptz\) from public, anon, authenticated/)
  assert.match(sql, /caca_movimento_publico_definir[\s\S]*?public\.pode\(p_secret, 'producao\.gerir'\)/)
  assert.match(sql, /cron\.schedule\('scw-caca-movimento', '\*\/15 \* \* \* \*'/)
})

test('reverter: para o job e apaga foto, interruptor e leitura pública', () => {
  assert.match(rev, /cron\.unschedule\(jobid\) from cron\.job where jobname = 'scw-caca-movimento'/)
  for (const f of ['movimento_publico', 'caca_movimento_publico_definir', 'caca_movimento_gravar', 'caca_movimento_calc']) assert.match(rev, new RegExp(`drop function if exists public\\.${f}\\(`))
  assert.match(rev, /drop table if exists public\.caca_movimento_foto/)
  assert.match(rev, /delete from public\.caca_config where chave = 'movimento_publico'/)
})

test('painel: níveis conhecidos, desconhecido vira pouco dado, fontes, displays e horas vazias fora', () => {
  const m = resumoMovimento({
    janela_horas: 2, dias_base: 5, publico: true, foto_em: '2026-11-11T18:30:00Z',
    unidades: [
      { id: 'a', nome: 'Casa A', indice: 32, normal: 14.8, nivel: 'alto', tranquila: false, fontes: { avaliacoes: 29, carimbos: 12, qr: 6 }, pico_hora: 18, hoje: 20, total: 80 },
      { id: 'b', nome: '', indice: 0, normal: null, nivel: 'xyz', pico_hora: null },
      null,
    ],
    horas: [{ hora: 7, hoje: 0, media: 0 }, { hora: 18, hoje: 9, media: 35.4 }, { hora: 'x', hoje: 3 }],
    displays: [{ nome: 'Casa X', leituras: 0, carimbos: 0, problema: 'nunca_lido' }, { nome: 'Y', problema: 'inventado' }],
  })
  assert.equal(m.unidades.length, 2)
  assert.deepEqual(m.unidades[0].fontes, { avaliacoes: 29, carimbos: 12, qr: 6 })
  assert.equal(m.unidades[1].nivel, 'sem_dado')
  assert.equal(m.unidades[1].nome, 'Casa sem nome')
  assert.equal(m.niveis.alto, 1)
  assert.deepEqual(m.horas.map((h) => h.hora), [18])
  assert.equal(m.maximo, 35.4)
  assert.equal(m.publico, true)
  assert.deepEqual(m.displays.map((d) => d.nome), ['Casa X'])
  assert.deepEqual(resumoMovimento(undefined).unidades, [])
  assert.equal(Object.keys(NIVEL_MOVIMENTO).length, 5)
  assert.equal(Object.keys(PROBLEMA_DISPLAY).length, 3)
})

test('site: só fala de casa aberta; esgotado e fila da casa calam o selo; nunca diz lotada', () => {
  const mov = mapaDoMovimento([{ unidade: 'u1', alto: true, tranquila: false }, { unidade: 'u2', alto: false, tranquila: true }, { alto: true }, null])
  assert.equal(mov.size, 2)
  assert.equal(seloDoMovimento({ mov: mov.get('u1'), aberto: true }), 'alto')
  assert.equal(seloDoMovimento({ mov: mov.get('u2'), aberto: true }), 'tranquila')
  assert.equal(seloDoMovimento({ mov: mov.get('u2'), aberto: false }), null)
  assert.equal(seloDoMovimento({ mov: mov.get('u2'), aberto: true, esgotado: true }), null)
  assert.equal(seloDoMovimento({ mov: mov.get('u1'), aberto: true, fila: true }), null)
  assert.equal(seloDoMovimento({ mov: undefined, aberto: true }), null)
  assert.equal(seloDoMovimento({ mov: { alto: false, tranquila: false }, aberto: true }), null)
  assert.doesNotMatch(JSON.stringify(MAPA.movimento) + MAPA.filtroTranquilas, /lotad|chei[oa]/i)
  assert.equal(contarFiltros({ tranquila: true }), 1)
})

test('telas: cartão do mapa, filtro e ficha da casa usam a mesma regra', () => {
  assert.match(ler('src/edicao/cartoon/paginas/mapa/Cartao.jsx'), /seloDoMovimento\(\{ mov: movimento, aberto: est\?\.estado === 'aberto', esgotado: esgotadoHoje, fila: filaAgora \}\)/)
  assert.match(ler('src/edicao/cartoon/paginas/mapa/index.jsx'), /!filtroTranquila \|\| seloDe\(p, u\) === 'tranquila'/)
  assert.match(ler('src/edicao/cartoon/paginas/mapa/Controles.jsx'), /hoje && comMovimento && <Chip ativo=\{f\.tranquila\}/)
  assert.match(ler('src/edicao/cartoon/paginas/participante/Unidades.jsx'), /seloDoMovimento\(\{ mov: movimento, aberto: est\.estado === 'aberto' \}\)/)
})
