/*
 * Gera um snapshot estático de cada página institucional — HTML autocontido,
 * com o CSS embutido e as imagens rebaixadas — para editar no Claude Design.
 *
-
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname, extname } from 'node:path'

const SAIDA = process.argv[2] || join(process.cwd(), 'tests', '.snapshot-design')
const PORT = 5215
const BASE = `http://localhost:${PORT}`
const ROTAS = [
  /* A landing entra pelo MESMO `?preview=1` das outras: com o preview ligado o
     gate para de sequestrar toda rota (App.jsx §3.4) e o teste de caminho volta
     a valer, então `#/em-breve` devolve a landing de verdade. Sem o preview,
     TODAS as seis linhas abaixo devolveriam esta mesma página — é o defeito que
     custou meses no tests/responsive.mjs (§10.8). */
  ['/em-breve', 'em-breve', 'Em breve (pré-cadastro)'],
  ['/', 'home', 'O festival (Home)'],
  ['/edicoes', 'edicoes', 'Edições'],
  ['/sweet-awards', 'sweet-awards', 'Sweet Awards'],
  ['/participar', 'participar', 'Participar'],
  ['/apoiar', 'apoiar', 'Apoiar'],
  ['/contato', 'contato', 'Contato'],
]

const achatar = (p) => decodeURIComponent(p).replace(/^\//, '').replace(/[\/\\]/g, '-')

const s = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'], { shell: true, stdio: 'ignore' })
for (let i = 0; i < 80; i++) { try { if ((await fetch(BASE)).ok) break } catch {} await new Promise((r) => setTimeout(r, 350)) }

mkdirSync(join(SAIDA, 'paginas'), { recursive: true })
mkdirSync(join(SAIDA, 'assets', 'img'), { recursive: true })

const navegador = await chromium.launch()
const imagens = new Set()

for (const [rota, arquivo, titulo] of ROTAS) {
  /* 🐛 `goto` para uma URL que só muda o #hash NÃO recarrega o documento — o
     navegador dispara `hashchange` e pronto. Como cada captura MUTILA o DOM
     (embute o CSS, reescreve caminho de imagem, remove <script>), a rota
     seguinte renderizava por cima de nós que o React não reconhecia mais e
     morria em "Failed to execute 'insertBefore' on 'Node'". O resultado passava
     despercebido porque o arquivo era GRAVADO do mesmo jeito: a primeira página
     saía inteira e as outras saíam com a tela do ErrorBoundary dentro, com peso
     plausível — o CSS embutido sozinho já dá ~134 KB.
     A página nova por rota é o que garante documento limpo. Um `reload()` só
     depois do goto também resolveria, mas deixaria a ordem das rotas mandando
     no resultado, que é exatamente o que quebrou aqui. */
  const page = await navegador.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(`${BASE}/?preview=1#${rota}`, { waitUntil: 'load' })

  // percorre a página inteira para tudo montar e revelar
  await page.evaluate(async () => {
    const passo = Math.round(window.innerHeight * 0.7)
    for (let y = 0; y < document.body.scrollHeight + window.innerHeight; y += passo) {
      window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 110))
    }
    window.scrollTo(0, 0); await new Promise((r) => setTimeout(r, 500))
  })

  // congela no estado FINAL: nada dependendo de JS para ficar visível
  await page.evaluate(() => {
    document.documentElement.classList.remove('scw-mo-on')
    document.querySelectorAll('[data-mo], [data-mo-grade]').forEach((el) => {
      el.classList.add('is-in'); el.removeAttribute('data-mo'); el.removeAttribute('data-mo-grade')
      el.style.removeProperty('--mo-i')
    })
    document.querySelectorAll('[style*="--mo-j"]').forEach((el) => el.style.removeProperty('--mo-j'))
    /* Contador congela no valor FINAL. O snapshot arranca os <script>, então o
       que estiver escrito no momento da captura é o que o Design vê para sempre
       — e uma faixa de números zerados é pior que nenhuma, porque parece dado.
       O molde já carrega o valor final (é ele que reserva a largura). */
    document.querySelectorAll('[data-conta-molde]').forEach((molde) => {
      if (molde.nextElementSibling) molde.nextElementSibling.textContent = molde.textContent
    })
    document.querySelector('.cookie-consent, [class*="cookie"]')?.remove()
  })

  // CSS do build, concatenado (sem os @font-face de caminho hasheado do Vite)
  const css = await page.evaluate(async () => {
    const partes = []
    for (const l of document.querySelectorAll('link[rel="stylesheet"]')) {
      partes.push(await (await fetch(l.href)).text())
    }
    for (const st of document.querySelectorAll('style')) partes.push(st.textContent || '')
    return partes.join('\n')
  })

  let html = await page.evaluate(() => document.documentElement.outerHTML)

  // As imagens saem do HTML e do CSS CRUS, não do DOM: `img.currentSrc` fica
  // vazio em tudo que é lazy e não chegou a carregar, e aí o caminho seria
  // reescrito sem que o arquivo fosse copiado — imagem quebrada no snapshot.
  const ALVO = /\/(?:images|logos)\/[A-Za-z0-9._~%\-\/]+\.(?:jpe?g|png|svg|webp|avif)/gi
  for (const m of (html + '\n' + css).matchAll(ALVO)) imagens.add(m[0])

  // --- reescrita de caminhos ------------------------------------------------
  // As aspas do url() podem vir escapadas (&quot;) quando o fundo mora num
  // atributo style=. Por isso o padrão aceita ", ' e &quot; — e a saída vai SEM
  // aspas: aspas literais dentro de style="…" fechariam o atributo.
  const URL_ASSET = /url\(\s*(?:"|'|&quot;|&#39;)?(\/(?:images|logos)\/[^"'&)]+)(?:"|'|&quot;|&#39;)?\s*\)/g
  const limpo = (txt) => txt
    .replace(/@font-face\s*\{[^}]*\}/g, '')                       // fontes entram pelo tokens/fonts.css
    .replace(URL_ASSET, (_, p) => `url(../assets/img/${achatar(p)})`)

  html = html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<link[^>]*rel="(stylesheet|modulepreload|preload)"[^>]*>/g, '')
    .replace(/(src|href)="(\/(?:images|logos|fonts)\/[^"]+)"/g, (m, a, p) =>
      p.startsWith('/fonts/') ? '' : `${a}="../assets/img/${achatar(p)}"`)
  html = limpo(html)

  const cabeca = `<link rel="stylesheet" href="../tokens/fonts.css">\n<style>\n${limpo(css)}\n</style>\n`
  html = html.replace('</head>', cabeca + '</head>')

  const card = `<!-- @dsCard group="Páginas" viewport="1440x1100" name="${titulo}" subtitle="Snapshot estático do site publicado — desktop 1440px" -->\n`
  writeFileSync(join(SAIDA, 'paginas', `${arquivo}.html`), card + '<!DOCTYPE html>\n' + html, 'utf8')
  console.log('página', arquivo.padEnd(14), (html.length / 1024).toFixed(0) + ' KB')
  await page.close()
}

await navegador.close()

// --- imagens: rebaixadas para peso de trabalho de design --------------------
let antes = 0, depois = 0, falhas = 0
for (const p of imagens) {
  const origem = join(process.cwd(), 'dist', decodeURIComponent(p))
  if (!existsSync(origem)) { falhas++; continue }
  const destino = join(SAIDA, 'assets', 'img', achatar(p))
  mkdirSync(dirname(destino), { recursive: true })
  antes += statSync(origem).size
  const ext = extname(destino).toLowerCase()
  try {
    if (ext === '.svg') {
      execSync(`cp "${origem}" "${destino}"`, { stdio: 'ignore' })
    } else if (ext === '.png') {
      execSync(`ffmpeg -y -i "${origem}" -vf "scale='min(700,iw)':-2" "${destino}"`, { stdio: 'ignore' })
    } else {
      execSync(`ffmpeg -y -i "${origem}" -vf "scale='min(1200,iw)':-2" -q:v 5 "${destino}"`, { stdio: 'ignore' })
    }
    depois += statSync(destino).size
  } catch { falhas++ }
}
console.log(`\nimagens ${imagens.size}: ${(antes / 1048576).toFixed(1)} MB → ${(depois / 1048576).toFixed(1)} MB · falhas ${falhas}`)

try { execSync(`taskkill /pid ${s.pid} /T /F`, { stdio: 'ignore' }) } catch {}
