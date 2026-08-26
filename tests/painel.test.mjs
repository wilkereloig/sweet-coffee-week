/*
 * O painel unificado (/painel/) é estático, como /organizacao/ e /marca/ que
 * ele substitui: o JS mora inline no HTML e NÃO passa pelo build do Vite.
 * `npm run build` fica verde com o script quebrado — a mesma armadilha que já
 * derrubou os dois painéis antigos. Estas checagens espelham as de
 * tests/organizacao.test.mjs e tests/marca.test.mjs, adaptadas pro arquivo
 * único: duas IIFEs (PainelOrg, PainelMarca) dentro do mesmo bloco de script,
 * cada uma com o código real dos dois painéis, mais o login e o boot
 * compartilhados, que são o único código novo.
 *
 * Rodar: node --test tests/painel.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const HTML = readFileSync(new URL('../public/painel/index.html', import.meta.url), 'utf8')
const SCRIPTS = [...HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])
const JS = SCRIPTS[0] || ''

const ORG_HTML = readFileSync(new URL('../public/organizacao/index.html', import.meta.url), 'utf8')
const ORG_JS = [...ORG_HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])[0] || ''
const MARCA_HTML = readFileSync(new URL('../public/marca/index.html', import.meta.url), 'utf8')
const MARCA_JS = [...MARCA_HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])[0] || ''

const DESTINOS_ORG = JSON.parse(
  (JS.match(/const DESTINOS = (\[[^\]]+\])/) || [, '[]'])[1].replace(/'/g, '"'))
const DESTINOS_MARCA = JSON.parse(
  (JS.match(/var DESTINOS_MARCA = (\[[^\]]+\])/) || [, '[]'])[1].replace(/'/g, '"'))

test('o HTML traz exatamente um bloco de script inline', () => {
  assert.equal(SCRIPTS.length, 1)
})

test('o script inline compila', () => {
  assert.doesNotThrow(() => new Function(JS))
})

test('nenhuma chave secreta no arquivo', () => {
  assert.ok(!/service_role/.test(HTML), 'service_role em arquivo de public/')
  assert.ok(!/\bsb_secret_|\beyJ[\w-]+\.[\w-]+\.[\w-]+/.test(HTML), 'parece haver chave secreta ou JWT no arquivo')
  const m = HTML.match(/SUPABASE_KEY\s*=\s*'([^']*)'/)
  assert.ok(m && m[1].startsWith('sb_publishable_'), 'a chave da organização usada não é a publicável')
  const k = HTML.match(/key:\s*'([^']*)'/)
  assert.ok(k && k[1].startsWith('sb_publishable_'), 'a chave da marca usada não é a publicável')
})

test('a página pede para não ser indexada', () => {
  assert.match(HTML, /<meta\s+name="robots"\s+content="noindex/, 'falta o meta robots noindex')
})

test('PainelOrg e PainelMarca são expostos pro boot compartilhado decidir', () => {
  assert.match(JS, /window\.PainelOrg\s*=\s*\{/, 'PainelOrg não foi exposto')
  assert.match(JS, /window\.PainelMarca\s*=\s*\{/, 'PainelMarca não foi exposto')
  assert.match(JS, /window\.PainelOrg\.temSessao\(\)/, 'a marca não checa a sessão da organização antes de abrir o login')
})

test('toda função crítica da organização continua declarada dentro de PainelOrg', () => {
  // As mesmas críticas de tests/organizacao.test.mjs — o código foi movido
  // pra cá, não reescrito, e o teste de origem continua cobrindo o arquivo
  // antigo. Aqui a checagem é: a mudança não apagou nada no caminho.
  const declaradas = new Set(
    [...JS.matchAll(/(?:function\s+|const\s+|let\s+)([A-Za-z_$][\w$]*)/g)].map((m) => m[1]))
  const criticas = ['rpc', 'carregar', 'render', 'filtrados', 'todos', 'campo', 'escapar',
                    'abrirDetalhe', 'fecharDetalhe', 'salvar', 'montarAbas', 'montarForms',
                    'montarFiltroStatus', 'mostrarEstado', 'abrirPainel', 'dataCurta', 'soDigitos',
                    'irPara', 'montarAbasApp', 'ligarTecladoAbas', 'montarEsqueleto',
                    'abrirFolha', 'avisoEm', 'isoDoCampo', 'opcoesMarcas', 'preco',
                    'prazoSelo', 'dataHoraCurta', 'estadoSimples', 'nomeSeguro',
                    'carregarProducao', 'carregarEquipe', 'renderProducao', 'renderEquipe',
                    'abrirFicha', 'abrirNovoPedido', 'criarPedido', 'publicarPedido',
                    'abrirQuemFalta', 'marcarRespondido', 'abrirNovoArquivo',
                    'publicarArquivoNovo', 'baixarArquivo', 'abrirEnvioFoto',
                    'enviarFotoItem', 'abrirNovaSessao', 'criarSessao', 'abrirMudarSessao',
                    'salvarSessao', 'salvarEdicao', 'abrirNovaConta', 'criarConta',
                    'abrirMudarConta', 'ligarAcoes', 'chamarFuncao', 'carregarParticipantes',
                    'renderParticipantes', 'acessoDe', 'seloAcesso', 'blocoAcesso', 'criarAcesso',
                    'abrirNotificacoes', 'notificacoesOrg', 'renderMesa', 'cartaoMesa']
  const faltando = criticas.filter((f) => !declaradas.has(f))
  assert.deepEqual(faltando, [], 'função da organização sumiu no caminho pro painel único: ' + faltando.join(', '))
})

test('toda função crítica da marca continua declarada dentro de PainelMarca', () => {
  const declaradas = new Set(
    [...JS.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[1]))
  const criticas = ['auth', 'api', 'renovar', 'entrar', 'sair', 'ver', 'irParaMarca',
                    'carregar', 'carregarParticipacao', 'preencherMarca', 'desenharItens',
                    'montarItem', 'desenharUnidades', 'montarUnidade', 'desenharSolicitacoes',
                    'desenharArquivos', 'desenharSessoes', 'desenharVagas', 'reservarVaga',
                    'renderVenda', 'salvarVenda', 'renderFalta', 'notificacoesMarca',
                    'abrirNotificacoesMarca', 'progresso', 'alternarBloco', 'atualizarSelosBlocos',
                    'salvarItens', 'salvarUnidades', 'concluir', 'iniciar', 'precisaTrocarSenha',
                    'definirSenha', 'escapar', 'slugificar', 'enderecoDeLogin']
  const faltando = criticas.filter((f) => !declaradas.has(f))
  assert.deepEqual(faltando, [], 'função da marca sumiu no caminho pro painel único: ' + faltando.join(', '))
})

test('todo texto vindo do banco passa por escapar()', () => {
  const cru = [...JS.matchAll(/innerHTML\s*=([\s\S]*?);\n/g)].map((m) => m[1])
  const suspeitas = cru.filter((t) => /\breg\.[a-z_]+|o\.titulo\(|o\.meta\(/.test(t) && !/escapar\(/.test(t))
  assert.deepEqual(suspeitas, [], 'dado do banco indo cru para innerHTML')
})

test('não afirma gravação sem o servidor confirmar', () => {
  const guarda = JS.indexOf('if (ok !== true)')
  const sucesso = JS.indexOf("'Salvo.'")
  assert.ok(guarda > -1, 'sumiu a checagem do retorno da RPC de gravação')
  assert.ok(sucesso > guarda, '"Salvo." aparece antes de confirmar a gravação')
})

test('não há id repetido entre a casca da organização e a da marca', () => {
  // A armadilha real desta fusão: as duas páginas antigas cada uma tinha o
  // seu próprio #aviso — combinadas num arquivo só, uma delas ficaria escrevendo
  // dentro da caixa errada. Continua havendo repetição DENTRO de cada IIFE (avisos
  // de gaveta que nunca coexistem no DOM ao mesmo tempo) — o teste é só pelos
  // ids que decidem qual casca aparece.
  const estruturais = ['aviso-org', 'aviso-marca', 'login', 'painel', 'vPainel', 'vSenha',
                       'entrada-erro', 'form-entrada', 'fLogin', 'senha', 'loginEmail', 'loginSenha']
  for (const id of estruturais) {
    const n = (HTML.match(new RegExp('id="' + id + '"', 'g')) || []).length
    assert.equal(n, 1, 'id duplicado ou ausente: ' + id + ' (achei ' + n + ')')
  }
})

test('todo destino de cada painel tem seção e botão', () => {
  assert.ok(DESTINOS_ORG.length >= 3, 'não consegui ler DESTINOS (organização) do script')
  for (const v of DESTINOS_ORG) {
    assert.match(HTML, new RegExp('id="vista-' + v + '"'), 'organização: falta a seção do destino ' + v)
    assert.match(HTML, new RegExp('data-vista="' + v + '"'), 'organização: falta o botão do destino ' + v)
  }
  assert.ok(DESTINOS_MARCA.length >= 3, 'não consegui ler DESTINOS_MARCA do script')
  const MV_ID = { hoje: 'mvHoje', cadastro: 'mvCadastro', pedidos: 'mvPedidos', arquivos: 'mvArquivos' }
  for (const v of DESTINOS_MARCA) {
    assert.match(HTML, new RegExp('id="' + MV_ID[v] + '"'), 'marca: falta a seção do destino ' + v)
    assert.match(HTML, new RegExp('data-mvista="' + v + '"'), 'marca: falta o botão do destino ' + v)
  }
})

test('a barra de abas da organização tem tantas colunas quanto destinos', () => {
  const n = DESTINOS_ORG.length
  assert.ok(HTML.includes('grid-template-columns:repeat(' + n + ',1fr)'),
    'a grade da barra de abas da organização não tem ' + n + ' colunas')
})

test('o bloco de prefers-reduced-motion é o último do CSS', () => {
  const style = HTML.slice(HTML.indexOf('<style>'), HTML.indexOf('</style>'))
  const i = style.lastIndexOf('@media (prefers-reduced-motion')
  assert.ok(i > 0, 'o painel não respeita prefers-reduced-motion')
  const depois = style.slice(i).replace(/@media[^{]*\{[\s\S]*?\n\}/, '').trim()
  assert.equal(depois, '', 'há CSS depois do bloco de reduced-motion: ' + depois.slice(0, 80))
})

test('a casca .pn-casca (marca) e #painel (organização) prendem a coluna do grid', () => {
  const painel = HTML.match(/#painel\{[^}]*\}/)
  assert.ok(painel, 'sumiu a regra de #painel')
  assert.match(painel[0], /grid-template-columns\s*:\s*minmax\(\s*0/,
    '#painel sem grid-template-columns com minmax(0,…): a coluna volta a crescer por max-content')
  const casca = HTML.match(/\.pn-casca\{[^}]*\}/)
  assert.ok(casca, 'sumiu a regra de .pn-casca — a casca do painel da marca')
  assert.match(casca[0], /display\s*:\s*grid/, '.pn-casca não é grid — #vPainel cai no display:block padrão de uma <div>')
})

test('o login tem os dois cartões, cada um com o form real do papel', () => {
  assert.match(HTML, /id="form-entrada"/, 'falta o form real da organização (admin_ping)')
  assert.match(HTML, /id="fLogin"/, 'falta o form real da marca (Supabase Auth)')
  assert.match(HTML, /id="loginEmail"/, 'falta o campo de login da marca')
  assert.match(HTML, /id="senha1"/, 'falta o passo de primeiro acesso (definir senha) da marca')
})

/* ── Infra de app ──────────────────────────────────────────────────────── */

const SW = readFileSync(new URL('../public/painel/sw.js', import.meta.url), 'utf8')
const APP_MANIFEST = JSON.parse(
  readFileSync(new URL('../public/painel/app.webmanifest', import.meta.url), 'utf8'))

test('o service worker do painel tem escopo próprio e não é da raiz', () => {
  assert.match(JS, /register\(\s*['"]\/painel\/sw\.js['"]/, 'o script não registra /painel/sw.js')
  assert.match(JS, /scope:\s*['"]\/painel\/['"]/, 'registro sem scope explícito')
})

test('o manifest do painel tem escopo próprio, com barra final', () => {
  assert.equal(APP_MANIFEST.scope, '/painel/')
  assert.equal(APP_MANIFEST.start_url, '/painel/')
})

test('os três manifests (site, organização, marca, painel) não se sobrepõem', () => {
  const site = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'))
  const org = JSON.parse(readFileSync(new URL('../public/organizacao/app.webmanifest', import.meta.url), 'utf8'))
  const marca = JSON.parse(readFileSync(new URL('../public/marca/app.webmanifest', import.meta.url), 'utf8'))
  const escopos = new Set([site.scope, org.scope, marca.scope, APP_MANIFEST.scope])
  assert.equal(escopos.size, 4, 'dois manifests compartilham escopo — um instalaria o outro')
})

test('o service worker do painel não cacheia dado do banco', () => {
  assert.ok(!/supabase/i.test(SW), 'o SW menciona o serviço de banco — PII não pode encostar em caches')
  assert.match(SW, /origin\s*!==\s*self\.location\.origin/, 'falta o corte de origem externa')
})

test('o HTML do painel é sempre da rede, nunca do cache', () => {
  const navegacao = SW.match(/mode\s*===\s*'navigate'[\s\S]*?\n\s*return;/)
  assert.ok(navegacao, 'o SW não trata navegação explicitamente')
  assert.match(navegacao[0], /respondWith\(\s*\n?\s*fetch\(/, 'navegação não busca a rede primeiro')
})

test('o SW do painel não é cacheado pelo CDN', () => {
  const v = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
  const h = v.headers.find((x) => x.source === '/painel/sw.js')
  assert.ok(h, 'sem header de no-store para o service worker do painel')
  assert.match(h.headers[0].value, /no-store/)
})

test('o painel tem rewrite próprio no vercel.json', () => {
  const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
  const r = vercel.rewrites.find((x) => x.source === '/painel')
  assert.ok(r, 'sem rewrite para /painel')
  assert.equal(r.destination, '/painel/index.html')
})

test('todo asset absoluto existe em public/', () => {
  const pedidos = [...HTML.matchAll(/(?:url\('|src="|href=")(\/[^"')]+)/g)].map((m) => m[1])
  for (const p of new Set(pedidos)) {
    assert.ok(readFileSync(new URL('../public' + p, import.meta.url)), 'asset ausente: ' + p)
  }
})

/* ── /organizacao/ e /marca/ viram porta de entrada, não painel duplicado ── */

test('as duas páginas antigas redirecionam para /painel/ depois do login real', () => {
  assert.match(ORG_JS, /location\.replace\(\s*'\/painel\/#painel=org\/'/,
    'abrirPainel() da organização não redireciona para /painel/')
  assert.match(MARCA_JS, /location\.replace\(\s*'\/painel\/#painel=marca\/'/,
    'ver() da marca não redireciona para /painel/ ao mostrar o painel')
})
