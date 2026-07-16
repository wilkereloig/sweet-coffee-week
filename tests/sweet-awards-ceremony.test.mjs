import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../src/pages/institutional/HistoricoAwards.jsx', import.meta.url), 'utf8')

test('Sweet Awards prioriza Lovers 2026.1 em capítulos navegáveis', () => {
  assert.match(source, /Lovers 2026\.1/)
  assert.match(source, /useState\(0\)/)
  assert.match(source, /aria-current=/)
  assert.match(source, /swa-chapter-nav/)
  assert.match(source, /swa-archive-section/)
  assert.doesNotMatch(source, /className="swa-scenes motion-stagger"/)
})

test('Sweet Awards mantém um único CTA final para as edições', () => {
  const finalCta = source.slice(source.indexOf('className="section hist-cta"'))
  assert.equal((finalCta.match(/href="#\/edicoes"/g) || []).length, 1)
})

test('troca de categoria não depende do reveal de scroll para aparecer', () => {
  assert.doesNotMatch(source, /className="swa-chapter motion-stagger"/)
  assert.doesNotMatch(source, /className="motion-image-reveal"/)
  assert.match(source, /@keyframes swaChapterEnter/)
})

test('Sweet Awards usa uma hero própria sem destacar o Melhor Combo', () => {
  assert.match(source, /function AwardsHero/)
  assert.match(source, /className="swa-hero"/)
  assert.match(source, /Sweet Awards <span>Lovers 2026\.1<\/span>/)
  assert.doesNotMatch(source, /import \{ PageShell, PageHero \}/)

  const hero = source.slice(source.indexOf('function AwardsHero'), source.indexOf('function CategoryWinnerCarousel'))
  assert.doesNotMatch(hero, /scenePhoto/)
  assert.doesNotMatch(hero, /Melhor Combo/)
  assert.match(hero, /HERO_PHOTO_SLOTS/)
})

test('cada categoria vira um carrossel com todos os colocados e fotos dos combos', () => {
  assert.match(source, /function winnerPhoto/)
  assert.match(source, /function CategoryWinnerCarousel/)
  assert.match(source, /const winners = scene\.winners/)
  assert.match(source, /activeWinnerIndex/)
  assert.match(source, /aria-label="Vencedor anterior"/)
  assert.match(source, /aria-label="Próximo vencedor"/)
  assert.match(source, /Combo de \$\{winner\.name\}, \$\{winner\.pos\}º lugar em \$\{scene\.category\}/)
  assert.match(source, /<CategoryWinnerCarousel\s+key=\{activeScene\.key\}/)
  assert.doesNotMatch(source, /function WinnerGallery/)
  assert.doesNotMatch(source, /function getAwardGallery/)
  assert.doesNotMatch(source, /swa-winner-grid/)
})

test('página reserva fotos de pessoas e momentos da premiação sem inventar imagens', () => {
  assert.match(source, /const HERO_PHOTO_SLOTS =/)
  assert.match(source, /Público e participantes/)
  assert.match(source, /Marcas na edição/)
  assert.match(source, /Foto coletiva/)
  assert.match(source, /const CEREMONY_PHOTO_SLOTS =/)
  assert.match(source, /Bastidores da cerimônia/)
  assert.match(source, /Entrega dos prêmios/)
  assert.match(source, /Celebração dos vencedores/)
  assert.match(source, /className="swa-memory-grid"/)
})

test('arquivo histórico não repete uma segunda galeria de campeões', () => {
  assert.doesNotMatch(source, /Campeões de Melhor Combo, edição a edição/)
  assert.doesNotMatch(source, /getComboChampionsGallery/)
})
