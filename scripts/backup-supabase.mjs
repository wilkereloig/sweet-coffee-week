#!/usr/bin/env node
// Dump de dados do Supabase para JSON, fora do Supabase.
// O projeto está no plano Free: não há backup automático (docs/INSTRUCAO-painel-fase2.md §2).
//
// Uso (PowerShell):
//   $env:SUPABASE_SERVICE_ROLE_KEY="<a service_role key do dashboard>"
//   npm run backup
//
// SUPABASE_URL tem padrão embutido; só se sobrescreve para apontar outro projeto.
//
// A chave NUNCA entra em arquivo do repositório: só variável de ambiente.
// Saída padrão: ../backups-supabase/scw-<AAAA-MM-DD-HHMM>/ — fora do repositório.

import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

// A URL é pública por design — é a mesma que vai no bundle do front
// (src/lib/supabase.js). Só a chave precisa vir do ambiente.
const URL_BASE = process.env.SUPABASE_URL || 'https://dgfmoibynftadsyjcclg.supabase.co'
const CHAVE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!CHAVE) {
  console.error('Falta SUPABASE_SERVICE_ROLE_KEY no ambiente (Project Settings > API > service_role).')
  process.exit(1)
}

const carimbo = new Date().toISOString().slice(0, 16).replace('T', '-').replace(':', '')
const destino = resolve(process.argv[2] ?? `../backups-supabase/scw-${carimbo}`)
const cabecalho = { apikey: CHAVE, Authorization: `Bearer ${CHAVE}` }
const PAGINA = 1000

async function pegar (caminho, extra = {}) {
  const r = await fetch(`${URL_BASE}${caminho}`, { headers: { ...cabecalho, ...extra } })
  if (!r.ok) throw new Error(`${caminho} → ${r.status} ${await r.text()}`)
  return r.json()
}

// A lista de tabelas sai do próprio OpenAPI do PostgREST — nada é digitado à mão aqui,
// então tabela nova entra no backup sozinha.
async function tabelas () {
  const spec = await pegar('/rest/v1/')
  return Object.keys(spec.paths ?? {})
    .filter(p => p.startsWith('/') && p.length > 1)
    .map(p => p.slice(1))
    .filter(n => n && !n.startsWith('rpc/'))
    .sort()
}

// A coluna de ordenacao sai da PRIMEIRA LINHA da propria tabela.
//
// Isto conserta o bug que impedia o script de rodar: ele paginava com
// `order=1`, esperando "ordene pela primeira coluna". O PostgREST NAO aceita
// posicao ordinal — le o `1` como NOME de coluna e devolve 42703, "column
// <tabela>.1 does not exist". Toda tabela falhava; admin_config so era a
// primeira da fila alfabetica.
//
// Por que da linha e nao do `definitions` do spec: o spec do PostgREST muda
// conforme o papel que pergunta, entao nao da para conferir o formato dele sem
// a chave de servico em maos — e correcao apoiada em suposicao nao conferida e
// como o proprio `order=1` nasceu. A linha real nao deixa duvida.
//
// Tabela vazia devolve null, e nao faz falta: sem linha nao ha o que paginar.
async function colunaDeOrdem (nome) {
  const [linha] = await pegar(`/rest/v1/${nome}?select=*&limit=1`)
  return linha ? Object.keys(linha)[0] ?? null : null
}

async function dumpTabela (nome) {
  const linhas = []
  const chave = await colunaDeOrdem(nome)
  const ordem = chave ? `&order=${encodeURIComponent(chave)}` : ''
  for (let de = 0; ; de += PAGINA) {
    const lote = await pegar(`/rest/v1/${nome}?select=*${ordem}&limit=${PAGINA}&offset=${de}`)
    linhas.push(...lote)
    if (lote.length < PAGINA) break

    // Sem coluna para ordenar, `limit`+`offset` NAO paginam de forma estavel:
    // o Postgres pode devolver a mesma linha em duas paginas e nunca devolver
    // outra. Enquanto tudo cabe numa pagina isso e inofensivo — o laco para
    // antes de pedir a segunda. Passou disso, para com erro: backup faltando
    // linha em silencio e pior que backup que falhou.
    if (!chave) throw new Error(`${nome} passa de ${PAGINA} linhas e nao tem coluna para ordenar`)
  }
  await writeFile(`${destino}/${nome}.json`, JSON.stringify(linhas, null, 1))
  return linhas.length
}

// Contas do Auth: viraram dado real na Fase 1 e não aparecem no PostgREST.
async function dumpUsuarios () {
  const todos = []
  for (let pag = 1; ; pag++) {
    const { users = [] } = await pegar(`/auth/v1/admin/users?page=${pag}&per_page=200`)
    todos.push(...users)
    if (users.length < 200) break
  }
  await writeFile(`${destino}/auth_users.json`, JSON.stringify(todos, null, 1))
  return todos.length
}

await mkdir(destino, { recursive: true })
const contagem = {}
for (const t of await tabelas()) {
  contagem[t] = await dumpTabela(t)
  console.log(`${String(contagem[t]).padStart(6)}  ${t}`)
}
contagem['auth.users'] = await dumpUsuarios()
console.log(`${String(contagem['auth.users']).padStart(6)}  auth.users`)

await writeFile(`${destino}/manifesto.json`, JSON.stringify({
  projeto: 'SCW Lovers', url: URL_BASE, em: new Date().toISOString(), linhas: contagem
}, null, 2))
console.log(`\nBackup em ${destino}`)
