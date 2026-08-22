#!/usr/bin/env node
/* Recria em supabase/migrations/ as migrations que só existem no banco.
 *
 * Em 22/08/2026 o banco tinha 17 migrations e o repositório 8: as 9 de junho
 * — que criam votos, feedback_geral, admin_ok e submit_vote — não existiam
 * fora do Supabase. Num projeto no plano Free, sem backup automático, isso
 * significa esquema sem cópia em lugar nenhum.
 *
 * A fonte é o CSV do SQL Editor, e não a digitação: migration transcrita à mão
 * que sai diferente do banco é pior que migration ausente — parece autoridade
 * e mente. Rode no dashboard e baixe o CSV:
 *
 *   select version, name, array_to_string(statements, E';\n') as sql
 *   from supabase_migrations.schema_migrations order by version;
 *
 * Uso:  node scripts/recuperar-migrations.mjs <caminho-do-csv>
 */
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const csv = process.argv[2]
if (!csv) { console.error('Uso: node scripts/recuperar-migrations.mjs <arquivo.csv>'); process.exit(1) }

const DESTINO = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations')

/* Parser de CSV de verdade: o SQL traz vírgula, aspas e quebra de linha dentro
   do campo. Split por vírgula partiria as migrations no meio. */
function lerCsv (texto) {
  const linhas = []; let campo = ''; let linha = []; let aspas = false
  const t = texto.replace(/^\uFEFF/, '')
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (aspas) {
      if (c === '"') { if (t[i + 1] === '"') { campo += '"'; i++ } else aspas = false }
      else campo += c
    } else if (c === '"') aspas = true
    else if (c === ',') { linha.push(campo); campo = '' }
    else if (c === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = '' }
    else if (c !== '\r') campo += c
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha) }
  const [cab, ...resto] = linhas
  return resto.filter(l => l.length === cab.length)
    .map(l => Object.fromEntries(cab.map((k, i) => [k.trim(), l[i]])))
}

const existentes = await readdir(DESTINO)
const registros = lerCsv(await readFile(csv, 'utf8'))
if (!registros.length) { console.error('CSV sem linhas — confira a consulta.'); process.exit(1) }

let escritos = 0
for (const r of registros) {
  const { version, name, sql } = r
  if (!version || !sql) { console.error(`  pulei linha sem version/sql: ${JSON.stringify(r).slice(0, 80)}`); continue }
  // Já está no repo? Basta o número da versão aparecer no nome de algum arquivo.
  if (existentes.some(f => f.startsWith(version))) { console.log(`  já existe  ${version}_${name}`); continue }
  const arquivo = `${version}_${name || 'sem_nome'}.sql`
  await writeFile(`${DESTINO}/${arquivo}`, sql.endsWith('\n') ? sql : sql + '\n')
  console.log(`  RECUPERADA ${arquivo}  (${sql.length} bytes)`)
  escritos++
}
console.log(`\n${escritos} migration(s) recuperada(s) de ${registros.length} no banco.`)
