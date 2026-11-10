drop function if exists public.caca_visita_anterior_anexar(text, uuid, text);
drop function if exists public.caca_visita_anterior_imagem_reservar(text, uuid, text);
drop trigger if exists caca_visita_anterior_prova_validar on public.caca_carimbo_excecao;
drop function if exists public.caca_visita_anterior_prova_validar();

alter table public.caca_carimbo_excecao drop constraint if exists caca_carimbo_excecao_delivery_check;
alter table public.caca_carimbo_excecao add constraint caca_carimbo_excecao_delivery_check check (
  (motivo = 'delivery' and via in ('casa', 'imagem') and pedido_data is not null and codigo is not null
    and (pedido_ref is null or char_length(pedido_ref) <= 40))
  or (motivo <> 'delivery' and via is null and pedido_data is null and pedido_ref is null and codigo is null
    and imagem_path is null)
);

-- caca_excecao_minhas mantém o campo booleano tem_imagem como extensão compatível;
-- sem a migration ativa, os pedidos de visita anterior não poderão ter imagem_path.
