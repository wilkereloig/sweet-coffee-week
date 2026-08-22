/*
 * O painel /organizacao é estático: o JS mora inline no HTML e NÃO passa pelo
 * build do Vite. `npm run build` fica verde com o script quebrado — a mesma
 * armadilha que já deixou uma função apagada chegar ao commit em
 * /quero-participar. Estas checagens cobrem esse vão.
 *
 * Rodar: node --test tests/organizacao.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const HTML = readFileSync(new URL('../public/organizacao/index.html', import.meta.url), 'utf8')
const SCRIPTS = [...HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])
const JS = SCRIPTS[0] || ''
const MIGRATION = readFileSync(
  new URL('../supabase/migrations/20260822_contas_marcas.sql', import.meta.url), 'utf8')
const EDGE = readFileSync(
  new URL('../supabase/functions/criar-acesso-marca/index.ts', import.meta.url), 'utf8')

// A lista real de destinos, lida do script — nada de repetir à mão aqui.
const DESTINOS = JSON.parse(
  (JS.match(/const DESTINOS = (\[[^\]]+\])/) || [, '[]'])[1].replace(/'/g, '"'))

test('o HTML traz exatamente um bloco de script inline', () => {
  assert.equal(SCRIPTS.length, 1)
})

test('o script inline compila', () => {
  assert.doesNotThrow(() => new Function(JS))
})

test('toda função crítica está declarada, não só chamada', () => {
  const declaradas = new Set(
    [...JS.matchAll(/(?:function\s+|const\s+|let\s+)([A-Za-z_$][\w$]*)/g)].map((m) => m[1]))
  const criticas = ['rpc', 'carregar', 'render', 'filtrados', 'todos', 'campo', 'escapar',
                    'abrirDetalhe', 'fecharDetalhe', 'salvar', 'montarAbas', 'montarForms', 'montarFiltroStatus',
                    'mostrarEstado', 'abrirPainel', 'dataCurta', 'soDigitos',
                    // casca de aplicativo (22/08/2026)
                    'irPara', 'montarAbasApp', 'ligarTecladoAbas', 'montarEsqueleto']
  const faltando = criticas.filter((f) => !declaradas.has(f))
  assert.deepEqual(faltando, [], 'função chamada mas nunca declarada: ' + faltando.join(', '))
})

test('nenhuma chave secreta no arquivo', () => {
  // Ele vive em public/: o código-fonte é visível para qualquer visitante.
  // A chave publicável (anon) pode estar aqui; service_role, jamais.
  assert.ok(!/service_role/.test(HTML), 'service_role em arquivo de public/')
  assert.ok(!/\bsb_secret_|\beyJ[\w-]+\.[\w-]+\.[\w-]+/.test(HTML), 'parece haver chave secreta ou JWT no arquivo')
  const m = HTML.match(/SUPABASE_KEY\s*=\s*'([^']*)'/)
  assert.ok(m && m[1].startsWith('sb_publishable_'), 'a chave usada não é a publicável')
})

test('a página pede para não ser indexada', () => {
  assert.match(HTML, /<meta\s+name="robots"\s+content="noindex/, 'falta o meta robots noindex')
})

test('as quatro origens têm RPC de leitura e vocabulário de status', () => {
  for (const rpc of ['get_quero_participar', 'get_participation_interests',
                     'get_support_interests', 'get_contact_requests']) {
    assert.ok(JS.includes(rpc), 'origem sem RPC de leitura: ' + rpc)
  }
  // O select de status por origem não pode ficar vazio: sem vocabulário, o
  // painel oferece "" e a gravação falharia no CHECK da tabela.
  const origens = [...JS.matchAll(/status:\s*\[([^\]]*)\]/g)].map((m) => m[1])
  assert.equal(origens.length, 4, 'esperava quatro vocabulários de status, achei ' + origens.length)
  origens.forEach((v, i) => assert.ok(v.includes("'novo'"), 'vocabulário ' + i + ' sem o status inicial'))
})

test('todo texto vindo do banco passa por escapar()', () => {
  // innerHTML com dado de formulário é XSS armazenado: qualquer pessoa pode
  // enviar <img onerror> pelo site público e executar no navegador da equipe.
  const cru = [...JS.matchAll(/innerHTML\s*=([\s\S]*?);\n/g)].map((m) => m[1])
  const suspeitas = cru.filter((t) => /\breg\.[a-z_]+|o\.titulo\(|o\.meta\(/.test(t) && !/escapar\(/.test(t))
  assert.deepEqual(suspeitas, [], 'dado do banco indo cru para innerHTML')
})

test('não afirma gravação sem o servidor confirmar', () => {
  const guarda = JS.indexOf("if (ok !== true)")
  const sucesso = JS.indexOf("'Salvo.'")
  assert.ok(guarda > -1, 'sumiu a checagem do retorno da RPC de gravação')
  assert.ok(sucesso > guarda, '"Salvo." aparece antes de confirmar a gravação')
})

test('o site tem porta de entrada para o painel', () => {
  // O acesso é pelo cartão "Organização" do diálogo de acesso. Sem esse link a
  // página existe mas ninguém acha: não há menu nem rodapé apontando para ela,
  // de propósito.
  const dialogo = readFileSync(new URL('../src/components/AccessDialog.jsx', import.meta.url), 'utf8')
  // A barra final é o detalhe que decide: sem ela o servidor não resolve o
  // índice do diretório e o clique volta para a home. Medido em vite preview,
  // que é o build de produção: /organizacao → index.html do SPA;
  // /organizacao/ → o painel.
  //
  // ⚠️ Aferir a REGRA, não a sintaxe. Este teste já reprovou uma vez sem haver
  // defeito: procurava `href: '/organizacao/'` porque a entrada era um <a>, e
  // em 22/08/2026 ela virou `window.location.href = '/organizacao/'` depois do
  // admin_ping. O destino continuava certo; só a forma tinha mudado. Agora as
  // duas pontas são medidas — existe a forma com barra, e não existe nenhuma
  // sem —, então qualquer sintaxe futura passa e só a barra ausente reprova.
  assert.match(dialogo, /['"]\/organizacao\/['"]/,
    'o caminho do painel precisa terminar em barra, senão cai no fallback do SPA')
  assert.doesNotMatch(dialogo, /['"]\/organizacao['"]/,
    'há um /organizacao sem barra final — essa forma abre a landing, não o painel')
})

test('as páginas estáticas têm rewrite próprio no vercel.json', () => {
  // Rede de segurança para a forma sem barra em produção: a Vercel checa o
  // sistema de arquivos antes dos rewrites, então /organizacao (que não é
  // arquivo) cai aqui em vez de virar SPA.
  const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
  for (const rota of ['/organizacao', '/quero-participar']) {
    const r = vercel.rewrites.find((x) => x.source === rota)
    assert.ok(r, 'sem rewrite para ' + rota)
    assert.equal(r.destination, rota + '/index.html')
  }
})

test('todo asset absoluto existe em public/', () => {
  const pedidos = [...HTML.matchAll(/(?:url\('|src="|href=")(\/[^"')]+)/g)].map((m) => m[1])
  for (const p of new Set(pedidos)) {
    assert.ok(readFileSync(new URL('../public' + p, import.meta.url)), 'asset ausente: ' + p)
  }
})

/* ─────────────────────────────────────────────────────────────────────────
   Casca de aplicativo — acrescentado em 22/08/2026.

   O que estas checagens protegem não é layout (isso o navegador mostra), e sim
   as três coisas que quebram CALADAS: o escopo do service worker, o cache do
   HTML e o cache de dado pessoal.
   ───────────────────────────────────────────────────────────────────────── */

const SW = readFileSync(new URL('../public/organizacao/sw.js', import.meta.url), 'utf8')
const APP_MANIFEST = JSON.parse(
  readFileSync(new URL('../public/organizacao/app.webmanifest', import.meta.url), 'utf8'))

test('as funções da casca de app estão declaradas', () => {
  // Redundante com a checagem de funções críticas acima, e de propósito: esta
  // nomeia o motivo, então quem apagar uma delas lê "casca de app" no erro.
  for (const f of ['irPara', 'montarAbasApp', 'montarEsqueleto']) {
    assert.match(JS, new RegExp(String.raw`function\s+${f}\s*\(`), 'função não declarada: ' + f)
  }
})

test('o service worker tem escopo próprio e não é da raiz', () => {
  // 🔴 Um SW registrado da raiz passa a interceptar o site inteiro, inclusive a
  // landing que está no ar. Desfazer isso não é deploy: é desregistro no
  // navegador de cada visitante.
  assert.match(JS, /register\(\s*['"]\/organizacao\/sw\.js['"]/, 'SW fora de /organizacao/')
  assert.match(JS, /scope:\s*['"]\/organizacao\/['"]/, 'registro sem scope explícito')
})

test('o manifest do painel tem escopo próprio, com barra final', () => {
  // Sem a barra o escopo vira a raiz e instalar o painel instalaria o site.
  assert.equal(APP_MANIFEST.scope, '/organizacao/')
  assert.equal(APP_MANIFEST.start_url, '/organizacao/')
})

test('os dois manifests não se sobrepõem', () => {
  // São dois apps distintos: /manifest.webmanifest instala o site.
  const site = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'))
  assert.equal(site.scope, '/', 'o manifest do site mudou de escopo')
  assert.notEqual(site.scope, APP_MANIFEST.scope)
})

test('o service worker não cacheia dado do banco', () => {
  // O nome do serviço não pode aparecer nem em comentário: sem o host escrito,
  // não há o que copiar e colar quando alguém for "fazer o offline funcionar".
  assert.ok(!/supabase/i.test(SW), 'o SW menciona o serviço de banco — PII não pode encostar em caches')
  assert.match(SW, /origin\s*!==\s*self\.location\.origin/, 'falta o corte de origem externa')
})

test('o HTML do painel é sempre da rede, nunca do cache', () => {
  // O JS do painel é inline no documento: HTML cacheado congela o painel
  // inteiro numa versão antiga, e a correção só chega quando a pessoa limpa o
  // navegador. O cache ali é socorro de rede caída, não estratégia.
  const navegacao = SW.match(/mode\s*===\s*'navigate'[\s\S]*?\n\s*return;/)
  assert.ok(navegacao, 'o SW não trata navegação explicitamente')
  assert.match(navegacao[0], /respondWith\(\s*\n?\s*fetch\(/, 'navegação não busca a rede primeiro')
})

test('o SW não é cacheado pelo CDN', () => {
  const v = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
  const h = v.headers.find((x) => x.source === '/organizacao/sw.js')
  assert.ok(h, 'sem header de no-store para o service worker')
  assert.match(h.headers[0].value, /no-store/)
})

test('todo destino de DESTINOS tem seção e botão', () => {
  // Derivado do próprio script, não de uma lista escrita à mão aqui: destino
  // novo entra no teste sozinho. Se ele sumir do HTML, irPara() cai no
  // fallback e a aba fica órfã.
  assert.ok(DESTINOS.length >= 3, 'não consegui ler DESTINOS do script')
  for (const v of DESTINOS) {
    assert.match(HTML, new RegExp('id="vista-' + v + '"'), 'falta a seção do destino ' + v)
    assert.match(HTML, new RegExp('data-vista="' + v + '"'), 'falta o botão do destino ' + v)
  }
})

test('a barra de abas tem tantas colunas quanto destinos', () => {
  // ⚠️ Duplicação inevitável: CSS não lê JS, e `repeat()` não recebe valor
  // vindo do script. Acrescentar um destino sem mexer nestas duas linhas deixa
  // a última aba fora da grade e o indicador deslizante na medida errada — e
  // isso não levanta erro nenhum no console.
  const n = DESTINOS.length
  assert.ok(HTML.includes('grid-template-columns:repeat(' + n + ',1fr)'),
    'a grade da barra de abas não tem ' + n + ' colunas')
  assert.ok(HTML.includes('width:calc(100% / ' + n + ')'),
    'o indicador da barra não mede 1/' + n)
})

test('o bloco de prefers-reduced-motion é o último do CSS', () => {
  // Ele zera animação e transição de tudo que veio antes. Regra acrescentada
  // depois dele escaparia do reduced-motion sem ninguém notar.
  const style = HTML.slice(HTML.indexOf('<style>'), HTML.indexOf('</style>'))
  const i = style.lastIndexOf('@media (prefers-reduced-motion')
  assert.ok(i > 0, 'o painel não respeita prefers-reduced-motion')
  const depois = style.slice(i).replace(/@media[^{]*\{[\s\S]*?\n\}/, '').trim()
  assert.equal(depois, '', 'há CSS depois do bloco de reduced-motion: ' + depois.slice(0, 80))
})

test('a casca prende a coluna do grid, senão estoura na horizontal', () => {
  // ⚠️ Bug real, achado pelo Eloi em 22/08/2026. `#painel` declarava só
  // `grid-template-rows`; a coluna ficava implícita em `auto`, e coluna `auto`
  // dimensiona por MAX-CONTENT — o grid crescia até a largura que o item mais
  // largo gostaria de ter. O cabeçalho é um flex sem quebra e pedia 671px, então
  // a casca ficava com 671px em qualquer viewport menor.
  //
  // O que torna isso traiçoeiro: só aparece na FAIXA entre a largura mínima do
  // conteúdo e os 671px. Abaixo de ~400px o conteúdo já é estreito e cabe;
  // acima de 700px a janela comporta os 671. Testar 390 e 1440 passa nos dois e
  // não vê nada — foi exatamente o que aconteceu.
  const painel = HTML.match(/#painel\{[^}]*\}/)
  assert.ok(painel, 'sumiu a regra de #painel')
  assert.match(painel[0], /grid-template-columns\s*:\s*minmax\(\s*0/,
    '#painel sem grid-template-columns com minmax(0,…): a coluna volta a crescer por max-content')
  // O cabeçalho e o corpo são itens do grid: sem min-width:0 eles se recusam a
  // encolher e devolvem o estouro por outro caminho (§10.5).
  for (const sel of ['.og-topo', '.og-corpo']) {
    const regra = HTML.match(new RegExp(sel.replace('.', '\.') + '\{[^}]*\}'))
    assert.ok(regra, 'sumiu a regra de ' + sel)
    assert.match(regra[0], /min-width\s*:\s*0/, sel + ' sem min-width:0 — item de grid não encolhe')
  }
})

/* ── Contas das marcas (Fase 1) ──────────────────────────────────────────── */

test('as funções do acesso da marca estão declaradas', () => {
  for (const f of ['chamarFuncao', 'carregarParticipantes', 'renderParticipantes',
                   'acessoDe', 'seloAcesso', 'blocoAcesso', 'criarAcesso']) {
    assert.match(JS, new RegExp(String.raw`function\s+${f}\s*\(`), 'função não declarada: ' + f)
  }
})

test('listar as marcas não pode derrubar as quatro origens', () => {
  // 🔴 A razão é concreta: `get_participantes` só existe depois de a migration
  // das contas ser aplicada no banco. Dentro do Promise.all das origens, um 404
  // dela levaria o painel INTEIRO para a tela de erro — inclusive as respostas
  // que já funcionam hoje. A carga tem que ser apartada e ter catch próprio.
  const i = JS.indexOf('async function carregarParticipantes')
  assert.ok(i > 0, 'sumiu a carga apartada das marcas')
  const bloco = JS.slice(i, i + 700)
  assert.match(bloco, /catch/, 'a carga das marcas não tem catch próprio')
  assert.match(bloco, /participantesErro\s*=/, 'o motivo da falha não é guardado para a tela')

  const promiseAll = JS.match(/Promise\.all\([\s\S]{0,240}?\)\)/)
  assert.ok(promiseAll, 'sumiu a carga em paralelo das origens')
  assert.ok(!promiseAll[0].includes('get_participantes'),
    'get_participantes entrou no Promise.all: migration não aplicada derrubaria o painel todo')
})

test('a página conhece todo status que o banco aceita', () => {
  // O CHECK de `quero_participar` ganhou 'cadastro_completo' na migration das
  // contas. Status sem rótulo aqui vira string crua na tela e some do filtro —
  // o painel passa a mentir por omissão.
  const check = MIGRATION.match(/add constraint quero_participar_status_check check \(status in \(([\s\S]*?)\)\)/)
  assert.ok(check, 'sumiu o CHECK de status de quero_participar')
  const doBanco = [...check[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1])
  assert.ok(doBanco.length >= 6, 'li o CHECK errado: ' + doBanco.join(', '))

  const iRot = JS.indexOf('const ROTULO_STATUS')
  const rotulos = JS.slice(iRot, JS.indexOf('};', iRot))
  const vocab = JS.match(/rpc: 'get_quero_participar'[\s\S]*?status: \[([^\]]+)\]/)
  assert.ok(vocab, 'não achei o vocabulário de status do quero_participar')

  for (const s of doBanco) {
    assert.ok(rotulos.includes(s + ':'), 'status sem rótulo legível: ' + s)
    assert.ok(vocab[1].includes("'" + s + "'"), 'status fora do filtro do painel: ' + s)
  }
})

test('o painel fala com a Edge Function no contrato dela', () => {
  // Caminho e nomes dos campos. Um typo aqui devolve 400 e morre numa mensagem
  // genérica; o teste falha antes de chegar lá.
  assert.match(JS, /\/functions\/v1\//, 'a chamada não vai para o caminho de Edge Function')
  assert.match(JS, /chamarFuncao\('criar-acesso-marca',\s*\{\s*secret:[^}]*origem_id:/,
    'o corpo enviado não bate com { secret, origem_id }')
  assert.match(EDGE, /payload\.secret/, 'a função não lê mais `secret`')
  assert.match(EDGE, /payload\.origem_id/, 'a função não lê mais `origem_id`')
})

test('criar acesso pede confirmação — o e-mail não volta', () => {
  const i = JS.indexOf('async function criarAcesso')
  assert.ok(i > 0, 'sumiu criarAcesso')
  assert.match(JS.slice(i, i + 900), /confirm\(/,
    'o botão dispara e-mail para uma pessoa real sem confirmar nada')
})

test('a RPC de listar marcas existe e passa pela senha', () => {
  assert.match(MIGRATION, /create or replace function public\.get_participantes/)
  const i = MIGRATION.indexOf('function public.get_participantes')
  assert.match(MIGRATION.slice(i, i + 1400),
    /if not public\.admin_ok\(p_secret\) then return; end if;/,
    'a listagem das marcas não confere a senha')
})

test('apagar exige dois toques e só mexe na lista depois do servidor confirmar', () => {
  // Exclusão é irreversível e o dado é de terceiro. Três garantias:
  assert.match(JS, /function\s+apagarRegistro\s*\(/, 'sumiu apagarRegistro')
  assert.match(JS, /function\s+desarmarApagar\s*\(/, 'sumiu o desarme do botão')

  // 1. dois toques: o primeiro arma, o segundo executa.
  assert.match(JS, /dataset\.armado\s*!==\s*'1'/, 'o botão de apagar não tem confirmação em dois passos')

  // 2. a cópia local só encolhe DEPOIS do `ok !== true` ter tido chance de
  //    lançar — mesma regra da gravação, e aqui vale mais, porque some da tela.
  const corpo = JS.slice(JS.indexOf('async function apagarRegistro'))
  const guarda = corpo.indexOf('r.ok !== true')
  const mexe = corpo.indexOf('dados[origem] =')
  assert.ok(guarda > -1, 'sumiu a checagem do retorno da RPC de exclusão')
  assert.ok(mexe > guarda, 'a lista local é alterada antes de o servidor confirmar a exclusão')

  // 3. o desarme roda ao fechar a ficha, senão a próxima abre engatilhada.
  const fechar = JS.slice(JS.indexOf('function fecharDetalhe'))
  assert.match(fechar.slice(0, 220), /desarmarApagar\(\)/, 'fecharDetalhe não desarma o botão de apagar')
})

test('a carga confere a sessão em vez de mostrar lista vazia', () => {
  // ⚠️ As RPCs de leitura NÃO dão erro com senha inválida: devolvem lista
  // vazia. Sem o admin_ping junto, sessão velha abre um painel zerado e a
  // pessoa conclui que os dados sumiram, não que perdeu o acesso.
  const carga = JS.slice(JS.indexOf('async function carregar'), JS.indexOf('function campo'))
  // ⚠️ Casar a CHAMADA, não a palavra. A primeira versão deste assert procurava
  // `admin_ping` em qualquer lugar do trecho e passava com a função removida:
  // o comentário logo acima já contém o nome. Pego por mutação.
  assert.match(carga, /rpc\(\s*['"]admin_ping['"]/, 'carregar() não chama admin_ping para conferir a sessão')
  assert.match(carga, /valida\s*!==\s*true/, 'o resultado do admin_ping não é usado')
})

/* ─────────────────────────────────────────────────────────────────────────
   Cadastro manual de marca — 22/08/2026.
   Desenho: docs/superpowers/specs/2026-08-22-cadastro-manual-participante-design.md
   ───────────────────────────────────────────────────────────────────────── */

const EDGE_ACESSO = readFileSync(
  new URL('../supabase/functions/criar-acesso-marca/index.ts', import.meta.url), 'utf8')
const MIG_MANUAL = readFileSync(
  new URL('../supabase/migrations/20260822_vincular_marca_manual.sql', import.meta.url), 'utf8')

test('as funções do cadastro manual estão declaradas', () => {
  for (const f of ['abrirCadastroManual', 'criarMarcaManual', 'slugPrevisto']) {
    assert.match(JS, new RegExp(String.raw`function\s+${f}\s*\(`), 'função não declarada: ' + f)
  }
})

test('o cadastro manual passa pela MESMA função de acesso', () => {
  // ⚠️ O ponto central do desenho. Uma segunda Edge Function daria à trava de
  // primeiro uso a mesma exposição que a slugificação já tem — e ali o modo de
  // falha é pior: marca cadastrada à mão sem `deve_trocar_senha`, com senha
  // permanente no WhatsApp, sem ninguém notar.
  const corpo = JS.slice(JS.indexOf('async function criarMarcaManual'))
  assert.match(corpo.slice(0, 1200), /chamarFuncao\(\s*['"]criar-acesso-marca['"]/,
    'o cadastro manual não usa a função de acesso — há um segundo caminho')
  assert.match(EDGE_ACESSO, /vincular_marca_manual/,
    'a Edge Function não conhece o vínculo manual')
})

test('a função de acesso recusa entrada ambígua e entrada vazia', () => {
  assert.match(EDGE_ACESSO, /origemId\s*&&\s*manual[\s\S]{0,80}entrada_ambigua/,
    'aceitar candidatura e cadastro manual juntos cria conta com o nome errado')
  assert.match(EDGE_ACESSO, /!origemId\s*&&\s*!manual[\s\S]{0,80}origem_obrigatoria/)
})

test('a colisão é checada ANTES de criar o usuário', () => {
  // Ordem importa: criar o usuário e só então descobrir a colisão deixaria uma
  // conta órfã no Auth, sem linha em participantes.
  const colisao = EDGE_ACESSO.indexOf('marca_ja_tem_acesso')
  const criacao = EDGE_ACESSO.indexOf('auth.admin.createUser')
  assert.ok(colisao > -1, 'sumiu a recusa por nome já com acesso')
  assert.ok(criacao > colisao, 'o usuário é criado antes da checagem de colisão')
})

test('a recusa por candidatura existente devolve o id dela', () => {
  // Sem o id a mensagem seria queixa sem saída, e a organização criaria a conta
  // à mão mesmo assim — deixando a candidatura para sempre sem vínculo.
  assert.match(EDGE_ACESSO, /existe_candidatura[\s\S]{0,120}candidatura_id/)
  assert.match(JS, /existe_candidatura/, 'a tela não trata a recusa por candidatura existente')
})

test('o erro da função carrega o corpo da resposta', () => {
  // As recusas de colisão devolvem dados que a tela precisa. Perdê-los no
  // `throw` transformaria recusa acionável em queixa sem saída.
  const f = JS.slice(JS.indexOf('async function chamarFuncao'), JS.indexOf('function abrirPainel'))
  assert.match(f, /err\.dados\s*=\s*dados/, 'chamarFuncao descarta o corpo do erro')
})

test('a RPC do vínculo manual não é chamável pelo navegador', () => {
  assert.match(MIG_MANUAL, /create or replace function public\.vincular_marca_manual/)
  assert.match(MIG_MANUAL, /revoke all on function public\.vincular_marca_manual[\s\S]{0,120}anon/,
    'criar conta não é operação que possa sair de um bundle público')
  assert.match(MIG_MANUAL, /papel\s*\)\s*\n?\s*values\s*\(\s*p_user,\s*'marca'/,
    'o papel precisa ser fixo em marca — argumento livre aqui promove qualquer um a organização')
})

test('o estado vazio das marcas não descreve o fluxo removido', () => {
  // Ele dizia "recebe um convite por e-mail e define a própria senha", que era
  // o modelo anterior. Estado vazio que ensina caminho inexistente é pior que
  // estado vazio mudo — ele é lido justamente por quem chega pela primeira vez.
  const vazio = JS.slice(JS.indexOf('Nenhuma marca com acesso'))
  assert.ok(!/convite por e-mail/.test(vazio.slice(0, 700)),
    'o estado vazio ainda promete convite por e-mail')
  assert.match(vazio.slice(0, 700), /Cadastrar marca/,
    'o estado vazio não menciona o caminho do cadastro manual')
})
