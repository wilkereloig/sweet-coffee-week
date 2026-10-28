// Instalar o painel e ligar os avisos (23/10/2026, pedido do Wilker): o convite abre já na 1ª visita (depois do tour) e
// no app instalado enquanto os avisos estiverem desligados; o sino mostra "Avisos neste aparelho". Lógica pura em
// painel-app/src/lib/instalar.js; telas em components/AppNoAparelho.jsx, AvisosAparelho.jsx e Central.jsx.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { COMO_LIBERAR, etapaDoConvite, plataforma } from '../painel-app/src/lib/instalar.js'
import { pushMarca, ativarVerComo } from '../painel-app/src/lib/marcaApi.js'

const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile Safari/537.36',
  pc: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130 Safari/537.36',
}

test('bloqueado: cada aparelho recebe o caminho dele para liberar', () => {
  assert.match(COMO_LIBERAR(plataforma(UA.iphone, 5), true), /^Ajustes do iPhone › Notificações › Painel SCW/)
  assert.match(COMO_LIBERAR(plataforma(UA.android, 5), true), /^Configurações do aparelho › Apps › Painel SCW/, 'Android pelo ícone: configurações do app')
  assert.match(COMO_LIBERAR(plataforma(UA.android, 5), false), /^Toque no cadeado/, 'Android no navegador: cadeado do endereço')
  assert.match(COMO_LIBERAR(plataforma(UA.pc, 0), false), /^Clique no cadeado.*recarregue/)
  for (const c of ['AppNoAparelho.jsx', 'AvisosAparelho.jsx']) {
    const src = ler('painel-app/src/components/' + c)
    assert.match(src, /COMO_LIBERAR\(/, c + ' usa a mesma regra')
    assert.doesNotMatch(src, /const COMO_LIBERAR/, c + ' não tem cópia própria')
  }
})

test('etapa do convite: celular no navegador ensina a instalar; o app instalado insiste nos avisos desligados', () => {
  const av = (registrado, negado = false) => ({ suportado: true, registrado, negado })
  assert.equal(etapaDoConvite({ standalone: false, instalacao: 'manual', movel: true, avisos: av(false) }), 'instalar', 'Android sem convite do navegador: passos')
  assert.equal(etapaDoConvite({ standalone: false, instalacao: 'ios', movel: true, avisos: { suportado: false } }), 'instalar')
  assert.equal(etapaDoConvite({ standalone: true, instalacao: 'instalado', movel: true, avisos: av(false) }), 'notificacoes', 'aberto pelo ícone sem avisos')
  assert.equal(etapaDoConvite({ standalone: true, instalacao: 'instalado', movel: true, avisos: av(false, true) }), 'notificacoes', 'bloqueado: a etapa ensina a liberar')
  assert.equal(etapaDoConvite({ standalone: true, instalacao: 'instalado', movel: true, avisos: av(true) }), null)
})

test('as cascas liberam o convite logo depois do tour (sem esperar a 2ª visita)', () => {
  const marca = ler('painel-app/src/components/PainelMarcaShell.jsx')
  assert.match(marca, /<ConviteAparelho papel="marca" [^>]*liberado=\{!tour\.aberto\} \/>/)
  assert.doesNotMatch(marca, /contarVisita|visitas >= 2/)
  assert.match(ler('painel-app/src/components/PainelShell.jsx'), /<ConviteAparelho papel="organizacao" [^>]*liberado=\{!tour\.aberto\} \/>/)
})

test('o convite mostra os passos direto quando o navegador não oferece instalar, e diz como entrar no iPhone', () => {
  const src = ler('painel-app/src/components/AppNoAparelho.jsx')
  assert.match(src, /const passos = instalacao !== 'pronto'/)
  assert.doesNotMatch(src, /Ver como instalar/, 'sem o toque a mais')
  assert.match(src, /Na primeira vez que abrir pelo ícone, entre com \{LOGIN_DO_PAPEL\(papel\)\}\. Depois o painel fica aberto até você tocar em <b>Sair<\/b>/)
  assert.match(src, /No iPhone, use o <b>Safari<\/b> para instalar/)
  assert.doesNotMatch(src, /no Chrome do iPhone não dá/, 'não afirmar o que não se sabe')
  assert.match(src, /sem digitar nome e senha toda vez, e recebe os avisos da organização mesmo com o painel fechado/)
})

test('sino: "Avisos neste aparelho" no topo, e "Como instalar" fecha a folha antes de abrir o convite', () => {
  const central = ler('painel-app/src/components/Central.jsx')
  assert.match(central, /Avisos neste aparelho/)
  assert.match(central, /<details className="ui-central-aparelho ui-recolhe">\s*<summary>Avisos neste aparelho<\/summary>/, 'caixa que abre e fecha, fechada por padrão')
  assert.ok(central.indexOf('{aparelho && (') < central.indexOf('{naoLidas > 0 && ('), 'a seção vem antes da lista')
  assert.match(central, /const comoInstalar = \(\) => \{ onFecharCentral\(\); setTimeout\(abrirConviteAparelho, DEPOIS_DA_FOLHA\) \}/)
  const saida = Number(/const SAIDA = (\d+)/.exec(ler('painel-app/src/components/Folha.jsx'))[1])
  const espera = Number(/const DEPOIS_DA_FOLHA = (\d+)/.exec(central)[1])
  assert.ok(espera > saida, 'o convite só abre depois de a folha sair (os dois focos presos não se sobrepõem)')
  assert.match(ler('painel-app/src/components/PainelShell.jsx'), /aparelho=\{<AvisosAparelho [^>]*\{\.\.\.PUSH_ORGANIZACAO\} \/>\}/)
  assert.match(ler('painel-app/src/components/PainelMarcaShell.jsx'), /aparelho=\{comAparelho \? <AvisosAparelho [^>]*\{\.\.\.pushDaMarca\} \/> : null\}/)
})

test('a versão completa de AvisosAparelho sempre diz o estado, inclusive sem suporte', () => {
  const src = ler('painel-app/src/components/AvisosAparelho.jsx')
  assert.match(src, /Atualize o iPhone para iOS 16\.4 ou mais novo para receber avisos\./)
  assert.match(src, /'Bloqueados neste aparelho'/)
  assert.match(src, /'Indisponíveis neste aparelho'/)
})

test('marca: só a assinatura ATIVA no servidor conta como ligada', async () => {
  const pedidos = []
  ativarVerComo({ ler: async (c) => { pedidos.push(c); return [] }, baixar: async () => '' })
  try {
    assert.equal(await pushMarca('p-1').conferir('https://push.exemplo/abc'), false)
  } finally { ativarVerComo(null) }
  assert.equal(pedidos[0].tabela, 'push_subscriptions')
  assert.deepEqual(pedidos[0].filtros, [{ c: 'endpoint', op: 'eq', v: 'https://push.exemplo/abc' }, { c: 'ativo', op: 'is', v: 'true' }])
})

test('iOS abaixo de 16.4 não recebe aviso: o aparelho é reconhecido e a tela não manda instalar', () => {
  const ios = (v) => 'Mozilla/5.0 (iPhone; CPU iPhone OS ' + v + ' like Mac OS X) Version/16.0 Mobile/15E148 Safari/604.1'
  assert.equal(plataforma(ios('16_3'), 5).iosAntigo, true)
  assert.equal(plataforma(ios('15_7_9'), 5).iosAntigo, true)
  assert.equal(plataforma(ios('16_4'), 5).iosAntigo, false)
  assert.equal(plataforma(ios('16_10'), 5).iosAntigo, false, '16.10 é mais novo que 16.4')
  assert.equal(plataforma(ios('18_0'), 5).iosAntigo, false)
  assert.equal(plataforma('Mozilla/5.0 (iPad; CPU OS 15_6 like Mac OS X) Version/15.6 Mobile/15E148 Safari/604.1', 5).iosAntigo, true)
  assert.equal(plataforma('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/17.0 Safari/605.1.15', 5).iosAntigo, false, 'iPad que se apresenta como Mac não diz a versão')
  assert.equal(plataforma(UA.android, 5).iosAntigo, false)
  assert.equal(plataforma(UA.pc, 0).iosAntigo, false)
  const app = ler('painel-app/src/components/AppNoAparelho.jsx')
  assert.match(app, /iosAntigo\) return .*iOS 16\.4/, 'o convite não promete aviso a quem não pode recebê-lo')
  const av = ler('painel-app/src/components/AvisosAparelho.jsx')
  assert.match(av, /antigo \? 'Atualize o iPhone para iOS 16\.4/)
})

test('convite: "Entendi" na instalação adia como "Agora não" e a abertura automática rechecha a tela depois de ler os avisos', () => {
  const app = ler('painel-app/src/components/AppNoAparelho.jsx')
  assert.match(app, /passos\s*\n?\s*\? <Botao variante="destaque" icone="feito" onClick=\{\(\) => fechar\(\)\}>Entendi<\/Botao>/, '"Entendi" da instalação adia 7 dias')
  assert.doesNotMatch(app, /fechar\(\{ adiar: false \}\)\}>Entendi/)
  assert.match(app, /if \(!forcado && telaOcupada\(\)\) return 'ocupada'/, 'depois do await dos avisos, a tela ocupada não perde o foco')
  assert.match(app, /if \(r === 'ocupada'\)/, 'e a abertura automática tenta de novo mais tarde')
})

test('avisos: pedido bloqueado não repete a frase em vermelho (a linha de estado já a diz)', () => {
  const av = ler('painel-app/src/components/AvisosAparelho.jsx')
  assert.match(av, /if \(m === 'bloqueado'\) setAviso\(null\)/)
})
