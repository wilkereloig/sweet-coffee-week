/*
 * Regressão estática (19/10/2026): releitura de dado do painel passa pela camada de
 * sincronização (`lib/sync` + `useSincronizar`), nunca por `setInterval` solto numa tela.
 * Intervalos permitidos são só os que NÃO releem dado do painel — cada um com o motivo.
 * Isto não prova comportamento; só impede o polling disperso de voltar sem ninguém ver.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const RAIZ = new URL('../painel-app/src/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

const PERMITIDOS = {
  'lib/sync/': 'a própria camada de sincronização (heartbeat, renovação de token, periódico/conferência)',
  'components/Conexao.jsx': 'verificação de versão publicada (versao.json), não é dado do painel',
  'lib/redesArquivos.js': 'renovação de endereço assinado de imagem (vence em 5 min), não é releitura de dado',
  'App.jsx': 'nova tentativa de minhas_permissoes enquanto a leitura inicial FALHOU (estado de erro), parada ao ter sucesso',
}

function arquivos(dir) {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)
    return statSync(caminho).isDirectory() ? arquivos(caminho) : /\.(js|jsx)$/.test(nome) ? [caminho] : []
  })
}

test('setInterval só existe onde está na lista de exceções', () => {
  const achados = []
  for (const arq of arquivos(RAIZ)) {
    const rel = relative(RAIZ, arq).split(sep).join('/')
    const texto = readFileSync(arq, 'utf8')
    if (!/\bsetInterval\s*\(/.test(texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''))) continue
    if (!Object.keys(PERMITIDOS).some((p) => rel === p || (p.endsWith('/') && rel.startsWith(p)))) achados.push(rel)
  }
  assert.deepEqual(achados, [], 'polling fora da camada de sync: ' + achados.join(', '))
})

test('as exceções listadas ainda existem (lista não apodrece)', () => {
  for (const p of Object.keys(PERMITIDOS)) {
    if (p.endsWith('/')) continue
    assert.ok(readFileSync(join(RAIZ, p), 'utf8').includes('setInterval'), p + ' não usa mais setInterval — tire da lista')
  }
})
