-- Caça aos Carimbos: o ganhador confirma o recebimento do voucher no próprio mapa.
-- A organização também vê quando a casa valida o QR, com o horário do resgate.
-- A migration é aditiva: não altera as regras de sorteio nem apaga histórico.

alter table public.caca_premio
  add column if not exists recebido_em timestamptz;

-- O mapa só enxerga o seu prêmio e o seu voucher; a organização vê os dados de acompanhamento.
create or replace function public.caca_meus_premios(p_chave text)
returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return null; end if;
  if m.id is distinct from public.caca_mapa_principal(m.edicao_codigo, m.email_norm) then
    return jsonb_build_object('premios', '[]'::jsonb);
  end if;

  return jsonb_build_object('premios', coalesce((
    select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id', p.id, 'tipo', p.tipo, 'dia', p.dia, 'estado', p.estado, 'prazo_ate', p.prazo_ate,
      'valido_ate', p.detalhe ->> 'valido_ate', 'recebido_em', p.recebido_em,
      'email_confirmado', public.caca_premio_email_ok(p.edicao_codigo, p.pessoa),
      'voucher', (select jsonb_strip_nulls(jsonb_build_object(
                    'marca', marca.nome_marca, 'token', v.link_token, 'estado', v.status, 'utilizado_em', v.utilizado_em))
                    from public.caca_premio_voucher_pool cp
                    join public.vouchers v on v.id = cp.voucher_id
                    join public.participacoes pa on pa.id = cp.participacao_id
                    join public.participantes marca on marca.id = pa.participante_id
                   where cp.premio_id = p.id and cp.mapa_id = m.id),
      'opcoes', case when p.tipo = 'voucher_dia' and p.estado = 'confirmado'
                           and public.caca_premio_email_ok(p.edicao_codigo, p.pessoa)
        then (select coalesce(jsonb_agg(jsonb_build_object('id', cp.id, 'marca', marca.nome_marca) order by marca.nome_marca), '[]'::jsonb)
                from public.caca_premio_voucher_pool cp
                join public.participacoes pa on pa.id = cp.participacao_id
                join public.participantes marca on marca.id = pa.participante_id
               where cp.edicao_codigo = p.edicao_codigo and cp.estado = 'disponivel')
        else '[]'::jsonb end
    )) order by p.criado_em desc)
      from public.caca_premio p
     where p.edicao_codigo = m.edicao_codigo and p.mapa_id = m.id
       and p.estado in ('selecionado', 'confirmado', 'entregue')), '[]'::jsonb));
end $$;

create or replace function public.caca_premio_json(p public.caca_premio, p_rel boolean)
returns jsonb language sql stable security definer set search_path to 'public'
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'id', p.id, 'tipo', p.tipo, 'dia', p.dia, 'posicao', p.posicao, 'estado', p.estado, 'apelido', p.apelido,
    'prazo_ate', p.prazo_ate,
    'vencido', (p.estado = 'selecionado' and p.prazo_ate is not null and p.prazo_ate < now()),
    'email_confirmado', public.caca_premio_email_ok(p.edicao_codigo, p.pessoa),
    'substitui_id', p.substitui_id, 'motivo', p.motivo, 'semente', p.semente, 'detalhe', p.detalhe,
    'recebido_em', p.recebido_em,
    'voucher', (select jsonb_strip_nulls(jsonb_build_object(
                  'marca', marca.nome_marca, 'estado', cp.estado, 'utilizado_em', v.utilizado_em))
                  from public.caca_premio_voucher_pool cp
                  join public.vouchers v on v.id = cp.voucher_id
                  join public.participacoes pa on pa.id = cp.participacao_id
                  join public.participantes marca on marca.id = pa.participante_id
                 where cp.premio_id = p.id and cp.mapa_id = p.mapa_id),
    'criado_em', p.criado_em, 'atualizado_em', p.atualizado_em,
    'email', case when p_rel then p.pessoa end,
    'whatsapp', case when p_rel then (select m.whatsapp from public.mapas_lover m where m.id = p.mapa_id) end))
$$;

-- Confirmação explícita e idempotente, autenticada pela chave do mapa pessoal.
create or replace function public.caca_meus_premios_confirmar_recebimento(p_chave text, p_premio uuid)
returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; p public.caca_premio%rowtype; v_recebido timestamptz;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null or m.id is distinct from public.caca_mapa_principal(m.edicao_codigo, m.email_norm) then
    raise exception 'mapa_desconhecido';
  end if;

  perform pg_advisory_xact_lock(hashtext('caca_premio:' || m.edicao_codigo));
  select * into p from public.caca_premio
   where id = p_premio and edicao_codigo = m.edicao_codigo and mapa_id = m.id for update;
  if p.id is null then raise exception 'premio_nao_encontrado'; end if;
  if p.tipo <> 'voucher_dia' then raise exception 'tipo_invalido'; end if;
  if p.estado not in ('confirmado', 'entregue') then raise exception 'premio_nao_confirmado'; end if;
  if not exists (
    select 1 from public.caca_premio_voucher_pool cp
    join public.vouchers v on v.id = cp.voucher_id
    where cp.premio_id = p.id and cp.mapa_id = m.id
      and cp.estado in ('escolhido', 'usado') and v.status in ('destinado', 'utilizado')
  ) then raise exception 'voucher_nao_escolhido'; end if;

  v_recebido := coalesce(p.recebido_em, now());
  if p.recebido_em is null then
    update public.caca_premio set recebido_em = v_recebido where id = p.id;
    perform public.caca_evento_gravar(p.edicao_codigo, p.id, 'voucher_recebimento_confirmado', null,
      jsonb_build_object('recebido_em', v_recebido));
  end if;
  return jsonb_build_object('ok', true, 'recebido_em', v_recebido);
end $$;

revoke all on function public.caca_meus_premios_confirmar_recebimento(text, uuid) from public, anon, authenticated;
grant execute on function public.caca_meus_premios_confirmar_recebimento(text, uuid) to anon, authenticated;
