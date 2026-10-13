// Destaque de edição na abertura da Home (src/data/destaqueEdicao.js).
// Garante: desligado na entrega, nada de ativação pela metade, e a Home usa o
// contrato (não um segundo jeito de decidir).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { destaqueEdicao, destaqueValido } from '../src/data/destaqueEdicao.js'

const completo = {
  ativo: true,
  rotulo: 'Edição de exemplo',
  titulo: 'Título aprovado',
  texto: 'Texto aprovado.',
  imagem: { src: '/images/x.webp', alt: 'Descrição da foto' },
  legenda: 'O que a foto mostra',
  acao: { rotulo: 'Saiba mais', href: '/participar' },
}

test('o destaque sai desligado nesta entrega', () => {
  assert.equal(destaqueEdicao.ativo, false)
  assert.equal(destaqueValido(), false)
})

test('ligado e completo vale', () => {
  assert.equal(destaqueValido(completo), true)
})

test('faltou qualquer campo obrigatório → não vale (nunca bloco pela metade)', () => {
  for (const campo of ['titulo', 'texto', 'legenda', 'imagem', 'acao']) {
    assert.equal(destaqueValido({ ...completo, [campo]: null }), false, campo)
  }
  assert.equal(destaqueValido({ ...completo, titulo: '   ' }), false, 'título em branco')
  assert.equal(destaqueValido({ ...completo, imagem: { src: '/x.webp', alt: '' } }), false, 'foto sem alt')
  assert.equal(destaqueValido({ ...completo, acao: { rotulo: 'Ir' } }), false, 'ação sem destino')
})

test('só `ativo === true` liga — não há ativação por data nem por valor "verdadeiro"', () => {
  assert.equal(destaqueValido({ ...completo, ativo: 'sim' }), false)
  assert.equal(destaqueValido({ ...completo, ativo: 1 }), false)
  assert.equal(destaqueValido(null), false)
})

test('a Home decide pela função do contrato', () => {
  const arquivos = []
  const varrer = (dir) => {
    for (const nome of readdirSync(dir)) {
      const p = join(dir, nome)
      if (statSync(p).isDirectory()) varrer(p)
      else if (/\.jsx?$/.test(nome)) arquivos.push(p)
    }
  }
  varrer(new URL('../src/pages/home', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
  const fonte = arquivos.map((p) => readFileSync(p, 'utf8')).join('\n')
  assert.match(fonte, /destaqueValido\(/, 'a abertura precisa perguntar ao contrato se o destaque vale')
  assert.doesNotMatch(fonte, /destaqueEdicao\.ativo/, 'não decidir por `ativo` direto: um campo faltando abriria bloco vazio')
})
