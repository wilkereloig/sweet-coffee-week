# Instrução — Cadastro completo da marca, fotos, avisos, app instalável e push
### Para o Claude Code · preparada em 23–24/08/2026 · arquivo único, a pedido do Eloi

> Este arquivo já está salvo em `docs/INSTRUCAO-marca-completa.md` no repositório
> (`site-sweet-coffee-week-home-v2`, branch `dev/site-completo`) — a ponte com o computador
> do Eloi estava conectada no momento da escrita, então não precisa mover nada.
>
> **Este arquivo substitui dois documentos anteriores** — `docs/INSTRUCAO-cadastro-completo-
> marca.md` e `docs/INSTRUCAO-app-instalavel-push-canais.md`. Os dois foram movidos para
> `docs/_arquivo-instrucoes-antigas/` (não apagados — o bridge não apaga arquivo, só move).
> **Não siga os arquivos antigos, mesmo que ainda estejam no repositório** — este documento
> é mais recente, corrige coisas que os outros dois assumiam errado (§0.4), e cobre uma
> funcionalidade nova que nenhum dos dois tinha (§2.4, agendamento de fotos). `docs/
> INSTRUCAO-painel-fase2.md` continua separado e válido — é sobre autenticação da
> organização, um assunto diferente deste aqui.

---

## 0. Contexto — leia antes de tudo

### 0.1 Dois cadastros são coisas diferentes

`/quero-participar/` é o pré-cadastro — a candidatura, rasa de propósito, para qualquer
marca interessada. `/marca/` é o cadastro completo — só para quem já foi aprovado (status
`aprovado` → `aguardando_cadastro` em `quero_participar`). Este documento é só sobre o
segundo. **Não mexer no primeiro.**

O que já existe em `public/marca/index.html` (login, definir senha, cadastro em página
única — quatro views trocadas por estado, não por rota —, barra de progresso, rascunho
automático, sem `supabase-js`, fetch direto no Supabase) está correto como mecânica. O que
falta é profundidade e três funcionalidades novas: fotos, avisos e app instalável com push.

### 0.2 Fato do acervo, não interpretação

O combo do festival é sempre **um doce, um salgado e uma bebida**. É como o Sweet Awards
julga — Melhor Doce, Melhor Salgado e Melhor Bebida são categorias separadas, e "Melhor
Combo" é a média dos três (`acervo/contradicoes-levantadas-2026-08.md`, §5.4). Cada parte
tem foto própria (`acervo/plano-site-institucional.md`, seção "02 · O que é o festival":
*"a anatomia do combo — um doce, um salgado e uma bebida, com foto real de cada parte"*).

### 0.3 Decisões do Eloi, acumuladas em 22–23/08/2026

1. Restrições alimentares (vegano, sem glúten, sem lactose) valem **por item**, dentro do
   combo — não pelo combo inteiro.
2. O mural de avisos é uma **lista simples**, publicada pelo painel admin. Sem notificação
   por e-mail — a distribuição é por push de verdade (§6), não e-mail.
3. Este trabalho é sobre participantes **confirmados** — diferente do pré-cadastro.
4. O instalável é dos **dois painéis** — `/organizacao/` (auditado nesta rodada, ver §0.4)
   e `/marca/` (construído do zero).
5. Notificação é **push de verdade** — chega com o app fechado.
6. A tela de canais é **exibição**, não sistema de mensagens.
7. Sistema fechado, sem indexação — ver §0.5, já resolvido.
8. **Novo, nesta rodada:** as fotos do combo **não são upload da marca**. Quem fotografa é
   a organização. As fotos são **agendadas com a marca, em data e horário escolhidos pela
   organização**. Depois de feita a sessão e publicadas as fotos, a marca **baixa** as suas
   pela própria conta — não edita, não envia. Ver §2.4 e §3.2.

### 0.4 `/organizacao/` — auditado de verdade nesta rodada, não é mais suposição

Nas rodadas anteriores deste documento, a parte de `/organizacao/` era um checklist de
auditoria porque a ponte com o computador do Eloi estava desconectada. Reconectou, e o
arquivo real foi lido. **Isto já está pronto, confirmado linha a linha:**

- `public/organizacao/app.webmanifest` existe (889 bytes) — `id`, `name`, `short_name`,
  `start_url`/`scope` = `/organizacao/` com barra final, `display: standalone`,
  `orientation: portrait`, `background_color: #FEF0DD`, `theme_color: #3D1308`, ícones
  `favicon-sweet.svg` (any), `favicon-512-maskable.png` (maskable — **já existe**, a
  pendência de ícone maskable já foi resolvida), `favicon-192.png`, `favicon-180.png`,
  `favicon-96.png`.
- `public/organizacao/sw.js` existe (3,4 KB) — `install`/`activate`/`fetch`, HTML sempre
  `network-first`, assets da casca cache-first, **nunca cacheia chamada ao Supabase**
  (corte explícito por `origin`). Registrado com `scope: '/organizacao/'`, dentro do único
  `<script>` do arquivo.
- `<meta name="robots" content="noindex, nofollow">` já está no `<head>`. **Confirmado ao
  vivo, não é mais pendência.**
- Meta tags de app já presentes: `apple-mobile-web-app-capable`, `apple-mobile-web-app-
  status-bar-style` (`default`, não `black-translucent` — escolheram a opção simples),
  `apple-mobile-web-app-title`.
- **Não existe captura de `beforeinstallprompt`** — confirmado, nenhuma ocorrência no
  arquivo. O painel depende do prompt nativo do Chrome/Edge (ver checklist de aceite
  original: "Chrome oferece instalar") e do "Adicionar à Tela de Início" manual no iOS, sem
  banner próprio explicando isso. **Isso é uma lacuna real, hoje, em produção** — não é
  hipótese. Fica registrado como risco (§11) e como oportunidade de melhoria, não como
  "fazer agora": o Eloi não pediu isso especificamente, então proponha antes de construir.

**O que isso muda para você:** não refaça nada disso. `/organizacao/` só ganha, nesta
rodada: o handler de `push` no `sw.js` existente (§6.5), a tela de gestão de avisos (§3.3),
a tela de agendamento/upload de fotos (§3.2), e talvez o banner de instalação para iOS, se
decidir propor (§11).

### 0.5 Indexação — já resolvida, não é mais pendência

Rodadas anteriores deste documento levantaram, como risco, que `/organizacao/` e `/marca/`
podiam não estar bloqueadas para buscadores. **Verificado ao vivo: já estão.** Duas camadas,
as duas confirmadas:

1. `public/robots.txt` já existe e já bloqueia os dois: `Disallow: /organizacao` e
   `Disallow: /marca`, com um comentário no próprio arquivo explicando que é higiene, não
   segurança — quem protege de verdade é RLS e senha, o `robots.txt` só evita aparecer em
   busca.
2. `<meta name="robots" content="noindex, nofollow">` já está no `<head>` dos dois arquivos
   — `public/organizacao/index.html` (linha 6) e `public/marca/index.html` (linha 6).

**Não precisa fazer nada aqui.** Se algum dia criar uma página nova dentro dessas pastas,
replique a mesma meta tag — é o único cuidado que resta.

### 0.6 O que é público versus o que fica nesta tela — não confundir

O sistema inteiro (`/organizacao/` e `/marca/`) é acesso fechado, autenticado: a
organização entra com senha própria (`admin_ok`), cada marca entra com login e senha
próprios — já é como o botão "Criar acesso" funciona. Não existe modo "público" de entrar.

Quando este documento fala em canal "com o público" (§7) ou em dado que "o público vê"
(preço, endereço, horário, fotos), é sobre informação que a marca revisa **dentro desta
tela fechada**, e que só vira conteúdo do site institucional depois, pelo rito de dado
volátil já estabelecido (§0.7) — nunca sobre esta tela virar pública.

### 0.7 A regra de dado volátil, sempre que algo daqui possa ir para o site público

`acervo/regras-do-projeto-site.md` exige, para qualquer dado que possa aparecer no site
institucional público, três campos: de onde veio, quando foi verificado, se pode publicar.
Preço, endereço, horário, e agora as fotos, ficam sujeitos a essa regra se um dia saírem
desta tela fechada para uma página pública. **Não é trabalho deste documento resolver isso
— é lembrete para quando alguém for construir aquela ponte.**

### 0.8 O único canal confirmado da organização é o Instagram

`acervo/ACERVO-OFICIAL.md` (§9, "O que o acervo NÃO tem") registra: *"E-mail e WhatsApp —
não há canal público confirmado além do Instagram."* `acervo/contradicoes-levantadas-2026-
08.md` (§9.8) confirma de novo: *"O único canal real é @sweetcoffeeweek — sem e-mail e sem
WhatsApp confirmados."* A tela de canais (§7) **não pode inventar** um e-mail ou WhatsApp
da organização. Se o Eloi quiser abrir outro canal, é decisão dele, com dado real, fora
deste documento.

### 0.9 `src/config/channels.js` existe, mas você NÃO PODE importá-lo aqui

`src/config/channels.js` é a fonte de `INSTAGRAM_HANDLE` / `INSTAGRAM_URL` — mas é um
módulo ES pensado para o app React, que passa pelo Vite. **`/organizacao/` e `/marca/` são
páginas estáticas, fora do bundle, de propósito** (é o que permite funcionar com
`COMING_SOON_PUBLICATION = true` sem tocar em flag — comentário no topo do próprio
`public/marca/index.html`). Elas não têm `import`, não têm bundler. Import direto do
arquivo `.js` do `src/` não funciona aqui.

**O que fazer:** leia o valor atual de `INSTAGRAM_HANDLE`/`INSTAGRAM_URL` em
`src/config/channels.js` e declare a mesma string como constante dentro do `<script>` já
existente de `/marca/`, com um comentário explícito: `// espelha src/config/channels.js —
se o Instagram da organização mudar, atualizar os dois lugares`. É duplicação deliberada,
documentada — a alternativa (inventar um mecanismo de import cross-bundle só para uma
string) é mais risco que o problema que resolve.

### 0.10 Regras duras do `CLAUDE.md` que valem para as duas páginas estáticas

Confirmadas lendo `public/organizacao/index.html` e `public/marca/index.html` ao vivo —
não são suposição:

- **Exatamente UM bloco `<script>` por arquivo.** Todo o JavaScript novo deste documento
  (push, agendamento de fotos, canais, PWA) entra **dentro** do `<script>` que já existe em
  cada painel — nunca um segundo `<script>`. Há teste que conta os blocos.
- **Toda função nova declarada como `function nome(...)`**, nunca `const nome = () => {}`.
  Os testes checam declaração, não citação.
- **Todo dado do banco passa por `escapar()` antes de `innerHTML`.** As duas páginas já têm
  essa função declarada — reaproveite a existente, não escreva uma segunda.
- **Nunca afirmar gravação antes do servidor confirmar.** Vale para agendamento de foto e
  para avisos tanto quanto para o resto.
- Testar sempre contra o build, nunca contra `npm run dev`: o Vite não serve `public/` por
  resolução de índice de diretório.
  ```bash
  npm run build && npx vite preview --port 4173
  # abrir http://localhost:4173/organizacao/  e  http://localhost:4173/marca/  — com a barra
  ```

---

## 1. Absolutos — não negociar

- Trabalhe só em `dev/site-completo`. Nunca em `master`.
- `service_role` nunca em `public/` nem em `src/` — só variável de ambiente de Edge
  Function. A chave privada VAPID (§6.1) segue a mesma regra.
- Qualquer migration nova: teste primeiro dentro de `begin; ... rollback;` no SQL Editor.
- Não toque em `/quero-participar/`.
- **Não apague nem edite a linha de teste que já existe em `participantes`** sem confirmar
  com o Eloi — pode ser dado real.
- Toda mudança de schema é **aditiva** — não altere nem remova colunas existentes em
  `participantes` sem migrar os dados da linha real primeiro.
- **Não peça permissão de notificação automaticamente ao carregar a página** — só atrás de
  um clique explícito ("Ativar notificações"). Navegador trata pedido sem gesto como abuso
  e pode bloquear de forma permanente.
- **Não mande push de teste para inscrições reais.** Teste com uma inscrição própria antes
  de qualquer coisa ligada ao fluxo real.
- **Não invente ícone, cor ou fonte nova.** Reaproveite exatamente os tokens que já existem
  (`--creme #FEF0DD`, `--choco #3D1308`, etc., confirmados em `public/marca/index.html`) e
  os ícones que já existem em `public/` (`favicon-*`, `images/logo-seal-sweet-coffee.svg`).
- **Não construa upload de foto pela marca.** Foto é responsabilidade da organização — ver
  §0.3(8). Se em algum rascunho anterior você viu campo de upload de foto no cadastro da
  marca, isso está errado e desatualizado — corrija para exibição/download, não upload.
- Um bloco `<script>` por arquivo, funções declaradas com `function`, `escapar()` sempre —
  ver §0.10.

---

## 2. Modelo de dados completo

### 2.1 Nível do combo — colunas novas em `participantes`

```sql
alter table public.participantes
  add column if not exists tema_combo text,
  add column if not exists tema_justificativa text;
```

`preco` (`produto_preco`) e `horarios` (`jsonb`) já existem no nível do combo — confirme se
a tela grava em `horarios`; se não gravar, é gap de UI (§3.1), não de schema.

### 2.2 Nível do item — tabela nova, com a foto travada para a organização

```sql
create table if not exists public.participantes_itens (
  id              uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.participantes(id) on delete cascade,
  tipo            text not null check (tipo in ('doce','salgado','bebida')),
  nome            text,
  descricao       text,
  ingredientes    text,
  foto_path       text,           -- caminho no Storage — só a organização grava, ver abaixo
  vegano          boolean not null default false,
  sem_gluten      boolean not null default false,
  sem_lactose     boolean not null default false,
  atualizado_em   timestamptz not null default now(),

  constraint participantes_itens_unico unique (participante_id, tipo)
);

alter table public.participantes_itens enable row level security;

create policy itens_marca_le on public.participantes_itens
  for select to authenticated
  using (
    exists (select 1 from public.participantes p
             where p.id = participantes_itens.participante_id
               and p.user_id = auth.uid())
  );

create policy itens_marca_edita on public.participantes_itens
  for update to authenticated
  using (
    exists (select 1 from public.participantes p
             where p.id = participantes_itens.participante_id
               and p.user_id = auth.uid()
               and p.status in ('aguardando_cadastro','revisao'))
  )
  with check (
    exists (select 1 from public.participantes p
             where p.id = participantes_itens.participante_id
               and p.user_id = auth.uid()
               and p.status in ('aguardando_cadastro','revisao'))
  );
```

**Trava de coluna — a marca NUNCA escreve `foto_path`.** RLS controla linha, não coluna: a
policy de `update` acima, sozinha, deixaria a marca reescrever qualquer coluna da própria
linha, inclusive `foto_path`. Como a foto é responsabilidade exclusiva da organização
(§0.3-8), feche isso por `grant` de coluna, não só por RLS:

```sql
revoke update on public.participantes_itens from authenticated;
grant update (nome, descricao, ingredientes, vegano, sem_gluten, sem_lactose)
  on public.participantes_itens to authenticated;
```

`foto_path` só muda pela RPC da organização, §2.4.

Ao aprovar um participante, crie as três linhas vazias (`doce`, `salgado`, `bebida`) de
uma vez — a marca só edita depois, nunca insere.

**Teste isolado (`begin; ... rollback;`) antes de aplicar de verdade.**

### 2.3 Mural de avisos — tabela nova

```sql
create table if not exists public.avisos (
  id           uuid primary key default gen_random_uuid(),
  titulo       text not null,
  texto        text not null,
  prazo_em     timestamptz,
  publicado_em timestamptz not null default now(),
  criado_por   uuid references auth.users(id),
  arquivado    boolean not null default false
);

alter table public.avisos enable row level security;

create policy avisos_marca_le on public.avisos
  for select to authenticated
  using (not arquivado);
```

Escrita (criar, editar, arquivar) só pela organização, via RPC `security definer` gateada
por `admin_ok(p_secret)` — mesmo padrão do resto do projeto, não policy direta.

### 2.4 Agendamento e entrega de fotos — funcionalidade nova desta rodada

A organização fotografa os combos. Ela escolhe data e horário, agenda com a marca, faz a
sessão, e depois sobe as três fotos (doce/salgado/bebida). A marca só vê o agendamento e
baixa o resultado — nunca edita, nunca envia.

```sql
create table if not exists public.sessoes_fotos (
  id              uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.participantes(id) on delete cascade,
  data_hora       timestamptz not null,
  local           text,             -- qual unidade / endereço da sessão, texto livre
  status          text not null default 'agendada'
                    check (status in ('agendada','realizada','cancelada','remarcada')),
  observacoes     text,
  criado_por      uuid references auth.users(id),
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

alter table public.sessoes_fotos enable row level security;

create policy fotos_marca_le on public.sessoes_fotos
  for select to authenticated
  using (
    exists (select 1 from public.participantes p
             where p.id = sessoes_fotos.participante_id
               and p.user_id = auth.uid())
  );

-- sem policy de insert/update/delete para authenticated: só a organização mexe, via RPC
```

RPCs da organização, mesmo padrão `admin_ok` de sempre:

```sql
create or replace function public.agendar_sessao_fotos(
  p_secret text, p_participante_id uuid, p_data_hora timestamptz,
  p_local text default null, p_observacoes text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.admin_ok(p_secret) then
    raise exception 'não autorizado';
  end if;

  insert into public.sessoes_fotos (participante_id, data_hora, local, observacoes, criado_por)
  values (p_participante_id, p_data_hora, p_local, p_observacoes, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.atualizar_sessao_fotos(
  p_secret text, p_sessao_id uuid, p_status text default null,
  p_data_hora timestamptz default null, p_local text default null,
  p_observacoes text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_ok(p_secret) then
    raise exception 'não autorizado';
  end if;

  update public.sessoes_fotos set
    status        = coalesce(p_status, status),
    data_hora     = coalesce(p_data_hora, data_hora),
    local         = coalesce(p_local, local),
    observacoes   = coalesce(p_observacoes, observacoes),
    atualizado_em = now()
  where id = p_sessao_id;
end;
$$;

create or replace function public.registrar_foto_item(
  p_secret text, p_item_id uuid, p_foto_path text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_ok(p_secret) then
    raise exception 'não autorizado';
  end if;

  update public.participantes_itens
     set foto_path = p_foto_path, atualizado_em = now()
   where id = p_item_id;
end;
$$;
```

**Não existe fluxo de a marca escolher entre horários oferecidos, nem de pedir remarcação
pela tela.** O Eloi foi específico: a organização escolhe a data/horário. Se a marca
precisar remarcar, o caminho é o canal de contato já existente (§7) — não construa uma
segunda via de comunicação só para isso nesta rodada.

**Teste isolado antes de aplicar de verdade**, como sempre.

### 2.5 Storage — bucket de fotos

Um bucket, política por `auth.uid()`, caminho `participantes/{user_id}/{item}/{arquivo}`,
URL assinada com expiração — não pública. Volume: uma foto por item, três itens por combo,
~123 marcas — dimensione para isso, não para uma foto solta.

**Quem escreve no bucket é a organização** (upload no painel `/organizacao/`, depois de uma
sessão marcada `realizada`), nunca a marca. **Quem lê é a própria marca**, restrita à sua
própria pasta pela política de `auth.uid()`.

Se o bucket ainda não existir quando você chegar aqui, resolva-o nesta rodada — ele deixou
de ser uma funcionalidade opcional (era "fora da tela, condicionada ao bucket" numa versão
anterior deste documento) porque agora tem um fluxo inteiro (agendar → fotografar → subir →
baixar) que depende dele existir.

### 2.6 Notificações push — tabela e RPCs

```sql
create table if not exists public.push_subscriptions (
  id               uuid primary key default gen_random_uuid(),
  papel            text not null check (papel in ('organizacao','marca')),
  participante_id  uuid references public.participantes(id) on delete cascade, -- só pra papel='marca'
  endpoint         text not null unique,
  p256dh           text not null,
  auth_chave       text not null,  -- nome de coluna evita confusão com o schema auth do Supabase
  user_agent       text,
  criado_em        timestamptz not null default now(),
  ativo            boolean not null default true,

  constraint push_subscriptions_marca_tem_participante
    check (papel <> 'marca' or participante_id is not null)
);

alter table public.push_subscriptions enable row level security;

create policy push_marca_insere on public.push_subscriptions
  for insert to authenticated
  with check (
    papel = 'marca'
    and exists (select 1 from public.participantes p
                 where p.id = push_subscriptions.participante_id
                   and p.user_id = auth.uid())
  );

create policy push_marca_apaga on public.push_subscriptions
  for delete to authenticated
  using (
    papel = 'marca'
    and exists (select 1 from public.participantes p
                 where p.id = push_subscriptions.participante_id
                   and p.user_id = auth.uid())
  );

-- organização: sem policy direta — só via RPC abaixo, mesmo padrão dos avisos
create or replace function public.registrar_push_organizacao(
  p_secret text, p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_ok(p_secret) then
    raise exception 'não autorizado';
  end if;

  insert into public.push_subscriptions (papel, endpoint, p256dh, auth_chave, user_agent)
  values ('organizacao', p_endpoint, p_p256dh, p_auth, p_user_agent)
  on conflict (endpoint) do update
    set p256dh = excluded.p256dh, auth_chave = excluded.auth_chave, ativo = true;
end;
$$;

create or replace function public.remover_push_organizacao(p_secret text, p_endpoint text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_ok(p_secret) then
    raise exception 'não autorizado';
  end if;

  delete from public.push_subscriptions where endpoint = p_endpoint and papel = 'organizacao';
end;
$$;
```

Não existe policy de leitura para ninguém além do dono — a Edge Function de envio (§6.4)
usa `service_role`, que ignora RLS.

---

## 3. UI — `/marca/`

Reestruture o cadastro de ~4 blocos para: tema → doce → salgado → bebida → unidades/horário
→ revisão. Reaproveite a barra de progresso e o autosave que já existem (`progBarra`,
`progTexto`, indicador `salvo`) — só estendendo o número de passos.

### 3.1 Cadastro completo

- **Tema do combo:** campo de tema + justificativa (texto longo).
- **Doce / Salgado / Bebida:** cada um com nome, descrição, ingredientes, e os três toggles
  de restrição — **sem campo de foto** (a foto não é upload da marca, §0.3-8). Antes dos
  toggles, uma frase curta de incentivo explicando por que o festival pergunta — texto de
  apoio, não campo.
- **Horário de funcionamento:** confirme se "Suas unidades" já grava em `horarios`; se não,
  adicione um campo por unidade.

### 3.2 Sua sessão de fotos — tela nova, só leitura

Mostra o agendamento (`sessoes_fotos`) quando existir: data, horário, local, status. Sem
botão de remarcar ou confirmar — é informativo. Estados:

- **Sem sessão agendada ainda:** mensagem simples, algo como "a organização vai agendar sua
  sessão de fotos em breve".
- **Agendada:** data/horário/local em destaque. Dispara push quando criada (§6.5).
- **Realizada, fotos disponíveis:** vira a tela de download.

### 3.3 Fotos do seu combo — download, não upload

Quando os três `participantes_itens.foto_path` da marca estiverem preenchidos, mostre as
três fotos (uma por doce/salgado/bebida) com um botão de baixar cada uma. Gere a URL
assinada na hora (ela expira — não guarde a URL, peça uma nova a cada visita/clique), pelo
mesmo padrão fetch-direto que o resto da página já usa para falar com o Supabase — sem
`supabase-js`.

### 3.4 Avisos — lista simples

Nova seção, ordenada por `prazo_em`, só leitura.

### 3.5 Canais de comunicação

Ver §7 — seção própria porque envolve a ressalva de `channels.js` (§0.9).

---

## 4. UI — `/organizacao/`

Estende o painel que já existe (§0.4), sem tocar na casca de aplicativo já construída.

- **Gestão de avisos:** criar, editar, arquivar — mesmo padrão HTML+CSS+JS inline das
  outras abas.
- **Gestão de sessões de fotos:** agendar uma sessão por participante (data/horário/local),
  editar, marcar como `realizada`. Provavelmente um bloco novo dentro da ficha de cada
  marca, ao lado do que já existe (bloco "Acesso da marca" já documentado em rodadas
  anteriores) — não uma aba nova, se a ficha já for o lugar natural.
- **Upload de fotos:** depois de uma sessão `realizada`, três campos de upload (doce,
  salgado, bebida) que sobem pro Storage (§2.5) e chamam `registrar_foto_item` (§2.4) para
  cada um.
- **Contato da marca na ficha:** confira se `nome_marca`, `responsavel`, `telefone`,
  `instagram`, `site` (nomes reais de coluna, confirmados em `public/marca/index.html`) já
  aparecem na ficha existente. Se sim, nada novo aqui. Se faltar algum, complete ali — não
  crie uma segunda tela.

---

## 5. App instalável — os dois painéis

### 5.1 `/organizacao/` — já pronto, ver §0.4

Nada a fazer aqui além do handler de push (§6.5) e, se decidir propor, o banner de
instalação para iOS (§11).

### 5.2 `/marca/` — construir do zero, espelhando exatamente `/organizacao/`

**Manifest**, `public/marca/app.webmanifest` (mesmo nome de arquivo que `/organizacao/`
usa — não `manifest.json`):

```json
{
  "id": "/marca/",
  "name": "Área da Marca — Sweet & Coffee Week",
  "short_name": "SCW Marca",
  "description": "Área da marca participante do Sweet & Coffee Week.",
  "lang": "pt-BR",
  "dir": "ltr",
  "start_url": "/marca/",
  "scope": "/marca/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#FEF0DD",
  "theme_color": "#3D1308",
  "icons": [
    { "src": "/favicon-sweet.svg", "type": "image/svg+xml", "sizes": "any", "purpose": "any" },
    { "src": "/favicon-512-maskable.png", "type": "image/png", "sizes": "512x512", "purpose": "maskable" },
    { "src": "/favicon-192.png", "type": "image/png", "sizes": "192x192", "purpose": "any" },
    { "src": "/favicon-180.png", "type": "image/png", "sizes": "180x180", "purpose": "any" },
    { "src": "/favicon-96.png", "type": "image/png", "sizes": "96x96", "purpose": "any" }
  ]
}
```

Cores e ícones são **exatamente os mesmos** de `/organizacao/` — confirmado que
`public/marca/index.html` já usa `--creme:#FEF0DD` e `--choco:#3D1308` como tokens
próprios (linha 47 do arquivo), então isso não é invenção, é a paleta que a página já usa.

**Service worker**, `public/marca/sw.js` — mesma estrutura do de `/organizacao/`: `install`
faz cache da casca (HTML da rota, fontes, ícones), `activate` limpa versão velha,
`fetch` corta por `origin` antes de qualquer coisa (Supabase nunca passa pelo SW — dado de
cadastro tem PII), HTML sempre `network-first`, resto cache-first. **Leia o `sw.js` de
`/organizacao/` inteiro antes de escrever este** — é o molde, não invente uma estratégia
nova.

**Registro, dentro do único `<script>` que já existe em `public/marca/index.html`:**

```html
<link rel="manifest" href="/marca/app.webmanifest">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="SCW Marca">
<link rel="apple-touch-icon" href="/favicon-180.png">
```

```js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/marca/sw.js', { scope: '/marca/' })
    .catch(function () { /* silêncio: SW é melhoria, não requisito */ });
}
```

`theme-color` já está declarado em `public/marca/index.html` (`#3D1308`, linha 9) — não
duplique.

**Prompt de instalação:** `/organizacao/` não tem captura de `beforeinstallprompt` nem
banner de iOS (§0.4) — para manter os dois painéis consistentes nesta rodada, `/marca/`
também não precisa. Se quiser propor um banner de iOS especificamente para `/marca/` (onde
push só funciona instalado, §6.6, e a maioria das marcas provavelmente acessa pelo
celular), registre como proposta em vez de construir sem confirmar — ver §11.

### 5.3 `vercel.json`

```json
{
  "source": "/marca/sw.js",
  "headers": [{ "key": "Cache-Control", "value": "no-store, max-age=0, must-revalidate" }]
}
```

Acrescente ao array `headers` existente, ao lado da entrada equivalente de
`/organizacao/sw.js` (já deve existir, confirme). Sem isso, uma versão nova do SW demora a
assumir porque o CDN guarda a antiga.

---

## 6. Notificações push — infraestrutura e gatilhos

Web Push funciona sem serviço pago — usa a infraestrutura gratuita de cada fabricante de
navegador. Continua compatível com a decisão de ficar no plano Free do Supabase.

### 6.1 Chaves VAPID

Gere um par com `npx web-push generate-vapid-keys` ou equivalente.

- **Privada** → só como segredo de Edge Function (`VAPID_PRIVATE_KEY`), nunca em `public/`
  nem `src/`.
- **Pública** → não é segredo. Um único arquivo, `public/push-vapid-public-key.js`:
  ```js
  window.SCW_VAPID_PUBLIC_KEY = "COLE_A_CHAVE_PUBLICA_AQUI";
  ```
  Incluído com `<script src="/push-vapid-public-key.js"></script>` nos dois painéis.
- **Assunto** (`VAPID_SUBJECT`): `mailto:` ou `https:`. Sem e-mail confirmado da
  organização (§0.8), use a URL do site em produção (confirme o domínio real) ou um e-mail
  pessoal do Eloi, com autorização expressa dele — o assunto VAPID não é exibido a quem
  recebe a notificação, só é usado pelos serviços de push em caso de abuso.

### 6.2 Fluxo do cliente (os dois painéis)

```js
async function ativarNotificacoes() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { suportado: false };
  }

  const permissao = await Notification.requestPermission(); // só a partir de um clique
  if (permissao !== 'granted') return { suportado: true, permitido: false };

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(window.SCW_VAPID_PUBLIC_KEY),
  });

  const { endpoint, keys } = subscription.toJSON();
  // marca: insert direto na tabela (RLS cuida); organização: RPC registrar_push_organizacao
  // com o p_secret que o painel já guarda para outras ações administrativas.

  return { suportado: true, permitido: true };
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
```

Três estados na tela: sem suporte (esconda), suportado mas negado (explique que dá pra
mudar nas configurações do navegador), ativo (com opção de desativar).

### 6.3 Service worker — handler de push, nos dois `sw.js`

```js
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (e) { data = { title: 'Sweet & Coffee Week', body: event.data ? event.data.text() : '' }; }

  event.waitUntil(self.registration.showNotification(data.title || 'Sweet & Coffee Week', {
    body: data.body || '',
    icon: '/favicon-192.png',
    data: { url: data.url || '/' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(clients.openWindow(url));
});
```

### 6.4 Edge Function de envio — `enviar-push`

Mesmo padrão de `criar-acesso-marca` (já existe, ativa, v3 — siga a mesma estrutura de
autenticação e resposta).

- **Entrada:** `{ titulo, corpo, url, alvo: 'marca' | 'organizacao' | 'todos' | 'participante', participante_id?, aviso_id? }`.
  O quarto valor de `alvo` é novo nesta rodada — necessário porque agendamento de foto e
  fotos prontas (§6.5) notificam **uma marca específica**, não todas.
- **Autenticação:** confirme quem chama antes de mandar qualquer coisa (`admin_ok`/
  `pode_organizacao`, ou, se vier do banco, valide de outra forma que faça sentido).
- **Lógica:** busca em `push_subscriptions` com `ativo = true` e:
  - `papel = alvo` quando `alvo` é `'marca'` ou `'organizacao'`;
  - todas as ativas quando `alvo = 'todos'`;
  - `participante_id = p_participante_id` quando `alvo = 'participante'`.
  Manda um push por assinatura com as chaves VAPID. Corpo curto — limite prático de ~4 KB
  depois de criptografado; mande um resumo, o clique abre a tela com o conteúdo completo.
- **Falha:** 404/410 num endpoint específico → `ativo = false` nessa linha. Outros erros:
  registre e continue, não pare o lote inteiro.
- **Biblioteca:** Deno aceita `npm:` — `import webpush from "npm:web-push@3"` deve
  funcionar, mas **teste isolado primeiro**, com uma função mínima mandando um push de
  teste real, antes de integrar. Sem isso funcionando, alternativa é Web Crypto manual.

### 6.5 Gatilhos

Chamadas explícitas, não automáticas por trigger de banco, nesta rodada:

1. **Organização publica um aviso** → botão "Publicar e notificar" (separado de "Salvar")
   chama `enviar-push` com `alvo: 'marca'`.
2. **Organização agenda uma sessão de fotos** → depois de `agendar_sessao_fotos` (§2.4),
   chame `enviar-push` com `alvo: 'participante'`, `participante_id`, avisando a data e o
   horário.
3. **Organização sobe a terceira foto de um participante** (ou seja, os três
   `participantes_itens.foto_path` da marca ficaram preenchidos) → chame `enviar-push` com
   `alvo: 'participante'` avisando que as fotos estão disponíveis para download (§3.3).
4. **Marca completa o cadastro** → quando este documento (§3.1) tiver o status final
   definido e implementado, chame `enviar-push` com `alvo: 'organizacao'`.

Outros gatilhos (pedido de contato, por exemplo) ficam para depois — extensão fácil da
mesma função, não precisa redesenhar nada quando chegar a hora.

### 6.6 O limite do iOS

Safari só recebe Web Push com o PWA **instalado na tela de início** (iOS 16.4+) — não
funciona numa aba comum, mesmo com permissão concedida. A instalação (§5) é pré-requisito
funcional, não um extra. Se detectar iOS e o app não instalado, mostre a instrução de
instalar antes de deixar "Ativar notificações" falhar silenciosamente.

Em qualquer contexto sem push disponível, o mural de avisos (§3.4) e as telas de sessão de
fotos (§3.2) e download (§3.3) continuam sendo o caminho de reserva — quem abre o painel vê
tudo de qualquer forma, só não é avisado proativamente.

### 6.7 Fora desta rodada

Lembrete automático antes de um prazo vencer (precisaria de `pg_cron`) fica para depois —
extensão natural da mesma infraestrutura, mas trabalho novo o suficiente para não entrar
aqui.

---

## 7. Canais de comunicação — tela de exibição, não mensagens

Não construa chat, caixa de entrada, ou qualquer coisa que pareça um canal de mensagens.

**Canais da loja com o público:** os campos de contato da marca (`instagram`, `site`,
`telefone`, `responsavel` — nomes reais de coluna, §0) já são coletados em `/marca/`. Esta
tela não cria campo novo — é visualização de leitura desses dados já existentes, num só
lugar. Editar volta para a tela de cadastro onde o campo já vive.

**Canal da loja com a organização:** bloco "Fale com a organização" → o Instagram
**@sweetcoffeeweek**, como constante local espelhando `src/config/channels.js` (§0.9 —
**não é import**, é constante declarada com comentário de origem). Se quiser um botão de
ação direta, `https://ig.me/m/<usuario>` abre DM do Instagram — teste antes de confiar, é
comportamento de plataforma de terceiro. Um link pro perfil já resolve se preferir o
caminho seguro.

**Não adicione e-mail nem WhatsApp da organização** — não existe canal confirmado além do
Instagram (§0.8).

**Do lado da organização:** confira se a ficha existente já mostra o contato da marca — se
sim, nada novo. Ver §4.

---

## 8. Testes

- Estenda `tests/marca.test.mjs` e `tests/organizacao.test.mjs` para: os campos novos do
  cadastro (declaração de função, contrato com `participantes_itens`, `avisos`,
  `sessoes_fotos`); manifest de `/marca/` existe e é JSON válido com os campos obrigatórios;
  service workers declaram `push` e `notificationclick`; função de ativação de notificação
  declarada e trata os três estados.
- **Teste que impede reinventar upload de foto pela marca:** falha se
  `public/marca/index.html` tiver um `<input type="file">` ou qualquer chamada de upload de
  Storage — trava por código a regra do §0.3(8)/Absolutos.
- **Teste que impede inventar canal de contato:** falha se qualquer arquivo novo desta
  instrução contiver padrão de e-mail fora do `mailto:` do `VAPID_SUBJECT`, ou URL
  `wa.me`/`whatsapp`.
- Teste manual, obrigatório: ativar notificação e receber um push real em pelo menos um
  Android e um iPhone instalado (§6.6); agendar uma sessão de fotos de teste e confirmar
  que a notificação chega; subir as três fotos de um participante de teste e confirmar que
  o download funciona e a notificação chega.

---

## 9. O que NÃO fazer

- Não misturar com `/quero-participar/`.
- Não expor preço, endereço, horário ou fotos coletados aqui na parte pública do site
  institucional sem o rito de dado volátil (§0.7).
- Não implementar notificação por e-mail — é push, ou nada, nesta rodada.
- Não criar campo de restrição alimentar no nível do combo — é por item.
- **Não construa upload de foto pela marca** — é a organização que fotografa e sobe.
- Não construa fluxo de a marca escolher horário de sessão nem pedir remarcação pela tela —
  a organização escolhe; remarcação vai pelo canal de contato existente.
- Não peça permissão de notificação automaticamente.
- Não mande push de teste para inscrições reais.
- Não construa chat, mensagens ou caixa de entrada na tela de canais.
- Não implemente lembrete automático de prazo (`pg_cron`) nesta rodada.
- Não reescreva a estratégia de cache do service worker de `/organizacao/` — só adicione o
  handler de push.
- Não gere ícone, cor ou fonte nova — reaproveite o que já existe.
- Não crie um segundo `<script>` em nenhum dos dois arquivos.
- Não presuma que `/organizacao/` precisa de trabalho de instalável — já está pronto (§0.4)
  — só confirme e adicione o handler de push.
- Não presuma que falta bloquear indexação — já está feito (§0.5).

---

## 10. Riscos específicos

1. **Volume de Storage.** Uma foto por item, três por combo, ~123 marcas. Dimensione o
   bucket para isso, com política por `auth.uid()` e URL assinada com expiração.
2. **Migração da linha de teste existente.** Se `participantes_itens` for criada depois de
   já existir 1 linha em `participantes`, decida com o Eloi se cria os três itens vazios
   para ela também.
3. **`participantes_itens_unico`** impede duplicar um item — trate escrita como upsert
   (`on conflict (participante_id, tipo) do update`), não insert simples.
4. **Fadiga de permissão de notificação.** Só peça atrás de clique intencional, com
   explicação — negar uma vez é praticamente permanente.
5. **iOS exige instalação para push.** A UI precisa deixar isso visível, não assumir que
   "ativar notificações" basta em qualquer contexto.
6. **Compatibilidade do `npm:web-push` no Deno.** Teste isolado antes de integrar.
7. **Rotação da chave VAPID** invalida silenciosamente todas as inscrições existentes — não
   rotacione sem plano de reinscrição.
8. **Acoplamento da RLS de `push_subscriptions`/`sessoes_fotos` (marca) com a de
   `participantes`.** As policies fazem subquery contra `participantes.user_id =
   auth.uid()` — se essa RLS mudar de formato, revise as duas junto.
9. **Volume de notificação.** "Publicar e notificar" apertado sem querer notifica ~123
   marcas de uma vez — considere confirmação extra na UI para esse botão específico.
10. **Lacuna real em produção:** `/organizacao/` não tem banner de instalação para iOS nem
    captura de `beforeinstallprompt` — confirmado ao vivo (§0.4). Isso significa que hoje,
    sem essa proposta ser aceita e construída, usuários de iPhone não têm indicação nenhuma
    de que podem instalar o app — e, por extensão, não recebem push (§6.6). Não é bug desta
    rodada, mas é o tipo de lacuna que vale mencionar ao Eloi explicitamente, não só deixar
    enterrada numa lista de riscos.

---

## 11. Depois de aplicar

- Rode os Security Advisors de novo — confirme que `push_subscriptions`, `sessoes_fotos` e
  `participantes_itens` não aparecem como "RLS enabled, no policy" por engano, e que o
  `revoke`/`grant` de coluna em `participantes_itens` (§2.2) está mesmo restringindo
  `foto_path` (teste manual: logada como marca, tentar dar `update` em `foto_path` direto
  via `fetch`, esperar erro de permissão).
- Teste o ciclo completo: cadastro → agendamento de sessão (com push) → upload das três
  fotos pela organização → download pela marca (com push de "fotos prontas") → aviso
  publicado (com push) → instalar em Android e iPhone.
- Proponha ao Eloi, sem construir sem confirmar antes: banner de instalação para iOS nos
  dois painéis, já que nenhum dos dois tem hoje (§0.4, risco 10).
- Atualize `docs/PLANO-painel-contas-participantes.md` e `acervo/plano-painel-admin-
  participantes-2026-08.md` (Claude Project) com o que foi aplicado de verdade, incluindo a
  funcionalidade de fotos (que não existia em nenhuma versão anterior do plano).
- Volte para o Eloi com: o que foi construído e testado de verdade, em quais dispositivos,
  qualquer campo ou nome que não bateu com o que este documento previu, e a lista de
  pendências explícitas (lembrete automático de prazo, banner de instalação iOS, outros
  gatilhos de push além dos quatro do §6.5).
