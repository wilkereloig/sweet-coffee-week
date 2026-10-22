// Link de preenchimento (16/10/2026): lógica pura do painel
// (painel-app/src/lib/preenchimento.js), invariantes da página pública
// /preencher/ e do contrato do banco (supabase/migrations/20261016_link_preenchimento.sql).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import vm from 'node:vm'
import {
  linkPreenchimento, textoPreenchimento, textoPainel, painelDaMarca, entraNoLoteDeSenhas, diferencasEnvio, situacaoLink, dataCurtaBR, periodoEdicao,
  codigoCurto, codigoLongo,
} from '../painel-app/src/lib/preenchimento.js'
import { ORIGEM_PUBLICA } from '../painel-app/src/lib/origem.js'

const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const PAGINA = ler('public/preencher/index.html')
const SQL_BASE = ler('supabase/migrations/20261016_link_preenchimento.sql')
const SQL_V2 = ler('supabase/migrations/20261016_link_preenchimento_alimentar.sql')
const SQL = SQL_BASE + '\n' + SQL_V2
const CODIGO = '0123456789abcdef0123456789abcdef'

test('link leva o código no fragmento, nunca na busca, na forma curta (22 caracteres)', () => {
  const l = linkPreenchimento('https://sweetcoffeeweek.com.br/', CODIGO)
  assert.equal(l, 'https://sweetcoffeeweek.com.br/preencher/#' + codigoCurto(CODIGO))
  assert.equal(l.split('#')[1].length, 22)
  assert.equal(linkPreenchimento('https://x', null), null)
  // Código que não é de 32 hex (nunca sai do banco) passa como veio, sem inventar encurtamento.
  assert.equal(linkPreenchimento('https://x', 'abc'), 'https://x/preencher/#abc')
})

test('código curto: os mesmos 128 bits em base64url, ida e volta, igual ao Buffer do Node', () => {
  assert.equal(codigoCurto('0'.repeat(32)), 'A'.repeat(22))
  assert.equal(codigoCurto('f'.repeat(32)), '_'.repeat(21) + 'w')
  const amostras = [CODIGO, '7b95a98811b4495ca3e8179ba363f30e', '6460ade6b978420c91808375d5e53933', '0045677a45da4082b991b1336b7bb348', 'fe501efb04a846a7a7eb9f56eb6613bb']
  for (const hex of amostras) {
    const curto = codigoCurto(hex)
    assert.equal(curto, Buffer.from(hex, 'hex').toString('base64url'), 'diverge do base64url padrão: ' + hex)
    assert.match(curto, /^[A-Za-z0-9_-]{22}$/)
    assert.equal(codigoLongo(curto), hex, 'ida e volta: ' + hex)
  }
  // O longo continua valendo como está (links já enviados); maiúscula do longo não importa.
  assert.equal(codigoLongo(CODIGO.toUpperCase()), CODIGO)
})

test('o endereço das mensagens é o do site, nunca o da barra do navegador (prévia do Vercel, localhost)', () => {
  assert.equal(ORIGEM_PUBLICA, 'https://www.sweetcoffeeweek.com.br')
  const pasta = new URL('../painel-app/src/', import.meta.url)
  const achados = []
  const varrer = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const caminho = new URL(e.name + (e.isDirectory() ? '/' : ''), dir)
      if (e.isDirectory()) varrer(caminho)
      else if (/\.(jsx?|mjs)$/.test(e.name) && /window\.location\.origin/.test(readFileSync(caminho, 'utf8'))) achados.push(caminho.pathname.split('/src/')[1])
    }
  }
  varrer(pasta)
  assert.deepEqual(achados, [], 'texto para marca não pode usar window.location.origin: ' + achados.join(', '))
})

test('página: aceita o código curto (22) sem lowercase e o longo (32 hex) como sempre, e dá o mesmo código', () => {
  const m = /function codigoDoLink\(bruto\) \{[\s\S]*?\n  \}\n/.exec(SCRIPTS[0])
  assert.ok(m, 'página precisa declarar codigoDoLink(bruto)')
  const codigoDoLink = vm.runInNewContext(m[0] + ';codigoDoLink')
  for (const hex of [CODIGO, '7b95a98811b4495ca3e8179ba363f30e', 'f'.repeat(32), '0'.repeat(32)]) {
    assert.equal(codigoDoLink(hex), hex)
    assert.equal(codigoDoLink(hex.toUpperCase()), hex, 'o longo segue sem diferenciar maiúscula')
    assert.equal(codigoDoLink(codigoCurto(hex)), hex, 'curto vira o mesmo código do banco')
    assert.equal(codigoDoLink(codigoCurto(hex)), codigoLongo(codigoCurto(hex)), 'página e painel decodificam igual')
  }
  assert.equal(codigoDoLink('k=' + CODIGO.slice(0, 5)).length > 0, true) // não explode com lixo
  assert.doesNotMatch(codigoDoLink('abc'), /^[a-f0-9]{32}$/, 'lixo continua falhando na validação de 32 hex')
  assert.match(SCRIPTS[0], /var codigo = codigoDoLink\(/)
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
    // ingredientes mudou de propósito: não é mais pedido, então não aparece na diferença (19/10/2026).
    itens: [{ posicao: 1, nome: 'Bolo', descricao: 'd novo', ingredientes: 'trigo, ovos' }],
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
    'Doce · Descrição',
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

test('página: horário por seleção vira texto e volta igual', () => {
  // Roda o próprio código da página (do DIAS até antes do montarHorario) num contexto isolado.
  const js = SCRIPTS[0]
  const trecho = js.slice(js.indexOf('var DIAS'), js.indexOf('function montarHorario'))
  const ctx = { txt: (v) => (v == null ? '' : String(v)) }
  vm.runInNewContext(trecho + ';this.diasTexto=diasTexto;this.horaTexto=horaTexto;this.lerHorario=lerHorario;this.lerHorarios=lerHorarios;this.textoHorarios=textoHorarios;this.diasDeFaixas=diasDeFaixas;this.faixasDeDias=faixasDeDias;this.diaCompleto=diaCompleto;', ctx)
  assert.equal(ctx.diasTexto([0, 1, 2, 3, 4, 5, 6]), 'Todos os dias')
  assert.equal(ctx.diasTexto([1, 2, 3, 4, 5, 6]), 'Ter a Dom')
  assert.equal(ctx.diasTexto([0, 2, 4]), 'Seg, Qua, Sex')
  assert.equal(ctx.horaTexto('14:30') + ' · ' + ctx.horaTexto('9:00') + ' · ' + ctx.horaTexto('1:30'), '14h30 · 9h · 1h30')
  // Cada faixa lida volta idêntica: dias, períodos (até dois) e "fechado".
  for (const t of ['Todos os dias, 14h às 21h', 'Ter a Dom, 10h às 22h30', 'Seg, Qua, Sex, 9h às 18h', 'Sáb e Dom, 8h às 0h',
    'Seg a Sex, 11h às 14h e 18h às 22h', 'Dom, fechado', 'Seg a Sáb, 17h às 2h']) {
    const l = ctx.lerHorario(t)
    assert.ok(l, 'não leu: ' + t)
    const volta = ctx.textoHorarios([l])
    assert.equal(volta, t)
  }
  assert.equal(ctx.lerHorario('de terça a domingo, a partir das 14'), null, 'texto livre antigo fica como "Hoje está"')
  assert.equal(ctx.lerHorario('Seg a Sex, 9h15 às 18h'), null, 'hora fora da lista de seleção não é lida pela metade')
  // Horário diferente por dia: faixas separadas por ";", inclusive um dia que não abre.
  const multi = 'Seg a Sex, 12h às 21h; Sáb, 10h às 22h30; Dom, fechado'
  const faixas = ctx.lerHorarios(multi)
  assert.equal(faixas.length, 3)
  assert.equal(ctx.textoHorarios(faixas), multi)
  assert.equal(ctx.lerHorarios('Seg a Sex, 12h às 21h; qualquer coisa'), null)
  assert.equal(ctx.lerHorarios('Seg a Qua, 12h às 21h; Qua a Dom, 10h às 18h'), null, 'dia repetido em duas faixas não é lido')
})

test('página: uma resposta por dia vira faixas juntando os dias iguais', () => {
  const js = SCRIPTS[0]
  const trecho = js.slice(js.indexOf('var DIAS'), js.indexOf('function montarHorario'))
  const ctx = { txt: (v) => (v == null ? '' : String(v)) }
  vm.runInNewContext(trecho + ';this.diasDeFaixas=diasDeFaixas;this.faixasDeDias=faixasDeDias;this.textoHorarios=textoHorarios;this.lerHorarios=lerHorarios;this.diaCompleto=diaCompleto;', ctx)
  const util = [['10:00', '22:00']]
  const dias = [util, util, util, util, util, [['10:00', '18:00']], 'F']
  assert.equal(ctx.textoHorarios(ctx.faixasDeDias(dias)), 'Seg a Sex, 10h às 22h; Sáb, 10h às 18h; Dom, fechado')
  assert.equal(ctx.textoHorarios(ctx.faixasDeDias(Array(7).fill(util))), 'Todos os dias, 10h às 22h')
  // Texto antigo só com a semana: sábado e domingo ficam SEM resposta (a marca precisa decidir).
  const so = ctx.diasDeFaixas(ctx.lerHorarios('Seg a Sex, 12h às 21h'))
  assert.deepEqual([so[4] !== null, so[5], so[6]], [true, null, null])
  // Completo = fechado ou todo período com abre, fecha e abre ≠ fecha.
  assert.ok(ctx.diaCompleto('F'))
  assert.ok(ctx.diaCompleto(util))
  assert.ok(!ctx.diaCompleto(null))
  assert.ok(!ctx.diaCompleto([['10:00', '']]))
  assert.ok(!ctx.diaCompleto([['10:00', '10:00']]))
  assert.ok(!ctx.diaCompleto([['10:00', '14:00'], ['', '']]))
})

test('página: horário nunca passa do limite do banco e a loja pode ser "igual ao combo"', () => {
  assert.match(PAGINA, /data-pergunta="horario_combo" data-max="300"/)
  assert.match(PAGINA, /data-pergunta="horario_loja" data-max="200"/)
  // O banco corta em silêncio no limite; por isso a página recusa texto maior em vez de mandá-lo.
  assert.match(SQL, /preenchimento_texto\(un, 'horario_loja', 200\)/)
  assert.match(SQL, /preenchimento_texto\(un, 'horario_combo', 300\)/)
  assert.match(SCRIPTS[0], /texto\.length > max/)
  assert.match(SCRIPTS[0], /igual\.value === 'sim'\) x\.horario_loja = x\.horario_combo/)
})

test('página: máscaras e conferência de formato', () => {
  const js = SCRIPTS[0]
  const trecho = js.slice(js.indexOf('function digitos'), js.indexOf('// O que falta'))
  const ctx = {}
  vm.runInNewContext(trecho + ';this.mascaraTel=mascaraTel;this.mascaraCep=mascaraCep;this.mascaraCnpj=mascaraCnpj;this.telefoneOk=telefoneOk;this.emailOk=emailOk;this.instagramLimpo=instagramLimpo;', ctx)
  assert.equal(ctx.mascaraTel('84999990000'), '(84) 99999-0000')
  assert.equal(ctx.mascaraTel('+55 84 3222-1000'), '(84) 3222-1000')
  assert.equal(ctx.mascaraTel('8'), '(8')
  assert.equal(ctx.mascaraCep('59090000'), '59090-000')
  assert.equal(ctx.mascaraCnpj('12345678000190'), '12.345.678/0001-90')
  assert.ok(ctx.telefoneOk('(84) 99999-0000') && ctx.telefoneOk('+55 (84) 3222-1000'))
  assert.ok(!ctx.telefoneOk('99999-0000') && !ctx.telefoneOk('(84) 9999'))
  assert.ok(ctx.emailOk('a@b.co') && !ctx.emailOk('a@b') && !ctx.emailOk('a b@c.com'))
  assert.equal(ctx.instagramLimpo('https://www.instagram.com/minhamarca/?igsh=abc'), '@minhamarca')
  assert.equal(ctx.instagramLimpo(' @@minhamarca '), '@minhamarca')
  assert.equal(ctx.instagramLimpo(''), '')
})

test('página: duas vozes da família (Slab no título, Nexa na interface, Nexa Text na leitura)', () => {
  const css = PAGINA.slice(PAGINA.indexOf('<style>'), PAGINA.indexOf('</style>')).replace(/@font-face\{[^}]*\}/g, '')
  assert.match(css, /--f-ui:'nexa','Nexa Slab'/)
  assert.match(css, /--f-texto:'nexa-text','Nexa Slab'/)
  assert.match(css, /body\{[^}]*font-family:var\(--f-texto\)[^}]*font-weight:400[^}]*font-synthesis:none/)
  assert.match(css, /h1,h2,h3\{font-family:var\(--f-slab\)/)
  // O kit não tem 500 nem 800 na sem serifa: 800 só nos títulos (Slab), nenhum 500.
  assert.doesNotMatch(css, /font-weight:500/)
  const com800 = [...css.matchAll(/([^{}]+)\{[^}]*font-weight:800[^}]*\}/g)].map((m) => m[1].trim())
  assert.deepEqual(com800.filter((x) => x !== 'h1,h2,h3'), [], '800 só nos títulos')
  // Rótulo, botão e opção são Nexa; campo e parágrafo, Nexa Text.
  for (const sel of ['.campo>span', '.pergunta>span', '.opcao', '.btn', '.marcar']) {
    const regra = css.match(new RegExp('(?:^|\n|\})\s*' + sel.replace(/[.>]/g, '\$&') + '\{[^}]*\}'))
    assert.ok(regra && /font-family:var\(--f-ui\)/.test(regra[0]), sel + ' em Nexa (interface)')
  }
  // O kit carrega só pelo JS (o .css responde 412) e dentro do único script da página.
  assert.doesNotMatch(PAGINA, /ngx4uek\.css/)
  assert.match(SCRIPTS[0], /use\.typekit\.net\/ngx4uek\.js/)
})

test('página: alergênicos e características da página são os do banco', () => {
  const aspectos = [...PAGINA.matchAll(/data-(?:alergenico|traco|carac)="([a-z_]+)"/g)].map((m) => m[1])
  for (const a of new Set(aspectos)) assert.ok(SQL_V2.includes("'" + a + "'"), 'aspecto sem par no banco: ' + a)
  assert.equal(new Set([...PAGINA.matchAll(/data-alergenico="([a-z_]+)"/g)].map((m) => m[1])).size, 8)
  // Selos marcam só o valor positivo; desmarcar não vira "não" sozinho.
  assert.match(SCRIPTS[0], /c\.dataset\.antes === c\.dataset\.valor\) it\.alimentar\[c\.dataset\.carac\] = 'nao_informado'/)
})

test('diferença: alimentar e troca, com ausente = sem resposta', () => {
  const atual = { itens: [{ posicao: 1, nome: 'Bolo', alimentar: { gluten: 'contem' }, tem_troca: false, troca: null }] }
  const enviado = { itens: [{ posicao: 1, nome: 'Bolo', alimentar: { gluten: 'contem', leite: 'nao_contem', vegano: 'sim' }, tem_troca: true, troca: { original: 'Bolo', alternativa: 'Bolo sem glúten', disponibilidade: 'sob_consulta' } }] }
  const d = diferencasEnvio(atual, enviado).map((x) => x.grupo + ' · ' + x.campo + ': ' + x.de + ' → ' + x.para)
  assert.deepEqual(d, [
    'Doce · Leite: Sem resposta → Não contém',
    'Doce · Vegano: Sem resposta → Sim',
    'Doce · Tem troca: Não → Sim',
    'Doce · troca · Troca o quê:  → Bolo',
    'Doce · troca · Por o quê:  → Bolo sem glúten',
    'Doce · troca · Disponível:  → Sob consulta',
  ])
})

/* ── Contrato do banco ────────────────────────────────────────────────────── */
test('banco: tabelas fechadas, só as funções abertas para anon', () => {
  assert.match(SQL, /revoke all on public\.preenchimento_links, public\.preenchimento_envios from public, anon, authenticated/)
  assert.match(SQL, /alter table public\.preenchimento_links enable row level security/)
  for (const f of ['preenchimento_estado', 'preenchimento_link_valido', 'preenchimento_novo_link', 'preenchimento_texto', 'preenchimento_edicao']) {
    assert.match(SQL, new RegExp('revoke all on function public\\.' + f + '\\([^)]*\\) from public, anon, authenticated'), f + ' não pode ser chamada de fora')
  }
})

test('troca não tem custo: a página não pergunta e o banco grava 0', () => {
  assert.doesNotMatch(PAGINA, /acrescimo/)
  assert.match(SQL_V2, /acrescimo = 0/)
})

test('banco: envio não grava cadastro; aplicar exige cadastro.editar', () => {
  const enviar = SQL.slice(SQL.indexOf('function public.preenchimento_enviar'), SQL.indexOf('function public.preenchimento_novo_link'))
  assert.doesNotMatch(enviar, /org_salvar_|update public\.(participantes|participacoes|unidades|participacao_unidades)/)
  const decidir = SQL.slice(SQL.indexOf('function public.org_preenchimento_decidir'))
  assert.match(decidir, /pode\(p_secret, 'cadastro\.editar'\)/)
  assert.match(decidir, /envio_ja_revisado/)
  assert.doesNotMatch(decidir, /'nome_marca'/, 'nome da marca é login: o link não muda')
})

/* ── Painel SCW no fim da mensagem e da página (19/10/2026) ─────────────────── */
const ORIGEM = 'https://www.sweetcoffeeweek.com.br'
const MSG = { marca: 'Parma Doces', responsavel: 'Ana Souza', link: ORIGEM + '/preencher/#abc', edicao: { tema: 'CARTOON', prazo: '2026-10-24' } }

test('painel: a mensagem fecha com a explicação, o link e as credenciais que a marca tem', () => {
  const novo = textoPreenchimento({ ...MSG, painel: painelDaMarca({ origem: ORIGEM, slug: 'parmadoces', acesso: { user_id: 'u', senha_trocada_em: null }, cred: { login: 'parmadoces', senha: 'AbC-123' } }) })
  assert.ok(novo.includes('centro de comunicação com a organização'))
  assert.ok(novo.includes('arquivos') && novo.includes('fotos do seu combo') && novo.includes('formulários') && novo.includes('atualiza seus dados'))
  assert.ok(novo.includes('Acesse: ' + ORIGEM + '/painel/'))
  assert.ok(novo.includes('Usuário: parmadoces') && novo.includes('Senha temporária: AbC-123'))
  assert.ok(novo.indexOf('Painel SCW') > novo.indexOf('Aqui é da organização') && novo.indexOf('Painel SCW') < novo.indexOf('A edição Cartoon'), 'o painel vem no topo, logo depois da saudação')
  assert.ok(novo.includes('o painel pede para você criar a sua senha'))
  // sem painel a mensagem é a de antes
  assert.ok(!textoPreenchimento(MSG).includes('Painel SCW'))
})

test('painel: senha só aparece se estiver na mão — nunca inventada nem repetida', () => {
  const enviada = textoPainel(painelDaMarca({ origem: ORIGEM, slug: 'parmadoces', acesso: { user_id: 'u', senha_trocada_em: null } }))
  assert.ok(enviada.includes('Usuário: parmadoces') && enviada.includes('a que enviamos na mensagem do seu acesso'))
  assert.ok(!/Senha temporária: [A-Za-z0-9]{6,}/.test(enviada))
  const definida = textoPainel(painelDaMarca({ origem: ORIGEM, slug: 'caffebasilicos', acesso: { user_id: 'u', senha_trocada_em: '2026-10-01' } }))
  assert.ok(definida.includes('a que você criou no primeiro acesso') && !definida.includes('Senha temporária'))
  const sem = textoPainel(painelDaMarca({ origem: ORIGEM, slug: null, acesso: { user_id: null } }))
  assert.ok(sem.includes('chegam em seguida') && !sem.includes('Usuário:'))
  const naoLeu = textoPainel(painelDaMarca({ origem: ORIGEM, slug: 'x', acesso: undefined }))
  assert.ok(naoLeu.includes('Acesse: ') && !naoLeu.includes('Usuário:'), 'sem ler os acessos, só a explicação e o link')
  assert.equal(textoPainel(null), '')
})

test('página pública: aviso do painel no topo, sem usuário nem senha (a página abre só com o código do link)', () => {
  const secao = PAGINA.slice(PAGINA.indexOf('id="pr-painel"'), PAGINA.indexOf('</section>', PAGINA.indexOf('id="pr-painel"')))
  assert.ok(secao.includes('centro de comunicação com a organização') && secao.includes('href="/painel/"'))
  assert.ok(!/senha\s*[:=]|usuário\s*:/i.test(secao), 'nenhuma credencial na página')
  assert.ok(PAGINA.indexOf('id="pr-painel"') < PAGINA.indexOf('id="pr-estado"'), 'fica NO TOPO, antes do estado e do formulário (visível também após o envio)')
  assert.ok(PAGINA.indexOf('<main>') < PAGINA.indexOf('id="pr-painel"'))
})

test('lote de senhas: toda marca ativa com link; nunca acesso pausado, encerrada, sem link ou recém-gerada', () => {
  const m = { codigo: 'c', status_cadastro: 'aguardando_cadastro' }
  assert.equal(entraNoLoteDeSenhas({ marca: m, acesso: { user_id: null, status: 'nao_criado' } }), true, 'sem conta: cria')
  assert.equal(entraNoLoteDeSenhas({ marca: m, acesso: { user_id: 'u', senha_trocada_em: null, status: 'aguardando_primeiro_acesso' } }), true, 'temporária ainda valendo: gera outra')
  assert.equal(entraNoLoteDeSenhas({ marca: m, acesso: { user_id: 'u', senha_trocada_em: '2026-10-01', status: 'ativo' } }), true, 'inclui até quem já trocou (pedido do Wilker: contas de teste)')
  assert.equal(entraNoLoteDeSenhas({ marca: m, acesso: { user_id: 'u', senha_trocada_em: null, status: 'bloqueado' } }), false)
  assert.equal(entraNoLoteDeSenhas({ marca: m, acesso: { user_id: 'u', senha_trocada_em: null, status: 'desativado' } }), false)
  assert.equal(entraNoLoteDeSenhas({ marca: m, acesso: { user_id: 'u', senha_trocada_em: null }, cred: { senha: 'x' } }), false, 'acabou de ganhar senha: não gerar de novo')
  assert.equal(entraNoLoteDeSenhas({ marca: { ...m, status_cadastro: 'encerrado' }, acesso: { user_id: null } }), false)
  assert.equal(entraNoLoteDeSenhas({ marca: { ...m, codigo: null }, acesso: { user_id: null } }), false, 'sem link não há mensagem para levar a senha')
  assert.equal(entraNoLoteDeSenhas({ marca: m, acesso: null }), false, 'acesso não lido: não mexe em conta nenhuma')
})

test('gerar senhas: as mensagens ficam À VISTA numa folha com "Copiar tudo" (a cópia automática depois de ~1 min falhava calada)', () => {
  const jsx = ler('painel-app/src/components/vistas/Preenchimento.jsx')
  assert.match(jsx, /setLote\(\{ texto, n: ok\.length/)
  assert.match(jsx, /<Folha aberto titulo=\{lote\.n/)
  assert.match(jsx, /<textarea readOnly[^>]*value=\{lote\.texto\}/)
  assert.match(jsx, /Copiar tudo/)
  assert.match(jsx, /Fechar sem copiar\?/, 'fechar sem copiar pergunta: a senha não volta')
})
