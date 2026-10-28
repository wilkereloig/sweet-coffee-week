// Grava src/edicao/dados/retrato/cartoon.local.json a partir da resposta do MCP
// (`execute_sql` com scripts/edicao/retrato-local.sql). Uso:
//   node scripts/edicao/retrato-salvar.mjs <arquivo-com-a-resposta-do-mcp>
// O MCP, quando a resposta é grande, grava o texto num arquivo e informa o caminho;
// é esse caminho que entra aqui. Depois: geocodificar-retrato.mjs e logos-desenhadas.py.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const SAIDA = fileURLToPath(new URL('../../src/edicao/dados/retrato/cartoon.local.json', import.meta.url))
// Chaves que o recorte público nunca devolve; se aparecerem, a consulta foi mexida e o arquivo não deve ser gravado.
const PROIBIDAS = /"(email|telefone|responsavel|cnpj|razao_social|custo_\w+|pagamento_\w+|combo_revisao_nota|user_id)"\s*:/

const arquivo = process.argv[2]
if (!arquivo) { console.error('uso: node scripts/edicao/retrato-salvar.mjs <arquivo-da-resposta-do-mcp>'); process.exit(1) }

let texto = readFileSync(arquivo, 'utf8')
try { const o = JSON.parse(texto); if (typeof o?.result === 'string') texto = o.result } catch { /* já é o texto da resposta */ }
const ini = texto.indexOf('[{')
const fim = texto.lastIndexOf('}]')
if (ini < 0 || fim < ini) { console.error('não achei a linha de resultado (esperado: [{"retrato": …}])'); process.exit(1) }

const retrato = JSON.parse(texto.slice(ini, fim + 2))[0]?.retrato
if (!retrato || !Array.isArray(retrato.participantes) || !retrato.participantes.length) {
  console.error('resultado sem participantes'); process.exit(1)
}
const proibida = JSON.stringify(retrato).match(PROIBIDAS)
if (proibida) { console.error(`campo privado no retrato: ${proibida[1]} — nada gravado`); process.exit(1) }

writeFileSync(SAIDA, `${JSON.stringify(retrato, null, 2)}\n`)
console.log(`gravado ${SAIDA}: ${retrato.participantes.length} casas, lido em ${retrato.retrato?.lido_em}`)
