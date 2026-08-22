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
import SWEET_COFFEE_HISTORY from '../src/data/sweetCoffeeHistory.js'
import { festivalFacts } from '../src/data/festivalFacts.js'
import LOVERS_AWARDS from '../src/data/loversAwardsResults.js'

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
  const js = SCRIPTS[0]
  const declaradas = new Set([...js.matchAll(/(?:function\s+|const\s+|let\s+)([A-Za-z_$][\w$]*)/g)].map((m) => m[1]))
  // Só as do próprio arquivo: as globais do browser ficam de fora da lista.
  const criticas = ['montarResumo', 'coletar', 'validarPasso', 'validarTudo', 'mostrar',
                    'atualizarOutros', 'atualizarContaChips', 'preenchido', 'marcar', 'campos', 'copiar']
  const faltando = criticas.filter((f) => !declaradas.has(f))
  assert.deepEqual(faltando, [], 'função chamada mas nunca declarada: ' + faltando.join(', '))
})

test('não sobrou referência ao wizard de passos', () => {
  // O formulário virou página única em 20/08/2026. Estes nomes morreram junto;
  // se voltarem, é sinal de que um patch antigo foi reaplicado por cima.
  for (const morto of ['irPara', 'btnAvancar', 'btnVoltar', 'pa-trilha', 'montarRevisao']) {
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
  // submit_quero_participar levanta exceção sem nome, empresa e email, e lê
  // carroChefe para a coluna consultável. Se o formulário renomear um desses,
  // o envio passa a falhar só em produção — este teste falha antes.
  const ordem = HTML.match(/const ORDEM = \[([\s\S]*?)\]/)
  assert.ok(ordem, 'ORDEM não encontrada')
  for (const campo of ['nome', 'empresa', 'email', 'carroChefe']) {
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
 * A página é estática e mora em public/: não importa festivalFacts.js nem
 * sweetCoffeeHistory.js, então os três números do herói estão escritos à mão no
 * HTML. Foi assim que "+120 marcas" ficou meses no ar enquanto a base dizia 123.
 *
 * Estes testes são a costura que falta: recalculam da base a cada rodada e
 * reprovam se o HTML divergir. Nenhum valor esperado é digitado aqui.
 */

const NUMEROS = [...HTML.matchAll(new RegExp(
  '<li[^>]*><span class="pa-numeros__disco" style="background:(#[0-9A-Fa-f]{6})"[^>]*>(.*?)</span><b>([^<]+)</b><span>([^<]+)</span></li>', 'g',
))].map(([, disco, icone, valor, rotulo]) => ({ disco, icone, valor, rotulo }))

// Marca canônica: aplica os aliases, para uma rede não contar como várias casas.
const canal = (v) => (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
const luminancia = (hex) =>
  0.2126 * canal(parseInt(hex.slice(1, 3), 16)) +
  0.7152 * canal(parseInt(hex.slice(3, 5), 16)) +
  0.0722 * canal(parseInt(hex.slice(5, 7), 16))
const contraste = (a, b) => {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (claro + 0.05) / (escuro + 0.05)
}

const normalizar = (s) => String(s)
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/['\u2019`]/g, "'")
  .toLowerCase().replace(/\s+/g, ' ').trim()

const CANON = {}
for (const [canon, aliases] of Object.entries(SWEET_COFFEE_HISTORY.participantAliases ?? {})) {
  for (const alias of [].concat(aliases)) CANON[normalizar(alias)] = canon
}

const POR_EDICAO = (SWEET_COFFEE_HISTORY.edicoes ?? [])
  .map((ed) => [...new Set((ed.participantes ?? []).map((n) => CANON[normalizar(n)] ?? n))])

// Para cada marca, os índices das edições em que ela apareceu.
const APARICOES = new Map()
POR_EDICAO.forEach((marcas, i) => {
  for (const marca of marcas) {
    if (!APARICOES.has(marca)) APARICOES.set(marca, [])
    APARICOES.get(marca).push(i)
  }
})

test('o herói mostra exatamente quatro números', () => {
  assert.equal(NUMEROS.length, 4, 'o painel .pa-numeros deixou de ter quatro itens')
})

test('o painel NÃO mostra o total de marcas distintas', () => {
  // ⛔ Retirado a pedido do Eloi em 22/08/2026 — "por enquanto". O número não
  // estava errado: a base continua fechando em 123, e a asserção abaixo segue
  // guardando isso. O que saiu foi a EXIBIÇÃO.
  //
  // Este teste existe para que voltar seja um ato consciente: sem ele, alguém
  // reintroduz o item e nada avisa que havia uma decisão. Ao devolver, apagar
  // este teste, voltar a contagem para cinco e restaurar a verificação de que o
  // valor no HTML bate com APARICOES.size.
  const item = NUMEROS.find((n) => /participaram/.test(n.rotulo))
  assert.equal(item, undefined,
    'o total de marcas voltou ao painel — se foi de propósito, atualizar este teste')

  // A base segue sendo a fonte, mesmo com o número fora da tela (§9.1).
  assert.equal(APARICOES.size, 123, 'a contagem de marcas distintas divergiu do acervo §9.1')
})

test('"+7 marcas novas a cada edição" confere com a base', () => {
  // Estreia = a primeira edição de cada marca. A 1ª edição não conta: lá todas
  // estreavam, e incluí-la inflaria a média.
  const estreiasDepoisDaPrimeira = [...APARICOES.values()].filter((eds) => eds[0] > 0).length
  const edicoesSeguintes = POR_EDICAO.length - 1
  const esperado = '+' + Math.floor(estreiasDepoisDaPrimeira / edicoesSeguintes)

  const item = NUMEROS.find((n) => /novas/.test(n.rotulo))
  assert.ok(item, 'sumiu o número de estreias por edição')
  assert.equal(item.valor, esperado,
    `HTML diz ${item.valor}, a base diz ${esperado} ` +
    `(${estreiasDepoisDaPrimeira} estreias em ${edicoesSeguintes} edições)`)
})

test('"+18 mi visualizações" confere com festivalFacts', () => {
  // Este não sai da base histórica: é número comercial do acervo §9.5. A fonte
  // canônica no código é festivalFacts.igViews — é dela que o HTML tem de copiar.
  const item = NUMEROS.find((n) => /visualiza/.test(n.rotulo))
  assert.ok(item, 'sumiu o número de visualizações')
  const noHtml = Number(item.valor.replace(/[^\d]/g, ''))
  assert.equal(noHtml, festivalFacts.igViews.value,
    `HTML diz ${noHtml}, festivalFacts.igViews diz ${festivalFacts.igViews.value}`)
})

test('"410 combos criados desde 2016" confere com a base', () => {
  // Cada marca cria um combo próprio por edição (§8.6), então a soma das listas
  // de participantes é a contagem de criações. Aliases aplicados: uma rede com
  // três unidades conta uma vez por edição, não três.
  const esperado = String(POR_EDICAO.reduce((soma, marcas) => soma + marcas.length, 0))

  const item = NUMEROS.find((n) => /combos/.test(n.rotulo))
  assert.ok(item, 'sumiu o número de combos autorais')
  assert.equal(item.valor, esperado, `HTML diz ${item.valor}, a base diz ${esperado}`)
})

test('"271 lugares no pódio desde 2019" confere com a base', () => {
  // Uma colocação por nome: empate em 1º com duas marcas são duas colocações,
  // porque duas marcas subiram. Os pódios de 2026.1 moram em
  // loversAwardsResults.js, NÃO na base histórica (§7.3) — ignorá-los tira 44
  // colocações da conta e derruba 44 premiadas para 42.
  const premiadas = new Set()
  const elegiveis = new Set()
  let colocacoes = 0

  for (const ed of SWEET_COFFEE_HISTORY.edicoes ?? []) {
    const categorias = ed.id === '2026.1'
      ? (LOVERS_AWARDS.premiacao?.categorias ?? [])
      : (ed.premiacao?.categorias ?? [])
    if (ed.premiacao?.status !== 'completa' && categorias.length === 0) continue

    for (const nome of ed.participantes ?? []) elegiveis.add(CANON[normalizar(nome)] ?? nome)
    for (const cat of categorias)
      for (const col of cat.colocacoes ?? []) {
        colocacoes += (col.nomes ?? []).length
        for (const nome of col.nomes ?? []) premiadas.add(CANON[normalizar(nome)] ?? nome)
      }
  }

  const item = NUMEROS.find((n) => /pódio/.test(n.rotulo))
  assert.ok(item, 'sumiu o número de colocações')
  assert.equal(item.valor, String(colocacoes),
    `HTML diz ${item.valor}, a base diz ${colocacoes}`)
  // §9.1: o acervo fecha em 271 colocações.
  assert.equal(colocacoes, 271, 'a contagem de colocações divergiu do acervo §9.1')

  // Trava a armadilha do §7.3: sem os pódios da Lovers isto cai para 42.
  assert.equal(premiadas.size, 44, 'a contagem de premiadas divergiu do acervo §9.1')
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
    visualiza: 'redes/instagram',
    novas: 'marca/estrela',
    combos: 'combos/doce-cafe',
    'pódio': 'premios/medalha',
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

/* ── Índice dos passos ───────────────────────────────────────────────────────
 *
 * O índice repete, no topo, os nomes que os <h2> dos passos já dizem. É uma
 * segunda fonte para o mesmo conceito — o padrão que o §5.2 manda evitar —, e
 * aqui não dá para colapsar: a página é estática e não tem de onde derivar.
 * Então a costura é o teste: renomear um passo e esquecer o índice reprova.
 */

const ITENS_INDICE = [...HTML.matchAll(new RegExp(
  '<a href="(#titulo-\\d)"[^>]*>.*?<span class="pa-indice__nome">([^<]+)</span>', 'g',
))].map(([, href, nome]) => ({ href, nome }))

const TITULOS = Object.fromEntries([...HTML.matchAll(new RegExp(
  '<h2 class="scw-h2" id="(titulo-\\d)" tabindex="-1">([^<]+)</h2>', 'g',
))].map(([, id, texto]) => [id, texto]))

test('o índice cobre os quatro passos, com o nome que o passo usa', () => {
  assert.equal(ITENS_INDICE.length, 4, 'o índice deixou de ter quatro itens')
  assert.equal(Object.keys(TITULOS).length, 4, 'o formulário deixou de ter quatro passos')
  for (const { href, nome } of ITENS_INDICE) {
    const id = href.slice(1)
    assert.ok(TITULOS[id], 'o índice aponta para um alvo que não existe: ' + href)
    assert.equal(nome, TITULOS[id],
      `o índice diz "${nome}" e o passo diz "${TITULOS[id]}" — renomeou um e esqueceu o outro`)
  }
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
  assert.ok(bloco.includes('recalcularIndice()'),
    'a falha de validação precisa acender a contagem do índice')
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

test('o numeral do disco sustenta o magenta do passo 03', () => {
  const [, peso, tamanho] = regra('.pa-disco').match(/font:(\d{3}) (\d+)px/)
  const razao = contraste(TOKEN['scw-creme'], TOKEN['scw-magenta'])
  // Sobre magenta nenhuma tinta fecha 4,5:1 (§6.3). O numeral só passa como
  // texto grande — e isso é tamanho >= 18,66px em peso >= 700.
  assert.ok(Number(tamanho) >= 18.66 && Number(peso) >= 700,
    `disco a ${tamanho}px/${peso}: abaixo do piso de texto grande, então o mínimo volta a 4,5 e ${razao.toFixed(2)}:1 reprova`)
  assert.ok(razao >= 3, `creme sobre magenta dá ${razao.toFixed(2)}:1, abaixo do piso 3`)
})

test('marcar um chip não reembaralha a grade', () => {
  assert.ok(HTML.includes('.pa-escolha span::before{content:"✓"'),
    'o ✓ voltou a nascer no :checked — marcar um chip alarga a pílula e move as opções seguintes')
  assert.ok(HTML.includes('.pa-escolha input:checked + span::before{visibility:visible}'),
    'o ✓ marcado precisa aparecer por visibility, que preserva a caixa')
})

test('todo controle crava o piso de toque, sem depender de padding', () => {
  // O skip link ja nasceu a 43px: 15px de texto mais 28px de padding. Piso que
  // sai de soma de padding quebra sozinho quando alguem mexe na tipografia —
  // por isso a exigencia aqui e min-height declarado, nao altura resultante.
  for (const sel of ['.scw-skip', '.scw-btn', '.pa-escolha span', '.pa-indice a', '.pa-demo__btn']) {
    const m = regra(sel).match(/min-height:(\d+)px/)
    assert.ok(m, sel + ' nao crava min-height: o piso de toque volta a depender de aritmetica de padding')
    assert.ok(Number(m[1]) >= 44, sel + ' a ' + m[1] + 'px, abaixo do piso de 44')
  }
})
