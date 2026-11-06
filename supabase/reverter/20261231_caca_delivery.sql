-- Reverter 20261231_caca_delivery (rode só se não houver pedido nem carimbo de delivery; confira antes):
--   select count(*) from public.caca_carimbo_excecao where motivo = 'delivery';
--   select count(*) from public.carimbos where origem like 'delivery%';
--   select count(*) from storage.objects where bucket_id = 'caca-delivery';   -- apague os arquivos pela API do Storage antes de tirar o bucket
drop trigger if exists caca_delivery_avisa on public.caca_carimbo_excecao;
drop function if exists public.caca_delivery_avisa();
drop function if exists public.caca_delivery_pedir(text, text, text, date, text, text), public.caca_delivery_novo_codigo(text, uuid),
  public.caca_delivery_imagem_reservar(text, uuid, text), public.caca_delivery_anexar(text, uuid, text),
  public.caca_delivery_consultar(text), public.caca_delivery_confirmar(text), public.caca_delivery_gerar_codigo(),
  public.caca_delivery_em_pe(public.caca_carimbo_excecao);
drop table if exists public.caca_delivery_tentativa;
drop index if exists public.caca_excecao_codigo_unico, public.caca_excecao_delivery;
alter table public.caca_carimbo_excecao drop constraint if exists caca_carimbo_excecao_delivery_check;
alter table public.caca_carimbo_excecao drop constraint if exists caca_carimbo_excecao_via_check;
alter table public.caca_carimbo_excecao
  drop column if exists via, drop column if exists pedido_data, drop column if exists pedido_ref, drop column if exists codigo,
  drop column if exists codigo_expira_em, drop column if exists codigos_gerados, drop column if exists imagem_path,
  drop column if exists imagem_enviada_em, drop column if exists imagem_removida_em, drop column if exists imagem_reservas;
alter table public.caca_carimbo_excecao drop constraint if exists caca_carimbo_excecao_motivo_check;
alter table public.caca_carimbo_excecao add constraint caca_carimbo_excecao_motivo_check
  check (motivo in ('sem_localizacao', 'imprecisa', 'longe', 'visita_anterior'));
alter table public.carimbos drop constraint if exists carimbos_origem_check;
alter table public.carimbos add constraint carimbos_origem_check check (origem in ('gps', 'unidade_sem_coordenada', 'excecao_painel', 'visita_anterior'));
create or replace function public.carimbos_origem_definir() returns trigger language plpgsql set search_path to 'public' as $f$
begin
  if new.origem not in ('excecao_painel', 'visita_anterior') then new.origem := case when new.conferido then 'gps' else 'unidade_sem_coordenada' end; end if;
  return new;
end $f$;
delete from storage.buckets where id = 'caca-delivery';
-- caca_excecao_minhas / _listar / _decidir / get_mapa_carimbos: voltar às versões de 20261226 / 20261229 (as novas são superconjunto: podem ficar).
