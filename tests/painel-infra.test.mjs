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

// `semComentarios` é pra JS/TS (/* */ e //) — SQL usa `--`. Migration nova
// (20260827_fase1_funcoes_organizacao.sql) tem comentário explicando uma
// decisão em aberto e citando, como exemplo, a própria linha que o teste
// abaixo teria que rejeitar se estivesse no SQL de verdade.
const semComentariosSql = (fonte) => fonte.replace(/--[^\n]*/g, '')

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
const EDGE_REGERAR = ler('supabase/functions/regerar-senha-conta/index.ts')
const PUSH = ler('supabase/functions/enviar-push/index.ts')
const EDGE_ACESSO_CODIGO = semComentarios(EDGE_ACESSO)

const MARCA_ACCESS = ler('src/lib/marcaAccess.js')
const MARCA_ACCESS_CODIGO = semComentarios(MARCA_ACCESS)
const ORG_ACCESS = ler('src/lib/orgAccess.js')
const ORG_ACCESS_CODIGO = semComentarios(ORG_ACCESS)

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
const APP_JSX = ler('painel-app/src/App.jsx')
const DEFINIR_SENHA_JSX = ler('painel-app/src/components/DefinirSenha.jsx')
const LOGIN_ORG_JSX = ler('painel-app/src/components/LoginOrganizacao.jsx')

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
  // A grade da organização é DINÂMICA desde a Fase 3 (Equipe some pra quem
  // não tem acesso.gerir, a grade encolhe de 5 pra 4) — o fallback da
  // variável CSS é que tem que bater com DESTINOS_ORG, não um repeat() fixo.
  assert.ok(PAINEL_CSS.includes('grid-template-columns:repeat(var(--og-cols,' + DESTINOS_ORG + '),1fr)'),
    'a grade da barra de abas da organização não tem fallback de ' + DESTINOS_ORG + ' colunas')
  assert.ok(PAINEL_CSS.includes('width:calc(100% / var(--og-cols,' + DESTINOS_ORG + '))'),
    'o indicador da barra da organização não mede 1/' + DESTINOS_ORG + ' de fallback')
  assert.ok(PAINEL_CSS.includes('grid-template-columns:repeat(' + DESTINOS_MARCA + ',1fr)'),
    'a grade da barra de abas da marca não tem ' + DESTINOS_MARCA + ' colunas')
})

test("PainelShell filtra 'equipe' da navegação pra quem não tem acesso.gerir, e ajusta --og-cols junto", () => {
  const semC = semComentarios(PAINEL_SHELL_JSX)
  assert.match(semC, /DESTINOS\.filter\(\(d\) => d !== 'equipe'\)/)
  assert.match(semC, /'--og-cols': visiveis\.length/)
  assert.match(semC, /pode\('acesso\.gerir'\)/)
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

test('as outras duas Edge Functions que geram credencial também usam CSPRNG, nunca Math.random', () => {
  // criar-conta-organizacao e regerar-senha-conta entregam senha por
  // mensagem, igual a criar-acesso-marca — mesma régua, sem exceção.
  for (const [nome, txt] of [['criar-conta-organizacao', EDGE_CONTA], ['regerar-senha-conta', EDGE_REGERAR]]) {
    assert.match(txt, /crypto\.getRandomValues/, nome + ': falta crypto.getRandomValues')
    assert.ok(!/Math\.random/.test(semComentarios(txt)), nome + ': há Math.random na geração de credenciais')
  }
})

test('regerar-senha-conta religa a trava ANTES de trocar a senha no Auth', () => {
  // Ordem, não só presença: se a trava falhar DEPOIS de updateUserById, a
  // conta fica com senha nova que ninguém recebeu (irreversível — ao
  // contrário da criação de conta, aqui não há "desfazer" a senha antiga).
  // Checar só a posição de "senha: novaSenha" (a resposta final) não pegaria
  // essa mutação — a trava continuaria "antes do return" mesmo com a ordem
  // errada entre ela e updateUserById. O par certo é ESTE.
  const semC = semComentarios(EDGE_REGERAR)
  const posTrava = semC.indexOf('deve_trocar_senha: true')
  const posUpdate = semC.indexOf('updateUserById')
  assert.ok(posTrava > -1 && posUpdate > -1, 'faltou a trava ou a troca de senha no Auth')
  assert.ok(posTrava < posUpdate, 'a trava tem que religar ANTES de updateUserById — se essa chamada falhar depois, a senha antiga continua funcionando')
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

test('nenhuma chave de serviço nas três Edge Functions de conta', () => {
  ;[EDGE_CONTA, EDGE_ARQ, EDGE_REGERAR].forEach((f) => {
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
  // A tela mudou de Equipe.jsx pra Producao.jsx na Fase 3 do plano de
  // funções (achado de revisão adversarial: governada por producao.gerir,
  // não por acesso.gerir) — ver o teste dedicado logo abaixo pra essa
  // mudança. Aqui só confirma que ELA EXISTE em algum lugar vivo.
  assert.match(PRODUCAO_JSX, /definir_edicao_atual/, 'sem esta tela, abrir edição é rodar SQL à mão')
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

/* ─────────────────────────────────────────────────────────────────────────
   Nenhum arquivo vivo cita um teste apagado no corte
   ───────────────────────────────────────────────────────────────────────── */

function arquivosEm(dirRel) {
  const raiz = new URL('../' + dirRel + '/', import.meta.url)
  const nomes = readdirSync(raiz, { recursive: true })
  return nomes
    .filter((n) => /\.(js|jsx|mjs|ts|css|sql|json|html|md)$/.test(n))
    .map((n) => dirRel + '/' + n.replace(/\\/g, '/'))
}

/* ─────────────────────────────────────────────────────────────────────────
   Fase 1 do plano de funções da organização (27/08/2026) — minhas_permissoes,
   relatorio.ler e regerar-senha-conta. Nenhuma das duas migrations abaixo
   está aplicada; estes testes cobrem o TEXTO, do mesmo jeito que o resto
   deste arquivo cobre migrations não aplicadas.
   ───────────────────────────────────────────────────────────────────────── */

const MIG_FASE1_ORG = ler('supabase/migrations/20260827_fase1_funcoes_organizacao.sql')
const MIG_FASE2_ATOR = ler('supabase/migrations/20260827_fase2_marcar_senha_trocada_ator_rotulo.sql')

const RELATORIOS_SENSIVEIS = [
  'get_audit_report', 'get_suspicious_votes', 'get_pesquisa_report',
  'get_feedback_report', 'get_rankings_admin',
]
const RELATORIOS_COMUNS = [
  'get_contact_requests', 'get_feedback_admin', 'get_organizacao_resumo',
  'get_participation_interests', 'get_quero_participar', 'get_support_interests',
]

test('relatorio.ler nasce só pra administrador — se Curadoria também entrar, é decisão de quem aplica, não desta migration', () => {
  const semC = semComentariosSql(MIG_FASE1_ORG)
  assert.match(semC, /insert into public\.permissoes[\s\S]{0,80}'administrador', 'relatorio\.ler'/)
  // A menção a curadoria no COMENTÁRIO (sugestão de linha a acrescentar) é
  // esperada — o que não pode é aparecer no SQL que de fato roda.
  assert.ok(!/'curadoria', 'relatorio\.ler'/.test(semC), 'curadoria não deveria ganhar relatorio.ler sem decisão explícita')
})

test('os 5 relatórios sensíveis mapeiam pra relatorio.ler, os outros 6 pra dado.ler, 11 no total — nenhum a mais nem a menos', () => {
  const arr = MIG_FASE1_ORG.match(/v_esperados constant text\[\] := array\[([\s\S]*?)\];/)
  assert.ok(arr, 'não achei o array v_esperados na migration')
  const nomes = [...arr[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1])
  assert.equal(nomes.length, 11, 'esperava 11 nomes em v_esperados, achei ' + nomes.length)
  assert.deepEqual([...nomes].sort(), [...RELATORIOS_SENSIVEIS, ...RELATORIOS_COMUNS].sort())

  for (const nome of RELATORIOS_SENSIVEIS) {
    assert.match(MIG_FASE1_ORG, new RegExp("when '" + nome + "'\\s+then 'relatorio\\.ler'"), nome + ' devia mapear pra relatorio.ler')
  }
  // Os "comuns" não têm when próprio — caem no else 'dado.ler'. Confirma que
  // NENHUM deles ganhou um when acidental pra relatorio.ler.
  for (const nome of RELATORIOS_COMUNS) {
    assert.ok(!new RegExp("when '" + nome + "'\\s+then 'relatorio\\.ler'").test(MIG_FASE1_ORG),
      nome + ' não deveria mapear pra relatorio.ler')
  }
})

test('a uniformização de guard aborta se algum dos 11 nomes faltar ou o guard não aparecer 1x — mesma técnica de contas_organizacao_por_funcao', () => {
  assert.match(MIG_FASE1_ORG, /<>\s*1\s+then\s+raise exception/, 'falta a checagem de exatamente 1 ocorrência do guard por função')
  assert.match(MIG_FASE1_ORG, /v_trocas <> 11[\s\S]{0,80}then\s+raise exception/, 'falta a checagem de que as 11 trocas aconteceram')
  assert.match(MIG_FASE1_ORG, /distinct unnest\(v_nomes_trocados\)/, 'a contagem final tem que ser por nome distinto, não por linha do loop — sobrecarga de função não pode mascarar um nome faltando')
  assert.ok(!/pode_organizacao\(p_secret\)[\s\S]{0,200}\$\$;\s*\n\s*create/.test(semComentariosSql(MIG_FASE1_ORG)),
    'parece haver corpo de função copiado — a técnica é reescrever a partir de pg_get_functiondef, não colar o corpo')
})

test('minhas_permissoes() é security definer, resolve por auth.uid() sem p_secret, e fecha pra anon', () => {
  const semC = semComentariosSql(MIG_FASE1_ORG)
  assert.match(semC, /create or replace function public\.minhas_permissoes\(\)/)
  assert.match(semC, /minhas_permissoes[\s\S]{0,400}security definer/)
  // A explicação em comentário cita p_secret conceitualmente (é assunto do
  // parágrafo) — o que a checagem real precisa é o CÓDIGO não declarar o
  // parâmetro: a assinatura tem que ser exatamente "()".
  assert.match(semC, /create or replace function public\.minhas_permissoes\(\)\s*\n\s*returns table/,
    'minhas_permissoes não deveria receber nenhum argumento, incluindo p_secret')
  assert.match(semC, /pf\.user_id = auth\.uid\(\)/)
  assert.match(semC, /revoke all on function public\.minhas_permissoes\(\) from public, anon/)
  assert.match(semC, /grant execute on function public\.minhas_permissoes\(\) to authenticated/)
})

test('regerar-senha-conta autoriza (acesso.gerir) antes de tocar no Auth, e só reseta conta de organização', () => {
  const semC = semComentarios(EDGE_REGERAR)
  const posAutoriza = semC.indexOf("p_acao: 'acesso.gerir'")
  const posUpdate = semC.indexOf('updateUserById')
  assert.ok(posAutoriza > -1 && posUpdate > -1, 'faltou a chamada de guard ou o update de senha')
  assert.ok(posAutoriza < posUpdate, 'o guard tem que rodar ANTES de mexer no Auth')

  assert.match(semC, /papel !== 'organizacao'/, 'precisa recusar conta que não é de organização')
  // A senha não fica em lugar nenhum além do hash do Auth — nunca grava a
  // VARIÁVEL da senha em tabela. Recorta só o CORPO de cada `.insert({...})`
  // (não uma janela de N caracteres, que vazaria pro `return json(...)`
  // seguinte, onde `novaSenha` aparece de propósito na resposta).
  const chamadasInsert = [...semC.matchAll(/\.insert\(\{[\s\S]*?\}\)/g)].map((m) => m[0])
  assert.ok(chamadasInsert.length > 0, 'não achei nenhum .insert({...}) pra conferir')
  for (const chamada of chamadasInsert) {
    assert.ok(!/novaSenha|senhaInicial/.test(chamada), 'a senha não deveria ser gravada em nenhuma tabela: ' + chamada)
  }
  assert.match(semC, /deve_trocar_senha: true/, 'precisa religar a trava de primeiro uso')
})

test('nenhum arquivo vivo cita um teste apagado no corte (tests/marca.test.mjs, tests/painel.test.mjs, tests/organizacao.test.mjs)', () => {
  const apagados = ['tests/marca.test.mjs', 'tests/painel.test.mjs', 'tests/organizacao.test.mjs']
  const alvos = [...arquivosEm('src'), ...arquivosEm('painel-app'), ...arquivosEm('supabase')]
  const achados = []
  for (const rel of alvos) {
    const txt = ler(rel)
    for (const apagado of apagados) {
      if (txt.includes(apagado)) achados.push(rel + ' cita ' + apagado)
    }
  }
  assert.deepEqual(achados, [], 'arquivo apagado ainda citado:\n' + achados.join('\n'))
})

/* ─────────────────────────────────────────────────────────────────────────
   Fase 2 do plano de funções da organização (27/08/2026) — login nominal,
   convivendo com a senha única. rpc.js/orgAccess.js têm cobertura de
   comportamento em tests/painel-app-rpc.test.mjs e tests/orgAccess.test.mjs;
   aqui são invariantes de FIAÇÃO entre os arquivos, no espírito do resto
   deste arquivo.
   ───────────────────────────────────────────────────────────────────────── */

test('orgAccess.js não reimplementa o login por senha, nem slugifica o e-mail', () => {
  assert.ok(!/grant_type=password/.test(ORG_ACCESS_CODIGO), 'orgAccess.js chamou a rede direto em vez de reusar signInComSenha')
  assert.ok(!/normalize\('NFD'\)/.test(ORG_ACCESS_CODIGO), 'orgAccess.js não deveria ter a regex de slugificação — o e-mail da equipe é real, sem domínio sintético')
})

test('LoginOrganizacao.jsx oferece as duas portas — senha única E conta nominal', () => {
  assert.match(LOGIN_ORG_JSX, /entrarNaOrganizacao/)
  assert.match(LOGIN_ORG_JSX, /entrarComoContaOrganizacao/)
  assert.match(LOGIN_ORG_JSX, /onEntrarConta/)
})

test('DefinirSenha.jsx foi generalizado — não importa mais nada de marcaAccess.js nem marcarSenhaTrocada fixo', () => {
  const semC = semComentarios(DEFINIR_SENHA_JSX)
  assert.ok(!/marcaAccess/.test(semC), 'DefinirSenha.jsx voltou a importar direto de marcaAccess.js — quebra o uso pela organização')
  assert.ok(!/marcarSenhaTrocada/.test(semC), 'DefinirSenha.jsx voltou a chamar marcarSenhaTrocada() fixo — quebra o uso pela organização')
  assert.match(semC, /chaveSessao/)
  assert.match(semC, /aoMarcarTrocada/)
})

test('App.jsx passa a chave de sessão CERTA pra cada DefinirSenha — não troca uma pela outra', () => {
  const semC = semComentarios(APP_JSX)
  const blocoMarca = semC.match(/estado === 'definir-senha'\)\s*\{[\s\S]*?\n  \}/)
  const blocoOrg = semC.match(/estado === 'definir-senha-org'\)\s*\{[\s\S]*?\n  \}/)
  assert.ok(blocoMarca && blocoOrg, 'não achei os dois blocos de DefinirSenha em App.jsx')
  assert.match(blocoMarca[0], /chaveSessao=\{CHAVE_SESSAO_MARCA\}/)
  assert.match(blocoOrg[0], /chaveSessao=\{CHAVE_SESSAO_ORG_CONTA\}/)
  assert.ok(!/CHAVE_SESSAO_ORG_CONTA/.test(blocoMarca[0]), 'bloco da marca não pode usar a chave da conta de organização')
  assert.ok(!/CHAVE_SESSAO_MARCA/.test(blocoOrg[0]), 'bloco da organização não pode usar a chave da marca')
})

test("'conferindo-org': sessão morta chama sairOrg e NÃO sobrescreve com setEstado depois", () => {
  const semC = semComentarios(APP_JSX)
  const bloco = semC.match(/estado !== 'conferindo-org'\) return[\s\S]*?return \(\) => \{ cancelado = true \}/)
  assert.ok(bloco, 'não achei o efeito de conferindo-org')
  const corpo = bloco[0]
  const posSessaoExpirada = corpo.indexOf("'sessao_expirada'")
  const posSairOrg = corpo.indexOf('sairOrg()', posSessaoExpirada)
  assert.ok(posSessaoExpirada > -1 && posSairOrg > -1 && posSairOrg > posSessaoExpirada,
    "sessao_expirada tem que chamar sairOrg() no mesmo bloco 'if'")
  // Depois de chamar sairOrg(), tem que RETORNAR — não pode cair pra um
  // setEstado('painel-org'/'definir-senha-org') logo depois, que sobrescreveria
  // o 'boas-vindas' que sairOrg() acabou de aplicar.
  const restoAposSairOrg = corpo.slice(posSairOrg, posSairOrg + 40)
  assert.match(restoAposSairOrg, /sairOrg\(\);\s*return/)
})

test('rpc.js só zera p_secret quando o chamador já mandou essa chave — nunca acrescenta em corpo vazio', () => {
  assert.match(semComentarios(RPC_JS), /'p_secret' in corpo/)
})

/* ─────────────────────────────────────────────────────────────────────────
   Achados da revisão adversarial da Fase 2 — corrigidos na mesma leva.
   ───────────────────────────────────────────────────────────────────────── */

test('estadoInicial checa a conta nominal ANTES da senha única — mesma ordem de prioridade que rpc.js usa pras requisições', () => {
  const semC = semComentarios(APP_JSX)
  const bloco = semC.match(/function estadoInicial\(\)[\s\S]*?\n\}/)
  assert.ok(bloco, 'não achei estadoInicial()')
  const posOrgConta = bloco[0].indexOf('CHAVE_SESSAO_ORG_CONTA')
  const posOrg = bloco[0].indexOf("getItem(CHAVE_SESSAO_ORG)")
  assert.ok(posOrgConta > -1 && posOrg > -1, 'não achei as duas checagens de sessão de organização')
  assert.ok(posOrgConta < posOrg, 'a UI (estadoInicial) tem que concordar com rpc.js sobre qual sessão de organização manda quando as duas coexistem')
})

test("conferindo-org: conjunto vazio ou conta inativa NÃO entra em painel-org — vai pra 'bloqueado-org'", () => {
  const semC = semComentarios(APP_JSX)
  const bloco = semC.match(/estado !== 'conferindo-org'\) return[\s\S]*?return \(\) => \{ cancelado = true \}/)
  assert.ok(bloco, 'não achei o efeito de conferindo-org')
  const corpo = bloco[0]
  assert.match(corpo, /linhas\.length === 0[\s\S]{0,60}'bloqueado-org'/, "conjunto vazio (não é conta de organização) tinha que virar 'bloqueado-org', não 'painel-org'")
  assert.match(corpo, /ativo === false[\s\S]{0,60}'bloqueado-org'/, "conta suspensa (ativo:false) tinha que virar 'bloqueado-org'")
})

test('conferindo-org: falha de rede (não sessão morta) entra no painel SEM assumir acesso total — achado de revisão adversarial', () => {
  // null (o default) é lido por PainelShell como "senha única, tudo
  // liberado". Uma sessão NOMINAL cujas permissões falharam de carregar por
  // rede não pode herdar esse sentido — []  deixa entrar sem permissão
  // nenhuma assumida, em vez de mentir pro lado mais permissivo.
  const semC = semComentarios(APP_JSX)
  const bloco = semC.match(/estado !== 'conferindo-org'\) return[\s\S]*?return \(\) => \{ cancelado = true \}/)
  assert.ok(bloco, 'não achei o efeito de conferindo-org')
  const posCatch = bloco[0].indexOf('}).catch(')
  const trechoCatch = bloco[0].slice(posCatch)
  assert.match(trechoCatch, /setAcoesPermitidas\(\[\]\)/, 'a falha de rede precisa zerar acoesPermitidas pra [], não deixar em null')
})

test('sairOrg() apaga as DUAS chaves de sessão de organização', () => {
  const semC = semComentarios(APP_JSX)
  const bloco = semC.match(/function sairOrg\(\)[\s\S]*?\n  \}/)
  assert.ok(bloco, 'não achei sairOrg()')
  assert.match(bloco[0], /removeItem\(CHAVE_SESSAO_ORG\)/)
  assert.match(bloco[0], /removeItem\(CHAVE_SESSAO_ORG_CONTA\)/)
})

test('marcar_senha_trocada() lê o papel de verdade da linha, não crava "marca" à mão', () => {
  assert.match(MIG_FASE2_ATOR, /returning papel into v_papel/)
  assert.match(MIG_FASE2_ATOR, /coalesce\(v_papel, 'marca'\)/)
  // O literal solto (sem vir de v_papel) é o bug original — não pode reaparecer aqui.
  assert.ok(!/values \(auth\.uid\(\), 'marca',/.test(semComentariosSql(MIG_FASE2_ATOR)),
    "'marca' não pode voltar a ser cravado direto no insert de auditoria")
})

/* ─────────────────────────────────────────────────────────────────────────
   Fase 3 do plano de funções da organização — a UI reflete o que a sessão
   pode fazer. Mapa (plano, item 2): Mesa/Respostas → triagem.editar, apagar
   → registro.apagar; Marcas → marca.liberar; Produção → producao.gerir;
   Equipe some inteira sem acesso.gerir (já coberto acima, na seção de
   PainelShell). "UI é conveniência, não segurança" — estes testes conferem
   só que a UI PEDE a ação certa, nunca que ela é a única barreira (isso
   quem garante é o guard da RPC, testado em outro lugar).
   ───────────────────────────────────────────────────────────────────────── */

test('Respostas.jsx: salvar pede triagem.editar, criar acesso pede marca.liberar, apagar pede registro.apagar', () => {
  const semC = semComentarios(RESPOSTAS_JSX)
  assert.match(semC, /disabled=\{salvando \|\| !pode\('triagem\.editar'\)\}/)
  assert.match(semC, /disabled=\{naoAprovado \|\| criandoAcesso \|\| !pode\('marca\.liberar'\)\}/)
  assert.match(semC, /disabled=\{apagando \|\| !pode\('registro\.apagar'\)\}/)
  // As três têm título explicativo quando desabilitadas (D4 do plano —
  // desabilitar com explicação, não sumir o controle).
  assert.equal((semC.match(/title=\{pode\(/g) || []).length, 3, 'esperava 3 títulos explicativos em Respostas.jsx')
  // ⚠️ `title` sozinho não basta: botão disabled tem pointer-events:none no
  // CSS, então a tooltip nunca é alcançada por mouse OU teclado (achado de
  // revisão adversarial). Texto VISÍVEL é a explicação de verdade.
  assert.equal((semC.match(/!pode\('(triagem\.editar|marca\.liberar|registro\.apagar)'\) && <p/g) || []).length, 3,
    'esperava 3 notas VISÍVEIS (não só title) em Respostas.jsx')
})

test('Marcas.jsx: cadastrar marca (abrir e criar) pede marca.liberar', () => {
  const semC = semComentarios(MARCAS_JSX)
  assert.match(semC, /disabled=\{!pode\('marca\.liberar'\)\}/, 'faltou gate no botão que ABRE o cadastro')
  assert.match(semC, /disabled=\{manCriando \|\| manCriada \|\| !pode\('marca\.liberar'\)\}/, 'faltou gate no botão que CRIA a marca')
  assert.match(semC, /!pode\('marca\.liberar'\) && <p/, 'falta nota VISÍVEL (title sozinho não é alcançável em botão disabled)')
})

test('Producao.jsx: toda escrita pede producao.gerir — vaga, pedido, publicar, quem falta, arquivo, sessão', () => {
  const semC = semComentarios(PRODUCAO_JSX)
  assert.match(semC, /const podeGerir = pode\('producao\.gerir'\)/)
  // 16 controles de escrita nesta vista: clicarSlot (guard de função) + slot
  // da agenda + 3 pares trigger/submit (pedido, arquivo, sessão nova) + mudar
  // sessão (trigger + salvar) + publicar pedido + dar por respondido + a
  // edição aberta (campo, salvar, fechar — movida de Equipe.jsx, achado de
  // revisão adversarial) + o banner visível do topo. Número EXATO de
  // propósito — uma contagem "pelo menos N" não pega UM controle esquecido
  // (confirmado por mutação: tirar 1 dos 12 originais não derrubava o teste
  // quando o piso era "pelo menos 9").
  const ocorrencias = (semC.match(/!podeGerir/g) || []).length
  assert.equal(ocorrencias, 16, 'esperava exatamente 16 usos de !podeGerir em Producao.jsx, achei ' + ocorrencias)
  // Texto VISÍVEL, não só title — botão disabled não recebe hover/foco de
  // teclado (pointer-events:none no CSS), achado de revisão adversarial.
  assert.match(semC, /!podeGerir && \(/, 'falta o banner visível de "sua função não gerencia produção"')
  // "Baixar" arquivo é LEITURA — não pode ficar preso atrás de producao.gerir,
  // senão Consulta (só dado.ler) não conseguiria nem baixar o que já foi
  // publicado.
  assert.ok(!/baixarArquivo[\s\S]{0,80}podeGerir/.test(semC), 'baixar arquivo não deveria depender de producao.gerir')
})

test('a edição aberta mora em Producao.jsx (producao.gerir), não em Equipe.jsx (acesso.gerir) — achado de revisão adversarial', () => {
  // Equipe inteira some da navegação pra quem não tem acesso.gerir
  // (PainelShell), mas quem abre/fecha edição precisa só de producao.gerir
  // — uma conta de função "produção" tinha essa ação e nunca via Equipe,
  // ficando sem como abrir a edição que a própria agenda dela exige.
  const semEquipe = semComentarios(EQUIPE_JSX)
  const semProducao = semComentarios(PRODUCAO_JSX)
  assert.ok(!/definir_edicao_atual/.test(semEquipe), 'Equipe.jsx não deveria mais chamar definir_edicao_atual')
  assert.ok(!/codigoEdicao/.test(semEquipe), 'Equipe.jsx não deveria mais ter estado de edição')
  assert.match(semProducao, /definir_edicao_atual/, 'Producao.jsx precisa gerenciar a edição aberta')
  assert.match(semProducao, /codigoEdicao/)
})

test('Mesa.jsx continua sem nenhum controle de escrita — nada a gatear nesta vista', () => {
  // Mesa é kanban de leitura (colunasMesa) — os cartões não têm onClick. Se
  // algum dia ganharem um, a Fase 3 do plano pede triagem.editar aqui
  // também (mesma ação de Respostas) — este teste é o lembrete.
  const semC = semComentarios(MESA_JSX)
  assert.ok(!/onClick=\{.*\}[\s\S]{0,40}og-cartao/.test(semC) && !/className="og-cartao"[\s\S]{0,120}onClick=/.test(semC),
    'og-cartao ganhou onClick — se virou escrita, precisa de pode(\'triagem.editar\') igual Respostas.jsx')
})

/* ─────────────────────────────────────────────────────────────────────────
   Fase 4 do plano de funções da organização (28/08/2026) — "as Edge
   Functions aprendem JWT". As cinco funções de conta ganham uma segunda
   porta: sem `secret` no corpo, aceitam o JWT da sessão nominal no cabeçalho
   Authorization, validado por admin.auth.getUser() e resolvido pela nova RPC
   pode_por_user(). Escopo estendido além dos "três" do plano original: o
   próprio plano listava só criar-conta-organizacao/arquivo-url/enviar-push,
   mas regerar-senha-conta (mesma ação e mesmo formato de guard de
   criar-conta-organizacao) e criar-acesso-marca (guardada até aqui só por
   admin_ok, sem ação nenhuma) ficariam inconsistentes se deixadas de fora —
   a segunda em especial: marca.liberar é a ÚNICA escrita de Curadoria, e sem
   este arquivo ela continuaria 401 pra qualquer sessão nominal mesmo depois
   da Fase 3 ter liberado o botão na tela.
   ───────────────────────────────────────────────────────────────────────── */

test('pode_por_user espelha a perna nominal de pode() — mesma tabela, mesmo filtro, por parâmetro em vez de auth.uid()', () => {
  const semC = semComentariosSql(MIGRATIONS)
  assert.match(semC, /create or replace function public\.pode_por_user\(p_user uuid, p_acao text\)/)
  assert.match(semC, /pode_por_user[\s\S]{0,200}security definer/)
  assert.match(semC, /pode_por_user[\s\S]{0,400}pf\.user_id = p_user[\s\S]{0,200}pf\.papel = 'organizacao'[\s\S]{0,100}pm\.acao = p_acao/)
  // As três roles na MESMA linha de revoke — CLAUDE.md §4.1: separadas, uma
  // das duas listas concede EXECUTE por padrão e a outra revogação não pega.
  assert.match(semC, /revoke execute on function public\.pode_por_user\(uuid, text\) from public, anon, authenticated/)
})

function assertPortasDuasVias(nome, fonte, acao) {
  // `acao` pode ser um literal ('acesso.gerir') ou o nome de uma variável
  // (arquivo-url usa `acaoNecessaria`, resolvida em runtime) — ambos batem
  // com a mesma regex porque não exige aspas.
  const semC = semComentarios(fonte)
  assert.match(semC, new RegExp("admin\\.rpc\\('pode_por_user',\\s*\\{\\s*p_user:\\s*userRes\\.user\\.id,\\s*p_acao:\\s*" + acao + "\\s*\\}\\)"),
    nome + ': falta a chamada a pode_por_user com a ação certa')
  assert.match(semC, /admin\.auth\.getUser\(jwt\)/, nome + ': falta validar o JWT recebido')
  assert.match(semC, /req\.headers\.get\('Authorization'\)/, nome + ': falta ler o cabeçalho Authorization')
  // A perna do secret continua existindo e continua sendo tentada primeiro
  // (if (secret) { ... } else { ... jwt ... }) — Fase 4 é ADITIVA, nunca
  // troca a senha única por JWT.
  const posIfSecret = semC.indexOf('if (secret)')
  const posJwt = semC.indexOf('admin.auth.getUser(jwt)')
  assert.ok(posIfSecret > -1 && posJwt > -1 && posIfSecret < posJwt,
    nome + ': o caminho do secret precisa vir ANTES do caminho do JWT, não substituí-lo')
}

test('criar-conta-organizacao aceita JWT nominal além do secret, sem perder a ação acesso.gerir', () => {
  assertPortasDuasVias('criar-conta-organizacao', EDGE_CONTA, "'acesso\\.gerir'")
})

test('regerar-senha-conta aceita JWT nominal além do secret, sem perder a ação acesso.gerir', () => {
  assertPortasDuasVias('regerar-senha-conta', EDGE_REGERAR, "'acesso\\.gerir'")
})

test('enviar-push aceita JWT nominal além do secret, sem perder a ação producao.gerir', () => {
  assertPortasDuasVias('enviar-push', PUSH, "'producao\\.gerir'")
})

test('arquivo-url aceita JWT nominal além do secret, com a MESMA ação calculada (subir=producao.gerir, baixar=dado.ler)', () => {
  assertPortasDuasVias('arquivo-url', EDGE_ARQ, 'acaoNecessaria')
  // A variável, não um literal fixo — senão o caminho do JWT poderia liberar
  // upload pra quem só tem dado.ler.
  assert.ok(!/p_acao:\s*'producao\.gerir'/.test(semComentarios(EDGE_ARQ)), 'arquivo-url não deveria ter ação fixa — teria que ser a calculada')
})

test('criar-acesso-marca trocou admin_ok por pode/pode_por_user, ação marca.liberar — a mesma que Marcas.jsx e Respostas.jsx checam', () => {
  const semC = semComentarios(EDGE_ACESSO)
  assert.ok(!/admin_ok/.test(semC), 'criar-acesso-marca ainda chama admin_ok — devia ter migrado pra pode(), que aceita ação')
  assert.match(semC, /admin\.rpc\('pode',\s*\{\s*p_secret:\s*secret,\s*p_acao:\s*'marca\.liberar'\s*\}\)/,
    'o caminho do secret precisa continuar aceitando a senha única, agora via pode()')
  assertPortasDuasVias('criar-acesso-marca', EDGE_ACESSO, "'marca\\.liberar'")
})

test('chamarFuncao() também tem duas portas — não fica preso na chave publicável quando existe sessão nominal', () => {
  const semC = semComentarios(RPC_JS)
  const corpo = semC.slice(semC.indexOf('export async function chamarFuncao'))
  assert.ok(corpo.length > 0, 'não achei chamarFuncao em rpc.js')
  assert.match(corpo.slice(0, 400), /const modo = await modoDeAcesso\(fetchImpl\)/,
    'chamarFuncao precisa decidir o modo de acesso, igual rpc() já faz')
  assert.match(corpo.slice(0, 400), /Authorization:\s*modo\.authorization/,
    'chamarFuncao ainda manda a chave publicável fixa — sessão nominal nunca chegaria como JWT na Edge Function')
  assert.ok(!/Authorization:\s*'Bearer '\s*\+\s*SUPABASE_KEY/.test(corpo.slice(0, 400)),
    'sobrou o Authorization fixo antigo dentro de chamarFuncao')
})

test('as cinco funções distinguem falha de rede do serviço de auth de token inválido — achado de revisão adversarial', () => {
  // gotrue-js não lança em falha de rede: devolve { data: { user: null },
  // error } (AuthRetryableFetchError). Sem capturar esse `error`, um blip do
  // serviço de auth virava 401 "sessão não vale mais", indistinguível de
  // token realmente inválido — mesma classe do commit 6374f84 (distingue
  // sessão morta de falha de rede).
  for (const [nome, fonte] of [
    ['criar-conta-organizacao', EDGE_CONTA], ['regerar-senha-conta', EDGE_REGERAR],
    ['arquivo-url', EDGE_ARQ], ['enviar-push', PUSH], ['criar-acesso-marca', EDGE_ACESSO],
  ]) {
    const semC = semComentarios(fonte)
    assert.match(semC, /const \{ data: userRes, error: jwtErr \} = jwt \? await admin\.auth\.getUser\(jwt\) : \{ data: null, error: null \}/,
      nome + ': getUser precisa capturar o error, não só o data')
    assert.match(semC, /jwtErr\.name === 'AuthRetryableFetchError'[\s\S]{0,80}503/,
      nome + ': falha de rede do auth precisa virar 503, não cair muda pro 401 de token inválido')
  }
})
