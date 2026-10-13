/*
 * Fonte de uma página do institucional, para os testes estáticos.
 *
 * Desde 12/10/2026 cada página mora numa pasta própria (src/pages/<pagina>/,
 * uma seção por arquivo) e o texto editorial em src/data/conteudo/<pagina>.js;
 * src/pages/institutional/<Pagina>.jsx virou só o ponto de entrada compatível.
 * Os testes que liam o arquivo antigo passam a ler a página INTEIRA — senão a
 * reorganização esvaziaria a cobertura em silêncio (o arquivo de entrada não
 * tem cor, ícone nem texto nenhum).
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'

const RAIZ = new URL('../', import.meta.url)

const PASTA = {
  'src/pages/institutional/Home.jsx': 'home',
  'src/pages/institutional/Edicoes.jsx': 'edicoes',
  'src/pages/institutional/HistoricoAwards.jsx': 'sweet-awards',
  'src/pages/institutional/Participar.jsx': 'participar',
  'src/pages/institutional/Apoiar.jsx': 'apoiar',
  'src/pages/institutional/Contato.jsx': 'contato',
}

function arquivosEm(rel) {
  const url = new URL(rel, RAIZ)
  if (!existsSync(url)) return []
  const saida = []
  for (const nome of readdirSync(url).sort()) {
    const filho = `${rel}/${nome}`
    if (statSync(new URL(filho, RAIZ)).isDirectory()) saida.push(...arquivosEm(filho))
    else if (/\.(jsx?|mjs)$/.test(nome)) saida.push(filho)
  }
  return saida
}

/** Os arquivos que compõem a página (entrada + pasta + conteúdo editorial). */
export function arquivosDaPagina(rel) {
  const pasta = PASTA[rel]
  if (!pasta) return [rel]
  const conteudo = `src/data/conteudo/${pasta}.js`
  return [
    rel,
    ...arquivosEm(`src/pages/${pasta}`),
    ...(existsSync(new URL(conteudo, RAIZ)) ? [conteudo] : []),
  ]
}

/** Lê um arquivo; se for a entrada de uma página, devolve a página inteira. */
export function lerFonte(rel) {
  return arquivosDaPagina(rel)
    .map((arq) => readFileSync(new URL(arq, RAIZ), 'utf8'))
    .join('\n')
}
