# Painel SCW em React — Fase 1 (casca + login da organização + Respostas) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provar o padrão da reescrita — um segundo entry Vite/React, fora do
bundle do site, com login da organização e UMA vista real (Respostas) rodando
ponta a ponta contra o Supabase de verdade, sem tocar em nada que já está no ar.

**Architecture:** Vite multi-page app — `painel-app/index.html` como segundo
entry, registrado em `vite.config.js` ao lado do `index.html` do site. React
puro (sem router lib, sem state manager), reaproveitando `src/lib/adminAccess.js`
já existente para a autenticação. CSS é cópia verbatim do `<style>` de
`public/painel/index.html` (linhas 22–1016) — é o mesmo sistema visual, só
compilado como asset em vez de inline.

**Tech Stack:** Vite + React 18 (já são dependências do projeto — zero pacote
novo). Testes de lógica pura com `node --test` (mesmo runner que
`tests/organizacao.test.mjs` já usa — sem Jest, sem Vitest, sem dependência
nova).

## Global Constraints

- **Este plano NÃO PUBLICA nada.** `public/organizacao/`, `public/marca/` e
  `public/painel/` continuam intocados e são o que serve `/organizacao`,
  `/marca` e `/painel` em produção até o corte final (fora do escopo desta
  fase — ver spec). O novo entry mora em caminho separado
  (`/painel-novo/` em dev), inalcançável de qualquer link real do site.
- **Sem lib nova.** Sem React Router, sem Redux/Zustand, sem
  `@testing-library/react`. `useState`/`useContext` bastam; nenhuma vista
  desta fase tem estado complexo o bastante para justificar mais.
- **Estratégia de teste, por camada** (decisão explícita, não default do
  template desta skill): lógica pura (rede injetada, filtros, formatação)
  ganha teste automatizado com `node --test`, seguindo o padrão que
  `src/lib/adminAccess.js`/`src/lib/marcaAccess.js` já usam (§4.1 do
  `CLAUDE.md` do projeto: a lib não importa rede, a função é injetada). Para
  COMPONENTE React, este repositório não tem — e nunca teve — teste
  automatizado (todo o resto do site é verificado por `npm run build` +
  navegador real, inclusive nesta mesma sessão). Este plano segue a mesma
  convenção: cada task de componente termina em passo manual explícito
  (`npm run dev` + navegador), não em teste fake só para preencher o
  template.
- **Paridade visual.** Nenhuma classe CSS é renomeada nem redesenhada nesta
  fase — é cópia literal do que já existe e está validado em produção.
- **`escapar()` deixa de ser necessário no texto que passa por JSX** — é
  garantia estrutural do React. Continua necessário em qualquer
  `dangerouslySetInnerHTML` (nenhuma task deste plano usa isso).

---

### Task 1: Entry Vite do novo painel

**Files:**
- Create: `painel-app/index.html`
- Create: `painel-app/src/main.jsx`
- Create: `painel-app/src/App.jsx`
- Modify: `vite.config.js`

**Interfaces:**
- Produces: rota de dev `http://localhost:<porta>/painel-novo/` renderizando
  `<App />`. Nenhuma outra task depende de símbolo nenhum daqui além dessa
  URL existir.

- [ ] **Step 1: Criar o HTML de entrada**

`painel-app/index.html`:

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Painel SCW</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/painel-app/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Criar o componente raiz (placeholder)**

`painel-app/src/App.jsx`:

```jsx
export function App() {
  return <p>Painel SCW — fase 1 em construção.</p>
}
```

`painel-app/src/main.jsx`:

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 3: Registrar o segundo entry no Vite**

Em `vite.config.js`, o `export default defineConfig({...})` ganha
`build.rollupOptions.input` com os dois HTMLs (hoje o build só conhece o
`index.html` da raiz, implícito):

```js
import { fileURLToPath } from 'node:url'

// ... (plugins existentes, sem mudança)

export default defineConfig({
  plugins: [react(), visualOverridesDevApi(), paginasEstaticasDev()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        painel: fileURLToPath(new URL('./painel-app/index.html', import.meta.url)),
      },
    },
  },
  server: {
    port: Number(process.env.PORT) || 5173,
    strictPort: false,
    watch: {
      ignored: ['**/dist_check/**', '**/dist/**', '**/vite.config.js.timestamp-*'],
    },
  },
})
```

- [ ] **Step 4: Rodar e verificar em dev**

Run: `npm run dev`

Abrir `http://localhost:5173/painel-app/` no navegador (ou a porta que o
terminal imprimir).

Expected: a página carrega e mostra o texto "Painel SCW — fase 1 em
construção." — sem erro no console. **Se o Vite pedir a URL sem a barra
final e redirecionar, ou se `/painel-app/` der 404**, o mapeamento de
diretório do Vite para HTML fora de `public/` não é automático como
esperado — pare aqui e ajuste o `input` do Step 3 antes de seguir (não
adivinhe: teste é o único jeito de saber, o comportamento não está
documentado neste repositório porque nenhum segundo entry existiu antes
desta task).

- [ ] **Step 5: Rodar o build de verificação e confirmar que o site não quebrou**

Run: `npx vite build --outDir "$TEMP/scw_build_check" --emptyOutDir`

Expected: build termina sem erro, `dist_check` contém `index.html` (o do
site) **e** `painel-app/index.html` (o novo). Depois:

```bash
rm -rf "$TEMP/scw_build_check"
```

- [ ] **Step 6: Commit**

```bash
git add painel-app vite.config.js
git commit -m "feat(painel-react): entry Vite separado, placeholder"
```

---

### Task 2: Cliente RPC (lógica pura, testável)

**Files:**
- Create: `painel-app/src/lib/rpc.js`
- Test: `tests/painel-app-rpc.test.mjs`

**Interfaces:**
- Consumes: nada de outra task.
- Produces: `rpc(nome, corpo, fetchImpl = fetch) => Promise<any>` — usada
  por toda task que fala com o banco daqui pra frente (Task 3 via
  `entrarNaOrganizacao`, Task 5 via `carregar()`).

- [ ] **Step 1: Escrever o teste que falha**

`tests/painel-app-rpc.test.mjs`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rpc } from '../painel-app/src/lib/rpc.js'

test('rpc devolve o corpo já convertido em JSON', async () => {
  const fetchFalso = async (url, opcoes) => {
    assert.equal(url, 'https://dgfmoibynftadsyjcclg.supabase.co/rest/v1/rpc/admin_ping')
    assert.equal(opcoes.method, 'POST')
    assert.equal(JSON.parse(opcoes.body).p_secret, 'abc')
    return { ok: true, text: async () => 'true' }
  }
  const r = await rpc('admin_ping', { p_secret: 'abc' }, fetchFalso)
  assert.equal(r, true)
})

test('rpc trata resposta 204 sem corpo como null, não como erro', async () => {
  // ⚠️ Bug real já documentado no CLAUDE.md do projeto: RPC `returns void`
  // responde 204 sem corpo, e `r.json()` em cima do vazio estoura. Este
  // teste existe pra essa classe de bug nunca voltar aqui.
  const fetchFalso = async () => ({ ok: true, text: async () => '' })
  const r = await rpc('registrar_algo', {}, fetchFalso)
  assert.equal(r, null)
})

test('rpc lança erro com a mensagem do banco quando a resposta não é ok', async () => {
  const fetchFalso = async () => ({
    ok: false,
    status: 400,
    json: async () => ({ message: 'senha errada' }),
  })
  await assert.rejects(() => rpc('admin_ping', { p_secret: 'x' }, fetchFalso), /senha errada/)
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node --test tests/painel-app-rpc.test.mjs`
Expected: FAIL — `Cannot find module '../painel-app/src/lib/rpc.js'`

- [ ] **Step 3: Implementar**

`painel-app/src/lib/rpc.js`:

```js
/*
 * Cliente RPC do painel — PostgREST direto por fetch, sem supabase-js
 * (mesmo motivo do arquivo estático que substitui: ~100 KB de CDN só pra
 * fazer POSTs). `fetchImpl` é injetado com default `fetch` global — em
 * produção ninguém passa o terceiro argumento; o teste passa um fake.
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://dgfmoibynftadsyjcclg.supabase.co'
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_E6G4mwt0xFzz_Ob0dULd9g_NhlJpH2R'

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
```

`import.meta.env` só funciona dentro do Vite; `node --test` roda fora dele.
Adicionar no topo do teste, antes do `import`, não é necessário — Node
trata `import.meta.env` como `undefined` ao executar `.mjs` puro, e o
`||` já cobre isso com o literal. Confirmar no Step 4.

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node --test tests/painel-app-rpc.test.mjs`
Expected: PASS, 3/3.

- [ ] **Step 5: Commit**

```bash
git add painel-app/src/lib/rpc.js tests/painel-app-rpc.test.mjs
git commit -m "feat(painel-react): cliente RPC puro e testado"
```

---

### Task 3: Login da organização

**Files:**
- Create: `painel-app/src/components/LoginOrganizacao.jsx`
- Modify: `painel-app/src/App.jsx`
- Test: manual (componente — ver Global Constraints)

**Interfaces:**
- Consumes: `rpc` (Task 2); `entrarNaOrganizacao`, `RECADO`, `CHAVE_SESSAO`
  de `src/lib/adminAccess.js` (já existe, já usado pelo `AccessDialog.jsx`
  do site — zero mudança nele).
- Produces: `<LoginOrganizacao onEntrar={() => void}>` — chama `onEntrar()`
  só depois de `sessionStorage.scw_org` gravado com sucesso.

- [ ] **Step 1: Escrever o componente de login**

`painel-app/src/components/LoginOrganizacao.jsx`:

```jsx
import React from 'react'
import { entrarNaOrganizacao, RECADO } from '../../../src/lib/adminAccess'
import { rpc } from '../lib/rpc'

export function LoginOrganizacao({ onEntrar }) {
  const [senha, setSenha] = React.useState('')
  const [carregando, setCarregando] = React.useState(false)
  const [erro, setErro] = React.useState(null)

  async function enviar(ev) {
    ev.preventDefault()
    setCarregando(true)
    setErro(null)
    const r = await entrarNaOrganizacao({
      senha,
      rpc,
      guardar: (chave, valor) => sessionStorage.setItem(chave, valor),
    })
    setCarregando(false)
    if (!r.ok) { setErro(RECADO[r.erro]); return }
    onEntrar()
  }

  return (
    <div className="pn-porta" id="login">
      <div className="pn-porta__caixa">
        <img className="pn-porta__selo" src="/images/logo-seal-sweet-coffee.svg" alt="Sweet & Coffee Week" />
        <form className="pn-setor pn-setor--org" onSubmit={enviar}>
          <span className="pn-setor__disco" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12.4" cy="10.6" r="5" fill="currentColor" stroke="none" />
              <path d="M4.6 25.6c0-4.4 3.5-7.8 7.8-7.8s7.8 3.4 7.8 7.8" />
              <circle cx="23.4" cy="13" r="3.4" fill="currentColor" stroke="none" />
              <path d="M21.8 19.6c3.4.6 5.8 3.2 5.8 6.4" />
            </svg>
          </span>
          <span>
            <span className="pn-setor__nome">Organização</span>
            <span className="pn-setor__nota">Equipe do festival. Vê todas as marcas e move o caminho.</span>
          </span>
          <label className="pn-campo--porta">
            <span className="pn-campo__rotulo">Senha da equipe</span>
            <input
              className="pn-campo__escuro"
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </label>
          {erro && <div className="pn-erro" role="alert">{erro}</div>}
          <button className="og-btn og-btn--amarelo" type="submit" disabled={carregando}>
            {carregando ? 'Conferindo…' : 'Entrar no painel'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

⚠️ O caminho `../../../src/lib/adminAccess` sobe de
`painel-app/src/components/` até a raiz do repo e desce em `src/lib/` — é
o MESMO arquivo que `AccessDialog.jsx` do site já importa, sem cópia. Se o
import falhar, confirmar que `painel-app/` está mesmo na raiz do repo
(irmã de `src/`), não dentro dele.

- [ ] **Step 2: Ligar no `App.jsx`**

`painel-app/src/App.jsx`:

```jsx
import React from 'react'
import { LoginOrganizacao } from './components/LoginOrganizacao'

export function App() {
  const [logado, setLogado] = React.useState(() => !!sessionStorage.getItem('scw_org'))

  if (!logado) {
    return <LoginOrganizacao onEntrar={() => setLogado(true)} />
  }
  return <p>Logado! A casca entra na Task 4.</p>
}
```

- [ ] **Step 3: Verificar manualmente**

Run: `npm run dev`, abrir `/painel-app/`.

Expected: formulário de senha aparece. Digitar a senha real do painel
(a mesma de `/organizacao/` hoje) → mostra "Logado! A casca entra na Task
4." Digitar senha errada → mostra "Senha incorreta. Confira e tente de
novo." sem recarregar a página. Sem CSS ainda (Task 6), o formulário
aparece sem estilo — **isso é esperado nesta task**, não é bug.

- [ ] **Step 4: Commit**

```bash
git add painel-app/src/components/LoginOrganizacao.jsx painel-app/src/App.jsx
git commit -m "feat(painel-react): login da organização, reaproveitando adminAccess.js"
```

---

### Task 4: Casca — rail, cabeçalho e troca de vista

**Files:**
- Create: `painel-app/src/components/PainelShell.jsx`
- Modify: `painel-app/src/App.jsx`

**Interfaces:**
- Consumes: nada de rede — é só navegação/estado local.
- Produces: `<PainelShell />` que renderiza rail + cabeçalho + a vista
  ativa; `DESTINOS`, `TITULOS`, `ACENTO_VISTA` exportados para a Task 5
  (Respostas) e futuras vistas importarem sem reescrever.

- [ ] **Step 1: Escrever a casca**

`painel-app/src/components/PainelShell.jsx`:

```jsx
import React from 'react'

export const DESTINOS = ['mesa', 'respostas', 'participantes', 'producao', 'equipe']

export const TITULOS = {
  mesa: ['A mesa', 'onde cada marca está'],
  respostas: ['Respostas', 'dos formulários do site'],
  participantes: ['Marcas', 'com acesso ao cadastro'],
  producao: ['Produção', 'pedidos, arquivos e fotos'],
  equipe: ['Equipe', 'edição e contas'],
}

// Uma cor da paleta fechada por vista, nunca repetida (CLAUDE.md §6.3).
const ACENTO_VISTA = { mesa: 'amarelo', respostas: 'cyan', participantes: 'roxo', producao: 'laranja', equipe: 'marrom' }

const ICONE = {
  mesa: <><path d="M5 20V11" /><path d="M12 20V5" /><path d="M19 20v-6" /><path d="M3.5 20h17" /></>,
  respostas: <><path d="M20 12a7.5 7.5 0 0 1-10.9 6.7L4 20l1.3-4.1A7.5 7.5 0 1 1 20 12Z" /><path d="M9 11h6" /><path d="M9 14.5h3.5" /></>,
  // ⚠️ participantes/producao/equipe ganham ícone real na Fase 2, junto da
  // vista de verdade — copiar de public/painel/index.html na hora, não
  // adivinhar aqui.
  participantes: <circle cx="12" cy="12" r="8" />,
  producao: <rect x="4" y="4" width="16" height="16" />,
  equipe: <path d="M4 12h16" />,
}

function aplicarAcento(vista) {
  const cor = ACENTO_VISTA[vista] || 'amarelo'
  const escura = cor === 'roxo' || cor === 'marrom'
  document.body.style.setProperty('--pn-acento', 'var(--scw-' + cor + ')')
  document.body.style.setProperty('--pn-acento-tinta', 'var(--scw-' + (escura ? 'creme' : 'choco') + ')')
  document.body.style.setProperty('--pn-acento-escuro', 'var(--scw-' + (escura ? 'amarelo' : cor) + ')')
}

export function PainelShell({ vistas, onSair }) {
  const [vista, setVista] = React.useState('respostas') // Fase 1: mesa não existe ainda

  React.useEffect(() => { aplicarAcento(vista) }, [vista])

  const [titulo, sub] = TITULOS[vista] || TITULOS.respostas
  const Vista = vistas[vista]

  return (
    <>
      <nav className="pn-rail" aria-label="Seções do painel">
        <img className="pn-rail__selo" src="/images/logo-seal-sweet-coffee.svg" alt="Sweet & Coffee Week" />
        {DESTINOS.map((d) => (
          <button
            key={d}
            className={'pn-rail__btn' + (d === vista ? ' is-ativa' : '')}
            type="button"
            title={TITULOS[d][0]}
            onClick={() => setVista(d)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {ICONE[d]}
            </svg>
          </button>
        ))}
      </nav>

      <header className="pn-cabeca">
        <img className="pn-cabeca__marca" src="/images/logo-seal-sweet-coffee.svg" alt="Sweet & Coffee Week" />
        <div className="pn-cabeca__texto">
          <p className="pn-cabeca__titulo">{titulo}</p>
          <p className="pn-cabeca__sub">{sub}</p>
        </div>
        <div className="pn-cabeca__dir">
          <button className="pn-cabeca__btn" type="button" aria-label="Sair" onClick={onSair}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8.6 17.6 15 11l-6.4-6.6" /><path d="M15 11H3.4" /><path d="M18.6 4.4v13.2" />
            </svg>
          </button>
        </div>
      </header>

      <main className="og-corpo">
        {Vista ? <Vista /> : <p>Em construção — chega na Fase 2.</p>}
      </main>
    </>
  )
}
```

⚠️ `vistas` é um objeto `{ respostas: ComponenteRespostas }` passado de
fora (Task 5 registra a própria vista aqui) — a casca nunca importa uma
vista diretamente, pra não criar dependência circular quando a Fase 2
adicionar as outras quatro.

- [ ] **Step 2: Ligar no `App.jsx`**

```jsx
import React from 'react'
import { LoginOrganizacao } from './components/LoginOrganizacao'
import { PainelShell } from './components/PainelShell'

export function App() {
  const [logado, setLogado] = React.useState(() => !!sessionStorage.getItem('scw_org'))

  if (!logado) {
    return <LoginOrganizacao onEntrar={() => setLogado(true)} />
  }

  function sair() {
    sessionStorage.removeItem('scw_org')
    setLogado(false)
  }

  return <PainelShell vistas={{}} onSair={sair} />
}
```

(`vistas={{}}` é temporário — Task 6 substitui por
`{ respostas: Respostas }`.)

- [ ] **Step 3: Verificar manualmente**

Run: `npm run dev`, logar, confirmar: rail com 5 botões aparece, clicar
em cada um troca o título/subtítulo do cabeçalho, clicar em "Sair" volta
pro login. Sem CSS ainda, a rail aparece como lista de botões sem
posicionamento — esperado, Task 6 resolve.

- [ ] **Step 4: Commit**

```bash
git add painel-app/src/components/PainelShell.jsx painel-app/src/App.jsx
git commit -m "feat(painel-react): casca com rail, cabecalho e troca de vista"
```

---

### Task 5: Vista Respostas — lógica pura

**Files:**
- Create: `painel-app/src/lib/respostas.js`
- Test: `tests/painel-app-respostas.test.mjs`

**Interfaces:**
- Consumes: nada.
- Produces: `ORIGENS` (objeto com as 3 origens vivas — `participar` já
  saiu do painel de verdade, ver `CLAUDE.md`), `todos(dados)`,
  `filtrados(dados, { aba, status, dias, termo })`, `escapar(s)`,
  `dataCurta(iso)`. Task 6 (componente) consome todas.

- [ ] **Step 1: Escrever os testes que falham**

`tests/painel-app-respostas.test.mjs`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ORIGENS, todos, filtrados, escapar, dataCurta } from '../painel-app/src/lib/respostas.js'

test('ORIGENS tem as três origens vivas, participar não voltou', () => {
  assert.deepEqual(Object.keys(ORIGENS).sort(), ['apoiar', 'contato', 'quero_participar'])
})

test('todos junta as origens e ordena por data, mais recente primeiro', () => {
  const dados = {
    quero_participar: [{ id: 1, created_at: '2026-01-01T00:00:00Z' }],
    apoiar: [{ id: 2, created_at: '2026-06-01T00:00:00Z' }],
    contato: [],
  }
  const r = todos(dados)
  assert.deepEqual(r.map((x) => x.reg.id), [2, 1])
  assert.equal(r[0].origem, 'apoiar')
})

test('filtrados por aba específica só devolve aquela origem', () => {
  const dados = {
    quero_participar: [{ id: 1, created_at: '2026-01-01T00:00:00Z', status: 'novo' }],
    apoiar: [{ id: 2, created_at: '2026-01-01T00:00:00Z', status: 'novo' }],
    contato: [],
  }
  const r = filtrados(dados, { aba: 'apoiar', status: '', dias: null, termo: '' })
  assert.equal(r.length, 1)
  assert.equal(r[0].origem, 'apoiar')
})

test('filtrados por termo de busca casa nome, empresa e e-mail', () => {
  const dados = {
    quero_participar: [{ id: 1, created_at: '2026-01-01T00:00:00Z', status: 'novo', empresa: 'Bolomania' }],
    apoiar: [], contato: [],
  }
  const achou = filtrados(dados, { aba: 'tudo', status: '', dias: null, termo: 'bolo' })
  const naoAchou = filtrados(dados, { aba: 'tudo', status: '', dias: null, termo: 'zzz' })
  assert.equal(achou.length, 1)
  assert.equal(naoAchou.length, 0)
})

test('escapar neutraliza os cinco caracteres perigosos de HTML', () => {
  assert.equal(escapar(`<b>"'&`), '&lt;b&gt;&quot;&#39;&amp;')
})

test('dataCurta formata no padrão dd/mm/aa', () => {
  assert.equal(dataCurta('2026-03-05T00:00:00Z'), '05/03/26')
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node --test tests/painel-app-respostas.test.mjs`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

`painel-app/src/lib/respostas.js`:

```js
/*
 * Vista Respostas — lógica pura, sem DOM. Porta fiel de `public/painel/
 * index.html` (ORIGENS, todos, filtrados, escapar, dataCurta), com
 * `participar` já fora — saiu do painel em 27/08/2026 (ver CLAUDE.md),
 * substituído por `quero_participar`.
 */
export const ORIGENS = {
  quero_participar: {
    rotulo: 'Quero participar', cor: '#01AFCC', rpc: 'get_quero_participar',
    status: ['novo', 'em_analise', 'contatado', 'aprovado', 'nao_selecionado', 'aguardando_cadastro', 'cadastro_completo'],
    titulo: (r) => r.empresa || r.nome,
    meta: (r) => [r.nome, r.cidade, r.tipo].filter(Boolean).join(' · '),
  },
  apoiar: {
    rotulo: 'Apoiar', cor: '#FF4810', rpc: 'get_support_interests',
    status: ['novo', 'em_analise', 'contatado', 'em_negociacao', 'fechado', 'arquivado'],
    titulo: (r) => r.empresa,
    meta: (r) => [r.nome, r.segmento, r.interesse].filter(Boolean).join(' · '),
  },
  contato: {
    rotulo: 'Contato', cor: '#4D257E', rpc: 'get_contact_requests',
    status: ['novo', 'em_analise', 'respondido', 'encerrado'],
    titulo: (r) => r.name,
    meta: (r) => [r.subject].filter(Boolean).join(' · '),
  },
}

const CHAVES_BUSCA = { nome: ['nome', 'name', 'responsavel', 'marca'], empresa: ['empresa', 'marca'], email: ['email'] }

function campo(reg, quais) {
  for (const k of quais) if (reg[k]) return String(reg[k])
  return ''
}

export function todos(dados) {
  return Object.keys(ORIGENS)
    .flatMap((o) => (dados[o] || []).map((r) => ({ origem: o, reg: r })))
    .sort((a, b) => new Date(b.reg.created_at) - new Date(a.reg.created_at))
}

export function filtrados(dados, { aba, status, dias, termo }) {
  const corte = dias ? Date.now() - Number(dias) * 864e5 : null
  return todos(dados).filter(({ origem, reg }) => {
    if (aba !== 'tudo' && origem !== aba) return false
    if (status && reg.status !== status) return false
    if (corte && new Date(reg.created_at).getTime() < corte) return false
    if (termo) {
      const alvo = [campo(reg, CHAVES_BUSCA.nome), campo(reg, CHAVES_BUSCA.empresa), campo(reg, CHAVES_BUSCA.email)]
        .join(' ').toLowerCase()
      if (!alvo.includes(termo.toLowerCase())) return false
    }
    return true
  })
}

export function escapar(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

export function dataCurta(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node --test tests/painel-app-respostas.test.mjs`
Expected: PASS, 6/6.

- [ ] **Step 5: Commit**

```bash
git add painel-app/src/lib/respostas.js tests/painel-app-respostas.test.mjs
git commit -m "feat(painel-react): logica pura da vista Respostas, testada"
```

---

### Task 6: Vista Respostas — componente

**Files:**
- Create: `painel-app/src/components/vistas/Respostas.jsx`
- Modify: `painel-app/src/App.jsx`

**Interfaces:**
- Consumes: `rpc` (Task 2); `ORIGENS`, `filtrados`, `escapar`, `dataCurta`
  (Task 5).
- Produces: `<Respostas />` — sem props, busca os próprios dados
  (a senha vem de `sessionStorage.scw_org`, igual ao arquivo estático).

- [ ] **Step 1: Escrever o componente**

`painel-app/src/components/vistas/Respostas.jsx`:

```jsx
import React from 'react'
import { rpc } from '../../lib/rpc'
import { ORIGENS, filtrados, escapar, dataCurta } from '../../lib/respostas'

export function Respostas() {
  const [dados, setDados] = React.useState(null) // null = carregando
  const [erro, setErro] = React.useState(null)
  const [aba, setAba] = React.useState('tudo')
  const [status, setStatus] = React.useState('')
  const [dias, setDias] = React.useState('')
  const [termo, setTermo] = React.useState('')

  const carregar = React.useCallback(async () => {
    setErro(null)
    const senha = sessionStorage.getItem('scw_org') || ''
    const chaves = Object.keys(ORIGENS)
    try {
      const [valida, ...listas] = await Promise.all([
        rpc('admin_ping', { p_secret: senha }),
        ...chaves.map((k) => rpc(ORIGENS[k].rpc, { p_secret: senha })),
      ])
      if (valida !== true) {
        setErro('A senha desta sessão não vale mais. Saia e entre de novo.')
        return
      }
      const novo = {}
      chaves.forEach((k, i) => { novo[k] = listas[i] || [] })
      setDados(novo)
    } catch (e) {
      setErro(e.message)
    }
  }, [])

  React.useEffect(() => { carregar() }, [carregar])

  const vocabStatus = aba === 'tudo'
    ? [...new Set(Object.values(ORIGENS).flatMap((o) => o.status))]
    : ORIGENS[aba].status

  const itens = dados ? filtrados(dados, { aba, status, dias, termo }) : []
  const contagem = { tudo: 0 }
  Object.keys(ORIGENS).forEach((o) => { contagem[o] = (dados && dados[o] || []).length; contagem.tudo += contagem[o] })

  return (
    <section className="og-vista">
      <ul className="og-abas" role="tablist">
        {[['tudo', 'Tudo', null], ...Object.entries(ORIGENS).map(([k, o]) => [k, o.rotulo, o.cor])].map(([chave, rotulo, cor]) => (
          <li key={chave}>
            <button
              type="button" role="tab" className="og-aba"
              aria-selected={aba === chave}
              onClick={() => { setAba(chave); setStatus('') }}
            >
              {cor && <span className="og-aba__ponto" style={{ background: cor }} />}
              {rotulo} <span className="og-aba__n">{contagem[chave] ?? 0}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="og-filtros">
        <label className="og-campo og-campo--busca">
          <span>Buscar</span>
          <input type="search" placeholder="nome, empresa ou e-mail" value={termo} onChange={(e) => setTermo(e.target.value)} />
        </label>
        <label className="og-campo">
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos</option>
            {vocabStatus.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="og-campo">
          <span>Período</span>
          <select value={dias} onChange={(e) => setDias(e.target.value)}>
            <option value="">Sempre</option>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
          </select>
        </label>
      </div>

      <div>
        {erro && (
          <div className="og-estado" data-tom="erro">
            <h2>Não consegui carregar</h2>
            <p>{erro}</p>
          </div>
        )}
        {!erro && dados && itens.length === 0 && (
          <div className="og-estado">
            <h2>Nenhuma resposta aqui</h2>
            <p>{contagem.tudo === 0 ? 'Ainda não chegou nenhuma resposta.' : 'Nada com esses filtros.'}</p>
          </div>
        )}
        {!erro && dados && itens.length > 0 && (
          <ul className="og-lista">
            {itens.map(({ origem, reg }) => {
              const o = ORIGENS[origem]
              return (
                <li key={origem + ':' + reg.id}>
                  <button type="button" className="og-item">
                    <span className="og-item__cor" style={{ background: o.cor }} />
                    <p className="og-item__nome">{escapar(o.titulo(reg) || '(sem nome)')}</p>
                    <p className="og-item__meta">{escapar(o.rotulo + (o.meta(reg) ? ' · ' + o.meta(reg) : ''))}</p>
                    <span className="og-item__dir">
                      <span className="og-selo" data-novo={reg.status === 'novo' ? '1' : '0'}>{reg.status}</span>
                      <span className="og-item__data">{dataCurta(reg.created_at)}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
```

⚠️ `ROTULO_STATUS` (traduzir `novo` → `Novo` etc.) e o clique que abre a
ficha de detalhe **ficam de fora desta task de propósito** — são Fase 2
(a ficha de detalhe depende de `get_participantes`, que esta fase não
busca). O selo mostra o status cru por enquanto; não é elegante, é
honesto sobre o que falta.

- [ ] **Step 2: Ligar no `App.jsx`**

```jsx
import { Respostas } from './components/vistas/Respostas'

// ...
return <PainelShell vistas={{ respostas: Respostas }} onSair={sair} />
```

- [ ] **Step 3: Verificar manualmente contra o banco de verdade**

Run: `npm run dev`, logar com a senha real.

Expected: a vista Respostas aparece já na vista inicial, com dados reais
das três origens (comparar contagem com `/organizacao/` aberta ao lado —
os números têm que bater). Trocar aba, status, período e busca filtra a
lista sem recarregar a página. Senha errada de propósito (editar
`sessionStorage.scw_org` no devtools para um valor inválido e recarregar)
mostra "A senha desta sessão não vale mais."

- [ ] **Step 4: Commit**

```bash
git add painel-app/src/components/vistas/Respostas.jsx painel-app/src/App.jsx
git commit -m "feat(painel-react): vista Respostas ponta a ponta"
```

---

### Task 7: CSS — paridade visual

**Files:**
- Create: `painel-app/src/styles/painel.css`
- Modify: `painel-app/index.html`

**Interfaces:** nenhuma — é asset estático, sem export JS.

- [ ] **Step 1: Copiar o CSS verbatim**

Abrir `public/painel/index.html`, copiar o conteúdo entre `<style>` (linha
22) e `</style>` (linha 1016) — **sem alterar uma vírgula** — e colar em
`painel-app/src/styles/painel.css` (sem as tags `<style>`/`</style>`, só o
CSS puro).

⚠️ Não resumir, não “limpar”, não remover regra que pareça não usada
nesta fase — vistas que ainda não existem (mesa, participantes, produção,
equipe) usam classes deste mesmo bloco, e cortar por engano é o erro que
o `CLAUDE.md` já documentou uma vez (Fase 10, corte de `.pn-*` que
quebrou o grid da marca).

- [ ] **Step 2: Importar no HTML de entrada**

Em `painel-app/index.html`, dentro de `<head>`, antes do `<script>`:

```html
<link rel="stylesheet" href="/painel-app/src/styles/painel.css" />
```

- [ ] **Step 3: Verificar visualmente**

Run: `npm run dev`, abrir `/painel-app/`, comparar lado a lado com
`/painel/` (produção ou preview) na mesma janela/tela: tela de login,
rail, cabeçalho e lista de Respostas devem parecer PIXEL A PIXEL iguais
(mesma fonte, cor, espaçamento). Testar em 390px (mobile) e desktop —
`CLAUDE.md` §6.14 define os pontos de quebra do site institucional; o
painel tem os próprios em ≤900px (ver `public/painel/index.html`, regras
`@media (max-width:900px)`), que já vêm dentro do CSS copiado.

- [ ] **Step 4: Commit**

```bash
git add painel-app/src/styles/painel.css painel-app/index.html
git commit -m "feat(painel-react): paridade visual, CSS copiado verbatim"
```

---

## O que fica FORA desta Fase 1 (Fase 2+, planos futuros)

- Login e vistas da marca (`hoje`, `cadastro`, `pedidos`, `arquivos`) —
  precisa da lógica de `renovar()`/token refresh que não foi lida em
  profundidade para este plano.
- Vistas `mesa` (kanban), `participantes` (marcas), `produção`, `equipe`.
- Ficha de detalhe, apagar registro, criar acesso, cadastro manual.
- Notificações, push, PWA (manifest/service worker).
- Corte de produção (`vercel.json`, remoção dos 3 arquivos estáticos).

Cada um vira o próprio plano, no mesmo formato deste, quando chegar a vez.
