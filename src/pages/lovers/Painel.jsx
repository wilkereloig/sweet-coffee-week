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
const th = { textAlign: 'left', padding: '8px 10px', fontSize: 13, color: 'var(--lovers-burgundy)', borderBottom: '2px solid rgba(135,14,45,.15)', whiteSpace: 'nowrap' }
const td = { padding: '8px 10px', fontSize: 13, borderBottom: '1px solid rgba(135,14,45,.08)', whiteSpace: 'nowrap' }

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
  const [tab, setTab] = React.useState('resultados')
  return (
    <div className="kv-lovers lovers-gradient-bg" style={{ minHeight: '100vh', padding: '24px 16px 80px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-lovers-display)', color: 'var(--lovers-burgundy)', textTransform: 'uppercase' }}>Painel Sweet Awards</h1>
          <button onClick={onLogout} className="lovers-button lovers-button--secondary">Sair</button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          {[['resultados', 'Resultados'], ['auditoria', 'Auditoria'], ['suspeitos', 'Suspeitos']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={'lovers-button ' + (tab === k ? 'lovers-button--primary' : 'lovers-button--secondary')}>
              {l}
            </button>
          ))}
        </div>
        {tab === 'resultados' && <Resultados secret={secret} />}
        {tab === 'auditoria' && <Auditoria secret={secret} />}
        {tab === 'suspeitos' && <Suspeitos secret={secret} />}
      </div>
    </div>
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

function Auditoria({ secret }) {
  const { loading, rows, error } = useRpc('get_audit_report', secret)
  if (loading) return <p style={{ color: 'var(--lovers-brown)' }}>Carregando…</p>
  if (error) return <p style={{ color: 'var(--lovers-red)' }}>{error}</p>
  if (!rows.length) return <p style={{ color: 'var(--lovers-brown)' }}>Nenhum voto registrado ainda.</p>
  const cols = ['created_at', 'participante_slug', 'nome', 'email', 'telefone', 'instagram', 'genero', 'faixa_etaria', 'escolaridade', 'aceita_comunicacao',
    'nota_atendimento', 'nota_criatividade', 'nota_apresentacao', 'nota_doce', 'nota_salgado', 'nota_bebida', 'nota_encantamento']
  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        <strong style={{ color: 'var(--lovers-burgundy)' }}>{rows.length} voto(s)</strong>
        <button className="lovers-button lovers-button--secondary" onClick={() => download('sweet-awards-votos.csv', toCsv(rows))}>Exportar CSV</button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{cols.map(c => <th key={c} style={th}>{c}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id || i}>
                {cols.map(c => <td key={c} style={td}>{c === 'participante_slug' ? partName(r[c]) : c === 'created_at' ? new Date(r[c]).toLocaleString('pt-BR') : String(r[c] ?? '')}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
