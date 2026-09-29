-- =============================================================================
-- Logo oficial de cada participante (29/09/2026 — spec
-- docs/superpowers/specs/2026-09-29-reconstrucao-visual-painel-design.md, B).
--
-- - logos_marca: uma linha por arquivo (nunca apagada: histórico de versões).
-- - participantes.logo_id: a logo oficial da MARCA (atravessa edições).
-- - participacoes.logo_id: a logo confirmada PARA AQUELA EDIÇÃO ("utilizada
--   em"). As duas apontam para a mesma linha: sem cópia por edição.
-- - acervo_logos: as logos que o site já exibe, GERADAS por
--   scripts/acervo-logos-para-sql.mjs (nunca digitadas). Sugestão ao
--   administrador por nome ou vínculo; à marca, só por vínculo CONFIRMADO
--   ("alias não é prova", CLAUDE.md Fase 12).
-- - bucket público `logos` (logo é identidade pública). A marca sobe na
--   própria pasta `<participante_id>/` (policy); a organização por URL
--   assinada de arquivo-url (`cadastro.editar`).
-- =============================================================================

create table if not exists public.acervo_logos (
  chave text primary key,
  nome  text not null,
  slug  text not null,
  path  text not null
);
alter table public.acervo_logos enable row level security;   -- sem policy: só por RPC

create table if not exists public.logos_marca (
  id               uuid primary key default gen_random_uuid(),
  participante_id  uuid not null references public.participantes(id) on delete cascade,
  path             text not null,
  mime             text,
  nome_original    text,
  tamanho          bigint,
  largura          integer,
  altura           integer,
  path_vetor       text,
  mime_vetor       text,
  nome_vetor       text,
  origem           text not null check (origem in ('participante', 'organizacao', 'acervo', 'edicao_anterior')),
  edicao_codigo    text,
  criado_em        timestamptz not null default now(),
  criado_por       uuid default auth.uid(),
  criado_por_rotulo text default public.ator_rotulo_atual()
);
create index if not exists logos_marca_participante on public.logos_marca (participante_id, criado_em desc);
alter table public.logos_marca enable row level security;    -- sem policy: só por RPC

alter table public.participantes add column if not exists logo_id uuid references public.logos_marca(id) on delete set null;
alter table public.participacoes add column if not exists logo_id uuid references public.logos_marca(id) on delete set null;

-- ── Sugestão do acervo ──────────────────────────────────────────────────────
create or replace function public.logo_sugestao(p_participante uuid, p_so_confirmado boolean)
returns public.acervo_logos
language sql stable security definer set search_path = public as $$
  select a.* from public.acervo_logos a
  where a.chave in (
      select v.chave from public.participante_vinculos v
       where v.participante_id = p_participante
         and (v.status = 'confirmado' or (not p_so_confirmado and v.status = 'possivel'))
      union all
      select public.normalizar_nome(p.nome_marca) from public.participantes p
       where p.id = p_participante and not p_so_confirmado)
  order by a.chave
  limit 1
$$;

-- Participação da edição atual (a mais recente, se a edição atual não estiver definida).
create or replace function public.participacao_corrente(p_participante uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select pa.id from public.participacoes pa
   where pa.participante_id = p_participante
   order by (pa.edicao_codigo = public.edicao_atual()) desc nulls last, pa.edicao_codigo desc
   limit 1
$$;

-- ── Leitura única (organização e marca) ─────────────────────────────────────
-- Estado derivado, sem workflow: confirmada (a edição tem logo) · anterior (a
-- marca tem logo, a edição ainda não confirmou) · acervo (há sugestão) ·
-- nao_enviada. `p_marca`: a marca só vê sugestão confirmada e nunca o nome
-- interno de quem subiu (mesma regra das mensagens).
create or replace function public.logo_info(p_participante uuid, p_marca boolean)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_logo uuid; v_pa uuid; v_pa_logo uuid; v_edicao text;
  v_sug public.acervo_logos;
  v_tirar text[] := case when p_marca then array['criado_por', 'criado_por_rotulo'] else array['criado_por'] end;
begin
  select logo_id into v_logo from public.participantes where id = p_participante;
  v_pa := public.participacao_corrente(p_participante);
  select logo_id, edicao_codigo into v_pa_logo, v_edicao from public.participacoes where id = v_pa;
  v_sug := public.logo_sugestao(p_participante, p_marca);
  return jsonb_build_object(
    'estado', case when v_pa_logo is not null then 'confirmada' when v_logo is not null then 'anterior'
                   when v_sug.chave is not null then 'acervo' else 'nao_enviada' end,
    'edicao', v_edicao,
    'atual', (select (to_jsonb(l) - v_tirar) || jsonb_build_object('usada_em',
                (select coalesce(jsonb_agg(pa.edicao_codigo order by pa.edicao_codigo), '[]'::jsonb)
                   from public.participacoes pa where pa.logo_id = l.id))
                from public.logos_marca l where l.id = v_logo),
    'versoes', (select coalesce(jsonb_agg(to_jsonb(l) - v_tirar order by l.criado_em desc), '[]'::jsonb)
                  from public.logos_marca l where l.participante_id = p_participante),
    'sugestao', case when v_sug.chave is null then null else jsonb_build_object('nome', v_sug.nome, 'path', v_sug.path) end
  );
end $$;

-- ── Escrita interna (não é RPC) ─────────────────────────────────────────────
create or replace function public.aplicar_logo(p_participante uuid, p_logo uuid, p_acao text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.participantes set logo_id = p_logo where id = p_participante;
  update public.participacoes set logo_id = p_logo where id = public.participacao_corrente(p_participante);
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, detalhe)
  values (p_acao, 'participantes', p_participante, p_participante, jsonb_build_object('logo_id', p_logo));
end $$;

create or replace function public.registrar_logo(p_participante uuid, p_dados jsonb, p_origem text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_path text := nullif(btrim(p_dados->>'path'), '');
  v_vetor text := nullif(btrim(p_dados->>'path_vetor'), '');
begin
  if v_path is null then raise exception 'logo_sem_arquivo'; end if;
  -- O caminho é o que separa "a logo da marca X" de "um arquivo da marca Y":
  -- validado aqui, não só na tela.
  if p_origem = 'acervo' then
    if not exists (select 1 from public.acervo_logos where path = v_path) then raise exception 'logo_caminho_invalido'; end if;
  elsif split_part(v_path, '/', 1) <> p_participante::text or v_path like '%..%' then
    raise exception 'logo_caminho_invalido';
  end if;
  if v_vetor is not null and (split_part(v_vetor, '/', 1) <> p_participante::text or v_vetor like '%..%') then
    raise exception 'logo_caminho_invalido';
  end if;
  insert into public.logos_marca (participante_id, path, mime, nome_original, tamanho, largura, altura,
                                  path_vetor, mime_vetor, nome_vetor, origem, edicao_codigo)
  values (p_participante, v_path, left(p_dados->>'mime', 80), left(p_dados->>'nome_original', 200),
          nullif(p_dados->>'tamanho', '')::bigint, nullif(p_dados->>'largura', '')::integer, nullif(p_dados->>'altura', '')::integer,
          v_vetor, left(p_dados->>'mime_vetor', 80), left(p_dados->>'nome_vetor', 200), p_origem,
          (select edicao_codigo from public.participacoes where id = public.participacao_corrente(p_participante)))
  returning id into v_id;
  perform public.aplicar_logo(p_participante, v_id, 'logo.definida');
  return v_id;
end $$;

-- ── Organização ─────────────────────────────────────────────────────────────
-- Para as listas: a logo oficial de cada marca (+ se a edição já confirmou).
create or replace function public.get_logos(p_secret text)
returns table (participante_id uuid, path text, confirmada boolean, sugestao text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.pode(p_secret, 'dado.ler') then return; end if;
  return query
    select p.id, l.path,
           exists (select 1 from public.participacoes pa where pa.id = public.participacao_corrente(p.id) and pa.logo_id is not null),
           (select s.path from public.logo_sugestao(p.id, false) s)
      from public.participantes p
      left join public.logos_marca l on l.id = p.logo_id;
end $$;

create or replace function public.get_logo_marca(p_secret text, p_participante uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  return public.logo_info(p_participante, false);
end $$;

create or replace function public.definir_logo(p_secret text, p_participante uuid, p_dados jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
begin
  if not public.pode(p_secret, 'cadastro.editar') then raise exception 'nao_autorizado'; end if;
  return public.registrar_logo(p_participante, p_dados, 'organizacao');
end $$;

create or replace function public.usar_logo_acervo(p_secret text, p_participante uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_sug public.acervo_logos;
begin
  if not public.pode(p_secret, 'cadastro.editar') then raise exception 'nao_autorizado'; end if;
  v_sug := public.logo_sugestao(p_participante, false);
  if v_sug.chave is null then raise exception 'sem_sugestao'; end if;
  return public.registrar_logo(p_participante,
    jsonb_build_object('path', v_sug.path, 'mime', 'image/png', 'nome_original', v_sug.slug || '.png'), 'acervo');
end $$;

create or replace function public.restaurar_logo(p_secret text, p_logo uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_part uuid;
begin
  if not public.pode(p_secret, 'cadastro.editar') then raise exception 'nao_autorizado'; end if;
  select participante_id into v_part from public.logos_marca where id = p_logo;
  if v_part is null then raise exception 'logo_nao_encontrada'; end if;
  perform public.aplicar_logo(v_part, p_logo, 'logo.restaurada');
end $$;

create or replace function public.remover_logo(p_secret text, p_participante uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.pode(p_secret, 'cadastro.editar') then raise exception 'nao_autorizado'; end if;
  perform public.aplicar_logo(p_participante, null, 'logo.removida');
end $$;

-- ── Marca (sessão própria; a conta pausada não escreve) ─────────────────────
create or replace function public.meu_participante()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.participantes where user_id = auth.uid() and public.conta_ativa() limit 1
$$;

create or replace function public.marca_minha_logo()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_p uuid := public.meu_participante();
begin
  if v_p is null then raise exception 'sem_marca'; end if;
  return public.logo_info(v_p, true);
end $$;

create or replace function public.marca_definir_logo(p_dados jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_p uuid := public.meu_participante();
begin
  if v_p is null then raise exception 'sem_marca'; end if;
  return public.registrar_logo(v_p, p_dados, 'participante');
end $$;

create or replace function public.marca_usar_logo_acervo()
returns uuid language plpgsql security definer set search_path = public as $$
declare v_p uuid := public.meu_participante(); v_sug public.acervo_logos;
begin
  if v_p is null then raise exception 'sem_marca'; end if;
  v_sug := public.logo_sugestao(v_p, true);
  if v_sug.chave is null then raise exception 'sem_sugestao'; end if;
  return public.registrar_logo(v_p,
    jsonb_build_object('path', v_sug.path, 'mime', 'image/png', 'nome_original', v_sug.slug || '.png'), 'acervo');
end $$;

-- Participante recorrente: "Manter esta logo" confirma a mesma linha para a edição.
create or replace function public.marca_manter_logo()
returns void language plpgsql security definer set search_path = public as $$
declare v_p uuid := public.meu_participante(); v_logo uuid;
begin
  if v_p is null then raise exception 'sem_marca'; end if;
  select logo_id into v_logo from public.participantes where id = v_p;
  if v_logo is null then raise exception 'sem_logo'; end if;
  perform public.aplicar_logo(v_p, v_logo, 'logo.mantida');
end $$;

-- ── Progresso: a logo é o 17º campo obrigatório (guia.js camposObrigatorios) ─
create or replace function public.campos_cadastro(p_participacao uuid)
returns table (total integer, faltando integer)
language sql stable security definer set search_path = public as $$
  with pa as (select * from public.participacoes where id = p_participacao),
       p as (select pt.* from public.participantes pt join pa on pa.participante_id = pt.id),
       it as (select i.* from public.participantes_itens i where i.participacao_id = p_participacao),
       vazios as (
         select (case when coalesce(btrim(p.nome_marca), '') = '' then 1 else 0 end)
              + (case when coalesce(btrim(p.responsavel), '') = '' then 1 else 0 end)
              + (case when coalesce(btrim(p.telefone), '') = '' then 1 else 0 end)
              + (case when pa.logo_id is null then 1 else 0 end)
              + (case when coalesce(btrim(pa.tema_combo), '') = '' then 1 else 0 end)
              + (case when coalesce(btrim(pa.tema_justificativa), '') = '' then 1 else 0 end)
              + (case when pa.combo_preco is null or pa.combo_preco <= 0 then 1 else 0 end)
              + (case when exists (select 1 from public.participacao_unidades u where u.participacao_id = p_participacao
                                      and coalesce(btrim(u.endereco), '') <> '') then 0 else 1 end) as n
           from pa, p)
  select 17,
         (select n from vazios)
         + (select coalesce(sum((case when coalesce(btrim(nome), '') = '' then 1 else 0 end)
                              + (case when coalesce(btrim(descricao), '') = '' then 1 else 0 end)
                              + (case when coalesce(btrim(ingredientes), '') = '' then 1 else 0 end)), 0)::int from it)
         + 3 * greatest(0, 3 - (select count(*)::int from it))
$$;

-- ── Storage ─────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 10485760,
        array['image/svg+xml', 'image/png', 'image/webp', 'image/jpeg',
              'application/pdf', 'application/postscript', 'application/illustrator'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
                               allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists logos_marca_sobe on storage.objects;
create policy logos_marca_sobe on storage.objects for insert to authenticated
  with check (bucket_id = 'logos'
              and (storage.foldername(name))[1] = public.meu_participante()::text);

-- ── Permissões ──────────────────────────────────────────────────────────────
revoke execute on function public.logo_sugestao(uuid, boolean) from public, anon, authenticated;
revoke execute on function public.participacao_corrente(uuid) from public, anon, authenticated;
revoke execute on function public.logo_info(uuid, boolean) from public, anon, authenticated;
revoke execute on function public.aplicar_logo(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.registrar_logo(uuid, jsonb, text) from public, anon, authenticated;

revoke execute on function public.get_logos(text) from public, anon, authenticated;
revoke execute on function public.get_logo_marca(text, uuid) from public, anon, authenticated;
revoke execute on function public.definir_logo(text, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.usar_logo_acervo(text, uuid) from public, anon, authenticated;
revoke execute on function public.restaurar_logo(text, uuid) from public, anon, authenticated;
revoke execute on function public.remover_logo(text, uuid) from public, anon, authenticated;
grant execute on function public.get_logos(text) to anon, authenticated;
grant execute on function public.get_logo_marca(text, uuid) to anon, authenticated;
grant execute on function public.definir_logo(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.usar_logo_acervo(text, uuid) to anon, authenticated;
grant execute on function public.restaurar_logo(text, uuid) to anon, authenticated;
grant execute on function public.remover_logo(text, uuid) to anon, authenticated;

-- meu_participante entra na policy do storage: authenticated precisa executá-la.
revoke execute on function public.meu_participante() from public, anon, authenticated;
grant execute on function public.meu_participante() to authenticated;
revoke execute on function public.marca_minha_logo() from public, anon, authenticated;
revoke execute on function public.marca_definir_logo(jsonb) from public, anon, authenticated;
revoke execute on function public.marca_usar_logo_acervo() from public, anon, authenticated;
revoke execute on function public.marca_manter_logo() from public, anon, authenticated;
grant execute on function public.marca_minha_logo() to authenticated;
grant execute on function public.marca_definir_logo(jsonb) to authenticated;
grant execute on function public.marca_usar_logo_acervo() to authenticated;
grant execute on function public.marca_manter_logo() to authenticated;

-- ── Acervo (gerado por scripts/acervo-logos-para-sql.mjs) ───────────────────
insert into public.acervo_logos (chave, nome, slug, path) values
  (public.normalizar_nome('Adocee Doceria'), 'Adocee Doceria', 'adocee-doceria', '/logos/participants/adocee-doceria.png'),
  (public.normalizar_nome('Bolomania'), 'Bolomania', 'bolomania', '/logos/participants/bolomania.png'),
  (public.normalizar_nome('Caffè Basilico''s'), 'Caffè Basilico''s', 'caffe-basilicos', '/logos/participants/caffe-basilicos.png'),
  (public.normalizar_nome('Canuto''s'), 'Canuto''s', 'canutos', '/logos/participants/canutos.png'),
  (public.normalizar_nome('Caroli Douces'), 'Caroli Douces', 'caroli-douces', '/logos/participants/caroli-douces.png'),
  (public.normalizar_nome('Casa 1190 - Restaurant e Coffee'), 'Casa 1190 - Restaurant e Coffee', 'casa-1190', '/logos/participants/casa-1190.png'),
  (public.normalizar_nome('Casa de Taipa Tapiocaria'), 'Casa de Taipa Tapiocaria', 'casa-de-taipa-tapiocaria', '/logos/participants/casa-de-taipa-tapiocaria.png'),
  (public.normalizar_nome('Delicato Bolos'), 'Delicato Bolos', 'delicato-bolos', '/logos/participants/delicato-bolos.png'),
  (public.normalizar_nome('Douce di Maria'), 'Douce di Maria', 'douce-di-maria', '/logos/participants/douce-di-maria.png'),
  (public.normalizar_nome('Jolie Café Pâtisserie'), 'Jolie Café Pâtisserie', 'jolie-cafe-patisserie', '/logos/participants/jolie-cafe-patisserie.png'),
  (public.normalizar_nome('Just Food&Coffee'), 'Just Food&Coffee', 'just-food-coffee', '/logos/participants/just-food-coffee.png'),
  (public.normalizar_nome('Mangai'), 'Mangai', 'mangai', '/logos/participants/mangai.png'),
  (public.normalizar_nome('Mr. Cupcake Confeitaria'), 'Mr. Cupcake Confeitaria', 'mr-cupcake-confeitaria', '/logos/participants/mr-cupcake-confeitaria.png'),
  (public.normalizar_nome('O Maestro Café'), 'O Maestro Café', 'o-maestro-cafe', '/logos/participants/o-maestro-cafe.png'),
  (public.normalizar_nome('Olí Gastrô'), 'Olí Gastrô', 'oli-gastro', '/logos/participants/oli-gastro.png'),
  (public.normalizar_nome('Padoca do Bosque'), 'Padoca do Bosque', 'padoca-do-bosque', '/logos/participants/padoca-do-bosque.png'),
  (public.normalizar_nome('Paneer Pâtisserie'), 'Paneer Pâtisserie', 'paneer-patisserie', '/logos/participants/paneer-patisserie.png'),
  (public.normalizar_nome('Parma Doces'), 'Parma Doces', 'parma-doces', '/logos/participants/parma-doces.png'),
  (public.normalizar_nome('Rollab Confeitaria'), 'Rollab Confeitaria', 'rollab-confeitaria', '/logos/participants/rollab-confeitaria.png'),
  (public.normalizar_nome('Sweet Duo Confeitaria'), 'Sweet Duo Confeitaria', 'sweet-duo-confeitaria', '/logos/participants/sweet-duo-confeitaria.png'),
  (public.normalizar_nome('Wow Cookies'), 'Wow Cookies', 'wow-cookies', '/logos/participants/wow-cookies.png')
on conflict (chave) do update set nome = excluded.nome, slug = excluded.slug, path = excluded.path;
