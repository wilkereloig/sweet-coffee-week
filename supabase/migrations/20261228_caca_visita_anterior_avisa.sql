-- Carimbo de visita anterior: AVISA a organização (sino + push do painel) a cada pedido novo. (05/11/2026, pedido do Wilker)
-- Gatilho na fila de pedidos (caca_carimbo_excecao), só para motivo = 'visita_anterior'. Usa o mesmo caminho dos outros avisos do painel:
-- public.notificar(...) grava em `notificacoes` (para = 'organizacao') e o gatilho existente dispara o push. O link leva a Edição › Carimbos › Pedidos de presença.
-- Falha no aviso nunca derruba o pedido (exception → warning). Sem dado de contato no texto: só apelido do mapa, casa, data e quantos esperam.
create or replace function public.caca_visita_anterior_avisa()
 returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare v_casa text; v_apelido text; v_n int;
begin
  if new.motivo is distinct from 'visita_anterior' then return null; end if;
  begin
    select pt.nome_marca into v_casa
      from public.participacoes pa join public.participantes pt on pt.id = pa.participante_id where pa.id = new.participacao_id;
    select m.apelido into v_apelido from public.mapas_lover m where m.id = new.mapa_id;
    select count(*) into v_n from public.caca_carimbo_excecao e
     where e.edicao_codigo = new.edicao_codigo and e.motivo = 'visita_anterior' and e.estado = 'pendente';
    perform public.notificar('organizacao', null, 'pedido',
      'Visita anterior: ' || coalesce(v_casa, 'uma casa'),
      coalesce(v_apelido, 'Alguém') || ' pediu o carimbo (visita em ' || to_char(new.visita_data, 'DD/MM') || '). '
        || v_n || case when v_n = 1 then ' pedido espera' else ' pedidos esperam' end || ' decisão.',
      'edicao/carimbos/presenca');
  exception when others then
    raise warning 'caca_visita_anterior_avisa: %', sqlerrm;
  end;
  return null;
end $$;
revoke all on function public.caca_visita_anterior_avisa() from public, anon, authenticated;

drop trigger if exists caca_visita_anterior_avisa on public.caca_carimbo_excecao;
create trigger caca_visita_anterior_avisa after insert on public.caca_carimbo_excecao
  for each row execute function public.caca_visita_anterior_avisa();
