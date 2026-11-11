-- Movimento nas casas, parte B (docs/cartoon-2026-2/20-movimento-nas-casas.md): "Estamos com fila agora".
-- A casa (painel da marca) ou a organização (painel, em nome da casa) liga o aviso numa unidade; ele vence sozinho em 1 h
-- (prazo a confirmar com o Wilker) e pode ser desligado antes. O mapa mostra "Fila agora" no cartão da casa enquanto vale.
-- Segue o modelo do combo esgotado (20270115): marca_dona_participacao, só no período do festival, leitura pública só com
-- id público e só de casa com combo publicado. Uma linha por unidade (ligar de novo renova o prazo). Aditiva.
-- Reverter: supabase/reverter/20270127_caca_fila_aviso.sql.

create table if not exists public.caca_fila_aviso (
  participacao_unidade_id uuid primary key references public.participacao_unidades(id) on delete cascade,
  ate timestamptz not null,
  origem text not null check (origem in ('marca', 'organizacao')),
  atualizado_em timestamptz not null default now()
);
alter table public.caca_fila_aviso enable row level security;
revoke all on table public.caca_fila_aviso from public, anon, authenticated;

-- Liga ou desliga numa unidade. Sem conferência de permissão: só as funções abaixo chamam (e conferem).
-- ponytail: prazo fixo de 1 h; vira configuração se o Wilker pedir outro.
create or replace function public.caca_fila_gravar(p_unidade uuid, p_fila boolean, p_origem text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_ate timestamptz;
begin
  if p_fila is null then raise exception 'estado_invalido'; end if;
  if p_fila then
    insert into public.caca_fila_aviso (participacao_unidade_id, ate, origem) values (p_unidade, now() + interval '1 hour', p_origem)
    on conflict (participacao_unidade_id) do update set ate = excluded.ate, origem = excluded.origem, atualizado_em = now()
    returning ate into v_ate;
  else
    update public.caca_fila_aviso set ate = now(), origem = p_origem, atualizado_em = now()
     where participacao_unidade_id = p_unidade and ate > now();
  end if;
  return jsonb_build_object('ok', true, 'fila', p_fila, 'ate', v_ate);
end $function$;

-- Painel da marca: as unidades da casa e até quando o aviso de cada uma vale (null = desligado).
create or replace function public.marca_fila_estado(p_participacao uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
begin
  if not public.marca_dona_participacao(p_participacao) then raise exception 'nao_autorizado'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('unidade', u.id, 'endereco', u.endereco, 'bairro', u.bairro,
                                                       'ate', case when f.ate > now() then f.ate end) order by u.ordem)
                     from public.participacao_unidades u left join public.caca_fila_aviso f on f.participacao_unidade_id = u.id
                    where u.participacao_id = p_participacao and coalesce(u.participa, true)), '[]'::jsonb);
end $function$;

create or replace function public.marca_fila_definir(p_participacao uuid, p_unidade uuid, p_fila boolean)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_dia date := (now() at time zone 'America/Fortaleza')::date; v_nome text; v_r jsonb;
begin
  if not public.marca_dona_participacao(p_participacao) then raise exception 'nao_autorizado'; end if;
  if not exists (select 1 from public.participacao_unidades where id = p_unidade and participacao_id = p_participacao) then
    raise exception 'unidade_invalida';
  end if;
  select p.nome_marca into v_nome
    from public.participacoes pa join public.participantes p on p.id = pa.participante_id
    join public.edicoes e on e.codigo = pa.edicao_codigo
   where pa.id = p_participacao and pa.status_cadastro <> 'encerrado' and v_dia between e.festival_inicio and e.festival_fim;
  if not found then raise exception 'fora_do_festival'; end if;
  v_r := public.caca_fila_gravar(p_unidade, p_fila, 'marca');
  if p_fila then
    perform public.notificar('organizacao', null, 'fila_casa', v_nome || ' avisou que está com fila',
      'A casa marcou "Estamos com fila agora". O mapa mostra "Fila agora" por 1 hora.',
      'marcas/' || (select participante_id::text from public.participacoes where id = p_participacao));
  end if;
  return v_r;
end $function$;

-- Painel da organização: marcar em nome da casa (ela avisou por WhatsApp) e ver os avisos que valem agora.
create or replace function public.caca_fila_definir(p_secret text, p_unidade uuid, p_fila boolean)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;
  if not exists (select 1 from public.participacao_unidades where id = p_unidade) then raise exception 'unidade_invalida'; end if;
  return public.caca_fila_gravar(p_unidade, p_fila, 'organizacao');
end $function$;

create or replace function public.caca_fila_avisos(p_secret text)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('unidade', f.participacao_unidade_id, 'ate', f.ate, 'origem', f.origem))
                     from public.caca_fila_aviso f where f.ate > now()), '[]'::jsonb);
end $function$;

-- Site: só o slug e o id público da unidade, e só de casa com combo publicado (o mesmo filtro do combo esgotado).
create or replace function public.filas_agora_publico(p_edicao text)
returns table (slug text, unidade text) language sql stable security definer set search_path to 'public' as $function$
  select pa.slug_publico, u.id_publico
    from public.caca_fila_aviso f
    join public.participacao_unidades u on u.id = f.participacao_unidade_id
    join public.participacoes pa on pa.id = u.participacao_id
    join public.edicao_publicacao ep on ep.edicao_codigo = pa.edicao_codigo and ep.participantes_publicos and ep.combos_publicos
    join public.publicacoes pb on pb.participacao_id = pa.id and pb.vigente and pb.nivel = 'marca_e_combo'
   where pa.edicao_codigo = p_edicao and pa.status_cadastro <> 'encerrado' and f.ate > now()
     and pa.slug_publico is not null and u.id_publico is not null;
$function$;

revoke all on function public.caca_fila_gravar(uuid, boolean, text) from public, anon, authenticated;
revoke all on function public.marca_fila_estado(uuid), public.marca_fila_definir(uuid, uuid, boolean),
  public.caca_fila_definir(text, uuid, boolean), public.caca_fila_avisos(text), public.filas_agora_publico(text) from public, anon, authenticated;
grant execute on function public.marca_fila_estado(uuid), public.marca_fila_definir(uuid, uuid, boolean) to authenticated;
grant execute on function public.caca_fila_definir(text, uuid, boolean), public.caca_fila_avisos(text) to anon, authenticated;
grant execute on function public.filas_agora_publico(text) to anon, authenticated;
