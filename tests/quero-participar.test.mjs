/*
 * A página /quero-participar é estática: o JS mora inline no HTML e NÃO passa
 * pelo build do Vite. Ou seja, `npm run build` passa mesmo com o script
 * quebrado — foi assim que um erro de sintaxe e uma função apagada chegaram ao
 * commit sem ninguém ver.
 *
 * Estas checagens cobrem exatamente esse vão. Rodar: node --test tests/quero-participar.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { festivalFacts } from '../src/data/festivalFacts.js'

const HTML = readFileSync(new URL('../public/quero-participar/index.html', import.meta.url), 'utf8')
const SCRIPTS = [...HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])

test('o HTML traz exatamente um bloco de script inline', () => {
  assert.equal(SCRIPTS.length, 1)
})

test('o script inline compila', () => {
  // new Function não executa: só força o parse. Pega string não terminada,
  // parêntese sobrando e afins.
  assert.doesNotThrow(() => new Function(SCRIPTS[0]))
})

test('toda função chamada está declarada', () => {
  // ⚠️ Este teste já foi uma LISTA FIXA de 11 nomes, e por isso deixou passar
  // uma chamada a `escapar()` — helper que existe nos painéis e NÃO nesta
  // página — direto na mensagem de erro do Turnstile, em 25/08/2026. Lista
  // escrita à mão só cobre o que alguém lembrou de escrever nela; o que quebra
  // é sempre a chamada que ninguém previu. Agora varre os pontos de chamada.
  const bruto = SCRIPTS[0]

  // Declarações saem do fonte COM comentários: um `function x` citado em
  // comentário é ruído inofensivo aqui (no máximo deixa passar), enquanto
  // perder uma declaração real geraria falso positivo.
  const declaradas = new Set(
    [...bruto.matchAll(/(?:function\s+|const\s+|let\s+|var\s+)([A-Za-z_$][\w$]*)/g)].map((m) => m[1]))

  // Já as CHAMADAS têm que sair só do código. Prosa em comentário — "(jsonb)",
  // "(Turnstile)" — casa com `nome(` e viraria falso positivo.
  // Ordem: bloco → linha → literais. O `//` de `https://` fica protegido por
  // exigir que ele não venha depois de `:`.
  const js = bruto
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``')

  // Palavras que casam com `nome(` sem serem chamada de função.
  const SINTAXE = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'function',
    'typeof', 'new', 'await', 'async', 'else', 'do', 'of', 'in', 'instanceof', 'delete',
    'void', 'throw', 'case', 'yield', 'super'])

  // Globais do navegador que a página usa de propósito.
  const GLOBAIS = new Set(['alert', 'confirm', 'fetch', 'setTimeout', 'setInterval',
    'clearTimeout', 'clearInterval', 'parseInt', 'parseFloat', 'isNaN', 'String',
    'Number', 'Boolean', 'Array', 'Object', 'Date', 'Math', 'JSON', 'Promise',
    'RegExp', 'Error', 'Set', 'Map', 'URLSearchParams', 'FormData', 'Blob',
    'encodeURIComponent', 'decodeURIComponent', 'requestAnimationFrame',
    'getComputedStyle', 'structuredClone', 'queueMicrotask', 'btoa', 'atob'])

  const chamadas = new Set(
    [...js.matchAll(/(?<![.\w$])([a-zA-Z_$][\w$]*)\s*\(/g)].map((m) => m[1]))

  const faltando = [...chamadas].filter((n) =>
    !SINTAXE.has(n) && !GLOBAIS.has(n) && !declaradas.has(n))

  assert.deepEqual(faltando, [],
    'função chamada mas nunca declarada nesta página: ' + faltando.join(', '))
})

test('não sobrou referência ao wizard de passos', () => {
  // O formulário virou página única em 20/08/2026. Estes nomes morreram junto;
  // se voltarem, é sinal de que um patch antigo foi reaplicado por cima.
  // O índice pegajoso e os chips saíram em 25/08/2026, quando o formulário
  // encolheu para sete campos em dois blocos: índice de duas entradas é peça
  // que anuncia o que já cabe na tela.
  for (const morto of ['irPara', 'btnAvancar', 'btnVoltar', 'pa-trilha', 'montarRevisao',
                       'pa-indice', 'pa-escolha', 'recalcularIndice', 'atualizarContaChips']) {
    assert.ok(!HTML.includes(morto), 'referência morta ao wizard: ' + morto)
  }
})

test('o envio tem destino configurado', () => {
  // Supabase OU endpoint genérico. Sem nenhum dos dois o envio cai no mailto,
  // que não grava nada e não chega ao painel da organização.
  const sb = HTML.match(/supabaseUrl:\s*'([^']*)'/)
  const ep = HTML.match(/endpoint:\s*'([^']*)'/)
  const alvo = (sb && sb[1]) || (ep && ep[1]) || ''
  assert.ok(alvo.startsWith('https://'), 'nenhum destino HTTPS configurado: o envio cairia no mailto')
})

test('a chave do Supabase é a publicável, nunca a service_role', () => {
  assert.ok(!/service_role|\bsb_secret_/.test(HTML), 'chave secreta em arquivo de public/')
  const m = HTML.match(/supabaseKey:\s*'([^']*)'/)
  if (m && m[1]) assert.ok(m[1].startsWith('sb_publishable_'), 'chave não é publicável: ' + m[1].slice(0, 16))
})

test('os campos que a RPC exige saem da coleta', () => {
  // submit_quero_participar levanta exceção sem nome, empresa e email. Se o
  // formulário renomear um desses, o envio passa a falhar só em produção —
  // este teste falha antes.
  //
  // ⚠️ `carroChefe` saiu desta lista em 25/08/2026 junto com o campo. A RPC
  // continua promovendo a coluna `carro_chefe` quando o payload traz a chave;
  // sem a chave ela grava null, que é o comportamento certo. O que NÃO pode
  // sumir são os três abaixo: sem eles a RPC levanta exceção.
  const ordem = HTML.match(/const ORDEM = \[([\s\S]*?)\]/)
  assert.ok(ordem, 'ORDEM não encontrada')
  for (const campo of ['nome', 'empresa', 'email']) {
    assert.ok(ordem[1].includes("'" + campo + "'"), 'campo exigido pela RPC não está em ORDEM: ' + campo)
  }
})

test('só afirma envio depois de confirmar a gravação', () => {
  const js = SCRIPTS[0]
  const ok = js.indexOf("mostrar('ok'")
  const guarda = js.indexOf('if (!r.ok)')
  assert.ok(guarda > -1, 'sumiu a checagem de r.ok')
  assert.ok(ok > guarda, 'a mensagem de sucesso tem que vir DEPOIS da checagem de r.ok')
  // O guard tem que interromper de verdade: sem throw ele vira comentário caro.
  assert.match(js.slice(guarda, ok), /throw\s+new\s+Error/, 'o if (!r.ok) não interrompe o fluxo')
})

test('todo asset absoluto existe em public/', () => {
  const pedidos = [...HTML.matchAll(/(?:url\('|src="|href=")(\/[^"')]+)/g)].map((m) => m[1])
  for (const p of new Set(pedidos)) {
    const alvo = new URL('../public' + p, import.meta.url)
    // Caixa exata importa: a Vercel roda Linux, o Windows não denuncia.
    assert.ok(readFileSync(alvo), 'asset ausente: ' + p)
  }
})

/* ── Números do herói ────────────────────────────────────────────────────────
 *
 * A página é estática e mora em public/: não importa festivalFacts.js, então os
 * dois números do herói estão escritos à mão no HTML.
 *
 * Estes testes são a costura que falta: recalculam da fonte a cada rodada e
 * reprovam se o HTML divergir. Nenhum valor esperado é digitado aqui.
 */

const NUMEROS = [...HTML.matchAll(new RegExp(
  '<li[^>]*><span class="pa-numeros__disco" style="background:(#[0-9A-Fa-f]{6})"[^>]*>(.*?)</span><b>([^<]+)</b><span>([^<]+)</span></li>', 'g',
))].map(([, disco, icone, valor, rotulo]) => ({ disco, icone, valor, rotulo }))

const canal = (v) => (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
const luminancia = (hex) =>
  0.2126 * canal(parseInt(hex.slice(1, 3), 16)) +
  0.7152 * canal(parseInt(hex.slice(3, 5), 16)) +
  0.0722 * canal(parseInt(hex.slice(5, 7), 16))
const contraste = (a, b) => {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (claro + 0.05) / (escuro + 0.05)
}

test('o herói mostra exatamente dois números', () => {
  assert.equal(NUMEROS.length, 2, 'o painel .pa-numeros deixou de ter dois itens')
})

test('"10 anos" confere com festivalFacts', () => {
  const item = NUMEROS.find((n) => /anos/.test(n.rotulo))
  assert.ok(item, 'sumiu o número de anos de festival')
  assert.equal(Number(item.valor), festivalFacts.years.value,
    `HTML diz ${item.valor}, festivalFacts.years diz ${festivalFacts.years.value}`)
})

test('"16 edições" confere com a base', () => {
  const item = NUMEROS.find((n) => /ediç/.test(n.rotulo))
  assert.ok(item, 'sumiu o número de edições realizadas')
  assert.equal(Number(item.valor), festivalFacts.editions.value,
    `HTML diz ${item.valor}, festivalFacts.editions diz ${festivalFacts.editions.value}`)
  // §9.1: o acervo fecha em 16 edições realizadas.
  assert.equal(festivalFacts.editions.value, 16, 'a contagem de edições divergiu do acervo §9.1')
})

test('irmãos não repetem cor de disco', () => {
  // §6.3: dois irmãos com a mesma cor é defeito, não economia.
  const cores = NUMEROS.map((n) => n.disco.toUpperCase())
  assert.equal(new Set(cores).size, cores.length, 'duas réguas com a mesma cor: ' + cores.join(' '))

  // E cada uma tem de ser token da paleta (§6.1) — hex solto fora da tabela não entra.
  const PALETA = ['#FEF0DD', '#F8E4C1', '#3D1308', '#6A2C15', '#FDBB1A', '#01AFCC', '#4D257E', '#F10767', '#FF4810']
  for (const cor of cores) assert.ok(PALETA.includes(cor), 'cor fora da paleta do §6.1: ' + cor)
})

test('todo disco aparece sobre o fundo do painel', () => {
  // §6.3: a cor entra no ciclo só se o fundo a sustenta. Sobre chocolate, roxo
  // (1,45:1) e marrom (1,5:1) somem — e some em silêncio, porque CSS não avisa.
  // 3:1 é o piso de componente gráfico da WCAG.
  const bloco = HTML.slice(HTML.indexOf('.pa-numeros{'))
  const fundoChoco = bloco.slice(0, bloco.indexOf('}')).includes('background:var(--scw-choco)')
  assert.ok(fundoChoco, 'o painel deixou de ser chocolate — recalcular os discos')

  for (const { disco, valor } of NUMEROS) {
    const razao = contraste(disco, '#3D1308')
    assert.ok(razao >= 3,
      `disco de "${valor}" dá ${razao.toFixed(2)}:1 sobre chocolate — some (mínimo 3:1)`)
  }
})

// Fonte única dos ícones (§5.2 · §6.11). A página é estática e não importa
// ScwIcon, então o desenho está inline. Este teste é o que impede o inline de
// virar uma segunda fonte: mexeu no Design e reexportou, aqui reprova.
test('os ícones do painel batem com scw-icons-v2.js', async () => {
  const { SCW_ICONS, SCW_ICON_SPEC } = await import('../src/components/scw-icons/scw-icons-v2.js')

  const ESPERADO = {
    anos: 'ui/calendario',
    'ediç': 'simbolos/edicao',
  }

  assert.equal(NUMEROS.length, Object.keys(ESPERADO).length,
    'mudou a contagem de números — atualizar o mapa de ícones deste teste')

  for (const { rotulo, icone, valor } of NUMEROS) {
    const chave = Object.entries(ESPERADO).find(([frag]) => rotulo.includes(frag))?.[1]
    assert.ok(chave, `"${rotulo}" não tem ícone previsto`)
    assert.ok(SCW_ICONS[chave], `ícone inexistente na fonte: ${chave}`)
    assert.ok(icone.includes(SCW_ICONS[chave]),
      `o desenho de "${valor}" divergiu de ${chave} em scw-icons-v2.js — regerar o inline`)
    assert.ok(icone.includes(`stroke-width="${SCW_ICON_SPEC.strokeWidth}"`),
      `traço de "${valor}" fora do spec (${SCW_ICON_SPEC.strokeWidth})`)
    assert.ok(icone.includes(`viewBox="${SCW_ICON_SPEC.viewBox}"`),
      `viewBox de "${valor}" fora do spec`)
  }
})

test('a régua saiu inteira, markup e estilo', () => {
  assert.ok(!HTML.includes('scw-stat__regua'),
    'a régua virou disco mas ainda é citada — remover, não esconder (§5.7)')
})

// Exceção de paleta declarada (§6.1), no mesmo molde da F2 na seção 07 da
// Home: verde é marca do WhatsApp, não do festival. Vale enquanto estiver
// preso a um seletor — solto, vira cor nova no sistema.
test('o verde do WhatsApp não escapa de .pa-whats', () => {
  const VERDE = /#25D366/gi
  const ocorrencias = [...HTML.matchAll(VERDE)]
  assert.ok(ocorrencias.length > 0, 'o verde sumiu — se foi de propósito, apagar este teste')

  for (const m of ocorrencias) {
    const antes = HTML.slice(Math.max(0, m.index - 400), m.index)
    const emComentario = antes.lastIndexOf('/*') > antes.lastIndexOf('*/')
    assert.ok(emComentario || antes.includes('.pa-whats{'),
      'verde #25D366 fora de .pa-whats — a exceção só vale escopada (§6.1)')
  }

  const regra = HTML.slice(HTML.indexOf('.pa-whats{'))
  const corpo = regra.slice(0, regra.indexOf('}'))
  assert.ok(corpo.includes('color:var(--scw-choco)'),
    'a tinta do botão saiu do chocolate — branco sobre #25D366 dá 1,98:1 e reprova')

  const razao = contraste('#25D366', '#3D1308')
  assert.ok(razao >= 4.5,
    `chocolate sobre o verde dá ${razao.toFixed(2)}:1 — mínimo 4,5:1 para texto de botão`)
})

test('os ícones dos botões de indicação batem com a fonte', async () => {
  const { SCW_ICONS } = await import('../src/components/scw-icons/scw-icons-v2.js')

  const ESPERADO = {
    'share-whatsapp': 'redes/conversa',
    'share-copiar': 'ui/link-externo',
    'share-email': 'redes/e-mail',
    'share-nativo': 'ui/compartilhar',
  }

  for (const [id, nome] of Object.entries(ESPERADO)) {
    const i = HTML.indexOf(`id="${id}"`)
    assert.ok(i > 0, `botão ${id} sumiu`)
    const bloco = HTML.slice(i, HTML.indexOf('</', HTML.indexOf('</svg>', i)))
    assert.ok(SCW_ICONS[nome], `ícone inexistente na fonte: ${nome}`)
    assert.ok(bloco.includes(SCW_ICONS[nome]),
      `o ícone de ${id} divergiu de ${nome} em scw-icons-v2.js — regerar o inline`)
  }
})

test('trocar o rótulo do copiar não apaga o ícone', () => {
  const i = HTML.indexOf("getElementById('share-copiar')")
  const bloco = HTML.slice(i, i + 500)
  assert.ok(!bloco.includes('btn.textContent ='),
    'o handler escreve em btn.textContent e apagaria o SVG no primeiro clique — escrever no <span>')
  assert.ok(bloco.includes("querySelector('span')"),
    'o handler precisa mirar o <span> do rótulo, não o botão inteiro')
})

/* ── Blocos do formulário ────────────────────────────────────────────────────
 *
 * O índice pegajoso que repetia os nomes dos passos no topo saiu em 25/08/2026,
 * junto com o encolhimento para sete campos: índice de duas entradas anuncia o
 * que já cabe na tela. Sobrou a costura que importa — markup e script têm que
 * concordar sobre quantos blocos existem e o que cada um cobra.
 */

const TITULOS = Object.fromEntries([...HTML.matchAll(new RegExp(
  '<h2 class="scw-h2" id="(titulo-\\d)" tabindex="-1">([^<]+)</h2>', 'g',
))].map(([, id, texto]) => [id, texto]))

test('o formulário tem dois blocos, e cada um cobra o que promete', () => {
  // O índice pegajoso saiu com o encolhimento de 25/08/2026. O que sobrou para
  // guardar é a coerência entre os blocos do markup e os mapas do script: um
  // bloco a mais no HTML sem entrada em OBRIGATORIOS é campo que ninguém cobra
  // — e a pessoa envia sem preencher, sem nenhum aviso.
  assert.equal(Object.keys(TITULOS).length, 2,
    'o formulário deixou de ter dois blocos: ' + Object.keys(TITULOS).join(', '))

  const secoes = [...HTML.matchAll(/data-passo="(\d)"/g)].map((m) => m[1])
  assert.deepEqual(secoes, ['1', '2'], 'as seções do markup saíram de 1 e 2: ' + secoes.join(', '))

  const obrig = SCRIPTS[0].match(/const OBRIGATORIOS = \{([\s\S]*?)\n\}/)
  assert.ok(obrig, 'OBRIGATORIOS sumiu do script')
  const chaves = [...obrig[1].matchAll(/^\s*(\d):/gm)].map((m) => m[1])
  assert.deepEqual(chaves, secoes,
    'seção do markup sem entrada em OBRIGATORIOS: o campo entra na tela e ninguém o cobra')

  const tudo = SCRIPTS[0].match(/return \[([^\]]*)\]\.flatMap\(n => validarPasso\(n\)\)/)
  assert.ok(tudo, 'validarTudo deixou de percorrer os blocos')
  assert.deepEqual(tudo[1].split(',').map((n) => n.trim()), secoes,
    'validarTudo não valida os mesmos blocos que existem no markup')
})

test('o passo pendente é contado numa fonte só', () => {
  const js = SCRIPTS[0]
  assert.match(js, /function pendencias\(/,
    'sumiu pendencias(): validação e índice voltariam a ter cada um a sua regra')
  const corpo = js.slice(js.indexOf('function validarPasso('), js.indexOf('function validarTudo('))
  assert.ok(corpo.includes('pendencias(n)'),
    'validarPasso deixou de derivar de pendencias() — duas fontes para o que é obrigatório')
  assert.ok(!corpo.includes('preenchido('),
    'validarPasso voltou a decidir sozinho o que falta; quem decide é pendencias()')
})

test('o erro do envio não dispara dois scrollIntoView no mesmo tique', () => {
  const js = SCRIPTS[0]
  const bloco = js.slice(js.indexOf('const faltando = validarTudo()'), js.indexOf('const dados = coletar()'))
  assert.ok(/mostrar\([\s\S]*?false\)/.test(bloco),
    'mostrar() voltou a rolar sozinho na falha de validação — o scroll até o campo cancela o dela')
  assert.ok(bloco.includes('faltando.length'),
    'a falha de validação precisa dizer QUANTAS respostas faltam, não só que falta algo')
})

/* ── Contraste do que mudou de cor ───────────────────────────────────────────
 *
 * Os dois valores abaixo já estiveram errados: a mensagem de erro em magenta
 * (3,77:1 em 15 lugares) e o numeral do disco a 18px, 0,66px abaixo do piso em
 * que o mínimo cai de 4,5 para 3. Nenhum dos dois denuncia a si mesmo na tela.
 */

const TOKEN = Object.fromEntries([...HTML.matchAll(/--(scw-[a-z]+):(#[0-9A-Fa-f]{6})/g)]
  .map(([, nome, hex]) => [nome, hex]))

// Ancora em inicio de linha: '.pa-escolha span{' tambem aparece DENTRO de
// '.scw-campo[data-erro="1"] .pa-escolha span{', e um indexOf solto devolvia o
// corpo da regra errada — um seletor com uma propriedade so, que passa em
// qualquer asserçao sobre o que ele nao tem.
const regra = (seletor) => {
  const i = HTML.indexOf('\n' + seletor + '{')
  assert.ok(i > -1, 'sumiu a regra ' + seletor)
  return HTML.slice(i + seletor.length + 2, HTML.indexOf('}', i))
}

test('a mensagem de erro passa AA como texto pequeno', () => {
  const corpo = regra('.scw-campo__erro')
  const tinta = TOKEN[corpo.match(/color:var\(--(scw-[a-z]+)\)/)[1]]
  const razao = contraste(tinta, TOKEN['scw-creme'])
  assert.ok(razao >= 4.5,
    `tinta do erro dá ${razao.toFixed(2)}:1 sobre creme, o piso de texto pequeno é 4,5`)
  assert.ok(corpo.includes('var(--scw-magenta)'),
    'o magenta sumiu do erro — a cor tem que ficar no filete, senão o erro perde o sinal')
})

test('o numeral de cada disco passa AA sobre a própria chapa', () => {
  // Dois blocos, duas cores do ciclo de irmãos (§6.3): 01 amarelo, 02 cyan.
  // Os dois levam numeral chocolate, e os dois fecham 4,5:1 — diferente do
  // magenta do antigo passo 03, que só passava como texto grande.
  const [, peso, tamanho] = regra('.pa-disco').match(/font:(\d{3}) (\d+)px/)
  assert.ok(Number(tamanho) >= 18.66 && Number(peso) >= 700,
    `disco a ${tamanho}px/${peso}: abaixo do piso de texto grande`)

  const chapas = ['scw-amarelo', 'scw-cyan']
  const usadas = [...HTML.matchAll(/\.pa-passo--\d \.pa-disco\{background:var\(--(scw-[a-z]+)\)/g)].map((m) => m[1])
  const cores = [regra('.pa-disco').match(/background:var\(--(scw-[a-z]+)\)/)[1], ...usadas]

  assert.deepEqual(cores, chapas,
    'os discos saíram do ciclo de irmãos, ou um terceiro bloco entrou sem cor própria: ' + cores.join(' '))
  assert.equal(new Set(cores).size, cores.length, 'dois discos irmãos com a mesma cor (§6.3)')

  for (const cor of cores) {
    const razao = contraste(TOKEN['scw-choco'], TOKEN[cor])
    assert.ok(razao >= 4.5,
      `numeral chocolate sobre ${cor} dá ${razao.toFixed(2)}:1, abaixo do piso de texto pequeno`)
  }
})

test('a caixa de seleção não nasce com uma resposta escolhida', () => {
  // <select> sem opção vazia devolve a PRIMEIRA opção como se fosse escolha —
  // e "Cafeteria" chegaria no painel para toda marca que não mexeu no campo.
  // A opção vazia é `disabled` para não voltar a ser escolhível depois.
  const sel = HTML.match(/<select id="tipo"[\s\S]*?<\/select>/)
  assert.ok(sel, 'a caixa de seleção do tipo sumiu')
  assert.match(sel[0], /<option value="" disabled selected>/,
    'sem a opção vazia selecionada o campo devolve a primeira opção sem ninguém ter escolhido')

  // A seta é desenhada porque `appearance:none` tira a nativa: sem ela o campo
  // vira uma caixa de texto que não se digita, e ninguém descobre que abre.
  const css = regra('.scw-campo select')
  assert.match(css, /appearance:none/, 'o select perdeu o appearance:none')
  assert.match(css, /background-image:url\("data:image\/svg\+xml/,
    'appearance:none sem seta desenhada: o campo deixa de parecer uma caixa de seleção')
})

test('o "Outro" da caixa de seleção continua abrindo campo', () => {
  // "Outro" sozinho não é dado (§ formulário). O `data-abre` mora na <option>,
  // e marcouOutro lê o selectedOptions — se um dos dois lados sair, o campo
  // nunca abre e a resposta chega como a palavra "Outro".
  assert.match(HTML, /<option data-abre="tipoOutro">Outro<\/option>/,
    'a opção "Outro" perdeu o data-abre')
  assert.match(SCRIPTS[0], /selectedOptions\[0\]/,
    'marcouOutro deixou de ler a opção escolhida do select')
  assert.match(SCRIPTS[0], /const OUTROS = \{ tipo: 'tipoOutro' \}/,
    'o mapa OUTROS não aponta mais o campo que "Outro" abre')
})

test('todo controle crava o piso de toque, sem depender de padding', () => {
  // O skip link ja nasceu a 43px: 15px de texto mais 28px de padding. Piso que
  // sai de soma de padding quebra sozinho quando alguem mexe na tipografia —
  // por isso a exigencia aqui e min-height declarado, nao altura resultante.
  for (const sel of ['.scw-skip', '.scw-btn', '.scw-campo select', '.pa-demo__btn']) {
    const m = regra(sel).match(/min-height:(\d+)px/)
    assert.ok(m, sel + ' nao crava min-height: o piso de toque volta a depender de aritmetica de padding')
    assert.ok(Number(m[1]) >= 44, sel + ' a ' + m[1] + 'px, abaixo do piso de 44')
  }
})

test('a chave publica do Turnstile tem forma de chave, ou esta vazia', () => {
  // Chave malformada nao quebra a pagina: o widget simplesmente nao renderiza,
  // o token sai vazio e o SERVIDOR descarta em silencio. A pagina fica no ar,
  // bonita, engolindo cadastro. Por isso a forma e conferida aqui.
  const m = SCRIPTS[0].match(/turnstileSiteKey:\s*'([^']*)'/)
  assert.ok(m, 'turnstileSiteKey sumiu do CONFIG')
  if (m[1] === '') return // desligado por bandeira, e legitimo
  assert.match(m[1], /^0x4[A-Za-z0-9_-]{18,44}$/,
    'sitekey fora do formato da Cloudflare: ' + m[1])
})

test('token vazio com chave configurada NAO vira envio', () => {
  // O par que cria a armadilha: `EXIGE_TURNSTILE` na Edge Function trata token
  // vazio como reprovado, e reprovado sai pela MESMA resposta do sucesso. Sem
  // esta guarda, widget que nao carregou = tela de sucesso e cadastro perdido.
  const js = SCRIPTS[0]
  assert.match(js, /if \(CONFIG\.turnstileSiteKey && !tokenTurnstile\(\)\)/,
    'a guarda de token vazio sumiu do submit')
  const guarda = js.indexOf('CONFIG.turnstileSiteKey && !tokenTurnstile()')
  const envio = js.indexOf('const dados = coletar();')
  assert.ok(guarda > 0 && guarda < envio,
    'a guarda tem que vir ANTES de coletar/enviar, senao nao guarda nada')
})

test('nenhum elemento se chama "turnstile" — o id vira global e mata o widget', () => {
  // 🐛 25/08/2026, custou uma manhã. Elemento com `id` vira propriedade do
  // window, então `<div id=turnstile>` define `window.turnstile`. O api.js da
  // Cloudflare abre com `if (window.turnstile) return`, guarda contra importar
  // duas vezes: ele vê a div, conclui que já carregou e SAI SEM RENDERIZAR,
  // deixando só um aviso no console. O script carrega, roda e não faz nada —
  // o modo de falha mais difícil de ler que existe.
  //
  // Comentários fora: o comentário do markup CITA o id proibido para explicar
  // por que ele é proibido, e teste que lê prosa reprova a própria doc.
  const markup = HTML.replace(/<!--[\s\S]*?-->/g, '')

  for (const reservado of ['turnstile', 'onloadTurnstileCallback']) {
    const colide = new RegExp('id=["\']' + reservado + '["\']').test(markup)
    assert.ok(!colide,
      'id="' + reservado + '" sequestra window.' + reservado + ': o api.js da Cloudflare vê o elemento, conclui que já carregou e sai sem renderizar')
  }
})

test('o id do alvo no markup e o do script são o mesmo', () => {
  // Renomear um e esquecer o outro devolve `alvo === null`, montarTurnstile sai
  // calada, e a página fica sem widget com a chave configurada — ou seja, todo
  // envio barrado pela guarda. Falha silenciosa de novo, por outro caminho.
  const noScript = SCRIPTS[0].match(/getElementById\('([^']+)'\)[\s\S]{0,80}?cf-turnstile/)
  assert.ok(noScript, 'montarTurnstile não busca mais o alvo por getElementById')
  assert.ok(HTML.includes('id="' + noScript[1] + '"'),
    'o script procura #' + noScript[1] + ', que não existe no markup')
})
