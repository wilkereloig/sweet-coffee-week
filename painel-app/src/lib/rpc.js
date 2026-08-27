/*
 * Cliente RPC do painel — PostgREST direto por fetch, sem supabase-js
 * (mesmo motivo do arquivo estático que substitui: ~100 KB de CDN só pra
 * fazer POSTs). `fetchImpl` é injetado com default `fetch` global — em
 * produção ninguém passa o terceiro argumento; o teste passa um fake.
 */
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || 'https://dgfmoibynftadsyjcclg.supabase.co'
const SUPABASE_KEY = import.meta.env?.VITE_SUPABASE_KEY || 'sb_publishable_E6G4mwt0xFzz_Ob0dULd9g_NhlJpH2R'

export async function rpc(nome, corpo, fetchImpl = fetch) {
  const r = await fetchImpl(SUPABASE_URL + '/rest/v1/rpc/' + nome, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(corpo),
  })
  if (!r.ok) {
    let detalhe = ''
    try { detalhe = (await r.json()).message || '' } catch { /* corpo não é JSON */ }
    throw new Error(detalhe || ('HTTP ' + r.status))
  }
  // RPC `returns void` responde 204 sem corpo — ler como texto primeiro
  // cobre esse caso sem esconder falha de parse real.
  const bruto = await r.text()
  return bruto ? JSON.parse(bruto) : null
}

// Edge Functions (não é PostgREST) — porta fiel de chamarFuncao em
// public/painel/index.html (~1940-1962). Diferente de rpc(): sempre lê o
// corpo como JSON (as functions sempre respondem JSON, nunca 204 vazio) e,
// em erro, o corpo viaja junto (`err.dados`) — recusas de colisão devolvem
// dados que a tela usa (ex.: candidatura_id), perder isso no throw vira
// queixa sem saída.
export async function chamarFuncao(nome, corpo, fetchImpl = fetch) {
  const r = await fetchImpl(SUPABASE_URL + '/functions/v1/' + nome, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(corpo),
  })
  let dados = null
  try { dados = await r.json() } catch { /* corpo não é JSON */ }
  if (!r.ok) {
    const err = new Error((dados && (dados.detalhe || dados.erro)) || ('HTTP ' + r.status))
    err.dados = dados
    throw err
  }
  return dados || {}
}
