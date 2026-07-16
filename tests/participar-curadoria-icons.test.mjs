import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../src/pages/institutional/Participar.jsx', import.meta.url), 'utf8')

test('curadoria criteria expose semantic icons beside their titles', () => {
  assert.match(source, /t:\s*'Perfil e categoria',[\s\S]*icon:\s*'plate'/)
  assert.match(source, /t:\s*'Atendimento ao público',[\s\S]*icon:\s*'heartLine'/)
  assert.match(source, /t:\s*'Estrutura e localização',[\s\S]*icon:\s*'pin'/)
  assert.match(source, /t:\s*'Alinhamento com a edição',[\s\S]*icon:\s*'star'/)
  assert.match(source, /t:\s*'Disponibilidade de vagas',[\s\S]*icon:\s*'cal'/)
  assert.match(source, /I\[c\.icon\]\s*\|\|\s*I\.star/)
  assert.match(source, /pcp-cur__icon/)
})
