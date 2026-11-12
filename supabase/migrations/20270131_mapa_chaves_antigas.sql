-- Caça aos Carimbos: RECUPERAR o mapa NÃO derruba mais a chave dos outros aparelhos (pedido do Wilker, 12/11/2026: "os dados salvos têm que ficar
-- salvos; não quero que as pessoas tenham que entrar, recuperar o e-mail e receber código de novo"). ADITIVA: nenhuma chave que vale hoje deixa de valer.
--
-- Por quê: o banco guarda UM só hash por mapa (mapas_lover.chave_hash). Recuperar (mapa_codigo_validar) gera uma chave nova e SUBSTITUÍA o hash: a chave de
-- todo outro aparelho, navegador, app instalado ou navegador interno (Instagram, WhatsApp) passava a devolver null ("desconhecida") e quem usa dois lugares
-- entrava em vai e vem — recuperar aqui derrubava o outro, recuperar lá derrubava este. Em 12/11: 2.108 mapas, 41 já recuperaram, 10 duas vezes ou mais.
-- O contrato (docs/cartoon-2026-2/15-caca-contrato-identidade.md, D3) dizia "a chave antiga deixa de valer no ato": decisão antiga, trocada nesta migration.
--
-- O que muda:
--   1. mapa_chaves_antigas (tabela FECHADA): o hash de cada chave que o mapa já teve (até 10 por mapa), ligado ao mapa; some junto com ele (on delete cascade).
--   2. mapa_hash(chave): segue devolvendo o sha256 da chave, MAS para uma chave antiga devolve o hash ATUAL do mapa dela. As 44 funções que comparam
--      `chave_hash = public.mapa_hash(p_chave)` passam a aceitar as chaves antigas sem mudar uma linha (todas são SECURITY DEFINER; mapa_hash só executa
--      por postgres e service_role, e continua assim: CREATE OR REPLACE mantém as permissões).
--   3. mapa_codigo_validar (recuperar): guarda o hash que o mapa tinha em mapa_chaves_antigas antes de trocar pelo novo.
--   4. mapa_nova_chave (a organização gera uma chave nova no painel): REVOGA de verdade — apaga as chaves antigas do mapa. É o botão para quando um link vazou.
-- Quem já foi derrubado antes desta migration continua precisando recuperar UMA vez (o hash antigo nunca foi guardado); daí em diante, não mais.
-- Reverter: supabase/reverter/20270131_mapa_chaves_antigas.sql (restaura as três funções como estavam, de uma cópia tirada aqui, e apaga as duas tabelas;
-- as chaves antigas deixam de valer).

-- ---------------------------------------------------------------- 0. cópia das definições de hoje (o reverter restaura daqui)
create table if not exists public.mapa_funcoes_20270131 (
  nome text primary key,
  definicao text not null,
  salva_em timestamptz not null default now()
);
insert into public.mapa_funcoes_20270131 (nome, definicao) values
  ('mapa_hash', pg_get_functiondef('public.mapa_hash(text)'::regprocedure)),
  ('mapa_codigo_validar', pg_get_functiondef('public.mapa_codigo_validar(text, text, text, text, text)'::regprocedure)),
  ('mapa_nova_chave', pg_get_functiondef('public.mapa_nova_chave(text, uuid)'::regprocedure))
on conflict (nome) do nothing;

-- ---------------------------------------------------------------- 1. chaves antigas (tabela fechada: só funções SECURITY DEFINER e service_role)
create table if not exists public.mapa_chaves_antigas (
  chave_hash text primary key,
  mapa_id uuid not null references public.mapas_lover (id) on delete cascade,
  arquivada_em timestamptz not null default clock_timestamp() -- relógio de verdade (não o início da transação): a ordem das chaves é a da recuperação
);
create index if not exists mapa_chaves_antigas_mapa on public.mapa_chaves_antigas (mapa_id, arquivada_em desc);
alter table public.mapa_chaves_antigas enable row level security;
alter table public.mapa_funcoes_20270131 enable row level security;
revoke all on table public.mapa_chaves_antigas, public.mapa_funcoes_20270131 from public, anon, authenticated;

-- ---------------------------------------------------------------- 2. mapa_hash: a chave antiga resolve para o hash atual do mapa
create or replace function public.mapa_hash(p_chave text)
 returns text language sql stable security definer set search_path to 'public'
as $$
  select coalesce(
    (select m.chave_hash from public.mapa_chaves_antigas a join public.mapas_lover m on m.id = a.mapa_id
      where a.chave_hash = encode(extensions.digest(coalesce(p_chave, ''), 'sha256'), 'hex')),
    encode(extensions.digest(coalesce(p_chave, ''), 'sha256'), 'hex'))
$$;

-- ---------------------------------------------------------------- 3. recuperar guarda a chave que o mapa tinha
create or replace function public.mapa_codigo_validar(p_edicao text, p_email text, p_codigo text, p_finalidade text, p_chave text default null)
 returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare v_email text := lower(btrim(coalesce(p_email, ''))); v_cod text := btrim(coalesce(p_codigo, '')); c public.mapa_codigo%rowtype;
  v_chave text; v_apelido text; v_ids uuid[] := '{}'; v_ok boolean := false; v_alvo uuid;
  v_inv constant jsonb := jsonb_build_object('ok', false, 'motivo', 'codigo_invalido');
begin
  if p_finalidade is null or p_finalidade not in ('confirmar', 'recuperar') or v_cod !~ '^\d{6}$'
     or char_length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' then return v_inv; end if;
  if p_finalidade = 'confirmar' then
    select id into v_alvo from public.mapas_lover
     where chave_hash = public.mapa_hash(p_chave) and edicao_codigo = p_edicao and email_norm = v_email;
    if v_alvo is null then return v_inv; end if;
  end if;

  for c in
    select c2.* from public.mapa_codigo c2 join public.mapas_lover m on m.id = c2.mapa_id
     where m.edicao_codigo = p_edicao and m.email_norm = v_email and c2.finalidade = p_finalidade
       and (v_alvo is null or c2.mapa_id = v_alvo)
       and c2.usado_em is null and c2.expira_em > now() and c2.tentativas < 5
     order by c2.criado_em desc limit 3 for update of c2
  loop
    v_ids := v_ids || c.id;
    if public.caca_igual_ct(c.codigo_hash, public.caca_hash_texto('codigo:' || c.id || ':' || c.finalidade || ':' || v_cod)) then
      v_ok := true; exit;
    end if;
  end loop;
  if not v_ok then
    if array_length(v_ids, 1) > 0 then update public.mapa_codigo set tentativas = tentativas + 1 where id = any (v_ids); end if;
    return v_inv;
  end if;

  update public.mapa_codigo set usado_em = now() where id = c.id;
  update public.mapas_lover set email_confirmado_em = coalesce(email_confirmado_em, now()) where id = c.mapa_id;

  if p_finalidade = 'confirmar' then return jsonb_build_object('ok', true, 'finalidade', 'confirmar'); end if;

  v_chave := rtrim(translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_'), '=');
  -- 20270131: a chave que o mapa tinha NÃO deixa de valer (outros aparelhos seguem abertos); só a organização revoga (mapa_nova_chave).
  insert into public.mapa_chaves_antigas (chave_hash, mapa_id)
    select m.chave_hash, m.id from public.mapas_lover m where m.id = c.mapa_id
  on conflict (chave_hash) do nothing;
  update public.mapas_lover set chave_hash = public.mapa_hash(v_chave), ultimo_acesso_em = now()
   where id = c.mapa_id returning apelido into v_apelido;
  -- no máximo 10 chaves antigas por mapa: as mais velhas saem
  delete from public.mapa_chaves_antigas a
   where a.mapa_id = c.mapa_id
     and a.chave_hash not in (select a2.chave_hash from public.mapa_chaves_antigas a2 where a2.mapa_id = c.mapa_id order by a2.arquivada_em desc limit 10);
  return jsonb_build_object('ok', true, 'finalidade', 'recuperar', 'chave', v_chave, 'apelido', v_apelido);
end $$;

-- ---------------------------------------------------------------- 4. a organização revoga de verdade
create or replace function public.mapa_nova_chave(p_secret text, p_mapa uuid)
 returns text language plpgsql volatile security definer set search_path to 'public'
as $$
declare v_chave text := rtrim(translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_'), '=');
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;
  update public.mapas_lover set chave_hash = public.mapa_hash(v_chave) where id = p_mapa;
  if not found then raise exception 'mapa_desconhecido'; end if;
  -- 20270131: chave nova do painel é REVOGAÇÃO (link vazado): as chaves antigas que a recuperação guardou também deixam de valer
  delete from public.mapa_chaves_antigas where mapa_id = p_mapa;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, detalhe)
  values ('mapa.chave_nova', 'mapas_lover', p_mapa::text, '{}'::jsonb);
  return v_chave;
end $$;
