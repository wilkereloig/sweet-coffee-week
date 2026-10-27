// Miniatura da logo (26/10/2026): painel-app/src/lib/logosMini.js + migration 20261113_logos_mini.sql.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mapaMinis, semMini, fonteDaLogo, miniValida, TAMANHO_MINI, MINI_MAX } from '../painel-app/src/lib/logosMini.js'

const MINI = 'data:image/webp;base64,UklGRgQFAABXRUJQVlA4IPgE+/=='
const linhas = [
  { participante_id: 'p1', user_id: 'u1', logo_id: 'l1', path: '/logos/participants/a.png', mini: MINI },
  { participante_id: 'p2', user_id: null, logo_id: 'l2', path: 'p2/x-logo.png', mini: null },
  { participante_id: 'p3', user_id: 'u3', logo_id: 'l3', path: 'p3/y.png', mini: 'data:image/png;base64,AAAA' },
]

test('mapa por participante e por conta; mini fora do formato vira null', () => {
  const m = mapaMinis(linhas)
  assert.equal(m.porParticipante.p1.mini, MINI)
  assert.equal(m.porConta.u1, m.porParticipante.p1)
  assert.equal(m.porConta.null, undefined)
  assert.equal(m.porParticipante.p3.mini, null)
  assert.deepEqual(mapaMinis(null), { porParticipante: {}, porConta: {} })
})

test('semMini lista só o que tem de onde gerar', () => {
  assert.deepEqual(semMini(mapaMinis(linhas)).map((r) => r.logoId).sort(), ['l2', 'l3'])
})

test('miniatura só até TAMANHO_MINI; url de quem chama vence a original do mapa', () => {
  const reg = mapaMinis(linhas).porParticipante.p1
  assert.equal(fonteDaLogo(reg, TAMANHO_MINI).mini, MINI)
  assert.equal(fonteDaLogo(reg, TAMANHO_MINI + 1).mini, null)
  assert.equal(fonteDaLogo(reg, 88).original, '/logos/participants/a.png')
  assert.equal(fonteDaLogo(reg, 40, '/outra.png').original, '/outra.png')
  assert.deepEqual(fonteDaLogo(null, 40), { mini: null, original: null })
})

test('formato e teto iguais aos do CHECK da migration', () => {
  assert.ok(miniValida(MINI))
  assert.ok(!miniValida('data:image/webp;base64,' + 'A'.repeat(MINI_MAX)))
  assert.ok(!miniValida('javascript:alert(1)'))
  const sql = readFileSync(new URL('../supabase/migrations/20261113_logos_mini.sql', import.meta.url), 'utf8')
  assert.match(sql, new RegExp('length\\(mini\\) <= ' + MINI_MAX))
  assert.ok(sql.includes("'^data:image/webp;base64,[A-Za-z0-9+/]+=*$'"))
})

test('telas: avatar de marca e listas usam o mapa; logo_definir_mini classificada', () => {
  const ler = (f) => readFileSync(new URL('../painel-app/src/' + f, import.meta.url), 'utf8')
  assert.match(ler('components/Avatar.jsx'), /minis\.porConta\[id\]/)
  assert.match(ler('components/PainelShell.jsx'), /LogosMiniContexto\.Provider/)
  assert.match(ler('lib/sync/dominios.js'), /'logo_definir_mini'/)
  for (const f of ['Marcas', 'Preenchimento', 'Publicacao', 'Redes', 'SocialBiblioteca', 'Edicao', 'AcessoMarca', 'Producao', 'RedesFicha', 'Vouchers', 'Mesa', 'SocialParticipantes'])
    assert.match(ler('components/vistas/' + f + '.jsx'), /participanteId=\{/, f)
})
