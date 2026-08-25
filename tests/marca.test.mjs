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
import { readFileSync, readdirSync } from 'node:fs'

const HTML = readFileSync(new URL('../public/marca/index.html', import.meta.url), 'utf8')
const SCRIPTS = [...HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])
const JS = SCRIPTS[0] || ''
// Só os literais de texto do script. Serve às checagens de MENSAGEM: o código
// comenta as decisões citando as frases erradas, e varrer o arquivo inteiro
// confundiria a explicação com a prática.
const TEXTOS = [...JS.matchAll(/'((?:[^'\\\n]|\\.)*)'/g)].map((m) => m[1]).join(' | ')
const MIGRATION = readFileSync(
  new URL('../supabase/migrations/20260822_contas_marcas.sql', import.meta.url), 'utf8')

/* ⚠️ UMA migration não é o esquema. Até a Fase 5 este arquivo lia só
   `20260822_contas_marcas.sql` para saber o que a marca pode escrever — e a
   Fase 5 revogou aquele grant e concedeu outro. Um teste que lê UM arquivo
   afere o que era verdade no dia em que ele foi escrito.
   Aqui as migrations são lidas em ordem de nome e aplicadas em sequência, como
   o Postgres faz: o último `grant`/`revoke` de cada tabela é o que vale. */
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

// Objeto literal do script, pelo nome da variável. Os campos são as chaves do
// primeiro nível — é o que vira corpo de PATCH.
const camposDe = (nome) => {
  const bloco = JS.match(new RegExp('var ' + nome + ' = \\{([\\s\\S]*?)\\n\\s*\\}'))
  assert.ok(bloco, 'não achei o objeto ' + nome + ' no script')
  return [...bloco[1].matchAll(/^\s*([a-z_]+):/gm)].map((m) => m[1])
}

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
    'precisaTrocarSenha', 'marcarSenhaTrocada',
    'carregar', 'carregarParticipacao', 'selo', 'preencherMarca', 'preencher',
    'itemDe', 'desenharItens', 'montarItem', 'itensLer', 'itemCompleto',
    'desenharUnidades', 'montarUnidade', 'unidadesLer',
    'unidadeAdicionar', 'unidadeRemover',
    'desenharSolicitacoes', 'desenharArquivos', 'baixar', 'desenharSessoes',
    'dataCurta', 'dataHora', 'diasAte', 'prazoTexto',
    'progresso', 'precoNumero', 'agendarSalvar', 'salvar', 'salvarItens',
    'salvarUnidades', 'concluir', 'hashSessao', 'iniciar',
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
  assert.match(MIGRATIONS, /create or replace function public\.marca_concluir_cadastro/)
  // Fase 5: a RPC valida a PARTICIPAÇÃO, não a marca. Chamar com o argumento
  // antigo devolveria 404 do PostgREST, e o botão "concluir" nunca concluiria.
  assert.match(JS, /p_participacao:/,
    'a página chama a conclusão com o argumento do modelo antigo')
  assert.match(MIGRATIONS, /marca_concluir_cadastro\(p_participacao uuid\)/)
})

/* ── Contrato com o banco ────────────────────────────────────────────────── */

test('a página só escreve colunas que o grant de UPDATE concede', () => {
  // RLS decide LINHA, `grant` decide COLUNA. Sem os dois, a policy de update
  // deixaria a marca reescrever qualquer campo da própria linha junto com o
  // nome do doce — inclusive o que declara o cadastro completo.
  const alvos = [
    ['participantes', camposDe('camposMarca')],
    ['participacoes', camposDe('camposParticipacao')],
    ['participantes_itens', camposDe('camposItem')]
  ]
  alvos.forEach(([tabela, escritas]) => {
    const concedidas = colunasConcedidas(tabela)
    assert.ok(concedidas.size > 0, 'sumiu o grant de coluna de ' + tabela)
    assert.ok(escritas.length > 0, 'não achei os campos escritos em ' + tabela)
    const proibidas = escritas.filter((c) => !concedidas.has(c))
    assert.deepEqual(proibidas, [],
      'a página escreve em ' + tabela + ' fora do grant: ' + proibidas.join(', '))
  })
})

test('status_cadastro fica fora do alcance da marca, nas duas tabelas', () => {
  // É a coluna que separa "preenchi" de "está completo". Com ela no grant, a
  // marca se declara pronta sem preencher nada e a RPC de conclusão vira
  // enfeite.
  ;['participantes', 'participacoes'].forEach((tabela) => {
    assert.ok(!colunasConcedidas(tabela).has('status_cadastro'),
      'status_cadastro está no grant de ' + tabela)
  })
})

test('a marca não escreve o caminho de foto nenhuma', () => {
  // Briefing §3.5: a marca não envia foto do combo. Escrever o caminho não sobe
  // arquivo (o bucket é service_role), mas apontar para o arquivo de outra
  // participação basta para trocar a foto na tela.
  assert.ok(!colunasConcedidas('participantes').has('combo_foto_path'),
    'combo_foto_path voltou ao grant de participantes')
  assert.ok(!colunasConcedidas('participantes_itens').has('foto_path'),
    'foto_path voltou ao grant dos itens')
})

test('preço, endereço e horário são da PARTICIPAÇÃO, não da marca', () => {
  // Regra de vazamento: são os dados que o site institucional não publica, e
  // que mudam a cada edição. Ficar em `participantes` os tornaria permanentes.
  assert.ok(colunasConcedidas('participacoes').has('combo_preco'),
    'combo_preco precisa ser escrevível na participação')
  const daMarca = [...colunasConcedidas('participantes')].join(' ')
  assert.ok(!/preco|endereco|horario/.test(daMarca),
    'dado volátil vazou para a tabela publicável')
  assert.match(JS, /participacao_unidades/,
    'endereço e horário precisam vir de participacao_unidades')
})

test('o painel lê a participação, não as colunas antigas do participante', () => {
  // O que sobrou de `participantes` é o que atravessa as edições. Combo, tema,
  // preço e unidades mudam de edição para edição — e a mesma marca tem uma
  // linha por edição.
  assert.match(JS, /participacoes\?select=/, 'a página não carrega a participação')
  assert.ok(!/participantes_operacao/.test(JS_CODIGO),
    'a página ainda escreve na tabela de operação do modelo antigo')
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
