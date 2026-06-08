import React from 'react'
import { supabase } from '../../lib/supabase'
import { AWARDS_CATEGORIES, AWARDS_PARTICIPANTS } from '../../data/sweetAwards'

// Painel admin (oculto): resultados, auditoria e votos suspeitos.
// Acesso por senha — validada no banco (admin_ping). Nenhum dado sem a senha.
const SS_KEY = 'sweet-admin-secret'
const nameBySlug = Object.fromEntries(AWARDS_PARTICIPANTS.map(p => [p.slug, p.name]))
const partName = (slug) => nameBySlug[slug] || slug

const SUSPEITO_LABEL = {
  telefone_multi_email: 'Mesmo telefone em e-mails diferentes',
  instagram_multi_email: 'Mesmo Instagram em e-mails diferentes',
  nome_multi_email: 'Mesmo nome em 3+ e-mails',
  notas_max: 'Todas as 8 notas no máximo (10)',
  email_bounce: 'E-mail voltou (bounce/spam) — endereço inválido',
}

function toCsv(rows) {
  if (!rows.length) return ''
  const cols = Object.keys(rows[0])
  const esc = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  const head = cols.join(';')
  const body = rows.map(r => cols.map(c => esc(r[c])).join(';')).join('\n')
  return head + '\n' + body
}

function download(filename, text) {
  const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

const card = { background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 12px 30px rgba(43,24,16,.08)', marginBottom: 18 }
const th = { textAlign: 'left', padding: '12px 14px', fontSize: 15, fontWeight: 700, color: 'var(--lovers-burgundy)', borderBottom: '2px solid rgba(135,14,45,.15)', whiteSpace: 'nowrap' }
const td = { padding: '13px 14px', fontSize: 15.5, lineHeight: 1.55, borderBottom: '1px solid rgba(135,14,45,.08)', whiteSpace: 'nowrap' }

// Análise qualitativa da pesquisa (síntese das respostas abertas — gostou/melhorar/temas).
// Estática: gerada a partir das respostas do banco. Atualizar quando quiser reanalisar.
const AI_PESQUISA = {
  data: '08/06/2026',
  nRespostas: 602,
  avaliacaoGeral: 'O público recebeu a edição 2026 do Sweet & Coffee Week Lovers de forma majoritariamente muito positiva e afetiva, com forte sentimento de tradição e pertencimento — muitos respondem simplesmente "tudo", "amei tudo" ou "perfeito" e dizem aguardar o evento todo ano. O tom geral é de entusiasmo, sustentado por três pilares: a variedade de estabelecimentos, a criatividade dos combos e o custo-benefício. A satisfação percebida é alta, evidenciada pelo fato de a resposta mais frequente sobre o que melhorar ter sido "nada" (43 vezes), além de dezenas de "tudo perfeito". Ainda assim, há um conjunto consistente de críticas construtivas — sobretudo preço, curta duração e a percepção de que o tema desta edição ficou "solto"/genérico. No conjunto, é um evento consolidado e querido, cujas ressalvas são pontuais e ligadas a ajustes de formato, não à proposta em si.',
  notaPercebida: 'Muito alta — predomínio massivo de elogios ("tudo", "perfeito") e "nada a melhorar" como resposta mais comum; críticas construtivas, pontuais e concentradas em preço, duração e no tema solto desta edição.',
  pontosFortes: [
    'Variedade e quantidade de participantes — o público valoriza ter muitas docerias/cafés e combos diferentes espalhados pela cidade para escolher e "maratonar".',
    'Criatividade e originalidade dos combos — apontada como o coração do evento, com destaque para apresentações caprichadas e combinações inusitadas (Bolomania e Rollab citados como exemplos).',
    'Custo-benefício e preço acessível — o preço fixo permite experimentar várias delícias por valor justo, ampliando o acesso à alta confeitaria.',
    'Temática e imersão — o público adora quando a loja incorpora o tema com decoração, música e ambientação, transformando o combo em experiência (cenários "instagramáveis").',
    'Descobrir lugares novos — o evento funciona como roteiro/passeio: conhecer cafeterias e docerias inéditas é um valor recorrente.',
    'Qualidade da comida e do atendimento — doces e salgados descritos como deliciosos, com elogios à simpatia, rapidez e organização das melhores lojas.',
    'O ritual do mapa/cartela de carimbos — celebrado como divertido e um estímulo a visitar mais estabelecimentos.',
  ],
  pontosMelhorar: [
    'Preço — a crítica concreta mais recorrente; muitos acham os combos cada vez mais caros a cada edição e pedem valores mais acessíveis.',
    'Duração/dias — queixa muito frequente de que 10 dias é pouco; o pedido predominante é estender para 15 dias ou o mês inteiro.',
    'Tema "solto"/genérico — grande volume de comentários de que o tema livre ficou confuso e sem unidade; parte do público prefere um tema único e direcionado.',
    'Filas, lotação e combos esgotados — relatos de espera longa e de combos que acabam cedo por falta de preparo das lojas para a demanda.',
    'Falta de criatividade e padronização entre lojas — alguns combos vistos como "mais do mesmo" (coxinha + bolo); pedem curadoria para nivelar qualidade.',
    'Opções para restrições alimentares — pedidos por mais alternativas vegetarianas, veganas, sem glúten e sem lactose, e mais variedade de bebidas.',
    'Distribuição geográfica — concentração na Zona Sul; demanda por mais participantes na Zona Norte, Parnamirim e São Gonçalo, e divulgação com mais antecedência.',
  ],
  temas: [
    'Cultura pop e audiovisual (os mais pedidos): novelas, séries, filmes, Disney, animes, musicais, Alice no País das Maravilhas, Barbie — desejo de temas narrativos e nostálgicos com cenários fotografáveis.',
    'Brasilidade e regionalismo: São João, folclore brasileiro, Nordeste, estados do Brasil, MPB — apego à identidade local e a temáticas afetivas.',
    'Nostalgia e décadas: anos 90, anos 2000, infância — o público quer reviver memórias, casando bem com combos comemorativos.',
    'Entretenimento e hobbies: jogos/games, esportes, Copa do Mundo, livros, bandas de rock — universos com fãs engajados que geram identificação.',
    'Mundo e viagens: países, viagens — apetite por "turismo gastronômico" temático.',
    'Conceituais e sazonais: Halloween, dia dos namorados, estações do ano, cores — temas-curinga flexíveis, que ainda assim pedem um fio condutor único.',
  ],
  conclusao: 'Para a próxima edição, preservar o que já encanta — variedade, criatividade, custo-benefício e o ritual do mapa — enquanto se atacam três frentes claras: definir um tema único e marcante (cultura pop/audiovisual e brasilidades são os caminhos mais pedidos), estender a duração para cerca de 15 dias e conter a alta de preços com valor percebido coerente. Vale criar uma curadoria mínima de criatividade e padrão entre as lojas, garantir estoque para a demanda (evitando combos esgotados e filas) e ampliar a inclusão — mais opções vegetarianas, veganas e sem glúten e maior distribuição geográfica (Zona Norte, Parnamirim, São Gonçalo).',
}

export function PainelPage() {
  const [secret, setSecret] = React.useState(() => {
    try { return window.sessionStorage.getItem(SS_KEY) || '' } catch { return '' }
  })
  const [authed, setAuthed] = React.useState(false)
  const [checking, setChecking] = React.useState(false)
  const [pwd, setPwd] = React.useState('')
  const [err, setErr] = React.useState('')

  // Revalida a senha guardada na carga.
  React.useEffect(() => {
    if (!secret) return
    setChecking(true)
    supabase.rpc('admin_ping', { p_secret: secret }).then(({ data }) => {
      setAuthed(data === true)
      if (data !== true) { try { window.sessionStorage.removeItem(SS_KEY) } catch {} }
      setChecking(false)
    }).catch(() => setChecking(false))
  }, []) // eslint-disable-line

  async function login(e) {
    e && e.preventDefault()
    setErr(''); setChecking(true)
    const { data, error } = await supabase.rpc('admin_ping', { p_secret: pwd })
    setChecking(false)
    if (error) { setErr('Erro ao validar. Tente novamente.'); return }
    if (data === true) {
      setSecret(pwd); setAuthed(true)
      try { window.sessionStorage.setItem(SS_KEY, pwd) } catch {}
    } else {
      setErr('Senha incorreta.')
    }
  }

  function logout() {
    setAuthed(false); setSecret(''); setPwd('')
    try { window.sessionStorage.removeItem(SS_KEY) } catch {}
  }

  if (!authed) {
    return (
      <div className="kv-lovers lovers-gradient-bg" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <form onSubmit={login} style={{ ...card, width: 'min(100%, 380px)', textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 6px', fontFamily: 'var(--font-lovers-display)', color: 'var(--lovers-burgundy)', textTransform: 'uppercase' }}>Painel Sweet Awards</h1>
          <p style={{ margin: '0 0 16px', color: 'var(--lovers-brown)', fontSize: 14 }}>Área restrita. Informe a senha.</p>
          <input
            type="password" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="Senha do painel"
            autoFocus
            style={{ width: '100%', padding: '13px 15px', borderRadius: 12, border: '1.5px solid rgba(135,14,45,.2)', background: 'var(--lovers-cream)', fontSize: 16, marginBottom: 12 }}
          />
          {err && <p style={{ color: 'var(--lovers-red)', fontSize: 13, margin: '0 0 12px' }}>{err}</p>}
          <button type="submit" disabled={checking || !pwd} className="lovers-button lovers-button--primary" style={{ width: '100%', justifyContent: 'center' }}>
            {checking ? 'Verificando…' : 'Entrar'}
          </button>
        </form>
      </div>
    )
  }

  return <PainelDados secret={secret} onLogout={logout} />
}

function PainelDados({ secret, onLogout }) {
  const [tab, setTab] = React.useState('geral')
  return (
    <div className="kv-lovers lovers-gradient-bg" style={{ minHeight: '100vh', padding: '24px 16px 80px' }}>
      <div style={{ maxWidth: 'min(1760px, 96vw)', margin: '0 auto', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-lovers-display)', color: 'var(--lovers-burgundy)', textTransform: 'uppercase' }}>Painel Sweet Awards</h1>
          <button onClick={onLogout} className="lovers-button lovers-button--secondary">Sair</button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          {[['geral', 'Visão Geral', '📊'], ['resultados', 'Resultados', '🏆'], ['auditoria', 'Auditoria', '📋'], ['pesquisa', 'Pesquisa', '💬'], ['suspeitos', 'Suspeitos', '⚠️']].map(([k, l, ic]) => (
            <button key={k} onClick={() => setTab(k)}
              className={'lovers-button ' + (tab === k ? 'lovers-button--primary' : 'lovers-button--secondary')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <span aria-hidden="true" style={{ fontSize: 16 }}>{ic}</span> {l}
            </button>
          ))}
        </div>
        {tab === 'geral' && <Geral secret={secret} />}
        {tab === 'resultados' && <Resultados secret={secret} />}
        {tab === 'auditoria' && <Auditoria secret={secret} />}
        {tab === 'pesquisa' && <Pesquisa secret={secret} />}
        {tab === 'suspeitos' && <Suspeitos secret={secret} />}
      </div>
    </div>
  )
}

// Wrapper de tabela larga: barra de rolagem horizontal no TOPO + embaixo, sincronizadas.
function ScrollX({ children, maxHeight }) {
  const topRef = React.useRef(null)
  const botRef = React.useRef(null)
  const [w, setW] = React.useState(0)
  React.useEffect(() => {
    const measure = () => setW(botRef.current ? botRef.current.scrollWidth : 0)
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    if (ro && botRef.current) ro.observe(botRef.current)
    window.addEventListener('resize', measure)
    return () => { if (ro) ro.disconnect(); window.removeEventListener('resize', measure) }
  }, [children])
  const syncFromTop = () => { if (botRef.current && topRef.current) botRef.current.scrollLeft = topRef.current.scrollLeft }
  const syncFromBot = () => { if (botRef.current && topRef.current) topRef.current.scrollLeft = botRef.current.scrollLeft }
  return (
    <>
      <div ref={topRef} onScroll={syncFromTop} style={{ overflowX: 'auto', overflowY: 'hidden' }} aria-hidden="true">
        <div style={{ width: w, height: 1 }} />
      </div>
      <div ref={botRef} onScroll={syncFromBot} style={{ overflowX: 'auto', overflowY: maxHeight ? 'auto' : 'visible', maxHeight: maxHeight || undefined }}>
        {children}
      </div>
    </>
  )
}

function useRpc(fn, secret) {
  const [state, setState] = React.useState({ loading: true, rows: [], error: '' })
  React.useEffect(() => {
    let alive = true
    setState({ loading: true, rows: [], error: '' })
    supabase.rpc(fn, { p_secret: secret }).then(({ data, error }) => {
      if (!alive) return
      if (error) setState({ loading: false, rows: [], error: error.message || 'Erro' })
      else setState({ loading: false, rows: data || [], error: '' })
    })
    return () => { alive = false }
  }, [fn, secret])
  return state
}

// Busca TODOS os registros de uma RPC set-returning, contornando o limite de 1000
// linhas do PostgREST: lê em blocos de 1000 via .range() até esgotar. Somente leitura.
function useRpcAll(fn, secret, pageSize = 1000) {
  const [state, setState] = React.useState({ loading: true, rows: [], error: '' })
  React.useEffect(() => {
    let alive = true
    setState({ loading: true, rows: [], error: '' })
    ;(async () => {
      let all = [], from = 0
      while (true) {
        const { data, error } = await supabase.rpc(fn, { p_secret: secret }).range(from, from + pageSize - 1)
        if (error) { if (alive) setState({ loading: false, rows: [], error: error.message || 'Erro' }); return }
        all = all.concat(data || [])
        if (!data || data.length < pageSize) break
        from += pageSize
      }
      if (alive) setState({ loading: false, rows: all, error: '' })
    })()
    return () => { alive = false }
  }, [fn, secret, pageSize])
  return state
}

// Painel único: empilha todas as seções (somente leitura) num só lugar.
function Geral({ secret }) {
  const sec = { marginBottom: 28 }
  const h = {
    margin: '0 0 12px', fontFamily: 'var(--font-lovers-display)',
    color: 'var(--lovers-burgundy)', textTransform: 'uppercase',
    fontSize: 22, borderBottom: '2px solid rgba(135,14,45,.12)', paddingBottom: 6,
  }
  return (
    <>
      <section style={sec}><h2 style={h}>📋 Auditoria (votos + respostas da pesquisa)</h2><Auditoria secret={secret} maxHeight={480} /></section>
      <section style={sec}><h2 style={h}>⚠️ Suspeitos</h2><Suspeitos secret={secret} /></section>
    </>
  )
}

function Resultados({ secret }) {
  return (
    <>
      <Rankings secret={secret} />
      <ResumoPesquisa secret={secret} />
    </>
  )
}

function Rankings({ secret }) {
  const { loading, rows, error } = useRpc('get_rankings_admin', secret)
  if (loading) return <p style={{ color: 'var(--lovers-brown)' }}>Carregando…</p>
  if (error) return <p style={{ color: 'var(--lovers-red)' }}>{error}</p>
  if (!rows.length) return <p style={{ color: 'var(--lovers-brown)' }}>Ainda não há votos para calcular o ranking.</p>
  const byCat = {}
  rows.forEach(r => { (byCat[r.categoria] = byCat[r.categoria] || []).push(r) })
  const medal = ['🥇', '🥈', '🥉']
  const cats = [{ key: 'melhor_combo', label: 'Melhor Combo (média Doce + Salgado + Bebida)' }, ...AWARDS_CATEGORIES.map(c => ({ key: c.key, label: c.label }))]
  const totalAval = rows.reduce((s, r) => s + (Number(r.avaliacoes) || 0), 0)
  return (
    <>
      <p style={{ color: 'var(--lovers-brown)', fontSize: 15, marginTop: 0 }}>
        Prévia do ranking (médias). Não depende de publicar o resultado no site. · {totalAval} avaliações somadas.
      </p>
      {cats.map(c => {
        const list = (byCat[c.key] || []).slice().sort((a, b) => a.posicao - b.posicao)
        if (!list.length) return null
        return (
          <div style={card} key={c.key}>
            <h2 style={{ margin: '0 0 14px', fontSize: 20, color: 'var(--lovers-burgundy)' }}>{c.label}</h2>
            {list.map(r => {
              const media = Number(r.media)
              const pct = Math.max(3, Math.min(100, (media / 10) * 100))
              const top = r.posicao <= 3
              return (
                <div key={r.posicao} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(135,14,45,.06)' }}>
                  <span style={{ width: 34, textAlign: 'center', fontSize: top ? 22 : 15, fontWeight: 700, color: 'var(--lovers-brown)' }}>{medal[r.posicao - 1] || r.posicao}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
                      <strong style={{ color: 'var(--lovers-burgundy)', fontSize: 16.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{partName(r.participante_slug)}</strong>
                      <span style={{ color: 'var(--lovers-brown)', fontSize: 14.5, whiteSpace: 'nowrap' }}><strong style={{ fontSize: 19, color: 'var(--lovers-burgundy)' }}>{media.toFixed(2)}</strong> · {r.avaliacoes} aval.</span>
                    </div>
                    <div style={{ height: 9, background: 'rgba(135,14,45,.08)', borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 6, background: top ? 'linear-gradient(90deg, var(--lovers-pink, #e75480), var(--lovers-red))' : 'var(--lovers-purple)' }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </>
  )
}

// Resumo da pesquisa: análise qualitativa (texto da AI_PESQUISA), não contagem de palavras.
function ResumoPesquisa() {
  const A = AI_PESQUISA
  const colCard = { ...card, flex: '1 1 320px', minWidth: 280, marginBottom: 0 }
  const li = { marginBottom: 12, fontSize: 16, lineHeight: 1.65, color: 'var(--lovers-ink, #3a1d12)' }
  const h3 = { margin: '0 0 12px', fontSize: 20, color: 'var(--lovers-burgundy)' }
  const par = { margin: 0, fontSize: 17, lineHeight: 1.7, color: 'var(--lovers-ink, #3a1d12)' }
  return (
    <div style={{ marginTop: 18 }}>
      <h2 style={{ fontFamily: 'var(--font-lovers-display)', color: 'var(--lovers-burgundy)', textTransform: 'uppercase', fontSize: 27, margin: '0 0 4px' }}>Resumo da Pesquisa — Análise</h2>
      <p style={{ color: 'var(--lovers-brown)', fontSize: 14.5, marginTop: 0, marginBottom: 16 }}>
        Síntese qualitativa das respostas abertas (gostou · melhorar · temas). Análise de {A.data} · {A.nRespostas} respostas.
      </p>

      <div style={card}>
        <h3 style={h3}>📊 Avaliação geral</h3>
        <p style={par}>{A.avaliacaoGeral}</p>
        <p style={{ margin: '14px 0 0', fontSize: 16, lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--lovers-burgundy)' }}>Satisfação percebida:</strong>{' '}
          <span style={{ color: 'var(--lovers-ink, #3a1d12)' }}>{A.notaPercebida}</span>
        </p>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={colCard}>
          <h3 style={h3}>💛 Pontos fortes</h3>
          <ul style={{ margin: 0, paddingLeft: 18 }}>{A.pontosFortes.map((x, i) => <li key={i} style={li}>{x}</li>)}</ul>
        </div>
        <div style={colCard}>
          <h3 style={h3}>🔧 Pontos a melhorar</h3>
          <ul style={{ margin: 0, paddingLeft: 18 }}>{A.pontosMelhorar.map((x, i) => <li key={i} style={li}>{x}</li>)}</ul>
        </div>
      </div>

      <div style={{ ...card, marginTop: 16 }}>
        <h3 style={h3}>🎨 Temas mais sugeridos (próxima edição)</h3>
        <ul style={{ margin: 0, paddingLeft: 18 }}>{A.temas.map((x, i) => <li key={i} style={li}>{x}</li>)}</ul>
      </div>

      <div style={card}>
        <h3 style={h3}>✅ Conclusão &amp; recomendações</h3>
        <p style={par}>{A.conclusao}</p>
      </div>
    </div>
  )
}

const PER_PAGE = 300

function Pager({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null
  const btn = (p, label, active) => (
    <button key={label ?? p} onClick={() => onPage(p)}
      className={'lovers-button ' + (active ? 'lovers-button--primary' : 'lovers-button--secondary')}
      style={{ minWidth: 40, padding: '6px 10px', justifyContent: 'center' }}>
      {label ?? p}
    </button>
  )
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 14 }}>
      {Array.from({ length: totalPages }, (_, i) => btn(i + 1, undefined, page === i + 1))}
    </div>
  )
}

function Auditoria({ secret, maxHeight }) {
  const { loading, rows, error } = useRpcAll('get_audit_report', secret)
  const fb = useRpcAll('get_feedback_admin', secret) // pesquisa, p/ juntar às notas por e-mail
  const [page, setPage] = React.useState(1)
  const [sort, setSort] = React.useState('participante') // 'participante' | 'data_desc' | 'data_asc'
  if (loading || fb.loading) return <p style={{ color: 'var(--lovers-brown)' }}>Carregando…</p>
  if (error) return <p style={{ color: 'var(--lovers-red)' }}>{error}</p>
  if (!rows.length) return <p style={{ color: 'var(--lovers-brown)' }}>Nenhum voto registrado ainda.</p>
  // Mapa e-mail → resposta da pesquisa (1 por pessoa). Repete nas linhas de quem votou em várias lojas.
  const fbByEmail = {}
  ;(fb.rows || []).forEach(f => { if (f.email) fbByEmail[String(f.email).toLowerCase()] = f })
  const fbOf = (r) => fbByEmail[String(r.email || '').toLowerCase()] || {}
  const fbCols = ['gostou', 'melhorar', 'sugestao_tema']
  const cols = ['created_at', 'participante_slug', 'nome', 'email', 'telefone', 'instagram', 'genero', 'faixa_etaria', 'escolaridade', 'aceita_comunicacao',
    'nota_atendimento', 'nota_criatividade', 'nota_apresentacao', 'nota_doce', 'nota_salgado', 'nota_bebida', 'nota_encantamento', ...fbCols]
  const tdWrap = { ...td, whiteSpace: 'normal', minWidth: 200, maxWidth: 340 }
  const ts = (r) => { const t = new Date(r.created_at).getTime(); return isNaN(t) ? 0 : t }
  const sorted = rows.slice().sort((a, b) =>
    sort === 'data_desc' ? ts(b) - ts(a)
    : sort === 'data_asc' ? ts(a) - ts(b)
    : (partName(a.participante_slug).localeCompare(partName(b.participante_slug), 'pt-BR') || ts(a) - ts(b)))
  const rowsCsv = sorted.map(r => { const f = fbOf(r); return { ...r, gostou: f.gostou ?? '', melhorar: f.melhorar ?? '', sugestao_tema: f.sugestao_tema ?? '' } })
  const totalPages = Math.ceil(sorted.length / PER_PAGE)
  const cur = Math.min(page, totalPages)
  const start = (cur - 1) * PER_PAGE
  const slice = sorted.slice(start, start + PER_PAGE)
  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        <strong style={{ color: 'var(--lovers-burgundy)' }}>
          {rows.length} voto(s) · página {cur} de {totalPages} (mostrando {start + 1}–{start + slice.length})
        </strong>
        <button className="lovers-button lovers-button--secondary" onClick={() => download('sweet-awards-votos.csv', toCsv(rowsCsv))}>Exportar CSV (todos)</button>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: 'var(--lovers-brown)' }}>Ordenar:</span>
        {[['participante', 'Participante (A–Z)'], ['data_desc', 'Data (recentes)'], ['data_asc', 'Data (antigos)']].map(([k, l]) => (
          <button key={k} onClick={() => { setSort(k); setPage(1) }}
            className={'lovers-button ' + (sort === k ? 'lovers-button--primary' : 'lovers-button--secondary')}
            style={{ padding: '6px 12px', fontSize: 13 }}>{l}</button>
        ))}
      </div>
      <ScrollX maxHeight={maxHeight}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{cols.map(c => <th key={c} style={th}>{c}</th>)}</tr></thead>
          <tbody>
            {slice.map((r, i) => (
              <tr key={r.id || start + i}>
                {cols.map(c => fbCols.includes(c)
                  ? <td key={c} style={tdWrap}>{String(fbOf(r)[c] ?? '')}</td>
                  : <td key={c} style={td}>{c === 'participante_slug' ? partName(r[c]) : c === 'created_at' ? new Date(r[c]).toLocaleString('pt-BR') : String(r[c] ?? '')}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollX>
      <Pager page={cur} totalPages={totalPages} onPage={setPage} />
    </div>
  )
}

function Pesquisa({ secret, maxHeight }) {
  const { loading, rows, error } = useRpc('get_feedback_admin', secret)
  if (loading) return <p style={{ color: 'var(--lovers-brown)' }}>Carregando…</p>
  if (error) return <p style={{ color: 'var(--lovers-red)' }}>{error}</p>
  if (!rows.length) return <p style={{ color: 'var(--lovers-brown)' }}>Nenhuma resposta de pesquisa ainda.</p>
  const tdWrap = { ...td, whiteSpace: 'normal', minWidth: 220, maxWidth: 360 }
  const partsLabel = (r) => (r.participantes || []).map(partName).join(', ')
  const csvRows = rows.map(r => ({
    created_at: r.created_at, nome: r.nome, email: r.email,
    participantes: partsLabel(r), gostou: r.gostou, melhorar: r.melhorar, sugestao_tema: r.sugestao_tema,
  }))
  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        <strong style={{ color: 'var(--lovers-burgundy)' }}>{rows.length} resposta(s) de pesquisa</strong>
        <button className="lovers-button lovers-button--secondary" onClick={() => download('sweet-awards-pesquisa.csv', toCsv(csvRows))}>Exportar CSV</button>
      </div>
      <ScrollX maxHeight={maxHeight}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={th}>created_at</th><th style={th}>nome</th><th style={th}>email</th><th style={th}>participante(s)</th>
            <th style={th}>gostou</th><th style={th}>melhorar</th><th style={th}>sugestao_tema</th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.email || i}>
                <td style={td}>{r.created_at ? new Date(r.created_at).toLocaleString('pt-BR') : ''}</td>
                <td style={td}>{String(r.nome ?? '')}</td>
                <td style={td}>{String(r.email ?? '')}</td>
                <td style={tdWrap}>{partsLabel(r)}</td>
                <td style={tdWrap}>{String(r.gostou ?? '')}</td>
                <td style={tdWrap}>{String(r.melhorar ?? '')}</td>
                <td style={tdWrap}>{String(r.sugestao_tema ?? '')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollX>
    </div>
  )
}

function Suspeitos({ secret }) {
  const { loading, rows, error } = useRpc('get_suspicious_votes', secret)
  if (loading) return <p style={{ color: 'var(--lovers-brown)' }}>Analisando…</p>
  if (error) return <p style={{ color: 'var(--lovers-red)' }}>{error}</p>
  if (!rows.length) return <p style={{ color: 'var(--lovers-brown)' }}>Nenhum padrão suspeito encontrado. 🎉</p>
  const byTipo = {}
  rows.forEach(r => { (byTipo[r.tipo] = byTipo[r.tipo] || []).push(r) })
  return (
    <>
      <p style={{ color: 'var(--lovers-brown)', fontSize: 14, marginTop: 0 }}>
        Sinais para auditoria manual — não bloqueiam votos automaticamente.
      </p>
      {Object.keys(byTipo).map(tipo => (
        <div style={card} key={tipo}>
          <h2 style={{ margin: '0 0 12px', fontSize: 17, color: 'var(--lovers-red)' }}>
            {SUSPEITO_LABEL[tipo] || tipo} <span style={{ color: 'var(--lovers-brown)', fontWeight: 400 }}>({byTipo[tipo].length})</span>
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Chave</th><th style={th}>Qtd</th><th style={th}>Detalhe</th></tr></thead>
            <tbody>
              {byTipo[tipo].map((r, i) => (
                <tr key={i}>
                  <td style={td}>{r.chave}</td>
                  <td style={td}><strong>{r.qtd}</strong></td>
                  <td style={{ ...td, whiteSpace: 'normal' }}>{r.detalhe}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </>
  )
}
