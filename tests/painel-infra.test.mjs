/*
 * Substitui tests/organizacao.test.mjs, tests/marca.test.mjs e
 * tests/painel.test.mjs, apagados quando /organizacao, /marca e /painel
 * pararam de servir HTML estático e passaram a servir o painel React
 * (painel-app/, build em dist/painel-app/index.html).
 *
 * Aqueles três arquivos liam o JS inline dos HTMLs apagados. A maior parte do
 * que eles cobriam (uma IIFE só, função declarada e não só chamada, dado do
 * banco escapado antes de innerHTML...) virou garantia estrutural do React —
 * build quebra se falta import, e JSX escapa sozinho todo texto interpolado.
 * Esse resto não foi portado; a contagem de quantos testes caíram em cada
 * categoria está no relatório da tarefa que fez o corte, não aqui.
 *
 * Este arquivo reúne só as invariantes de BACKEND e de CONSISTÊNCIA ENTRE
 * ARQUIVOS QUE SOBREVIVEM: migrations, Edge Functions, service workers,
 * manifests, vercel.json, src/lib/marcaAccess.js e o código real de
 * painel-app/src que substituiu cada comportamento antigo.
 *
 * Rodar: node --test tests/painel-infra.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'

const ler = (rel) => readFileSync(new URL('../' + rel, import.meta.url), 'utf8')
const lerJson = (rel) => JSON.parse(ler(rel))

const semComentarios = (fonte) => fonte
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')

/* ── Migrations, na ordem que o Postgres aplicou — última grant/revoke vale ── */
const MIGDIR = new URL('../supabase/migrations/', import.meta.url)
const MIGRATIONS = readdirSync(MIGDIR)
  .filter((f) => f.endsWith('.sql')).sort()
  .map((f) => readFileSync(new URL(f, MIGDIR), 'utf8')).join('\n')

const colunasConcedidas = (tabela) => {
  const passo = new RegExp(
    'grant\\s+update\\s*\\(([^)]+)\\)\\s*(?:\\n\\s*)?on\\s+public\\.' + tabela + '\\b' +
    '|revoke\\s+(?:all|update)[^;]*?\\son\\s+public\\.' + tabela + '\\b[^;]*?;', 'g')
  let atual = new Set()
  for (const m of MIGRATIONS.matchAll(passo)) {
    if (m[1]) m[1].split(',').forEach((c) => atual.add(c.trim()))
    else atual = new Set()
  }
  return atual
}

const EDGE_ACESSO = ler('supabase/functions/criar-acesso-marca/index.ts')
const EDGE_CONTA = ler('supabase/functions/criar-conta-organizacao/index.ts')
const EDGE_ARQ = ler('supabase/functions/arquivo-url/index.ts')
const PUSH = ler('supabase/functions/enviar-push/index.ts')
const EDGE_ACESSO_CODIGO = semComentarios(EDGE_ACESSO)

const MARCA_ACCESS = ler('src/lib/marcaAccess.js')
const MARCA_ACCESS_CODIGO = semComentarios(MARCA_ACCESS)

const VERCEL = lerJson('vercel.json')

const PAINEL_APP_HTML = ler('painel-app/index.html')
const RPC_JS = ler('painel-app/src/lib/rpc.js')
const RESPOSTAS_JS = ler('painel-app/src/lib/respostas.js')
const MARCAS_JSX = ler('painel-app/src/components/vistas/Marcas.jsx')
const MESA_JSX = ler('painel-app/src/components/vistas/Mesa.jsx')
const PRODUCAO_JSX = ler('painel-app/src/components/vistas/Producao.jsx')
const EQUIPE_JSX = ler('painel-app/src/components/vistas/Equipe.jsx')
const RESPOSTAS_JSX = ler('painel-app/src/components/vistas/Respostas.jsx')
const CADASTRO_JSX = ler('painel-app/src/components/vistas-marca/Cadastro.jsx')
const ARQUIVOS_JSX = ler('painel-app/src/components/vistas-marca/Arquivos.jsx')
const MARCA_API_JS = ler('painel-app/src/lib/marcaApi.js')
const PAINEL_SHELL_JSX = ler('painel-app/src/components/PainelShell.jsx')
const PAINEL_MARCA_SHELL_JSX = ler('painel-app/src/components/PainelMarcaShell.jsx')
const PAINEL_CSS = ler('painel-app/src/styles/painel.css')

const contarDestinos = (txt) => {
  const m = txt.match(/const DESTINOS\s*=\s*\[([^\]]+)\]/)
  return m ? (m[1].match(/'[a-z]+'/g) || []).length : 0
}
const DESTINOS_ORG = contarDestinos(PAINEL_SHELL_JSX)
const DESTINOS_MARCA = contarDestinos(PAINEL_MARCA_SHELL_JSX)

/* ─────────────────────────────────────────────────────────────────────────
   Segurança geral
   ───────────────────────────────────────────────────────────────────────── */

test('nenhuma chave de serviço ou JWT no painel React nem no rpc.js', () => {
  for (const [nome, txt] of [['painel-app/index.html', PAINEL_APP_HTML], ['painel-app/src/lib/rpc.js', RPC_JS]]) {
    assert.ok(!/service_role/.test(txt), nome + ': menciona service_role')
    assert.ok(!/\bsb_secret_|\beyJ[\w-]+\.[\w-]+\.[\w-]+/.test(txt), nome + ': parece ter chave secreta ou JWT')
  }
  const m = RPC_JS.match(/SUPABASE_KEY = import\.meta\.env\?\.VITE_SUPABASE_KEY \|\| '([^']+)'/)
  assert.ok(m && m[1].startsWith('sb_publishable_'), 'a chave de fallback do painel não é a publicável')
})

test('nenhuma chave VAPID privada em arquivo servido ao navegador', () => {
  const avisos = ler('painel-app/src/lib/avisos.js')
  assert.ok(!/VAPID_PRIVAD|VAPID_PRIVATE|privateKey\s*[:=]\s*'[A-Za-z0-9_-]{40,}'/.test(avisos),
    'parece haver chave privada em painel-app/src/lib/avisos.js')
})

test('o painel React pede para não ser indexado', () => {
  assert.match(PAINEL_APP_HTML, /<meta\s+name="robots"\s+content="noindex/, 'falta o meta robots noindex')
})

test('a sessão da marca vive em sessionStorage, nunca em localStorage', () => {
  for (const [nome, txt] of [['marcaApi.js', semComentarios(MARCA_API_JS)], ['marcaAccess.js', MARCA_ACCESS_CODIGO]]) {
    assert.ok(!/localStorage\s*\./.test(txt), nome + ': token em localStorage sobrevive ao fechar a aba')
  }
  assert.match(MARCA_API_JS, /sessionStorage\s*\./)
})

/* ─────────────────────────────────────────────────────────────────────────
   vercel.json — as três rotas viram o painel React
   ───────────────────────────────────────────────────────────────────────── */

test('a porta de entrada do site usa a forma com barra final', () => {
  // AccessDialog.jsx é a única porta pública do domínio (§6.10-b) — sem a
  // barra final ela cairia no fallback do SPA em vez de resolver o índice do
  // diretório (§10.4-b). O destino em si (painel React) já é coberto pelo
  // teste de vercel.json logo abaixo.
  const dialog = ler('src/components/AccessDialog.jsx')
  assert.match(dialog, /window\.location\.href = '\/organizacao\/'/, 'organização sem barra final')
  assert.match(dialog, /window\.location\.href = '\/marca\/'/, 'marca sem barra final')
  assert.ok(!/window\.location\.href = '\/organizacao'[^/]/.test(dialog), 'forma sem barra de organização')
  assert.ok(!/window\.location\.href = '\/marca'[^/]/.test(dialog), 'forma sem barra de marca')
})

test('organização, marca e painel apontam pro build do painel React', () => {
  for (const rota of ['/organizacao', '/organizacao/', '/marca', '/marca/', '/painel', '/painel/']) {
    const r = VERCEL.rewrites.find((x) => x.source === rota)
    assert.ok(r, 'sem rewrite para ' + rota)
    assert.equal(r.destination, '/painel-app/index.html')
  }
})

test('/quero-participar continua página estática própria', () => {
  const r = VERCEL.rewrites.find((x) => x.source === '/quero-participar')
  assert.ok(r, 'sem rewrite para /quero-participar')
  assert.equal(r.destination, '/quero-participar/index.html')
})

/* ─────────────────────────────────────────────────────────────────────────
   Service workers — os três continuam servindo quem já instalou o ícone
   antigo (CLAUDE.md §10.4-b: "não foram apagados"). O painel React registra
   só /painel/sw.js (tests/painel-app-pwa.test.mjs); estes arquivos param de
   ser escritos por código novo, mas continuam tendo que valer as mesmas
   regras de escopo e cache enquanto existirem.
   ───────────────────────────────────────────────────────────────────────── */

const SWS = [
  ['organizacao', ler('public/organizacao/sw.js')],
  ['marca', ler('public/marca/sw.js')],
  ['painel', ler('public/painel/sw.js')],
]

test('nenhum service worker cacheia dado do banco', () => {
  for (const [nome, sw] of SWS) {
    assert.ok(!/supabase|dgfmoibynftadsyjcclg/i.test(sw), nome + ': o SW menciona o serviço de banco')
    assert.match(sw, /origin\s*!==\s*self\.location\.origin|url\.origin !== self\.location\.origin/, nome + ': falta o corte de origem externa')
  }
})

test('o HTML de cada painel é sempre da rede, nunca do cache', () => {
  for (const [nome, sw] of SWS) {
    const navegacao = sw.match(/mode\s*===\s*'navigate'[\s\S]*?\n\s*return;/)
    assert.ok(navegacao, nome + ': o SW não trata navegação explicitamente')
    assert.match(navegacao[0], /respondWith\(\s*\n?\s*fetch\(/, nome + ': navegação não busca a rede primeiro')
  }
})

test('nenhum dos três service workers é cacheado pelo CDN', () => {
  for (const nome of ['organizacao', 'marca', 'painel']) {
    const h = VERCEL.headers.find((x) => x.source === '/' + nome + '/sw.js')
    assert.ok(h, nome + ': sem header de no-store para o service worker')
    assert.match(h.headers[0].value, /no-store/)
  }
})

test('os dois SW com push recebem o evento e tratam o clique só em caminho interno', () => {
  for (const [nome, sw] of [SWS[0], SWS[1]]) {
    assert.match(sw, /addEventListener\('push'/, nome + ': sem handler de push')
    assert.match(sw, /addEventListener\('notificationclick'/, nome + ': sem handler de clique')
    assert.match(sw, /showNotification/, nome + ': push que não mostra nada')
    assert.match(sw, /charAt\(0\) === '\/'/, nome + ': destino não é conferido')
  }
  assert.ok(PUSH.includes('url_invalida'), 'a função precisa recusar URL absoluta na entrada')
})

/* ─────────────────────────────────────────────────────────────────────────
   Manifests — três apps continuam com escopo próprio, e o do site instala o
   painel (decisão do Eloi, 27/08/2026).
   ───────────────────────────────────────────────────────────────────────── */

test('escopo e start_url dos três manifests terminam em barra e não se sobrepõem', () => {
  const manifests = {
    organizacao: lerJson('public/organizacao/app.webmanifest'),
    marca: lerJson('public/marca/app.webmanifest'),
    painel: lerJson('public/painel/app.webmanifest'),
  }
  for (const [nome, m] of Object.entries(manifests)) {
    assert.ok(m.scope.endsWith('/'), nome + ': scope sem barra final')
    assert.ok(m.start_url.endsWith('/'), nome + ': start_url sem barra final')
    assert.equal(m.scope, '/' + nome + '/')
  }
  const escopos = new Set(Object.values(manifests).map((m) => m.scope))
  assert.equal(escopos.size, 3, 'organização, marca e painel deveriam ter escopos distintos entre si')

  const site = lerJson('public/manifest.webmanifest')
  assert.equal(site.scope, manifests.painel.scope, 'o manifest do site deveria instalar o painel')
  assert.equal(site.start_url, manifests.painel.start_url)
})

/* ─────────────────────────────────────────────────────────────────────────
   Layout do painel React — mesmas armadilhas de grid que o painel estático
   já tinha (CLAUDE.md §10.5), agora em painel-app/src/styles/painel.css.
   ───────────────────────────────────────────────────────────────────────── */

test('a casca do painel prende a coluna do grid, senão estoura na horizontal', () => {
  const painel = PAINEL_CSS.match(/#painel\{[^}]*\}/)
  assert.ok(painel, 'sumiu a regra de #painel')
  assert.match(painel[0], /grid-template-columns\s*:\s*minmax\(\s*0/,
    '#painel sem grid-template-columns com minmax(0,…): a coluna volta a crescer por max-content')
  for (const sel of ['.pn-cabeca', '.og-corpo']) {
    const regra = PAINEL_CSS.match(new RegExp(sel.replace('.', '\\.') + '\\{[^}]*\\}'))
    assert.ok(regra, 'sumiu a regra de ' + sel)
    assert.match(regra[0], /min-width\s*:\s*0/, sel + ' sem min-width:0 — item de grid não encolhe')
  }
})

test('as barras de abas têm tantas colunas quanto DESTINOS', () => {
  assert.ok(DESTINOS_ORG >= 3, 'não consegui contar DESTINOS em PainelShell.jsx')
  assert.ok(DESTINOS_MARCA >= 3, 'não consegui contar DESTINOS em PainelMarcaShell.jsx')
  assert.ok(PAINEL_CSS.includes('grid-template-columns:repeat(' + DESTINOS_ORG + ',1fr)'),
    'a grade da barra de abas da organização não tem ' + DESTINOS_ORG + ' colunas')
  assert.ok(PAINEL_CSS.includes('width:calc(100% / ' + DESTINOS_ORG + ')'),
    'o indicador da barra da organização não mede 1/' + DESTINOS_ORG)
  assert.ok(PAINEL_CSS.includes('grid-template-columns:repeat(' + DESTINOS_MARCA + ',1fr)'),
    'a grade da barra de abas da marca não tem ' + DESTINOS_MARCA + ' colunas')
})

test('o bloco de prefers-reduced-motion é o último do CSS do painel', () => {
  const i = PAINEL_CSS.lastIndexOf('@media (prefers-reduced-motion')
  assert.ok(i > 0, 'o painel não respeita prefers-reduced-motion')
  const depois = PAINEL_CSS.slice(i).replace(/@media[^{]*\{[\s\S]*?\n\}/, '').trim()
  assert.equal(depois, '', 'há CSS depois do bloco de reduced-motion: ' + depois.slice(0, 80))
})

/* ─────────────────────────────────────────────────────────────────────────
   Login da marca — mensagem genérica, slugificação e senha de uso único
   ───────────────────────────────────────────────────────────────────────── */

test('erro de login da marca não confirma se o e-mail existe', () => {
  assert.match(MARCA_ACCESS_CODIGO, /E-mail ou senha não conferem/)
  assert.ok(!/(e-mail|usuário|conta)\s+não\s+(encontrad|existe|cadastrad)/i.test(MARCA_ACCESS_CODIGO),
    'mensagem de erro revela quais e-mails estão na base')
  assert.ok(!/senha\s+(incorreta|errada|inválida)/i.test(MARCA_ACCESS_CODIGO),
    'separar "senha errada" de "e-mail errado" confirma que o e-mail existe')
})

test('as duas slugificações que restam casam — Edge Function e marcaAccess.js', () => {
  // ⚠️ Antes eram três (página estática, Edge Function, marcaAccess.js).
  // public/marca/index.html saiu; painel-app não reimplementa slugificar(),
  // importa entrarComoMarca() de src/lib/marcaAccess.js direto — então a
  // comparação vira só duas pontas, não zero.
  const daFuncao = EDGE_ACESSO_CODIGO.match(/function slugificar[\s\S]*?\n\}/)
  const doAccess = MARCA_ACCESS_CODIGO.match(/function slugificar[\s\S]*?\n\}/)
  assert.ok(daFuncao, 'sumiu slugificar() da Edge Function')
  assert.ok(doAccess, 'sumiu slugificar() de src/lib/marcaAccess.js')

  const normal = (t) => t.replace(/:\s*string/g, '').replace(/\s+/g, '').replace(/var|const|let/g, '')
  assert.equal(normal(daFuncao[0]), normal(doAccess[0]),
    'Edge Function × marcaAccess.js divergiram — o login gerado não vai abrir a página')

  const dom = (t) => (t.match(/DOMINIO_LOGIN\s*=\s*'([^']+)'/) || [])[1]
  assert.ok(dom(EDGE_ACESSO_CODIGO), 'sumiu DOMINIO_LOGIN da Edge Function')
  assert.equal(dom(EDGE_ACESSO_CODIGO), dom(MARCA_ACCESS_CODIGO), 'o domínio de login difere entre a função e marcaAccess.js')
})

test('a senha entregue por WhatsApp morre no primeiro uso', () => {
  assert.match(EDGE_ACESSO, /deve_trocar_senha:\s*true/,
    'a Edge Function não liga a troca obrigatória — a senha do WhatsApp viraria permanente')
  assert.match(MARCA_API_JS, /export async function precisaTrocarSenha/,
    'o painel React não confere deve_trocar_senha')
  assert.match(MARCA_API_JS, /marcar_senha_trocada/,
    'o painel React não baixa a flag depois da troca')
})

test('a senha é gerada com aleatoriedade de verdade', () => {
  assert.match(EDGE_ACESSO, /crypto\.getRandomValues/)
  assert.ok(!/Math\.random/.test(EDGE_ACESSO_CODIGO), 'há Math.random na geração de credenciais')
})

/* ─────────────────────────────────────────────────────────────────────────
   Contrato de escrita da marca — RLS decide linha, grant decide coluna
   ───────────────────────────────────────────────────────────────────────── */

test('o cadastro da marca só escreve colunas que o grant de UPDATE concede', () => {
  const camposDoObjeto = (nomeVar) => {
    const bloco = CADASTRO_JSX.match(new RegExp('const ' + nomeVar + ' = \\{([\\s\\S]*?)\\n\\s*\\}'))
    assert.ok(bloco, 'não achei ' + nomeVar + ' em Cadastro.jsx')
    return [...bloco[1].matchAll(/^\s*([a-z_]+):/gm)].map((m) => m[1])
  }
  const alvos = [
    ['participantes', camposDoObjeto('camposMarca')],
    ['participacoes', camposDoObjeto('camposParticipacao')],
  ]
  alvos.forEach(([tabela, escritas]) => {
    const concedidas = colunasConcedidas(tabela)
    assert.ok(concedidas.size > 0, 'sumiu o grant de coluna de ' + tabela)
    const proibidas = escritas.filter((c) => !concedidas.has(c))
    assert.deepEqual(proibidas, [], 'Cadastro.jsx escreve em ' + tabela + ' fora do grant: ' + proibidas.join(', '))
  })

  // participantes_itens: o corpo é um objeto inline dentro de salvarItens(),
  // não uma const nomeada — extrai do próprio PATCH.
  const itensBloco = CADASTRO_JSX.match(/participantes_itens\?id=eq[\s\S]*?corpo:\s*\{([\s\S]*?)\n\s*\},/)
  assert.ok(itensBloco, 'não achei a escrita de participantes_itens em Cadastro.jsx')
  const escritasItens = [...itensBloco[1].matchAll(/^\s*([a-z_]+):/gm)].map((m) => m[1])
  const concedidasItens = colunasConcedidas('participantes_itens')
  assert.ok(concedidasItens.size > 0, 'sumiu o grant de coluna de participantes_itens')
  const proibidasItens = escritasItens.filter((c) => !concedidasItens.has(c))
  assert.deepEqual(proibidasItens, [], 'Cadastro.jsx escreve em participantes_itens fora do grant: ' + proibidasItens.join(', '))
})

test('status_cadastro fica fora do alcance da marca, nas duas tabelas', () => {
  ;['participantes', 'participacoes'].forEach((tabela) => {
    assert.ok(!colunasConcedidas(tabela).has('status_cadastro'), 'status_cadastro está no grant de ' + tabela)
  })
})

test('a marca não escreve o caminho de foto nenhuma', () => {
  assert.ok(!colunasConcedidas('participantes').has('combo_foto_path'), 'combo_foto_path voltou ao grant de participantes')
  assert.ok(!colunasConcedidas('participantes_itens').has('foto_path'), 'foto_path voltou ao grant dos itens')
})

test('preço, endereço e horário são da PARTICIPAÇÃO, não da marca', () => {
  assert.ok(colunasConcedidas('participacoes').has('combo_preco'), 'combo_preco precisa ser escrevível na participação')
  const daMarca = [...colunasConcedidas('participantes')].join(' ')
  assert.ok(!/preco|endereco|horario/.test(daMarca), 'dado volátil vazou para a tabela publicável')
  assert.match(CADASTRO_JSX, /participacao_unidades/, 'endereço e horário precisam vir de participacao_unidades')
})

test('o painel React lê a participação, não as colunas antigas do modelo anterior', () => {
  assert.match(CADASTRO_JSX, /participacoes\?select=/, 'Cadastro.jsx não carrega a participação')
  const arquivos = [CADASTRO_JSX, MARCAS_JSX, PRODUCAO_JSX, EQUIPE_JSX]
    .map(semComentarios).join('\n')
  assert.ok(!/participantes_operacao/.test(arquivos), 'o painel React ainda menciona a tabela de operação do modelo antigo')
  assert.ok(!/\bcombo_nome\b/.test(semComentarios(MARCAS_JSX)), 'a lista de marcas ainda lê combo_nome')
})

test('quem decide se o cadastro está completo é o servidor, com o argumento novo', () => {
  assert.match(CADASTRO_JSX, /rpc\/marca_concluir_cadastro/, 'a conclusão precisa passar pela RPC')
  assert.match(CADASTRO_JSX, /p_participacao:/, 'Cadastro.jsx chama a conclusão com o argumento do modelo antigo')
  assert.match(MIGRATIONS, /marca_concluir_cadastro\(p_participacao uuid\)/)
})

test('o autosave da marca não afirma gravação sem o servidor confirmar', () => {
  const guarda = CADASTRO_JSX.indexOf("throw new Error('sem_confirmacao')")
  const sucesso = CADASTRO_JSX.indexOf("'Salvo automaticamente.'")
  assert.ok(guarda > -1, 'sumiu a checagem do retorno do PATCH em Cadastro.jsx')
  assert.ok(sucesso > guarda, '"Salvo automaticamente." aparece antes de confirmar a gravação')
})

// A ficha de resposta (DetalheResposta em Respostas.jsx) é a porta de
// public/organizacao/index.html — salvar()/apagar()/criarAcesso() —
// restaurada no corte para React. tests/organizacao.test.mjs cobria as três
// garantias abaixo ('não afirma gravação sem o servidor confirmar',
// 'apagar exige dois toques...', 'criar acesso pede confirmação...') contra
// o JS inline; nada as cobria contra o código novo até este teste.
test('a carga confere a sessão em vez de mostrar lista vazia', () => {
  // Sessão expirada não pode parecer "dados sumiram" — carregar() tem que
  // checar admin_ping antes de aceitar as listas.
  const corpo = RESPOSTAS_JSX.slice(RESPOSTAS_JSX.indexOf('const carregar ='), RESPOSTAS_JSX.indexOf('[reportarEstado])'))
  assert.match(corpo, /admin_ping/, 'carregar() não confere a sessão com admin_ping')
  const guarda = corpo.indexOf('valida !== true')
  assert.ok(guarda > -1, 'sumiu a checagem de valida !== true')
  const setDados = corpo.indexOf('setDados(novo)')
  assert.ok(setDados > guarda, 'setDados roda antes de confirmar a sessão — sessão expirada mostraria lista vazia')
})

test('a ficha de resposta não afirma "Salvo." sem o servidor confirmar', () => {
  const guarda = RESPOSTAS_JSX.indexOf('ok !== true')
  const sucesso = RESPOSTAS_JSX.indexOf("'Salvo.'")
  assert.ok(guarda > -1, 'sumiu a checagem do retorno de organizacao_atualizar_registro')
  assert.ok(sucesso > guarda, '"Salvo." aparece antes de confirmar a gravação')
})

test('apagar exige dois toques e só fecha a ficha depois do servidor confirmar', () => {
  const corpo = RESPOSTAS_JSX.slice(RESPOSTAS_JSX.indexOf('async function apagar'))
  assert.ok(corpo.length > 0, 'sumiu a função apagar')

  // 1. dois toques: o primeiro arma e agenda o desarme, sem chamar o servidor.
  const primeiroToque = corpo.slice(0, corpo.indexOf('desarmarApagar()'))
  assert.match(primeiroToque, /if \(!armado\)/, 'o primeiro toque não checa o estado armado')
  assert.match(primeiroToque, /setArmado\(true\)/, 'o primeiro toque não arma o botão')
  assert.match(primeiroToque, /return/, 'o primeiro toque não interrompe antes de chamar o servidor')

  // 2. nada é afirmado (nem a ficha fecha) antes de `r.ok === true`.
  const guarda = corpo.indexOf('r.ok !== true')
  const fechaFicha = corpo.indexOf('onApagado(reg.id)')
  assert.ok(guarda > -1, 'sumiu a checagem do retorno de organizacao_apagar_registro')
  assert.ok(fechaFicha > guarda, 'a ficha fecha (onApagado) antes de o servidor confirmar a exclusão')
})

test('criar acesso pede confirmação, e a credencial só existe na resposta da função', () => {
  const corpo = RESPOSTAS_JSX.slice(RESPOSTAS_JSX.indexOf('async function criarAcesso'))
  assert.ok(corpo.length > 0, 'sumiu a função criarAcesso')
  const confirma = corpo.indexOf('window.confirm(')
  const chama = corpo.indexOf("chamarFuncao('criar-acesso-marca'")
  assert.ok(confirma > -1, 'a conta nasce sem confirmar com quem está na tela')
  assert.ok(chama > confirma, 'a Edge Function é chamada antes da confirmação')
  assert.match(corpo.slice(0, 900), /r\.login\b.*r\.senha\b/s, 'a checagem da resposta não exige login e senha')
})

// O corpo que Respostas.jsx manda pro chamarFuncao tem que casar com o que a
// Edge Function lê (payload.secret / payload.origem_id) — a mesma classe de
// bug do incidente p_participacao/p_participante do CLAUDE.md §10.4-b:
// renomear um lado sem o outro quebra "criar acesso" em silêncio, sem erro
// de build e sem nenhum outro teste acusando.
test('o corpo de criar-acesso-marca casa com o que a Edge Function lê', () => {
  const corpo = RESPOSTAS_JSX.slice(RESPOSTAS_JSX.indexOf("chamarFuncao('criar-acesso-marca'"))
  const chamada = corpo.match(/chamarFuncao\('criar-acesso-marca',\s*\{([^}]*)\}/)
  assert.ok(chamada, 'não achei a chamada a criar-acesso-marca em Respostas.jsx')
  const chaves = [...chamada[1].matchAll(/(\w+):/g)].map((m) => m[1])
  for (const chave of ['secret', 'origem_id']) {
    assert.ok(chaves.includes(chave), 'o corpo enviado não tem "' + chave + '"')
    assert.match(EDGE_ACESSO, new RegExp('payload\\.' + chave + '\\b'),
      'a Edge Function não lê payload.' + chave)
  }
})

test('não tenta upsert em push_subscriptions, e a marca grava antes de afirmar', () => {
  assert.ok(!/merge-duplicates/.test(ARQUIVOS_JSX), 'upsert não funciona: update está revogado')
  assert.match(ARQUIVOS_JSX, /push_subscriptions\?endpoint=eq\./, 'falta apagar o endpoint antigo antes de inserir')
  assert.match(MIGRATIONS, /revoke update on public\.push_subscriptions from anon, authenticated/)
  const gravou = ARQUIVOS_JSX.indexOf("api('push_subscriptions'")
  const afirmou = ARQUIVOS_JSX.indexOf('Avisos ligados neste aparelho')
  assert.ok(gravou > -1 && afirmou > gravou, 'a área da marca afirma que ligou antes de gravar no banco')
  assert.match(ARQUIVOS_JSX, /papel:\s*'marca'/, 'sem papel, o envio não sabe a quem serve')
  assert.match(ARQUIVOS_JSX, /participante_id:/, 'assinatura precisa de dono')
})

test('a área da marca é instalável, e o iPhone recebe instrução em vez de botão morto', () => {
  assert.match(PAINEL_APP_HTML, /<link rel="manifest" href="\/painel\/app\.webmanifest"/)
  assert.match(PAINEL_APP_HTML, /apple-mobile-web-app-capable/, 'sem isso o iPhone não expõe PushManager mesmo instalado')
  assert.match(ARQUIVOS_JSX, /Adicionar à Tela de Início/)
  assert.match(ARQUIVOS_JSX, /function avisoSuportado/, 'a tela precisa distinguir suporte de permissão')
})

test('pedir permissão de aviso não é beco sem saída, nos dois painéis', () => {
  for (const [nome, arq] of [['organização', EQUIPE_JSX], ['marca', ARQUIVOS_JSX]]) {
    assert.match(arq, /ONDE_ESTA_O_AVISO/, nome + ': não ensina onde o pedido se escondeu')
    assert.match(arq, /Ainda esperando sua resposta/, nome + ': falta o prazo que troca o recado')
    assert.match(arq, /clearTimeout\(lembrete\)/, nome + ': o lembrete precisa ser cancelado')
    assert.match(arq, /permissions\.query\(\{ name: 'notifications' \}\)/, nome + ': sem ouvir a mudança de permissão')
    assert.match(arq, /Notification\.permission === 'denied'/, nome + ': precisa checar a negativa antes de pedir')
  }
})

/* ─────────────────────────────────────────────────────────────────────────
   Cadastro manual de marca — organização
   ───────────────────────────────────────────────────────────────────────── */

test('a RPC de listar marcas existe e passa pela senha', () => {
  // Duas definições no histórico (20260822, 20260825) — a que vale é a
  // ÚLTIMA aplicada, então pega o último match, não o primeiro.
  const defs = [...MIGRATIONS.matchAll(/create or replace function public\.get_participantes[\s\S]*?grant execute on function public\.get_participantes/g)]
  assert.ok(defs.length > 0, 'sumiu a definição de get_participantes')
  const vigente = defs[defs.length - 1][0]
  assert.match(vigente, /if not public\.pode\(p_secret,\s*'dado\.ler'\)\s*then\s*return;\s*end if;/,
    'get_participantes perdeu a guarda de autorização — devolveria dado de contato sem senha')
})

test('o cadastro manual passa pela MESMA função de acesso da Edge Function', () => {
  const corpo = MARCAS_JSX.slice(MARCAS_JSX.indexOf('async function criarMarcaManual'))
  assert.match(corpo.slice(0, 1200), /chamarFuncao\(\s*['"]criar-acesso-marca['"]/,
    'o cadastro manual não usa a função de acesso — há um segundo caminho')
  assert.match(EDGE_ACESSO, /vincular_marca_manual/, 'a Edge Function não conhece o vínculo manual')
})

test('a função de acesso recusa entrada ambígua e entrada vazia', () => {
  assert.match(EDGE_ACESSO, /origemId\s*&&\s*manual[\s\S]{0,80}entrada_ambigua/,
    'aceitar candidatura e cadastro manual juntos cria conta com o nome errado')
  assert.match(EDGE_ACESSO, /!origemId\s*&&\s*!manual[\s\S]{0,80}origem_obrigatoria/)
})

test('a colisão é checada ANTES de criar o usuário', () => {
  const colisao = EDGE_ACESSO.indexOf('marca_ja_tem_acesso')
  const criacao = EDGE_ACESSO.indexOf('auth.admin.createUser')
  assert.ok(colisao > -1, 'sumiu a recusa por nome já com acesso')
  assert.ok(criacao > colisao, 'o usuário é criado antes da checagem de colisão')
})

test('a recusa por candidatura existente devolve o id dela, e o painel trata', () => {
  assert.match(EDGE_ACESSO, /existe_candidatura[\s\S]{0,120}candidatura_id/)
  assert.match(MARCAS_JSX, /existe_candidatura/, 'Marcas.jsx não trata a recusa por candidatura existente')
})

test('a RPC do vínculo manual não é chamável pelo navegador', () => {
  const migManual = ler('supabase/migrations/20260822_vincular_marca_manual.sql')
  assert.match(migManual, /create or replace function public\.vincular_marca_manual/)
  assert.match(migManual, /revoke all on function public\.vincular_marca_manual[\s\S]{0,120}anon/,
    'criar conta não é operação que possa sair de um bundle público')
  assert.match(migManual, /papel\s*\)\s*\n?\s*values\s*\(\s*p_user,\s*'marca'/,
    'o papel precisa ser fixo em marca')
})

test('o estado vazio das marcas não descreve o fluxo de convite por e-mail removido', () => {
  const vazio = MARCAS_JSX.slice(MARCAS_JSX.indexOf('Nenhuma marca com acesso'))
  assert.ok(!/convite por e-mail/.test(vazio.slice(0, 700)), 'o estado vazio ainda promete convite por e-mail')
  assert.match(vazio.slice(0, 700), /Cadastrar marca/, 'o estado vazio não menciona o caminho do cadastro manual')
})

/* ─────────────────────────────────────────────────────────────────────────
   Fase 6 — ficha, upload assinado, conta da organização
   ───────────────────────────────────────────────────────────────────────── */

const MIG_FASE5 = ler('supabase/migrations/20260825_fase5_painel_da_marca.sql')
const MIG_FASE6 = ler('supabase/migrations/20260825_fase6_leitura_da_organizacao.sql')

test('a ficha da marca vem da participação, numa chamada só', () => {
  assert.match(MARCAS_JSX, /get_ficha_participacao/, 'Marcas.jsx não usa a RPC da ficha')
  assert.match(MIG_FASE6, /create or replace function public\.get_ficha_participacao/)
})

test('o upload não faz os bytes atravessarem a Edge Function', () => {
  assert.match(PRODUCAO_JSX, /acao:\s*'subir'/, 'sumiu o pedido de assinatura de upload')
  assert.match(PRODUCAO_JSX, /method:\s*'PUT',\s*body:\s*file\b/, 'o arquivo precisa ir direto para a URL assinada')
  assert.match(EDGE_ARQ, /createSignedUploadUrl/)
  assert.ok(!/await req\.(formData|arrayBuffer|blob)\(\)/.test(EDGE_ARQ), 'a função está lendo o corpo do arquivo')
})

test('a Edge Function decide o caminho do arquivo, e o navegador não manda pasta livre', () => {
  assert.match(EDGE_ARQ, /function caminhoValido/, 'sem validação de caminho, uma marca sobrescreve o arquivo de outra')
  assert.match(EDGE_ARQ, /UUID\.test\(pasta\)/, 'a pasta precisa ser `geral` ou um id de participação')
})

test('criar conta da organização é coisa de administrador', () => {
  assert.match(EDGE_CONTA, /p_acao:\s*'acesso\.gerir'/, 'a função precisa exigir acesso.gerir')
  assert.match(EDGE_CONTA, /deve_trocar_senha:\s*true/, 'sem a trava, a senha entregue por mensagem vira permanente')
  assert.match(EDGE_CONTA, /deleteUser/, 'perfil que falha tem que desfazer o usuário')
  assert.match(EDGE_CONTA, /from\('funcoes'\)/, 'a lista de funções vem da tabela, não de um array no código')
})

test('nenhuma chave de serviço nas duas Edge Functions novas', () => {
  ;[EDGE_CONTA, EDGE_ARQ].forEach((f) => {
    assert.match(f, /Deno\.env\.get\('SUPABASE_SERVICE_ROLE_KEY'\)/, 'a chave tem que vir do ambiente')
    assert.ok(!/\bsb_secret_|\beyJ[\w-]+\.[\w-]+\.[\w-]+/.test(f), 'parece haver chave literal no arquivo')
  })
})

test('a foto do combo é da participação, e a marca não a escreve', () => {
  assert.match(MIG_FASE5, /combos_marca_le[\s\S]{0,400}participacoes pa/, 'a policy do bucket precisa casar pela participação')
  assert.ok(!/grant\s+update\s*\([^)]*foto_path/.test(MIG_FASE5 + MIG_FASE6), 'foto_path não pode entrar em grant de coluna da marca')
  assert.match(MIG_FASE6, /registrar_foto_item[\s\S]{0,300}producao\.gerir/, 'quem registra foto precisa de producao.gerir')
})

test('a edição aberta tem tela, e é ela que dá formulário à conta nova', () => {
  assert.match(EQUIPE_JSX, /definir_edicao_atual/, 'sem esta tela, abrir edição é rodar SQL à mão')
  assert.match(MIG_FASE5, /perform public\.abrir_participacao_interna\(v_id, v_ed\)/,
    'a conta nova precisa nascer com a participação da edição corrente')
})

/* ─────────────────────────────────────────────────────────────────────────
   Fase 7 — push
   ───────────────────────────────────────────────────────────────────────── */

test('a função de envio é guardada, e a chave de serviço vem do ambiente', () => {
  assert.match(PUSH, /p_acao:\s*'producao\.gerir'/, 'quem manda aviso precisa de producao.gerir')
  assert.match(PUSH, /autorizado !== true[\s\S]{0,80}401/, 'sem autorização tem que ser 401')
  assert.match(PUSH, /Deno\.env\.get\('SUPABASE_SERVICE_ROLE_KEY'\)/)
  assert.match(PUSH, /Deno\.env\.get\('VAPID_PRIVATE_KEY'\)/, 'a privada só pode vir do ambiente')
  assert.ok(!/\bsb_secret_|\beyJ[\w-]+\.[\w-]+\.[\w-]+/.test(PUSH), 'chave literal no arquivo')
})

test('sem as três variáveis VAPID a função recusa em vez de fingir que mandou', () => {
  assert.match(PUSH, /vapid_ausente[\s\S]{0,120}503|503[\s\S]{0,120}vapid_ausente/)
})

test('o separador da cifra é um byte, não uma sequência de escape', () => {
  assert.match(PUSH, /const NUL = new Uint8Array\(\[0\]\)/, 'o separador precisa ser um byte, fora da string')
  for (const rotulo of ['WebPush: info', 'Content-Encoding: aes128gcm', 'Content-Encoding: nonce']) {
    assert.ok(PUSH.includes("texto.encode('" + rotulo + "'), NUL"), 'o rótulo "' + rotulo + '" precisa ser seguido do byte NUL')
  }
  assert.ok(!PUSH.includes(String.fromCharCode(0)), 'há byte NUL cru no arquivo')
  assert.ok(!PUSH.includes('\\' + 'u0000'), 'voltou a sequência de escape')
})

test('assinatura que morreu é desativada, não apagada, e o endpoint nunca volta na resposta', () => {
  assert.match(PUSH, /404 \|\| r\.status === 410/, 'assinatura revogada precisa sair do laço')
  assert.match(PUSH, /update\(\{ ativo: false \}\)/, 'desativar, não apagar')
  assert.ok(!/enviados[\s\S]{0,200}endpoint/.test(PUSH.slice(PUSH.indexOf('return json({ ok: true, enviados'))),
    'endpoint é credencial: não pode voltar na resposta')
})

/* ─────────────────────────────────────────────────────────────────────────
   Status que o painel conhece — respostas.js vs o CHECK do banco
   ───────────────────────────────────────────────────────────────────────── */

test('respostas.js conhece todo status que o banco aceita para quero_participar', () => {
  const checks = [...MIGRATIONS.matchAll(/add constraint quero_participar_status_check check \(status in \(([\s\S]*?)\)\)/g)]
  assert.ok(checks.length > 0, 'sumiu o CHECK de status de quero_participar')
  const doBanco = [...checks[checks.length - 1][1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1])
  assert.ok(doBanco.length >= 6, 'li o CHECK errado: ' + doBanco.join(', '))

  const vocab = RESPOSTAS_JS.match(/quero_participar:\s*\{[\s\S]*?status:\s*\[([^\]]+)\]/)
  assert.ok(vocab, 'não achei o vocabulário de status de quero_participar em respostas.js')
  for (const s of doBanco) {
    assert.ok(vocab[1].includes("'" + s + "'"), 'status fora do filtro do painel: ' + s)
  }
})

/* ─────────────────────────────────────────────────────────────────────────
   get_participantes fica FORA do Promise.all das outras origens — a RPC só
   existe depois de a migration das contas ser aplicada, e um 404 dela não
   pode derrubar as leituras que já funcionam (CLAUDE.md §10.4-b: "toda
   leitura nova que dependa de migration não aplicada segue a mesma regra").
   Porta a mesma trava que tests/organizacao.test.mjs tinha antes do corte
   para painel-app, agora contra o código real das três vistas que chamam
   get_participantes.
   ───────────────────────────────────────────────────────────────────────── */

test('listar as marcas não pode derrubar as outras origens', () => {
  // Mesa.jsx e Producao.jsx carregam get_participantes JUNTO de outra(s)
  // origem(s) que não dependem da migration das contas (a mesa lê
  // quero_participar; produção lê pedidos/arquivos/sessões) — para essas,
  // get_participantes tem que estar FORA do Promise.all que busca o resto,
  // com try/catch próprio, senão um 404 dela derruba a vista inteira.
  // Marcas.jsx fica de fora: lá get_participantes é a ÚNICA origem da vista,
  // então agrupá-la com admin_ping (que só confere a senha) é o desenho
  // correto, não a regressão que este teste procura.
  for (const [nome, txt] of [['Mesa.jsx', MESA_JSX], ['Producao.jsx', PRODUCAO_JSX]]) {
    const semComent = semComentarios(txt)
    assert.match(semComent, /get_participantes/, nome + ': não chama mais get_participantes — atualize este teste se a vista mudou de forma')

    const blocos = [...semComent.matchAll(/Promise\.all\(\[([\s\S]*?)\]\)/g)]
    assert.ok(blocos.length > 0, nome + ': não achei nenhum Promise.all')
    for (const bloco of blocos) {
      assert.ok(!/get_participantes/.test(bloco[1]),
        nome + ': get_participantes voltou para dentro de um Promise.all — um 404 dela (migration não aplicada) derrubaria as outras leituras junto')
    }
    // E precisa ter o próprio try/catch, não propagar erro pro catch de fora.
    const chamada = semComent.indexOf('get_participantes')
    const proximoTry = semComent.lastIndexOf('try', chamada)
    assert.ok(proximoTry > -1, nome + ': get_participantes sem try/catch próprio')
  }

  // Respostas.jsx não lê get_participantes hoje (só abre a ficha de acesso
  // por resultado de erro da Edge Function, não por pré-carregar a lista) —
  // se um dia passar a ler, cai na mesma regra acima.
  assert.ok(!/get_participantes/.test(semComentarios(RESPOSTAS_JSX)),
    'Respostas.jsx passou a chamar get_participantes — inclua-a no laço acima em vez de deixar sem a trava')
})

test('as três origens de respostas.js têm nome de RPC e vocabulário com o status inicial', () => {
  for (const rpc of ['get_quero_participar', 'get_support_interests', 'get_contact_requests']) {
    assert.ok(RESPOSTAS_JS.includes(rpc), 'origem sem RPC de leitura: ' + rpc)
  }
  const origens = [...RESPOSTAS_JS.matchAll(/status:\s*\[([^\]]*)\]/g)].map((m) => m[1])
  assert.equal(origens.length, 3, 'esperava três vocabulários de status, achei ' + origens.length)
  origens.forEach((v, i) => assert.ok(v.includes("'novo'"), 'vocabulário ' + i + ' sem o status inicial'))
})
