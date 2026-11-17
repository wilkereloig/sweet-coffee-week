// Destaque de edição na abertura da Home (src/data/destaqueEdicao.js).
// Garante: destaque DESLIGADO depois do encerramento (16/11/2026) — a abertura
// da Home é a do festival, não a campanha de uma edição que acabou —, nada de
// ativação pela metade, e a Home usa o contrato (não um segundo jeito de decidir).
import { fileURLToPath } from 'node:url'
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

test('edição encerrada: o destaque sai desligado, a próxima edição segue sem dado e o vídeo foi para o acervo', async () => {
  assert.equal(destaqueEdicao.ativo, false)
  assert.equal(destaqueValido(), false, 'a abertura da Home é a institucional')
  for (const campo of ['ano', 'mes', 'tema', 'periodo']) assert.equal(proximaEdicao[campo], null, `próxima edição ainda não divulgada: ${campo}`)
  assert.equal(destaqueEdicao.imagem, undefined, 'nenhuma foto de edição anterior na abertura da edição')
  // O vídeo de lançamento não some: mora no detalhe da edição, identificado como lançamento.
  const { detalhe } = await import('../src/pages/edicoes/acervo.js')
  const d = detalhe('2026.2')
  assert.ok(d.lancamento && d.lancamento.src && d.lancamento.capa, 'a Cartoon guarda o vídeo de lançamento')
  assert.match(d.lancamento.instagram, /^https:\/\/www\.instagram\.com\/reel\/[\w-]+\/$/, 'link do reel limpo, sem parâmetro de rastreio')
  assert.equal(detalhe('2026.1').lancamento, null, 'edição sem vídeo no acervo não ganha bloco vazio')
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
  varrer(fileURLToPath(new URL('../src/pages/home', import.meta.url)).replace(/^\/([A-Za-z]:)/, '$1'))
  const fonte = arquivos.map((p) => readFileSync(p, 'utf8')).join('\n')
  assert.match(fonte, /destaqueValido\(/, 'a abertura precisa perguntar ao contrato se o destaque vale')
  assert.doesNotMatch(fonte, /destaqueEdicao\.ativo/, 'não decidir por `ativo` direto: um campo faltando abriria bloco vazio')
})
