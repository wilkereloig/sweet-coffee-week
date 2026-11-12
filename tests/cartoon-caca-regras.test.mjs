// Caça aos Carimbos — regras puras da interface e rotas (src/edicao/caca/regras.js, src/edicao/rotas.js, estadoAlbum v2).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { resolverCena } from '../src/edicao/rotas.js'
import * as C from '../src/edicao/rota/carimbo.js'
import { proximaAcao, resumoProgresso, nomeDaCasa, situacaoEmail, emailMascarado, ajudaLocalizacao, tokenValido, grupoIdValido } from '../src/edicao/caca/regras.js'
import { CACA, CACA_CAMINHOS, mensagemDoMotivo } from '../src/edicao/caca/textos.js'
import { FRASES, faixaDoDia, situacaoDoJogo, saudar, contextoDaSaudacao } from '../src/edicao/caca/saudacao.js'

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
  assert.equal(itens.filter((x) => x?.aDefinir).length, 2, 'entrega do prêmio e guarda dos dados seguem a definir (idade: 18 anos, decidido em 05/11)')
  const legal = fonte('src/data/conteudo/legal.js')
  assert.doesNotMatch(legal, /contar os pontos|prazo de guarda está no regulamento/)
})

test('textos: "Já fui" é lembrete pessoal (não valida), metas em definição e avisos sem promessa de disparo automático', async () => {
  const { ROTA } = await import('../src/edicao/cartoon/textos.js')
  assert.doesNotMatch(ROTA.jaFuiVazio, /conta no seu progresso/)
  assert.match(ROTA.jaFuiVazio, /carimb(?:o|e)/)
  assert.match(ROTA.jaFuiVazio, /avalie/)
  assert.doesNotMatch(ROTA.progressoRotulo, /^visitadas$/)
  const { EXTRAS } = await import('../src/edicao/caca/textos-extras.js')
  assert.doesNotMatch(EXTRAS.push.lead, /tudo o que importa também aparece/)
  assert.match(EXTRAS.push.honestidade, /organização/) // o lead novo (430669b6) não cita mais a organização; a honestidade segue dizendo quem envia
  assert.match(CACA.carimbo.privacidade, /quando ela já tem o ponto conferido/)
})

// ---------------------------------------------------------------- saudação do cartão "Mapa de <apelido>" (saudacao.js, 12/11/2026)
const natal = (iso) => new Date(`${iso}-03:00`) // 'AAAA-MM-DDTHH:MM' em Natal (UTC−3, sem horário de verão)
const EDICAO_T = { inicio: '2026-11-05', fim: '2026-11-15' }
const RESUMO = (o = {}) => ({ total: 27, validadas: 2, faltam: 25, pendentes: 0, completo: false, ...o })
const CASA = (slug, abre, fecha, data = '2026-11-12') => ({ slug, unidades: [{ id: `u-${slug}`, combo: { disponibilidade: [{ data, abre, fecha }] } }] })
const ctx = (quando, o = {}) => contextoDaSaudacao({ apelido: 'Eloi', resumo: RESUMO(o.resumo), dados: { edicao: EDICAO_T, participantes: o.casas || [] }, agora: natal(quando) })
const SORTEIOS = Array.from({ length: 50 }, (_, i) => ({ a: i / 50, b: i / 50 }))
const todas = (c) => new Set(SORTEIOS.map((x) => saudar(c, x).incentivo))

test('saudação: a faixa do dia vem da hora de Natal (bom dia · boa tarde · boa noite · madrugada)', () => {
  assert.deepEqual([0, 4, 5, 11, 12, 17, 18, 23].map(faixaDoDia), ['madrugada', 'madrugada', 'manha', 'manha', 'tarde', 'tarde', 'noite', 'noite'])
  assert.equal(faixaDoDia(NaN), 'tarde', 'hora estranha nunca quebra')
  // 02:30 UTC de 12/11 ainda é 23:30 de 11/11 em Natal: dia e hora seguem o fuso do festival, não o do aparelho
  const c = contextoDaSaudacao({ apelido: 'Eloi', resumo: RESUMO(), dados: { edicao: EDICAO_T }, agora: new Date('2026-11-12T02:30:00Z') })
  assert.equal(c.faixa, 'noite')
  assert.equal(c.diaDaSemana, 3, '11/11/2026 é quarta-feira')
})

test('saudação: três formas com o nome do mapa; sem apelido, as mesmas sem o nome (nada de "undefined" nem vírgula solta)', () => {
  const c = ctx('2026-11-12T15:00')
  assert.equal(c.nome, 'Eloi')
  assert.deepEqual([0, 0.4, 0.9].map((a) => saudar(c, { a, b: 0 }).saudacao), ['Oi, Eloi! Boa tarde.', 'Boa tarde, Eloi!', 'Olá, Eloi! Boa tarde.'])
  const sem = { ...c, nome: '' }
  assert.deepEqual([0, 0.4, 0.9].map((a) => saudar(sem, { a, b: 0 }).saudacao), ['Oi! Boa tarde.', 'Boa tarde!', 'Olá! Boa tarde.'])
  assert.equal(saudar({ ...c, faixa: 'manha' }, { a: 0.4 }).saudacao, 'Bom dia, Eloi!')
  assert.equal(saudar({ ...c, faixa: 'madrugada' }, { a: 0.4 }).saudacao, 'Boa noite, Eloi!', 'de madrugada a saudação segue sendo boa noite')
  // apelido: espaços colapsados, no máximo 24 caracteres, ausente vira vazio
  assert.equal(contextoDaSaudacao({ apelido: '  Maria   da  Luz  ', resumo: RESUMO() }).nome, 'Maria da Luz')
  assert.equal(contextoDaSaudacao({ apelido: 'x'.repeat(60), resumo: RESUMO() }).nome.length, 24)
  assert.equal(contextoDaSaudacao({ apelido: null, resumo: RESUMO() }).nome, '')
})

test('saudação: o incentivo segue o momento do jogo (completo · pendente · novo · andando · quase · fora do festival)', () => {
  const quando = '2026-11-12T15:00'
  assert.equal(situacaoDoJogo(ctx(quando, { resumo: { validadas: 0, faltam: 27 } })), 'novo')
  assert.equal(situacaoDoJogo(ctx(quando)), 'andando')
  assert.equal(situacaoDoJogo(ctx(quando, { resumo: { validadas: 25, faltam: 2 } })), 'quase')
  assert.equal(situacaoDoJogo(ctx(quando, { resumo: { validadas: 27, faltam: 0, completo: true } })), 'completo')
  assert.equal(situacaoDoJogo(ctx(quando, { resumo: { pendentes: 1 } })), 'pendente')
  assert.equal(situacaoDoJogo(ctx(quando, { resumo: { validadas: 27, faltam: 0, completo: true, pendentes: 1 } })), 'pendente', 'avaliar vem antes de comemorar (como a próxima ação da Central)')
  // antes e depois do festival: só a saudação, nenhum convite
  for (const fora of ['2026-11-04T15:00', '2026-11-16T15:00']) {
    const c = ctx(fora)
    assert.equal(situacaoDoJogo(c), 'fora')
    const r = saudar(c, { a: 0, b: 0 })
    assert.equal(r.saudacao, 'Oi, Eloi! Boa tarde.')
    assert.equal(r.incentivo, '')
  }
  // dados da edição ainda não chegaram: não corta o convite (e não inventa nada de hora de casa)
  const semDados = contextoDaSaudacao({ apelido: 'Eloi', resumo: RESUMO(), agora: natal(quando) })
  assert.equal(semDados.noFestival, true)
  assert.equal(semDados.abertas, 0)
  assert.ok(saudar(semDados, { a: 0, b: 0 }).incentivo.length > 10)
})

test('saudação: completo comemora com o total real; pendente pede a avaliação (singular e plural)', () => {
  const comp = ctx('2026-11-12T15:00', { resumo: { total: 27, validadas: 27, faltam: 0, completo: true } })
  assert.ok(todas(comp).has('Mapa completo: as 27 casas são suas! Parabéns!'), 'usa o total do servidor, não um número escrito aqui')
  const um = ctx('2026-11-12T15:00', { resumo: { pendentes: 1 } })
  const varios = ctx('2026-11-12T15:00', { resumo: { pendentes: 3 } })
  assert.ok(todas(um).has('Falta só avaliar o combo para o carimbo valer.'))
  assert.ok(todas(varios).has('Faltam 3 avaliações para os seus carimbos valerem.'))
  assert.ok(![...todas(varios)].some((t) => /Falta só avaliar o combo/.test(t)), 'plural nunca usa a frase do singular')
})

test('saudação: último dia e reta final do festival (datas da edição, hora de Natal)', () => {
  const ultimo = ctx('2026-11-15T15:00')
  assert.equal(ultimo.ultimoDia, true)
  assert.ok([...todas(ultimo)].every((t) => /último dia/i.test(t)), 'no último dia toda frase fala do último dia')
  const quase = ctx('2026-11-15T15:00', { resumo: { validadas: 26, faltam: 1 } })
  assert.ok(todas(quase).has('Último dia do festival! Falta 1 para completar o mapa.'))
  const amanha = ctx('2026-11-14T15:00')
  assert.equal(amanha.diasRestantes, 1)
  assert.ok([...todas(amanha)].every((t) => /O festival termina amanhã/.test(t)))
  const doisDias = ctx('2026-11-13T15:00')
  assert.equal(doisDias.diasRestantes, 2)
  assert.ok([...todas(doisDias)].every((t) => /O festival termina em 2 dias/.test(t)))
  assert.equal(ctx('2026-11-12T15:00').diasRestantes, 3, 'com 3 dias ainda não é reta final')
  assert.ok(![...todas(ctx('2026-11-12T15:00'))].some((t) => /festival termina|último dia/i.test(t)))
})

test('saudação: casas com o combo disponível agora e a hora do primeiro combo de hoje vêm do dado real', () => {
  const abertas = [CASA('a', '10:00', '22:00'), CASA('b', '12:00', '23:00'), CASA('c', '18:00', '22:00'), CASA('d', '10:00', '22:00', '2026-11-11')]
  const c = ctx('2026-11-12T15:00', { casas: abertas })
  assert.equal(c.abertas, 2, 'só a e b estão com o combo disponível às 15h de 12/11 (c abre às 18h; d é de ontem)')
  assert.ok(todas(c).has('2 casas estão com combo disponível agora. Qual entra no seu mapa?'))
  const uma = ctx('2026-11-12T15:00', { casas: [CASA('a', '10:00', '22:00')] })
  assert.ok(todas(uma).has('1 casa está com combo disponível agora. Qual entra no seu mapa?'), 'singular')
  // de manhã nada está aberto, mas o primeiro combo libera às 10h: a hora vem do cadastro
  const cedo = ctx('2026-11-12T07:00', { casas: abertas })
  assert.equal(cedo.abertas, 0)
  assert.equal(cedo.abreAs, '10h')
  assert.ok(todas(cedo).has('O primeiro combo de hoje fica disponível às 10h. Programe a próxima casa!'))
  // sem horário cadastrado nunca vira "aberta" nem "abre às"
  const vazio = ctx('2026-11-12T15:00', { casas: [{ slug: 'x', unidades: [{ id: 'u', combo: {} }] }] })
  assert.equal(vazio.abertas, 0)
  assert.equal(vazio.abreAs, '')
})

test('saudação: a frase varia (por faixa do dia, por dia da semana e por sorteio) e o mesmo sorteio dá sempre a mesma frase', () => {
  const tarde = ctx('2026-11-12T15:00')
  assert.ok(todas(tarde).size >= 3, 'à tarde há pelo menos três frases diferentes')
  assert.equal(saudar(tarde, { a: 0.3, b: 0.3 }).incentivo, saudar(tarde, { a: 0.3, b: 0.3 }).incentivo, 'determinística para o mesmo sorteio')
  const manha = todas(ctx('2026-11-12T09:00')); const noite = todas(ctx('2026-11-12T20:00')); const mad = todas(ctx('2026-11-12T02:00'))
  assert.ok(!manha.has('A manhã é boa para começar o mapa: escolha uma casa e vá de combo.'), 'quem já tem casa não recebe a frase de quem está começando')
  assert.ok(manha.has('Comece o dia somando mais uma casa ao mapa.'))
  assert.ok(noite.has('A noite também conta: veja as casas abertas e some mais um carimbo.'))
  assert.ok(mad.has('Descanse: amanhã o mapa cresce mais um pouco.'))
  assert.ok(manha.has('Hoje é um bom dia para comer um combo.') && !noite.has('Hoje é um bom dia para comer um combo.'), 'de noite é "esta noite é boa", nunca "bom dia"')
  assert.ok(noite.has('Esta noite é boa para comer um combo.'))
  const ate30 = { inicio: '2026-11-05', fim: '2026-11-30' } // fim distante, para o fim de semana aparecer sem a urgência da reta final
  const em = (quando) => todas(contextoDaSaudacao({ apelido: 'Eloi', resumo: RESUMO(), dados: { edicao: ate30 }, agora: natal(quando) }))
  assert.ok(em('2026-11-14T15:00').has('Sábado de passeio: que tal mais uma casa no mapa?'))
  assert.ok(em('2026-11-15T15:00').has('Domingo de combo: veja as casas abertas hoje e some um carimbo.'))
  assert.ok(!em('2026-11-12T15:00').has('Sábado de passeio: que tal mais uma casa no mapa?'), 'só no sábado')
})

test('saudação: toda frase é curta, sem "undefined", sem promessa de função que pode estar desligada e sem as palavras que o site evita', () => {
  const contextos = [
    { total: 27, pendentes: 1, faltam: 1, diasRestantes: 1, abertas: 1, abreAs: '8h' },
    { total: 27, pendentes: 3, faltam: 3, diasRestantes: 2, abertas: 12, abreAs: '15h30' },
  ]
  const frases = []
  const andar = (no) => {
    if (Array.isArray(no)) for (const f of no) frases.push(...(typeof f === 'function' ? contextos.map((c) => f(c)) : [f]))
    else for (const v of Object.values(no)) andar(v)
  }
  andar(FRASES)
  assert.ok(new Set(frases).size >= 70, `banco com variedade (${new Set(frases).size} frases)`)
  const PROIBIDAS = /voucher|delivery|pr[eê]mio|sorteio|disputa|ranking|\bvot(o|a|ar|ou|ação|ações)\b|experi[eê]ncia|\bcidade\b|mem[óo]ria|\brota\b|\bmarcas?\b/i
  for (const f of frases) {
    assert.equal(typeof f, 'string')
    assert.ok(f.length >= 20 && f.length <= 90, `tamanho da frase (${f.length}): ${f}`)
    assert.doesNotMatch(f, /undefined|NaN|null|\[object|\$\{/, f)
    assert.doesNotMatch(f, PROIBIDAS, `palavra que o site evita ou promessa de função: ${f}`)
    assert.match(f, /[.!?]$/, `termina com pontuação: ${f}`)
    assert.doesNotMatch(f, /\bSweet\b(?! Lover)/, `"Sweet" sozinho não: ${f}`)
    assert.doesNotMatch(f, /\b(pronto|pronta|animado|animada|obrigado|obrigada|bem-vindo|bem-vinda)\b/i, `texto neutro de gênero: ${f}`)
  }
})

test('saudação: o cartão da Central usa a saudação e o estilo do balão existe', () => {
  const central = fs.readFileSync(path.join(raiz, 'src/edicao/caca/Central.jsx'), 'utf8')
  assert.match(central, /const fala = useSaudacao\(caca\.mapa\?\.apelido, caca\.resumo, dados\)/, 'o cartão de progresso lê a saudação')
  assert.match(central, /<p className="ct-central__saudacao">[\s\S]*\{fala\.saudacao\}[\s\S]*\{fala\.incentivo &&/, 'saudação e incentivo no cartão')
  const gancho = fs.readFileSync(path.join(raiz, 'src/edicao/caca/useSaudacao.js'), 'utf8')
  assert.match(central, /import \{ useSaudacao \} from '\.\/useSaudacao\.js'/)
  assert.match(gancho, /React\.useState\(\(\) => \(\{ a: Math\.random\(\), b: Math\.random\(\) \}\)\)/, 'sorteio uma vez por visita (não a cada renderização)')
  const css = fs.readFileSync(path.join(raiz, 'src/styles/cartoon/13-caca.css'), 'utf8')
  assert.match(css, /\.ct-central__saudacao \{[^}]*border: 3px solid var\(--ct-chocolate\)[^}]*box-shadow: 3px 3px 0 var\(--ct-chocolate\)/, 'balão no traço do gibi')
  assert.doesNotMatch(css.slice(css.indexOf('.ct-central__saudacao {')), /!important/)
})
