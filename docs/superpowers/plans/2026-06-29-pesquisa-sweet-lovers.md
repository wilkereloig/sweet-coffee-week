# Pesquisa Sweet Lovers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar a "Pesquisa Sweet Lovers" como página branded no site, gravando respostas no Supabase, para ser disparada por campanha do Brevo à lista da votação Lovers.

**Architecture:** Página React data-driven (`#/lovers/pesquisa`, **KV atual do site** — sem `.kv-lovers`) que lê o e-mail do parâmetro `?e=` (merge tag do Brevo), valida as respostas no cliente e grava via RPC `submit_pesquisa` no Supabase do Sweet Awards (mesmo projeto/padrão da votação: RLS sem policy + função `security definer`). Leitura/export pelo dashboard Supabase via RPC admin `get_pesquisa_report`. Disparo da pesquisa: edge function `sync-brevo-contacts` empurra os e-mails da votação (tabela `votos`) para uma lista do Brevo via API; a campanha é montada/disparada no painel do Brevo.

**Tech Stack:** Vite + React 18 (JSX), hash router custom (`src/router.js`), `@supabase/supabase-js` (client em `src/lib/supabase.js`), SQL Postgres colado no SQL Editor do Supabase.

## Global Constraints

- Branch de trabalho: `dev/site-completo`. Nunca tocar `master`/produção, nunca `vercel --prod`, nunca merge sem autorização.
- Identidade visual = **KV atual do site** (institucional). Usar as CSS vars globais de `src/styles.css`: `--bg #FFF4EC`, `--bg-soft #FBEADC`, `--bg-card #FFFFFF`, `--ink #2B1810`, `--ink-soft #6B4A3A`, `--accent #E8553A` (terracota). Tipografia Instrument Serif (display) + DM Sans (corpo). **Sem** wrapper `.kv-lovers` nem paleta Lovers.
- Grafias oficiais: "Sweet & Coffee Week", "Sweet & Coffee Week Lovers". Nunca "Sweet Coffee Week"/"Sweet Coffee".
- Não alterar rotas/slugs congelados de QR (`#/lovers/combos/:slug`, `#/lovers/awards`). A rota nova `#/lovers/pesquisa` é aditiva.
- Usar `Edit` em arquivos existentes (não reescrever). Escopo mínimo.
- `schema.sql` é idempotente e colado manualmente no Supabase SQL Editor — não há CLI de migration. O passo de banco entrega o SQL; o Wilke roda no dashboard.
- Validação por task = `npm run build` verde + verificação no preview (não há unit-test runner no projeto).
- A publishable key do Supabase é pública por design; segurança vem de RLS + RPC. Não expor service-role no front.

---

## File Structure

- **Create** `src/data/pesquisaLovers.js` — fonte única das 15 perguntas (intro + 7 seções). Sem lógica.
- **Create** `src/pages/lovers/Pesquisa.jsx` — página da pesquisa: render data-driven, estado, validação, submit ao Supabase, tela de sucesso.
- **Create** `src/styles/pesquisa.css` — estilos da pesquisa (KV atual do site), importado pela página.
- **Modify** `src/App.jsx` — importar a página, isentar `/lovers/pesquisa` do redirect legacy e do modo Awards-only, adicionar rota+case.
- **Modify** `supabase/schema.sql` — append: tabela `pesquisa_lovers` + RPC `submit_pesquisa` (anon) + RPC `get_pesquisa_report` (admin).
- **Create** `supabase/functions/sync-brevo-contacts/index.ts` — edge function: lê e-mails distintos de `votos` e importa numa lista do Brevo via API (Task 6).

Fora de escopo (tarefa futura opcional): integrar a leitura no `src/pages/lovers/Painel.jsx`. v1 lê/exporta pelo dashboard Supabase.

---

### Task 1: Fonte de dados das perguntas

**Files:**
- Create: `src/data/pesquisaLovers.js`

**Interfaces:**
- Produces: `PESQUISA_INTRO` (`{ titulo: string, texto: string }`) e `PESQUISA_SECOES` (`Array<{ id: string, titulo: string, perguntas: Pergunta[] }>`), onde `Pergunta = { id: string, tipo: 'multi'|'single'|'texto', label: string, obrigatoria: boolean, max?: number, outro?: boolean, opcoes?: string[] }`.

- [ ] **Step 1: Criar o arquivo de dados com as 15 perguntas**

```js
// src/data/pesquisaLovers.js
// Fonte única da Pesquisa Sweet Lovers (réplica do Google Form).
// tipo: 'multi' (checkbox), 'single' (radio), 'texto' (campo livre).
// outro: true => acrescenta opção "Outro" com campo de texto.
// max: limite de seleções para 'multi'. obrigatoria: exige resposta.

export const PESQUISA_INTRO = {
  titulo: 'Pesquisa Sweet Lovers',
  texto:
    'Ei, Sweet Lover! Queremos te conhecer melhor e de quebra você concorre a brindes especiais do Sweet & Coffee Week. São só alguns minutinhos!',
}

export const PESQUISA_SECOES = [
  {
    id: 'lazer',
    titulo: 'Perfil de lazer',
    perguntas: [
      {
        id: 'q1', tipo: 'multi', obrigatoria: true, outro: true,
        label: 'Nos seus momentos livres, o que você mais curte fazer?',
        opcoes: [
          'Sair para comer ou tomar café', 'Ouvir música', 'Ir ao cinema ou teatro',
          'Passear ao ar livre (praia, parque ou praça)', 'Explorar shoppings e lojas',
          'Eventos culturais e festivais', 'Praticar esportes',
          'Ficar em casa (séries, jogos, livros)', 'Viajar e explorar lugares novos',
        ],
      },
      {
        id: 'q2', tipo: 'multi', obrigatoria: true, outro: true, max: 3,
        label: 'Quais desses lugares você frequenta? (escolha até 3)',
        opcoes: [
          'Cafeterias', 'Docerias e confeitarias', 'Restaurantes', 'Bares e pubs',
          'Praças ou Parques', 'Food parks e mercados gastronômicos', 'Praias e orla',
        ],
      },
    ],
  },
  {
    id: 'esportes',
    titulo: 'Esportes',
    perguntas: [
      {
        id: 'q3', tipo: 'single', obrigatoria: true,
        label: 'Você pratica algum esporte ou atividade física?',
        opcoes: ['Sim, regularmente', 'Sim, mas de vez em quando', 'Não pratico no momento'],
      },
      {
        id: 'q4', tipo: 'multi', obrigatoria: false, outro: true,
        label: 'Se sim, quais?',
        opcoes: [
          'Musculação e academia', 'Corrida e caminhada', 'Futebol e futsal',
          'Vôlei e beach vôlei', 'Natação', 'Yoga e pilates', 'Ciclismo',
          'Artes marciais e luta', 'Dança', 'Crossfit e funcional',
        ],
      },
    ],
  },
  {
    id: 'musica',
    titulo: 'Música',
    perguntas: [
      {
        id: 'q5', tipo: 'multi', obrigatoria: true, outro: true,
        label: 'Que estilo de música embala o seu dia a dia?',
        opcoes: [
          'Pop brasileiro', 'Sertanejo', 'MPB e Bossa Nova', 'Rock e Indie',
          'Eletrônico e Lo-fi', 'Forró e Baião', 'Internacional (Pop, R&B, K-pop)',
          'Jazz e Blues', 'Reggae e Soul',
        ],
      },
    ],
  },
  {
    id: 'gastronomia',
    titulo: 'Gastronomia',
    perguntas: [
      {
        id: 'q6', tipo: 'multi', obrigatoria: true, outro: true,
        label: 'Quando o assunto é salgado, o que você não resiste?',
        opcoes: [
          'Coxinha', 'Croissant e folhado', 'Pão de queijo', 'Tapioca salgada',
          'Sanduíche artesanal', 'Empada e esfiha', 'Quiche',
          'Tábua de frios e bruschetta', 'Wrap e crepe salgado',
        ],
      },
      {
        id: 'q7', tipo: 'multi', obrigatoria: true, outro: true,
        label: 'E na hora do doce, qual é o seu fraco?',
        opcoes: [
          'Bolo e torta', 'Brigadeiro e docinhos', 'Cheesecake', 'Macaron e petit four',
          'Açaí com granola', 'Sorvete e gelato', 'Crepe doce', 'Brownie e cookies',
          'Bolo no pote',
        ],
      },
      {
        id: 'q8', tipo: 'single', obrigatoria: true, outro: true,
        label: 'Quando vai a um restaurante, que tipo de comida você mais pede?',
        opcoes: [
          'Brasileira (tradicional)', 'Italiana', 'Japonesa e asiática',
          'Árabe e mediterrânea', 'Hamburguer artesanal', 'Mexicana', 'Frutos do mar',
          'Vegana e vegetariana',
        ],
      },
      {
        id: 'q9', tipo: 'single', obrigatoria: true,
        label: 'Como você se define na hora de comer?',
        opcoes: [
          'Aventureiro: adoro experimentar coisas novas',
          'Fiel: tenho meus favoritos e fico neles',
          'Equilibrado: depende do dia',
          'Saudável: sempre buscando opções leves',
        ],
      },
    ],
  },
  {
    id: 'sweet-lovers',
    titulo: 'Sweet Lovers',
    perguntas: [
      {
        id: 'q10', tipo: 'single', obrigatoria: true,
        label: 'Com que frequência você vai a cafeterias?',
        opcoes: [
          'Todo dia', 'Algumas vezes por semana', 'Uma vez por semana',
          'A cada 15 dias', 'Raramente', 'Só em eventos especiais como o SCW',
        ],
      },
      {
        id: 'q11', tipo: 'multi', obrigatoria: true, outro: true, max: 5,
        label: 'O que mais te atrai numa cafeteria ou doceria? (selecione até 5)',
        opcoes: [
          'Qualidade do café', 'Qualidade do doce', 'Qualidade do salgado',
          'Ambiente e decoração', 'Variedade do cardápio', 'Preço acessível',
          'Localização', 'Experiência e conceito diferente', 'Bom atendimento',
        ],
      },
    ],
  },
  {
    id: 'brindes',
    titulo: 'Brindes e prêmios',
    perguntas: [
      {
        id: 'q12', tipo: 'multi', obrigatoria: true, outro: true,
        label: 'Que tipo de brinde seria realmente útil pra você no dia a dia?',
        opcoes: [
          'Copo e caneca temática', 'Kit de café em casa',
          'Voucher em estabelecimentos parceiros', 'Necessaire ou acessório de bolsa',
          'Voucher de experiência gastronômica', 'Livro ou planner', 'Ecobag estilosa',
          'Fone de ouvido e acessório tech',
        ],
      },
      {
        id: 'q13', tipo: 'single', obrigatoria: true, outro: true,
        label: 'E se fosse um prêmio maior, o que você escolheria?',
        opcoes: [
          'Viagem curta (passagem e hospedagem)', 'Experiência gastronômica premium',
          'Kit de equipamentos de café', 'Vale-presente em loja de lifestyle',
          'Curso ou workshop de café e gastronomia',
        ],
      },
    ],
  },
  {
    id: 'conexao',
    titulo: 'Conexão com o SCW',
    perguntas: [
      {
        id: 'q14', tipo: 'multi', obrigatoria: true, outro: true,
        label: 'Qual canal você prefere para ficar por dentro do SCW?',
        opcoes: ['Instagram', 'WhatsApp', 'E-mail', 'TikTok', 'Cartaz e divulgação física'],
      },
      {
        id: 'q15', tipo: 'texto', obrigatoria: false,
        label: 'Deixa um recado pra gente: o que você gostaria de ver no próximo Sweet?',
      },
    ],
  },
]
```

- [ ] **Step 2: Verificar import**

Run: `node -e "import('./src/data/pesquisaLovers.js').then(m=>console.log(m.PESQUISA_SECOES.length, m.PESQUISA_SECOES.flatMap(s=>s.perguntas).length))"`
Expected: `7 15`

- [ ] **Step 3: Commit**

```bash
git add src/data/pesquisaLovers.js
git commit -m "feat: dados da Pesquisa Sweet Lovers (15 perguntas, 7 seções)"
```

---

### Task 2: Banco — tabela + RPCs no Supabase

**Files:**
- Modify: `supabase/schema.sql` (append ao final, após a linha 467)

**Interfaces:**
- Produces: RPC `submit_pesquisa(p_email text, p_nome text, p_respostas jsonb) returns void` (grant anon) — consumida pelo front na Task 3. RPC `get_pesquisa_report(p_secret text) returns setof public.pesquisa_lovers` (admin) para leitura/export.

- [ ] **Step 1: Append do bloco SQL no schema.sql**

Acrescentar ao final de `supabase/schema.sql`:

```sql
-- =============================================================================
-- Pesquisa Sweet Lovers — perfil de público (disparada por e-mail via Brevo)
-- Mesmo padrão de segurança da votação: RLS sem policy + RPC security definer.
-- =============================================================================
create table if not exists public.pesquisa_lovers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text,
  nome text,
  respostas jsonb not null,
  user_agent text
);
create index if not exists pesquisa_lovers_created_idx on public.pesquisa_lovers (created_at);

alter table public.pesquisa_lovers enable row level security;
-- (sem policies = nenhum acesso anônimo direto; gravação só pela RPC abaixo)

-- ── RPC: gravar resposta da pesquisa (anon) ──────────────────────────────────
create or replace function public.submit_pesquisa(
  p_email text,
  p_nome text,
  p_respostas jsonb,
  p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
begin
  if p_respostas is null or jsonb_typeof(p_respostas) <> 'object'
     or p_respostas = '{}'::jsonb then
    raise exception 'respostas_obrigatorias';
  end if;
  insert into public.pesquisa_lovers (email, nome, respostas, user_agent)
  values (v_email, nullif(trim(coalesce(p_nome, '')), ''), p_respostas, p_user_agent);
end;
$$;
grant execute on function public.submit_pesquisa(text, text, jsonb, text) to anon, authenticated;

-- ── RPC: relatório da pesquisa (admin, mesma senha do painel) ────────────────
create or replace function public.get_pesquisa_report(p_secret text)
returns setof public.pesquisa_lovers
language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_ok(p_secret) then return; end if;
  return query select * from public.pesquisa_lovers order by created_at;
end;
$$;
grant execute on function public.get_pesquisa_report(text) to anon, authenticated;
```

- [ ] **Step 2: Rodar no Supabase**

O Wilke cola o `schema.sql` inteiro no Dashboard → SQL Editor → New query → Run (idempotente; não afeta tabelas existentes).
Verificação no SQL Editor:
```sql
select public.submit_pesquisa('teste@exemplo.com', 'Teste', '{"q1":["Ouvir música"]}'::jsonb, 'plan-check');
select count(*) from public.pesquisa_lovers where email = 'teste@exemplo.com';  -- 1
delete from public.pesquisa_lovers where email = 'teste@exemplo.com';           -- limpa o teste
```
Expected: insert ok, count = 1.

- [ ] **Step 3: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: tabela e RPCs da Pesquisa Sweet Lovers no Supabase"
```

---

### Task 3: Página da pesquisa + estilos

**Files:**
- Create: `src/pages/lovers/Pesquisa.jsx`
- Create: `src/styles/pesquisa.css`

**Interfaces:**
- Consumes: `PESQUISA_INTRO`, `PESQUISA_SECOES` (Task 1); `supabase` de `src/lib/supabase.js`; RPC `submit_pesquisa` (Task 2).
- Produces: export `PesquisaPage` (componente React). Consumido pelo `App.jsx` na Task 4.

- [ ] **Step 1: Criar os estilos**

```css
/* src/styles/pesquisa.css — KV atual do site (institucional, terracota).
   Usa as CSS vars globais de src/styles.css; fallbacks para robustez. */
.pesquisa { background: var(--bg, #FFF4EC); color: var(--ink, #2B1810); min-height: 100vh; }
.pesquisa__wrap { max-width: 720px; margin: 0 auto; padding: 32px 20px 96px; }
.pesquisa__intro h1 {
  font-family: 'Instrument Serif', Georgia, serif;
  color: var(--ink, #2B1810); font-size: clamp(2.2rem, 6vw, 3.2rem); line-height: 1.05; margin: 0 0 12px;
}
.pesquisa__intro p { font-family: 'DM Sans', system-ui, sans-serif; color: var(--ink-soft, #6B4A3A); font-size: 1.05rem; line-height: 1.5; margin: 0 0 28px; }
.pesquisa__secao { margin: 28px 0; }
.pesquisa__secao > h2 {
  font-family: 'Instrument Serif', Georgia, serif;
  color: var(--accent, #E8553A); font-size: 1.6rem; margin: 0 0 16px;
}
.pesquisa__q { background: var(--bg-card, #fff); border-radius: 14px; padding: 18px 18px 14px; margin: 0 0 16px; box-shadow: 0 1px 0 rgba(0,0,0,.04); }
.pesquisa__q legend, .pesquisa__q .pesquisa__label {
  font-family: 'DM Sans', system-ui, sans-serif; font-weight: 600; font-size: 1.02rem; color: var(--ink, #2B1810); margin: 0 0 12px; display: block;
}
.pesquisa__q .req { color: var(--accent, #E8553A); }
.pesquisa__opt { display: flex; align-items: center; gap: 10px; padding: 7px 0; font-family: 'DM Sans', system-ui, sans-serif; color: var(--ink, #2B1810); cursor: pointer; }
.pesquisa__opt input { width: 18px; height: 18px; accent-color: var(--accent, #E8553A); }
.pesquisa__opt--disabled { opacity: .45; cursor: not-allowed; }
.pesquisa__outro-input, .pesquisa__texto {
  width: 100%; margin-top: 6px; padding: 10px 12px; border: 1px solid var(--bg-soft, #e4d6c9); border-radius: 10px;
  font-family: 'DM Sans', system-ui, sans-serif; font-size: 1rem; color: var(--ink, #2B1810); background: var(--bg-card, #fff);
}
.pesquisa__hint { font-size: .85rem; color: var(--ink-mute, #9B7A68); margin: 4px 0 0; }
.pesquisa__erro { color: var(--accent-deep, #C13E25); font-size: .85rem; margin: 6px 0 0; }
.pesquisa__submit {
  margin-top: 8px; width: 100%; padding: 16px; border: 0; border-radius: 999px;
  background: var(--ink, #2B1810); color: var(--bg, #FFF4EC); font-family: 'DM Sans', system-ui, sans-serif; font-weight: 700;
  font-size: 1.1rem; cursor: pointer;
}
.pesquisa__submit:hover { background: var(--ink-dark, #1a0e08); }
.pesquisa__submit:disabled { opacity: .6; cursor: not-allowed; }
.pesquisa__sucesso { text-align: center; padding: 80px 20px; }
.pesquisa__sucesso h1 { font-family: 'Instrument Serif', Georgia, serif; color: var(--accent, #E8553A); font-size: clamp(2.2rem, 7vw, 3.4rem); }
.pesquisa__sucesso p { font-family: 'DM Sans', system-ui, sans-serif; color: var(--ink-soft, #6B4A3A); font-size: 1.1rem; }
```

- [ ] **Step 2: Criar a página**

```jsx
// src/pages/lovers/Pesquisa.jsx
import React from 'react'
import { PESQUISA_INTRO, PESQUISA_SECOES } from '../../data/pesquisaLovers'
import { supabase } from '../../lib/supabase'
import '../../styles/pesquisa.css'

const OUTRO = 'Outro'

function getEmailFromUrl() {
  try {
    const hash = window.location.hash || ''
    const qs = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : window.location.search.replace(/^\?/, '')
    const e = new URLSearchParams(qs).get('e')
    return e ? e.trim() : ''
  } catch { return '' }
}

export function PesquisaPage() {
  const email = React.useMemo(getEmailFromUrl, [])
  const [nome, setNome] = React.useState('')
  const [multi, setMulti] = React.useState({})   // qid -> string[]
  const [single, setSingle] = React.useState({}) // qid -> string
  const [texto, setTexto] = React.useState({})   // qid -> string
  const [outro, setOutro] = React.useState({})   // qid -> string
  const [erros, setErros] = React.useState({})   // qid -> string
  const [enviando, setEnviando] = React.useState(false)
  const [enviado, setEnviado] = React.useState(false)
  const [erroGeral, setErroGeral] = React.useState('')

  const todas = React.useMemo(() => PESQUISA_SECOES.flatMap((s) => s.perguntas), [])

  const toggleMulti = (q, opt) => {
    setMulti((m) => {
      const atual = m[q.id] || []
      const tem = atual.includes(opt)
      if (!tem && q.max && atual.length >= q.max) return m // trava limite
      return { ...m, [q.id]: tem ? atual.filter((o) => o !== opt) : [...atual, opt] }
    })
    setErros((e) => ({ ...e, [q.id]: '' }))
  }

  const validar = () => {
    const next = {}
    for (const q of todas) {
      if (!q.obrigatoria) continue
      if (q.tipo === 'multi' && (multi[q.id] || []).length === 0) next[q.id] = 'Escolha pelo menos uma opção.'
      if (q.tipo === 'single' && !single[q.id]) next[q.id] = 'Selecione uma opção.'
      if (q.tipo === 'texto' && !(texto[q.id] || '').trim()) next[q.id] = 'Campo obrigatório.'
    }
    // "Outro" marcado exige texto
    for (const q of todas) {
      if (!q.outro) continue
      const marcado = q.tipo === 'multi' ? (multi[q.id] || []).includes(OUTRO) : single[q.id] === OUTRO
      if (marcado && !(outro[q.id] || '').trim()) next[q.id] = 'Especifique o "Outro".'
    }
    setErros(next)
    return Object.keys(next).length === 0
  }

  const montarRespostas = () => {
    const out = {}
    for (const q of todas) {
      if (q.tipo === 'multi') { if ((multi[q.id] || []).length) out[q.id] = multi[q.id] }
      else if (q.tipo === 'single') { if (single[q.id]) out[q.id] = single[q.id] }
      else if (q.tipo === 'texto') { if ((texto[q.id] || '').trim()) out[q.id] = texto[q.id].trim() }
      const marcado = q.outro && (q.tipo === 'multi' ? (multi[q.id] || []).includes(OUTRO) : single[q.id] === OUTRO)
      if (marcado && (outro[q.id] || '').trim()) out[`${q.id}_outro`] = outro[q.id].trim()
    }
    return out
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setErroGeral('')
    if (!validar()) {
      const first = document.querySelector('.pesquisa__erro')
      if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setEnviando(true)
    try {
      const { error } = await supabase.rpc('submit_pesquisa', {
        p_email: email || null,
        p_nome: nome || null,
        p_respostas: montarRespostas(),
        p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      })
      if (error) throw error
      setEnviado(true)
    } catch (err) {
      if (import.meta.env && import.meta.env.DEV) console.error('[pesquisa]', err)
      setErroGeral('Não rolou enviar agora. Confere a conexão e tenta de novo.')
    } finally {
      setEnviando(false)
    }
  }

  if (enviado) {
    return (
      <div className="pesquisa">
        <div className="pesquisa__sucesso">
          <h1>Valeu, Sweet Lover! 🍫</h1>
          <p>Sua resposta foi registrada. Boa sorte nos brindes do Sweet &amp; Coffee Week!</p>
        </div>
      </div>
    )
  }

  const renderOpcoes = (q) => {
    const opcoes = q.outro ? [...q.opcoes, OUTRO] : q.opcoes
    return opcoes.map((opt) => {
      const isMulti = q.tipo === 'multi'
      const checked = isMulti ? (multi[q.id] || []).includes(opt) : single[q.id] === opt
      const atMax = isMulti && q.max && !checked && (multi[q.id] || []).length >= q.max
      return (
        <React.Fragment key={opt}>
          <label className={`pesquisa__opt${atMax ? ' pesquisa__opt--disabled' : ''}`}>
            <input
              type={isMulti ? 'checkbox' : 'radio'}
              name={q.id}
              checked={checked}
              disabled={atMax}
              onChange={() => {
                if (isMulti) toggleMulti(q, opt)
                else { setSingle((s) => ({ ...s, [q.id]: opt })); setErros((e) => ({ ...e, [q.id]: '' })) }
              }}
            />
            <span>{opt}</span>
          </label>
          {opt === OUTRO && checked && (
            <input
              className="pesquisa__outro-input"
              type="text"
              placeholder="Qual?"
              value={outro[q.id] || ''}
              onChange={(ev) => setOutro((o) => ({ ...o, [q.id]: ev.target.value }))}
            />
          )}
        </React.Fragment>
      )
    })
  }

  return (
    <div className="pesquisa">
      <form className="pesquisa__wrap" onSubmit={onSubmit} noValidate>
        <div className="pesquisa__intro">
          <h1>{PESQUISA_INTRO.titulo}</h1>
          <p>{PESQUISA_INTRO.texto}</p>
        </div>

        <div className="pesquisa__q">
          <label className="pesquisa__label" htmlFor="pesquisa-nome">Como podemos te chamar? (opcional)</label>
          <input id="pesquisa-nome" className="pesquisa__outro-input" type="text"
            value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" autoComplete="name" />
        </div>

        {PESQUISA_SECOES.map((sec) => (
          <section className="pesquisa__secao" key={sec.id}>
            <h2>{sec.titulo}</h2>
            {sec.perguntas.map((q) => (
              <fieldset className="pesquisa__q" key={q.id}>
                <legend>{q.label}{q.obrigatoria && <span className="req"> *</span>}</legend>
                {q.tipo === 'texto'
                  ? <textarea className="pesquisa__texto" rows={3} value={texto[q.id] || ''}
                      onChange={(e) => { setTexto((t) => ({ ...t, [q.id]: e.target.value })); setErros((er) => ({ ...er, [q.id]: '' })) }}
                      placeholder="Sua resposta" />
                  : renderOpcoes(q)}
                {q.tipo === 'multi' && q.max && <p className="pesquisa__hint">Escolha até {q.max}.</p>}
                {erros[q.id] && <p className="pesquisa__erro">{erros[q.id]}</p>}
              </fieldset>
            ))}
          </section>
        ))}

        {erroGeral && <p className="pesquisa__erro">{erroGeral}</p>}
        <button className="pesquisa__submit" type="submit" disabled={enviando}>
          {enviando ? 'Enviando…' : 'Enviar respostas'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build conclui sem erro (a página ainda não está roteada; só valida sintaxe/imports).

- [ ] **Step 4: Commit**

```bash
git add src/pages/lovers/Pesquisa.jsx src/styles/pesquisa.css
git commit -m "feat: página Pesquisa Sweet Lovers (form + submit Supabase)"
```

---

### Task 4: Rotear e isentar a rota dos bloqueios

**Files:**
- Modify: `src/App.jsx` (import ~linha 18; `isLegacyLoversPath` ~55-58; detecção de rota ~71-87; switch ~90-101)

**Interfaces:**
- Consumes: `PesquisaPage` (Task 3).

- [ ] **Step 1: Importar a página**

Após a linha `import { PainelPage } from './pages/lovers/Painel'` adicionar:
```jsx
import { PesquisaPage }    from './pages/lovers/Pesquisa'
```

- [ ] **Step 2: Isentar do redirect legacy**

Em `isLegacyLoversPath`, após a linha `if (path.startsWith('/lovers/painel')) return false`, adicionar:
```jsx
  if (path.startsWith('/lovers/pesquisa')) return false
```

- [ ] **Step 3: Rotear antes do bloqueio Awards-only**

No bloco `const route = (() => {`, logo após `if (path.startsWith('/lovers/painel')) return 'painel'` (e ANTES da linha `if (AWARDS_ONLY_PUBLICATION && !INSTITUTIONAL_PREVIEW) return 'vencedores'`), adicionar:
```jsx
    if (path.startsWith('/lovers/pesquisa')) return 'pesquisa'
```

- [ ] **Step 4: Adicionar o case no switch**

No `switch (route)`, após `case 'painel': page = <PainelPage navigate={navigate} />; break`, adicionar:
```jsx
    case 'pesquisa':     page = <PesquisaPage navigate={navigate} />; break
```

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: build verde.

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx
git commit -m "feat: rota pública #/lovers/pesquisa (isenta do modo Awards-only)"
```

---

### Task 5: Verificação no preview e fechamento

**Files:** nenhum (verificação).

- [ ] **Step 1: Subir o preview e abrir a pesquisa**

Iniciar o dev server e navegar para `#/lovers/pesquisa?e=teste@exemplo.com` (usar as ferramentas preview_*). A página deve renderizar com o **KV atual do site** (fundo `--bg #FFF4EC`, acento terracota `--accent`, Instrument Serif + DM Sans), intro, campo nome, 7 seções, 15 perguntas.

- [ ] **Step 2: Validar regras no preview**

- Enviar vazio → erros nas obrigatórias, rolagem até o 1º erro.
- Q2 (até 3) e Q11 (até 5): ao atingir o limite, opções não marcadas ficam desabilitadas.
- Marcar "Outro" → aparece campo de texto; enviar sem preencher → erro.
- Preencher todas obrigatórias → enviar.

- [ ] **Step 3: Confirmar gravação no Supabase**

No SQL Editor: `select email, nome, respostas, created_at from public.pesquisa_lovers order by created_at desc limit 1;`
Expected: linha com `email = 'teste@exemplo.com'`, `respostas` = objeto com q1..q15 preenchidas. Conferir que `q*_outro` aparece quando "Outro" foi usado. Limpar o teste depois.

- [ ] **Step 4: Screenshot de prova + responsivo**

`preview_screenshot` desktop e `preview_resize` mobile (~390px) → confirmar layout mobile-first ok. Compartilhar com o usuário.

- [ ] **Step 5: Build final + push**

```bash
npm run build
git push origin dev/site-completo
```
Expected: build verde; push para a branch de desenvolvimento (nunca master).

---

### Task 6: Edge function — sync de contatos pro Brevo

**Files:**
- Create: `supabase/functions/sync-brevo-contacts/index.ts`

**Interfaces:**
- Consumes: tabela `public.votos` (coluna `email`, `nome`) via service-role; API Brevo `POST /v3/contacts/import`.
- Produces: endpoint HTTP POST que, autenticado por segredo, importa os e-mails distintos da votação numa lista do Brevo. Independente das Tasks 1-5 (o disparo da campanha é manual no painel do Brevo).

**Secrets (Dashboard → Edge Functions → Secrets, ou `supabase secrets set`):**
- `BREVO_API_KEY` — chave da API do Brevo (painel Brevo → SMTP & API → API Keys).
- `BREVO_LIST_ID` — id numérico da lista de destino no Brevo.
- `SYNC_SECRET` — segredo arbitrário forte; protege a função de chamadas não autorizadas.
- Injetadas pelo Supabase: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

- [ ] **Step 1: Criar a edge function**

```ts
// supabase/functions/sync-brevo-contacts/index.ts
// Importa os e-mails distintos da votação (public.votos) para uma lista do Brevo.
// Deploy:  supabase functions deploy sync-brevo-contacts
// Chamar (1x, quando quiser sincronizar):
//   curl -X POST "<PROJECT_URL>/functions/v1/sync-brevo-contacts" \
//        -H "content-type: application/json" -d '{"secret":"<SYNC_SECRET>"}'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
const emailOk = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((e || '').trim())

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  let payload: { secret?: string }
  try { payload = await req.json() } catch { return json({ error: 'invalid_json' }, 400) }

  const SYNC_SECRET = Deno.env.get('SYNC_SECRET')
  if (!SYNC_SECRET || payload.secret !== SYNC_SECRET) return json({ error: 'unauthorized' }, 401)

  const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')
  const BREVO_LIST_ID = Deno.env.get('BREVO_LIST_ID')
  if (!BREVO_API_KEY || !BREVO_LIST_ID) return json({ error: 'brevo_nao_configurado' }, 500)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data, error } = await supabase.from('votos').select('email, nome')
  if (error) return json({ error: 'db_error', detail: error.message }, 500)

  // distinct por e-mail (minúsculo), preserva o primeiro nome visto
  const map = new Map<string, string>()
  for (const row of data ?? []) {
    const e = (row.email || '').trim().toLowerCase()
    if (!emailOk(e) || map.has(e)) continue
    map.set(e, (row.nome || '').trim())
  }
  const contatos = [...map.entries()].map(([email, nome]) => ({ email, attributes: { NOME: nome } }))
  if (contatos.length === 0) return json({ imported: 0, note: 'sem_emails' })

  const res = await fetch('https://api.brevo.com/v3/contacts/import', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      listIds: [Number(BREVO_LIST_ID)],
      updateExistingContacts: true,
      emptyContactsAttributes: false,
      jsonBody: contatos,
    }),
  })
  if (!res.ok) return json({ error: 'brevo_error', detail: await res.text() }, 502)
  return json({ imported: contatos.length, brevo: await res.json() })
})
```

- [ ] **Step 2: Deploy e configuração**

```bash
supabase secrets set BREVO_API_KEY=xkeysib-... BREVO_LIST_ID=2 SYNC_SECRET=<segredo-forte>
supabase functions deploy sync-brevo-contacts
```
(O Wilke cria a API key e a lista no painel do Brevo e informa o `BREVO_LIST_ID`.)

- [ ] **Step 3: Executar o sync e conferir**

```bash
curl -X POST "https://dgfmoibynftadsyjcclg.supabase.co/functions/v1/sync-brevo-contacts" \
  -H "content-type: application/json" -d '{"secret":"<SYNC_SECRET>"}'
```
Expected: `{"imported": <n>, ...}`. Conferir no painel do Brevo que os contatos entraram na lista. Depois, montar e disparar a campanha no Brevo com o botão apontando para `https://www.sweetcoffeeweek.com.br/#/lovers/pesquisa?e={{contact.EMAIL}}`.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/sync-brevo-contacts/index.ts
git commit -m "feat: edge function sync de contatos da votação pro Brevo"
```

---

## Self-Review

**Spec coverage:**
- 15 perguntas / 7 seções → Task 1 (data) + Task 3 (render). ✔
- KV atual do site (terracota, Instrument Serif + DM Sans, sem `.kv-lovers`) → Task 3 (CSS com vars globais + wrapper `.pesquisa`). ✔
- Identificação por `?e=` + Nome opcional → Task 3 (`getEmailFromUrl`, campo nome). ✔
- Destino Supabase, padrão da votação → Task 2 (RLS sem policy + RPC security definer). ✔
- Leitura/export admin → Task 2 (`get_pesquisa_report`); export pelo dashboard Supabase (Painel React = fora de escopo, flagado). ✔
- Rota `#/lovers/pesquisa` sem tocar slugs congelados → Task 4. ✔ (descoberta nova: isenção dos bloqueios Awards-only/legacy — coberta na Task 4.)
- Validação obrigatórias + limites "até N" + "Outro" → Task 3 (`validar`, `toggleMulti`, `renderOpcoes`). ✔
- Tela de sucesso → Task 3 (`enviado`). ✔
- Brevo: sync de contatos da votação → Task 6 (edge function `sync-brevo-contacts`). Desenho/disparo da campanha = manual no painel do Brevo. ✔

**Placeholder scan:** sem TBD/TODO; todo passo com código/SQL/comando reais. ✔

**Type consistency:** RPC `submit_pesquisa(p_email, p_nome, p_respostas, p_user_agent)` idêntica entre Task 2 (SQL) e Task 3 (chamada `supabase.rpc`). Shapes `multi/single/texto/outro` consistentes entre data (Task 1) e render (Task 3). ✔

## Riscos / observações

- A Task 4 torna a pesquisa **pública em produção** mesmo com o site em modo Awards-only — é o objetivo (Brevo dispara o link), mas é uma mudança de roteamento de produção: confirmar antes de fazer push.
- Supabase free pausa se ocioso; se pausar no disparo, o insert falha → tratado com `erroGeral` (não perde silenciosamente, pede retry).
- `?e=` é "melhor esforço" (link encaminhado pode não bater) → por isso o campo Nome opcional.
- A Task 2 depende do Wilke rodar o `schema.sql` no dashboard antes do teste de gravação.
- Task 6 (Brevo): a função usa service-role e lê todos os e-mails da votação — por isso o guard `SYNC_SECRET` é obrigatório; nunca expor esse segredo no front. Importar/disparar pressupõe consentimento dos contatos (foram coletados na votação). `contacts/import` num único `jsonBody` aguenta esta escala; se a lista crescer muito (milhares), dividir em lotes.
- Tasks 1-5 e Task 6 são independentes: a pesquisa funciona sem o sync, e o sync funciona sem a página. Podem ser executadas/revisadas separadamente.
