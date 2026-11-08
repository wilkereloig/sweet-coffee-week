-- Disponibilidade operacional do combo, separada do horário publicado e das vendas.
-- O aviso pertence à participação inteira, vale pelo dia local de Fortaleza e expira pela consulta pública.

create table if not exists public.combo_esgotado_dia (
  id uuid primary key default gen_random_uuid(),
  participacao_id uuid not null references public.participacoes(id) on delete cascade,
  dia date not null,
  esgotado_em timestamptz not null default now(),
  reabastecido_em timestamptz,
  unique (participacao_id, dia)
);
create index if not exists combo_esgotado_dia_ativos
  on public.combo_esgotado_dia (dia, participacao_id) where reabastecido_em is null;
alter table public.combo_esgotado_dia enable row level security;
revoke all on public.combo_esgotado_dia from public, anon, authenticated;

create or replace function public.marca_combo_esgotado_estado(p_participacao uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_dia date := (now() at time zone 'America/Fortaleza')::date;
begin
  if not public.marca_dona_participacao(p_participacao) then raise exception 'nao_autorizado'; end if;
  return jsonb_build_object('esgotado', exists (
    select 1 from public.combo_esgotado_dia e
     where e.participacao_id = p_participacao and e.dia = v_dia and e.reabastecido_em is null));
end $$;

create or replace function public.marca_combo_esgotado(p_participacao uuid, p_esgotado boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_dia date := (now() at time zone 'America/Fortaleza')::date;
  v_nome text; v_edicao text; v_id uuid;
begin
  if not public.marca_dona_participacao(p_participacao) then raise exception 'nao_autorizado'; end if;
  if p_esgotado is null then raise exception 'estado_invalido'; end if;
  select p.nome_marca, pa.edicao_codigo
    into v_nome, v_edicao
    from public.participacoes pa
    join public.participantes p on p.id = pa.participante_id
    join public.edicoes e on e.codigo = pa.edicao_codigo
   where pa.id = p_participacao and pa.status_cadastro <> 'encerrado'
     and v_dia between e.festival_inicio and e.festival_fim;
  if not found then raise exception 'fora_do_festival'; end if;
  if not exists (
    select 1 from public.edicao_publicacao ep
    join public.publicacoes pb on pb.participacao_id = p_participacao and pb.vigente and pb.nivel = 'marca_e_combo'
    where ep.edicao_codigo = v_edicao and ep.combos_publicos
  ) then raise exception 'combo_nao_publicado'; end if;

  if p_esgotado then
    insert into public.combo_esgotado_dia (participacao_id, dia)
    values (p_participacao, v_dia)
    on conflict (participacao_id, dia) do update
      set esgotado_em = now(), reabastecido_em = null
      where public.combo_esgotado_dia.reabastecido_em is not null
    returning id into v_id;
    if v_id is not null then
      perform public.notificar('organizacao', null, 'combo_esgotado',
        v_nome || ' informou que o combo esgotou',
        'A casa marcou o combo como esgotado hoje. O aviso já aparece no mapa.',
        'marcas/' || (select participante_id::text from public.participacoes where id = p_participacao));
    end if;
  else
    update public.combo_esgotado_dia
       set reabastecido_em = now()
     where participacao_id = p_participacao and dia = v_dia and reabastecido_em is null
    returning id into v_id;
    if v_id is not null then
      perform public.notificar('organizacao', null, 'combo_disponivel',
        v_nome || ' informou que o combo voltou',
        'A casa atualizou a disponibilidade do combo para hoje.',
        'marcas/' || (select participante_id::text from public.participacoes where id = p_participacao));
    end if;
  end if;
  return jsonb_build_object('esgotado', p_esgotado, 'dia', v_dia, 'atualizado', v_id is not null);
end $$;

-- Retorna só slugs já públicos, sem ID privado ou qualquer dado da marca.
create or replace function public.combos_esgotados_publico(p_edicao text)
returns table (slug text) language sql stable security definer set search_path = public as $$
  select pa.slug_publico
    from public.combo_esgotado_dia e
    join public.participacoes pa on pa.id = e.participacao_id
    join public.edicao_publicacao ep on ep.edicao_codigo = pa.edicao_codigo and ep.participantes_publicos and ep.combos_publicos
    join public.publicacoes pb on pb.participacao_id = pa.id and pb.vigente and pb.nivel = 'marca_e_combo'
   where pa.edicao_codigo = p_edicao and pa.status_cadastro <> 'encerrado'
     and e.dia = (now() at time zone 'America/Fortaleza')::date
     and e.reabastecido_em is null and pa.slug_publico is not null;
$$;

create or replace function public.get_combos_esgotados_hoje(p_secret text, p_edicao text)
returns table (participante_id uuid, nome_marca text, esgotado_em timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  return query
    select pa.participante_id, p.nome_marca, e.esgotado_em
      from public.combo_esgotado_dia e
      join public.participacoes pa on pa.id = e.participacao_id
      join public.participantes p on p.id = pa.participante_id
     where pa.edicao_codigo = p_edicao and e.dia = (now() at time zone 'America/Fortaleza')::date
       and e.reabastecido_em is null
     order by e.esgotado_em desc;
end $$;

revoke all on function public.marca_combo_esgotado_estado(uuid), public.marca_combo_esgotado(uuid, boolean),
  public.combos_esgotados_publico(text), public.get_combos_esgotados_hoje(text, text)
  from public, anon, authenticated;
grant execute on function public.marca_combo_esgotado_estado(uuid), public.marca_combo_esgotado(uuid, boolean) to authenticated;
grant execute on function public.combos_esgotados_publico(text) to anon, authenticated;
grant execute on function public.get_combos_esgotados_hoje(text, text) to anon, authenticated;
