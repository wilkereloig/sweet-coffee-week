// Destaque de edição na abertura da Home (src/data/destaqueEdicao.js).
// Garante: tema e período vêm da fonte única (proximaEdicao.js), nada de
// ativação pela metade, e a Home usa o contrato (não um segundo jeito de decidir).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { destaqueEdicao, destaqueValido } from '../src/data/destaqueEdicao.js'
import { proximaEdicao } from '../src/data/proximaEdicao.js'

const completo = {
  ativo: true,
  rotulo: 'Edição de exemplo',
  titulo: 'Título aprovado',
  tema: 'Tema aprovado',
  periodo: '1 a 10 de mês',
  texto: 'Texto aprovado.',
  video: { src: '/videos/x.mp4', capa: '/images/x.webp', titulo: 'Vídeo', instagram: 'https://www.instagram.com/reel/x/', rotulo: 'Ver no Instagram' },
  acao: { rotulo: 'Saiba mais', href: '/participar' },
}

test('ligado com o anúncio autorizado: tema, período e pré-cadastro vêm de proximaEdicao.js', () => {
  assert.equal(destaqueValido(), true)
  assert.equal(destaqueEdicao.tema, proximaEdicao.tema)
  assert.equal(destaqueEdicao.periodo, proximaEdicao.periodo)
  const aberto = proximaEdicao.status === 'pre-cadastro' && !!proximaEdicao.preCadastro
  assert.equal(destaqueEdicao.acao?.href ?? null, aberto ? proximaEdicao.preCadastro : null)
  assert.equal(destaqueEdicao.imagem, undefined, 'nenhuma foto de edição anterior na abertura da edição')
  assert.match(destaqueEdicao.video.instagram, /^https:\/\/www\.instagram\.com\/reel\/[\w-]+\/$/, 'link do reel limpo, sem parâmetro de rastreio')
})

test('ligado e completo vale', () => {
  assert.equal(destaqueValido(completo), true)
})

test('faltou qualquer campo obrigatório → não vale (nunca bloco pela metade)', () => {
  for (const campo of ['titulo', 'tema', 'periodo', 'texto']) {
    assert.equal(destaqueValido({ ...completo, [campo]: null }), false, campo)
  }
  assert.equal(destaqueValido({ ...completo, titulo: '   ' }), false, 'título em branco')
  assert.equal(destaqueValido({ ...completo, video: { ...completo.video, instagram: '' } }), false, 'vídeo sem o link do Instagram')
  assert.equal(destaqueValido({ ...completo, acao: { rotulo: 'Ir' } }), false, 'ação sem destino')
  assert.equal(destaqueValido({ ...completo, marca: { src: '/x.webp', alt: '' } }), false, 'marca sem alt')
})

test('ação e vídeo são opcionais: sem eles o destaque continua valendo', () => {
  assert.equal(destaqueValido({ ...completo, acao: null }), true)
  assert.equal(destaqueValido({ ...completo, video: null }), true)
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
