// Pedidos de presença: "Aprovar todos" só leva o que mostraria o botão Aprovar; filtros rápidos.
import test from 'node:test'
import assert from 'node:assert/strict'
import { aguardaEvidencia, aprovavelEmLote, filtrarRapido, notaSemProva, PREFIXO_SEM_PROVA, MIN_MOTIVO_SEM_PROVA } from '../painel-app/src/lib/cacaGps.js'

const gps = { id: 1, estado: 'pendente', motivo: 'gps', nota: 'Estou no balcão' }
const semNada = { id: 2, estado: 'pendente', motivo: 'visita_anterior', nota: '' }
const fotoPrometida = { id: 3, estado: 'pendente', motivo: 'visita_anterior', nota: 'Foto como prova' }
const comFoto = { id: 4, estado: 'pendente', motivo: 'visita_anterior', nota: 'Foto como prova', imagem: 'x.webp' }
const casa = { id: 5, estado: 'pendente', motivo: 'delivery', aguardando_casa: true, via: 'casa' }
const deliveryImg = { id: 6, estado: 'pendente', motivo: 'delivery', aguardando_casa: true, via_pretendida: 'imagem', imagem: 'd.webp' }
const aprovado = { id: 7, estado: 'aprovado', motivo: 'gps' }

test('lote: só os decidíveis com evidência', () => {
  const todos = [gps, semNada, fotoPrometida, comFoto, casa, deliveryImg, aprovado]
  assert.deepEqual(todos.filter(aprovavelEmLote).map((p) => p.id), [1, 4, 6])
  assert.equal(aguardaEvidencia(semNada), 'Aguardando relato ou foto')
  assert.equal(aguardaEvidencia(fotoPrometida), 'Aguardando foto da pessoa')
  assert.equal(aguardaEvidencia(gps), null)
})

test('filtros rápidos', () => {
  const l = [gps, semNada, fotoPrometida, comFoto, deliveryImg]
  assert.deepEqual(filtrarRapido(l, 'foto').map((p) => p.id), [4, 6])
  assert.deepEqual(filtrarRapido(l, 'relato').map((p) => p.id), [1])
  assert.deepEqual(filtrarRapido(l, 'sem').map((p) => p.id), [2, 3])
  assert.deepEqual(filtrarRapido(l, 'delivery').map((p) => p.id), [6])
  assert.equal(filtrarRapido(l, 'visita').length, 3)
  assert.equal(filtrarRapido(l, 'inexistente').length, 5)
})

test('exceção sem prova: nota leva o prefixo que o banco confere e nunca entra no lote', () => {
  const nota = notaSemProva('  Mandou o print pelo WhatsApp  ')
  assert.equal(nota, 'Exceção sem prova: Mandou o print pelo WhatsApp')
  // o gatilho exige o prefixo e 34+ caracteres (prefixo de 19 + motivo mínimo de 15)
  assert.equal(PREFIXO_SEM_PROVA.length + MIN_MOTIVO_SEM_PROVA, 34)
  assert.equal(aprovavelEmLote(semNada), false)
})