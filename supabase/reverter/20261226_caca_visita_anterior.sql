-- Reverter 20261226_caca_visita_anterior (rode só se não houver pedido nem carimbo de visita anterior; confira antes):
--   select count(*) from public.caca_carimbo_excecao where motivo = 'visita_anterior';
--   select count(*) from public.carimbos where origem = 'visita_anterior';
drop function if exists public.caca_visita_anterior_pedir(text, text, text, date, text), public.caca_visita_anterior_prazo();
alter table public.caca_carimbo_excecao drop constraint if exists caca_carimbo_excecao_visita_check;
alter table public.caca_carimbo_excecao drop constraint if exists caca_carimbo_excecao_motivo_check;
alter table public.caca_carimbo_excecao add constraint caca_carimbo_excecao_motivo_check check (motivo in ('sem_localizacao', 'imprecisa', 'longe'));
alter table public.caca_carimbo_excecao drop column if exists visita_data;
alter table public.carimbos drop constraint if exists carimbos_origem_check;
alter table public.carimbos add constraint carimbos_origem_check check (origem in ('gps', 'unidade_sem_coordenada', 'excecao_painel'));
create or replace function public.carimbos_origem_definir() returns trigger language plpgsql set search_path to 'public' as $f$
begin
  if new.origem is distinct from 'excecao_painel' then new.origem := case when new.conferido then 'gps' else 'unidade_sem_coordenada' end; end if;
  return new;
end $f$;
-- caca_excecao_minhas / _listar / _decidir: voltar às versões de supabase/migrations/20261214 + 20261217 (a nova é superconjunto: pode ficar).
