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
const th = { textAlign: 'left', padding: '10px 12px', fontSize: 14, color: 'var(--lovers-burgundy)', borderBottom: '2px solid rgba(135,14,45,.15)', whiteSpace: 'nowrap' }
const td = { padding: '11px 12px', fontSize: 14.5, lineHeight: 1.5, borderBottom: '1px solid rgba(135,14,45,.08)', whiteSpace: 'nowrap' }

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
      <div style={{ maxWidth: 'min(1760px, 96vw)', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-lovers-display)', color: 'var(--lovers-burgundy)', textTransform: 'uppercase' }}>Painel Sweet Awards</h1>
          <button onClick={onLogout} className="lovers-button lovers-button--secondary">Sair</button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          {[['geral', 'Visão Geral'], ['resultados', 'Resultados'], ['auditoria', 'Auditoria'], ['pesquisa', 'Pesquisa'], ['suspeitos', 'Suspeitos']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={'lovers-button ' + (tab === k ? 'lovers-button--primary' : 'lovers-button--secondary')}>
              {l}
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
      <section style={sec}><h2 style={h}>📋 Auditoria (todos os votos)</h2><Auditoria secret={secret} maxHeight={480} /></section>
      <section style={sec}><h2 style={h}>💬 Pesquisa</h2><Pesquisa secret={secret} maxHeight={480} /></section>
      <section style={sec}><h2 style={h}>⚠️ Suspeitos</h2><Suspeitos secret={secret} /></section>
    </>
  )
}

function Resultados({ secret }) {
  const { loading, rows, error } = useRpc('get_rankings_admin', secret)
  if (loading) return <p style={{ color: 'var(--lovers-brown)' }}>Carregando…</p>
  if (error) return <p style={{ color: 'var(--lovers-red)' }}>{error}</p>
  if (!rows.length) return <p style={{ color: 'var(--lovers-brown)' }}>Ainda não há votos para calcular o ranking.</p>
  const byCat = {}
  rows.forEach(r => { (byCat[r.categoria] = byCat[r.categoria] || []).push(r) })
  const medal = ['🥇', '🥈', '🥉']
  return (
    <>
      <p style={{ color: 'var(--lovers-brown)', fontSize: 14, marginTop: 0 }}>
        Prévia do ranking (calculado das médias). Não depende de publicar o resultado no site.
      </p>
      {[{ key: 'melhor_combo', label: 'Melhor Combo (média Doce + Salgado + Bebida)' }, ...AWARDS_CATEGORIES.map(c => ({ key: c.key, label: c.label }))].map(c => {
        const list = byCat[c.key] || []
        if (!list.length) return null
        return (
          <div style={card} key={c.key}>
            <h2 style={{ margin: '0 0 12px', fontSize: 18, color: 'var(--lovers-burgundy)' }}>{c.label}</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>#</th><th style={th}>Participante</th><th style={th}>Média</th><th style={th}>Avaliações</th></tr></thead>
              <tbody>
                {list.slice().sort((a, b) => a.posicao - b.posicao).map(r => (
                  <tr key={r.posicao}>
                    <td style={td}>{medal[r.posicao - 1] || r.posicao}</td>
                    <td style={td}>{partName(r.participante_slug)}</td>
                    <td style={td}><strong>{Number(r.media).toFixed(2)}</strong></td>
                    <td style={td}>{r.avaliacoes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </>
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
  const rowsCsv = rows.map(r => { const f = fbOf(r); return { ...r, gostou: f.gostou ?? '', melhorar: f.melhorar ?? '', sugestao_tema: f.sugestao_tema ?? '' } })
  const totalPages = Math.ceil(rows.length / PER_PAGE)
  const cur = Math.min(page, totalPages)
  const start = (cur - 1) * PER_PAGE
  const slice = rows.slice(start, start + PER_PAGE)
  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        <strong style={{ color: 'var(--lovers-burgundy)' }}>
          {rows.length} voto(s) · página {cur} de {totalPages} (mostrando {start + 1}–{start + slice.length})
        </strong>
        <button className="lovers-button lovers-button--secondary" onClick={() => download('sweet-awards-votos.csv', toCsv(rowsCsv))}>Exportar CSV (todos)</button>
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
