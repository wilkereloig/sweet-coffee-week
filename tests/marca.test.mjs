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

/* ⚠️ Asserção de AUSÊNCIA tem que ler código SEM COMENTÁRIO, e isso já custou
   três reprovas falsas em 22/08/2026: `admin_ping`, `supabase` no service
   worker e `Math.random` aqui. O padrão é sempre o mesmo — alguém escreve um
   comentário explicando por que NÃO usa X, e o teste que procura X acha a
   explicação. Quanto melhor o comentário, mais provável a cegueira ao contrário.
   Serve também para comparar duas implementações: comentário diferente não é
   código diferente. */
const semComentarios = (fonte) => fonte
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')

const EDGE_CODIGO = semComentarios(EDGE)
const JS_CODIGO = semComentarios(JS)

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

/* ⛔ Dois testes saíram daqui em 22/08/2026, junto com o modelo que guardavam:
   "o convite aponta para a rota que existe" e "a página reconhece o tipo de
   link que a Edge Function gera". Ambos aferiam o convite por e-mail —
   DESTINO_CONVITE e o `type: 'recovery'` do generateLink. O acesso passou a ser
   login pelo nome + senha gerada, entregue por WhatsApp: não há link, não há
   e-mail, e o endereço de login é sintético. Manter os dois seria exigir do
   código uma coisa que o produto deixou de fazer.
   O que substituiu está abaixo. */

test('as duas slugificações casam entre a página e a Edge Function', () => {
  // ⚠️ A ARMADILHA CENTRAL DESTE MODELO. O login é o nome do estabelecimento
  // slugificado, e a slugificação acontece em DOIS lugares: na Edge Function,
  // ao criar a conta, e aqui, ao entrar. Se divergirem, a marca digita o nome
  // certo e não entra — e como o erro de login é genérico de propósito,
  // ninguém descobre o motivo.
  // CÓDIGO, não fonte: as duas funções têm comentários diferentes, e comentário
  // diferente não é comportamento diferente.
  const daPagina = JS_CODIGO.match(/function slugificar[\s\S]*?\n  \}/)
  const daFuncao = EDGE_CODIGO.match(/function slugificar[\s\S]*?\n\}/)
  assert.ok(daPagina, 'sumiu slugificar() da página')
  assert.ok(daFuncao, 'sumiu slugificar() da Edge Function')

  // Ignora espaço, palavra de declaração e ANOTAÇÃO DE TIPO: a Edge Function é
  // TypeScript e a página é JS, então `(nome: string): string` e `(nome)` são a
  // mesma função. Tipo não é comportamento; comparar o texto cru acusaria uma
  // divergência que não existe — e um teste que reprova o correto é abandonado.
  const normal = (t) => t
    .replace(/:\s*string/g, '')
    .replace(/\s+/g, '')
    .replace(/var|const|let/g, '')
  assert.equal(normal(daPagina[0]), normal(daFuncao[0]),
    'as duas slugificações divergiram — o login gerado não vai abrir a página')

  const dom = (t) => (t.match(/DOMINIO_LOGIN\s*=\s*'([^']+)'/) || [])[1]
  assert.ok(dom(JS_CODIGO), 'sumiu DOMINIO_LOGIN da página')
  assert.equal(dom(JS_CODIGO), dom(EDGE_CODIGO), 'o domínio de login difere entre página e função')
})

test('a senha entregue morre no primeiro uso', () => {
  // Esta é a trava que torna aceitável mandar senha por WhatsApp: o que ficou
  // na conversa vale para UM login. Sem ela, é segredo permanente vazado.
  assert.match(EDGE, /deve_trocar_senha:\s*true/,
    'a Edge Function não liga a troca obrigatória — a senha do WhatsApp viraria permanente')
  assert.match(JS, /function precisaTrocarSenha\s*\(/,
    'a página não confere deve_trocar_senha: a flag seria coluna que ninguém lê')
  assert.match(JS, /marcar_senha_trocada/,
    'a página não baixa a flag depois da troca — o login seguinte voltaria a exigir')
})

test('a senha é gerada com aleatoriedade de verdade', () => {
  assert.match(EDGE, /crypto\.getRandomValues/,
    'senha gerada com Math.random não é senha, é número de série')
  assert.ok(!/Math\.random/.test(EDGE_CODIGO), 'há Math.random na geração de credenciais')
})
