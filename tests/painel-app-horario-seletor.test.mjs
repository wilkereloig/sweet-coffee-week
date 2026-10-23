// Horário no festival (23/10/2026): o que o seletor (components/HorarioFestival.jsx) DIZ e OFERECE em cada estado.
// Desenhado em HTML (react-dom/server), sem navegador: prova texto, ordem e rótulos; o toque de verdade é do teste de navegador.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { carregar, html } from './_renderizar.mjs'
import { datasDoFestival } from '../painel-app/src/lib/horarioFestival.js'

const { HorarioFestival } = carregar('painel-app/src/components/HorarioFestival.jsx')
const DATAS = datasDoFestival('2026-11-05', '2026-11-15')
const linhasIguais = (abre, fecha) => DATAS.map((data) => ({ data, abre, fecha }))
const desenhar = (props) => html(HorarioFestival, { id: 'hf-t', datas: DATAS, valor: [], ...props })
const marcados = (h) => [...h.matchAll(/<input type="radio"[^>]*checked=""[^>]*>/g)].length

test('sem resposta: a pergunta, as duas opções, nada marcado e nenhuma linha', () => {
  const h = desenhar()
  assert.match(h, /Como esta unidade funciona nos dias do festival\?/)
  assert.match(h, /De 5 a 15 de novembro\. Se for diferente do horário normal da loja, vale o do festival\./)
  assert.match(h, /Igual todos os dias/)
  assert.match(h, /Muda conforme o dia/)
  assert.equal(marcados(h), 0, 'nenhuma opção pré-marcada')
  assert.ok(!/hf__linha/.test(h), 'sem arranjo escolhido não há linha para preencher')
  assert.ok(!/Detalhar dia a dia/.test(h))
  assert.match(h, /role="status"/, 'a região de estado existe sempre (o leitor de tela anuncia a mudança)')
  assert.ok(!/horário da loja|horário do combo/i.test(h), 'uma pergunta só: nada de "horário da loja" × "horário do combo"')
})

test('horário antigo em texto: aparece como "Hoje está" para confirmar ou trocar, só enquanto não há resposta', () => {
  const h = desenhar({ textoAntigo: 'Seg a sáb 10h às 22h' })
  assert.match(h, /Hoje está: <b>Seg a sáb 10h às 22h<\/b>\. Escolha acima para confirmar ou trocar\./)
  const respondido = desenhar({ textoAntigo: 'Seg a sáb 10h às 22h', valor: linhasIguais('10:00', '22:00') })
  assert.ok(!/Hoje está/.test(respondido), 'com horário gravado, o texto antigo não atrapalha')
})

test('igual todos os dias: uma linha, horas escolhidas e o resumo', () => {
  const h = desenhar({ valor: linhasIguais('10:00', '22:00') })
  assert.equal(marcados(h), 2, 'o arranjo e "Abre"')
  assert.match(h, /data-hf-linha="todos"/)
  assert.match(h, /<legend class="hf__rotulo">Todos os dias<\/legend>/)
  assert.match(h, /aria-label="Todos os dias: abre às"/)
  assert.match(h, /aria-label="Todos os dias: fecha às"/)
  assert.match(h, /<option value="10:00" selected="">10h<\/option>/)
  assert.match(h, /<option value="22:00" selected="">22h<\/option>/)
  assert.match(h, /Fica assim: <b>Todos os dias, das 10h às 22h<\/b>/)
  assert.match(h, /Incluir intervalo \(ex\.: fecha para o almoço\)/)
  assert.ok(!/Detalhar dia a dia/.test(h))
})

test('muda conforme o dia: três linhas, "Detalhar dia a dia" e domingo fechado', () => {
  const valor = DATAS.flatMap((data) => {
    const dow = new Date(data + 'T12:00:00Z').getUTCDay()
    if (dow === 0) return []                                  // domingo não abre
    return [dow === 6 ? { data, abre: '12:00', fecha: '20:00' } : { data, abre: '10:00', fecha: '22:00' }]
  })
  const h = desenhar({ valor })
  assert.match(h, /data-hf-linha="semana"/)
  assert.match(h, /data-hf-linha="sab"/)
  assert.match(h, /data-hf-linha="dom"/)
  assert.match(h, /<legend class="hf__rotulo">Segunda a sexta<\/legend>/)
  assert.match(h, /Detalhar dia a dia/)
  assert.ok(!/Voltar a Segunda a sexta/.test(h))
  assert.match(h, /Fica assim: <b>Segunda a sexta, das 10h às 22h · Sábado, das 12h às 20h · Domingo, não abre<\/b>/)
})

test('dia a dia com dois períodos e meia-noite: uma linha por data e o intervalo com saída', () => {
  const valor = [
    // quinta 5/11 não abre (sem linha); sexta 6/11 fecha para o almoço; os outros dias, 10h às 22h
    ...DATAS.filter((d) => d !== '2026-11-05' && d !== '2026-11-06').map((data) => ({ data, abre: '10:00', fecha: '22:00' })),
    { data: '2026-11-06', abre: '10:00', fecha: '14:00' }, { data: '2026-11-06', abre: '18:00', fecha: '24:00' },
  ]
  const h = desenhar({ valor })
  assert.match(h, /data-hf-linha="2026-11-05"/)
  assert.match(h, /data-hf-linha="2026-11-15"/)
  assert.match(h, /<legend class="hf__rotulo">Qui 5\/11<\/legend>/)
  assert.match(h, /Tirar este intervalo/)
  assert.match(h, /e das/)
  assert.match(h, /meia-noite/)
  assert.ok(!/Voltar a Segunda a sexta/.test(h), 'os dias diferem dentro da semana: não dá para agrupar sem perder')
})

test('sem datas do festival: avisa em vez de desenhar um seletor vazio', () => {
  const h = html(HorarioFestival, { id: 'hf-t', datas: [], valor: [] })
  assert.match(h, /As datas do festival ainda não foram definidas pela organização/)
  assert.ok(!/<fieldset/.test(h))
})

test('desabilitado trava as opções e as ações', () => {
  const h = desenhar({ valor: linhasIguais('10:00', '22:00'), desabilitado: true })
  assert.ok((h.match(/<fieldset[^>]*disabled=""/g) || []).length >= 2, 'o arranjo e cada linha')
  const semana = desenhar({ desabilitado: true })
  assert.match(semana, /<fieldset class="hf__modos" disabled="">/)
})

test('CSS do seletor: só tokens, alvo de 44px e nenhuma regra solta fora de .hf', () => {
  const css = readFileSync(new URL('../painel-app/src/styles/horario-festival.css', import.meta.url), 'utf8')
  const semComentario = css.replace(/\/\*[\s\S]*?\*\//g, '')
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(semComentario), 'nenhum hex: cor sai dos tokens')
  assert.ok(!/text-transform\s*:\s*uppercase/.test(semComentario), 'caixa-alta só em .ui-macro__rotulo')
  for (const seletor of semComentario.replace(/@media[^{]*\{/g, '').split('}').map((r) => r.split('{')[0].trim()).filter(Boolean)) {
    for (const s of seletor.split(',')) assert.match(s.trim(), /^\.hf\b/, 'seletor fora do escopo .hf: ' + s)
  }
  assert.match(css, /\.hf__opcao\{[^}]*min-height:44px/)
  assert.match(css, /\.hf__acao\{[^}]*min-height:44px/)
  assert.match(css, /@media \(hover:hover\)\{ \.hf \.hf__acao:hover/, 'hover só onde há ponteiro')
  assert.ok(!/(^|[^-])\.hf[^{]*:hover[^{]*\{/.test(semComentario.replace(/@media \(hover:hover\)\{[^}]*\}\s*\}?/g, '')), 'nenhum :hover fora de (hover:hover)')
})

test('rascunho do seletor: só refaz quando o horário de FORA muda de verdade (releitura igual numa lista nova não apaga o que a pessoa montou)', () => {
  const { aoMudarValor } = carregar('painel-app/src/components/HorarioFestival.jsx')
  const l = (data, abre, fecha) => ({ data, abre, fecha })
  const S = [l('2026-11-05', '10:00', '22:00')]                    // o que está gravado
  const D = [l('2026-11-05', '12:00', '20:00')]                    // o rascunho completo que a tela avisou
  const ch = 'a'
  const canon = (x) => aoMudarValor({ servidor: { linhas: [], datas: ch }, conhecido: { linhas: [], datas: ch } }, x, ch).servidor.linhas
  let estado = { servidor: { linhas: canon(S), datas: ch }, conhecido: { linhas: canon(D), datas: ch } }   // a pessoa montou D por cima de S
  // 1. releitura silenciosa trouxe o MESMO S numa lista nova (e chaves em outra ordem): nada a refazer
  let r = aoMudarValor(estado, [{ fecha: '22:00:00', abre: '10:00', data: '2026-11-05' }], ch)
  assert.equal(r.refazer, false, 'o rascunho D continua valendo')
  // 2. o pai ecoou o que a tela avisou (valor = D): também não refaz
  r = aoMudarValor(estado, D, ch)
  assert.equal(r.refazer, false)
  assert.deepEqual(r.servidor.linhas, canon(D), 'e passa a saber que lá fora já é D')
  // 3. mudou de verdade lá fora (outra pessoa gravou outra coisa): refaz
  const T = [l('2026-11-05', '08:00', '14:00')]
  r = aoMudarValor(estado, T, ch)
  assert.equal(r.refazer, true)
  assert.deepEqual(r.conhecido.linhas, canon(T))
  // 4. trocaram as datas do festival: refaz mesmo com as linhas iguais
  assert.equal(aoMudarValor(estado, S, 'b').refazer, true)
  // 5. primeira vez, sem nada mexido: o valor inicial não refaz nada
  estado = { servidor: { linhas: canon(S), datas: ch }, conhecido: { linhas: canon(S), datas: ch } }
  assert.equal(aoMudarValor(estado, S, ch).refazer, false)
})
