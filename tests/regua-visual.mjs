import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

/*
 * Régua visual — auditoria automatizada (rodada de verificação, ago/2026).
 *
 * Cobre só o que dá pra checar sem navegador: cor calculada, tipografia, ícones,
 * botões chapados, texto proibido. Layout renderizado (overflow, quebra de
 * breakpoint, menu mobile) fica com tests/responsive.mjs — hoje checando
 * seletores do sistema anterior (.site-header/.menu-toggle/.mobile-menu), não
 * os da casca redesign 2026; ver docs/achados-*.md.
 *
 * Não duplica tests/redesign-2026.test.mjs: paleta fechada, cor por rota,
 * trilho, casca em 900px e prefers-reduced-motion já são cobertos lá.
 *
 * Aparência propriamente dita continua sendo conferência do usuário, não de
 * teste — o que segue são contratos objetivos (valor, seletor, faixa numérica).
 */

const ler = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8')
// Troca cada comentário por espaços preservando as quebras de linha internas —
// só apagar tudo (vira ' ') desalinha a numeração de linha de qualquer match
// que vier depois de um comentário multi-linha (achado real da rodada de
// auditoria: as linhas de font:600 reportadas pelos agentes não batiam com as
// deste arquivo até corrigir isso).
const semComentarioCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))

const SISTEMA = 'src/styles/scw-2026.css'
const ESTILOS_REDESIGN = [
  SISTEMA,
  'src/styles/scw-motion.css',
  'src/styles/scw-home.css',
  'src/styles/scw-edicoes.css',
  'src/styles/scw-awards.css',
  'src/styles/scw-participar-apoiar.css',
  'src/styles/scw-contato.css',
]
const PAGINAS = [
  'src/pages/institutional/Home.jsx',
  'src/pages/institutional/Edicoes.jsx',
  'src/pages/institutional/HistoricoAwards.jsx',
  'src/pages/institutional/Participar.jsx',
  'src/pages/institutional/Apoiar.jsx',
  'src/pages/institutional/Contato.jsx',
]

// Mesmo recorte da F2 usado em redesign-2026.test.mjs — bloco tem regra própria
// (Archivo, preto/magenta da agência) e fica fora de qualquer checagem abaixo.
function foraDoBlocoF2(fonte) {
  const ini = fonte.indexOf('.f2-realiza {')
  if (ini === -1) return fonte
  const fim = fonte.indexOf('/* ====', ini)
  return fonte.slice(0, ini) + (fim === -1 ? '' : fonte.slice(fim))
}

/* ============================================================================
   Item 2/3 da régua — contraste calculado dos pares declarados no CSS
   ========================================================================= */

function luminancia(hex) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
  const canal = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)
}
function contraste(hexA, hexB) {
  const [l1, l2] = [luminancia(hexA), luminancia(hexB)].sort((a, b) => b - a)
  return (l1 + 0.05) / (l2 + 0.05)
}

// magenta e laranja nunca passam 4,5:1 sobre creme/chocolate — são "só texto
// grande" por natureza (FLUXO-DESIGN-CODIGO.md § Sequência de cor: magenta
// 3,8:1¹, laranja 3,0:1¹). Onde a cor de página/herói é uma dessas, o mínimo
// exigível é 3:1 (WCAG texto grande) e não 4,5:1 — e o texto pequeno real
// precisa virar pílula chapada, não ficar direto nessa tinta (checagem manual
// no achados da página, não dá pra confirmar tamanho de fonte por regex aqui).
const SO_TEXTO_GRANDE = new Set(['#F10767', '#FF4810'])
function minimoEsperado(corFundo) {
  return SO_TEXTO_GRANDE.has(corFundo.toUpperCase()) ? 3.0 : 4.5
}

test('contraste calculado: --scw-pagina × --scw-pagina-tinta', () => {
  const sistema = ler(SISTEMA)
  const pares = [...sistema.matchAll(
    /body\.route-(\S+?)\s*\{[^}]*?--scw-pagina:\s*(#[0-9A-Fa-f]{3,6});[^}]*?--scw-pagina-tinta:\s*(#[0-9A-Fa-f]{3,6})/g,
  )]
  assert.ok(pares.length >= 6, `esperava ≥6 rotas com --scw-pagina/tinta no mesmo bloco, achei ${pares.length}`)
  for (const [, rota, cor, tinta] of pares) {
    const c = contraste(cor, tinta)
    const min = minimoEsperado(cor)
    assert.ok(c >= min, `route-${rota}: --scw-pagina ${cor} × --scw-pagina-tinta ${tinta} = ${c.toFixed(2)}:1 (mín. ${min}:1)`)
  }
})

test('contraste calculado: --scw-heroi × --scw-heroi-tinta', () => {
  const sistema = ler(SISTEMA)
  const pares = [...sistema.matchAll(
    /body\.route-(\S+?)\s*\{[^}]*?--scw-heroi:\s*(#[0-9A-Fa-f]{3,6});[^}]*?--scw-heroi-tinta:\s*(#[0-9A-Fa-f]{3,6})/g,
  )]
  assert.ok(pares.length >= 6, `esperava ≥6 rotas com --scw-heroi/tinta no mesmo bloco, achei ${pares.length}`)
  for (const [, rota, cor, tinta] of pares) {
    const c = contraste(cor, tinta)
    const min = minimoEsperado(cor)
    assert.ok(c >= min, `route-${rota}: --scw-heroi ${cor} × --scw-heroi-tinta ${tinta} = ${c.toFixed(2)}:1 (mín. ${min}:1)`)
  }
})

/* ============================================================================
   Item 4 da régua — tipografia: só 500/700/800/900, nenhuma fonte mono em rótulo
   ========================================================================= */

test('nenhum peso 400 ou 600 nos estilos do redesign (fora da exceção F2)', () => {
  const violacoes = []
  for (const arquivo of ESTILOS_REDESIGN) {
    const fonte = foraDoBlocoF2(semComentarioCss(ler(arquivo)))
    const linhas = fonte.split('\n')
    linhas.forEach((linha, i) => {
      const m = linha.match(/\bfont(?:-weight)?:\s*(400|600)\b/)
      if (m) violacoes.push(`${arquivo}:${i + 1}: peso ${m[1]} — "${linha.trim().slice(0, 72)}"`)
    })
  }
  assert.equal(violacoes.length, 0, `\n${violacoes.join('\n')}`)
})

test('nenhuma fonte mono em seletor de rótulo/label', () => {
  for (const arquivo of ESTILOS_REDESIGN) {
    const fonte = semComentarioCss(ler(arquivo))
    for (const m of fonte.matchAll(/([^{}]*rotulo[^{}]*)\{([^}]*)\}/gi)) {
      assert.ok(!/\bmono\b|jetbrains/i.test(m[2]), `${arquivo}: seletor "${m[1].trim()}" usa fonte mono`)
    }
  }
})

/* ============================================================================
   Item 8 da régua — botões chapados (sem box-shadow)
   ========================================================================= */

test('.scw-btn e variantes são chapados (sem box-shadow)', () => {
  const sistema = semComentarioCss(ler(SISTEMA))
  const blocos = [...sistema.matchAll(/((?:\.[\w-]*\bscw-btn[\w-]*\s*,?\s*)+)\{([^}]*)\}/g)]
  assert.ok(blocos.length > 0, '.scw-btn não encontrado em ' + SISTEMA)
  for (const [, seletor, corpo] of blocos) {
    assert.ok(!/box-shadow/.test(corpo), `regra "${seletor.trim()}" tem box-shadow — botão devia ser chapado`)
  }
})

/* ============================================================================
   Item 9 da régua — iconografia: escala fixa, família premios só no Sweet Awards
   ========================================================================= */

test('ScwIcon: tamanho na escala 16/20/24/32/48; família premios só no Sweet Awards', () => {
  const ESCALA = new Set([16, 20, 24, 32, 48])
  const candidatos = [
    ...PAGINAS,
    'src/components/nav.jsx',
    'src/components/MobileMenu.jsx',
    'src/components/MobileTabBar.jsx',
    'src/components/AccessDialog.jsx',
    'src/components/SiteFooter.jsx',
    'src/components/BotaoTopo.jsx',
  ]
  let achou = false
  for (const arquivo of candidatos) {
    let fonte
    try { fonte = ler(arquivo) } catch { continue }
    for (const m of fonte.matchAll(/<ScwIcon\s+nome="([^"]+)"[^>]*?tamanho=\{(\d+)\}/gs)) {
      achou = true
      const [, nome, tamanho] = m
      assert.ok(ESCALA.has(+tamanho), `${arquivo}: ScwIcon "${nome}" com tamanho ${tamanho} fora da escala 16/20/24/32/48`)
      if (nome.startsWith('premios/')) {
        assert.equal(
          arquivo, 'src/pages/institutional/HistoricoAwards.jsx',
          `${arquivo}: família premios ("${nome}") só é permitida no Sweet Awards`,
        )
      }
    }
  }
  assert.ok(achou, 'nenhum uso de <ScwIcon> encontrado — checagem ficaria vazia')
})

/* ============================================================================
   Item 12 da régua — voz: sem escassez, sem jargão de agência
   ========================================================================= */

test('sem linguagem de escassez ou jargão de agência no texto das páginas', () => {
  const PROIBIDAS = [
    'última chance', 'somente nesta edição', 'só nesta edição', 'nunca mais volta',
    'últimas vagas', 'vagas limitadas', 'ativação 360', 'experiência imersiva',
  ]
  for (const arquivo of PAGINAS) {
    const fonte = ler(arquivo).toLowerCase()
    for (const frase of PROIBIDAS) {
      assert.ok(!fonte.includes(frase), `${arquivo}: linguagem proibida — "${frase}"`)
    }
  }
})
