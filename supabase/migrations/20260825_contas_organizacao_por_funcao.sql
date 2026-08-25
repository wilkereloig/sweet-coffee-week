-- ═══════════════════════════════════════════════════════════════════════════
-- Fase 3 · Contas da organização por função
-- COMANDO-claude-code.md item 3.1 · aplicada em 25/08/2026
--
-- Aplicada em três migrations no banco (`contas_organizacao_por_funcao`,
-- `guard_por_acao_nas_rpcs_de_escrita`, `revogar_guards_novos`) mais a
-- correção de ACL descrita no fim deste arquivo. Este arquivo é o estado
-- final, reunido — e existe porque migration que só vive dentro do Supabase é
-- esquema sem cópia (CLAUDE.md §4.1).
--
-- A IDEIA: permissão vira DADO, não código. Mudar a equipe passa a ser editar
-- linha em `permissoes`, não reescrever função. E o guard sai de um booleano
-- ("é a organização?") para uma pergunta de duas dimensões ("quem é você, e
-- esta ação está na sua função?").
--
-- A ponte da Fase 2 absorve a mudança: `pode_organizacao` vira uma linha em
-- cima de `pode`, e as 22 RPCs que a chamam NÃO são tocadas. Foi exatamente
-- para isto que ela foi criada.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Vocabulário de função e permissão ─────────────────────────────────────
create table if not exists public.funcoes (
  codigo text primary key,
  rotulo text not null,
  ordem  int  not null default 0
);

create table if not exists public.permissoes (
  funcao text not null references public.funcoes(codigo) on delete cascade,
  acao   text not null,
  primary key (funcao, acao)
);

insert into public.funcoes (codigo, rotulo, ordem) values
  ('administrador', 'Administrador', 1),
  ('curadoria',     'Curadoria',     2),
  ('producao',      'Produção',      3),
  ('consulta',      'Consulta',      4)
on conflict (codigo) do update set rotulo = excluded.rotulo, ordem = excluded.ordem;

-- Seis ações, vocabulário fechado. Ação nova exige linha aqui — é o que
-- impede uma função nova de nascer sem ninguém poder chamá-la.
insert into public.permissoes (funcao, acao) values
  ('administrador', 'dado.ler'),
  ('administrador', 'triagem.editar'),
  ('administrador', 'registro.apagar'),
  ('administrador', 'acesso.gerir'),
  ('administrador', 'marca.liberar'),
  ('administrador', 'producao.gerir'),
  ('curadoria', 'dado.ler'),
  ('curadoria', 'triagem.editar'),
  ('curadoria', 'marca.liberar'),
  ('producao', 'dado.ler'),
  ('producao', 'triagem.editar'),
  ('producao', 'producao.gerir'),
  ('consulta', 'dado.ler')
on conflict do nothing;

alter table public.funcoes    enable row level security;
alter table public.permissoes enable row level security;
revoke insert, update, delete on public.funcoes, public.permissoes from anon, authenticated;

-- ── perfis ganha função ───────────────────────────────────────────────────
alter table public.perfis
  add column if not exists funcao text references public.funcoes(codigo);

-- A trava de primeiro uso passa a nascer LIGADA. Era `false`, e quem chamasse
-- vincular_* direto no banco criava conta sem trava — falha aberta onde tem
-- que falhar fechada. É ela que torna aceitável mandar senha por WhatsApp:
-- sem ela, o que ficou no histórico da conversa vale para sempre.
alter table public.perfis alter column deve_trocar_senha set default true;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'perfis_funcao_coerente') then
    alter table public.perfis add constraint perfis_funcao_coerente check (
      (papel = 'organizacao' and funcao is not null)
      or (papel = 'marca' and funcao is null)
    );
  end if;
end $$;

-- ── Tranca da senha compartilhada ─────────────────────────────────────────
-- GLOBAL, não por origem, e é escolha: existe UMA senha, então o objeto
-- protegido é único e o contador dele também deve ser. Por IP, o atacante roda
-- de vinte endereços e o teto nunca dispara.
--
-- Travar a própria equipe quase não acontece: a tranca fecha SÓ o caminho da
-- senha compartilhada. Quem tem conta nominal entra igual, porque passa por
-- auth.uid(). A defesa e a migração empurram para o mesmo lado.
create table if not exists public.tentativas_acesso (
  id     bigserial primary key,
  at     timestamptz not null default now(),
  origem text
);
create index if not exists tentativas_acesso_at_idx on public.tentativas_acesso (at desc);
alter table public.tentativas_acesso enable row level security;
revoke select, insert, update, delete on public.tentativas_acesso from anon, authenticated;

create or replace function public.acesso_travado()
returns boolean language sql stable security definer set search_path = public as $$
  select count(*) >= 20 from public.tentativas_acesso
   where at > now() - interval '15 minutes';
$$;

alter table public.admin_config
  add column if not exists senha_unica_ativa boolean not null default true;

-- ── O guard único ─────────────────────────────────────────────────────────
create or replace function public.pode(p_secret text default null, p_acao text default 'dado.ler')
returns boolean language sql stable security definer set search_path = public as $$
  select
    exists (
      select 1
        from public.perfis pf
        join public.permissoes pm on pm.funcao = pf.funcao
       where pf.user_id = auth.uid()
         and pf.ativo
         and pf.papel = 'organizacao'
         and pm.acao = p_acao
    )
    or (
      p_secret is not null and p_secret <> ''
      and coalesce((select senha_unica_ativa from public.admin_config where id), true)
      and not public.acesso_travado()
      and public.admin_ok(p_secret)
    );
$$;

create or replace function public.pode_organizacao(p_secret text default null)
returns boolean language sql stable security definer set search_path = public as $$
  select public.pode(p_secret, 'dado.ler');
$$;

-- ── admin_ping: a porta de login, e o único lugar que CONTA falha ─────────
-- `admin_ok` é STABLE e não pode escrever, por isso a contagem mora aqui.
-- ⚠️ LACUNA DECLARADA: quem ataca chamando outra RPC direto não é contado.
-- Continua pagando o bcrypt a cada tentativa, e a saída definitiva é a conta
-- nominal — que esta mesma migration liga.
create or replace function public.admin_ping(p_secret text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_ok boolean;
begin
  if public.acesso_travado() then
    return false;   -- resposta idêntica à de senha errada, de propósito
  end if;

  v_ok := public.pode(p_secret, 'dado.ler');

  if not v_ok and p_secret is not null and p_secret <> '' then
    insert into public.tentativas_acesso (origem) values (null);
  end if;

  return v_ok;
end;
$$;

-- ── Gestão de contas ──────────────────────────────────────────────────────
create or replace function public.get_contas_organizacao(p_secret text)
returns table (user_id uuid, email text, funcao text, rotulo text, ativo boolean,
               deve_trocar_senha boolean, criado_em timestamptz)
language sql stable security definer set search_path = public, auth as $$
  select pf.user_id, u.email::text, pf.funcao, f.rotulo, pf.ativo,
         pf.deve_trocar_senha, pf.created_at
    from public.perfis pf
    join auth.users u on u.id = pf.user_id
    left join public.funcoes f on f.codigo = pf.funcao
   where public.pode(p_secret, 'acesso.gerir')
     and pf.papel = 'organizacao'
   order by f.ordem, u.email;
$$;

create or replace function public.definir_funcao_conta(p_secret text, p_user uuid, p_funcao text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.pode(p_secret, 'acesso.gerir') then raise exception 'nao_autorizado'; end if;
  if not exists (select 1 from public.funcoes where codigo = p_funcao) then
    raise exception 'funcao_invalida';
  end if;

  -- Nunca deixar o sistema sem administrador ativo: rebaixar o último fecha a
  -- porta com a chave por dentro.
  if exists (select 1 from public.perfis where user_id = p_user and funcao = 'administrador' and ativo)
     and p_funcao <> 'administrador'
     and (select count(*) from public.perfis
           where funcao = 'administrador' and ativo and papel = 'organizacao') <= 1 then
    raise exception 'ultimo_administrador';
  end if;

  update public.perfis set funcao = p_funcao
   where user_id = p_user and papel = 'organizacao';
  if not found then raise exception 'conta_nao_encontrada'; end if;

  insert into public.auditoria (ator_user_id, acao, alvo_tabela, alvo_id, detalhe)
  values (auth.uid(), 'definir_funcao', 'perfis', p_user::text,
          jsonb_build_object('funcao', p_funcao));
end;
$$;

create or replace function public.suspender_conta(p_secret text, p_user uuid, p_ativo boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.pode(p_secret, 'acesso.gerir') then raise exception 'nao_autorizado'; end if;

  if p_ativo is false
     and exists (select 1 from public.perfis where user_id = p_user and funcao = 'administrador' and ativo)
     and (select count(*) from public.perfis
           where funcao = 'administrador' and ativo and papel = 'organizacao') <= 1 then
    raise exception 'ultimo_administrador';
  end if;

  update public.perfis set ativo = p_ativo where user_id = p_user;
  if not found then raise exception 'conta_nao_encontrada'; end if;

  insert into public.auditoria (ator_user_id, acao, alvo_tabela, alvo_id, detalhe)
  values (auth.uid(), case when p_ativo then 'reativar_conta' else 'suspender_conta' end,
          'perfis', p_user::text, jsonb_build_object('ativo', p_ativo));
end;
$$;

-- ── O interruptor que dá data de morte à senha compartilhada ──────────────
-- Sem ele, "desligamos depois" vira "nunca desligamos" e o risco continua
-- aberto com um painel novo por cima.
create or replace function public.senha_unica_definir(p_secret text, p_ativa boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.pode(p_secret, 'acesso.gerir') then raise exception 'nao_autorizado'; end if;

  -- Desligar sem nenhuma conta nominal ativa tranca todo mundo do lado de fora.
  if p_ativa is false and not exists (
    select 1 from public.perfis
     where papel = 'organizacao' and ativo and funcao = 'administrador'
  ) then
    raise exception 'sem_administrador_nominal';
  end if;

  update public.admin_config set senha_unica_ativa = p_ativa where id;

  insert into public.auditoria (ator_user_id, acao, alvo_tabela, detalhe)
  values (auth.uid(), 'senha_unica', 'admin_config', jsonb_build_object('ativa', p_ativa));
end;
$$;

-- ── As duas RPCs de ESCRITA saem de "é organização" para a ação certa ─────
-- Sem isto a função `consulta` — que existe para só olhar — poderia apagar
-- registro, porque `dado.ler` abriria as duas.
--
-- A definição real é reescrita trocando SÓ a chamada do guard. Copiar o corpo
-- para cá criaria a segunda fonte de verdade que o §5.2 proíbe, e o bloco
-- aborta se a ocorrência não for exatamente uma.
do $migra$
declare
  r        record;
  v_def    text;
  v_acao   text;
  v_trocas int := 0;
begin
  for r in
    select p.oid, p.proname
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('organizacao_apagar_registro', 'organizacao_atualizar_registro')
  loop
    v_acao := case r.proname
                when 'organizacao_apagar_registro'    then 'registro.apagar'
                when 'organizacao_atualizar_registro' then 'triagem.editar'
              end;

    v_def := pg_get_functiondef(r.oid);

    if (length(v_def) - length(replace(v_def, 'pode_organizacao(p_secret)', '')))
       / length('pode_organizacao(p_secret)') <> 1 then
      raise exception 'guard nao encontrado exatamente uma vez em %', r.proname;
    end if;

    execute replace(v_def, 'pode_organizacao(p_secret)', format('pode(p_secret, %L)', v_acao));
    v_trocas := v_trocas + 1;
  end loop;

  if v_trocas <> 2 then
    raise exception 'esperava trocar 2 funcoes, trocou %', v_trocas;
  end if;
end
$migra$;

-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ A ARMADILHA DO REVOKE — a regra do CLAUDE.md §4.1 estava PELA METADE
--
-- Ela dizia: `revoke ... from public` NÃO basta, porque o Supabase concede
-- EXECUTE explicitamente a anon e authenticated. Verdade.
-- O que faltava: `revoke ... from anon, authenticated` TAMBÉM não basta,
-- porque o Postgres concede EXECUTE a **PUBLIC** por padrão em toda função
-- nova, e anon herda de PUBLIC.
--
-- SÃO OS DOIS, na mesma linha. `admin_ok` e `pode_organizacao` estavam
-- fechadas porque a Fase 2 fez os dois — sem saber que precisava dos dois.
-- `pode` e `acesso_travado` nasceram abertas em 25/08 e só fecharam aqui.
--
-- E a conferência é por `has_function_privilege`, NUNCA por ter escrito a
-- linha do revoke: as três primeiras tentativas pareceram ter funcionado.
-- ═══════════════════════════════════════════════════════════════════════════
revoke execute on function public.pode(text, text)       from public, anon, authenticated;
revoke execute on function public.acesso_travado()       from public, anon, authenticated;
revoke execute on function public.pode_organizacao(text) from public, anon, authenticated;
revoke execute on function public.admin_ok(text)         from public, anon, authenticated;
