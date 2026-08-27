// Mesmo motivo do painel-app-respostas.test.mjs: dataHoraCurta/dataCurta
// mostram o dia no fuso de quem vê, então o teste fixa o fuso da MÁQUINA
// que roda, sem mudar o comportamento real (que nunca fixa fuso).
process.env.TZ = 'America/Sao_Paulo'

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { campo, dataHoraCurta, preco, prazoSelo, acessoDe, seloAcesso } from '../painel-app/src/lib/painelFormat.js'

test('campo devolve a primeira chave presente, ou vazio', () => {
  assert.equal(campo({ nome: 'Ana' }, ['nome', 'name']), 'Ana')
  assert.equal(campo({ name: 'Ana' }, ['nome', 'name']), 'Ana')
  assert.equal(campo({}, ['nome', 'name']), '')
})

test('dataHoraCurta formata dd/mm/aaaa hh:mm, vazio para valor ausente ou inválido', () => {
  assert.equal(dataHoraCurta('2027-03-04T14:30:00Z'), dataHoraCurta('2027-03-04T14:30:00Z')) // determinístico
  assert.equal(dataHoraCurta(null), '')
  assert.equal(dataHoraCurta('não é data'), '')
  assert.match(dataHoraCurta('2027-03-04T14:30:00Z'), /^\d{2}\/\d{2}\/\d{4},? \d{2}:\d{2}$/)
})

test('preco formata em reais com vírgula, vazio para null/undefined', () => {
  assert.equal(preco(38.9), 'R$ 38,90')
  assert.equal(preco(0), 'R$ 0,00')
  assert.equal(preco(null), '')
  assert.equal(preco(undefined), '')
})

test('prazoSelo: sem data devolve null', () => {
  assert.equal(prazoSelo(null), null)
  assert.equal(prazoSelo('não é data'), null)
})

test('prazoSelo: prazo vencido, hoje, próximo e distante', () => {
  const dia = 864e5
  const vencido = new Date(Date.now() - 2 * dia).toISOString()
  const hoje = new Date(Date.now() - 1000).toISOString() // poucos ms atrás, ainda "hoje" (diff <= 0)
  const proximo = new Date(Date.now() + 3 * dia).toISOString()
  const distante = new Date(Date.now() + 30 * dia).toISOString()

  assert.equal(prazoSelo(vencido).tom, 'aguardando_cadastro')
  assert.match(prazoSelo(vencido).texto, /^venceu /)

  assert.deepEqual(prazoSelo(hoje), { tom: 'aguardando_cadastro', texto: 'vence hoje' })

  assert.equal(prazoSelo(proximo).tom, 'em_preenchimento')
  assert.equal(prazoSelo(proximo).texto, 'faltam 3 dias')

  assert.equal(prazoSelo(distante).tom, null)
  assert.match(prazoSelo(distante).texto, /^até /)
})

test('acessoDe só liga quero_participar, pelo origem_id', () => {
  const participantes = [{ origem_id: 'abc', status_cadastro: 'em_preenchimento' }]
  assert.deepEqual(acessoDe('quero_participar', { id: 'abc' }, participantes), participantes[0])
  assert.equal(acessoDe('quero_participar', { id: 'zzz' }, participantes), null)
  assert.equal(acessoDe('apoiar', { id: 'abc' }, participantes), null)
})

test('seloAcesso devolve rótulo mapeado ou o status cru como fallback', () => {
  const participantes = [{ origem_id: 'abc', status_cadastro: 'em_preenchimento' }]
  assert.deepEqual(
    seloAcesso('quero_participar', { id: 'abc' }, participantes, { em_preenchimento: 'Preenchendo' }),
    { status: 'em_preenchimento', rotulo: 'Preenchendo' },
  )
  assert.deepEqual(
    seloAcesso('quero_participar', { id: 'abc' }, participantes),
    { status: 'em_preenchimento', rotulo: 'em_preenchimento' },
  )
  assert.equal(seloAcesso('quero_participar', { id: 'zzz' }, participantes), null)
})
