// Cobrar pendência e avisar ajuste (26/10/2026): lib/pendenciasAviso.js, pendenciasDaFicha (lib/fichaGeral.js)
// e a migration 20261114_avisar_marca_pendencias.sql.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pendenciasDaFicha, cobravel, podeResolver } from '../painel-app/src/lib/fichaGeral.js'
import { textoCobranca, tituloCobranca, avisoNomeCombo, avisoLocalizacao, erroDoAviso, lerPendenciasLote } from '../painel-app/src/lib/pendenciasAviso.js'
import { interpretarLinkMarca, nivelDoAviso } from '../painel-app/src/lib/guia.js'
import { lerIrDaUrl } from '../painel-app/src/lib/central.js'

const ok = (dados) => ({ estado: 'ok', dados, erro: null })
const participante = { id: 'p1', participacao_id: 'pa1', nome_marca: 'Marlon Vinicius', responsavel: 'Marlon Vinicius' }
const fontes = {
  nucleo: { estado: 'erro', dados: null, erro: 'x' },
  publicacao: ok({ pendencias: ['combo_nome'], unidades: [{ participacao_unidade_id: 'u1', participa: true, nome: 'Capim Macio', logradouro: 'Rua A', coordenada_verificada_em: null }], midias: [] }),
  correcoes: ok([{ id: 'c1', campo: 'combo_descricao', comentario: 'Mais curta', estado: 'aberta' }]),
  edicoes: ok([]),
}

test('as duas pendências do print: nome do combo e mapa — cobráveis, com link e editor', () => {
  const itens = pendenciasDaFicha({ participante, fontes })
  const nome = itens.find((x) => x.chave === 'pub:combo_nome')
  const mapa = itens.find((x) => x.chave === 'coord:u1')
  assert.equal(nome.texto, 'O combo ainda não tem nome.')
  assert.equal(nome.link, 'combo/3/combo_nome')
  assert.equal(nome.resolver, 'nomeCombo')
  assert.equal(mapa.link, 'cadastro/4')
  assert.equal(mapa.resolver, 'coordenadas')
  assert.match(mapa.paraMarca, /Capim Macio/)
  assert.ok(cobravel(nome) && cobravel(mapa))
  // Fonte que falhou não é cobrável (não há o que dizer à marca).
  assert.ok(!cobravel(itens.find((x) => x.chave === 'erro:nucleo')))
  // Correção pedida: cobrável, leva ao campo.
  const cor = itens.find((x) => x.chave === 'correcao:c1')
  assert.equal(cor.link, 'combo/3/combo_descricao')
  assert.match(cor.paraMarca, /Mais curta/)
})

test('links das pendências abrem o campo certo no painel da marca e passam no ?ir= do push', () => {
  for (const it of pendenciasDaFicha({ participante, fontes }).filter(cobravel)) {
    assert.ok(lerIrDaUrl('?ir=' + encodeURIComponent(it.link)), 'push recusa ' + it.link)
    assert.ok(interpretarLinkMarca(it.link), 'marca não entende ' + it.link)
  }
  assert.deepEqual(interpretarLinkMarca('combo/3/combo_nome'), { vista: 'combo', sub: '3', campo: 'combo_nome' })
  assert.equal(interpretarLinkMarca('cadastro/4').vista, 'cadastro')
  assert.equal(nivelDoAviso({ tipo: 'pendencia' }), 'pendencia')
  assert.equal(nivelDoAviso({ tipo: 'ajuste' }), 'informacao')
})

test('resolver só com a permissão do editor', () => {
  const nome = { resolver: 'nomeCombo' }
  assert.ok(podeResolver(nome, (a) => a === 'cadastro.editar'))
  assert.ok(!podeResolver(nome, (a) => a === 'producao.gerir'))
  assert.ok(podeResolver({ resolver: 'coordenadas' }, (a) => a === 'producao.gerir'))
  assert.ok(!podeResolver({}, () => true))
})

test('texto: uma ou várias pendências num aviso só; o link é o da primeira', () => {
  const itens = pendenciasDaFicha({ participante, fontes }).filter(cobravel)
  const um = textoCobranca({ responsavel: 'Marlon Vinicius', itens: [itens[0]] })
  assert.equal(um.titulo, 'Uma pendência no seu cadastro')
  assert.match(um.texto, /^Olá, Marlon!/)
  assert.match(um.texto, /Falta isto no seu cadastro do Sweet & Coffee Week: /)
  const varios = textoCobranca({ responsavel: '', itens, recado: 'O prazo termina em 02/11.' })
  assert.equal(varios.titulo, itens.length + ' pendências no seu cadastro')
  assert.match(varios.texto, /^Olá!/)
  assert.equal(varios.texto.split('\n• ').length - 1, itens.length)
  assert.match(varios.texto, /O prazo termina em 02\/11\./)
  assert.equal(varios.link, itens[0].link)
  assert.equal(textoCobranca({ itens: [] }), null)
  assert.equal(tituloCobranca(2), '2 pendências no seu cadastro')
})

test('avisos de ajuste e validação do tamanho (os mesmos limites do banco)', () => {
  const a = avisoNomeCombo({ responsavel: 'Ana Alice', nome: 'Toon Town' })
  assert.match(a.texto, /“Toon Town”/)
  assert.equal(a.link, 'combo/3/combo_nome')
  assert.match(avisoLocalizacao({ unidade: 'Capim Macio' }).titulo, /Capim Macio/)
  assert.equal(erroDoAviso({ titulo: '', texto: 'x' }), 'Escreva o título do aviso.')
  assert.match(erroDoAviso({ titulo: 'x'.repeat(121), texto: 'x' }), /120/)
  assert.equal(erroDoAviso({ titulo: 'x', texto: 'y' }), null)
  const sql = readFileSync(new URL('../supabase/migrations/20261114_avisar_marca_pendencias.sql', import.meta.url), 'utf8')
  assert.match(sql, /char_length\(v_titulo\) > 120/)
  assert.match(sql, /char_length\(v_texto\) > 4000/)
  assert.ok(sql.includes("'^[a-z_]+(/[A-Za-z0-9_-]+){0,2}$'"), 'link no mesmo formato do lerIrDaUrl')
})

test('lote: 4 marcas por vez, na ordem, e falha de uma não derruba as outras', async () => {
  let emVoo = 0
  let pico = 0
  const chamar = async (nome, args) => {
    emVoo++; pico = Math.max(pico, emVoo)
    await new Promise((r) => setTimeout(r, 5))
    emVoo--
    if (args.p_participacao === 'quebra') throw new Error('HTTP 500')
    if (nome === 'get_publicacao') return { pendencias: ['combo_nome'], unidades: [], midias: [] }
    return nome === 'get_edicoes' || nome === 'get_correcoes' ? [] : {}
  }
  const marcas = Array.from({ length: 9 }, (_, i) => ({ id: 'm' + i, participacao_id: i === 3 ? 'quebra' : 'pa' + i, nome_marca: 'M' + i }))
  const avancos = []
  const r = await lerPendenciasLote(marcas, chamar, { aoAvancar: (f, t) => avancos.push(f + '/' + t) })
  assert.equal(r.length, 9)
  assert.deepEqual(r.map((x) => x.participante.id), marcas.map((m) => m.id))
  assert.ok(pico <= 16, 'no máximo 4 marcas × 4 leituras em voo (' + pico + ')')
  assert.equal(avancos.at(-1), '9/9')
  assert.ok(r[0].itens.some((x) => x.chave === 'pub:combo_nome'))
  assert.ok(r[3].itens.some((x) => x.erro), 'a marca que falhou diz "não consegui verificar"')
})

test('telas ligadas: cartão, ficha, lote, mapa e a RPC classificada', () => {
  const ler = (f) => readFileSync(new URL('../painel-app/src/' + f, import.meta.url), 'utf8')
  assert.match(ler('components/vistas/FichaVisao.jsx'), /onCobrar\(\[x\]\)/)
  assert.match(ler('components/vistas/FichaMarcaPagina.jsx'), /<FolhaCobrar /)
  assert.match(ler('components/vistas/FichaMarcaPagina.jsx'), /chave === 'nomeCombo'/)
  assert.match(ler('components/vistas/Marcas.jsx'), /lerPendenciasLote/)
  assert.match(ler('components/vistas/Publicacao.jsx'), /<CaixaAviso /)
  assert.match(ler('lib/sync/dominios.js'), /org_avisar_marca: \['mensagens', 'avisos'\]/)
})
