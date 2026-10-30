// Os três "publicar" do painel da equipe e a ficha da marca (22/10/2026): cada destino ganhou nome e
// frase próprios (painel-app/src/lib/nomesPublicacao.js), e SÓ os nomes mudaram — chaves de rota,
// links gravados no banco e o `sub` da ficha seguem traduzindo para o mesmo lugar.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { NOMES_PUBLICACAO, ondeFica } from '../painel-app/src/lib/nomesPublicacao.js'
import { lerRota, montarRota, rotaDoLink, migrarRota, destinoNaFicha, subDaFicha, ABA_INICIAL, VISTAS_FICHA } from '../painel-app/src/lib/rota.js'
import { TOUR, etapasDoTour } from '../painel-app/src/lib/ajuda.js'

const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
// Conferência de código-fonte sem despejar o arquivo inteiro na falha.
const tem = (src, re) => assert.ok(re.test(src), 'faltou no código: ' + re)
const nao = (src, re) => assert.ok(!re.test(src), 'não devia estar no código: ' + re)
const MODULOS = ler('painel-app/src/components/Modulos.jsx')
const SHELL = ler('painel-app/src/components/PainelShell.jsx')
const FICHA = ler('painel-app/src/components/vistas/FichaMarcaPagina.jsx')
const PUBLICACAO = ler('painel-app/src/components/vistas/Publicacao.jsx')
const PUB_EDICAO = ler('painel-app/src/components/vistas/PublicacaoEdicao.jsx')
const MARCAS = ler('painel-app/src/components/vistas/Marcas.jsx')

// Abas reais, lidas do código (JSX não roda no node): { módulo: [{ chave, rotulo }] }. O rótulo pode ser
// literal ou `NOMES_PUBLICACAO.<assunto>.rotulo`.
function abasPorModulo() {
  const out = {}
  for (const bloco of MODULOS.split(/\nexport function /).slice(1)) {
    const id = /<Modulo id="(\w+)"/.exec(bloco)
    if (!id) continue
    out[id[1]] = [...bloco.matchAll(/\{ chave: '([^']*)', rotulo: (?:'([^']*)'|NOMES_PUBLICACAO\.(\w+)\.rotulo)/g)]
      .map(([, chave, literal, assunto]) => ({ chave, rotulo: literal ?? NOMES_PUBLICACAO[assunto].rotulo }))
  }
  return out
}
const ABAS = abasPorModulo()
const TITULOS = Object.fromEntries([...(/export const TITULOS = \{([\s\S]*?)\n\}/.exec(SHELL)[1]).matchAll(/(\w+): \['([^']+)'/g)].map(([, id, nome]) => [id, nome]))
const TODAS = () => true
const NENHUMA = () => false
const textosDoTour = (pode) => etapasDoTour(TOUR.organizacao, { pode }).map((e) => e.texto)

// O contrato de rotas no HEAD de 22/10/2026: se uma chave mudar, links gravados no banco, em avisos e
// em push (e favoritos) deixam de abrir a tela certa.
const CHAVES_DE_ROTA = {
  visao: [''],
  participantes: ['lista', 'candidaturas', 'temas', 'vendas', 'publicacao', 'preenchimento', 'localizacoes'],
  contatos: ['pessoas', 'presskit', 'vouchers', 'recebidos'],
  operacao: ['pedidos', 'fotos', 'materiais', 'qr'],
  social: ['planejamento', 'campanhas', 'biblioteca', 'participantes'],
  arquivos: ['gerais', 'participantes', 'arquivados'],
  edicao: ['configuracao', 'publicacao', 'avaliacoes', 'edicoes'],
  admin: ['equipe', 'revisao', 'importacoes', 'historico', 'formularios'],
}
// Onde cada assunto mora: [módulo, chave de rota].
const LUGAR = { marcas: ['participantes', 'publicacao'], edicao: ['edicao', 'publicacao'], instagram: ['social', 'planejamento'] }

test('os três nomes e as três frases são distintos, curtos e únicos entre todas as abas', () => {
  const N = Object.values(NOMES_PUBLICACAO)
  assert.equal(new Set(N.map((n) => n.rotulo)).size, 3)
  assert.equal(new Set(N.map((n) => n.frase)).size, 3)
  const todosRotulos = Object.values(ABAS).flat().map((a) => a.rotulo)
  for (const n of N) {
    assert.equal(todosRotulos.filter((r) => r === n.rotulo).length, 1, n.rotulo + ' aparece em mais de uma aba')
    assert.ok(n.rotulo.length <= 20, n.rotulo + ' não cabe na aba do celular')
  }
  // O nome genérico que confundia os dois lados não volta como aba.
  assert.ok(!todosRotulos.some((r) => r === 'Publicação' || r === 'Publicação no site'))
  // Frases pedidas pelo dono.
  assert.equal(NOMES_PUBLICACAO.marcas.frase, 'Revisar e publicar as páginas das marcas')
  assert.equal(NOMES_PUBLICACAO.edicao.frase, 'Liberar a edição no site (chaves e fase)')
  assert.equal(NOMES_PUBLICACAO.instagram.frase, 'Planejar posts do Instagram')
})

test('cada nome é o rótulo da aba real, no módulo certo', () => {
  for (const [assunto, [modulo, chave]] of Object.entries(LUGAR)) {
    const aba = ABAS[modulo].find((a) => a.chave === chave)
    assert.ok(aba, assunto + ': aba ' + modulo + '/' + chave + ' não existe')
    assert.equal(aba.rotulo, NOMES_PUBLICACAO[assunto].rotulo, assunto)
    assert.equal(TITULOS[modulo], NOMES_PUBLICACAO[assunto].modulo, assunto + ': nome do módulo')
    assert.equal(ondeFica(assunto), TITULOS[modulo] + ' › ' + aba.rotulo)
  }
  // O título do módulo Social media e as notas das páginas usam a frase de cada assunto.
  tem(MODULOS, /nota=\{NOMES_PUBLICACAO\.instagram\.frase \+ ' — o painel registra, não publica'\}/)
  tem(PUBLICACAO, /NOMES_PUBLICACAO\.marcas\.frase/)
  tem(PUB_EDICAO, /NOMES_PUBLICACAO\.edicao\.frase/)
})

test('nenhuma chave de rota mudou: abas, aba inicial e vistas da ficha', () => {
  for (const [modulo, chaves] of Object.entries(CHAVES_DE_ROTA)) assert.deepEqual(ABAS[modulo].map((a) => a.chave), chaves, modulo)
  assert.deepEqual(Object.keys(ABAS).sort(), Object.keys(CHAVES_DE_ROTA).sort())
  assert.deepEqual(ABA_INICIAL, { visao: '', participantes: 'lista', contatos: 'pessoas', operacao: 'pedidos', social: 'planejamento', arquivos: 'gerais', edicao: 'configuracao', admin: 'equipe' })
  const vistas = [...(/const VISTAS = (\[\[[^\n]*\]\])/.exec(FICHA)[1]).matchAll(/\['(\w+)', '([^']+)'\]/g)].map(([, k, r]) => [k, r])
  assert.deepEqual(vistas.map(([k]) => k), VISTAS_FICHA)
  assert.deepEqual(vistas.map(([, r]) => r), ['Visão do participante', 'Comunicação', 'Histórico', 'Gestão'])
})

test('rotas antigas continuam traduzindo para o mesmo destino', () => {
  // Endereço (depois do #): a aba é a chave, não o nome.
  for (const [modulo, chave] of Object.values(LUGAR)) {
    const r = { vista: modulo, aba: chave, filtros: {} }
    assert.deepEqual(lerRota('#' + modulo + '/' + chave), r)
    assert.equal(montarRota(r), '#' + modulo + '/' + chave)
  }
  assert.deepEqual(lerRota('#participantes/publicacao?situacao=com_pendencia'), { vista: 'participantes', aba: 'publicacao', filtros: { situacao: 'com_pendencia' } })
  assert.deepEqual(lerRota('#social/planejamento?item=r1&visao=mes'), { vista: 'social', aba: 'planejamento', filtros: { item: 'r1', visao: 'mes' } })
  // Links curtos gravados no banco, em avisos e em push.
  assert.deepEqual(rotaDoLink('marcas/p1/publicacao'), { vista: 'participantes', aba: 'lista', filtros: { item: 'p1', sub: 'publicacao' } })
  assert.deepEqual(rotaDoLink('social/planejamento/r1'), { vista: 'social', aba: 'planejamento', filtros: { item: 'r1' } })
  assert.deepEqual(rotaDoLink('social'), { vista: 'social', aba: 'planejamento', filtros: {} })
  assert.deepEqual(rotaDoLink('operacao/redes/r1'), { vista: 'social', aba: 'planejamento', filtros: { item: 'r1' } })
  assert.deepEqual(migrarRota({ vista: 'operacao', aba: 'redes', filtros: { item: 'r1' } }), { vista: 'social', aba: 'planejamento', filtros: { item: 'r1' } })
  // `sub` da ficha: os nomes antigos chegam à vista e à seção de sempre.
  const sub = { publicacao: ['visao', 'publicacao'], mensagens: ['comunicacao', ''], historico: ['historico', ''], acesso: ['gestao', ''], trajetoria: ['historico', 'trajetoria'] }
  for (const [s, [vista, secao]] of Object.entries(sub)) assert.deepEqual(destinoNaFicha(s), { vista, secao }, s)
  assert.equal(subDaFicha('visao', 'publicacao'), 'publicacao')
})

// Lacuna que existia em lib/rota.js (corrigida em 22/10/2026): rotaDoLink não conhecia a aba publicacao
// (nem preenchimento e avaliacoes) e links curtos caíam na lista de Marcas ou na Configuração.
test('links curtos "participantes/publicacao" e "edicao/publicacao" abrem a aba certa', () => {
    assert.deepEqual(rotaDoLink('participantes/publicacao'), { vista: 'participantes', aba: 'publicacao', filtros: {} })
    assert.deepEqual(rotaDoLink('edicao/publicacao'), { vista: 'edicao', aba: 'publicacao', filtros: {} })
  })

test('o tour só cita "Módulo › Aba" que existe, e cita os três lugares', () => {
  const nomesDeModulo = Object.values(TITULOS).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const cita = new RegExp('(' + nomesDeModulo + ') › ([^.,;:()—]+)', 'g')
  for (const pode of [TODAS, NENHUMA]) {
    for (const texto of textosDoTour(pode)) {
      for (const [, nomeModulo, aba] of texto.matchAll(cita)) {
        const id = Object.keys(TITULOS).find((k) => TITULOS[k] === nomeModulo)
        assert.ok(ABAS[id].some((a) => a.rotulo === aba.trim()), 'o tour cita "' + nomeModulo + ' › ' + aba.trim() + '", que não existe')
      }
    }
  }
  const tudo = textosDoTour(TODAS).join('\n')
  for (const assunto of Object.keys(LUGAR)) assert.ok(tudo.includes(ondeFica(assunto)), 'o tour não cita ' + ondeFica(assunto))
  // Cada frase que o tour usa é a da fonte única.
  assert.ok(tudo.includes(NOMES_PUBLICACAO.instagram.frase) && tudo.includes(NOMES_PUBLICACAO.edicao.frase) && tudo.includes(NOMES_PUBLICACAO.marcas.frase))
  // A Social media entra pelo mesmo menu: link abre a tela, âncora e permissão existem, e some sem a ação.
  const social = TOUR.organizacao.find((e) => e.id === 'social')
  assert.equal(rotaDoLink(social.link).vista, 'social')
  assert.ok(!etapasDoTour(TOUR.organizacao, { pode: NENHUMA }).some((e) => e.id === 'social'))
  assert.ok(!etapasDoTour(TOUR.organizacao, { telas: ['visao', 'participantes'] }).some((e) => e.id === 'social'))
})

test('o tour fala das quatro vistas da ficha, não das dez abas antigas', () => {
  const vistas = [...(/const VISTAS = (\[\[[^\n]*\]\])/.exec(FICHA)[1]).matchAll(/\['\w+', '([^']+)'\]/g)].map((m) => m[1])
  const participantes = etapasDoTour(TOUR.organizacao, { pode: TODAS }).find((e) => e.id === 'participantes').texto
  for (const v of vistas) assert.ok(participantes.includes(v), 'o tour não cita a vista ' + v)
  const conversa = etapasDoTour(TOUR.organizacao, { pode: TODAS }).find((e) => e.id === 'conversa').texto
  assert.match(conversa, /vá em Comunicação/)
  assert.doesNotMatch(textosDoTour(TODAS).join('\n'), /vá em Mensagens|cadastro, combo, unidades, operação, mensagens, acesso e histórico/)
})

test('ficha: "Visão do participante" (leitura) e "Ver como participante" (ação) têm nome e frase próprios, visíveis', () => {
  assert.notEqual('Visão do participante', 'Ver como participante')
  // A ação: mesma permissão e mesmo destino de antes, agora com a frase no item do menu.
  tem(FICHA, /pode\('acesso\.gerir'\) \? \[\{ rotulo: 'Ver como participante', icone: 'visao', descricao: FRASE_VER_COMO, onClick: \(\) => window\.open\('\/painel\/\?ver_como=' \+ p\.id, '_blank'\) \}\] : \[\]/)
  assert.equal((FICHA.match(/Ver como participante/g) || []).length >= 3, true, 'rótulo, nota e comentário')
  // A nota sob as abas diz as duas coisas; a sobre "como a marca vê" só aparece para quem tem a permissão da ação.
  tem(FICHA, /<b>\{VISTAS\[0\]\[1\]\}:<\/b> \{FRASE_VISAO\}/)
  tem(FICHA, /\{pode\('acesso\.gerir'\) && <> <b>Mais ações \(os três pontos\) › Ver como participante<\/b> — \{FRASE_VER_COMO\}<\/>\}/)
  tem(FICHA, /const FRASE_VISAO = '[^']*só para ler[^']*'/)
  tem(FICHA, /const FRASE_VER_COMO = '[^']*[Ss]ó leitura[^']*nada é gravado[^']*'/)
  // Nenhum botão de gravar entrou por causa da frase: a visão continua sem escrita.
  nao(FICHA, /Ver como participante[^\n]*rpc\(/)
})

test('a edição que a ação afeta aparece na ficha e nas telas de publicação', () => {
  // Cabeçalho da ficha.
  tem(FICHA, /'Edição ' \+ p\.edicao_codigo/)
  // Editores de coisa da edição levam o código no título (cadastro, que vale para todas, não).
  tem(FICHA, /EDITOR_DA_EDICAO = new Set\(\['combo', 'unidades', 'coordenadas', 'fotos', 'operacao', 'publicacao', 'nomeCombo'\]\)/)
  nao(FICHA, /EDITOR_DA_EDICAO = new Set\([^)]*'cadastro'/)
  // Página da marca: confirmações, título da seção e lista.
  tem(PUBLICACAO, /const naEd = ed \? ' \(edição ' \+ ed \+ '\)' : ''/)
  assert.equal((PUBLICACAO.match(/\+ naEd \+/g) || []).length, 3, 'publicar a casa, publicar casa e combo, retirar')
  tem(PUBLICACAO, /rotulo=\{NOMES_PUBLICACAO\.marcas\.pagina \+ \(ed \? ' · edição ' \+ ed : ''\)\}/)
  tem(PUBLICACAO, /Edição \{edicao\.codigo\}\./)
  // Liberação da edição.
  tem(PUB_EDICAO, /Vale para a edição \{edicao\.codigo\} inteira, não para uma marca/)
  tem(PUB_EDICAO, /'Mudar a fase da edição ' \+ edicao\.codigo \+ ' para "'/)
  tem(PUB_EDICAO, /'" na edição ' \+ edicao\.codigo \+ '\? '/)
})

test('abrir uma ficha e voltar devolve a lista com busca, situação e ordem (já é assim, pelo endereço)', () => {
  const lista = { busca: 'café & cia', situacao: 'incompleto', ordem: 'nome' }
  const aberta = { ...lista, item: 'p1', sub: 'publicacao' } // setFicha({ id, aba }) = mudar({ item, sub })
  const fechada = { ...aberta, item: '', sub: '' } // setFicha(null) = mudar({ item: '', sub: '' })
  const r = (filtros) => lerRota(montarRota({ vista: 'participantes', aba: 'lista', filtros })).filtros
  assert.deepEqual(r(aberta), { ...lista, item: 'p1', sub: 'publicacao' })
  assert.deepEqual(r(fechada), lista)
  // O código faz exatamente isso: espalha os filtros do endereço e só troca item/sub.
  tem(MARCAS, /const mudar = \(novos, substituir = true\) => navegar\(\{ filtros: \{ \.\.\.f, \.\.\.novos \} \}, \{ substituir \}\)/)
  tem(MARCAS, /const setFicha = \(x\) => mudar\(x \? \{ item: x\.id, sub: [^}]+\} : \{ item: '', sub: '', campo: '' \}, false\)/)
  tem(MARCAS, /const setTermo = \(v\) => mudar\(\{ busca: v \}\)/)
})
