// Campanha "Ter com quem contar" (Sicredi): prazo por data de Fortaleza, textos, perfis, rota e a separação da Caça aos Carimbos.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { CAMPANHA, TEXTOS_CAMPANHA as T, estadoDaCampanha, prazoCurto, diaEmFortaleza } from '../src/edicao/caca/campanha/terComQuemContar.js'
import { resolverCena, CENAS } from '../src/edicao/rotas.js'
import { NAV } from '../src/edicao/cartoon/textos.js'
import { AGENCIAS_SICREDI, ehSicredi } from '../src/edicao/caca/mapa/sicredi.js'
import { destinoSeguro, PREFS_PADRAO } from '../src/edicao/caca/notificacoes/logica.js'

const raiz = path.resolve(import.meta.dirname, '..')
const ler = (rel) => fs.readFileSync(path.join(raiz, rel), 'utf8')
const semComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

const E = (iso) => estadoDaCampanha(new Date(iso))

test('prazo: antes mostra "faltam N dias"; no 11/11 é o último dia; depois, encerrada', () => {
  assert.deepEqual(E('2026-11-06T15:00:00Z'), { estado: 'antes', aberta: true, faltam: 5, rotulo: 'Faltam 5 dias' })
  assert.equal(E('2026-11-10T15:00:00Z').rotulo, 'Falta 1 dia')
  assert.deepEqual(E('2026-11-11T15:00:00Z'), { estado: 'ultimo-dia', aberta: true, faltam: 0, rotulo: 'Último dia' })
  assert.deepEqual(E('2026-11-12T15:00:00Z'), { estado: 'encerrada', aberta: false, faltam: 0, rotulo: 'Campanha encerrada' })
  assert.equal(E('2027-01-01T15:00:00Z').estado, 'encerrada')
})

test('prazo: vale o dia de Fortaleza (UTC-3), não o do aparelho nem o UTC', () => {
  assert.equal(diaEmFortaleza(new Date('2026-11-12T02:59:59Z')), '2026-11-11')
  assert.equal(diaEmFortaleza(new Date('2026-11-12T03:00:00Z')), '2026-11-12')
  assert.equal(E('2026-11-12T02:59:59Z').estado, 'ultimo-dia', '23h59 de 11/11 em Fortaleza ainda é o último dia (já é 12/11 em UTC)')
  assert.equal(E('2026-11-12T03:00:00Z').estado, 'encerrada', 'meia-noite de Fortaleza encerra')
  assert.equal(E('2026-11-11T03:00:00Z').estado, 'ultimo-dia', '00h de 11/11 em Fortaleza já é o último dia')
  assert.equal(E('2026-11-11T02:59:59Z').rotulo, 'Falta 1 dia', '23h59 de 10/11 em Fortaleza ainda falta 1 dia')
  assert.equal(E('2026-11-09T02:59:59Z').faltam, 3, '23h59 de 08/11 em Fortaleza: faltam 3 dias (em UTC já seria 09/11)')
})

test('prazo: aceita data em texto e não quebra com data inválida', () => {
  assert.equal(estadoDaCampanha('2026-11-12T15:00:00Z').estado, 'encerrada')
  assert.doesNotThrow(() => estadoDaCampanha('não é data'))
  assert.doesNotThrow(() => estadoDaCampanha(undefined))
  assert.equal(prazoCurto(E('2026-11-06T15:00:00Z')), 'Faltam 5 dias · até 11/11')
  assert.equal(prazoCurto(E('2026-11-11T15:00:00Z')), 'Último dia · hoje, 11/11')
  assert.equal(prazoCurto(E('2026-11-13T15:00:00Z')), 'Campanha encerrada')
  assert.equal(T.prazoAberto(E('2026-11-11T15:00:00Z')), 'Último dia: hoje, 11 de novembro')
})

/** Todas as frases do módulo de textos (funções chamadas com exemplos). */
function frases (o, saida = []) {
  if (typeof o === 'string') saida.push(o)
  else if (typeof o === 'function') saida.push(String(o(E('2026-11-06T15:00:00Z'))), String(o(E('2026-11-11T15:00:00Z'))))
  else if (o && typeof o === 'object') Object.values(o).forEach((v) => frases(v, saida))
  return saida
}
const FONTES = ['src/edicao/caca/campanha/terComQuemContar.js', 'src/edicao/caca/campanha/Campanha.jsx', 'src/edicao/cartoon/paginas/TerComQuemContar.jsx']

test('textos: nunca "sorteio", "voto/votação" nem "Sweet" sozinho para o festival', () => {
  const todo = [...frases(T), ...FONTES.map((f) => semComentarios(ler(f)))].join('\n')
  assert.doesNotMatch(todo, /sorteio|sortead|sortear/i)
  assert.doesNotMatch(todo, /\bvotam\b|\bvotação\b|\bvotacao\b|\bvoto\b/i)
  assert.doesNotMatch(todo, /\bSweet\b(?! (&|Awards|Lovers|Gift))/, '"Sweet" só em Sweet & Coffee Week, Sweet Awards, Sweet Lovers ou Sweet Gift')
})

test('textos: só os fatos informados (nada de data de resultado, validade de voucher ou regulamento extra)', () => {
  const todo = frases(T).join('\n')
  assert.match(todo, /até 1 minuto/)
  assert.match(todo, /feed do Instagram/)
  assert.match(todo, /11 de novembro/)
  assert.match(todo, /@sweetcoffeeweek/); assert.match(todo, /@sicrediriograndedonorte/); assert.match(todo, /#TerComQuemContar/)
  assert.match(todo, /perfil público/)
  assert.match(todo, /equipe de jornalistas montada pelo festival seleciona as 10 histórias/)
  assert.match(todo, /um par de vouchers/)
  assert.deepEqual(T.dados.map((d) => d.numero), ['10', '2', '20'])
  assert.equal(CAMPANHA.historias * CAMPANHA.vouchersPorPessoa, CAMPANHA.totalVouchers)
  assert.match(T.lead, /maior instituição financeira cooperativa do RN/)
  assert.doesNotMatch(todo, /resultado (sai|será|em)|divulg\w+ em|válid[oa]s? até|validade|regulamento/i)
  assert.equal(T.passos.length, 3)
})

test('textos: a campanha é no Instagram e separada da Caça (não conta carimbo, meta nem ranking)', () => {
  assert.match(T.separadaTexto, /Instagram/)
  assert.match(T.separadaTexto, /não conta carimbo, meta nem ranking/)
  assert.match(T.bloco.mapa, /Não conta carimbo/)
  assert.match(T.bloco.premios, /separada da Caça/)
  assert.match(T.bloco.premios, /não conta carimbo, meta nem ranking/)
  assert.match(T.bloco.premios, /10 histórias/); assert.match(T.bloco.premios, /um par de vouchers/)
  assert.match(T.bloco.premiosTitulo, /^Também valendo: Ter com quem contar$/)
  assert.match(T.bloco.metas, /não conta carimbo nem meta/i)
})

test('perfis: links certos, em outra aba e sem referrer', () => {
  assert.equal(CAMPANHA.perfis.festival.url, 'https://www.instagram.com/sweetcoffeeweek/')
  assert.equal(CAMPANHA.perfis.sicredi.url, 'https://www.instagram.com/sicrediriograndedonorte/')
  const pagina = semComentarios(ler('src/edicao/cartoon/paginas/TerComQuemContar.jsx'))
  assert.match(pagina, /const EXTERNO = \{ target: '_blank', rel: 'noopener noreferrer' \}/)
  assert.equal((pagina.match(/\{\.\.\.EXTERNO\}/g) || []).length, 2, 'os dois perfis')
  assert.match(pagina, /CAMPANHA\.perfis\.festival\.url/); assert.match(pagina, /CAMPANHA\.perfis\.sicredi\.url/)
})

test('página: um <h1>, vídeo vertical sem autoplay com poster, selo da Sicredi pela biblioteca de imagens', () => {
  const pagina = semComentarios(ler('src/edicao/cartoon/paginas/TerComQuemContar.jsx'))
  assert.equal((pagina.match(/<h1[\s>]/g) || []).length, 1)
  assert.match(pagina, /<video controls playsInline preload="metadata" poster=\{CAMPANHA\.video\.capa\}/)
  assert.doesNotMatch(pagina, /autoPlay|autoplay|\bloop\b/i)
  assert.match(pagina, /MARCAS_PARCEIROS\.sicredi/)
  assert.equal(CAMPANHA.video.src, '/videos/sicredi/ter-com-quem-contar.mp4')
  assert.equal(CAMPANHA.video.capa, '/videos/sicredi/ter-com-quem-contar-capa.jpg')
  assert.equal(CAMPANHA.video.largura / CAMPANHA.video.altura, 9 / 16)
  const css = ler('src/styles/cartoon/20-campanha-sicredi.css')
  assert.doesNotMatch(css, /!important/)
  assert.match(css, /\.ct-tcqc__video \{[^}]*max-width: 330px/)
  assert.match(ler('src/styles/scw-cartoon.css'), /@import '\.\/cartoon\/20-campanha-sicredi\.css'/)
})

test('rota: /cartoon/ter-com-quem-contar abre a página, fora do menu e da barra de abas, com rewrite', () => {
  assert.equal(CAMPANHA.caminho, '/cartoon/ter-com-quem-contar')
  assert.deepEqual(resolverCena('/cartoon/ter-com-quem-contar'), { cena: 'ter-com-quem-contar' })
  assert.deepEqual(resolverCena('/cartoon/ter-com-quem-contar/'), { cena: 'ter-com-quem-contar' })
  assert.deepEqual(resolverCena('/cartoon/ter-com-quem-contar?x=1'), { cena: 'ter-com-quem-contar' })
  assert.deepEqual(resolverCena('/cartoon/ter-com-quem-contar/x'), { cena: 'inexistente' })
  assert.ok(CENAS.includes('ter-com-quem-contar'))
  assert.ok(!NAV.some((n) => n.cena === 'ter-com-quem-contar' || n.href === CAMPANHA.caminho), 'nem no menu nem nas abas')
  const fontes = new Set(JSON.parse(ler('vercel.json')).rewrites.map((r) => r.source))
  assert.ok(fontes.has('/cartoon/:path*'), 'rewrite que cobre todo caminho da edição')
  assert.match(ler('src/edicao/cartoon/index.jsx'), /'ter-com-quem-contar': 'Ter com quem contar'/, 'título da aba')
})

test('entradas: cartão da agência, lista, painel de Prêmios, Metas, rodapé e assinatura apontam para a página pelo Link da edição', () => {
  const sicredi = semComentarios(ler('src/edicao/caca/mapa/Sicredi.jsx'))
  assert.equal((sicredi.match(/<BlocoCampanha navigate=\{navigate\} variante="mapa" \/>/g) || []).length, 2, 'cartão e lista')
  const mapa = semComentarios(ler('src/edicao/cartoon/paginas/mapa/index.jsx'))
  assert.match(mapa, /<CartaoSicredi agencia=\{agenciaEscolhida\} fechar=\{fecharCasa\} navigate=\{navigate\} \/>/)
  assert.match(mapa, /<ListaSicredi [^>]*navigate=\{navigate\} \/>/)
  assert.match(ler('src/edicao/cartoon/paginas/mapa/PainelPremios.jsx'), /<BlocoCampanha navigate=\{navigate\} variante="premios" \/>/)
  assert.match(ler('src/edicao/caca/secoes/Metas.jsx'), /<AvisoCampanha navigate=\{navigate\} \/>/)
  assert.match(ler('src/edicao/cartoon/index.jsx'), /<LinkDaCampanha navigate=\{navigate\} como="li" \/>/)
  assert.match(ler('src/edicao/cartoon/paginas/Entrada.jsx'), /<AssinaturaPatrocinio navigate=\{navigate\} destaque \/>/)
  assert.doesNotMatch(mapa, /<AssinaturaPatrocinio[^>]*\bdestaque\b/)
  const campanha = semComentarios(ler('src/edicao/caca/campanha/Campanha.jsx'))
  assert.doesNotMatch(campanha, /<a\s+href/, 'link interno nunca é <a href> cru (recarregaria o app)')
  assert.match(campanha, /if \(!e\.aberta\) return null/, 'some depois de 11/11')
})

test('a Sicredi nunca vira casa nem carimbo: a campanha não toca no jogo', () => {
  assert.ok(AGENCIAS_SICREDI.length >= 1 && AGENCIAS_SICREDI.every((a) => ehSicredi(a.id)), 'agências seguem fora da lista de casas')
  for (const f of FONTES) {
    const imports = semComentarios(ler(f)).split('\n').filter((l) => /^\s*import /.test(l)).join('\n')
    assert.doesNotMatch(imports, /useCaca|usarMetas|usarPremios|caca\/api|carimbo|mapa\/estados|ranking|premios\/logica/i, `${f}: não importa carimbo, meta, prêmio nem ranking`)
  }
  // Os dois cartões da Sicredi continuam dizendo, em texto, que o patrocinador não conta.
  const sicredi = ler('src/edicao/caca/mapa/Sicredi.jsx')
  assert.match(sicredi, /sicrediAviso/); assert.match(sicredi, /sicrediNaoConta/)
  assert.match(ler('src/edicao/caca/mapa/textos.js'), /sicrediNaoConta: 'Não conta como casa nem como carimbo'/)
})

test('avisos: categoria "campanha" desligada por padrão, com destino permitido e o mesmo destino/prazo do banco', () => {
  assert.equal(PREFS_PADRAO.campanha, false)
  assert.equal(destinoSeguro(CAMPANHA.caminho), CAMPANHA.caminho)
  const sql = ler('supabase/migrations/20261234_caca_campanha_sicredi.sql')
  assert.ok(sql.includes(`"destino":"${CAMPANHA.caminho}"`), 'o destino padrão do banco é a página')
  assert.ok(sql.includes(`"fim":"${CAMPANHA.fim}"`), 'o fim padrão do banco é o prazo da página')
})
