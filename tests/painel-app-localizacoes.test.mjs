import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  FILTROS_LOCALIZACAO, conferida, cepFormatado, enderecoDaUnidade, linkEndereco, pontoTexto, linkPonto, lerPonto,
  filtrarLocalizacoes, contarLocalizacoes, tituloDaUnidade,
} from '../painel-app/src/lib/localizacoes.js'

const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')

const U = [
  { participacao_unidade_id: 'a', unidade_id: 'ua', nome_marca: 'Alfa', nome_unidade: 'Alfa', logradouro: 'Rua A', numero: '10', bairro: 'Tirol', cidade: 'Natal', uf: 'RN', cep: '59020100', lat: null, lng: null, coordenada_verificada_em: null },
  { participacao_unidade_id: 'b', unidade_id: 'ub', nome_marca: 'Beta', nome_unidade: 'Midway', logradouro: 'Av. B', numero: 'S/N', bairro: 'Lagoa Nova', cidade: 'Natal', uf: null, cep: '59075-250', lat: '-5.8123', lng: '-35.2012', coordenada_verificada_em: null },
  { participacao_unidade_id: 'c', unidade_id: 'uc', nome_marca: 'Gama', nome_unidade: null, logradouro: 'Rua C', numero: '3', bairro: 'Centro', cidade: 'Natal', uf: 'RN', cep: '59000000', lat: '-5.79', lng: '-35.21', coordenada_verificada_em: '2026-10-28T12:00:00Z', coordenada_verificada_por: 'Wilker Eloi' },
]

test('a fila separa a conferir de conferidas, e a contagem bate com a lista', () => {
  assert.equal(conferida(U[2]), true)
  assert.equal(conferida(U[0]), false)
  assert.deepEqual(filtrarLocalizacoes(U, 'a_conferir').map((u) => u.participacao_unidade_id), ['a', 'b'])
  assert.deepEqual(filtrarLocalizacoes(U, 'conferidas').map((u) => u.participacao_unidade_id), ['c'])
  assert.equal(filtrarLocalizacoes(U, 'todas').length, 3)
  assert.deepEqual(contarLocalizacoes(U), { total: 3, conferidas: 1, aConferir: 2 })
  assert.deepEqual(contarLocalizacoes(null), { total: 0, conferidas: 0, aConferir: 0 })
  assert.deepEqual(FILTROS_LOCALIZACAO.map(([v]) => v), ['a_conferir', 'conferidas', 'todas'])
})

test('o endereço mostrado é o que o participante preencheu, com CEP formatado', () => {
  assert.equal(enderecoDaUnidade(U[0]), 'Rua A, 10 · Tirol · Natal/RN · CEP 59020-100')
  assert.equal(enderecoDaUnidade(U[1]), 'Av. B, S/N · Lagoa Nova · Natal · CEP 59075-250')
  assert.equal(cepFormatado('59020100'), '59020-100')
  assert.equal(cepFormatado('abc'), 'abc')
  assert.equal(enderecoDaUnidade(null), '')
})

test('o link do Google Maps procura o ENDEREÇO (é o que se compara com o ponto)', () => {
  const l = linkEndereco(U[0])
  assert.ok(l.startsWith('https://www.google.com/maps/search/?api=1&query='))
  assert.equal(decodeURIComponent(l.split('query=')[1]), 'Rua A, 10, Tirol, Natal, RN, 59020-100')
  assert.equal(linkPonto(U[0]), '', 'sem ponto salvo não há link do ponto')
  assert.equal(decodeURIComponent(linkPonto(U[1]).split('query=')[1]), '-5.8123, -35.2012')
  assert.equal(pontoTexto(U[1]), '-5.8123, -35.2012')
  assert.equal(pontoTexto(U[0]), '')
})

test('o ponto colado como o Google Maps copia vira dois números; o fora de Natal é recusado', () => {
  assert.deepEqual(lerPonto('-5.8123, -35.2012'), { lat: -5.8123, lng: -35.2012 })
  assert.deepEqual(lerPonto(pontoTexto(U[1])), { lat: -5.8123, lng: -35.2012 }, 'o ponto salvo confirma sem redigitar')
  assert.ok(lerPonto('').erro)
  assert.ok(lerPonto('-35.2012, -5.8123').erro, 'latitude e longitude trocadas')
})

test('o título é a marca, e a unidade só quando tem nome próprio', () => {
  assert.equal(tituloDaUnidade(U[0]), 'Alfa')
  assert.equal(tituloDaUnidade(U[1]), 'Beta · Midway')
  assert.equal(tituloDaUnidade(U[2]), 'Gama')
})

test('a tela confere no banco pela mesma RPC da ficha e a aba existe na rota e no módulo', () => {
  const tela = ler('painel-app/src/components/vistas/Localizacoes.jsx')
  assert.match(tela, /rpc\('get_localizacoes_unidades'/)
  assert.match(tela, /rpc\('org_verificar_coordenada'/)
  assert.match(tela, /pode\('producao\.gerir'\)/)
  assert.match(ler('painel-app/src/components/Modulos.jsx'), /chave: 'localizacoes'/)
  assert.match(ler('painel-app/src/lib/rota.js'), /ABA_PARTICIPANTES = new Set\(\[[^\]]*'localizacoes'/)
  const sql = ler('supabase/migrations/20261120_endereco_completo_e_fila_de_localizacao.sql')
  assert.match(sql, /function public\.get_localizacoes_unidades\(p_secret text, p_edicao text\)/)
  assert.match(sql, /public\.pode\(p_secret, 'dado\.ler'\)/)
})

test('o participante não vê mais nada sobre conferir o ponto no mapa', () => {
  const marca = ler('painel-app/src/components/vistas-marca/edicao/Unidades.jsx')
  assert.doesNotMatch(marca, /em conferência|Localização no mapa|conferida pela organização/)
  assert.match(marca, /Preencha rua, número, bairro, cidade e CEP/)
  assert.doesNotMatch(marca, /rotulo="Número" opcional|rotulo="CEP" opcional/, 'número e CEP deixaram de ser opcionais')
})

test('/preencher: número e CEP são obrigatórios e o CEP está à vista, fora do bloco recolhido', () => {
  const html = ler('public/preencher/index.html')
  assert.match(html, /\['numero', 'Número[^']*'\], \['bairro', 'Bairro'\], \['cep', 'CEP'\]/)
  const recolhido = html.slice(html.indexOf('<details class="mais">'), html.indexOf('</details>', html.indexOf('<details class="mais">')))
  assert.doesNotMatch(recolhido, /data-k="cep"/, 'o CEP não pode ficar escondido no bloco recolhido')
  assert.match(html, /data-k="cep"/)
})
