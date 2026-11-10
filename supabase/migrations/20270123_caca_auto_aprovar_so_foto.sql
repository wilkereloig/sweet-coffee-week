-- Automação de carimbos: só a FOTO decide (pedido do Wilker, 10/11/2026: "se mandou a foto, pode aprovar; só não aprove se não mandou").
-- Sai a conferência de data. Continuam valendo as regras do banco dentro de caca_excecao_decidir (janela, 12 h, duplicidade, QR).
-- Sem foto = fica pendente. Reversão: reaplicar o corpo de 20270122.
create or replace function public.caca_excecao_auto_aprovar()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r record; v_visita boolean; v_delivery boolean;
  v_ok int := 0; v_pula int := 0; v_falhas jsonb := '[]'::jsonb;
begin
  select coalesce((valor)::text = 'true', false) into v_visita from public.caca_config where chave = 'auto_aprovar_visita_anterior';
  select coalesce((valor)::text = 'true', false) into v_delivery from public.caca_config where chave = 'auto_aprovar_delivery';
  if not coalesce(v_visita, false) and not coalesce(v_delivery, false) then return jsonb_build_object('ligado', false); end if;

  perform set_config('scw.sistema_ativo', 'on', true);
  perform set_config('scw.ator_rotulo', 'Automação (pedido com foto)', true);

  for r in
    select e.id, e.motivo
      from public.caca_carimbo_excecao e
     where e.estado = 'pendente'
       and e.imagem_path is not null and e.imagem_removida_em is null
       and ((e.motivo = 'visita_anterior' and coalesce(v_visita, false))
         or (e.motivo = 'delivery' and coalesce(v_delivery, false)
             and (e.via = 'imagem' or coalesce(e.delivery_via_pretendida, 'casa') = 'imagem')))
     order by e.criado_em
  loop
    begin
      perform public.caca_excecao_decidir(null, r.id, 'aprovar',
        case when r.motivo = 'delivery' then 'Aprovado pela automação: foto do pedido enviada'
             else 'Aprovado pela automação: foto enviada' end);
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
