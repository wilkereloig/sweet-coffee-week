# INSTRUÇÃO — Transformar o painel da organização em app

**Para:** Claude Code, rodando no repositório `site-sweet-coffee-week-home-v2`
**Branch:** `dev/site-completo` (conferir com `git branch --show-current` antes de tocar em qualquer coisa)
**Arquivo-alvo principal:** `public/organizacao/index.html`
**Escopo:** três frentes — casca de aplicativo, instalável na tela inicial, navegação sem recarregar.
**Fora de escopo:** funcionamento offline. Não implementar cache de dados no service worker.

---

## 0. Leia isto antes de abrir qualquer arquivo

Este documento já contém o levantamento do estado atual. **Não refaça a exploração** — o que
está na §2 foi verificado linha a linha em 22/08/2026. Confira apenas o que você for alterar.

Leia também o `CLAUDE.md` do projeto. Ele é a fonte de regra e vence este documento em caso
de conflito. As seções que mais importam aqui: §1 (absolutas), §6.1 (paleta), §6.5
(tipografia), §6.10 (componentes e pisos de toque), §6.14 (responsividade), §6.15
(movimento), §10.4-b (páginas estáticas fora do bundle).

### Regras duras que este trabalho não pode violar

| ⛔ | Regra | Por quê |
|---|---|---|
| 1 | **Não tocar em `src/App.jsx`**, nem nas flags `COMING_SOON_PUBLICATION` / `AWARDS_ONLY_PUBLICATION` / `INSTITUTIONAL_PREVIEW` | A1/A3. O painel é estático justamente para não depender delas |
| 2 | **Nada de `service_role`, `sb_secret_` ou JWT** dentro de `public/` — nem em comentário | `tests/organizacao.test.mjs` reprova por regex |
| 3 | **Exatamente UM bloco `<script>` no arquivo** | O teste assere `SCRIPTS.length === 1`. Registro do service worker vai **dentro** dele |
| 4 | **Toda função nova declarada como `function nome(...)`**, nunca só `const nome = () => {}` | O teste checa declaração, não citação. Arrow em `const` pode não ser reconhecida |
| 5 | **Todo dado vindo do banco passa por `escapar()`** antes de ir para `innerHTML` | Teste dedicado. É a defesa contra XSS num painel que exibe texto livre de terceiros |
| 6 | **Não afirmar gravação antes do servidor confirmar** | Teste dedicado. Ver o alerta da §5.3 — colide com UI otimista |
| 7 | **Barra final em todo link interno** para rota estática (`/organizacao/`, nunca `/organizacao`) | Sem ela a Vercel cai no fallback do SPA e abre a landing |
| 8 | **Service worker registrado em escopo `/organizacao/`**, jamais na raiz | Ver o alerta vermelho da §4.2. Um SW de raiz passa a interceptar o site que está no ar |
| 9 | **Só cores da paleta do §6.1.** Nenhum hex novo | Os tokens já estão resolvidos no `:root` do arquivo |
| 10 | **Alvo de toque mínimo 44px** — no controle real, não na linha que o contém | §6.10 e §10.2 |

### Como o arquivo é verificado

O JS do painel **não passa pelo Vite**. `npm run build` fica verde com o script quebrado —
já aconteceu (um `ReferenceError` por função apagada chegou ao commit). A rede de proteção é
`tests/organizacao.test.mjs`. **Toda função nova precisa entrar na lista do teste.**

E o dev server **nunca serve esta página**: o Vite não faz resolução de índice de diretório
para `public/`. Conferir sempre contra o build:

```bash
npm run build && npx vite preview --port 4173
# abrir http://localhost:4173/organizacao/   ← com a barra
```

---

## 1. O que "parecer um app" significa aqui

Decidido com o Eloi em 22/08/2026. Três coisas, nesta ordem de prioridade:

1. **Casca de aplicativo** — barra de abas fixa embaixo no celular, cabeçalho próprio, e
   **a página não rola: quem rola é a seção ativa, por dentro**. É a mesma lógica que o site
   já usa abaixo de 900px (§6.14).
2. **Instalável na tela inicial** — ícone no celular, abre sem barra do navegador.
3. **Rápido e sem recarregar** — transição entre seções sem piscar, esqueleto no lugar de
   tela em branco, ação que responde na hora.

**Não** entrou: funcionamento offline. Não construa cache de dados. O service worker existe
para tornar o app instalável e para servir a casca, nada além disso.

---

## 2. Estado atual verificado — não precisa levantar de novo

`public/organizacao/index.html`, 38.968 caracteres, 806 linhas. Um `<style>` (linha 10) e um
`<script>` (linha 329), ambos inline. Sem nenhuma dependência externa.

### Estrutura do `<body>`

```
#entrada            .og-entrada        tela de senha (grid place-items:center, 100dvh)
  └ #form-entrada · #senha · #entrada-erro · #btn-entrar

#painel [hidden]
  ├ header.og-topo                     sticky top:0, chocolate, z-index 20
  │   ├ .og-topo__marca (logo) · .og-topo__titulo · .og-topo__sub
  │   └ .og-topo__dir → #btn-atualizar · #btn-sair
  └ main.og-corpo                      padding …80px, max-width 1600px
      ├ #aviso            .og-aviso
      ├ #resumo           ul.og-resumo      cartões de contagem
      ├ section.og-forms  → #forms          "Os formulários"
      ├ #abas             ul.og-abas [role=tablist]   4 origens, pills roláveis
      ├ .og-filtros       #busca · #filtro-status · #filtro-periodo
      └ #area-lista       ul.og-lista > .og-item

#fundo    button.og-fundo [hidden]      véu, z-index 30
#detalhe  aside.og-detalhe [hidden]     gaveta à direita, 560px, z-index 31
  ├ .og-detalhe__topo → #detalhe-titulo · #detalhe-sub · #btn-fechar
  └ .og-detalhe__rolo → #detalhe-corpo
```

### Funções declaradas hoje

`rpc` · `abrirPainel` · `carregar` · `campo` · `todos` · `filtrados` · `montarForms` ·
`montarAbas` · `montarFiltroStatus` · `dataCurta` · `mostrarEstado` · `escapar` · `render` ·
`soDigitos` · `abrirDetalhe` · `salvar` · `fecharDetalhe`

### Tokens já resolvidos no `:root` do arquivo

`--scw-creme` `--scw-bege` `--scw-choco` `--scw-marrom` `--scw-amarelo` `--scw-cyan`
`--scw-roxo` `--scw-magenta` `--scw-laranja` · `--scw-filete` `--scw-borda-campo` ·
`--scw-font` · `--scw-r-card:20px` · `--scw-ease` · `--scw-transicao:200ms` ·
`--trilho:clamp(16px,3vw,40px)`

⚠️ **`--scw-safe-b` NÃO existe neste arquivo.** Ele está em `src/styles/scw-2026.css:62`, que
o painel não importa. Você vai precisar declará-lo (§3.1).

### Assets disponíveis em `public/`

`favicon-sweet.svg` · `favicon-192.png` · `favicon-180.png` · `favicon-96.png` ·
`favicon-48.png` · `favicon-32.png` · `images/logo-seal-sweet-coffee.svg` ·
`fonts/nexa-slab/*.woff2`

⚠️ **Não existe ícone `maskable`.** Ver §4.1.

### `public/manifest.webmanifest` — não serve para o painel

Tem `"start_url": "/"` e `"scope": "/"`, ou seja, instala **o site público**. O painel
precisa de manifest próprio. Não altere o existente.

---

## 3. Etapa 1 — Casca de aplicativo

**Commit:** `feat: casca de aplicativo no painel da organização`

### 3.1 A regra estrutural: a página não rola

Hoje `body` rola inteiro e `.og-topo` é `sticky`. Em app, a casca é fixa e o conteúdo rola
por dentro. Troque para:

```css
:root{
  /* … tokens existentes … */
  --scw-safe-b: env(safe-area-inset-bottom, 0px);
  --og-topo-h: 62px;
  --og-abas-h: 68px;
}

html,body{margin:0;padding:0;height:100%}
body{
  background:var(--scw-creme);color:var(--scw-choco);
  font:500 15px/1.5 var(--scw-font);
  -webkit-font-smoothing:antialiased;
  overflow:hidden;                    /* era overflow-x:hidden */
  overscroll-behavior:none;           /* mata o pull-to-refresh do navegador */
}

/* A casca ocupa a viewport e não rola. */
#painel{
  height:100dvh;
  display:grid;
  grid-template-rows:auto 1fr auto;   /* topo · conteúdo · abas */
}

/* Quem rola é a seção ativa. */
.og-vista{
  overflow-y:auto;
  overscroll-behavior:contain;        /* rolagem não vaza para a casca */
  -webkit-overflow-scrolling:touch;
  scroll-behavior:smooth;
  padding:clamp(20px,3vw,34px) var(--trilho) calc(24px + var(--scw-safe-b));
  max-width:1600px;margin:0 auto;width:100%;
}
.og-vista[hidden]{display:none}
```

⚠️ **`100dvh`, não `100vh`.** No iOS o `vh` conta a barra do Safari e a barra de abas some
atrás dela. O `#entrada` já usa `100dvh` — mantenha a coerência.

⚠️ **`overscroll-behavior:contain` no roleiro é obrigatório.** Sem ele, rolar até o fim da
lista arrasta a casca inteira no iOS e a ilusão de app morre na primeira interação.

### 3.2 Três destinos, não quatro origens

Hoje `#abas` são as **4 origens** de formulário. Isso continua existindo, mas desce um nível.
A navegação da casca passa a ter **três destinos**, que são as três coisas que a organização
faz no painel:

| Destino | id | Conteúdo | Vem de |
|---|---|---|---|
| **Resumo** | `vista-resumo` | `#aviso` + `ul.og-resumo` | já existe |
| **Respostas** | `vista-respostas` | `#abas` (as 4 origens, agora como segmented control) + `.og-filtros` + `#area-lista` | já existe |
| **Formulários** | `vista-formularios` | `section.og-forms` | já existe |

**Não reescreva o conteúdo dessas seções.** Envolva cada bloco existente numa
`<section class="og-vista" id="vista-…">` e mova. O HTML interno permanece idêntico, para
que `montarForms()`, `montarAbas()`, `montarFiltroStatus()` e `render()` continuem achando
os mesmos IDs.

### 3.3 A barra de abas (≤900px)

Espelha a `.scw-abas` do site (`src/components/MobileTabBar.jsx`) — **mesma geometria, mesmo
indicador deslizante, mesmo comportamento**. Não invente uma segunda linguagem de navegação
dentro do mesmo produto.

```html
<nav class="og-abasapp" aria-label="Seções do painel">
  <div class="og-abasapp__grade">
    <span class="og-abasapp__indicador" aria-hidden="true"></span>
    <button class="og-abaapp is-ativa" type="button" data-vista="resumo"       aria-current="page">
      <svg class="og-abaapp__icone" …></svg><span class="og-abaapp__rotulo">resumo</span>
    </button>
    <button class="og-abaapp" type="button" data-vista="respostas">…</button>
    <button class="og-abaapp" type="button" data-vista="formularios">…</button>
  </div>
</nav>
```

```css
.og-abasapp{
  background:var(--scw-choco);
  padding-bottom:var(--scw-safe-b);      /* o notch do iPhone */
  border-top:1px solid rgba(254,240,221,.14);
}
.og-abasapp__grade{
  position:relative;
  display:grid;grid-template-columns:repeat(3,1fr);
  height:var(--og-abas-h);
}
.og-abasapp__indicador{
  position:absolute;top:0;left:0;height:3px;width:calc(100%/3);
  background:var(--scw-amarelo);border-radius:0 0 3px 3px;
  transform:translateX(calc(var(--og-i,0) * 100%));
  transition:transform 300ms var(--scw-ease);
}
.og-abaapp{
  min-height:44px;                        /* piso de toque, §6.10 */
  background:transparent;border:0;cursor:pointer;color:var(--scw-creme);
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;
  opacity:.62;transition:opacity var(--scw-transicao);
}
.og-abaapp.is-ativa{opacity:1;color:var(--scw-amarelo)}
.og-abaapp__icone{width:22px;height:22px;transition:transform 180ms var(--scw-ease)}
.og-abaapp.is-ativa .og-abaapp__icone{transform:scale(1.12)}
.og-abaapp__rotulo{font:700 11px/1 var(--scw-font);text-transform:lowercase}

/* Acima de 900px a barra sai e os destinos vivem no cabeçalho (§6.14). */
@media (min-width:901px){
  .og-abasapp{display:none}
  #painel{grid-template-rows:auto 1fr}
}
```

**Ícones:** três SVGs de traço, `viewBox="0 0 24 24"`, `stroke="currentColor"`,
`stroke-width="1.8"`, `fill="none"`, `stroke-linecap/linejoin="round"` — idênticos em
construção aos do `MobileTabBar.jsx`. Sugestão: resumo = colunas de gráfico; respostas =
balão de conversa; formulários = prancheta. **Não importe `ScwIcon`** — é React e este
arquivo não passa pelo Vite. SVG inline, escrito à mão.

### 3.4 Acima de 900px: os destinos vão para o cabeçalho

A barra de abas é regra de celular (§6.14: "abaixo de 900px a casca vira aplicativo"). No
desktop os mesmos três destinos viram um segmented control dentro de `.og-topo`, à direita da
marca e à esquerda de `.og-topo__dir`. Mesma classe de pill que `.og-aba` já usa, para não
criar um terceiro vocabulário.

O cabeçalho deixa de ser `position:sticky` — na casca em grid ele é a primeira faixa e já
fica parado por construção. **Remova o `position:sticky;top:0`** e o `z-index:20` fica
desnecessário.

### 3.5 O detalhe vira folha no celular

Hoje `.og-detalhe` é uma gaveta de 560px à direita que, abaixo de 900px, vira largura cheia
colada à direita. Em app, o padrão de celular é **folha subindo da base** — e o site já tem
essa peça (`.scw-folha`, do `MobileMenu`), com a geometria descrita no §6.10-b do `CLAUDE.md`.

```css
@media (max-width:900px){
  .og-detalhe{
    top:auto;right:0;left:0;bottom:0;width:100%;
    max-height:88svh;                       /* svh, não vh: teclado aberto não empurra */
    border-radius:30px 30px 0 0;border-left:0;
    animation:ogFolha 340ms var(--scw-ease);
  }
  .og-detalhe.is-fechando{animation:ogFolhaSai 260ms var(--scw-ease) forwards}
  /* Puxador dentro da faixa de topo, como no MobileMenu */
  .og-detalhe__topo{border-radius:30px 30px 0 0;position:sticky;top:0;z-index:1}
}
@keyframes ogFolha{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes ogFolhaSai{to{transform:translateY(100%)}}
```

⚠️ **`.og-detalhe__topo` precisa de `position:sticky`.** Sem isso o botão Fechar sai de cena
junto com a rolagem do conteúdo, e numa folha alta isso é perder a saída do painel. É a
mesma armadilha registrada no §6.10-b.

⚠️ **Fechar é movimento.** `fecharDetalhe()` passa a adicionar `.is-fechando`, esperar 260ms
e só então setar `hidden`. Mesmo padrão do `MobileMenu`. Sem isso a folha desaparece com um
corte e denuncia que não é app.

### 3.6 Navegação entre destinos

Função nova, declarada (regra 4):

```js
function irPara(vista) {
  if (vista === vistaAtual) { /* segundo toque na aba ativa: rolar ao topo */ }
  // 1. trocar hidden entre as .og-vista
  // 2. mover o indicador: grade.style.setProperty('--og-i', indice)
  // 3. aria-current="page" só na aba ativa
  // 4. guardar em sessionStorage: 'scw_org_vista'
  // 5. preservar a posição de rolagem de cada vista ao sair e restaurar ao voltar
}
```

- **Estado inicial:** ler `sessionStorage['scw_org_vista']`; sem valor, abrir em `resumo`.
- **Segundo toque na aba já ativa rola aquela vista ao topo.** É comportamento de app que
  ninguém pede e todo mundo usa.
- **Preservar rolagem por vista.** Voltar para "Respostas" e cair no topo da lista é a
  falha que mais entrega "isto é uma página web".
- **Teclado:** `←`/`→` circulam entre as abas quando o foco está na barra; `Esc` fecha o
  detalhe (já deve existir — conferir).

⚠️ **Não use hash (`#respostas`) para a navegação.** A rota é estática e o hash é território
do router do SPA; mexer nele aqui só cria confusão. `sessionStorage` basta.

---

## 4. Etapa 2 — Instalável na tela inicial

**Commit:** `feat: painel da organização instalável (PWA de escopo próprio)`

### 4.1 Manifest próprio

**Arquivo novo:** `public/organizacao/app.webmanifest`

```json
{
  "id": "/organizacao/",
  "name": "Painel — Sweet & Coffee Week",
  "short_name": "SCW Painel",
  "description": "Área interna da organização do Sweet & Coffee Week.",
  "lang": "pt-BR",
  "dir": "ltr",
  "start_url": "/organizacao/",
  "scope": "/organizacao/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#FEF0DD",
  "theme_color": "#3D1308",
  "icons": [
    { "src": "/favicon-sweet.svg", "type": "image/svg+xml", "sizes": "any",     "purpose": "any" },
    { "src": "/favicon-192.png",   "type": "image/png",     "sizes": "192x192", "purpose": "any" },
    { "src": "/favicon-180.png",   "type": "image/png",     "sizes": "180x180", "purpose": "any" },
    { "src": "/favicon-96.png",    "type": "image/png",     "sizes": "96x96",   "purpose": "any" }
  ]
}
```

⚠️ **`scope` e `start_url` com barra final.** É a mesma armadilha do §10.4-b: sem a barra, o
escopo do app passa a ser a raiz e instalar o painel instala o site.

⚠️ **Não altere `public/manifest.webmanifest`.** São dois apps distintos, com escopos que não
se sobrepõem porque `/organizacao/` é mais específico.

⚠️ **Não há ícone `maskable`** no projeto. No Android o ícone vai aparecer dentro de um
círculo branco em vez de preencher a máscara. Duas saídas, nesta ordem de preferência:
gerar um PNG 512×512 com o selo centralizado em ~80% da área sobre fundo `#3D1308`, salvar
como `public/favicon-512-maskable.png` e declarar com `"purpose": "maskable"`; ou aceitar o
resultado e registrar como pendência. **Se gerar o arquivo, ele precisa existir mesmo** —
`tests/organizacao.test.mjs` verifica que todo asset absoluto citado existe em `public/`.

### 4.2 Service worker — o ponto de maior risco desta tarefa

> 🔴 **ALERTA. Leia duas vezes.**
> O arquivo do service worker **tem que ficar em `public/organizacao/sw.js`** e ser
> registrado a partir dessa pasta. Um service worker registrado na raiz assume escopo `/` e
> **passa a interceptar o site inteiro, inclusive a landing `/em-breve` que está no ar em
> produção**. Um SW mal escrito nesse escopo serve uma versão velha da landing para todo
> mundo e não há como voltar atrás pelo deploy — só desregistrando no navegador de cada
> visitante. O escopo de um SW é a pasta em que ele é servido. Fora de `/organizacao/`, não.

**Arquivo novo:** `public/organizacao/sw.js`

Como offline está **fora de escopo**, o SW é mínimo. Ele existe por dois motivos: satisfazer
o critério de instalabilidade do Chrome (que exige um handler de `fetch`) e servir a casca
rápido numa segunda abertura.

```js
/* Service worker do painel da organização — escopo /organizacao/ apenas.
   NÃO cacheia dado do Supabase. Só a casca. Ver INSTRUCAO §4.2. */
const VERSAO = 'scw-org-v1';
const CASCA = [
  '/organizacao/',
  '/images/logo-seal-sweet-coffee.svg',
  '/fonts/nexa-slab/NexaSlab-Regular.woff2',
  '/fonts/nexa-slab/NexaSlab-Bold.woff2',
  '/fonts/nexa-slab/NexaSlab-xBold.woff2',
  '/fonts/nexa-slab/NexaSlabBlack.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(CASCA)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  /* NUNCA tocar em rede de dados: Supabase passa direto, sempre. */
  if (url.origin !== self.location.origin) return;
  if (e.request.method !== 'GET') return;

  /* O HTML é sempre da rede — senão uma correção no painel nunca chega.
     Cache só como socorro se a rede falhar. */
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/organizacao/')));
    return;
  }

  /* Assets da casca: cache primeiro, rede como reserva. */
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
```

⚠️ **HTML sempre da rede (`network-first`).** Se o HTML vier do cache, uma correção no painel
não chega ao usuário até ele limpar o navegador. Esse é o modo de falha clássico de PWA e é
particularmente cruel aqui, onde o JS é inline no HTML.

⚠️ **Requisição ao Supabase nunca passa pelo SW.** O `return` no primeiro `if` garante isso.
Dado de formulário com PII não pode encostar em `caches`.

### 4.3 Registro — dentro do único bloco `<script>`

```js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/organizacao/sw.js', { scope: '/organizacao/' })
      .catch(function () { /* silêncio: SW é melhoria, não requisito */ });
  });
}
```

Falha de registro **não pode quebrar o painel**. Navegador sem suporte, janela anônima ou
política corporativa devolvem erro — e o painel tem que continuar funcionando como hoje.

### 4.4 `<head>`

```html
<link rel="manifest" href="/organizacao/app.webmanifest">
<meta name="theme-color" content="#3D1308">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="SCW Painel">
<link rel="apple-touch-icon" href="/favicon-180.png">
<link rel="preload" as="font" type="font/woff2" crossorigin
      href="/fonts/nexa-slab/NexaSlab-Bold.woff2">
```

Mantenha o `<meta name="robots" content="noindex, nofollow">` — há teste para ele.

⚠️ **`black-translucent` no iOS faz o conteúdo subir por baixo da status bar.** É o que dá o
acabamento de app, mas exige `padding-top: env(safe-area-inset-top)` no `.og-topo`. Se
preferir evitar o ajuste, use `default` — e aí o topo não precisa de nada.

### 4.5 `vercel.json`

O SW precisa nunca ser cacheado pelo CDN, senão uma versão nova demora a assumir:

```json
{
  "source": "/organizacao/sw.js",
  "headers": [{ "key": "Cache-Control", "value": "no-store, max-age=0, must-revalidate" }]
}
```

Acrescente ao array `headers` existente. **Não mexa nos rewrites** — o de `/organizacao` já
está lá e é rede de segurança.

---

## 5. Etapa 3 — Rápido e sem recarregar

**Commit:** `feat: transições e estados de carregamento no painel`

### 5.1 Transição entre destinos

```css
.og-vista{animation:ogEntra 220ms var(--scw-ease)}
@keyframes ogEntra{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
```

Só `opacity` e `transform` — nunca propriedade que cause layout (§6.15, regra 3). E o
`@media (prefers-reduced-motion:reduce)` que já existe no arquivo, no fim do `<style>`, já
zera tudo isso: confira que a regra `*{animation:none!important;transition:none!important}`
continua **depois** de tudo que você acrescentar.

### 5.2 Esqueleto no lugar de tela em branco

Hoje `mostrarEstado()` mostra texto. Enquanto `carregar()` está em voo, a lista deve mostrar
**a forma do conteúdo**, não uma frase:

```css
.og-esqueleto{display:flex;flex-direction:column;gap:10px}
.og-esqueleto li{
  height:74px;border-radius:14px;
  background:linear-gradient(90deg,
    rgba(61,19,8,.05) 25%, rgba(61,19,8,.09) 37%, rgba(61,19,8,.05) 63%);
  background-size:400% 100%;
  animation:ogBrilho 1400ms ease-in-out infinite;
}
@keyframes ogBrilho{from{background-position:100% 0}to{background-position:0 0}}
```

Altura de 74px porque é a altura real de um `.og-item` (padding 14px + conteúdo). Esqueleto
com altura errada faz o conteúdo pular quando chega — que é pior que a tela branca.

Função nova: `function montarEsqueleto(quantos)`, chamada por `carregar()` antes do `await`.

### 5.3 Atualização otimista de status — e o limite dela

Aqui há uma tensão real, e ela é o ponto mais delicado desta etapa.

"App-like" pede que mudar o status responda na hora. A regra 6 do projeto diz que **nada
afirma gravação sem o servidor confirmar** — e há teste para isso. As duas coisas convivem,
desde que a distinção esteja clara:

| Pode | Não pode |
|---|---|
| Pintar o novo status no item **na hora**, com aparência de "em trânsito" (opacidade .6, ou spinner discreto no selo) | Mostrar **"Salvo."** antes do retorno da RPC |
| Fechar a folha imediatamente e deixar a gravação terminar em segundo plano | Remover o item da lista filtrada antes de confirmar |
| Reverter o item ao valor anterior se a RPC falhar, com aviso em `#aviso` | Falhar em silêncio |

Ou seja: **antecipe a aparência, nunca a afirmação.** `salvar()` mantém a ordem atual — guarda
o retorno, confere, só então declara sucesso. O que muda é que a UI não fica travada
esperando.

Se ficar difícil garantir isso sem quebrar o teste, **faça a versão simples**: mantenha
`salvar()` como está e ganhe a sensação de velocidade só com o esqueleto e as transições.
Otimismo mal feito num painel que decide aprovação de marca é pior que lentidão.

### 5.4 Recarregar ao voltar para o app

Comportamento de app: você volta e os dados estão frescos.

```js
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'visible' && entrou && Date.now() - ultimaCarga > 60000) {
    carregar();
  }
});
```

Sessenta segundos de folga para não disparar RPC a cada troca de aba do navegador.
`#btn-atualizar` continua existindo — atualização manual explícita não sai.

### 5.5 Feedback tátil e sonoro: não

Nada de `navigator.vibrate` nem som. É painel interno usado em escritório; vibração aqui é
adorno, e adorno sem função sai (§6.13).

---

## 6. Testes

`tests/organizacao.test.mjs` tem 11 checagens hoje e **todas precisam continuar passando**.
Acrescente:

```js
test('as funções da casca de app estão declaradas', () => {
  ['irPara', 'montarEsqueleto', 'montarAbasApp'].forEach((f) => {
    assert.match(JS, new RegExp('function\\s+' + f + '\\s*\\('), 'função não declarada: ' + f)
  })
})

test('o service worker tem escopo próprio e não é da raiz', () => {
  assert.match(JS, /register\(\s*['"]\/organizacao\/sw\.js['"]/, 'SW fora de /organizacao/')
  assert.match(JS, /scope:\s*['"]\/organizacao\/['"]/, 'registro sem scope explícito')
})

test('o manifest do painel tem escopo próprio, com barra final', () => {
  const m = JSON.parse(readFileSync(new URL('../public/organizacao/app.webmanifest', import.meta.url)))
  assert.equal(m.scope, '/organizacao/')
  assert.equal(m.start_url, '/organizacao/')
})

test('o service worker não cacheia dado do Supabase', () => {
  const sw = readFileSync(new URL('../public/organizacao/sw.js', import.meta.url), 'utf8')
  assert.ok(!/supabase/i.test(sw), 'o SW menciona supabase — dado com PII não pode ser cacheado')
  assert.match(sw, /origin\s*!==\s*self\.location\.origin/, 'falta o corte de origem externa')
})

test('o SW não é cacheado pelo CDN', () => {
  const v = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
  const h = v.headers.find((x) => x.source === '/organizacao/sw.js')
  assert.ok(h, 'sem header de no-store para o service worker')
})
```

E **acrescente `irPara`, `montarEsqueleto` e `montarAbasApp` à lista da checagem de funções
críticas que já existe** (a do teste 'toda função crítica está declarada, não só chamada').

Rodar, nesta ordem:

```bash
npm run build
node --test tests/organizacao.test.mjs
node --test tests/quero-participar.test.mjs
node --test tests/redesign-2026.test.mjs
```

---

## 7. Checklist de aceite

Verificar **contra o build** (`vite preview`), nunca contra `npm run dev`.

**Casca**
- [ ] `/organizacao/` abre; `/organizacao` (sem barra) também, pelo rewrite
- [ ] A página não rola. Rolar a lista até o fim não arrasta a casca
- [ ] Barra de abas visível em 390px, **ausente** em 1024px
- [ ] Em 390×844: nada cortado, sem rolagem horizontal, todos os controles ≥44px
- [ ] Trocar de aba preserva a rolagem da aba anterior
- [ ] Segundo toque na aba ativa rola ao topo
- [ ] Detalhe sobe como folha no celular, gaveta no desktop; fecha com movimento
- [ ] Botão Fechar continua visível ao rolar a folha até o fim
- [ ] `Esc` fecha o detalhe; véu fecha o detalhe
- [ ] `prefers-reduced-motion` ligado: nada anima e tudo continua utilizável

**Instalável**
- [ ] DevTools → Application → Manifest sem erro, escopo `/organizacao/`
- [ ] DevTools → Application → Service Workers: **um** SW, escopo `/organizacao/`
- [ ] Abrir `/` (a landing) e confirmar que **nenhum** SW está ativo ali
- [ ] Chrome oferece instalar; instalado, abre sem barra de endereço
- [ ] iPhone: "Adicionar à Tela de Início" com ícone e nome corretos
- [ ] Editar um texto do painel, rebuildar, recarregar: **a mudança aparece** (HTML da rede)

**Sem recarregar**
- [ ] Enquanto carrega aparece esqueleto, não tela branca
- [ ] O conteúdo não pula quando os dados chegam
- [ ] Sair do app e voltar depois de 1 min recarrega sozinho
- [ ] Salvar status só diz "Salvo." depois do retorno da RPC
- [ ] Falha de rede ao salvar reverte a aparência e avisa

**Não regressão** *(o painel está em produção — isto não é opcional)*
- [ ] Login com senha errada, certa e campo vazio: mesmas quatro mensagens de antes
- [ ] As 4 origens carregam, com as contagens do resumo batendo
- [ ] Busca, filtro de status e filtro de período funcionam como antes
- [ ] Abrir detalhe, mudar status, anotar e salvar: grava e reflete na lista
- [ ] "Os formulários" continua com link só onde há link real
- [ ] `Sair` limpa `sessionStorage` e volta para a tela de senha

---

## 8. Ordem de trabalho

Um commit por etapa, build entre cada um. Se qualquer etapa quebrar um teste existente,
**pare e mostre o erro** — não siga para a próxima.

1. `feat: casca de aplicativo no painel da organização` — §3
2. `feat: painel da organização instalável (PWA de escopo próprio)` — §4
3. `feat: transições e estados de carregamento no painel` — §5
4. `test: cobre casca de app e service worker do painel` — §6
5. `docs: registra a casca de app do painel no CLAUDE.md` — §10.4-b ganha o parágrafo do
   service worker e do escopo; §9 deste documento vira a nota de armadilha

Commitar **só** os arquivos desta tarefa. O repositório tem trabalho em andamento não
relacionado — `src/data/sweetCoffeeHistory.js` está modificado e não commitado há tempo, e
não é seu.

**Não fazer merge para `master`. Não rodar `vercel --prod`.** (A1, A2.)

---

## 9. Armadilhas desta tarefa, para o `CLAUDE.md`

Ao terminar, acrescente ao §10.4-b:

> ⚠️ **Service worker tem escopo de pasta.** O do painel vive em `public/organizacao/sw.js` e
> é registrado com `scope: '/organizacao/'`. Registrado na raiz, ele passaria a interceptar a
> landing que está no ar — e desfazer isso exige desregistro no navegador de cada visitante,
> não deploy.
>
> ⚠️ **HTML do painel é sempre `network-first`.** Como o JS é inline no HTML, cachear o
> documento congela o painel inteiro na versão antiga.
>
> ⚠️ **O SW nunca vê requisição ao Supabase.** Corte por origem no primeiro `if` do handler de
> `fetch`. Dado de formulário tem PII e não pode encostar em `caches`.
>
> ⚠️ **Dois manifests, escopos disjuntos.** `/manifest.webmanifest` instala o site;
> `/organizacao/app.webmanifest` instala o painel. Barra final nos dois campos de escopo.
