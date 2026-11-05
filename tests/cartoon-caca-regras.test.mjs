// Caça aos Carimbos — regras puras da interface e rotas (src/edicao/caca/regras.js, src/edicao/rotas.js, estadoAlbum v2).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { resolverCena } from '../src/edicao/rotas.js'
import * as C from '../src/edicao/rota/carimbo.js'
import { proximaAcao, resumoProgresso, nomeDaCasa, situacaoEmail, emailMascarado, ajudaLocalizacao, tokenValido, grupoIdValido } from '../src/edicao/caca/regras.js'
import { CACA, CACA_CAMINHOS, mensagemDoMotivo } from '../src/edicao/caca/textos.js'

const raiz = path.resolve(import.meta.dirname, '..')
const UUID = '3f2b8c1e-5a4d-4e7f-9b6a-1c2d3e4f5a6b'
const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz012-_9'

test('próxima ação: vazio · pendente primeiro · continuar · completo', () => {
  assert.deepEqual(proximaAcao(null), { tipo: 'comecar' })
  assert.deepEqual(proximaAcao({ total_casas: 27, casas_validadas: 0, casas: [] }), { tipo: 'comecar' })
  const pend = { total_casas: 27, casas_validadas: 1, casas: [{ slug: 'b', estado: 'pendente' }, { slug: 'a', estado: 'validada' }, { slug: 'c', estado: 'pendente' }] }
  assert.deepEqual(proximaAcao(pend), { tipo: 'avaliar', slug: 'b', mais: 1 })
  assert.deepEqual(proximaAcao({ total_casas: 27, casas_validadas: 2, casas: [{ slug: 'a', estado: 'validada' }] }), { tipo: 'continuar' })
  assert.deepEqual(proximaAcao({ total_casas: 3, casas_validadas: 3, casas: [{ slug: 'a', estado: 'validada' }] }), { tipo: 'completo' })
  assert.equal(proximaAcao({ total_casas: 3, casas_validadas: 3, casas: [{ slug: 'a', estado: 'pendente' }] }).tipo, 'avaliar', 'pendente vem antes de completo')
  assert.equal(proximaAcao({ total_casas: 0, casas_validadas: 0, casas: [] }).tipo, 'comecar', 'sem casas na edição nunca é "completo"')
})

test('resumo do progresso: total vem do servidor, empate não conta a própria pessoa', () => {
  const r = resumoProgresso({ total_casas: 30, casas_validadas: 4, extras: 2, faltam: 26, posicao: 3, empatados: 3, casas: [{ estado: 'pendente' }, { estado: 'validada' }] })
  assert.deepEqual(r, { total: 30, validadas: 4, faltam: 26, extras: 2, posicao: 3, comEmpate: 2, pendentes: 1, completo: false })
  assert.equal(resumoProgresso({ total_casas: 5, casas_validadas: 5 }).completo, true)
  assert.equal(resumoProgresso({ total_casas: 5, casas_validadas: 2 }).faltam, 3, 'sem "faltam", calcula do total do servidor')
  assert.deepEqual(resumoProgresso(null), { total: 0, validadas: 0, faltam: 0, extras: 0, posicao: null, comEmpate: 0, pendentes: 0, completo: false })
  assert.equal(resumoProgresso({ posicao: null }).posicao, null)
})

test('nome da casa, situação do e-mail e máscara', () => {
  assert.equal(nomeDaCasa({ participantes: [{ slug: 'a', casa: { nome: 'Casa A' } }] }, 'a'), 'Casa A')
  assert.equal(nomeDaCasa(null, 'a'), 'a casa')
  assert.equal(situacaoEmail({ ok: true, valido: true, confirmado: true }), 'confirmado')
  assert.equal(situacaoEmail({ ok: true, valido: true, confirmado: false }), 'pendente')
  assert.equal(situacaoEmail({ ok: true, valido: false, confirmado: false }), 'desconhecido')
  assert.equal(situacaoEmail({ ok: false, motivo: 'rede' }), 'desconhecido')
  assert.equal(emailMascarado('ana@exemplo.com'), 'a**@exemplo.com')
  assert.equal(emailMascarado('x'), '')
})

test('ajuda de localização: negada · demorou · imprecisa · fora do caso', () => {
  assert.match(ajudaLocalizacao({ motivo: 'sem_localizacao', posicao: 'negada' }).titulo, /bloqueou/)
  assert.match(ajudaLocalizacao({ motivo: 'sem_localizacao', posicao: 'demorou' }).titulo, /demorou/)
  assert.match(ajudaLocalizacao({ motivo: 'sem_localizacao', posicao: 'indisponivel' }).titulo, /não conseguiu/)
  assert.match(ajudaLocalizacao({ motivo: 'sem_localizacao' }).titulo, /Precisamos/)
  const fraca = ajudaLocalizacao({ motivo: 'longe', precisao: 350 })
  assert.match(fraca.titulo, /fraco/)
  assert.match(fraca.texto, /350 m/)
  assert.ok(fraca.passos.length >= 2)
  assert.equal(ajudaLocalizacao({ motivo: 'longe', precisao: 20 }), null, 'longe com GPS bom é "você está longe", não ajuda de permissão')
  assert.equal(ajudaLocalizacao({ motivo: 'cedo' }), null)
})

test('formatos de token e de grupo', () => {
  assert.equal(tokenValido(TOKEN), true)
  for (const t of ['', 'curto', 'x'.repeat(65), `${TOKEN}!`, null, `${TOKEN} `]) assert.equal(tokenValido(t), false)
  assert.equal(grupoIdValido(UUID), true)
  assert.equal(grupoIdValido('3f2b8c1e'), false)
})

test('rotas da Caça: central, seções, grupo e convite', () => {
  const c = (p) => resolverCena(p)
  assert.deepEqual(c('/cartoon/caca'), { cena: 'caca', secao: 'central' })
  assert.deepEqual(c('/cartoon/caca/'), { cena: 'caca', secao: 'central' })
  for (const s of ['recuperar', 'mapa', 'ranking', 'grupos', 'metas', 'compartilhar']) assert.deepEqual(c(`/cartoon/caca/${s}`), { cena: 'caca', secao: s })
  assert.deepEqual(c(`/cartoon/caca/grupo/${UUID}`), { cena: 'caca', secao: 'grupo', grupoId: UUID })
  assert.deepEqual(c(`/cartoon/caca/grupo/${UUID.toUpperCase()}`), { cena: 'caca', secao: 'grupo', grupoId: UUID })
  assert.deepEqual(c(`/cartoon/caca/convite/${TOKEN}`), { cena: 'caca', secao: 'convite', token: TOKEN }, 'o token é case-sensitive')
  assert.deepEqual(c('/cartoon/caca/convite/curto'), { cena: 'caca', secao: 'convite', token: null }, 'token ruim abre a página, que explica')
  assert.deepEqual(c(`/cartoon/caca/convite/${TOKEN}?x=1#y`), { cena: 'caca', secao: 'convite', token: TOKEN })
  for (const p of ['/cartoon/caca/xyz', '/cartoon/caca/grupo', '/cartoon/caca/grupo/nao-uuid', '/cartoon/caca/convite', `/cartoon/caca/convite/${TOKEN}/x`, '/cartoon/caca/mapa/x', '/cartoon/caca/ranking/1', '/cartoon/cacax']) {
    assert.deepEqual(c(p), { cena: 'inexistente' }, p)
  }
  // O que já existia continua igual.
  assert.deepEqual(c('/cartoon/mapa'), { cena: 'mapa' })
  assert.deepEqual(c('/cartoon/carimbo/abcd2345'), { cena: 'carimbo', codigo: 'abcd2345' })
})

test('caminhos da Caça nos textos batem com as rotas', () => {
  for (const [chave, caminho] of Object.entries({ central: CACA_CAMINHOS.central, recuperar: CACA_CAMINHOS.recuperar, mapa: CACA_CAMINHOS.mapa, ranking: CACA_CAMINHOS.ranking, grupos: CACA_CAMINHOS.grupos, metas: CACA_CAMINHOS.metas, compartilhar: CACA_CAMINHOS.compartilhar })) {
    assert.equal(resolverCena(caminho).cena, 'caca', chave)
  }
  assert.equal(resolverCena(CACA_CAMINHOS.grupo(UUID)).secao, 'grupo')
  assert.equal(resolverCena(CACA_CAMINHOS.convite(TOKEN)).token, TOKEN)
  for (const s of Object.keys(CACA.titulos)) assert.ok(CACA.leads[s], `lead de ${s}`)
})

test('álbum no formato v2: total do servidor, extras, faltam e posição', () => {
  const participantes = [{ slug: 'a', casa: { nome: 'A' } }, { slug: 'b', casa: { nome: 'B' } }, { slug: 'c', casa: { nome: 'C' } }]
  const mapa = { total_casas: 27, casas_validadas: 1, extras: 2, faltam: 26, posicao: 4, empatados: 2, casas: [{ slug: 'a', carimbos: 3, avaliou: true, estado: 'validada' }, { slug: 'b', carimbos: 1, avaliou: false, estado: 'pendente' }] }
  const a = C.estadoAlbum(participantes, mapa)
  assert.deepEqual([a.visitadas, a.pendentes, a.total, a.extras, a.faltam, a.posicao], [1, 1, 27, 2, 26, 4])
  assert.equal(C.estadoAlbum(participantes, null).total, 3, 'sem mapa, a lista da edição')
})

test('mensagens: muitos pedidos, motivos desconhecidos e nada de "voto"', () => {
  assert.match(C.mensagemCriar('muitos_pedidos'), /Muitos pedidos/)
  assert.match(mensagemDoMotivo('muitos_pedidos'), /Muitos pedidos/)
  assert.equal(mensagemDoMotivo('coisa_nova'), mensagemDoMotivo('generico'))
  const textos = JSON.stringify(CACA).toLowerCase()
  assert.doesNotMatch(textos, /vota[çc]|\bvoto/)
  assert.doesNotMatch(textos, /plaquinha/, 'a surpresa do prêmio final não se revela')
})

test('chave, token e código não vão para console, analytics nem endereço de compartilhamento', () => {
  for (const f of ['src/edicao/caca/api.js', 'src/edicao/caca/useCaca.js', 'src/edicao/caca/CodigoPorEmail.jsx', 'src/edicao/caca/GuardarMapa.jsx', 'src/edicao/caca/CriarMapa.jsx', 'src/edicao/caca/Recuperar.jsx']) {
    const src = fs.readFileSync(path.join(raiz, f), 'utf8')
    assert.doesNotMatch(src, /console\.|gtag|wa\.me|navigator\.share/, f)
  }
})

/* ---------------------------------------------------------------- correções da revisão do front (chave, apagar, regulamento) */

const fonte = (rel) => fs.readFileSync(path.join(raiz, rel), 'utf8')

test('useCaca: o aviso "guarde seu mapa" mora no estado (sobrevive ao "carregando"), entrar na mesma chave relê e apagar só some com confirmação', () => {
  const hook = fonte('src/edicao/caca/useCaca.js')
  assert.match(hook, /recemCriado/, 'o estado do aviso é do hook')
  assert.match(hook, /return \{[^}]*recemCriado/)
  assert.match(hook, /nova === atual\.current\) \{[^}]*setLeitura/, 'mesma chave: manda reler, não fica em "carregando"')
  assert.match(hook, /anterior\.current/, 'chave desconhecida volta para a que o aparelho já tinha')
  assert.match(hook, /const r = await api\.mapaApagar\(chave\)[\s\S]*?return false[\s\S]*?sair\(\)/, 'sem confirmação do banco a chave não sai do aparelho')
  assert.doesNotMatch(hook, /apaga do aparelho mesmo assim/)
  assert.match(hook, /C\.apagarPerfil/, 'sair/apagar limpam o perfil local')
  // a Central e as seções que exigem mapa mostram o aviso a partir do hook, não de estado local que o "carregando" desmonta
  assert.doesNotMatch(fonte('src/edicao/caca/Central.jsx'), /useState/)
  assert.match(fonte('src/edicao/caca/Central.jsx'), /caca\.recemCriado && <GuardarMapa/)
  const pagina = fonte('src/edicao/cartoon/paginas/caca/index.jsx')
  assert.match(pagina, /caca\.entrar\(k, \{ criado \}\)/)
  assert.match(pagina, /caca\.recemCriado[\s\S]*?<GuardarMapa/)
})

test('AbrirPeloLink não grava a chave colada antes de o banco confirmar; apagarPerfil limpa só o perfil', () => {
  const link = fonte('src/edicao/caca/CriarMapa.jsx').split('export function CriarMapa')[0]
  assert.doesNotMatch(link, /gravarChave/)
  const loja = new Map([['scw:edicao:2026.2:perfil', '{"nome":"Ana"}'], ['scw:edicao:2026.2:mapa', 'x']])
  const arm = { getItem: (k) => loja.get(k) ?? null, setItem: (k, v) => loja.set(k, v), removeItem: (k) => loja.delete(k) }
  C.apagarPerfil('2026.2', arm)
  assert.equal(loja.has('scw:edicao:2026.2:perfil'), false)
  assert.equal(loja.has('scw:edicao:2026.2:mapa'), true)
  assert.doesNotThrow(() => C.apagarPerfil('2026.2', { removeItem () { throw new Error('sem storage') } }))
})

test('css: a lista da rota do grupo não vaza grid/margem para o painel "Minha rota" (div.ct-rota)', () => {
  const css = fonte('src/styles/cartoon/14-caca-grupos.css')
  assert.doesNotMatch(css, /^\.ct-rota \{/m)
  assert.match(css, /^ol\.ct-rota \{/m)
})

test('regulamento: sem pontos, sem "mais carimbos", com a regra do servidor e sem preencher os campos a definir', async () => {
  const { REGULAMENTO } = await import('../src/edicao/cartoon/regulamento.js')
  const itens = REGULAMENTO.secoes.flatMap(([, xs]) => xs)
  const texto = itens.filter((x) => typeof x === 'string').join('\n')
  assert.doesNotMatch(texto, /\bpontos\b|\b(1|um) ponto\b/i, 'a regra vigente não tem pontos')
  assert.doesNotMatch(texto, /mais carimbos válidos|número de chances|cada carimbo válido é uma chance|mapas completos/i)
  assert.match(texto, /casas diferentes/); assert.match(texto, /carimbos? extras?/); assert.match(texto, /e-mail do mapa precisa estar confirmado/); assert.match(texto, /15\/11/)
  assert.doesNotMatch(texto, /\b2 horas|segunda chamada/i, 'prazo da 2ª chamada é proposta, não regra')
  assert.doesNotMatch(texto, /só vale na casa/, 'unidade sem ponto conferido não exige localização')
  assert.equal(itens.filter((x) => x?.aDefinir).length, 3, 'idade, entrega do prêmio e guarda dos dados seguem a definir')
  const legal = fonte('src/data/conteudo/legal.js')
  assert.doesNotMatch(legal, /contar os pontos|prazo de guarda está no regulamento/)
})

test('textos: "Já fui" é lembrete pessoal (não valida), metas em definição e avisos sem promessa de disparo automático', async () => {
  const { ROTA } = await import('../src/edicao/cartoon/textos.js')
  assert.doesNotMatch(ROTA.jaFuiVazio, /conta no seu progresso/)
  assert.match(ROTA.jaFuiVazio, /carimbo/)
  assert.doesNotMatch(ROTA.progressoRotulo, /^visitadas$/)
  const { EXTRAS } = await import('../src/edicao/caca/textos-extras.js')
  assert.doesNotMatch(EXTRAS.push.lead, /tudo o que importa também aparece/)
  assert.match(EXTRAS.push.lead, /organização/)
  assert.match(CACA.carimbo.privacidade, /quando ela já tem o ponto conferido/)
})
