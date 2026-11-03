// Fotos aprovadas dos combos (retrato local) -> Storage `edicao-publico` + midias_participacao aprovadas.
// Lista 13, B2 (decisão do Wilker, 03/11: as fotos chegam à produção PELO BANCO, nunca pelo repositório público).
//
//   node --env-file=.env.local scripts/edicao/subir-fotos-combo.mjs            (só mostra o plano — padrão)
//   node --env-file=.env.local scripts/edicao/subir-fotos-combo.mjs --gravar   (sobe e registra; com o ok do Wilker)
//
// Antes: fotos-combo.py (gera public/retrato-local/combos/ e preenche o retrato) e a migration
// 20261129_item_fotos_publicas (coluna `rotulo` + `fotos` do item na projeção pública).
// DEPOIS: republicar cada casa no painel. O site público lê o conteúdo CONGELADO na publicação
// (edicao_publica -> publicacoes.conteudo): foto nova só aparece depois de a casa ser (re)publicada.
// Precisa de SUPABASE_SERVICE_ROLE_KEY no ambiente (o script nunca a imprime).
//
// Por casa: combo -> papel combo_principal (pula, avisando, se já houver principal de outro autor: o índice
// midias_um_principal só aceita uma); cada item -> papel item (ordem 1 = a principal, depois detalhe e opções,
// com `rotulo`); peça sem item (raro) -> combo_galeria. Caminho no bucket: 2026.2/<id da participação>/<peça>.webp
// (o uuid da participação deixa o endereço impossível de adivinhar, como o desenho do bucket pede; upsert).
// Idempotente: apaga só as linhas que ESTE script criou antes (criado_por = 'fotos-combo') e grava de novo.
// Erro numa casa não para as outras: o resumo final lista o que falhou.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const RAIZ = fileURLToPath(new URL('../../', import.meta.url))
const RETRATO = JSON.parse(readFileSync(`${RAIZ}src/edicao/dados/retrato/cartoon.local.json`, 'utf8'))
const EDICAO = RETRATO.edicao.codigo
const BUCKET = 'edicao-publico'
const AUTOR = 'fotos-combo'
const URL_BASE = process.env.SUPABASE_URL || 'https://dgfmoibynftadsyjcclg.supabase.co'
const CHAVE = process.env.SUPABASE_SERVICE_ROLE_KEY
const GRAVAR = process.argv.includes('--gravar')
if (!CHAVE) { console.error('Falta SUPABASE_SERVICE_ROLE_KEY no ambiente (node --env-file=.env.local …).'); process.exit(1) }
const cab = { apikey: CHAVE, Authorization: `Bearer ${CHAVE}` }

async function rest (caminho, opcoes = {}) {
  const r = await fetch(`${URL_BASE}/rest/v1/${caminho}`, { ...opcoes, headers: { ...cab, 'Content-Type': 'application/json', ...opcoes.headers } })
  if (!r.ok) throw new Error(`${opcoes.method || 'GET'} ${caminho.split('?')[0]}: HTTP ${r.status} ${await r.text()}`)
  return r.status === 204 || r.status === 201 ? null : r.json()
}
const local = (p) => `${RAIZ}public${p}` // /retrato-local/combos/<slug>/<peça>.webp
const destino = (participacao, p) => `${EDICAO}/${participacao}/${p.split('/').pop()}`

// participação de cada slug: slug_publico gravado, ou o slug provisório que o banco calcula do nome
const participacoes = await rest(`participacoes?select=id,slug_publico,participantes(nome_marca)&edicao_codigo=eq.${EDICAO}&status_cadastro=neq.encerrado`)
const porSlug = new Map()
for (const pa of participacoes) {
  const slug = pa.slug_publico || await rest('rpc/slug_publico_de', { method: 'POST', body: JSON.stringify({ p: pa.participantes?.nome_marca || '' }) })
  porSlug.set(slug, pa.id)
}

let linhas = 0
const avisos = []
const falhas = []
for (const p of RETRATO.participantes) {
  const fotos = p.combo?.fotos
  if (!fotos?.principal) continue
  const id = porSlug.get(p.slug)
  if (!id) { falhas.push(`${p.slug}: participação não encontrada`); continue }
  try {
    const itensBanco = await rest(`participantes_itens?select=id,tipo,posicao&participacao_id=eq.${id}&order=posicao`)
    const principalAlheia = await rest(`midias_participacao?select=id&participacao_id=eq.${id}&papel=eq.combo_principal&estado=neq.recusada&criado_por=neq.${AUTOR}`)
    const novas = []
    if (principalAlheia.length) avisos.push(`${p.slug}: já tem foto principal de outro autor — mantida; a do script não entra`)
    else novas.push({ papel: 'combo_principal', foto: fotos.principal, ordem: 1 })
    ;(fotos.galeria || []).forEach((f, n) => novas.push({ papel: 'combo_galeria', foto: f, ordem: n + 1 }))
    for (const item of p.combo.itens || []) {
      const doBanco = itensBanco.find((i) => i.tipo === item.tipo)
      const lista = item.fotos?.length ? item.fotos : [item.foto].filter(Boolean)
      if (!lista.length) continue
      if (!doBanco) { avisos.push(`${p.slug}: item ${item.tipo} sem linha no banco — fotos dele ficam de fora`); continue }
      lista.forEach((f, n) => novas.push({ papel: 'item', item_id: doBanco.id, foto: f, ordem: n + 1 }))
    }
    linhas += novas.length
    if (!GRAVAR) { console.log(`${p.slug}: ${novas.length} fotos (${novas.filter((n) => n.papel === 'item').length} de item)`); continue }

    for (const n of novas) {
      const r = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${destino(id, n.foto.path)}`, {
        method: 'POST', headers: { ...cab, 'Content-Type': 'image/webp', 'x-upsert': 'true' }, body: readFileSync(local(n.foto.path)),
      })
      if (!r.ok) throw new Error(`upload: HTTP ${r.status} ${await r.text()}`)
    }
    await rest(`midias_participacao?participacao_id=eq.${id}&criado_por=eq.${AUTOR}`, { method: 'DELETE' })
    await rest('midias_participacao', {
      method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(novas.map((n) => ({
        participacao_id: id, item_id: n.item_id || null, papel: n.papel, origem: 'sessao_oficial', estado: 'aprovada',
        path: destino(id, n.foto.path), largura: n.foto.largura, altura: n.foto.altura, alt: String(n.foto.alt || '').slice(0, 160),
        rotulo: n.foto.rotulo || null, ordem: n.ordem, criado_por: AUTOR,
      }))),
    })
    console.log(`${p.slug}: ${novas.length} fotos gravadas`)
  } catch (e) {
    falhas.push(`${p.slug}: ${e.message}`)
  }
}
console.log(`${GRAVAR ? 'gravado' : 'plano (nada gravado; use --gravar)'}: ${linhas} fotos em midias_participacao`)
if (avisos.length) console.log('avisos:\n  ' + avisos.join('\n  '))
if (falhas.length) { console.log('FALHAS (estas casas não foram gravadas):\n  ' + falhas.join('\n  ')); process.exitCode = 1 }
if (GRAVAR && !falhas.length) console.log('Agora: republicar cada casa no painel — o site público lê o conteúdo congelado na publicação.')
