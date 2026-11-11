-- Caça: o ganhador de voucher FÍSICO (retirada no Espaço Reduzido) confirma que viu o aviso.
-- Antes, `caca_meus_premios_confirmar_recebimento` só aceitava voucher digital escolhido (exigia linha no pool).
-- Agora, prêmio com `detalhe.retirada` não depende do pool: grava `recebido_em` (a data em que a pessoa confirmou que viu
-- e sabe que ganhou) e o mesmo evento de auditoria. O painel já mostra `recebido_em` na lista de vouchers.
-- Reversão: supabase/reverter/20270119_caca_ciencia_retirada.sql
create or replace function public.caca_meus_premios_confirmar_recebimento(p_chave text, p_premio uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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
  -- Voucher físico (retirada): basta o prêmio confirmado. Digital: exige a casa escolhida no pool.
  if (p.detalhe -> 'retirada') is null and not exists (
    select 1 from public.caca_premio_voucher_pool cp
    join public.vouchers v on v.id = cp.voucher_id
    where cp.premio_id = p.id and cp.mapa_id = m.id
      and cp.estado in ('escolhido', 'usado') and v.status in ('destinado', 'utilizado')
  ) then raise exception 'voucher_nao_escolhido'; end if;

  v_recebido := coalesce(p.recebido_em, now());
  if p.recebido_em is null then
    update public.caca_premio set recebido_em = v_recebido where id = p.id;
    perform public.caca_evento_gravar(p.edicao_codigo, p.id, 'voucher_recebimento_confirmado', null,
      jsonb_build_object('recebido_em', v_recebido, 'retirada', (p.detalhe -> 'retirada') is not null));
  end if;
  return jsonb_build_object('ok', true, 'recebido_em', v_recebido);
end $function$;
