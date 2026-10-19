// Link de preenchimento (16/10/2026): lógica pura do painel
// (painel-app/src/lib/preenchimento.js), invariantes da página pública
// /preencher/ e do contrato do banco (supabase/migrations/20261016_link_preenchimento.sql).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import {
  linkPreenchimento, textoPreenchimento, textoPainel, painelDaMarca, entraNoLoteDeSenhas, diferencasEnvio, situacaoLink, dataCurtaBR, periodoEdicao,
} from '../painel-app/src/lib/preenchimento.js'

const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const PAGINA = ler('public/preencher/index.html')
const SQL_BASE = ler('supabase/migrations/20261016_link_preenchimento.sql')
const SQL_V2 = ler('supabase/migrations/20261016_link_preenchimento_alimentar.sql')
const SQL = SQL_BASE + '\n' + SQL_V2
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
  vm.runInNewContext(trecho + ';this.diasTexto=diasTexto;this.horaTexto=horaTexto;this.lerHorario=lerHorario;this.lerHorarios=lerHorarios;this.textoHorarios=textoHorarios;', ctx)
  assert.equal(ctx.diasTexto([0, 1, 2, 3, 4, 5, 6]), 'Todos os dias')
  assert.equal(ctx.diasTexto([1, 2, 3, 4, 5, 6]), 'Ter a Dom')
  assert.equal(ctx.diasTexto([0, 2, 4]), 'Seg, Qua, Sex')
  assert.equal(ctx.horaTexto('14:30') + ' · ' + ctx.horaTexto('9:00'), '14h30 · 9h')
  for (const t of ['Todos os dias, 14h às 21h', 'Ter a Dom, 10h às 22h30', 'Seg, Qua, Sex, 9h às 18h', 'Sáb e Dom, 8h às 0h']) {
    const l = ctx.lerHorario(t)
    assert.ok(l, 'não leu: ' + t)
    assert.equal(ctx.diasTexto(l.dias) + ', ' + ctx.horaTexto(l.abre) + ' às ' + ctx.horaTexto(l.fecha), t)
  }
  assert.equal(ctx.lerHorario('de terça a domingo, a partir das 14'), null, 'texto livre antigo fica como "Hoje está"')
  // Horário diferente por dia: faixas separadas por ";".
  const multi = 'Seg a Sex, 12h às 21h; Sáb e Dom, 10h às 22h30'
  const faixas = ctx.lerHorarios(multi)
  assert.equal(faixas.length, 2)
  assert.equal(ctx.textoHorarios(faixas), multi)
  assert.equal(ctx.lerHorarios('Seg a Sex, 12h às 21h; qualquer coisa'), null)
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
  assert.ok(novo.indexOf('Painel SCW') > novo.indexOf('obrigatório e urgente'), 'o painel vem no final, depois do prazo')
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

test('página pública: aviso do painel no fim, sem usuário nem senha (a página abre só com o código do link)', () => {
  const secao = PAGINA.slice(PAGINA.indexOf('id="pr-painel"'), PAGINA.indexOf('</main>'))
  assert.ok(secao.includes('centro de comunicação com a organização') && secao.includes('href="/painel/"'))
  assert.ok(!/senha\s*[:=]|usuário\s*:/i.test(secao), 'nenhuma credencial na página')
  assert.ok(PAGINA.indexOf('id="pr-painel"') > PAGINA.indexOf('</form>'), 'fica depois do formulário, também visível após o envio')
  const html = PAGINA.slice(0, PAGINA.indexOf('<script'))
  assert.ok(html.indexOf('id="pr-painel"') > html.indexOf('id="pr-conteudo"') && html.indexOf('id="pr-painel"') < html.indexOf('</main>'))
})

test('lote de senhas: só quem ainda tem a temporária (ou não tem conta); nunca quem trocou, pausado, encerrado ou recém-gerado', () => {
  const m = { codigo: 'c', status_cadastro: 'aguardando_cadastro' }
  assert.equal(entraNoLoteDeSenhas({ marca: m, acesso: { user_id: null, status: 'nao_criado' } }), true, 'sem conta: cria')
  assert.equal(entraNoLoteDeSenhas({ marca: m, acesso: { user_id: 'u', senha_trocada_em: null, status: 'aguardando_primeiro_acesso' } }), true, 'temporária ainda valendo: gera outra')
  assert.equal(entraNoLoteDeSenhas({ marca: m, acesso: { user_id: 'u', senha_trocada_em: '2026-10-01', status: 'ativo' } }), false, 'já definiu a própria senha')
  assert.equal(entraNoLoteDeSenhas({ marca: m, acesso: { user_id: 'u', senha_trocada_em: null, status: 'bloqueado' } }), false)
  assert.equal(entraNoLoteDeSenhas({ marca: m, acesso: { user_id: 'u', senha_trocada_em: null, status: 'desativado' } }), false)
  assert.equal(entraNoLoteDeSenhas({ marca: m, acesso: { user_id: 'u', senha_trocada_em: null }, cred: { senha: 'x' } }), false, 'acabou de ganhar senha: não gerar de novo')
  assert.equal(entraNoLoteDeSenhas({ marca: { ...m, status_cadastro: 'encerrado' }, acesso: { user_id: null } }), false)
  assert.equal(entraNoLoteDeSenhas({ marca: { ...m, codigo: null }, acesso: { user_id: null } }), false, 'sem link não há mensagem para levar a senha')
  assert.equal(entraNoLoteDeSenhas({ marca: m, acesso: null }), false, 'acesso não lido: não mexe em conta nenhuma')
})
