# Painel SCW (React) — mapa técnico

Documento de referência pra estudo/IA. Estado do código em `dev/site-completo`,
commit `a86a107`. Não é regra de projeto (isso é `CLAUDE.md`) — é fotografia
de arquitetura pra quem vai planejar o próximo passo.

Se este arquivo divergir do código, vale o código.

---

## 1 · O que é

Painel único (organização + marca participante) que substituiu 3 páginas HTML
estáticas antigas (`public/organizacao/`, `public/marca/`, `public/painel/`).
Reescrito em React/Vite, vivendo em `painel-app/` — **entry Vite separado**
do site institucional, não usa `src/App.jsx` nem o router do site
(`src/router.js`), não passa pela flag `COMING_SOON_PUBLICATION`.

Rotas servidas (via rewrite, ver §5): `/organizacao`, `/marca`, `/painel`
(com e sem barra final) — as três apontam pro MESMO bundle. Não há distinção
de comportamento por rota; quem decide o que aparece é a sessão gravada em
`sessionStorage` (login de organização vs. login de marca), não a URL.

## 2 · Árvore de arquivos

```
painel-app/
  index.html              entry HTML do bundle Vite (title, manifest, theme-color)
  src/
    main.jsx              registra o SW, monta <App/>
    App.jsx                114 linhas — máquina de estados, único roteador
    styles/painel.css      CSS do painel (tokens --scw-* + --pn-* por vista)
    components/
      BoasVindas.jsx        58  tela de escolha org/marca
      LoginOrganizacao.jsx  60  senha única (adminAccess.js)
      LoginMarca.jsx        90  nome do estabelecimento + senha (marcaAccess.js)
      DefinirSenha.jsx      85  troca obrigatória no 1º acesso da marca
      PainelShell.jsx       168 casca da organização: rail, cabeça, roteia vistas
      PainelMarcaShell.jsx  115 casca da marca: rail, cabeça, roteia vistas
      VistaCabeca.jsx        28 cabeçalho colorido reusável (disco+ícone+título)
      Folha.jsx              57 drawer genérico (detalhe, formulário)
      NotificacoesOrg.jsx    93 sino + badge + lista (organização)
      Credenciais.jsx        42 exibição única de senha gerada (copiar/whatsapp)
      vistas/                    (organização — 5)
        Mesa.jsx           181 kanban de 6 etapas
        Respostas.jsx      333 3 origens (quero_participar/apoiar/contato)
        Marcas.jsx         327 lista + ficha + cadastro manual de marca
        Producao.jsx       737 agenda de fotos, pedidos, arquivos
        Equipe.jsx         483 edição atual, contas, push
      vistas-marca/               (marca — 4)
        Hoje.jsx           169 vendas do dia + pendências do cadastro
        Cadastro.jsx       506 os 5 blocos (marca/tema/itens/preço/unidades)
        Pedidos.jsx        101 lista somente-leitura
        Arquivos.jsx       262 downloads assinados + config de push
    lib/                        (lógica pura, sem DOM — testada isolada)
      rpc.js               55  rpc()/chamarFuncao() — PostgREST + Edge Functions
      marcaApi.js          129 auth()/renovar()/api()/assinarDownload() — Auth da marca
      painelFormat.js      53  formatação (data, preço, prazo, selo de acesso)
      mesa.js              50  ETAPAS + colunasMesa()
      respostas.js         134 ORIGENS (3 fontes) + camposDetalhe + rótulos
      participantes.js     96  ficha, cadastro manual de marca
      producao.js          64  agenda/pedidos/arquivos (organização)
      avisos.js            16  push (organização)
      hoje.js              23  blocosPendentes (reexporta de cadastro.js)
      cadastro.js          113 progresso do cadastro, preço BR, agenda vagas
      pedidosMarca.js       45 prazoTexto
      notificacoes.js       72 notificações derivadas (marca)
```

Total: **4.859 linhas** em `painel-app/src` (JS+JSX), 27 arquivos.

**Reaproveitado do site institucional, não duplicado:**

| Lib | Caminho | Usado por |
|---|---|---|
| `adminAccess.js` | `src/lib/adminAccess.js` | `LoginOrganizacao.jsx`, `App.jsx` (`CHAVE_SESSAO`) |
| `marcaAccess.js` | `src/lib/marcaAccess.js` | `LoginMarca.jsx`, `App.jsx`, `marcaApi.js` (`CHAVE_SESSAO`), `AccessDialog.jsx` do site |

Import relativo cruza pra fora de `painel-app/` (`../../../src/lib/...`) — é
intencional, é a mesma regra de fonte única do §5.2 do `CLAUDE.md`: a
slugificação e a lógica de login da marca existem **uma vez só** no repo.

## 3 · Máquina de estados (`App.jsx`)

Sete estados, sem router, sem URL própria — tudo em `React.useState`:

```
boas-vindas ──┬─→ login-org ──────────────→ painel-org
              └─→ login-marca ─→ conferindo-marca ─┬─→ definir-senha ─→ painel-marca
                                                     └─→ painel-marca
```

- **`estadoInicial()`** — decide no boot: sessão de org em `sessionStorage`
  (`scw_org`) → `painel-org` direto; sessão de marca (`scw_marca`) →
  `conferindo-marca` (precisa checar `deve_trocar_senha` antes de decidir pra
  onde vai); nenhuma → `boas-vindas`.
- **`conferindo-marca`** roda **sempre**, não importa se a sessão veio do
  boot ou de um login que acabou de acontecer — é a lição de segurança do
  `CLAUDE.md` §6.10-b item 4 (pular essa checagem puparia a troca de senha
  obrigatória do primeiro acesso).
- Organização não tem tela de "conferindo" — não existe troca de senha
  obrigatória do lado org (senha única, definida por SQL).
- `sairOrg()`/`sairMarca()` limpam a chave de sessão e voltam pra
  `boas-vindas`; `sairMarca()` também chama `auth('logout', ...)` (best-effort,
  não bloqueia o logout local se a rede falhar).

## 4 · Rede — 3 caminhos, cada um com um motivo

| Caminho | Arquivo | Quando usa |
|---|---|---|
| `rpc(nome, corpo)` | `lib/rpc.js` | Organização — toda leitura/escrita passa por função Postgres guardada por `pode_organizacao`/`pode(p_secret, ação)`. Nunca lê tabela direto. |
| `chamarFuncao(nome, corpo)` | `lib/rpc.js` | Edge Functions — `criar-acesso-marca`, `criar-conta-organizacao`, `arquivo-url` (assina upload/download do lado org), `enviar-push`. |
| `api(caminho, opcoes)` | `lib/marcaApi.js` | Marca — PostgREST **direto**, sob RLS (linha) + grants de coluna, autenticada com o token Supabase Auth da própria marca. Sem RPC: a marca lê/escreve as próprias linhas (`participantes`, `participacoes`, `participantes_itens`, `participacao_unidades`, `vendas_diarias`, `sessoes_fotos`, `push_subscriptions`). |

`rpc()` e `chamarFuncao()` usam a **chave publicável fixa** (`SUPABASE_KEY` em
`rpc.js`) — é a mesma chave de todo formulário público do site (RLS nega tudo
pra `anon`, quem abre a porta é `pode_organizacao(p_secret)` dentro da
função). `api()`/`marcaApi.js` usa o **token da sessão autenticada** — nunca
a chave publicável sozinha pra ler/escrever dado de marca.

### RPCs chamadas (organização)

```
admin_ping · get_config_admin · get_participantes · get_ficha_participacao
get_contas_organizacao · get_pendentes_solicitacao · get_solicitacoes_admin
get_arquivos_admin · get_sessoes_fotos
get_quero_participar · get_support_interests · get_contact_requests   (as 3 origens de Respostas)
organizacao_atualizar_registro · organizacao_apagar_registro
criar_solicitacao · marcar_solicitacao · publicar_solicitacao
publicar_arquivo · agendar_sessao_fotos · atualizar_sessao_fotos
abrir_vaga_fotos · fechar_vaga_fotos
definir_edicao_atual · definir_funcao_conta · suspender_conta
registrar_push_organizacao · remover_push_organizacao
```

### Edge Functions

```
criar-acesso-marca      cria usuário Auth da marca (aprovação ou cadastro manual)
criar-conta-organizacao cria conta nominal de organização (e-mail real)
arquivo-url             assina upload/download do bucket privado (lado org)
enviar-push             envia notificação Web Push (VAPID)
```

### PostgREST direto (marca, via `api()`)

```
participantes · participacoes · participantes_itens · participacao_unidades
vendas_diarias · sessoes_fotos (leitura + reserva de vaga) · push_subscriptions
rpc/marca_concluir_cadastro   (única RPC que a marca chama, via api('rpc/...'))
```

## 5 · Build e deploy

- **Entry Vite separado**: `painel-app/index.html` → `painel-app/src/main.jsx`.
  `vite.config.js` declara os dois entries em `build.rollupOptions.input`
  (`main` = site institucional, `painel` = este). Build gera
  `dist/painel-app/index.html`.
- **`vercel.json`** — 6 rewrites, 3 rotas × com/sem barra final, todas →
  `/painel-app/index.html`:
  ```
  /organizacao  /organizacao/  /marca  /marca/  /painel  /painel/
  ```
  (a versão com barra também seria resolvida pelo filesystem do Vercel antes
  das rewrites, mas como os 3 `index.html` estáticos foram apagados — §6 —
  as rewrites explícitas viraram obrigatórias pras 6 formas.)
- **Dev server** — `vite.config.js` tem um plugin `paginasEstaticasDev()`
  dev-only que intercepta `^/(organizacao|marca|painel)/?$` e reescreve
  `req.url` pra `/painel-app/index.html`, espelhando o rewrite de produção
  (sem isso, `npm run dev` serviria a landing/fallback do SPA nessas rotas).

## 6 · O que morreu no corte (Fase 4, commit `f8b2be1`)

Apagados: `public/organizacao/index.html`, `public/marca/index.html`,
`public/painel/index.html` (os 3 HTML/JS vanilla que este painel substitui) e
os testes que liam o conteúdo deles (`tests/organizacao.test.mjs`,
`tests/marca.test.mjs`, `tests/painel.test.mjs`).

**Sobreviveram de propósito** (não apagar — instala antigo depende deles):
`public/organizacao/sw.js` + `app.webmanifest`, `public/marca/sw.js` +
`app.webmanifest`, `public/painel/sw.js` + `app.webmanifest`. Quem já
instalou o ícone antigo na tela de início continua com um SW/manifest que
existe — reinstalar a partir de `/painel/` dá o ícone novo, ninguém decidiu
ainda se isso vira aviso pra equipe (registrado no `CLAUDE.md`).

As invariantes de segurança/infra que esses 3 arquivos protegiam (contrato
da Edge Function, guard de autorização das RPCs, slugificação Edge Function
× `marcaAccess.js`, checagem de sessão antes de renderizar dado) foram
portadas — não descartadas — pra `tests/painel-infra.test.mjs`.

## 7 · PWA

- `painel-app/index.html` referencia `/painel/app.webmanifest` (não um
  manifest próprio de `painel-app/`) + `theme-color #3D1308`.
- `main.jsx` registra `/painel/sw.js` com `scope: '/painel/'`.
- ⚠️ **O comentário em `main.jsx` está desatualizado.** Ele diz "a página é
  servida de `/painel-app/`, o corte ainda não aconteceu" — mas o corte
  (§6) já aconteceu: hoje `/painel/`, `/organizacao/` e `/marca/` são a URL
  real que o navegador vê (o rewrite do Vercel troca o CONTEÚDO servido sem
  mudar a barra de endereço), então o registro do SW com escopo `/painel/`
  **já funciona de verdade** nessas três rotas — não é mais o caso
  "esperado falhar até o corte" que o comentário descreve. Não fere nada
  hoje (o `try/catch` protege os dois casos), mas é comentário morto: quem
  ler vai achar que o SW não está ativo, quando está.

## 8 · Testes

`tests/painel-app-*.test.mjs` (12 arquivos, um por lib pura) + `tests/painel-infra.test.mjs`
(invariantes de segurança/infra sobreviventes do corte). Rodar:

```bash
node --test tests/painel-app-*.test.mjs tests/painel-infra.test.mjs
```

ou via `npm run test:organizacao` (script já aponta pro conjunto certo).
**Não existe teste de componente React** (sem harness no repo) — cobertura é
100% lógica pura (`lib/*.js`) + checagem estrutural de arquivo (regex sobre
texto, sem servidor/browser, no espírito do que já existia pra `sw.js`).

Build de verificação (regra do projeto, §3.2 do `CLAUDE.md`): sempre fora do
projeto —
```bash
npx vite build --outDir "$TEMP/scw_build_check" --emptyOutDir && rm -rf "$TEMP/scw_build_check"
```

## 9 · Cor por vista

Cada vista tem acento cíclico dentro dos 9 tokens fechados do site
(`--scw-*`), nunca repetido no mesmo painel:

- **Organização**: mesa=amarelo · respostas=cyan · marcas=roxo ·
  produção=laranja · equipe=marrom.
- **Marca**: hoje=amarelo · cadastro=cyan · pedidos=laranja ·
  arquivos=roxo.

Escrito em 3 variáveis CSS (`--pn-acento`, `--pn-acento-tinta`,
`--pn-acento-escuro`) pelo `irPara()`/`irParaMarca()` de cada Shell — ver
`CLAUDE.md` §10.4-b "Login de verdade + cor por vista" pra tabela completa e
pro porquê de `--pn-acento-escuro` existir (roxo/marrom não sustentam
leitura sobre chocolate).

## 10 · O que NÃO existe ainda / lacunas conhecidas

- **Nenhuma verificação visual/manual com credenciais reais** foi feita
  neste painel — toda validação até aqui é build + teste automatizado +
  leitura de código. Ninguém navegou logado, nem como organização nem como
  marca, contra dado real.
- **`tests/responsive.mjs` não cobre este painel** — testa as 6 rotas do
  SPA institucional (`.scw-*`), não `/organizacao`, `/marca`, `/painel`. Não
  existe teste responsivo automatizado pro painel hoje.
- **DesignSync nunca rodou sobre este painel** — o Design System sincronizado
  (`9e1564b3-…`) reflete o site institucional, não as telas daqui.
- Comentário stale em `main.jsx` (§7) — cosmético, não funcional.
- Produção: nada disso está publicado. `master` continua só com a landing
  `/em-breve`. Decisão de merge pra `master` é do Eloi, fora de qualquer
  escopo de código (regra absoluta A2 do `CLAUDE.md`).

---

*Gerado em 2026-08-27 pra servir de base ao próximo plano de evolução do
painel. Não é regra viva do projeto — se este arquivo envelhecer, o código
e o `CLAUDE.md` mandam.*
