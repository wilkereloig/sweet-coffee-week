# APLICAR

Este arquivo é a única instrução. A frase que abre o Claude Code é sempre a mesma:

> Leia `handoff/APLICAR.md` e execute.

O bloco **JOB ATUAL** muda a cada entrega. O resto é fixo — é o que este
repositório sempre exige, verificado linha a linha em `public/organizacao/index.html`,
`public/marca/index.html` e nos documentos internos do próprio repo.

---

# JOB ATUAL

**Data:** 2026-08-26
**Artefato:** `handoff/painel-scw.html`
**Destino:** `public/painel/index.html` (criar a pasta)
**Função e visual completos:** `handoff/INSTRUCAO-painel-completo.md` — ler
primeiro. Este arquivo aqui é o mecânico (caminhos, testes, tokens); aquele é
o funcional (as nove vistas, os dois papéis, o que cada botão faz).

Painel unificado da organização e do participante, substituindo os dois painéis
separados. Nove vistas, gaveta com quatro conteúdos, agenda em dois modos,
lançamento diário de combos.

## Antes de tocar em código

1. `git branch --show-current` — trabalhar em `dev/site-completo`, nunca em `master`.
2. Ler `CLAUDE.md` §1 (absolutas), §6.1 (paleta), §6.5 (tipografia), §6.10
   (componentes e piso de toque), §6.14 (responsividade), §6.15 (movimento).
   Ele vence qualquer coisa escrita aqui em caso de conflito.
3. Ler `public/organizacao/index.html` e `public/marca/index.html` inteiros —
   não confiar de memória nas seções abaixo, elas resumem o que foi visto em
   26/08/2026 mas o arquivo real é a fonte.

## As duas coisas que este job NÃO decide sozinho

**Pare e avise o Wilke antes de seguir** — não são detalhe de aplicação, são
decisão de produto/operação:

1. **O modelo de status da marca não bate.** Hoje `participacoes.status_cadastro`
   tem quatro valores (`aguardando_cadastro` · `em_preenchimento` ·
   `cadastro_completo` · `encerrado`, ver `selo()` em `public/marca/index.html`).
   O desenho novo assume seis estágios (Novo → Completo) para 14 marcas. Não
   inventar um mapeamento dos quatro para os seis — perguntar como o Wilke quer
   representar isso, ou se os quatro estados reais bastam e o desenho de seis
   estágios é que deve ceder.
2. **`/organizacao/` e `/marca/` já são apps instalados de verdade**, cada um com
   manifest e service worker de escopo próprio. Substituir o conteúdo deles por
   um redirecionamento (abaixo) é seguro — o HTML é `network-first` nos dois SWs
   atuais, então a correção chega. Mas isso deixa quem já instalou o ícone antigo
   abrindo uma página que não tem mais manifest/SW daquele escopo. Avisar no
   relatório final que quem usa o painel precisa reinstalar a partir de
   `/painel/` — não decidir por conta própria se isso vale um aviso à equipe.

## Trocas

| # | O que | Onde no artefato |
| --- | --- | --- |
| 1 | Caminhos de fonte e do selo | `<head>` |
| 2 | `ico()` → `ScwIcon`, se existir na página; senão deixar | objeto `ICO` no topo do `<script>` |
| 3 | `BASE PEDIDOS ARQUIVOS PRODUCAO CONTAS AGENDA_BASE CORRIDOS` → leitura real | ver "Dados", abaixo |
| 4 | `S.emCurso = false` → data de início da edição aberta já passou | declaração de `S` |
| 5 | `MARCA_ATUAL` → sessão do participante | topo do `<script>` |

`vLogin()` no artefato é referência visual, não a autenticação real. As duas
telas de entrada reais são `public/organizacao/index.html` (senha única
compartilhada, ver §2 do `docs/INSTRUCAO-painel-fase2.md`) e `public/marca/index.html`
(login pelo **nome do estabelecimento**, convertido em e-mail sintético por
`slugificar()` — não é e-mail de verdade, não trocar por um campo de e-mail).
Usar a autenticação de cada um, não a tela do artefato.

### Dados — o padrão real, não Edge Function

As duas páginas reais NÃO chamam Edge Function para leitura. Elas fazem POST/GET
direto no PostgREST do Supabase (`/rest/v1/...`), com a chave publicável (visível
no código, é proposital — quem protege é o RLS) mais o token da sessão. Copiar o
par de funções `auth()`/`api()` que já existe nos dois arquivos reais (renovação
de token antes de expirar, corpo de erro tratado) em vez de inventar uma camada
de dado nova. Edge Function só entra para ação privilegiada (criar acesso, mandar
push) — não para as sete constantes de leitura.

`participante` (atravessa edições: nome, responsável, telefone, e-mail, CNPJ) e
`participação` (desta edição: tema, preço, itens, unidades, fotos) são duas
tabelas distintas desde a migration de 25/08 — não tratar como um objeto só.

## Os cinco blocos do cadastro — nomes reais

Não é um array chamado `BLOCOS`. São cinco `.rotulo` literais no HTML de
`public/marca/index.html`, nesta ordem — usar estes textos, não os do artefato
onde divergirem:

1. **01 · A marca** — nome da marca, responsável, telefone, e-mail, Instagram,
   site, CNPJ (opcional), razão social (opcional)
2. **02 · O tema** — tema escolhido, justificativa
3. **03 · Os três itens** — doce, salgado, bebida; cada um com nome, descrição,
   ingredientes, vegano/sem glúten/sem lactose
4. **04 · Preço** — valor do combo
5. **05 · Onde encontrar** — unidades (endereço, bairro, horário do festival,
   canais de delivery)

Mais: pedidos e prazos (`solicitacoes`), downloads (`arquivos`), sessão de fotos
(`sessoes_fotos`) — cada um já tem uma seção própria em `public/marca/index.html`,
com copy pronta. Reaproveitar o texto real, não o placeholder do artefato.

⚠️ O protótipo (`Painel SCW app.dc.html`) usa OUTROS cinco blocos (A casa/O
doce/O salgado/A bebida/As fotos) — mais simples que o real, sem tema nem
preço, endereço único em vez de unidades repetíveis. Seguir os blocos reais
acima, não os do protótipo. Detalhe em `handoff/INSTRUCAO-painel-completo.md`.

## Infra de app (manifest, service worker, rota) — mesmo padrão de `/organizacao/`

Criar, mirando exatamente `public/organizacao/app.webmanifest` e
`public/organizacao/sw.js` (o service worker é `network-first` no HTML,
nunca vê requisição ao Supabase — copiar essa estrutura):

- `public/painel/app.webmanifest` — `id`/`start_url`/`scope` = `/painel/` (barra
  final nos dois campos de escopo, senão o escopo vira `/` e o painel instala o
  site). Ícones: os mesmos de `/organizacao/` (não existe ícone maskable no
  projeto — mesma pendência já registrada, não recriar a discussão).
- `public/painel/sw.js` — mesmo corte de origem e mesmo `network-first` do HTML
  que `public/organizacao/sw.js` já implementa.
- `vercel.json` → acrescentar ao array `rewrites`: `{ "source": "/painel", "destination": "/painel/index.html" }`;
  acrescentar ao array `headers`: entrada de `no-store` para `/painel/sw.js`
  (mesmo formato das duas entradas que já existem para `/organizacao/sw.js` e
  `/marca/sw.js`). Não tocar nas entradas existentes.
- `/organizacao/index.html` e `/marca/index.html` passam a redirecionar **depois
  do login real de cada um** (não antes): `/organizacao/` → `/painel/#painel=org/mesa`,
  `/marca/` → `/painel/#painel=marca/hoje`. Não apagar `sw.js`/manifest antigos.

## O :root que o painel novo usa — não inventar um quarto conjunto

`public/organizacao/index.html` usa tokens com prefixo `--scw-`; `public/marca/index.html`
usa os mesmos nove tons sem prefixo. O painel novo fecha essa divergência usando
**sempre o prefixo `--scw-`**, e todas as classes novas com prefixo `.pn-`:

```css
--scw-creme:#FEF0DD; --scw-bege:#F8E4C1; --scw-choco:#3D1308; --scw-marrom:#6A2C15;
--scw-amarelo:#FDBB1A; --scw-cyan:#01AFCC; --scw-roxo:#4D257E; --scw-magenta:#F10767; --scw-laranja:#FF4810;
--scw-filete:rgba(61,19,8,.14); --scw-borda:rgba(61,19,8,.22);
--scw-font:'Nexa Slab',system-ui,-apple-system,'Segoe UI',sans-serif;
--scw-r:20px; --scw-ease:cubic-bezier(.22,.9,.24,1); --scw-transicao:200ms var(--scw-ease);
--scw-trilho:clamp(16px,4vw,40px); --scw-safe-b:env(safe-area-inset-bottom, 0px);
```

Nenhum hex fora destes nove tons (`.design-sync/conventions.md` e `CLAUDE.md` §6.1
— a lista é fechada, não é sugestão).

## Verificar

`npm run dev` **não serve** `public/`. Testar sempre contra o build:

```bash
npm run build && npx vite preview --port 4173
# http://localhost:4173/painel/   ← com a barra final
```

Percorrer: os dois setores de acesso, as nove vistas, a gaveta nos quatro
conteúdos, a agenda nos dois modos, o acordeão, o lançamento diário com total
corrido. Nenhum erro no console. DevTools → Application: manifest e SW com
escopo `/painel/`.

## Testes

`tests/organizacao.test.mjs` e `tests/marca.test.mjs` continuam existindo e
continuam tendo que passar enquanto os dois arquivos antigos existirem (mesmo
como redirecionadores, eles ainda são página estática de um script só). Criar
`tests/painel.test.mjs` espelhando as mesmas checagens estruturais que os dois já
fazem (ver tabela de regras do repositório, abaixo) para o arquivo novo. Rodar:

```bash
node --test tests/organizacao.test.mjs tests/marca.test.mjs tests/painel.test.mjs
```

## Não alterar — regras deste desenho

Cada linha corrige um defeito já resolvido no protótipo. Mudar reintroduz o
defeito.

| Regra | Onde |
| --- | --- |
| Notificação é derivada dos dados, nunca string fixa | `notificacoes()` |
| A agenda é dona da data da sessão | `reservaDe()` |
| "Pendente" usa tinta opaca `#6A2C15`, nunca opacidade | `.og-combo svg` |
| "Criar acesso" só de "Aprovadas" (`et >= 3`) para frente | `gavConteudo()`, ramo `ficha` |
| Vaga reservada não fecha por clique no modo "abrir vagas" | `moverSlot()` |
| O badge pulsa três vezes e para | `.pn-badge.is-novo` |

Também não alterar: arquitetura das vistas, cores de prazo, regra dos dois
momentos da edição, estrutura dos cinco blocos do cadastro (nomes reais acima).

Referência de valor: `PATCH-painel-scw.md`. Não é leitura obrigatória.

---

# COMO ESTE HANDOFF FUNCIONA

Vale para toda entrega, não só esta.

## Execute, não avalie

O artefato em `handoff/` é código pronto, testado no navegador. Não é proposta.
Não redesenhe, não reescreva, não ofereça alternativa, não pare para confirmar
o óbvio. Se a tabela de trocas e a de "não alterar" cobrem o caso, siga.

## Formato exigido — não é gosto, é teste

`public/organizacao/index.html` e `public/marca/index.html` são cada um **um
arquivo estático, um `<style>`, um `<script>`, zero dependência externa**. Os
testes do repositório contam os blocos (`SCRIPTS.length === 1`) e reprovam se
houver mais de um. **Nunca separar em CSS/JS externos** — isso não é uma opção
de formato, é uma regra que quebra teste.

## Regras do repositório — valem para qualquer página estática nova

Vieram de `CLAUDE.md`, `docs/COMANDO-claude-code.md` e dos próprios arquivos
reais. Têm teste dedicado; violar uma reprova a suíte, não só "fica errado".

| Regra | Por quê |
| --- | --- |
| Toda função nova é `function nome(...)`, nunca `const nome = () => {}` | o teste verifica declaração, arrow em `const` pode não ser reconhecida |
| Todo dado do banco passa por `escapar()` antes de `innerHTML` | defesa contra XSS — teste dedicado nos dois arquivos |
| Nunca `service_role`, `sb_secret_` ou JWT dentro de `public/`, nem em comentário | teste reprova por regex; a chave publicável é a única que pode aparecer |
| Barra final em todo link/rota interna (`/painel/`, nunca `/painel`) | sem ela a Vercel cai no fallback do SPA |
| Alvo de toque mínimo 44px no controle real, não na linha que o contém | `CLAUDE.md` §6.10/§10.2 |
| Nunca afirmar gravação antes do servidor confirmar (UI otimista só na aparência) | teste dedicado — ver §5.3 de `docs/INSTRUCAO-painel-app-shell.md` |
| Service worker registrado no escopo da própria pasta, nunca na raiz | um SW de raiz intercepta o site inteiro em produção |
| `100dvh`, nunca `100vh`, em tela cheia | iOS conta a barra do Safari no `vh` |

## Só pare por isto

- Um caminho de arquivo que não existe, uma função que o repositório não expõe.
- Uma regra da tabela "não alterar" impossível de honrar.
- **O modelo de dado real diverge do desenho em algo que não é rótulo** — nome de
  tabela, quantidade de estados, campo que não existe. Divergência de rótulo,
  copy ou nome de campo **não** para nada — resolve-se sozinho, usando o rótulo
  real. Divergência de estrutura (quantos estados, quais tabelas) para, sim.
- Qualquer coisa que já exige parar no §4 de `docs/COMANDO-claude-code.md`
  (exclusão definitiva de dado real, prazo de retenção, plano pago, publicar em
  produção ou tornar algo acessível sem login).

## O que nunca vai para você

Arquivos `.dc.html` na raiz do projeto de design são a ferramenta de desenho.
Não rodam no repositório e não são handoff. Se alguém colar um, peça o
artefato de `handoff/`.

## Relatório final

1. Arquivos criados e modificados.
2. Cada troca da tabela: o que era, o que ficou.
3. Rótulos ou campos trocados na conferência contra o arquivo real.
4. Qualquer regra de "não alterar" que precisou ser tocada, e por quê.
5. As duas decisões da seção "não decide sozinho": o que você encontrou, o que
   perguntou, o que ficou pendente.
6. O que você parou de fazer, se parou.
