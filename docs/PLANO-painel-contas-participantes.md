# Plano — Painel funcional com contas de participantes
### Sweet & Coffee Week · agosto/2026

> Este plano foi escrito **depois** de ler o repositório `site-sweet-coffee-week-home-v2`,
> o `contexto-compactado-painel-organizacao.md`, o `schema.sql` e as quatro migrations.
> Ele não propõe um projeto novo: propõe a próxima camada sobre o que já está no ar.

---

## 0. Três premissas que caíram ao ler o repositório

Eu tinha começado a planejar em cima de suposições erradas. Registro o que mudou, porque
cada uma dessas correções elimina trabalho inútil:

| Suposição inicial | Realidade do projeto | Consequência |
|---|---|---|
| Next.js App Router, com Server Actions e Route Handlers para o lado servidor | **Vite + React SPA**, publicado na Vercel. Não existe servidor de aplicação. | Toda operação privilegiada tem que rodar em **Supabase Edge Function** (Deno) — e já existem 4 no repositório, então o padrão está estabelecido. |
| Painel a construir do zero | **Já existe e está em produção**: `public/organizacao/index.html`, 806 linhas, HTML+CSS+JS inline, sem dependência externa, lendo por RPC. | O trabalho é **estender**, não recomeçar. E a restrição de "sem `supabase-js` no painel" já foi decidida e testada. |
| "Participantes" = público inscrito em evento, com credencial e QR na porta | **Participantes = marcas/estabelecimentos** que se pré-cadastram por `/quero-participar/` e são aprovados pela organização. | Todo o desenho de check-in, crachá e QR sai do escopo. O que entra é uma **área da marca**: dados, produto do festival, foto, prazo. |

O que **não** mudou e continua valendo: o problema de criar conta com senha sem que a
senha circule, a modelagem de papéis com RLS, os riscos de LGPD e a operação com o
Supabase no plano gratuito.

---

## 1. O gancho já está no banco

A descoberta que organiza o plano inteiro: o vocabulário de status de `quero_participar`
já termina em **`aguardando_cadastro`**.

```
novo · em_analise · contatado · aprovado · nao_selecionado · aguardando_cadastro
```

Alguém — você, numa sessão anterior — já tinha desenhado o fluxo até a porta da conta e
parado ali. `aprovado` significa "a organização quer esta marca"; `aguardando_cadastro`
significa "falta ela entrar e completar os dados". **Este plano é exatamente o que
acontece depois desse status.**

Fluxo completo, com o pedaço novo em destaque:

```
/quero-participar/ (público)
        │  submit_quero_participar(payload jsonb)
        ▼
   quero_participar · status = novo
        │  organização tria no painel
        ▼
   em_analise → contatado → aprovado
        │
        ▼
┌───────────────────────────────────────────────────────┐
│  NOVO: organização clica "Criar acesso"                │
│  → Edge Function cria usuário no Supabase Auth        │
│  → vincula ao registro (participantes.origem_id)       │
│  → status vira aguardando_cadastro                     │
│  → marca recebe convite por e-mail                     │
└───────────────────────────────────────────────────────┘
        │
        ▼
   marca entra em /marca/ · define a própria senha
   completa o cadastro · envia produto, foto, horário
        │
        ▼
   status = cadastro_completo  →  publicável no site
```

---

## 2. A decisão de arquitetura que trava tudo o mais

Hoje o painel autentica por **senha única compartilhada**: `admin_ok(p_secret)` compara
bcrypt contra `admin_config`, e o front guarda a senha em `sessionStorage['scw_org']`.
Funciona, é simples e foi a escolha certa para um painel de leitura usado por duas pessoas.

Contas de participantes quebram esse modelo, porque agora há **N pessoas de fora** que
precisam ver **apenas o próprio registro**. Senha compartilhada não sabe dizer quem é quem.
Isso obriga a introduzir o Supabase Auth. A pergunta é o que fazer com o painel da
organização depois disso.

### Opção A — Convivência: Auth para as marcas, `admin_ok` continua para a organização

O painel da organização fica exatamente como está. As marcas ganham `/marca/` com Supabase
Auth e RLS por `auth.uid()`.

- **A favor:** zero risco de quebrar o que está no ar. Nenhum teste existente muda. Entrega mais rápida.
- **Contra:** dois mecanismos de autenticação no mesmo banco, cada RPC precisando saber qual dos dois vale. A trilha de auditoria da organização continua dizendo "alguém com a senha", nunca "a Fulana". E continua havendo **um segredo só, compartilhado**: quem sai da organização leva o acesso, e revogar significa trocar a senha de todo mundo.

### Opção B — Unificação: tudo em Supabase Auth, `admin_ok` é aposentado

A organização passa a ter contas nominais (`eloi@...`, etc.) com papel `organizacao`;
`admin_ok` fica vivo durante a transição e é removido depois.

- **A favor:** um mecanismo só. Auditoria com nome. Revogar acesso de alguém que saiu vira uma linha. Resolve o item aberto da senha vazada de graça.
- **Contra:** mexe no que está em produção e verificado. As 8+ RPCs que hoje começam com `if not public.admin_ok(p_secret) then return; end if;` precisam de uma segunda porta de entrada.

### Recomendação: **B, mas em duas etapas**

Fase 1 entrega as contas das marcas (Opção A na prática — nada da organização é tocado).
Fase 2 migra a organização, com `admin_ok` funcionando em paralelo até o último dia.

O truque que torna a Fase 2 barata é substituir o guard das RPCs existentes por um só:

```sql
create or replace function public.pode_organizacao(p_secret text default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    -- porta nova: usuário autenticado com papel de organização
    exists (
      select 1 from public.perfis
       where user_id = auth.uid() and papel = 'organizacao' and ativo
    )
    -- porta velha: senha compartilhada, enquanto durar
    or (p_secret is not null and public.admin_ok(p_secret));
$$;
```

Aí cada RPC troca uma linha (`admin_ok(p_secret)` → `pode_organizacao(p_secret)`) e as duas
formas de entrar convivem sem `if` espalhado. No dia em que a última pessoa migrar, apaga-se
o segundo `or` e a função `admin_ok` junto.

> **Status em 22/08/2026:** a senha do painel **já foi trocada** pelo Eloi, e não está em
> histórico de chat. A troca se faz com uma linha no SQL Editor —
> `select public.set_admin_secret($$nova-senha$$);` — e continua sendo o remédio sempre que
> alguém sair da organização, porque o segredo é um só para todo mundo.

---

## 3. Modelo de dados

Duas tabelas novas. Nada existente é alterado, exceto o `CHECK` de status.

### 3.1 `perfis` — identidade e papel

```sql
create table if not exists public.perfis (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  papel       text not null check (papel in ('organizacao','marca')),
  nome        text not null,
  email       text not null,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now(),
  criado_por  uuid references auth.users(id),
  ultimo_acesso_em timestamptz
);

create index if not exists perfis_papel_idx on public.perfis (papel) where ativo;

alter table public.perfis enable row level security;

-- cada um lê só o próprio perfil
create policy perfis_proprio on public.perfis
  for select to authenticated
  using (user_id = (select auth.uid()));
```

**Por que o papel vive aqui e não em `user_metadata`:** `user_metadata` é gravável pelo
próprio usuário (`updateUser({ data: {...} })` é chamada legítima). Papel em
`user_metadata` significa que qualquer marca pode se promover a organização. Em tabela,
com RLS e escrita só por Edge Function, não pode.

O `(select auth.uid())` entre parênteses não é estilo: envolver a função num subselect faz
o Postgres avaliá-la **uma vez por consulta** em vez de uma vez por linha. Numa listagem de
centenas de registros a diferença é de ordens de grandeza.

### 3.2 `participantes` — a marca no festival

O registro em `quero_participar` é a **candidatura** (imutável, é o que a pessoa enviou).
`participantes` é a **participação** — o que a marca edita depois de aprovada. Separar as
duas é o que impede que editar o cadastro reescreva a candidatura original.

```sql
create table if not exists public.participantes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null unique references auth.users(id) on delete cascade,
  origem_id      uuid unique references public.quero_participar(id) on delete set null,
  edicao         text not null default '2026',

  -- editável pela marca
  nome_marca     text not null,
  responsavel    text,
  telefone       text,
  cidade         text,
  instagram      text,
  site           text,
  produto_nome   text,
  produto_desc   text,
  produto_preco  numeric(10,2),
  foto_path      text,          -- caminho no Storage, nunca URL crua
  endereco       text,
  horarios       jsonb default '{}'::jsonb,

  -- controlado só pela organização
  status         text not null default 'aguardando_cadastro'
                 check (status in ('aguardando_cadastro','cadastro_completo',
                                   'revisao','publicado','suspenso')),
  publicado_em   timestamptz,
  notas_internas text,

  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),

  constraint participantes_edicao_marca unique (edicao, nome_marca)
);

alter table public.participantes enable row level security;
```

**Políticas.** A marca lê e edita a própria linha; a organização vê tudo:

```sql
create policy participantes_marca_le on public.participantes
  for select to authenticated
  using (user_id = (select auth.uid()) or public.pode_organizacao());

create policy participantes_marca_edita on public.participantes
  for update to authenticated
  using  (user_id = (select auth.uid()) and status in ('aguardando_cadastro','revisao'))
  with check (user_id = (select auth.uid()) and status in ('aguardando_cadastro','revisao'));
```

O `USING` decide **qual linha** ela alcança; o `WITH CHECK` decide **como a linha fica
depois**. Os dois precisam do mesmo predicado de status, senão a marca reabre um cadastro
já publicado.

E o bloqueio que RLS sozinha não faz — impedir que a marca escreva `status` ou
`notas_internas` — é `GRANT` de coluna, não policy:

```sql
revoke insert, update, delete on public.participantes from authenticated;
grant select on public.participantes to authenticated;
grant update (nome_marca, responsavel, telefone, cidade, instagram, site,
              produto_nome, produto_desc, produto_preco, foto_path,
              endereco, horarios, atualizado_em)
  on public.participantes to authenticated;
```

Sem isso, um `PATCH` direto no PostgREST com `{"status":"publicado"}` passa pela policy
(é a linha dela, o status é permitido) e a marca se autopublica.

### 3.3 Uma coluna nova em `quero_participar`

```sql
alter table public.quero_participar
  add column if not exists conta_criada_em timestamptz;

alter table public.quero_participar drop constraint quero_participar_status_check;
alter table public.quero_participar add constraint quero_participar_status_check
  check (status in ('novo','em_analise','contatado','aprovado',
                    'nao_selecionado','aguardando_cadastro','cadastro_completo'));
```

### 3.4 Auditoria — append-only

O `contexto-compactado` registra que hoje ninguém é notificado de nada e não há trilha.
Com contas de terceiros no sistema, isso deixa de ser aceitável.

```sql
create table if not exists public.auditoria (
  id           bigint generated always as identity primary key,
  ocorrido_em  timestamptz not null default now(),
  ator_id      uuid references auth.users(id) on delete set null,
  ator_email   text,                    -- redundante de propósito: o log não pode
                                        -- mudar quando a conta muda ou some
  acao         text not null,           -- conta.criada · senha.resetada · status.alterado
  alvo_tabela  text, alvo_id uuid,
  detalhes     jsonb
);

create index auditoria_alvo_idx on public.auditoria (alvo_tabela, alvo_id, ocorrido_em desc);
create index auditoria_tempo_idx on public.auditoria using brin (ocorrido_em);

alter table public.auditoria enable row level security;
-- nenhuma policy de insert/update/delete: só Edge Function escreve.
create policy auditoria_le on public.auditoria
  for select to authenticated using (public.pode_organizacao());
```

Ausência de policy é negação total. É exatamente o que se quer num log.

**Nunca vai para o log:** senha, token, link de convite. Registre *que* o acesso foi
enviado, para quem e quando — nunca o segredo.

---

## 4. Onde a criação de conta roda

Esta é a parte onde o projeto ser Vite e não Next.js muda tudo. Não há Server Action nem
Route Handler. E o repositório tem uma regra dura já testada:

> ⛔ **Não usar `service_role` em nada dentro de `public/`.** O teste reprova o arquivo se a
> string aparecer, inclusive em comentário.

A regra está certa e o lugar da chave secreta é a **Edge Function** — o mesmo padrão das
quatro que já existem (`check-email-domain`, `send-vote-email`, `resend-webhook`,
`sync-brevo-contacts`).

```
supabase/functions/criar-acesso-marca/index.ts
```

Esqueleto, com a ordem das verificações que importa:

```ts
// A chave secreta vive SÓ aqui, em variável de ambiente da função.
// Nunca no bundle, nunca em public/, nunca em .env versionado.
const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

Deno.serve(async (req) => {
  // 1. AUTORIZAR ANTES DE QUALQUER COISA.
  //    Enquanto durar a Fase 1, a porta é a senha do painel.
  const { secret, origem_id, email, nome_marca } = await req.json()
  const { data: ok } = await admin.rpc('admin_ok', { p_secret: secret })
  if (ok !== true) return json({ erro: 'nao_autorizado' }, 401)

  // 2. IDEMPOTÊNCIA. Clicar duas vezes em "Criar acesso" não pode gerar duas contas.
  const jaTem = await admin.from('participantes')
    .select('id').eq('origem_id', origem_id).maybeSingle()
  if (jaTem.data) return json({ erro: 'conta_ja_existe', id: jaTem.data.id }, 409)

  // 3. CRIAR SEM SENHA. A marca define a dela pelo link. Ver §5.
  const { data: u, error } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    email_confirm: true,
    user_metadata: { nome_marca }
  })
  // e-mail já existe = caminho feliz alternativo, não falha:
  // a marca já participou de outra edição. Reaproveita o usuário.

  // 4. PERFIL + PARTICIPANTE + STATUS + AUDITORIA, numa RPC só,
  //    para não sobrar meio-registro se o passo 5 falhar.
  await admin.rpc('vincular_conta_marca', { p_user: u.user.id, p_origem: origem_id })

  // 5. CONVITE. generateLink devolve o link SEM enviar e-mail —
  //    a entrega fica com o seu provedor (o repo já usa Resend/Brevo).
  const { data: link } = await admin.auth.admin.generateLink({
    type: 'recovery', email,
    options: { redirectTo: 'https://www.sweetcoffeeweek.com.br/marca/definir-senha/' }
  })
  await enviarConvite(email, nome_marca, link.properties.action_link)

  return json({ ok: true })
})
```

Quatro detalhes que decidem se isso funciona ou vira dor de cabeça:

- **`generateLink` em vez de `inviteUserByEmail`.** O SMTP embutido do Supabase entrega
  **2 e-mails por hora no projeto inteiro** — inviável para aprovar 30 marcas numa tarde.
  `generateLink` devolve a URL sem mandar nada, e a entrega vai pelo Resend/Brevo que o
  projeto já tem, com log de entrega de verdade.
- **Idempotência pelo `origem_id` `unique`.** É o banco que garante, não o `if` do passo 2.
  O `if` só produz uma mensagem melhor.
- **`email_exists` (422) não é erro.** Marca que participou de 2025 já tem conta. Resolva o
  `user_id` e crie só o `participantes`.
- **Barra final na `redirectTo`.** O `contexto-compactado` já documenta que
  `/organizacao` cai no SPA e `/organizacao/` no painel. Vale igual para `/marca/`, e um
  redirect de convite quebrado é um convite perdido.

E a URL de redirect precisa estar na **allowlist** do projeto (Authentication → URL
Configuration), senão o link cai silenciosamente na Site URL e ninguém entende o que houve.

---

## 5. Conta e senha: como a marca entra

### A escolha central

Três caminhos, e a diferença entre eles é onde a senha existe:

| | Como funciona | O problema |
|---|---|---|
| **(a) Admin digita a senha** | `createUser({ password })` | A senha existe em texto na tela do admin, no WhatsApp do grupo, no print. E o admin passa a saber a senha da marca. |
| **(b) Link de convite, a marca define a senha** | `generateLink` + `updateUser({ password })` | Depende do e-mail chegar. Link expira. |
| **(c) Senha provisória + troca obrigatória** | senha gerada pelo sistema, `deve_trocar_senha = true` | Mesma exposição de (a), mas com dano limitado: morre no primeiro uso. |

**Recomendação: (b) como caminho principal, (c) como resgate.**

Esse é o ponto onde o contexto real do projeto muda a resposta que eu daria para um evento
presencial. Aqui **não há balcão, não há fila, não há dia D**: a marca é aprovada por
e-mail, com semanas de antecedência, e o e-mail dela é o canal de trabalho — é por ele que
a organização já conversa com ela. O argumento que sustentaria a senha provisória (pessoa
na sua frente, sem acesso ao e-mail) simplesmente não existe neste fluxo.

Então: link de convite por padrão. E, quando um convite não chegar — vai acontecer com
domínios corporativos e com e-mail digitado errado — a organização usa o botão **"Gerar
acesso temporário"** na ficha, que cai no caminho (c): senha aleatória exibida **uma vez**
na tela, copiável, com `deve_trocar_senha` ligado e expiração em 48h. O admin dita a senha
por telefone e ela morre no primeiro login.

O que **não** fazer, e que é o modo de falha real deste tipo de painel: gerar `SCW2026!`
para todo mundo e mandar a planilha com e-mail e senha lado a lado no grupo da organização.

### A flag de troca obrigatória mora em tabela, não no JWT

```sql
alter table public.perfis
  add column if not exists deve_trocar_senha boolean not null default false,
  add column if not exists senha_trocada_em timestamptz;
```

Se a flag vivesse em `app_metadata`, ela só sairia do JWT no próximo *refresh* de token — a
marca troca a senha e continua presa no loop de "troque sua senha" até o token renovar. Em
tabela, a leitura é sempre atual.

### Ciclo de vida completo

| Momento | O que acontece |
|---|---|
| Aprovação | Edge Function cria usuário sem senha, envia convite. `aguardando_cadastro`. |
| Primeiro acesso | Define senha em `/marca/definir-senha/`, confere os dados vindos da candidatura, completa o cadastro. |
| Convite não chegou | Organização reenvia (novo link invalida o anterior) ou gera acesso temporário. |
| Esqueceu a senha | `resetPasswordForEmail` — com mensagem **sempre igual**, exista ou não a conta. |
| Perdeu o e-mail | Só a organização corrige, pela ficha, com o valor anterior registrado em auditoria. É tomar posse da conta: exige dupla conferência. |
| Fim da edição | `ban_duration` na conta + `signOut` global. **Não** `deleteUser` — apagar leva junto a integridade do histórico. |

Banir não invalida o token já emitido; ele vale até expirar. Por isso o `signOut` global
sempre acompanha o ban.

### Configuração mínima do Auth

- Comprimento mínimo de senha: **10**. O padrão é 6.
- Exigir **dígitos e letras** — não símbolos. Símbolo obrigatório produz `Senha@2026` e
  chamado de suporte, não segurança.
- **Proteção contra senha vazada** (HaveIBeenPwned): requer plano **Pro**. Ver §7.
- **Desabilitar cadastro público** no Auth. Só a Edge Function cria conta. Isso fecha de
  uma vez a rota mais fácil de descobrir quem está inscrito.
- CAPTCHA (Turnstile) no login — o Supabase suporta nativamente.

---

## 6. Telas

### 6.1 O que muda no painel da organização (`/organizacao/`)

O painel já lista as quatro origens e permite mudar status e anotar. As adições:

- **Botão "Criar acesso"** na ficha de um registro `aprovado`. Estado desabilitado com
  explicação quando o status não permite — não sumir, explicar.
- **Coluna "Acesso"** na listagem de `quero_participar`, com três estados legíveis à
  distância: `—` (sem conta) · `Convite enviado` (com data no tooltip) · `Ativo` (entrou).
  Junto com a coluna de status, isso responde a pergunta que a organização faz o dia todo:
  *"essa marca já está dentro?"*
- **Aba "Participantes"** — a lista das marcas com conta, com o progresso do cadastro
  (produto? foto? horário?) e filtro rápido "cadastro incompleto". É essa lista que diz
  quem precisa ser cobrado na semana antes do festival.
- **Ficha do participante** com: dados atuais, a candidatura original lado a lado (para
  conferir divergência), histórico de auditoria, e as ações — reenviar convite, gerar
  acesso temporário, aprovar cadastro, suspender.
- **Exportar CSV do que está filtrado** — já está na sua lista de próximos passos, e vira
  mais útil ainda com participantes. JS puro, sem trazer `exceljs` de volta.

Restrições do projeto que valem para tudo acima: HTML+CSS+JS inline, sem CDN, barra final
em todo link interno, e **os testes checam declaração de função, não substring** — o JS
dessas páginas não passa pelo Vite, então `npm run build` fica verde com o script quebrado.
Cada função nova precisa de uma linha em `tests/organizacao.test.mjs`.

### 6.2 A área da marca (`/marca/`) — nova

Mesma decisão do painel: **página estática em `public/marca/`**, não rota React. O motivo é
o mesmo que já valeu para `/organizacao/`: o gate `COMING_SOON_PUBLICATION = true` faz
qualquer rota React renderizar só a landing, e a Vercel serve o sistema de arquivos antes
do rewrite do SPA. Página estática funciona **sem tocar na flag** — e portanto sem
antecipar a publicação do institucional.

Diferença de peso em relação ao painel da organização: aqui **é preciso** o `supabase-js`,
porque há sessão de verdade para gerenciar (token, refresh, logout). Os quatro POSTs do
painel da organização dispensavam a biblioteca; um fluxo de autenticação não dispensa.

| Rota | O que é |
|---|---|
| `/marca/` | Login. E-mail + senha, "esqueci minha senha". Erro sempre genérico. |
| `/marca/definir-senha/` | Destino do convite e do reset. Define a senha e segue direto para o cadastro. |
| `/marca/cadastro/` | O formulário do que vai ao site: produto, descrição, preço, foto, endereço, horários. Salva rascunho automaticamente — a marca não perde o preenchimento ao fechar a aba. |
| `/marca/status/` | "Seu cadastro está em revisão" / "publicado". Fecha o ciclo: a marca sabe onde está sem ligar para a organização. |

Duas decisões de conteúdo que economizam suporte:

- **Pré-preencher o cadastro com o que ela já respondeu** em `/quero-participar/`. Ela
  gastou 14 campos ali; pedir tudo de novo é o jeito mais rápido de perder o cadastro.
- **Barra de progresso explícita** ("3 de 5 seções"). O abandono de formulário longo cai
  quando a pessoa vê onde termina.

### 6.3 Fora de escopo, deliberadamente

Área de mensagens marca↔organização (o WhatsApp já resolve), múltiplas edições no mesmo
painel (o modelo prevê `edicao`, a interface não), upload de vídeo, papéis customizáveis,
app nativo, e qualquer coisa de check-in presencial.

---

## 7. Riscos específicos deste projeto

Ordenados por probabilidade × impacto, e cada um ancorado no que eu li no repositório —
não são riscos genéricos.

**1. Plano gratuito: sem backup e com pausa automática.** *(alta × crítica)*
O `contexto-compactado` registra que o projeto **já esteve pausado** e que isso foi
diagnosticado como remoção por engano. No plano Free não há backup diário gerenciado, e o
projeto pausa após ~7 dias de baixa atividade. Enquanto o banco só guarda formulários,
isso é recuperável. **Com contas de terceiros dentro, deixa de ser.** Uma marca que não
consegue entrar na véspera do festival porque o projeto pausou é um problema de reputação,
não técnico.
→ **Subir para o Pro antes de criar a primeira conta.** US$ 25/mês elimina a pausa e liga
o backup diário de 7 dias. É o item mais barato do orçamento e o único que não tem
substituto. Some a isso um `supabase db dump` semanal para fora do Supabase, cifrado — e
um teste de restauração antes do festival, porque backup não testado é esperança, não backup.
→ Atenção ao limite de **2 projetos ativos** na org ELOI STUDIO DESIGN. Restaurar um exige
pausar outro. O `ascendium-ecommerce` já foi pausado por isso uma vez.

**2. Um segredo só, num endpoint público, sem limite de tentativa.** *(média × alta)*
A senha foi trocada em 22/08/2026 e não está em histórico de chat — este risco não é mais
sobre vazamento. É estrutural: o advisor do Supabase confirma que `admin_ping(p_secret)` e
as outras 19 RPCs são chamáveis por `anon` da internet aberta, e a única barreira é uma
comparação bcrypt contra uma string compartilhada. Não há contador de tentativa, bloqueio
nem CAPTCHA. O bcrypt é lento, o que ajuda muito — mas hoje ela dá acesso a todos os dados
pessoais de todos os formulários, e amanhã dá acesso ao botão que cria contas.
→ CAPTCHA (Turnstile) no login do painel entra na Fase 0, não como melhoria.
→ E é o argumento mais forte para a Fase 2: com contas nominais, revogar o acesso de uma
pessoa deixa de significar trocar a senha de todas.

**3. `service_role` vazando para o bundle.** *(média × crítica)*
O repositório já se protege com um teste que reprova qualquer arquivo em `public/` contendo
a string. Mantenha e estenda: `src/` também, e um grep no output do build dentro do CI.
A chave só existe como variável de ambiente da Edge Function.
→ Migrar para as chaves novas (`sb_secret_...`), que são revogáveis individualmente. As
legadas `anon`/`service_role` serão descontinuadas.

**4. RLS esquecida numa tabela nova.** *(média × crítica)*
O padrão do projeto — RLS ligada sem policy, escrita só por RPC `security definer` — é
bom e está consistente nas quatro migrations. O risco é a quinta.
→ Um teste por tabela que autentica como a marca B e tenta ler a linha de A, esperando
zero. E rodar os **Security Advisors** do Supabase antes de publicar.

**5. Dados pessoais de terceiros sem prazo de validade.** *(alta × média)*
Já é item aberto seu ("Retenção de dados (LGPD)"). O sistema guarda nome, e-mail, telefone
e Instagram de gente que se candidatou e **não foi selecionada** — e guarda para sempre.
→ Prazo escrito e rotina que executa: candidaturas não selecionadas apagadas em D+90;
participantes da edição mantidos enquanto durar a relação. Uma tela "Meus dados" na área da
marca com exportar e solicitar exclusão. Aviso de privacidade versionado, com o encarregado
nomeado. **Nada disso é parecer jurídico** — é o mínimo operacional; a redação final merece
revisão de alguém com responsabilidade jurídica.

**6. Enumeração de e-mails.** *(alta × média)*
Se o login responde "e-mail não cadastrado", qualquer um descobre **quais marcas foram
aprovadas** antes do anúncio oficial. Isso é informação comercialmente sensível num
festival com curadoria.
→ Mensagem idêntica nos dois casos, no login e no reset. Cadastro público desabilitado.

**7. Foto do produto no Storage sem policy.** *(média × média)*
A área da marca vai receber upload. Bucket privado, policy por `auth.uid()`, caminho
`participantes/{user_id}/{arquivo}`, e URL assinada com expiração para exibir. Bucket
público com nome previsível é o vazamento silencioso mais comum do Supabase.

**8. Ninguém é avisado de nada.** *(alta × baixa, mas corrói)*
Também já é item seu. Hoje a organização precisa abrir o painel para saber que chegou
alguém. Com marcas esperando aprovação, o silêncio custa mais.
→ Resumo diário por e-mail (o Resend já está no projeto), com o que chegou e o que está
parado há mais de X dias.

---

## 8. Plano de execução

### Fase 0 — Antes de escrever qualquer código *(1 dia)*
1. ~~Trocar a senha do painel.~~ ✅ **feito em 22/08/2026.**
2. ~~Subir o projeto Supabase para o plano Pro.~~ ❌ **decidido: seguir no free**
   (22/08/2026). Consequências assumidas: sem proteção contra senha vazada
   (HaveIBeenPwned) e sem backup automático — o `db dump` do item 3 passa a ser manual e
   obrigatório antes de cada migration, e o projeto precisa de uso regular para não pausar.
3. Fazer um `db dump` e guardar fora do Supabase. **Pendente — e agora é bloqueante**,
   porque é a única rede de segurança que sobrou.
4. ~~Confirmar quais migrations o banco realmente aplicou.~~ ✅ **conferido em 22/08/2026**:
   as 13 migrations registradas incluem as quatro de formulário (`contact_requests`,
   `participation_interests`, `support_interests`, `painel_organizacao`), todas aplicadas em
   20/08. Não há divergência entre o repositório e o banco.
5. **Novo:** ligar CAPTCHA (Turnstile) no login do painel — ver risco 2 do §7.

### Fase 1 — Contas das marcas *(o grosso do trabalho)*
5. Migration: `perfis`, `participantes`, `auditoria`, coluna e `CHECK` novos em
   `quero_participar`, políticas RLS e grants de coluna.
6. ~~Edge Function `criar-acesso-marca` + RPC `vincular_conta_marca`.~~ ✅ **escritas em
   22/08/2026** — `supabase/functions/criar-acesso-marca/index.ts` (`deno check` limpo) e
   as RPCs no fim da migration da Fase 1. ⚠️ **Nenhuma das duas está no ar**: a função não
   foi deployada e a migration não foi aplicada. Faltou também uma terceira peça que o
   esqueleto do §4 não previa — `user_id_por_email`, porque `createUser` devolve 422
   `email_exists` sem dizer *qual* usuário é, e `listUsers` é paginado.
   Duas correções no modelo da Fase 1, achadas ao escrever a RPC:
   - `participantes.origem_id` ganhou **`unique`** — sem ele a idempotência prometida no
     §4 não existia, e dois cliques em "Criar acesso" criariam duas contas.
   - `participantes.user_id` **perdeu** o `unique` — participação é marca + edição, então
     a marca recorrente é o mesmo usuário em duas linhas. Com `unique`, o caminho feliz
     do `email_exists` quebrava no INSERT seguinte.
7. ~~`/organizacao/`: botão "Criar acesso", coluna "Acesso", aba Participantes, ficha.~~
   ✅ **feito em 22/08/2026** — quarto destino "marcas" na casca (`vista-participantes`),
   selo de estado do cadastro ao lado do selo de status em cada candidatura, e o bloco
   "Acesso da marca" na ficha do `/quero-participar`. Sete checagens novas em
   `tests/organizacao.test.mjs`. Quatro decisões que valem registro:
   - **"marcas", não "participantes", no rótulo.** A tabela do banco é `participantes`,
     mas o vocabulário da organização é marca (CLAUDE.md §9.3) — e é o único rótulo que
     cabe numa barra de 4 colunas a 320px sem quebrar linha. Uma palavra nas duas telas.
   - **A carga das marcas é apartada e tem `catch` próprio.** Dentro do `Promise.all`
     das quatro origens, um 404 de `get_participantes` — que é o estado de HOJE, com a
     migration não aplicada — levaria o painel inteiro para a tela de erro, inclusive as
     respostas que já funcionam. A falha fica contida na vista das marcas, que a explica.
   - **Duas travas antes de deixar criar**, mais um `confirm()`: sem e-mail não há
     convite, e status diferente de "Aprovado" bloqueia o botão. Apertá-lo dispara um
     e-mail para uma pessoa real, e e-mail enviado não volta.
   - **Reenviar convite não existe** e a ficha diz isso: a Edge Function é idempotente e
     devolveria 409. O caminho que existe é a marca pedir novo link em "Esqueci a senha".

   Faltava uma RPC que o §4 não previa: **`get_participantes`**, a leitura da organização
   — o único ponto do sistema que cruza `participantes_operacao`, porque é exatamente
   quem precisa conferir se a marca preencheu preço e unidades.

   ⚠️ **Um vão fechado junto:** a migration acrescenta `cadastro_completo` ao CHECK de
   `quero_participar`, e o painel não conhecia esse status — apareceria como string crua
   na tela e sumiria do filtro. Agora um teste deriva o vocabulário do próprio CHECK, e
   status novo no banco sem rótulo no painel reprova.
8. ~~`/marca/`: login, definir senha, cadastro, status.~~ ✅ **escrita em 22/08/2026** —
   `public/marca/index.html`, 17 checagens em `tests/marca.test.mjs`. Duas trocas em
   relação a este plano, ambas deliberadas:
   - **Uma página, não quatro rotas.** As quatro views precisam do mesmo cliente de
     autenticação, e a segunda cópia dele é onde as duas divergem. A view sai do
     estado, não da URL. O `redirectTo` do convite virou `/marca/`.
   - **Sem `supabase-js`.** O §6.2 pedia a biblioteca por causa da sessão; são ~100 KB
     de CDN de terceiro **na tela de login** — esm.sh fora do ar e ninguém entra. Os
     quatro endpoints usados (senha, refresh, update, recover) são POSTs comuns, e
     `/organizacao/` já firmou o precedente do fetch direto.

   Mais duas peças de banco que faltavam: o trigger `participantes_progresso` (move
   `aguardando_cadastro` → `em_preenchimento` no primeiro salvamento da marca, sem
   conceder a coluna) e a RPC `marca_concluir_cadastro`, que valida no **servidor** e
   devolve a lista do que falta em vez de erro genérico.

   ⛔ **Foto do combo ficou de fora**: exige bucket de Storage com policy própria, que
   não existe. O campo `combo_foto_path` está na tabela e não na tela — melhor ausente
   que presente e quebrado.
9. Testes: RLS por tabela, declaração de função nos scripts inline, ciclo ponta a ponta
   com uma marca de teste. — **metade feita, metade bloqueada.**
   - ✅ **Declaração de função nos scripts inline**: `tests/marca.test.mjs` (17) e
     `tests/organizacao.test.mjs` (28). Cobrem o vão que o `npm run build` não vê, porque
     o JS das páginas estáticas não passa pelo Vite. Além da declaração, travam o
     contrato com o banco (o que a página escreve × o `grant update` da migration) e com
     a Edge Function (caminho e nome dos campos).
   - ⛔ **RLS por tabela e ciclo ponta a ponta** dependem de um banco com a migration
     aplicada — não existe hoje, e não há CLI do Supabase, `psql` nem Docker na máquina.
     Enquanto isso, o SQL está verificado só quanto ao balanço dos delimitadores `$fn$`.
     ⚠️ **Aplicar dentro de `begin; … rollback;` na primeira vez:** erro de sintaxe
     aparece sem nada persistir.

### Fase 2 — Unificação da autenticação *(depois, sem pressa)*
10. `pode_organizacao()` substituindo `admin_ok` nas RPCs existentes.
11. Contas nominais para a organização; `admin_ok` mantido em paralelo.
12. Remoção do segundo `or` e de `admin_ok` quando a última pessoa migrar.

### Fase 3 — Operação
13. Resumo diário por e-mail.
14. Exportar CSV do filtro atual.
15. Rotina de retenção + tela "Meus dados".

---

## 9. O que eu preciso decidir com você

1. **Fase 2 entra ou fica para depois?** Ela resolve a senha vazada de forma definitiva,
   mas mexe no que está em produção e verificado.
2. **O que exatamente a marca preenche?** Listei o provável (produto, foto, preço,
   endereço, horários). O conteúdo real depende do que vai ao site — e isso define metade
   das telas.
3. **O plano Pro está de pé?** Se a resposta for não, o plano muda: dá para fazer, mas com
   rotina de backup manual e um monitor batendo no projeto para não pausar. Prefiro dizer
   isso agora do que depois.
4. **`/marca/` estática ou esperar o gate cair?** Recomendo estática pelo mesmo motivo que
   valeu para `/organizacao/`, mas se o institucional for ao ar antes do festival, vale
   discutir se ela nasce como rota React desde já.
