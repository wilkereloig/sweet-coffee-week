// Convite aos avisos no celular (docs/cartoon-2026-2/19, etapa 2): quando aparece, iPhone sem app, "Agora não" por 3 dias.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { tipoDoConvite, conviteDispensado, chaveConviteDispensa, DIAS_CONVITE } from '../src/edicao/caca/notificacoes/convite.js'
import { estadoDoPush } from '../src/edicao/caca/notificacoes/logica.js'
import { EXTRAS } from '../src/edicao/caca/textos-extras.js'

const base = { temCarimbo: true, dispensado: false }

test('com carimbo e push desligado: convida a ativar', () => {
  assert.equal(tipoDoConvite({ ...base, estado: 'desligado' }), 'ativar')
})

test('iPhone sem o app instalado: convite explica e leva a instalar primeiro', () => {
  const estado = estadoDoPush({ suportado: false, ios: true, instalado: false })
  assert.equal(estado, 'ios-instalar')
  assert.equal(tipoDoConvite({ ...base, estado }), 'instalar')
  assert.match(EXTRAS.push.estados['ios-instalar'], /Adicionar à Tela de Início/)
})

test('não aparece: já ligado, bloqueado, sem suporte, sem carimbo ou dispensado', () => {
  for (const estado of ['ligado', 'bloqueada', 'nao-suportado']) assert.equal(tipoDoConvite({ ...base, estado }), null, estado)
  assert.equal(tipoDoConvite({ ...base, estado: 'desligado', temCarimbo: false }), null)
  assert.equal(tipoDoConvite({ ...base, estado: 'desligado', dispensado: true }), null)
  assert.equal(tipoDoConvite({ ...base, estado: 'ios-instalar', dispensado: true }), null)
})

test('"Agora não" vale 3 dias neste aparelho, por edição', () => {
  const dia = 86400000
  const agora = Date.parse('2026-11-10T15:00:00Z')
  assert.equal(DIAS_CONVITE, 3)
  assert.equal(conviteDispensado(String(agora - 2 * dia), agora), true)
  assert.equal(conviteDispensado(String(agora - 3 * dia - 1), agora), false)
  assert.equal(conviteDispensado(null, agora), false)
  assert.equal(conviteDispensado('lixo', agora), false)
  assert.equal(chaveConviteDispensa('2026.2'), 'scw:edicao:2026.2:convite-push-dispensado')
})

test('permissão só no clique: o convite não pede nada ao montar e usa a mesma ativação da central', () => {
  const convite = readFileSync(new URL('../src/edicao/caca/notificacoes/ConvitePush.jsx', import.meta.url), 'utf8')
  const central = readFileSync(new URL('../src/edicao/caca/notificacoes/AvisosPush.jsx', import.meta.url), 'utf8')
  assert.doesNotMatch(convite, /requestPermission|Notification\.request/)
  assert.match(convite, /onClick=\{ativar\}/)
  assert.match(convite, /ativarAvisosDoMapa\(api, chave\)/)
  assert.match(central, /ativarAvisosDoMapa\(api, chave\)/)
})

test('textos do convite não prometem voucher', () => {
  const T = EXTRAS.push.convite
  assert.doesNotMatch([T.titulo, T.texto, T.curto, T.nota].join(' '), /voc[eê] ganh|garant/i)
})
