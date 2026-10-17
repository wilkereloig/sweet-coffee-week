-- ─────────────────────────────────────────────────────────────────────────────
-- Social media › Biblioteca com PASTAS (17/10/2026). Depende de
-- 20261017_social_media.sql (e das seguintes do Social media).
-- Aplica-se pelo arquivo do commit (pg_net + sha256), como as anteriores; sem
-- ela o painel mostra a biblioteca sem pastas. Só acrescenta: substitui
-- social_biblioteca e social_biblioteca_registrar com a MESMA assinatura e o
-- mesmo retorno (+ pasta_id), então o painel anterior continua funcionando.
--
-- Pastas VIRTUAIS: organizam o que a biblioteca já lista (arte, foto do combo,
-- foto da loja, logo, material da campanha) por REFERÊNCIA ao registro de
-- origem — (tipo, id). Nada no Storage muda: bucket, caminho, versões, crédito,
-- revisão e as referências das postagens ficam como estão. Renomear ou mover
-- uma pasta não mexe em objeto nenhum.
--   social_pastas               — hierarquia (pai_id), vínculo opcional a
--                                 edição/participante, arquivamento (nunca apagar)
--   social_biblioteca_pasta_item — onde cada material está; sem linha = "Sem pasta"
--   social_biblioteca_registro   — auditoria (quem, quando, o quê)
-- Organizar (criar, renomear, mover, arquivar, mover materiais) = redes.gerir.
-- Ver a hierarquia = redes.ver. Tudo por RPC security definer; tabelas fechadas.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.social_pastas (
  id uuid primary key default gen_random_uuid(),
  pai_id uuid references public.social_pastas(id) on delete restrict,
  nome text not null check (char_length(btrim(nome)) between 1 and 80 and nome = btrim(nome) and position('/' in nome) = 0),
  edicao_codigo text references public.edicoes(codigo) on delete set null,
  participante_id uuid references public.participantes(id) on delete set null,
  criada_em timestamptz not null default now(),
  criada_por_id uuid default auth.uid(),
  criada_por_rotulo text,
  atualizada_em timestamptz not null default now(),
  arquivada_em timestamptz,
  arquivada_por_rotulo text,
  check (pai_id is null or pai_id <> id)
);
-- Nome único (sem diferença de maiúsculas) entre as pastas ATIVAS do mesmo nível.
create unique index if not exists social_pastas_nome_nivel on public.social_pastas
  (coalesce(pai_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(nome)) where arquivada_em is null;
create index if not exists social_pastas_pai on public.social_pastas (pai_id) where arquivada_em is null;

create table if not exists public.social_biblioteca_pasta_item (
  tipo text not null check (tipo in ('arte', 'foto_combo', 'foto_loja', 'logo', 'campanha')),
  item_id uuid not null,
  pasta_id uuid not null references public.social_pastas(id) on delete restrict,
  movido_em timestamptz not null default now(),
  movido_por_id uuid default auth.uid(),
  movido_por_rotulo text,
  primary key (tipo, item_id)
);
create index if not exists social_biblioteca_pasta_item_pasta on public.social_biblioteca_pasta_item (pasta_id);

create table if not exists public.social_biblioteca_registro (
  id bigint generated always as identity primary key,
  em timestamptz not null default now(),
  ator_id uuid default auth.uid(),
  ator_rotulo text,
  acao text not null check (acao in ('pasta.criada', 'pasta.editada', 'pasta.movida', 'pasta.arquivada', 'material.movido', 'material.enviado')),
  pasta_id uuid,
  detalhe jsonb not null default '{}'::jsonb
);

alter table public.social_pastas enable row level security;
alter table public.social_biblioteca_pasta_item enable row level security;
alter table public.social_biblioteca_registro enable row level security;
revoke all on public.social_pastas, public.social_biblioteca_pasta_item, public.social_biblioteca_registro from public, anon, authenticated;

-- ── Internas ─────────────────────────────────────────────────────────────────
create or replace function public.social_registrar(p_acao text, p_pasta uuid, p_detalhe jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.social_biblioteca_registro (ator_id, ator_rotulo, acao, pasta_id, detalhe)
  values (auth.uid(), public.ator_rotulo_atual(), p_acao, p_pasta, coalesce(p_detalhe, '{}'::jsonb));
$$;

-- Pasta ativa (nulo = raiz da biblioteca). Arquivada não recebe nada.
create or replace function public.social_pasta_ativa(p_id uuid)
returns public.social_pastas language plpgsql stable security definer set search_path = public as $$
declare p public.social_pastas;
begin
  select * into p from public.social_pastas where id = p_id;
  if not found then raise exception 'pasta_inexistente' using errcode = 'P0002'; end if;
  if p.arquivada_em is not null then raise exception 'pasta_arquivada' using errcode = '22023'; end if;
  return p;
end $$;

create or replace function public.social_nome_pasta(p_nome text)
returns text language plpgsql immutable set search_path = public as $$
declare n text := regexp_replace(btrim(coalesce(p_nome, '')), '\s+', ' ', 'g');
begin
  if n = '' then raise exception 'nome_vazio' using errcode = '22023'; end if;
  if char_length(n) > 80 then raise exception 'nome_longo' using errcode = '22023'; end if;
  if position('/' in n) > 0 then raise exception 'nome_invalido' using errcode = '22023'; end if;
  return n;
end $$;

-- O material existe e está na biblioteca (mesmas regras de social_biblioteca)?
-- Impede vínculo quebrado: só organiza o que a biblioteca de fato lista.
create or replace function public.social_item_existe(p_tipo text, p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case p_tipo
    when 'arte' then exists (select 1 from public.redes_arquivos a where a.id = p_id and a.bucket = 'redes')
    when 'foto_combo' then exists (select 1 from public.midias_participacao m where m.id = p_id and m.papel <> 'loja' and m.estado <> 'recusada')
    when 'foto_loja' then exists (select 1 from public.midias_participacao m where m.id = p_id and m.papel = 'loja' and m.estado <> 'recusada')
    when 'logo' then exists (select 1 from public.logos_marca l where l.id = p_id)
    when 'campanha' then exists (select 1 from public.arquivos ar where ar.id = p_id and ar.escopo = 'geral' and not ar.arquivado
                                   and ar.publicado_em is not null and ar.categoria in ('identidade', 'combo', 'guia'))
    else false end
$$;

revoke all on function public.social_registrar(text, uuid, jsonb), public.social_pasta_ativa(uuid),
  public.social_nome_pasta(text), public.social_item_existe(text, uuid) from public, anon, authenticated;

-- ── Leitura ──────────────────────────────────────────────────────────────────
-- Todas as pastas ativas (a árvore é montada no painel), com o que cada uma tem.
create or replace function public.social_pastas_listar(p_secret text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public.redes_exigir(p_secret, 'redes.ver');
  return jsonb_build_object(
    'pastas', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id, 'pai_id', p.pai_id, 'nome', p.nome, 'edicao_codigo', p.edicao_codigo,
               'participante_id', p.participante_id, 'participante_nome', pt.nome_marca,
               'criada_em', p.criada_em, 'criada_por_rotulo', p.criada_por_rotulo, 'atualizada_em', p.atualizada_em,
               'n_itens', (select count(*) from public.social_biblioteca_pasta_item i where i.pasta_id = p.id),
               'n_pastas', (select count(*) from public.social_pastas f where f.pai_id = p.id and f.arquivada_em is null))
             order by lower(p.nome))
        from public.social_pastas p left join public.participantes pt on pt.id = p.participante_id
       where p.arquivada_em is null), '[]'::jsonb),
    'pode_organizar', public.pode(p_secret, 'redes.gerir'));
end $$;

-- ── Organizar (redes.gerir) ──────────────────────────────────────────────────
create or replace function public.social_pasta_criar(p_secret text, p_dados jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.social_pastas; v_pai uuid := nullif(p_dados->>'pai_id', '')::uuid;
begin
  perform public.redes_exigir(p_secret, 'redes.gerir');
  perform pg_advisory_xact_lock(4207191019); -- organizar é raro: uma operação de pasta por vez (sem ciclo nem destino arquivado em corrida)
  if v_pai is not null then perform public.social_pasta_ativa(v_pai); end if;
  begin
    insert into public.social_pastas (pai_id, nome, edicao_codigo, participante_id, criada_por_id, criada_por_rotulo)
    values (v_pai, public.social_nome_pasta(p_dados->>'nome'), nullif(p_dados->>'edicao_codigo', ''),
            nullif(p_dados->>'participante_id', '')::uuid, auth.uid(), public.ator_rotulo_atual())
    returning * into p;
  exception when unique_violation then raise exception 'nome_repetido' using errcode = '23505';
  end;
  perform public.social_registrar('pasta.criada', p.id, jsonb_build_object('nome', p.nome, 'pai_id', p.pai_id));
  return to_jsonb(p);
end $$;

-- Renomear e (des)vincular edição/participante. Só as chaves enviadas mudam.
create or replace function public.social_pasta_editar(p_secret text, p_id uuid, p_dados jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare antes public.social_pastas; p public.social_pastas;
begin
  perform public.redes_exigir(p_secret, 'redes.gerir');
  perform pg_advisory_xact_lock(4207191019); -- organizar é raro: uma operação de pasta por vez (sem ciclo nem destino arquivado em corrida)
  antes := public.social_pasta_ativa(p_id);
  begin
    update public.social_pastas set
      nome = case when p_dados ? 'nome' then public.social_nome_pasta(p_dados->>'nome') else nome end,
      edicao_codigo = case when p_dados ? 'edicao_codigo' then nullif(p_dados->>'edicao_codigo', '') else edicao_codigo end,
      participante_id = case when p_dados ? 'participante_id' then nullif(p_dados->>'participante_id', '')::uuid else participante_id end,
      atualizada_em = now()
     where id = p_id returning * into p;
  exception when unique_violation then raise exception 'nome_repetido' using errcode = '23505';
  end;
  perform public.social_registrar('pasta.editada', p_id, jsonb_build_object(
    'de', jsonb_build_object('nome', antes.nome, 'edicao_codigo', antes.edicao_codigo, 'participante_id', antes.participante_id),
    'para', jsonb_build_object('nome', p.nome, 'edicao_codigo', p.edicao_codigo, 'participante_id', p.participante_id)));
  return to_jsonb(p);
end $$;

-- Mover pasta (nulo = raiz). Nunca para dentro dela mesma nem de uma descendente.
create or replace function public.social_pasta_mover(p_secret text, p_id uuid, p_destino uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare antes public.social_pastas; p public.social_pastas;
begin
  perform public.redes_exigir(p_secret, 'redes.gerir');
  perform pg_advisory_xact_lock(4207191019); -- organizar é raro: uma operação de pasta por vez (sem ciclo nem destino arquivado em corrida)
  antes := public.social_pasta_ativa(p_id);
  if p_destino is not null then
    perform public.social_pasta_ativa(p_destino);
    if p_destino = p_id or exists (
      with recursive desc_ as (select id from public.social_pastas where pai_id = p_id
                               union select f.id from public.social_pastas f join desc_ d on f.pai_id = d.id)
      select 1 from desc_ where id = p_destino) then
      raise exception 'ciclo' using errcode = '22023';
    end if;
  end if;
  if antes.pai_id is not distinct from p_destino then return to_jsonb(antes); end if;
  begin
    update public.social_pastas set pai_id = p_destino, atualizada_em = now() where id = p_id returning * into p;
  exception when unique_violation then raise exception 'nome_repetido' using errcode = '23505';
  end;
  perform public.social_registrar('pasta.movida', p_id, jsonb_build_object('de', antes.pai_id, 'para', p_destino));
  return to_jsonb(p);
end $$;

-- Arquivar (nunca apagar; nada sai do Storage). Pasta com conteúdo exige
-- p_confirmar: subpastas e materiais vão para o nível de cima (a pasta-mãe, ou
-- a raiz/"Sem pasta"). Nome repetido no destino: a tela pede para renomear antes.
create or replace function public.social_pasta_arquivar(p_secret text, p_id uuid, p_confirmar boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.social_pastas; n_itens int; n_pastas int;
begin
  perform public.redes_exigir(p_secret, 'redes.gerir');
  perform pg_advisory_xact_lock(4207191019); -- organizar é raro: uma operação de pasta por vez (sem ciclo nem destino arquivado em corrida)
  p := public.social_pasta_ativa(p_id);
  select count(*) into n_itens from public.social_biblioteca_pasta_item where pasta_id = p_id;
  select count(*) into n_pastas from public.social_pastas where pai_id = p_id and arquivada_em is null;
  if (n_itens > 0 or n_pastas > 0) and not coalesce(p_confirmar, false) then
    raise exception 'pasta_com_conteudo' using errcode = '22023', detail = n_pastas || ' pasta(s), ' || n_itens || ' material(is)';
  end if;
  update public.social_pastas set arquivada_em = now(), arquivada_por_rotulo = public.ator_rotulo_atual() where id = p_id;
  begin
    update public.social_pastas set pai_id = p.pai_id, atualizada_em = now() where pai_id = p_id and arquivada_em is null;
  exception when unique_violation then raise exception 'nome_repetido_no_destino' using errcode = '23505';
  end;
  if p.pai_id is null then delete from public.social_biblioteca_pasta_item where pasta_id = p_id; -- volta para "Sem pasta"
  else update public.social_biblioteca_pasta_item set pasta_id = p.pai_id, movido_em = now(), movido_por_id = auth.uid(),
         movido_por_rotulo = public.ator_rotulo_atual() where pasta_id = p_id;
  end if;
  perform public.social_registrar('pasta.arquivada', p_id, jsonb_build_object('nome', p.nome, 'conteudo_para', p.pai_id,
    'pastas', n_pastas, 'materiais', n_itens));
  return jsonb_build_object('id', p_id, 'conteudo_para', p.pai_id, 'pastas', n_pastas, 'materiais', n_itens);
end $$;

-- Mover materiais em conjunto (nulo = "Sem pasta"). Todos ou nenhum.
create or replace function public.social_biblioteca_mover(p_secret text, p_itens jsonb, p_pasta uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare it jsonb; v_tipo text; v_id uuid; n int := 0;
begin
  perform public.redes_exigir(p_secret, 'redes.gerir');
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then raise exception 'nada_selecionado' using errcode = '22023'; end if;
  if jsonb_array_length(p_itens) > 500 then raise exception 'selecao_grande' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(4207191019); -- organizar é raro: uma operação de pasta por vez (sem ciclo nem destino arquivado em corrida)
  if p_pasta is not null then perform public.social_pasta_ativa(p_pasta); end if;
  for it in select * from jsonb_array_elements(p_itens) loop
    v_tipo := it->>'tipo'; v_id := nullif(it->>'id', '')::uuid;
    if v_id is null or not public.social_item_existe(v_tipo, v_id) then raise exception 'arquivo_inexistente' using errcode = 'P0002'; end if;
    if p_pasta is null then delete from public.social_biblioteca_pasta_item where tipo = v_tipo and item_id = v_id;
    else insert into public.social_biblioteca_pasta_item (tipo, item_id, pasta_id, movido_por_id, movido_por_rotulo)
         values (v_tipo, v_id, p_pasta, auth.uid(), public.ator_rotulo_atual())
         on conflict (tipo, item_id) do update set pasta_id = excluded.pasta_id, movido_em = now(),
           movido_por_id = excluded.movido_por_id, movido_por_rotulo = excluded.movido_por_rotulo;
    end if;
    n := n + 1;
  end loop;
  perform public.social_registrar('material.movido', p_pasta, jsonb_build_object('itens', p_itens, 'para', p_pasta));
  return jsonb_build_object('movidos', n, 'pasta_id', p_pasta);
end $$;

-- ── A biblioteca, agora com pasta (substitui a de 20261017_social_media.sql) ──
-- Retrocompatível: sem os filtros novos devolve o mesmo de antes + `pasta_id`.
-- Filtros novos: `pasta` ('' = todas · 'sem' = sem pasta · uuid = só naquela
-- pasta), `recentes` (true = os 60 mais novos), `ordem` ('nome' | 'recente').
create or replace function public.social_biblioteca(p_secret text, p_filtros jsonb default '{}'::jsonb)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  f jsonb := coalesce(p_filtros, '{}'::jsonb);
  f_tipo text := nullif(f->>'tipo', '');
  f_ed text := nullif(f->>'edicao', '');
  f_part uuid := nullif(f->>'participante', '')::uuid;
  f_sit text := nullif(f->>'situacao', '');
  f_q text := nullif(btrim(coalesce(f->>'q', '')), '');
  f_pasta text := nullif(f->>'pasta', '');
  f_recentes boolean := coalesce((f->>'recentes')::boolean, false);
  f_ordem text := coalesce(nullif(f->>'ordem', ''), 'recente');
  v_limite int := case when f_recentes then 60 else 300 end;
begin
  perform public.redes_exigir(p_secret, 'redes.ver');
  return coalesce((
    with itens as (
      (select distinct on (a.path) jsonb_build_object(
               'tipo', 'arte', 'id', a.id, 'bucket', 'redes', 'path', a.path, 'miniatura_path', a.miniatura_path,
               'nome', a.nome, 'mime', a.mime, 'versao', a.versao::text, 'largura', a.largura, 'altura', a.altura, 'tamanho', a.tamanho,
               'edicao_codigo', coalesce(a.edicao_codigo, p.edicao_codigo),
               'participante_id', coalesce(a.participante_id, p.participante_id),
               'situacao', case when a.removido_em is null then 'disponivel' when a.substituido_por is not null then 'substituida' else 'removida' end,
               'vinculo', coalesce(p.titulo, 'Biblioteca'), 'post_id', p.id,
               'criado_em', a.criado_em, 'criado_por_rotulo', a.criado_por_rotulo, 'criado_por_id', a.criado_por_id) x
        from public.redes_arquivos a left join public.redes_posts p on p.id = a.post_id
       where a.bucket = 'redes'
       order by a.path, a.criado_em)
      union all
      select jsonb_build_object(
               'tipo', case when m.papel = 'loja' then 'foto_loja' else 'foto_combo' end, 'id', m.id,
               'bucket', 'edicao-publico', 'path', m.path, 'nome',
               coalesce(nullif(btrim(m.alt), ''), case m.papel when 'combo_principal' then 'Foto principal do combo'
                 when 'combo_galeria' then 'Foto do combo' when 'item' then 'Foto de componente' else 'Foto da loja' end),
               'mime', 'image/webp', 'largura', m.largura, 'altura', m.altura,
               'edicao_codigo', pa.edicao_codigo, 'participante_id', pa.participante_id,
               'situacao', m.estado,
               'vinculo', case m.papel when 'combo_principal' then 'Principal do combo' when 'combo_galeria' then 'Galeria do combo'
                 when 'item' then 'Componente' else 'Loja' end,
               'credito', m.credito, 'criado_em', m.criado_em, 'criado_por_rotulo', m.criado_por)
        from public.midias_participacao m join public.participacoes pa on pa.id = m.participacao_id
       where m.estado <> 'recusada'
      union all
      select jsonb_build_object(
               'tipo', 'logo', 'id', l.id, 'bucket', 'logos', 'path', l.path,
               'nome', coalesce(nullif(btrim(l.nome_original), ''), 'Logo'), 'mime', l.mime, 'tamanho', l.tamanho,
               'largura', l.largura, 'altura', l.altura, 'edicao_codigo', l.edicao_codigo, 'participante_id', l.participante_id,
               'situacao', case when l.id = pt.logo_id or exists (select 1 from public.participacoes x where x.logo_id = l.id)
                                then 'oficial' else 'anterior' end,
               'vinculo', 'Logo do participante', 'criado_em', l.criado_em, 'criado_por_rotulo', l.criado_por_rotulo)
        from public.logos_marca l join public.participantes pt on pt.id = l.participante_id
      union all
      select jsonb_build_object(
               'tipo', 'campanha', 'id', ar.id, 'bucket', 'arquivos', 'path', ar.path, 'nome', ar.nome, 'mime', ar.mime,
               'versao', ar.versao, 'tamanho', ar.tamanho,
               'situacao', case when ar.publicado_em is not null then 'publicado' else 'nao_publicado' end,
               'vinculo', 'Material geral · ' || ar.categoria,
               'criado_em', coalesce(ar.publicado_em, ar.created_at))
        from public.arquivos ar
       where ar.escopo = 'geral' and not ar.arquivado and ar.publicado_em is not null
         and ar.categoria in ('identidade', 'combo', 'guia')
    ),
    com_pasta as (
      select it.x || jsonb_build_object('participante_nome', pt.nome_marca, 'pasta_id', pi.pasta_id) y
        from itens it
        left join public.participantes pt on pt.id::text = it.x->>'participante_id'
        left join public.social_biblioteca_pasta_item pi on pi.tipo = it.x->>'tipo' and pi.item_id::text = it.x->>'id'
       where (f_tipo is null or it.x->>'tipo' = f_tipo)
         and (f_ed is null or coalesce(it.x->>'edicao_codigo', f_ed) = f_ed)
         and (f_part is null or it.x->>'participante_id' = f_part::text)
         and (f_sit is null
              or (f_sit = 'disponivel' and it.x->>'situacao' not in ('substituida', 'removida', 'recusada', 'anterior'))
              or it.x->>'situacao' = f_sit)
         and (f_q is null or (it.x->>'nome') ilike '%' || f_q || '%' or (it.x->>'vinculo') ilike '%' || f_q || '%'
              or pt.nome_marca ilike '%' || f_q || '%')
         and (f_pasta is null or (f_pasta = 'sem' and pi.pasta_id is null) or pi.pasta_id::text = f_pasta)
    )
    -- O corte é sempre pelos MAIS RECENTES (como antes); a ordem por nome vem depois.
    select jsonb_agg(c.y order by case when f_ordem = 'nome' then lower(c.y->>'nome') end, c.y->>'criado_em' desc)
      from (select y from com_pasta order by y->>'criado_em' desc limit v_limite) c
  ), '[]'::jsonb);
end $$;

-- Arte final enviada direto à biblioteca: agora pode nascer DENTRO de uma pasta.
create or replace function public.social_biblioteca_registrar(p_secret text, p_dados jsonb)
returns jsonb language plpgsql security definer set search_path = public, storage as $$
declare a public.redes_arquivos; caminho text := p_dados->>'path'; mini text := nullif(p_dados->>'miniatura_path', '');
  v_pasta uuid := nullif(p_dados->>'pasta_id', '')::uuid;
begin
  perform public.redes_exigir(p_secret, 'redes.gerir');
  if caminho is null or (mini is not null and split_part(mini, '/', 1) <> split_part(caminho, '/', 1)) then
    raise exception 'caminho_invalido' using errcode = '22023';
  end if;
  if v_pasta is not null then
    perform pg_advisory_xact_lock(4207191019); -- organizar é raro: uma operação de pasta por vez (sem ciclo nem destino arquivado em corrida)
    perform public.social_pasta_ativa(v_pasta);
  end if;
  perform public.redes_conferir_objeto(caminho, (p_dados->>'tamanho')::bigint);
  if exists (select 1 from public.redes_arquivos where bucket = 'redes' and path = caminho) then raise exception 'arquivo_repetido' using errcode = '23505'; end if;
  insert into public.redes_arquivos (post_id, path, miniatura_path, nome, mime, tamanho, largura, altura, duracao, alt,
                                     edicao_codigo, participante_id, criado_por_id, criado_por_rotulo)
  values (null, caminho, mini, left(coalesce(nullif(btrim(p_dados->>'nome'), ''), 'arquivo'), 200), p_dados->>'mime',
          (p_dados->>'tamanho')::bigint, nullif(p_dados->>'largura', '')::int, nullif(p_dados->>'altura', '')::int,
          nullif(p_dados->>'duracao', '')::numeric, left(coalesce(p_dados->>'alt', ''), 1000),
          nullif(p_dados->>'edicao_codigo', ''), nullif(p_dados->>'participante_id', '')::uuid,
          auth.uid(), public.ator_rotulo_atual())
  returning * into a;
  if v_pasta is not null then
    insert into public.social_biblioteca_pasta_item (tipo, item_id, pasta_id, movido_por_id, movido_por_rotulo)
    values ('arte', a.id, v_pasta, auth.uid(), public.ator_rotulo_atual());
  end if;
  perform public.social_registrar('material.enviado', v_pasta, jsonb_build_object('id', a.id, 'nome', a.nome));
  return to_jsonb(a) || jsonb_build_object('pasta_id', v_pasta);
end $$;

-- Arte substituída na postagem vira OUTRA linha (versão +1): ela herda a pasta da anterior.
create or replace function public.social_pasta_herdar_versao()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.social_biblioteca_pasta_item (tipo, item_id, pasta_id, movido_por_id, movido_por_rotulo)
  select 'arte', new.substituido_por, i.pasta_id, auth.uid(), public.ator_rotulo_atual()
    from public.social_biblioteca_pasta_item i where i.tipo = 'arte' and i.item_id = new.id
  on conflict (tipo, item_id) do nothing;
  return new;
end $$;
revoke all on function public.social_pasta_herdar_versao() from public, anon, authenticated;
drop trigger if exists social_pasta_herdar_versao on public.redes_arquivos;
create trigger social_pasta_herdar_versao after update of substituido_por on public.redes_arquivos
  for each row when (new.substituido_por is not null and old.substituido_por is distinct from new.substituido_por)
  execute function public.social_pasta_herdar_versao();

revoke all on function public.social_pastas_listar(text), public.social_pasta_criar(text, jsonb),
  public.social_pasta_editar(text, uuid, jsonb), public.social_pasta_mover(text, uuid, uuid),
  public.social_pasta_arquivar(text, uuid, boolean), public.social_biblioteca_mover(text, jsonb, uuid) from public;
grant execute on function public.social_pastas_listar(text), public.social_pasta_criar(text, jsonb),
  public.social_pasta_editar(text, uuid, jsonb), public.social_pasta_mover(text, uuid, uuid),
  public.social_pasta_arquivar(text, uuid, boolean), public.social_biblioteca_mover(text, jsonb, uuid) to anon, authenticated;
-- (mesmo padrão das RPCs do Social media: a permissão de verdade é o redes_exigir de cada uma.)
