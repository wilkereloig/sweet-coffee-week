-- Reverte 20261233_caca_periodo.sql: volta a função de gravar a config e a leitura pública ao estado anterior e tira as duas chaves.
delete from public.caca_premiacao_config where chave in ('caca_inicio', 'caca_fim');

create or replace function public.caca_config_gravar(p_secret text, p_chave text, p_valor jsonb) returns jsonb
 language plpgsql volatile security definer set search_path to 'public'
as $$
declare v_antes jsonb; v_txt text := p_valor #>> '{}';
begin
  if not public.pode(p_secret, 'edicao.gerir') then raise exception 'nao_autorizado'; end if;
  select valor into v_antes from public.caca_premiacao_config where chave = p_chave for update;
  if not found then raise exception 'chave_desconhecida'; end if;
  begin
    case p_chave
      when 'voucher_dias' then
        if jsonb_typeof(p_valor) <> 'array' or jsonb_array_length(p_valor) not between 1 and 31 then raise exception 'x'; end if;
        if exists (select 1 from jsonb_array_elements(p_valor) e where jsonb_typeof(e) <> 'string') then raise exception 'x'; end if;
        perform (e #>> '{}')::date from jsonb_array_elements(p_valor) e;
      when 'corte_hora_local' then
        if jsonb_typeof(p_valor) <> 'string' or v_txt !~ '^\d{2}:\d{2}$' then raise exception 'x'; end if;
        perform v_txt::time;
      when 'fuso' then
        if jsonb_typeof(p_valor) <> 'string' or not exists (select 1 from pg_timezone_names where name = v_txt) then raise exception 'x'; end if;
      when 'voucher_validade_ate' then
        if jsonb_typeof(p_valor) <> 'string' then raise exception 'x'; end if;
        perform v_txt::date;
      when 'peso_base' then
        if jsonb_typeof(p_valor) <> 'number' or v_txt !~ '^\d{1,5}$' or v_txt::int not between 1 and 10000 then raise exception 'x'; end if;
      when 'ganhadores_final' then
        if jsonb_typeof(p_valor) <> 'number' or v_txt !~ '^\d{1,2}$' or v_txt::int not between 1 and 20 then raise exception 'x'; end if;
      when 'prazo_confirmacao_proximo_dia_hora' then
        if jsonb_typeof(p_valor) <> 'number' or v_txt !~ '^\d{1,2}$' or v_txt::int not between 0 and 23 then raise exception 'x'; end if;
      when 'prazo_segunda_chamada_min' then
        if jsonb_typeof(p_valor) <> 'number' or v_txt !~ '^\d{1,4}$' or v_txt::int not between 1 and 1440 then raise exception 'x'; end if;
      when 'intervalo_carimbo_h' then
        if jsonb_typeof(p_valor) <> 'number' or v_txt !~ '^\d{1,2}$' or v_txt::int not between 0 and 72 then raise exception 'x'; end if;
      when 'email_confirmado_se_sem_coluna' then
        if jsonb_typeof(p_valor) <> 'boolean' then raise exception 'x'; end if;
      else null;
    end case;
  exception when others then raise exception 'valor_invalido';
  end;
  update public.caca_premiacao_config set valor = p_valor, atualizado_em = now(), atualizado_por = coalesce(public.ator_rotulo_atual(), 'Painel')
   where chave = p_chave;
  perform public.caca_evento_gravar(null, null, 'config_gravar', jsonb_build_object('chave', p_chave, 'valor', v_antes),
                                    jsonb_build_object('chave', p_chave, 'valor', p_valor));
  return jsonb_build_object('ok', true, 'chave', p_chave, 'valor', p_valor);
end $$;

create or replace function public.caca_premios_publico(p_edicao text)
 returns jsonb language sql stable security definer set search_path to 'public'
as $$
  with cfg as (
    select (public.caca_pcfg('fuso') #>> '{}') as fuso
  ), dias as (
    select (v #>> '{}')::date as dia
      from jsonb_array_elements(coalesce(public.caca_pcfg('voucher_dias'), '[]'::jsonb)) v
  )
  select jsonb_build_object(
    'agora', now(),
    'fuso', (select fuso from cfg),
    'corte_hora_local', public.caca_pcfg('corte_hora_local'),
    'voucher_validade_ate', public.caca_pcfg('voucher_validade_ate'),
    'ganhadores_final', public.caca_pcfg('ganhadores_final'),
    'dias', coalesce((
      select jsonb_agg(jsonb_build_object(
        'dia', d.dia,
        'corte', public.caca_corte(d.dia),
        'estado', case
          when now() >= public.caca_corte(d.dia) then
            case when exists (select 1 from public.caca_premio p
                               where p.edicao_codigo = p_edicao and p.tipo = 'voucher_dia' and p.dia = d.dia
                                 and p.estado in ('confirmado', 'entregue'))
                 then 'resultado' else 'em_apuracao' end
          when now() >= (d.dia::timestamp at time zone (select fuso from cfg)) then 'em_disputa'
          else 'proximo' end
      ) order by d.dia) from dias d
    ), '[]'::jsonb)
  )
$$;

revoke all on function public.caca_premios_publico(text) from public;
grant execute on function public.caca_premios_publico(text) to anon, authenticated;
