import React from 'react'
import { supabase } from '../../lib/supabase'
import { PESQUISA_SECOES } from '../../data/pesquisaLovers'

const SS_KEY = 'sweet-admin-secret' // mesma chave do painel de votação

// ── helpers ──────────────────────────────────────────────────────────────────

const Q_LABELS = Object.fromEntries(
  PESQUISA_SECOES.flatMap(s => s.perguntas).map(q => [q.id, q.label])
)

function fmtVal(v) {
  if (v == null) return '—'
  if (Array.isArray(v)) return v.join(', ')
  return String(v)
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function toCsv(rows) {
  if (!rows.length) return ''
  const flat = rows.map(r => {
    const obj = {
      id: r.id,
      data: fmtDate(r.created_at),
      email: r.email || '',
      nome: r.nome || '',
    }
    if (r.respostas) {
      for (const [k, v] of Object.entries(r.respostas)) {
        obj[k] = Array.isArray(v) ? v.join(' | ') : String(v || '')
      }
    }
    return obj
  })
  const cols = Object.keys(flat[0])
  const esc = v => { const s = v == null ? '' : String(v); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }
  return cols.join(';') + '\n' + flat.map(r => cols.map(c => esc(r[c])).join(';')).join('\n')
}

function download(name, text) {
  const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = name; a.click()
  URL.revokeObjectURL(url)
}

// ── estilos ───────────────────────────────────────────────────────────────────

const S = {
  page:   { background: '#FFF4EC', minHeight: '100vh' },
  wrap:   { maxWidth: 1080, margin: '0 auto', padding: 'clamp(28px,5vw,48px) 20px 80px', fontFamily: "var(--font-sans,'nexa-text',system-ui,sans-serif)", color: '#2B1810' },
  h1:     { fontFamily: "var(--font-slab,'Nexa Slab',Georgia,serif)", fontSize: 28, color: '#2B1810', margin: '0 0 2px', fontWeight: 700 },
  sub:    { fontSize: 13, color: '#9B7A68', margin: '0 0 32px', letterSpacing: '.02em' },
  tabs:   { display: 'flex', gap: 0, borderBottom: '2px solid #F2B6A0', marginBottom: 28 },
  tab:    a => ({ padding: '10px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer', border: 0, background: 'transparent', color: a ? '#E8553A' : '#9B7A68', borderBottom: a ? '2px solid #E8553A' : '2px solid transparent', marginBottom: -2 }),
  card:   { background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(43,24,16,.08)', marginBottom: 16 },
  btn:    { background: '#E8553A', color: '#fff', border: 0, borderRadius: 999, padding: '10px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' },
  ghost:  { background: 'transparent', color: '#6B4A3A', border: '1.5px solid #F2B6A0', borderRadius: 999, padding: '9px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' },
  stat:   { fontFamily: "var(--font-slab,'Nexa Slab',Georgia,serif)", fontSize: 40, color: '#E8553A', fontWeight: 700, lineHeight: 1 },
  table:  { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th:     { textAlign: 'left', padding: '10px 12px', fontWeight: 700, color: '#2B1810', borderBottom: '2px solid #F2B6A0', whiteSpace: 'nowrap', background: '#FFF4EC' },
  td:     { padding: '10px 12px', borderBottom: '1px solid #FBEADC', verticalAlign: 'top', color: '#2B1810' },
  mono:   { fontFamily: 'monospace', fontSize: 12, color: '#6B4A3A', wordBreak: 'break-all', background: '#FFF4EC', border: '1px solid #F2B6A0', borderRadius: 10, padding: '12px 16px', margin: '12px 0 0' },
}

// ── Aba Formulários ───────────────────────────────────────────────────────────

const BREVO_LINK = 'https://www.sweetcoffeeweek.com.br/#/lovers/pesquisa?e={{contact.EMAIL}}&n={{contact.FIRSTNAME}}'

function AbaFormularios({ total, loading }) {
  const [copied, setCopied] = React.useState(false)
  const copy = () => {
    navigator.clipboard.writeText(BREVO_LINK).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    <div>
      {/* card pesquisa */}
      <div style={S.card}>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <div style={S.stat}>{loading ? '…' : total}</div>
            <div style={{ fontSize: 13, color: '#9B7A68', marginTop: 4 }}>respostas recebidas</div>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Pesquisa Sweet Lovers</div>
            <div style={{ fontSize: 13, color: '#9B7A68', marginBottom: 18 }}>
              3 seções · 8 perguntas · distribuída por e-mail via Brevo
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <button style={S.btn} onClick={copy}>{copied ? '✓ Copiado!' : 'Copiar link Brevo'}</button>
              <a
                href="#/lovers/pesquisa?e=preview@admin.com&n=Preview"
                target="_blank" rel="noreferrer"
                style={S.ghost}
              >
                Pré-visualizar
              </a>
            </div>
          </div>
        </div>
        <div style={S.mono}>{BREVO_LINK}</div>
      </div>

      {/* nota de setup */}
      <div style={{ ...S.card, background: '#FFF4EC', boxShadow: 'none', border: '1px dashed #F2B6A0', fontSize: 13, color: '#6B4A3A', lineHeight: 1.65 }}>
        <strong style={{ color: '#2B1810' }}>Checklist Brevo</strong>
        <ol style={{ margin: '8px 0 0', paddingLeft: 20 }}>
          <li>Criar API key em <em>Brevo → Account → API Keys</em></li>
          <li>Criar lista de contatos e anotar o ID</li>
          <li>Rodar edge function <code>sync-brevo-contacts</code> para importar e-mails</li>
          <li>Nova campanha → Design HTML → colar <code>emails/pesquisa-sweet-lovers.html</code></li>
          <li>Assunto: <em>Ei, {'{{contact.FIRSTNAME}}'}! A gente quer te ouvir 🍫</em></li>
        </ol>
      </div>
    </div>
  )
}

// ── Aba Respostas ─────────────────────────────────────────────────────────────

function AbaRespostas({ rows, loading }) {
  const [exp, setExp] = React.useState(null)

  if (loading) return <p style={{ color: '#9B7A68', padding: '20px 0' }}>Carregando respostas…</p>
  if (!rows.length) return (
    <div style={{ ...S.card, textAlign: 'center', color: '#9B7A68', padding: '48px 24px' }}>
      Nenhuma resposta ainda. Compartilhe o link via Brevo para começar a coletar.
    </div>
  )

  const exportar = () =>
    download(`pesquisa-sweet-lovers-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <span style={{ fontSize: 14, color: '#6B4A3A' }}>{rows.length} resposta{rows.length !== 1 ? 's' : ''}</span>
        <button style={S.btn} onClick={exportar}>Exportar CSV</button>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: 16, boxShadow: '0 1px 4px rgba(43,24,16,.08)' }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Data</th>
              <th style={S.th}>E-mail</th>
              <th style={S.th}>Frequência cafeteria</th>
              <th style={S.th}>Canal preferido</th>
              <th style={{ ...S.th, width: 100 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <React.Fragment key={r.id}>
                <tr style={{ background: exp === r.id ? '#FFF4EC' : '#fff' }}>
                  <td style={S.td}>{fmtDate(r.created_at)}</td>
                  <td style={{ ...S.td, color: r.email ? '#2B1810' : '#9B7A68' }}>
                    {r.email || 'anônimo'}
                  </td>
                  <td style={S.td}>{fmtVal(r.respostas?.q10)}</td>
                  <td style={S.td}>{fmtVal(r.respostas?.q14)}</td>
                  <td style={{ ...S.td, textAlign: 'right' }}>
                    <button
                      style={{ ...S.ghost, padding: '4px 14px', fontSize: 12 }}
                      onClick={() => setExp(exp === r.id ? null : r.id)}
                    >
                      {exp === r.id ? 'Fechar' : 'Ver tudo'}
                    </button>
                  </td>
                </tr>

                {exp === r.id && (
                  <tr>
                    <td colSpan={5} style={{ ...S.td, background: '#FFF4EC', padding: '16px 20px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '14px 20px' }}>
                        {r.respostas && Object.entries(r.respostas)
                          .filter(([k]) => !k.endsWith('_outro'))
                          .map(([k, v]) => (
                            <div key={k}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#9B7A68', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>
                                {(Q_LABELS[k] || k).slice(0, 58)}{(Q_LABELS[k] || k).length > 58 ? '…' : ''}
                              </div>
                              <div style={{ fontSize: 14, color: '#2B1810' }}>{fmtVal(v)}</div>
                              {r.respostas[k + '_outro'] && (
                                <div style={{ fontSize: 13, color: '#6B4A3A', fontStyle: 'italic', marginTop: 2 }}>
                                  + {r.respostas[k + '_outro']}
                                </div>
                              )}
                            </div>
                          ))}
                        {r.nome && (
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#9B7A68', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Nome</div>
                            <div style={{ fontSize: 14 }}>{r.nome}</div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Gate de senha ─────────────────────────────────────────────────────────────

function PasswordGate({ onAuth }) {
  const [pw, setPw] = React.useState('')
  const [erro, setErro] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  const entrar = async e => {
    e.preventDefault()
    setErro(''); setBusy(true)
    try {
      const { data, error } = await supabase.rpc('admin_ping', { p_secret: pw })
      if (error || data !== true) throw new Error()
      try { sessionStorage.setItem(SS_KEY, pw) } catch {}
      onAuth(pw)
    } catch {
      setErro('Senha incorreta.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFF4EC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
      <form onSubmit={entrar} style={{ background: '#fff', borderRadius: 20, padding: '40px 36px', boxShadow: '0 4px 20px rgba(43,24,16,.1)', width: '100%', maxWidth: 320 }}>
        <h1 style={{ fontFamily: "var(--font-slab,'Nexa Slab',Georgia,serif)", fontSize: 24, color: '#2B1810', margin: '0 0 4px' }}>
          Painel Admin
        </h1>
        <p style={{ fontSize: 13, color: '#9B7A68', margin: '0 0 24px' }}>Sweet &amp; Coffee Week · área restrita</p>
        <input
          type="password" value={pw} onChange={e => setPw(e.target.value)}
          placeholder="Senha"
          style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #F2B6A0', borderRadius: 10, fontSize: 15, color: '#2B1810', background: '#FFF4EC', boxSizing: 'border-box', outline: 'none' }}
          autoFocus
        />
        {erro && <p style={{ color: '#C13E25', fontSize: 13, margin: '8px 0 0' }}>{erro}</p>}
        <button
          type="submit" disabled={busy}
          style={{ ...S.btn, width: '100%', padding: '13px', fontSize: 15, marginTop: 14, boxSizing: 'border-box', textAlign: 'center' }}
        >
          {busy ? 'Verificando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export function PainelAdminPage() {
  const [secret, setSecret] = React.useState(() => { try { return sessionStorage.getItem(SS_KEY) || '' } catch { return '' } })
  const [tab, setTab]       = React.useState('formularios')
  const [rows, setRows]     = React.useState([])
  const [loading, setLoading] = React.useState(false)
  const [erroLoad, setErroLoad] = React.useState('')

  // Revalida sessão salva + carrega respostas
  React.useEffect(() => {
    if (!secret) return
    setLoading(true); setErroLoad('')
    supabase.rpc('get_pesquisa_report', { p_secret: secret })
      .then(({ data, error }) => {
        if (error) throw error
        setRows(data || [])
      })
      .catch(() => {
        try { sessionStorage.removeItem(SS_KEY) } catch {}
        setSecret('')
        setErroLoad('Sessão expirada ou sem permissão.')
      })
      .finally(() => setLoading(false))
  }, [secret])

  if (!secret) return <PasswordGate onAuth={setSecret} />

  const logout = () => { try { sessionStorage.removeItem(SS_KEY) } catch {}; setSecret('') }

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 6 }}>
          <div>
            <h1 style={S.h1}>Painel Admin</h1>
            <p style={S.sub}>Sweet &amp; Coffee Week · área restrita</p>
          </div>
          <button style={{ ...S.ghost, fontSize: 13, padding: '7px 16px' }} onClick={logout}>Sair</button>
        </div>

        {erroLoad && <p style={{ color: '#C13E25', marginBottom: 16, fontSize: 14 }}>{erroLoad}</p>}

        {/* abas */}
        <div style={S.tabs} role="tablist">
          {[['formularios', 'Formulários'], ['respostas', 'Respostas']].map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              style={S.tab(tab === id)}
              onClick={() => setTab(id)}
            >
              {label}
              {id === 'respostas' && !loading && rows.length > 0 && (
                <span style={{ marginLeft: 8, background: '#E8553A', color: '#fff', borderRadius: 999, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>
                  {rows.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'formularios' && <AbaFormularios total={rows.length} loading={loading} />}
        {tab === 'respostas'   && <AbaRespostas rows={rows} loading={loading} />}
      </div>
    </div>
  )
}
