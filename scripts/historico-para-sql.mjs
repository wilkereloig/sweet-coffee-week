// Gera a carga do acervo histórico no banco a partir da FONTE do site:
//   src/data/sweetCoffeeHistory.js  (edições, participantes, pódios, aliases)
//   src/data/loversAwardsResults.js (pódios da 2026.1)
//
// Uso: node scripts/historico-para-sql.mjs > supabase/migrations/20260929_fase8_carga_historico.sql
//
// ⛔ O SQL gerado não se edita à mão (mesma regra de imageVariants.js): mudou o
// acervo, roda o script de novo. A carga é idempotente — `on conflict` em tudo.
//
// Nada é inferido além do que a fonte diz:
// - datas do festival só saem do texto de período quando ele casa com o padrão
//   "DD a DD de <mês> de AAAA" ou "DD de <mês> a DD de <mês> de AAAA";
// - premiação com status diferente de completa entra como histórico INCERTO;
// - menção honrosa NÃO é colocação (CLAUDE.md §9.4) e fica de fora.
import { SWEET_COFFEE_HISTORY as H } from '../src/data/sweetCoffeeHistory.js'
import { LOVERS_2026_AWARDS_RESULTS } from '../src/data/loversAwardsResults.js'

const FONTE = 'src/data/sweetCoffeeHistory.js'

// Mesma normalização de awardsData.js e de public.normalizar_nome().
export const norm = (s) =>
  (s || '').toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '')
    .replace(/&/g, ' e ').replace(/[^a-z0-9]+/g, ' ').trim()

const q = (v) => (v === null || v === undefined ? 'null' : "'" + String(v).replace(/'/g, "''") + "'")

const MESES = { janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6, julho: 7,
  agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12 }
const iso = (a, m, d) => `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

export function periodoParaDatas(txt) {
  const t = norm(txt)
  let m = t.match(/^(\d{1,2}) a (\d{1,2}) de ([a-z]+) de (\d{4})$/)
  if (m && MESES[m[3]]) return [iso(m[4], MESES[m[3]], m[1]), iso(m[4], MESES[m[3]], m[2])]
  m = t.match(/^(\d{1,2}) de ([a-z]+) a (\d{1,2}) de ([a-z]+) de (\d{4})$/)
  if (m && MESES[m[2]] && MESES[m[4]]) return [iso(m[5], MESES[m[2]], m[1]), iso(m[5], MESES[m[4]], m[3])]
  return [null, null]
}

// Canônico de marca: o alias aponta para o nome canônico.
const CANON = {}
for (const [canon, vars] of Object.entries(H.participantAliases || {})) {
  CANON[norm(canon)] = canon
  for (const v of vars) CANON[norm(v)] = canon
}
const CANON_CAT = {}
for (const [canon, vars] of Object.entries(H.categoryAliases || {})) {
  CANON_CAT[norm(canon)] = canon
  for (const v of vars) CANON_CAT[norm(v)] = canon
}
const marca = (n) => CANON[norm(n)] || String(n).trim()
const categoria = (c) => CANON_CAT[norm(c)] || String(c).trim()
const LOVERS = new Map(LOVERS_2026_AWARDS_RESULTS.premiacao.categorias.map((c) => [c.key, c]))

export function montarCarga() {
  const edicoes = []
  const marcas = new Map()        // chave -> nome
  const participacoes = []        // {ed, chave, nome}
  const premios = []              // {ed, cat, catReg, trilha, pos, chave, nome, incerto}

  for (const e of H.edicoes) {
    const [ini, fim] = periodoParaDatas(e.periodo)
    const nome = e.tema || String(e.nome).replace(/^S&C\s*\/?\s*/, '').trim()
    edicoes.push({ codigo: e.id, ordem: e.ordem, nome, tema: e.tema, periodo: e.periodo, ini, fim })

    const vistos = new Set()
    for (const n of e.participantes || []) {
      const canon = marca(n)
      const chave = norm(canon)
      if (!marcas.has(chave)) marcas.set(chave, canon)
      const reg = String(n).trim()
      if (vistos.has(reg)) continue
      vistos.add(reg)
      participacoes.push({ ed: e.id, chave, nome: reg })
    }

    const status = e.premiacao && e.premiacao.status
    const incerto = !(status === 'completa' || status === 'completa_em_publicacoes_oficiais')
    for (const c of (e.premiacao && e.premiacao.categorias) || []) {
      const fonte = e.id === '2026.1' ? LOVERS.get(c.key) : null
      for (const p of ((fonte ? fonte.colocacoes : c.colocacoes) || [])) {
        for (const n of p.nomes || []) {
          const canon = marca(n)
          const chave = norm(canon)
          if (!marcas.has(chave)) marcas.set(chave, canon)
          premios.push({ ed: e.id, cat: categoria(c.categoria), catReg: c.categoria, trilha: c.trilha || null,
            pos: p.pos, chave, nome: String(n).trim(), incerto })
        }
      }
    }
  }

  const aliases = []
  for (const [canon, vars] of Object.entries(H.participantAliases || {})) {
    const chave = norm(canon)
    if (!marcas.has(chave)) marcas.set(chave, canon)
    for (const v of [canon, ...vars]) aliases.push({ alias: v, chave })
  }
  for (const [chave, nome] of marcas) aliases.push({ alias: nome, chave })

  return { edicoes, marcas, participacoes, premios, aliases }
}

function gerarSql() {
  const { edicoes, marcas, participacoes, premios, aliases } = montarCarga()
  const out = []
  out.push(`-- =============================================================================
-- Fase 8 — carga do acervo histórico (GERADO por scripts/historico-para-sql.mjs)
-- ⛔ Não editar à mão. Fonte: ${FONTE} + src/data/loversAwardsResults.js.
-- Edições: ${edicoes.length} · marcas: ${marcas.size} · participações (marca × edição): ${new Set(participacoes.map((p) => p.ed + '|' + p.chave)).size}
-- (${participacoes.length} linhas: redes com mais de uma unidade registrada, como a Fran's em 2021.2)
-- · colocações: ${premios.length} · aliases: ${new Set(aliases.map((a) => norm(a.alias))).size}
-- Idempotente: pode rodar de novo sem duplicar.
-- =============================================================================
`)
  out.push('insert into public.edicoes (codigo, ordem, nome, tema, periodo_texto, festival_inicio, festival_fim, classificacao, fonte) values')
  out.push(edicoes.map((e) => `  (${q(e.codigo)}, ${e.ordem}, ${q(e.nome)}, ${q(e.tema)}, ${q(e.periodo)}, ${q(e.ini)}, ${q(e.fim)}, 'historico_confirmado', ${q(FONTE)})`).join(',\n'))
  out.push('on conflict (codigo) do nothing;\n')

  out.push('insert into public.historico_marcas (chave, nome, fonte) values')
  out.push([...marcas].sort().map(([k, n]) => `  (${q(k)}, ${q(n)}, ${q(FONTE)})`).join(',\n'))
  out.push('on conflict (chave) do update set nome = excluded.nome;\n')

  const vistos = new Set()
  const al = aliases.filter((a) => { const k = norm(a.alias); if (!k || vistos.has(k)) return false; vistos.add(k); return true })
  out.push('insert into public.historico_aliases (alias, chave) values')
  out.push(al.map((a) => `  (${q(a.alias)}, ${q(a.chave)})`).join(',\n'))
  out.push('on conflict (alias_norm) do nothing;\n')

  out.push('insert into public.historico_participacoes (edicao_codigo, chave, nome_registrado, classificacao, fonte) values')
  out.push(participacoes.map((p) => `  (${q(p.ed)}, ${q(p.chave)}, ${q(p.nome)}, 'historico_confirmado', ${q(FONTE)})`).join(',\n'))
  out.push('on conflict (edicao_codigo, nome_registrado) do nothing;\n')

  out.push('insert into public.premiacoes (edicao_codigo, categoria, categoria_registrada, trilha, colocacao, chave, nome_registrado, classificacao, fonte) values')
  out.push(premios.map((p) => `  (${q(p.ed)}, ${q(p.cat)}, ${q(p.catReg)}, ${q(p.trilha)}, ${p.pos}, ${q(p.chave)}, ${q(p.nome)}, ${q(p.incerto ? 'historico_incerto' : 'historico_confirmado')}, ${q(FONTE)})`).join(',\n'))
  out.push("on conflict (edicao_codigo, categoria, coalesce(trilha, ''), colocacao, nome_registrado) do nothing;")
  return out.join('\n') + '\n'
}

if (process.argv[1] && process.argv[1].endsWith('historico-para-sql.mjs')) {
  process.stdout.write(gerarSql())
}
