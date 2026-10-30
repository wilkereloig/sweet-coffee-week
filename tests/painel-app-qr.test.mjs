import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  TIPOS, rotuloTipo, argumentosDoPeriodo, hojeEmNatal, ordenarCasas, comPosicao, filtrarPorTexto, larguraBarra, maiorValor,
  numero, ultimaLeitura, diaCurto, rotuloLugar, rotuloAparelho, celulaCsv, montarCsv, csvCasas, csvPecas, csvDias, nomeDoArquivo,
} from '../painel-app/src/lib/qr.js'

const lerArquivo = (rel) => readFileSync(new URL('../' + rel, import.meta.url), 'utf8')
const CASAS = [
  { nome: 'Bolomania', face1: 0, face2: 0, outras: 0, total: 0, ultima: null },
  { nome: 'Wow Cookies', face1: 0, face2: 2, outras: 0, total: 2, ultima: '2026-10-30T15:00:00+00:00' },
  { nome: 'Boldfood', face1: 1, face2: 0, outras: 0, total: 1, ultima: '2026-10-30T15:00:00+00:00' },
  { nome: 'Álvaro Doces', face1: 1, face2: 1, outras: 0, total: 2, ultima: '2026-10-30T16:00:00+00:00' },
]

test('todo tipo de peça que o banco aceita tem rótulo na tela', () => {
  const sql = lerArquivo('supabase/migrations/20261121_qr_leituras.sql')
  const m = sql.match(/check \(tipo in \(([^)]*)\)\)/)
  assert.ok(m, 'check de tipo não encontrado na migration')
  for (const t of m[1].split(',').map((x) => x.trim().replace(/'/g, ''))) assert.ok(TIPOS[t], 'sem rótulo: ' + t)
  assert.equal(rotuloTipo('mapa'), 'Mapa')
  assert.equal(rotuloTipo('tipo-novo'), 'tipo-novo', 'tipo desconhecido aparece cru, não some')
})

test('período: abertura, hoje (no fuso de Natal) e tudo com testes', () => {
  assert.deepEqual(argumentosDoPeriodo('abertura', '2026-11-05'), { p_de: '2026-11-05', p_ate: null, p_testes: false })
  assert.deepEqual(argumentosDoPeriodo('abertura', null), { p_de: null, p_ate: null, p_testes: false })
  assert.deepEqual(argumentosDoPeriodo('tudo', '2026-11-05'), { p_de: null, p_ate: null, p_testes: true })
  // 01:30 UTC de 06/11 ainda é 22:30 de 05/11 em Natal; 03:00 UTC já é meia-noite de 06/11.
  assert.deepEqual(argumentosDoPeriodo('hoje', '2026-11-05', new Date('2026-11-06T01:30:00Z')), { p_de: '2026-11-05', p_ate: '2026-11-05', p_testes: false })
  assert.equal(hojeEmNatal(new Date('2026-11-06T03:00:00Z')), '2026-11-06')
})

test('ranking: ordena por leituras, desempata por nome e empate divide a posição', () => {
  const porTotal = ordenarCasas(CASAS, 'total')
  assert.deepEqual(porTotal.map((c) => c.nome), ['Álvaro Doces', 'Wow Cookies', 'Boldfood', 'Bolomania'])
  assert.deepEqual(comPosicao(porTotal, 'total').map((c) => c.posicao), [1, 1, 3, null], 'quem tem 0 fica sem posição')
  const porFace1 = ordenarCasas(CASAS, 'face1')
  assert.deepEqual(porFace1.map((c) => c.nome), ['Álvaro Doces', 'Boldfood', 'Bolomania', 'Wow Cookies'])
  assert.deepEqual(comPosicao(porFace1, 'face1').map((c) => c.posicao), [1, 1, null, null])
  const porNome = ordenarCasas(CASAS, 'nome')
  assert.deepEqual(porNome.map((c) => c.nome), ['Álvaro Doces', 'Boldfood', 'Bolomania', 'Wow Cookies'])
  assert.deepEqual(comPosicao(porNome, 'nome').map((c) => c.posicao), [null, null, null, null], 'em ordem alfabética não há posição')
  assert.deepEqual(CASAS.map((c) => c.nome), ['Bolomania', 'Wow Cookies', 'Boldfood', 'Álvaro Doces'], 'não mexe na lista original')
})

test('busca sem acento nem maiúscula; vazia devolve tudo', () => {
  assert.deepEqual(filtrarPorTexto(CASAS, 'alvaro', ['nome']).map((c) => c.nome), ['Álvaro Doces'])
  assert.deepEqual(filtrarPorTexto(CASAS, 'BOL', ['nome']).map((c) => c.nome), ['Bolomania', 'Boldfood'])
  assert.equal(filtrarPorTexto(CASAS, '   ', ['nome']), CASAS)
  assert.equal(filtrarPorTexto([{ codigo: 'd1-wow-cookies', rotulo: 'Display' }], 'wow', ['codigo', 'rotulo']).length, 1)
})

test('barra: proporcional, com mínimo visível e sem estourar', () => {
  assert.equal(larguraBarra(0, 10), 0)
  assert.equal(larguraBarra(1, 1000), 3)
  assert.equal(larguraBarra(5, 10), 50)
  assert.equal(larguraBarra(10, 10), 100)
  assert.equal(larguraBarra(20, 10), 100)
  assert.equal(larguraBarra(5, 0), 0)
  assert.equal(maiorValor(CASAS, 'total'), 2)
  assert.equal(maiorValor([], 'total'), 0)
})

test('formatos: hora cheia em Natal, dia curto, lugar e aparelho', () => {
  assert.equal(ultimaLeitura('2026-10-30T15:00:00+00:00'), '30/10 12h')
  assert.equal(ultimaLeitura('2026-10-30T15:00:00+00:00', true), '30/10/2026 12h')
  assert.equal(ultimaLeitura('2026-11-06T02:00:00+00:00'), '05/11 23h')
  assert.equal(ultimaLeitura(null), '—')
  assert.equal(ultimaLeitura('não é data'), '—')
  assert.equal(diaCurto('2026-11-05'), '05/11')
  assert.equal(diaCurto('quando?'), '—')
  assert.equal(rotuloLugar({ cidade: 'Natal', regiao: 'RN' }), 'Natal · RN')
  assert.equal(rotuloLugar({ cidade: 'Natal', regiao: '' }), 'Natal')
  assert.equal(rotuloLugar({ cidade: '', regiao: '' }), 'Sem lugar informado')
  assert.equal(rotuloAparelho('ios'), 'iPhone')
  assert.equal(rotuloAparelho('algo'), 'algo')
  assert.equal(numero(1234), (1234).toLocaleString('pt-BR'))
  assert.equal(numero(undefined), '0')
})

test('CSV: ponto e vírgula, aspas, fórmula neutralizada, BOM e CRLF', () => {
  const AP = String.fromCharCode(39)
  assert.equal(celulaCsv('Casa; do "João"'), '"Casa; do ""João"""')
  assert.equal(celulaCsv('=SOMA(A1)'), AP + '=SOMA(A1)', 'texto que vira fórmula no Excel ganha apóstrofo')
  assert.equal(celulaCsv('@cmd'), AP + '@cmd')
  assert.equal(celulaCsv(-3), '-3', 'número não leva apóstrofo')
  assert.equal(celulaCsv(null), '')
  assert.equal(celulaCsv(0), '0')
  assert.equal(montarCsv([['a', 'A'], [(l) => l.b * 2, 'Dobro']], [{ a: 'x;y', b: 2 }]), '\ufeffA;Dobro\r\n"x;y";4\r\n')
  const casas = csvCasas(ordenarCasas(CASAS, 'total'))
  assert.ok(casas.startsWith('\ufeffCasa;Face 1 (combo);Face 2 (avaliar);Outras peças;Total;Última hora com leitura\r\n'))
  assert.ok(casas.includes('Wow Cookies;0;2;0;2;30/10/2026 12h\r\n'))
  assert.ok(casas.includes('Bolomania;0;0;0;0;—\r\n'))
  const pecas = csvPecas(
    [{ codigo: 'd2-wow-cookies', tipo: 'display_face2', participacao_id: 'p1', leituras: 2, ultima: '2026-10-30T15:00:00+00:00', ativo: true },
      { codigo: 'pl-geral', tipo: 'placa', participacao_id: null, leituras: 0, ultima: null, ativo: false }],
    { p1: 'Wow Cookies' },
  )
  assert.ok(pecas.includes('d2-wow-cookies;Display · face 2 (avaliar);Wow Cookies;2;30/10/2026 12h;sim\r\n'))
  assert.ok(pecas.includes('pl-geral;Placa;;0;—;não\r\n'))
  assert.equal(csvDias([{ dia: '2026-11-05', leituras: 7 }]), '\ufeffDia;Leituras\r\n2026-11-05;7\r\n')
  assert.equal(nomeDoArquivo('casas', new Date('2026-11-06T01:30:00Z')), 'qr-casas-2026-11-05.csv')
})

test('migration do painel: só leitura, permissão dado.ler e cálculo fechado para a chave pública', () => {
  const sql = lerArquivo('supabase/migrations/20261122_qr_painel.sql')
  const codigo = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')
  assert.ok(!/\b(insert|update|delete|truncate|drop|alter)\b/i.test(codigo), 'a migration do painel não grava nada')
  assert.match(codigo, /if not public\.pode\(p_secret, \x27dado\.ler\x27\) then raise exception \x27nao_autorizado\x27; end if;/)
  const publica = codigo.slice(codigo.indexOf('function public.get_qr_resumo'))
  assert.match(publica, /security definer\s+set search_path to \x27public\x27/)
  assert.match(codigo, /revoke all on function public\.get_qr_resumo\(text, date, date, boolean\) from public;/)
  assert.match(codigo, /grant execute on function public\.get_qr_resumo\(text, date, date, boolean\) to anon, authenticated, service_role;/)
  // O cálculo sem checagem de permissão nunca é aberto para anon/authenticated.
  assert.match(codigo, /revoke all on function public\.qr_resumo_dados\(date, date, boolean\) from public, anon, authenticated;/)
  assert.match(codigo, /grant execute on function public\.qr_resumo_dados\(date, date, boolean\) to service_role;/)
  assert.ok(!/grant execute on function public\.qr_resumo_dados[^;]*\b(anon|authenticated)\b/i.test(codigo))
  // Robô fora de tudo e teste só quando pedido.
  assert.match(codigo, /gente as \(\s*select \* from base where not robo/)
  assert.match(codigo, /\(v_testes or p\.tipo <> \x27teste\x27\)/)
})

test('a aba está ligada em Operação, só para quem lê dados, e a vista só chama a RPC de leitura', () => {
  const modulos = lerArquivo('painel-app/src/components/Modulos.jsx')
  assert.match(modulos, /import \{ QrCodes \} from \x27\.\/vistas\/QrCodes\x27/)
  assert.match(modulos, /\{ chave: \x27qr\x27, rotulo: \x27QR Codes\x27, mostrar: props\.pode\(\x27dado\.ler\x27\), render: \(\) => <QrCodes \{\.\.\.props\} \/> \}/)
  const vista = lerArquivo('painel-app/src/components/vistas/QrCodes.jsx')
  const chamadas = [...vista.matchAll(/rpc\(\x27([a-z_]+)\x27/g)].map((m) => m[1])
  assert.deepEqual([...new Set(chamadas)], ['get_qr_resumo'])
  assert.match(vista, /pode\(\x27dado\.ler\x27\)/)
})
