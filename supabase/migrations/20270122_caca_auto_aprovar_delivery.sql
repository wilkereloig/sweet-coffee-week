-- Automação de carimbos: inclui pedidos de DELIVERY enviados à organização COM foto (pedido do Wilker, 10/11/2026).
-- Mesmas conferências da visita anterior; a data conferida é a do pedido (pedido_data). Pedido de delivery que depende
-- da casa (via 'casa') não entra: quem decide é a casa. Interruptor próprio em caca_config.
-- Reversão: supabase/reverter/20270122_caca_auto_aprovar_delivery.sql

insert into public.caca_config (chave, valor, nota, atualizado_por)
values ('auto_aprovar_delivery', 'true'::jsonb,
        'Aprova sozinho pedido de delivery enviado à organização com foto e data do pedido válida (job scw-caca-auto-aprovar).', 'Wilker Eloi')
on conflict (chave) do nothing;

create or replace function public.caca_excecao_auto_aprovar()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r record; v_visita boolean; v_delivery boolean; v_ini date; v_data date; v_hoje date := (now() at time zone 'America/Fortaleza')::date;
  v_ok int := 0; v_pula int := 0; v_falhas jsonb := '[]'::jsonb;
begin
  select coalesce((valor)::text = 'true', false) into v_visita from public.caca_config where chave = 'auto_aprovar_visita_anterior';
  select coalesce((valor)::text = 'true', false) into v_delivery from public.caca_config where chave = 'auto_aprovar_delivery';
  if not coalesce(v_visita, false) and not coalesce(v_delivery, false) then return jsonb_build_object('ligado', false); end if;

  perform set_config('scw.sistema_ativo', 'on', true);
  perform set_config('scw.ator_rotulo', 'Automação (pedido com foto)', true);

  for r in
    select e.id, e.edicao_codigo, e.motivo, e.visita_data, e.pedido_data
      from public.caca_carimbo_excecao e
     where e.estado = 'pendente'
       and e.imagem_path is not null and e.imagem_removida_em is null
       and ((e.motivo = 'visita_anterior' and coalesce(v_visita, false))
         or (e.motivo = 'delivery' and coalesce(v_delivery, false)
             and (e.via = 'imagem' or coalesce(e.delivery_via_pretendida, 'casa') = 'imagem')))
     order by e.criado_em
  loop
    select (avaliacao_abre_em at time zone 'America/Fortaleza')::date into v_ini from public.edicao_publicacao where edicao_codigo = r.edicao_codigo;
    v_data := case when r.motivo = 'delivery' then r.pedido_data else r.visita_data end;
    -- conferência da data: informada, dentro do festival e nunca no futuro
    if v_data is null or v_ini is null or v_data < v_ini or v_data > v_hoje then
      v_pula := v_pula + 1; continue;
    end if;
    begin
      perform public.caca_excecao_decidir(null, r.id, 'aprovar',
        case when r.motivo = 'delivery' then 'Aprovado pela automação: foto do pedido enviada e data do pedido dentro do festival'
             else 'Aprovado pela automação: foto enviada e data da visita dentro do festival' end);
      v_ok := v_ok + 1;
    exception when others then
      v_pula := v_pula + 1;
      v_falhas := v_falhas || jsonb_build_object('pedido', r.id, 'erro', sqlerrm);
    end;
  end loop;

  perform set_config('scw.sistema_ativo', '', true);
  perform set_config('scw.ator_rotulo', '', true);
  return jsonb_build_object('ligado', true, 'aprovados', v_ok, 'pulados', v_pula, 'falhas', v_falhas);
end $$;

revoke all on function public.caca_excecao_auto_aprovar() from public, anon, authenticated;
