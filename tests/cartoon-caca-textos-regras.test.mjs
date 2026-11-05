// Caça aos Carimbos — os textos públicos descrevem a regra que o banco e o código aplicam (regulamento, privacidade, textos, painel).
// Não cria regra: trava a coerência entre o texto e os valores de partida do banco (migrations 20261203 a 20261215).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { REGULAMENTO } from '../src/edicao/cartoon/regulamento.js'
import { CACA } from '../src/edicao/caca/textos.js'
import { EXTRAS } from '../src/edicao/caca/textos-extras.js'

const raiz = path.resolve(import.meta.dirname, '..')
const fonte = (rel) => fs.readFileSync(path.join(raiz, rel), 'utf8')
const itens = REGULAMENTO.secoes.flatMap(([, xs]) => xs)
const regulamento = itens.filter((x) => typeof x === 'string').join('\n')
const aDefinir = itens.filter((x) => x?.aDefinir).map((x) => x.aDefinir)

/** Arquivos de texto que o público lê (ou que descrevem a regra no painel). Comentários de código não entram nas frases. */
const TEXTOS = [
  'src/edicao/cartoon/regulamento.js', 'src/edicao/cartoon/textos.js', 'src/edicao/caca/textos.js', 'src/edicao/caca/textos-extras.js',
  'src/edicao/caca/textos-gps.js', 'src/edicao/caca/grupos/textos.js', 'src/edicao/caca/ranking/textos.js', 'src/edicao/caca/mapa/textos.js',
  'src/data/conteudo/legal.js', 'painel-app/src/components/vistas/CarimbosMapa.jsx',
]

test('nenhuma frase de pontuação por avaliação em src, painel, public e nos docs ativos da Caça', () => {
  const ativos = fs.readdirSync(path.join(raiz, 'docs/cartoon-2026-2')).filter((f) => /^(14|15)-.*\.md$/.test(f)).map((f) => `docs/cartoon-2026-2/${f}`)
  for (const rel of [...TEXTOS, ...ativos]) {
    assert.doesNotMatch(fonte(rel), /\+ ?2 (por|pela|pontos)|\+ ?2\b|1 \+ 2\b|dois pontos por/i, `${rel}: a regra não tem bônus de pontos por avaliação`)
  }
})

test('nunca "votam/votação" para a avaliação do público e a surpresa não é descrita', () => {
  for (const rel of TEXTOS) {
    const sem = fonte(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    assert.doesNotMatch(sem, /\bvotam\b|\bvotação\b|\bvotacao\b|\bvoto\b/i, rel)
    assert.doesNotMatch(sem, /plaquinha/i, `${rel}: a surpresa do prêmio final não é revelada`)
  }
  assert.match(regulamento, /uma surpresa/)
})

test('regulamento bate com os valores de partida do banco (vouchers, corte, peso, ganhadores, prazos, validade, 12 h)', () => {
  const sql = fonte('supabase/migrations/20261204_caca_premiacao.sql')
  assert.match(sql, /\["2026-11-07","2026-11-08","2026-11-09","2026-11-10","2026-11-11"\]/)
  assert.match(sql, /'corte_hora_local', '"23:59"'/)
  assert.match(sql, /'peso_base', '100'/)
  assert.match(sql, /'ganhadores_final', '3'/)
  assert.match(sql, /'prazo_confirmacao_proximo_dia_hora', '12'/)
  assert.match(sql, /'voucher_validade_ate', '"2026-11-15"'/)
  assert.match(regulamento, /7, 8, 9, 10 e 11 de novembro, às 23h59/)
  assert.match(regulamento, /meio-dia do dia seguinte/)
  assert.match(regulamento, /até 15\/11/)
  assert.match(regulamento, /São 3 ganhadores/)
  assert.match(regulamento, /cada carimbo extra soma 1 ao peso/)
  assert.match(regulamento, /a cada 12 horas/)
  assert.match(regulamento, /Ganhar voucher não tira ninguém do prêmio final/)
})

test('regulamento: o que o servidor não faz não é prometido', () => {
  assert.doesNotMatch(regulamento, /\b2 horas|120 min|segunda chamada/i, 'prazo da chamada seguinte é proposta, não regra')
  assert.doesNotMatch(regulamento, /\bpontos?\b(?! (conferido|em conferência))/i, 'sem pontuação')
  assert.doesNotMatch(regulamento, /\(27\)|\b27 casas/, 'o total de casas vem do banco, nunca escrito no texto')
  assert.doesNotMatch(regulamento, /número de chances|cada carimbo válido é uma chance|mapas completos/i)
  assert.match(regulamento, /não é garantido/, 'e-mail e avisos não prometem entrega')
  assert.match(regulamento, /não há garantia de que cheguem/)
  assert.match(regulamento, /pedido não carimba nada por si só/)
  assert.match(regulamento, /quem decide é a organização, nunca a casa/)
  assert.match(regulamento, /O QR sozinho não vale carimbo/)
  assert.match(regulamento, /nunca marca visita/)
  assert.match(regulamento, /Elas não dão prêmio/)
  assert.match(regulamento, /a aprovação|na hora da aprovação/)
})

test('lacunas são só as que dependem de decisão do Wilker e estão listadas em 15-caca-publicacao-pendencias.md', () => {
  assert.equal(aDefinir.length, 3)
  const pend = fonte('docs/cartoon-2026-2/15-caca-publicacao-pendencias.md')
  for (const chave of ['idade mínima', 'entrega do prêmio final', 'guardados depois do festival']) {
    assert.ok(aDefinir.some((t) => t.includes(chave)), `aDefinir: ${chave}`)
    assert.match(pend, new RegExp(chave), `pendências: ${chave}`)
  }
  assert.match(pend, /Indispensável para publicar/i)
  assert.match(pend, /Pode publicar sem/i)
})

test('privacidade: localização só no carimbo, distância e margem, retenção "ainda não foi definido"', () => {
  const legal = fonte('src/data/conteudo/legal.js')
  assert.match(legal, /localização do celular é usada só nesse momento e não é guardada/)
  assert.match(legal, /distância em metros/)
  assert.match(legal, /margem de erro do GPS/)
  assert.match(legal, /pedido de revisão de presença/)
  assert.match(legal, /prazo de guarda depois do festival ainda não foi definido/)
  assert.doesNotMatch(legal, /\b\d+ dias após o festival|apagados? (em|após) \d+ dias/i, 'prazo de retenção não é inventado')
  assert.doesNotMatch(legal, /maiores de \d+|idade mínima de \d+/i, 'idade mínima não é inventada')
})

test('metas: textos e config de partida sem números de marco escritos nem prêmio', () => {
  const metas = JSON.stringify(EXTRAS.metas, (k, v) => (typeof v === 'function' ? v(3, 'x') : v))
  assert.doesNotMatch(metas, /prêmio por|ganha um|voucher extra/i)
  assert.match(EXTRAS.metas.nota, /comemorar/)
  assert.match(regulamento, /comemoram o seu caminho/)
  const sql = fonte('supabase/migrations/20261213_caca_metas_marcos.sql')
  assert.doesNotMatch(sql, /jsonb_build_object\('(premio|prêmio|voucher)'/i, 'marco não carrega campo de prêmio')
  assert.match(sql, /Só comemoram; não prometem prêmio/)
  assert.match(sql, /\('fracao', 0\.33,/)
  assert.match(sql, /'casas', 'todas'/)
  assert.doesNotMatch(regulamento, /\b(5|10|20) casas\b/, 'nenhum número de marco no regulamento')
})

test('a frase do mapa completo diz "concorre", não "vale", e a Caça não promete entrega de aviso', () => {
  assert.match(CACA.progresso.completo, /concorre ao prêmio final/)
  assert.match(EXTRAS.push.honestidade, /podem atrasar ou não chegar/)
  assert.match(EXTRAS.instalar.honestidade, /precisa de internet/)
})
