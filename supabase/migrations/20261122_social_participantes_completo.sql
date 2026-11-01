-- 31/10/2026 (pedido do Wilker): Social media › Participantes vira a página completa — um cartão por participante, com todos os
-- campos à vista, o texto revisado e a marcação "Novo / Alterado" no campo que a MARCA mudou, até a pessoa marcar "Visto".
--
-- 1. `alteracoes_campo` — o que a marca mudou, campo a campo, com o valor de ANTES e o de DEPOIS. Gravada SÓ pelo gatilho
--    `alteracao_campo_marca` e SÓ quando quem grava é a própria marca (`meu_participante()`), como `marca_alterou`: a equipe,
--    a importação, o pg_cron e o "Ver como participante" não marcam nada. O salvamento automático grava a cada ~1 s: gravações
--    do mesmo campo em até 10 min viram UMA linha (o "antes" fica o primeiro, o "depois" o último).
--    ⚠️ O "Aplicar" do /preencher é gravação da equipe (org_preenchimento_decidir) e não marca — só o painel da marca marca.
-- 2. `editorial_vistos` — por PESSOA e participação, quando ela marcou "Visto". O campo aparece marcado para quem tem
--    alteração DEPOIS do próprio "visto" (a Micka e o Wilker têm cada um o seu).
-- 3. `revisoes_texto` — a versão revisada (ortografia, pontuação, maiúsculas) de um texto da marca, guardada À PARTE: o
--    cadastro e o site continuam com o que a marca escreveu. A revisão só vale enquanto o original for o mesmo; mudou o
--    original, a tela volta a mostrar o texto da marca (e a marcação "Alterado").
-- 4. `editorial_combos` passa a trazer as unidades, as revisões e as alterações não vistas por quem lê;
--    `editorial_marcar_visto` grava o "visto" (uma participação ou a edição inteira).
--
-- As três tabelas não têm policy: só as funções SECURITY DEFINER leem e gravam. Nenhuma linha existente muda; o gatilho
-- novo é independente de `marca_alterou` e, se falhar, nunca derruba o salvamento da marca.
-- Reversão em supabase/reverter/. Teste: supabase/testes/social-participantes-completo.sql.

create table if not exists public.alteracoes_campo (
  id bigint generated always as identity primary key,
  participacao_id uuid not null references public.participacoes(id) on delete cascade,
  campo text not null check (length(campo) between 1 and 120),
  antes text,
  depois text,
  em timestamptz not null default now()
);
create index if not exists alteracoes_campo_pa_em on public.alteracoes_campo (participacao_id, em);
create index if not exists alteracoes_campo_pa_campo_em on public.alteracoes_campo (participacao_id, campo, em desc);

create table if not exists public.editorial_vistos (
  user_id uuid not null,
  participacao_id uuid not null references public.participacoes(id) on delete cascade,
  visto_em timestamptz not null default now(),
  primary key (user_id, participacao_id)
);

create table if not exists public.revisoes_texto (
  participacao_id uuid not null references public.participacoes(id) on delete cascade,
  campo text not null check (length(campo) between 1 and 120),
  original text not null,
  revisado text not null check (length(btrim(revisado)) > 0),
  revisado_em timestamptz not null default now(),
  revisado_por_rotulo text,
  primary key (participacao_id, campo)
);

alter table public.alteracoes_campo enable row level security;
alter table public.editorial_vistos enable row level security;
alter table public.revisoes_texto enable row level security;
revoke all on public.alteracoes_campo, public.editorial_vistos, public.revisoes_texto from anon, authenticated;

-- ── registrar: uma linha por campo a cada 10 min de edição ───────────────────
create or replace function public.registrar_alteracao_campo(p_pa uuid, p_campo text, p_antes text, p_depois text)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare v_id bigint;
begin
  if p_pa is null or p_antes is not distinct from p_depois then return; end if;
  select id into v_id from public.alteracoes_campo
   where participacao_id = p_pa and campo = p_campo and em > now() - interval '10 minutes'
   order by em desc limit 1;
  if v_id is not null then
    update public.alteracoes_campo set depois = p_depois, em = now() where id = v_id;
  else
    insert into public.alteracoes_campo (participacao_id, campo, antes, depois) values (p_pa, p_campo, p_antes, p_depois);
  end if;
end $function$;
revoke all on function public.registrar_alteracao_campo(uuid, text, text, text) from public, anon, authenticated;

-- texto "limpo" de um valor jsonb (vazio = null)
create or replace function public.txt_campo(v jsonb)
 returns text language sql immutable set search_path to 'public'
as $function$ select nullif(btrim(case when v is null or v = 'null'::jsonb then '' when jsonb_typeof(v) = 'string' then v #>> '{}' else v::text end), '') $function$;

-- ── o gatilho ────────────────────────────────────────────────────────────────
create or replace function public.alteracao_campo_marca()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_eu uuid; a jsonb; n jsonb; r jsonb; v_pa uuid; v_part uuid; v_tipo text; v_item uuid; v_pu record;
  depois jsonb; antes jsonb; i integer;
  campos text[][] := '{}';
begin
  if pg_trigger_depth() > 1 then return null; end if;
  begin
    if current_setting('scw.silencioso', true) = 'on' or public.ver_como_ativo() then return null; end if;
    v_eu := public.meu_participante();
    if v_eu is null then return null; end if;

    a := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
    n := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
    r := case when tg_op = 'DELETE' then a else n end;

    if tg_table_name = 'participantes' then
      v_part := (r ->> 'id')::uuid;
      v_pa := public.participacao_corrente(v_part);
      campos := array[['instagram', public.txt_campo(a -> 'instagram'), public.txt_campo(n -> 'instagram')]];

    elsif tg_table_name = 'participacoes' then
      v_pa := (r ->> 'id')::uuid; v_part := (r ->> 'participante_id')::uuid;
      campos := array[
        ['tema', public.txt_campo(a -> 'tema_combo'), public.txt_campo(n -> 'tema_combo')],
        ['combo.nome', public.txt_campo(a -> 'combo_nome'), public.txt_campo(n -> 'combo_nome')],
        ['combo.descricao', public.txt_campo(a -> 'combo_descricao'), public.txt_campo(n -> 'combo_descricao')],
        ['combo.condicoes', public.txt_campo(a -> 'combo_condicoes'), public.txt_campo(n -> 'combo_condicoes')],
        ['para_viagem', public.txt_campo(a -> 'combo_para_viagem'), public.txt_campo(n -> 'combo_para_viagem')]];

    elsif tg_table_name = 'participantes_itens' then
      v_pa := (r ->> 'participacao_id')::uuid; v_tipo := r ->> 'tipo';
      campos := array[
        [v_tipo || '.nome', public.txt_campo(a -> 'nome'), public.txt_campo(n -> 'nome')],
        [v_tipo || '.descricao', public.txt_campo(a -> 'descricao'), public.txt_campo(n -> 'descricao')],
        [v_tipo || '.ingredientes', public.txt_campo(a -> 'ingredientes'), public.txt_campo(n -> 'ingredientes')]];

    elsif tg_table_name = 'declaracoes_alimentares' then
      v_item := (r ->> 'item_id')::uuid;
      if v_item is null then return null; end if; -- declaração da alternativa de uma troca: fora da tela
      select i.participacao_id, i.tipo into v_pa, v_tipo from public.participantes_itens i where i.id = v_item;
      -- o retrato do item inteiro (aspecto → estado), agora; o de antes troca só a linha desta gravação
      select coalesce(jsonb_object_agg(d.aspecto, d.estado || coalesce(' (' || nullif(btrim(d.observacao), '') || ')', '')), '{}')
        into depois from public.declaracoes_alimentares d where d.item_id = v_item;
      antes := depois;
      if n ? 'aspecto' then antes := antes - (n ->> 'aspecto'); end if;
      if a ? 'aspecto' then antes := antes || jsonb_build_object(a ->> 'aspecto', (a ->> 'estado') || coalesce(' (' || nullif(btrim(a ->> 'observacao'), '') || ')', '')); end if;
      campos := array[[v_tipo || '.alimentar', nullif(antes, '{}')::text, nullif(depois, '{}')::text]];

    elsif tg_table_name = 'substituicoes' then
      v_item := (r ->> 'item_id')::uuid;
      select i.participacao_id, i.tipo into v_pa, v_tipo from public.participantes_itens i where i.id = v_item;
      select coalesce(jsonb_object_agg(s.id, concat_ws(' → ', nullif(btrim(s.original), ''), nullif(btrim(s.alternativa), ''))
               || coalesce(' (+ ' || s.acrescimo::text || ')', '')), '{}')
        into depois from public.substituicoes s where s.item_id = v_item;
      antes := depois;
      if n ? 'id' then antes := antes - (n ->> 'id'); end if;
      if a ? 'id' then antes := antes || jsonb_build_object(a ->> 'id', concat_ws(' → ', nullif(btrim(a ->> 'original'), ''), nullif(btrim(a ->> 'alternativa'), ''))
               || coalesce(' (+ ' || (a ->> 'acrescimo') || ')', '')); end if;
      campos := array[[v_tipo || '.trocas', nullif(antes, '{}')::text, nullif(depois, '{}')::text]];

    elsif tg_table_name = 'unidades' then
      v_part := (r ->> 'participante_id')::uuid;
      v_pa := public.participacao_corrente(v_part);
      for v_pu in select pu.id_publico from public.participacao_unidades pu where pu.participacao_id = v_pa and pu.unidade_id = (r ->> 'id')::uuid loop
        campos := campos || array[
          ['unidade:' || v_pu.id_publico || '.nome', public.txt_campo(a -> 'nome_unidade'), public.txt_campo(n -> 'nome_unidade')],
          ['unidade:' || v_pu.id_publico || '.endereco',
            nullif(concat_ws(', ', public.txt_campo(a -> 'logradouro'), public.txt_campo(a -> 'numero'), public.txt_campo(a -> 'complemento'), public.txt_campo(a -> 'bairro'), public.txt_campo(a -> 'cidade'), public.txt_campo(a -> 'uf'), public.txt_campo(a -> 'cep'), public.txt_campo(a -> 'referencia')), ''),
            nullif(concat_ws(', ', public.txt_campo(n -> 'logradouro'), public.txt_campo(n -> 'numero'), public.txt_campo(n -> 'complemento'), public.txt_campo(n -> 'bairro'), public.txt_campo(n -> 'cidade'), public.txt_campo(n -> 'uf'), public.txt_campo(n -> 'cep'), public.txt_campo(n -> 'referencia')), '')],
          ['unidade:' || v_pu.id_publico || '.whatsapp', public.txt_campo(a -> 'whatsapp_publico'), public.txt_campo(n -> 'whatsapp_publico')]];
      end loop;

    elsif tg_table_name = 'participacao_unidades' then
      v_pa := (r ->> 'participacao_id')::uuid;
      campos := array[
        ['unidade:' || (r ->> 'id_publico') || '.atendimento',
          nullif(concat_ws(' · ', 'local: ' || public.txt_campo(a -> 'consumo_local'), 'retirada: ' || public.txt_campo(a -> 'retirada'), 'delivery: ' || public.txt_campo(a -> 'delivery_combo')), ''),
          nullif(concat_ws(' · ', 'local: ' || public.txt_campo(n -> 'consumo_local'), 'retirada: ' || public.txt_campo(n -> 'retirada'), 'delivery: ' || public.txt_campo(n -> 'delivery_combo')), '')],
        ['unidade:' || (r ->> 'id_publico') || '.horario', public.txt_campo(nullif(a -> 'horario_festival', '[]'::jsonb)), public.txt_campo(nullif(n -> 'horario_festival', '[]'::jsonb))]];
    else
      return null;
    end if;

    if v_part is null and v_pa is not null then
      select pa.participante_id into v_part from public.participacoes pa where pa.id = v_pa;
    end if;
    if v_pa is null or v_part is distinct from v_eu then return null; end if;

    for i in 1 .. coalesce(array_length(campos, 1), 0) loop
      perform public.registrar_alteracao_campo(v_pa, campos[i][1], campos[i][2], campos[i][3]);
    end loop;
  exception when others then
    raise warning 'alteracao_campo_marca: %', sqlerrm; -- nunca derruba o salvamento da marca
  end;
  return null;
end $function$;
revoke all on function public.alteracao_campo_marca() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['participantes', 'participacoes', 'participantes_itens', 'declaracoes_alimentares', 'substituicoes', 'unidades', 'participacao_unidades'] loop
    execute format('drop trigger if exists alteracao_campo_marca on public.%I', t);
    execute format('create trigger alteracao_campo_marca after insert or update or delete on public.%I for each row execute function public.alteracao_campo_marca()', t);
  end loop;
end $$;

-- ── leitura ──────────────────────────────────────────────────────────────────
create or replace function public.editorial_combos(p_secret text, p_edicao text default null)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare v_ed text; v_eu uuid := auth.uid();
begin
  perform public.redes_exigir(p_secret, 'editorial.ler');
  v_ed := coalesce(nullif(p_edicao, ''), (select edicao_atual from public.admin_config limit 1));
  return jsonb_build_object(
    'edicao', (select jsonb_build_object('codigo', e.codigo, 'nome', e.nome, 'valor_combo', e.valor_combo,
                                         'festival_inicio', e.festival_inicio, 'festival_fim', e.festival_fim)
                 from public.edicoes e where e.codigo = v_ed),
    'combos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'participacao_id', pa.id, 'participante_id', pt.id, 'marca', pt.nome_marca,
               'instagram', nullif(btrim(pt.instagram), ''),
               'tema', pa.tema_combo, 'status_cadastro', pa.status_cadastro, 'combo_status', pa.combo_status,
               'alterado_apos_aprovacao', pa.alterado_apos_aprovacao, 'para_viagem', pa.combo_para_viagem,
               'combo', mp.p -> 'combo',
               'unidades', coalesce(mp.p -> 'unidades', '[]'::jsonb),
               'revisoes', coalesce((select jsonb_object_agg(rv.campo, jsonb_build_object('original', rv.original, 'revisado', rv.revisado))
                                       from public.revisoes_texto rv where rv.participacao_id = pa.id), '{}'::jsonb),
               'visto_em', vi.visto_em,
               'alteracoes', coalesce((
                  select jsonb_object_agg(x.campo, jsonb_build_object('antes', x.antes, 'removido', x.depois is null, 'em', x.em))
                    from (select ac.campo,
                                 (array_agg(ac.antes order by ac.em asc, ac.id asc))[1] as antes,
                                 (array_agg(ac.depois order by ac.em desc, ac.id desc))[1] as depois,
                                 max(ac.em) as em
                            from public.alteracoes_campo ac
                           where ac.participacao_id = pa.id and ac.em > coalesce(vi.visto_em, '-infinity'::timestamptz)
                           group by ac.campo) x
                   where x.antes is distinct from x.depois), '{}'::jsonb))
             order by lower(pt.nome_marca))
        from public.participacoes pa
        join public.participantes pt on pt.id = pa.participante_id
        cross join lateral (select public.montar_publico(pa.id, 'marca_e_combo') as p) mp
        left join public.editorial_vistos vi on vi.participacao_id = pa.id and vi.user_id = v_eu
       where pa.edicao_codigo = v_ed and pa.status_cadastro is distinct from 'encerrado' and pt.arquivado_em is null), '[]'::jsonb));
end $$;
revoke all on function public.editorial_combos(text, text) from public;
grant execute on function public.editorial_combos(text, text) to anon, authenticated;

-- "Marquei como visto": uma participação, ou (p_participacao nulo) todas as da edição. Só conta pessoal (o visto é da pessoa).
create or replace function public.editorial_marcar_visto(p_secret text, p_participacao uuid default null, p_edicao text default null)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare v_eu uuid := auth.uid(); v_ed text; v_n integer;
begin
  perform public.redes_exigir(p_secret, 'editorial.ler');
  if v_eu is null then raise exception 'conta_pessoal'; end if;
  v_ed := coalesce(nullif(p_edicao, ''), (select edicao_atual from public.admin_config limit 1));
  insert into public.editorial_vistos (user_id, participacao_id, visto_em)
  select v_eu, pa.id, now() from public.participacoes pa
   where (p_participacao is not null and pa.id = p_participacao)
      or (p_participacao is null and pa.edicao_codigo = v_ed and pa.status_cadastro is distinct from 'encerrado')
  on conflict (user_id, participacao_id) do update set visto_em = excluded.visto_em;
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke all on function public.editorial_marcar_visto(text, uuid, text) from public;
grant execute on function public.editorial_marcar_visto(text, uuid, text) to anon, authenticated;
