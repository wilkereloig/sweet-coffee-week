// Link de preenchimento (16/10/2026): lógica pura do painel
// (painel-app/src/lib/preenchimento.js), invariantes da página pública
// /preencher/ e do contrato do banco (supabase/migrations/20261016_link_preenchimento.sql).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import {
  linkPreenchimento, textoPreenchimento, diferencasEnvio, situacaoLink, dataCurtaBR, periodoEdicao,
} from '../painel-app/src/lib/preenchimento.js'

const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const PAGINA = ler('public/preencher/index.html')
const SQL = ler('supabase/migrations/20261016_link_preenchimento.sql')
const CODIGO = '0123456789abcdef0123456789abcdef'

test('link leva o código no fragmento, nunca na busca', () => {
  assert.equal(linkPreenchimento('https://sweetcoffeeweek.com.br/', CODIGO), 'https://sweetcoffeeweek.com.br/preencher/#' + CODIGO)
  assert.equal(linkPreenchimento('https://x', null), null)
})

test('datas e período em português, sem fuso', () => {
  assert.equal(dataCurtaBR('2026-10-24'), '24/10')
  assert.equal(periodoEdicao('2026-11-05', '2026-11-15'), '5 a 15 de novembro')
  assert.equal(periodoEdicao('2026-10-30', '2026-11-02'), '30 de outubro a 2 de novembro')
  assert.equal(periodoEdicao(null, '2026-11-15'), '')
})

test('mensagem do WhatsApp: nome, link, obrigatório, urgente e prazo', () => {
  const t = textoPreenchimento({
    marca: 'Cookitos', responsavel: 'Virgínia Fernandes', link: 'https://x/preencher/#' + CODIGO,
    edicao: { tema: 'CARTOON', inicio: '2026-11-05', fim: '2026-11-15', prazo: '2026-10-24' },
  })
  assert.match(t, /^Olá, Virgínia!/)
  assert.match(t, /Sweet & Coffee Week/)
  assert.match(t, /edição Cartoon acontece de 5 a 15 de novembro/)
  assert.ok(t.includes('https://x/preencher/#' + CODIGO))
  assert.match(t, /obrigatório e urgente: precisa ser feito até 24\/10/)
  assert.doesNotMatch(t, /\bSweet\b(?! &)/, 'nunca "Sweet" sozinho (§8.1)')
  // Sem prazo cadastrado a frase não inventa data.
  const sem = textoPreenchimento({ marca: 'X', responsavel: '', link: 'L', edicao: {} })
  assert.match(sem, /^Olá! /)
  assert.match(sem, /obrigatório e urgente\. Sem ele/)
})

const ATUAL = {
  marca: { responsavel: 'Ana', telefone: '84999990000', email: null, instagram: '@a', site: null, cnpj: '1', razao_social: null },
  combo: { tema_combo: 'Pica-Pau', tema_justificativa: 'x', combo_nome: null, combo_descricao: null, combo_para_viagem: true, custo_embalagem: 2.5, custo_delivery: null },
  itens: [{ posicao: 1, nome: 'Bolo', descricao: 'd', ingredientes: 'trigo' }, { posicao: 2, nome: null }, { posicao: 3, nome: null }],
  unidades: [{ id: 'u1', logradouro: 'Rua A', numero: '10', bairro: 'Tirol', cep: '59000000', whatsapp: '84999990000', whatsapp_autorizado: false, consumo_local: 'nao_informado' }],
}

test('diferença: só o que muda, com máscara e dinheiro normalizados', () => {
  const enviado = {
    marca: { responsavel: 'Ana', telefone: '+55 (84) 99999-0000', instagram: '@a', email: 'a@b.c' },
    combo: { tema_combo: 'Pica-Pau', combo_para_viagem: true, custo_embalagem: '2,50', combo_nome: 'Combo do Pica' },
    itens: [{ posicao: 1, nome: 'Bolo', descricao: 'd', ingredientes: 'trigo, ovos' }],
    unidades: [
      { id: 'u1', logradouro: 'Rua A', numero: '10', bairro: 'Tirol', cep: '59000-000', whatsapp: '(84) 99999-0000', whatsapp_autorizado: false, consumo_local: 'sim' },
      { id: null, logradouro: 'Av. B', numero: '5', consumo_local: 'nao' },
      { id: null, logradouro: '' },
    ],
  }
  const d = diferencasEnvio(ATUAL, enviado)
  const campos = d.map((x) => x.grupo + ' · ' + x.campo)
  assert.deepEqual(campos, [
    'Responsável e contato · E-mail',
    'Tema e combo · Nome do combo',
    'Doce · Ingredientes',
    'Loja Tirol · Consumo no local',
    'Loja nova · Rua / avenida', 'Loja nova · Número', 'Loja nova · Consumo no local',
  ])
  assert.deepEqual(d.find((x) => x.campo === 'Consumo no local' && x.grupo === 'Loja Tirol'), { grupo: 'Loja Tirol', campo: 'Consumo no local', de: '', para: 'Sim' })
})

test('diferença: loja removida e envio que só confirma', () => {
  assert.deepEqual(diferencasEnvio(ATUAL, { unidades: [{ id: 'u1', remover: true }] }),
    [{ grupo: 'Loja Tirol', campo: 'Participação', de: 'Participa', para: 'Não participa mais' }])
  assert.deepEqual(diferencasEnvio(ATUAL, { marca: { responsavel: ' Ana ' }, confirmados: ['marca'] }), [])
  assert.deepEqual(diferencasEnvio(ATUAL, {}), [])
})

test('situação do link', () => {
  assert.equal(situacaoLink(null).texto, 'Link não gerado')
  assert.equal(situacaoLink({ codigo: CODIGO }).texto, 'Ainda não abriu')
  assert.equal(situacaoLink({ codigo: CODIGO, aberto_em: 'x' }).texto, 'Aberto, não enviado')
  assert.equal(situacaoLink({ codigo: CODIGO, aberto_em: 'x', enviado_em: 'y' }, 1).tom, 'atencao')
  assert.equal(situacaoLink({ codigo: CODIGO, enviado_em: 'y' }, 0).texto, 'Enviado e revisado')
})

/* ── Página pública ───────────────────────────────────────────────────────── */
const SCRIPTS = [...PAGINA.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])

test('página: um script só, que compila', () => {
  assert.equal(SCRIPTS.length, 1)
  assert.doesNotThrow(() => new vm.Script(SCRIPTS[0]))
})

test('página: só a chave publicável e só as duas funções abertas', () => {
  assert.match(PAGINA, /sb_publishable_/)
  assert.doesNotMatch(PAGINA, /service_role|sb_secret_/)
  const funcoes = [...SCRIPTS[0].matchAll(/rpc\('([a-z_]+)'/g)].map((m) => m[1])
  assert.deepEqual([...new Set(funcoes)].sort(), ['preenchimento_enviar', 'preenchimento_ler'])
})

test('página: dado do banco nunca vira HTML', () => {
  assert.doesNotMatch(SCRIPTS[0], /innerHTML|outerHTML|insertAdjacentHTML|document\.write/)
})

test('página: código vem do fragmento, e a página não indexa nem vaza Referer', () => {
  assert.match(SCRIPTS[0], /location\.hash/)
  assert.doesNotMatch(SCRIPTS[0], /location\.search|URLSearchParams/)
  assert.match(PAGINA, /name="robots" content="noindex/)
  assert.match(PAGINA, /name="referrer" content="no-referrer"/)
})

test('página: toda função chamada está declarada', () => {
  const declaradas = new Set([...SCRIPTS[0].matchAll(/function\s+([a-zA-Z_]\w*)/g)].map((m) => m[1]))
  const chamadas = [...SCRIPTS[0].matchAll(/(?<![.\w])([a-z][a-zA-Z_]\w*)\(/g)].map((m) => m[1])
  const nativas = new Set(['function', 'if', 'for', 'while', 'switch', 'catch', 'return', 'fetch', 'isNaN', 'Number', 'String', 'encodeURIComponent', 'await', 'typeof'])
  for (const n of chamadas) if (!nativas.has(n)) assert.ok(declaradas.has(n), 'função chamada e não declarada: ' + n)
})

test('página: campos que o envio manda são os que o banco aplica', () => {
  // As chaves de marca/combo do formulário existem na lista branca da aplicação.
  const nomes = [...PAGINA.matchAll(/name="(marca|combo)\.([a-z_]+)"/g)].map((m) => m[2])
  for (const k of nomes) assert.ok(SQL.includes("'" + k + "'"), 'campo do formulário sem par no banco: ' + k)
  const unidade = [...PAGINA.matchAll(/data-k="([a-z_]+)"/g)].map((m) => m[1])
  for (const k of unidade) assert.ok(SQL.includes("'" + k + "'"), 'campo de item/loja sem par no banco: ' + k)
})

/* ── Contrato do banco ────────────────────────────────────────────────────── */
test('banco: tabelas fechadas, só as funções abertas para anon', () => {
  assert.match(SQL, /revoke all on public\.preenchimento_links, public\.preenchimento_envios from public, anon, authenticated/)
  assert.match(SQL, /alter table public\.preenchimento_links enable row level security/)
  for (const f of ['preenchimento_estado', 'preenchimento_link_valido', 'preenchimento_novo_link', 'preenchimento_texto', 'preenchimento_edicao']) {
    assert.match(SQL, new RegExp('revoke all on function public\\.' + f + '\\([^)]*\\) from public, anon, authenticated'), f + ' não pode ser chamada de fora')
  }
})

test('banco: envio não grava cadastro; aplicar exige cadastro.editar', () => {
  const enviar = SQL.slice(SQL.indexOf('function public.preenchimento_enviar'), SQL.indexOf('function public.preenchimento_novo_link'))
  assert.doesNotMatch(enviar, /org_salvar_|update public\.(participantes|participacoes|unidades|participacao_unidades)/)
  const decidir = SQL.slice(SQL.indexOf('function public.org_preenchimento_decidir'))
  assert.match(decidir, /pode\(p_secret, 'cadastro\.editar'\)/)
  assert.match(decidir, /envio_ja_revisado/)
  assert.doesNotMatch(decidir, /'nome_marca'/, 'nome da marca é login: o link não muda')
})
