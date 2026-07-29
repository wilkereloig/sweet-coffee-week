import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  COMBO_SLUGS, COMBO_EDITION, comboPhotos, editionPhotos, heroPhotos, awardPhoto,
} from '../src/data/imageLibrary.js'
import { EDITION_GALLERY } from '../src/data/editionGallery.js'
import { PARTICIPANTS } from '../src/data/participants.js'

/*
 * Guarda do acervo fotográfico. Imagem quebrada não aparece no build nem no
 * lint: só some na tela. Aqui todo caminho que o sistema central devolve é
 * conferido contra o disco, e a contagem de fotos por marca é conferida contra
 * a pasta — se alguém adicionar ou remover foto sem atualizar COMBO_COUNT, o
 * teste quebra.
 */

const PUB = fileURLToPath(new URL('../public/', import.meta.url))
const noDisco = (src) => existsSync(join(PUB, src.replace(/^\//, '')))

const ROTAS = ['home', 'edicoes', 'historico-awards', 'participar', 'apoiar', 'contato']

test('toda foto de edição existe no disco', () => {
  for (const code of Object.keys(EDITION_GALLERY)) {
    const fotos = editionPhotos(code)
    assert.ok(fotos.length > 0, `edição ${code} sem foto no manifesto`)
    for (const f of fotos) assert.ok(noDisco(f.src), `arquivo ausente: ${f.src}`)
  }
})

test('as 16 edições têm acervo', () => {
  assert.equal(Object.keys(EDITION_GALLERY).length, 16)
})

test('toda foto de combo existe no disco', () => {
  for (const slug of COMBO_SLUGS) {
    const fotos = comboPhotos(slug)
    assert.ok(fotos.length > 0, `sem foto para ${slug}`)
    for (const f of fotos) assert.ok(noDisco(f.src), `arquivo ausente: ${f.src}`)
  }
})

test('a contagem de fotos por marca bate com a pasta', () => {
  for (const slug of COMBO_SLUGS) {
    const naPasta = readdirSync(join(PUB, 'images/combos', slug)).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f)).length
    assert.equal(comboPhotos(slug).length, naPasta, `${slug}: o sistema central diz ${comboPhotos(slug).length}, a pasta tem ${naPasta}`)
  }
})

test('todo participante da edição atual tem foto de combo e logo', () => {
  for (const p of PARTICIPANTS) {
    assert.ok(comboPhotos(p.slug).length > 0, `${p.slug} sem foto de combo`)
    assert.ok(noDisco(`/logos/participants/${p.slug}.png`), `${p.slug} sem logo`)
  }
})

test('toda foto de herói existe e nenhuma se repete entre rotas', () => {
  const dono = new Map()
  for (const rota of ROTAS) {
    const fotos = heroPhotos(rota)
    assert.ok(fotos.length > 0, `rota sem foto de herói: ${rota}`)
    for (const f of fotos) {
      assert.ok(noDisco(f.src), `arquivo ausente: ${f.src}`)
      const anterior = dono.get(f.src)
      assert.ok(!anterior || anterior === rota, `${f.src} é herói de ${anterior} e de ${rota} — cada página tem a sua`)
      dono.set(f.src, rota)
    }
  }
})

test('todo alt é contextual — nada de "imagem", "foto", "banner" soltos', () => {
  const generico = /^(imagem|foto|banner|doce|combo)\.?$/i
  const alts = [
    ...ROTAS.flatMap((r) => heroPhotos(r)),
    ...Object.keys(EDITION_GALLERY).flatMap((c) => editionPhotos(c)),
    ...COMBO_SLUGS.flatMap((s) => comboPhotos(s, { limite: 1 })),
  ]
  for (const f of alts) {
    assert.ok(f.alt && f.alt.length > 12, `alt curto demais: "${f.alt}" (${f.src})`)
    assert.ok(!generico.test(f.alt.trim()), `alt genérico: "${f.alt}"`)
    assert.match(f.alt, /Sweet & Coffee Week/, `alt sem o nome do festival: "${f.alt}"`)
  }
})

test('o Sweet Awards só recebe foto quando o vínculo marca↔combo existe', () => {
  // A Lovers é a única edição com foto por participante no acervo.
  assert.ok(awardPhoto('O Maestro Café', COMBO_EDITION), 'a edição atual deveria ter foto')
  // Edição antiga: sem vínculo, sem foto — o card mostra a ausência.
  assert.equal(awardPhoto('Bocaditos', '2023'), null)
  assert.equal(awardPhoto('Mr. Cupcake Confeitaria', '2021.2'), null)
  // Marca fora do acervo de combos: idem.
  assert.equal(awardPhoto('Marca Inexistente', COMBO_EDITION), null)
})

test('nenhum componente monta caminho de imagem na mão', () => {
  // O sistema central existe para isso. Exceções conscientes ficam listadas.
  const PERMITIDOS = new Set([
    'src/data/imageLibrary.js',
    'src/data/editionGallery.js',
    'src/data/comboPhotos.js',
    'src/data/homeGalleries.js',
    'src/data/focalPoints.js',
    'src/data/participants.js',
    'src/data/editionAssets.js',
    'src/data/editionHighlights.js',
    'src/data/participantAssets.js',
    'src/data/handoff/edicoesData.js',
    'src/data/handoff/awardsData.js',
  ])
  const raiz = fileURLToPath(new URL('../src/', import.meta.url))
  const achados = []
  const varrer = (dir, rel = 'src') => {
    for (const nome of readdirSync(dir, { withFileTypes: true })) {
      const caminho = join(dir, nome.name)
      const relativo = `${rel}/${nome.name}`
      if (nome.isDirectory()) { varrer(caminho, relativo); continue }
      if (!/\.(jsx?|css)$/.test(nome.name)) continue
      if (PERMITIDOS.has(relativo)) continue
      const fonte = readFileSync(caminho, 'utf8')
      // A crase entra na lista: caminho montado em template literal
      // (`/images/combos/${slug}/…`) escapava do padrão original.
      for (const m of fonte.matchAll(/['"`(]\/images\/(edicoes|combos)\//g)) {
        const trecho = fonte.slice(m.index + 1, m.index + 61).split(/[\n'"`)]/)[0]
        achados.push(`${relativo}: ${trecho}`)
      }
    }
  }
  varrer(raiz)
  assert.deepEqual(achados, [], `caminhos soltos — usar src/data/imageLibrary.js:\n${achados.join('\n')}`)
})
