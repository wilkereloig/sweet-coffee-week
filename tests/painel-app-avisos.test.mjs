import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bytesDaChave, VAPID_PUBLICA } from '../painel-app/src/lib/avisos.js'

test('bytesDaChave decodifica a VAPID pública num ponto P-256 não comprimido', () => {
  const bytes = bytesDaChave(VAPID_PUBLICA)
  assert.equal(bytes.length, 65) // 1 (0x04) + 32 + 32
  assert.equal(bytes[0], 4)
})

test('bytesDaChave trata base64url sem padding (comprimento não múltiplo de 4)', () => {
  // 'YQ' (2 chars) decodifica pra 1 byte só com padding; sem tratar o
  // padding, atob() dá InvalidCharacterError.
  const bytes = bytesDaChave('YQ')
  assert.deepEqual(Array.from(bytes), [97]) // 'a'
})
