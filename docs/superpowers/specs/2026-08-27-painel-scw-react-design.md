# Painel SCW — reescrita em Vite/React

**Data:** 27/08/2026 · **Branch:** `dev/site-completo` · **Estado:** aprovado (arquitetura) — plano de execução ainda não escrito

## O problema

O Painel SCW (`public/organizacao/`, `public/marca/`, unificados em `public/painel/`
desde a Fase 9) é HTML/JS vanilla — sem build, sem módulo, sem framework. Fazia
sentido quando era um gate de senha simples. Hoje é um PWA completo: login duplo
(organização por senha única, marca por Supabase Auth), 9 vistas, kanban, upload
de arquivo assinado, push notification, service worker.

O tamanho já superou a técnica. Prova concreta, desta mesma sessão: um `;`
faltando entre duas IIFEs (`})()(function(){...})()`) derrubou o painel inteiro
em produção — bug de classe que não existe com módulos de verdade
(`import`/`export`). Outros custos documentados no `CLAUDE.md` do projeto:
`escapar()` manual em todo texto do banco (React escapa sozinho), três cópias
quase idênticas do mesmo código entre `organizacao`/`marca`/`painel`, e uma
regressão real de CSS sem escopo (`.pn-*` cortado por engano numa "dedup",
achado só ao medir `getComputedStyle` de verdade).

## Decisões tomadas

| Pergunta | Decisão |
|---|---|
| Tecnologia | Vite + React — mesma stack do site, zero dependência nova |
| Fica dentro do bundle do site (`App.jsx`)? | **Não.** Entry Vite separado, pra não cair no gate `COMING_SOON_PUBLICATION` |
| Roteamento interno | Sem lib nova — nem React Router, nem o `router.js` do site: estado local de "vista atual" basta (é o que `hidden` já faz hoje) |
| Nível de "parecer app" | **PWA polida.** Sem ambição de empacotar nativo (Capacitor/Expo) por ora |
| Escopo do redesign | **Paridade visual.** Troca de motor, não redesign — aprimora função, não aparência |
| Estratégia de corte | **Tudo de uma vez.** As 9 vistas prontas e testadas antes de qualquer coisa ir ao ar; um corte só no `vercel.json` |
| Gerência de estado | Nenhuma lib — `useState`/`useContext` |
| Autenticação | Mesma de hoje: `pode_organizacao`/`admin_ping` (org) e Supabase Auth de verdade (marca) |
| PWA | Manifest + service worker + push são portados, não recriados |

### Por que nem React Router, nem lib nova de rota

O `CLAUDE.md` do projeto já baniu React Router pro site inteiro — o motivo
(§4.1) é ter **uma** forma de navegar no repositório, não duas. Dar ao painel
um roteador diferente do resto seria abrir uma segunda convenção onde já existe
regra contra isso. E nem precisa: hoje trocar de vista já é só alternar
`hidden` num `<div>` — vira `useState` + render condicional, sem framework.

### Descartado

- **Empacotar nativo agora** (Capacitor/Expo) — fica como possibilidade
  futura, fora do escopo aprovado aqui.
- **Migração incremental**, painel novo ao lado do antigo por vista — a
  decisão foi tudo de uma vez, corte único.
- **Redesenhar o visual no processo** — é troca de tecnologia por baixo, a
  aparência de hoje (paleta por vista, rail, kanban) se mantém.

## Arquitetura

### 1. Onde o novo painel vive

Novo entry Vite — caminho exato (`painel-app/`, `src-painel/`, outro) fica pro
plano de execução — com `index.html` e `main.jsx` próprios, registrado em
`vite.config.js` via `build.rollupOptions.input` (multi-page nativo do Vite,
sem plugin extra). Fica fora de `src/App.jsx`, `src/router.js` e de qualquer
checagem de `COMING_SOON_PUBLICATION`/`INSTITUTIONAL_PREVIEW` — a mesma
independência que a versão estática tem hoje (§10.4-b do `CLAUDE.md`).

### 2. As 9 vistas

Organização (5): mesa, respostas, marcas, produção, equipe.
Marca (4): hoje, cadastro, pedidos, arquivos.

Cada uma vira componente React. O que hoje é montado por concatenação de
string (`'<li>' + escapar(x) + '</li>'`) vira JSX — e a disciplina manual de
`escapar()` em todo texto vindo do banco deixa de ser necessária: é garantia
estrutural do React, não convenção que alguém pode esquecer.

### 3. Navegação

Componente raiz guarda `vista` como estado local, troca por clique no
rail/abas. O que `ver(qual)`/`irPara()` fazem hoje manipulando `hidden` vira
render condicional — sem lib.

### 4. Autenticação — mesma lógica, casca nova

- **Organização:** `pode_organizacao(p_secret)`, sessão em
  `sessionStorage.scw_org`. Mecanismo idêntico, vira hook (`useOrgSession`) em
  vez de função solta no `<script>`.
- **Marca:** Supabase Auth de verdade (e-mail sintético
  `<slug>@marcas.…`), sessão em `sessionStorage.scw_marca`. **A chave não
  muda** — é a mesma que `AccessDialog.jsx` do site já escreve; o hand-off
  site → painel que já existe continua funcionando sem alteração.
- **`deve_trocar_senha`** (primeiro acesso) continua travando — vira parte do
  fluxo de login React em vez de checagem solta no boot.

### 5. Dados

Mesmas RPCs (`get_participantes`, `get_ficha_participacao`,
`apagar_registro`, etc.). A camada de acesso vira um cliente pequeno
(`painelApi.js`) espelhando o `rpc()` atual, seguindo o padrão que o resto do
projeto já usa (§4.1): lib pura, função de rede injetada, testável sem mock de
`fetch` espalhado.

### 6. Visual — paridade, não redesign

Reaproveita: paleta de 9 cores (§6.1), cores por vista cíclicas (Fase 10),
Nexa Slab, rail 72px desktop / abas mobile, kanban de 6 etapas. Os tokens
`--pn-acento`/`--pn-acento-tinta`/`--pn-acento-escuro` migram de CSS solto pra
CSS escopado por componente — fim da guerra de especificidade que já causou
pelo menos uma regressão real documentada no `CLAUDE.md` (Fase 10, o corte de
`.pn-*` que quebrou o grid da marca).

### 7. PWA

- `manifest.webmanifest` do painel — mesmo `start_url`/`scope: /painel/`, só
  muda de onde é servido.
- Service worker — mesma estratégia (`network-first` pro HTML,
  `no-store` no `vercel.json`).
- Push (VAPID) — chaves e Edge Function `enviar-push` não mudam; só quem
  registra a assinatura (`pushManager.subscribe`) vira hook React.

### 8. Testes

`tests/organizacao.test.mjs`, `tests/marca.test.mjs`, `tests/painel.test.mjs`
testam TEXTO do HTML/JS bruto via regex — não fazem sentido pra componente
React (a garantia que eles checam manualmente, como escape de XSS, passa a
ser estrutural). Precisam de equivalente novo que valide o que ainda é
frágil por natureza (nomes de RPC usados, formato de manifest/SW, VAPID) —
detalhe pro plano de execução, não pra este documento.

### 9. Corte

Só depois das 9 vistas prontas e testadas (rodando local, sem estar publicado):

1. `vercel.json` — rewrites de `/organizacao`, `/marca`, `/painel` passam a
   apontar pro HTML do novo entry.
2. `public/organizacao/index.html`, `public/marca/index.html`,
   `public/painel/index.html` saem do repositório (ou viram redirect puro,
   se `/organizacao/`/`/marca/` continuarem como "porta" — ver item em
   aberto abaixo).
3. Deploy segue a regra do projeto (A2): preview primeiro, produção só com
   confirmação explícita, de novo.

## Em aberto (decidir no plano de execução)

- Nome exato da pasta do novo entry.
- Se `/organizacao/` e `/marca/` continuam como "porta" de redirecionamento
  (padrão atual, §10.4-b) ou saem de vez — o motivo histórico que criou essa
  porta (duas telas de login separadas) deixa de existir com o painel
  unificado nascendo direto em React.
- Formato exato dos testes que substituem os três arquivos atuais.
- Ordem de construção das 9 vistas dentro do "tudo de uma vez" — a
  estratégia de release já está decidida, a ordem de trabalho não.
