// Mapa da Doçura = Mapa + Minha rota numa experiência só (docs/cartoon-2026-2/14 §14.13, unificação de 06/11/2026).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { NAV, MAPA, ROTA } from '../src/edicao/cartoon/textos.js'
import { resolverCena, CENAS } from '../src/edicao/rotas.js'
import { linkDaRota } from '../src/edicao/caca/compartilhar/arte.js'
import { linkDoMapa } from '../src/edicao/rota/carimbo.js'
import { idsDaBusca } from '../src/edicao/rota/minhaRota.js'

const raiz = join(fileURLToPath(import.meta.url), '..', '..')
const ler = (p) => readFileSync(join(raiz, p), 'utf8')
const fontes = (dir, saida = []) => {
  for (const nome of readdirSync(join(raiz, dir))) {
    const rel = `${dir}/${nome}`
    if (statSync(join(raiz, rel)).isDirectory()) fontes(rel, saida)
    else if (/\.(jsx?|css)$/.test(nome)) saida.push(rel)
  }
  return saida
}

test('a navegação tem UM item: Mapa da Doçura (sem "Minha rota")', () => {
  assert.ok(!NAV.some((n) => n.cena === 'minha-rota' || /minha rota/i.test(n.rotulo)))
  const itens = NAV.filter((n) => n.cena === 'mapa')
  assert.equal(itens.length, 1)
  assert.equal(itens[0].rotulo, 'Mapa da Doçura')
  assert.equal(itens[0].href, '/cartoon/mapa')
  assert.equal(MAPA.titulo, 'Mapa da Doçura')
  assert.deepEqual(NAV.filter((n) => !n.semAba).map((n) => n.cena), ['entrada', 'participantes', 'mapa', 'avaliar'], 'a barra do celular: Início, Casas, Mapa e Avaliar (a rota mora dentro do Mapa)')
})

test('os dois endereços levam à mesma página; o antigo da rota só abre o painel', () => {
  assert.deepEqual(resolverCena('/cartoon/mapa'), { cena: 'mapa' })
  assert.deepEqual(resolverCena('/cartoon/minha-rota'), { cena: 'mapa', abrirRota: true })
  assert.ok(!CENAS.includes('minha-rota'))
  assert.ok(!existsSync(join(raiz, 'src/edicao/cartoon/paginas/MinhaRota.jsx')), 'não há uma segunda página')
})

test('uma só implementação: a página do mapa recebe abrirRota e não tem modo "rota" próprio', () => {
  const m = ler('src/edicao/cartoon/paginas/mapa/index.jsx')
  assert.match(m, /export function Mapa \(\{ navigate, dados, abrirRota = false \}\)/)
  assert.doesNotMatch(m, /entrada\s*===|entrada=|ct-mapa--\$\{entrada\}|\bTR\./, 'nada de topo, texto ou layout alternativo para a rota')
  assert.match(m, /useState\(\(\) => abrirRota \|\|/, 'o painel já abre quando a entrada é a rota')
  const idx = ler('src/edicao/cartoon/index.jsx')
  assert.match(idx, /abrirRota=\{!!pedida\.abrirRota\}/)
  assert.match(idx, /replaceState\([^)]*\/mapa\$\{location\.search\}\$\{location\.hash\}/, 'a URL passa a ser a do mapa, preservando ?u e #mapa=')
  assert.match(idx, /item\.cena === 'mapa' && <Contador/, 'o contador de paradas mora no item do mapa')
})

test('links novos apontam para o mapa; ?u= de rota compartilhada continua lido', () => {
  const link = linkDaRota('https://x.com', ['uabcdef', 'udemo2'])
  assert.equal(link, 'https://x.com/cartoon/mapa?u=uabcdef,udemo2')
  assert.deepEqual(idsDaBusca(new URL(link).search), ['uabcdef', 'udemo2'])
  assert.deepEqual(idsDaBusca('?u=uabcdef,udemo2'), ['uabcdef', 'udemo2'], 'link antigo de /minha-rota?u= segue valendo')
  assert.match(linkDoMapa('https://x.com', 'a'.repeat(40)), /\/cartoon\/mapa#mapa=/)
  for (const f of ['src/edicao/cartoon/paginas/mapa/PainelRota.jsx', 'src/edicao/caca/textos.js', 'src/edicao/caca/compartilhar/arte.js', 'src/edicao/rota/carimbo.js']) {
    assert.doesNotMatch(ler(f), /\/minha-rota/, `${f} gera links do mapa`)
  }
})

test('só o alias do roteador cita /minha-rota em código (comentário pode)', () => {
  const usos = fontes('src').filter((f) => !/\.css$/.test(f)).flatMap((f) => ler(f).split('\n')
    .filter((l) => /\/minha-rota(?!\.webp)/.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l)).map((l) => `${f}: ${l.trim()}`))
  assert.deepEqual(usos.filter((u) => !u.startsWith('src/edicao/rotas.js')), [])
})

test('o painel da rota separa rota planejada, "já fui" e carimbo, e mostra a rota do grupo à parte', () => {
  const [planejada, jaFui, carimbo] = ROTA.tresMarcas
  assert.match(planejada[1], /Não geram carimbo/)
  assert.match(jaFui[1], /Não gera carimbo/)
  assert.match(carimbo[1], /validada/)
  assert.match(ROTA.grupoTexto, /rota pessoal/)
  const p = ler('src/edicao/cartoon/paginas/mapa/PainelRota.jsx')
  assert.match(p, /tresMarcas\.map/)
  assert.match(p, /rota-grupo/)
  assert.match(p, /\/caca\/grupos/)
  assert.doesNotMatch(p, /navigate\(`\$\{C\}\/(minha-rota|mapa)/, '"Salvar como minha rota" não navega: o mapa e a seleção ficam como estavam')
})

test('a rota é um atalho da tela cheia e o painel não usa mais o modo "inline"', () => {
  assert.match(ler('src/edicao/cartoon/paginas/mapa/Atalhos.jsx'), /\['rota', 'rota'\]/)
  assert.doesNotMatch(ler('src/edicao/cartoon/paginas/mapa/Folha.jsx'), /is-inline|inline = false/)
  assert.ok(!/is-inline|ct-mapa--rota/.test(fontes('src/styles/cartoon').map(ler).join('\n')), 'CSS da página separada de rota saiu')
})
