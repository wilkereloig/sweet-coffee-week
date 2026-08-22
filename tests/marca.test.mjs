/*
 * A área /marca/ é estática: o JS mora inline no HTML e NÃO passa pelo build do
 * Vite. `npm run build` fica verde com o script quebrado — a mesma armadilha que
 * já deixou uma função apagada chegar ao commit em /quero-participar.
 *
 * Aqui o vão é mais caro que no painel: esta página guarda TOKEN DE SESSÃO de
 * terceiros. Um erro aqui não estraga uma tela, estraga o acesso de uma marca.
 *
 * Rodar: node --test tests/marca.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const HTML = readFileSync(new URL('../public/marca/index.html', import.meta.url), 'utf8')
const SCRIPTS = [...HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])
const JS = SCRIPTS[0] || ''
// Só os literais de texto do script. Serve às checagens de MENSAGEM: o código
// comenta as decisões citando as frases erradas, e varrer o arquivo inteiro
// confundiria a explicação com a prática.
const TEXTOS = [...JS.matchAll(/'((?:[^'\\\n]|\\.)*)'/g)].map((m) => m[1]).join(' | ')
const MIGRATION = readFileSync(
  new URL('../supabase/migrations/20260822_contas_marcas.sql', import.meta.url), 'utf8')
const EDGE = readFileSync(
  new URL('../supabase/functions/criar-acesso-marca/index.ts', import.meta.url), 'utf8')

test('o HTML traz exatamente um bloco de script inline', () => {
  assert.equal(SCRIPTS.length, 1)
})

test('o script inline compila', () => {
  assert.doesNotThrow(() => new Function(JS))
})

test('toda função crítica está declarada, não só chamada', () => {
  const declaradas = new Set(
    [...JS.matchAll(/function\s+([A-Za-zÀ-ÿ_$][\w$]*)\s*\(/g)].map((m) => m[1]))
  const criticas = [
    'sessaoSalvar', 'sessaoLer', 'sessaoLimpar', 'renovar', 'auth', 'api',
    'ver', 'aviso', 'escapar', 'entrar', 'recuperar', 'sair', 'definirSenha',
    'carregar', 'preencher', 'desenharUnidades', 'montarUnidade', 'unidadesLer',
    'unidadeAdicionar', 'unidadeRemover', 'progresso', 'precoNumero',
    'agendarSalvar', 'salvar', 'concluir', 'reabrir', 'hashSessao', 'iniciar',
  ]
  const faltando = criticas.filter((n) => !declaradas.has(n))
  assert.deepEqual(faltando, [], 'função chamada mas nunca declarada: ' + faltando.join(', '))
})

test('nenhuma chave secreta no arquivo', () => {
  assert.ok(!/service_role/.test(HTML), 'service_role em arquivo de public/')
  assert.ok(!/\bsb_secret_|\beyJ[\w-]+\.[\w-]+\.[\w-]+/.test(HTML),
    'parece haver chave secreta ou JWT no arquivo')
  const m = HTML.match(/key:\s*'([^']+)'/)
  assert.ok(m && m[1].startsWith('sb_publishable_'), 'a chave usada não é a publicável')
})

test('a página pede para não ser indexada', () => {
  assert.match(HTML, /<meta\s+name="robots"\s+content="noindex/, 'falta o meta robots noindex')
})

/* ── Segurança da sessão ─────────────────────────────────────────────────── */

test('o token sai da barra de endereço assim que é lido', () => {
  // O link de convite chega com access_token no #hash. Deixá-lo ali o leva para
  // o histórico do navegador, para qualquer captura de tela e para o Referer.
  assert.match(JS, /history\.replaceState/,
    'o hash com o token nunca é apagado da URL')
})

test('a sessão vive em sessionStorage, não em localStorage', () => {
  // `localStorage\.` e não `localStorage`: o comentário do código explica a
  // escolha citando o nome, e um teste que lê comentário como código reprova
  // justamente quem documentou a decisão.
  assert.ok(!/localStorage\s*\./.test(JS), 'token em localStorage sobrevive ao fechar a aba')
  assert.match(JS, /sessionStorage\s*\./)
})

test('o token é renovado antes de expirar, não depois de falhar', () => {
  // Um 401 no meio do autosave custaria o texto recém-digitado.
  assert.match(JS, /expira_em\s*-\s*60000/,
    'sumiu a margem de renovação antecipada do token')
})

test('erro de login não confirma se o e-mail existe', () => {
  // Varre só os LITERAIS de texto. O comentário do código cita "e-mail não
  // encontrado" como exemplo do que não escrever — varrer o arquivo inteiro
  // acusaria a explicação em vez da mensagem.
  assert.match(TEXTOS, /E-mail ou senha não conferem/)
  assert.ok(!/(e-mail|usuário|conta)\s+não\s+(encontrad|existe|cadastrad)/i.test(TEXTOS),
    'mensagem de erro revela quais e-mails estão na base')
  assert.ok(!/senha\s+(incorreta|errada|inválida)/i.test(TEXTOS),
    'separar "senha errada" de "e-mail errado" confirma que o e-mail existe')
})

/* ── Escape ──────────────────────────────────────────────────────────────── */

test('valor vindo do banco não vai cru para innerHTML', () => {
  const trechos = JS.match(/innerHTML\s*[+]?=\s*[\s\S]{0,700}?(?=\n\s*(return|\}))/g) || []
  const suspeitos = trechos.filter((t) => /\bu\.[a-z_]+/.test(t) && !/escapar\(/.test(t))
  assert.deepEqual(suspeitos, [], 'dado do banco indo cru para innerHTML')
})

/* ── Honestidade ─────────────────────────────────────────────────────────── */

test('não afirma gravação sem o servidor confirmar', () => {
  const guarda = JS.indexOf("throw new Error('sem_confirmacao')")
  const sucesso = JS.indexOf("'Salvo automaticamente.'")
  assert.ok(guarda > -1, 'sumiu a checagem do retorno do PATCH')
  assert.ok(sucesso > guarda, '"Salvo" aparece antes de confirmar a gravação')
})

test('quem decide se o cadastro está completo é o servidor', () => {
  assert.match(JS, /rpc\/marca_concluir_cadastro/,
    'a conclusão precisa passar pela RPC — validação só no navegador some com o devtools aberto')
  assert.match(MIGRATION, /create or replace function public\.marca_concluir_cadastro/)
})

/* ── Contrato com o banco ────────────────────────────────────────────────── */

test('a página só escreve colunas que o grant de UPDATE concede', () => {
  const grant = MIGRATION.match(/grant update \(([^)]+)\)\s*\n?\s*on public\.participantes /)
  assert.ok(grant, 'sumiu o grant de coluna de participantes')
  const concedidas = new Set(grant[1].split(',').map((c) => c.trim()))
  const escritas = [...JS.matchAll(/^\s{6}([a-z_]+):\s*el\(/gm)].map((m) => m[1])
  assert.ok(escritas.length > 0, 'não achei o objeto de campos do salvar()')
  const proibidas = escritas.filter((c) => !concedidas.has(c))
  assert.deepEqual(proibidas, [],
    'a página tenta escrever coluna fora do grant: ' + proibidas.join(', '))
})

test('status_cadastro fica fora do alcance da marca', () => {
  const grant = MIGRATION.match(/grant update \(([^)]+)\)\s*\n?\s*on public\.participantes /)
  assert.ok(!/status_cadastro/.test(grant[1]),
    'com status_cadastro no grant, a marca se declara completa sem preencher nada')
})

test('preço, endereço e horário ficam na tabela apartada', () => {
  // Regra de vazamento: são os três dados que o site institucional não publica.
  ;['combo_preco', 'unidades'].forEach((campo) => {
    assert.ok(new RegExp('grant update \\([^)]*' + campo).test(MIGRATION)
      || new RegExp(campo + '[^)]*\\)\\s*on public\\.participantes_operacao').test(MIGRATION),
    campo + ' precisa estar em participantes_operacao, não em participantes')
  })
  const grantPart = MIGRATION.match(/grant update \(([^)]+)\)\s*\n?\s*on public\.participantes /)
  assert.ok(!/preco|endereco|horario/.test(grantPart[1]),
    'dado volátil vazou para a tabela publicável')
})

/* ── Ponta a ponta com a Edge Function ───────────────────────────────────── */

test('o convite aponta para a rota que existe, com barra final', () => {
  const destino = EDGE.match(/DESTINO_CONVITE\s*=\s*'([^']+)'/)
  assert.ok(destino, 'sumiu a constante do destino do convite')
  assert.ok(destino[1].endsWith('/marca/'),
    'sem a barra final a rota cai no fallback do SPA e abre a landing')
})

test('a página reconhece o tipo de link que a Edge Function gera', () => {
  const tipo = EDGE.match(/type:\s*'(\w+)'/)
  assert.ok(tipo, 'sumiu o tipo do generateLink')
  assert.ok(JS.includes("'" + tipo[1] + "'"),
    'a Edge Function gera link de tipo "' + tipo[1] + '" e a página não trata esse tipo')
})
