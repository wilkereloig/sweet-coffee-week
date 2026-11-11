-- Volta à regra anterior: visita anterior sem relato/foto nunca é aprovada.
create or replace function public.caca_visita_anterior_prova_validar()
 returns trigger language plpgsql set search_path to 'public'
as $$
begin
  if old.motivo = 'visita_anterior' and old.estado = 'pendente' and new.estado = 'aprovado'
     and (btrim(coalesce(new.nota, '')) = '' or (btrim(coalesce(new.nota, '')) = 'Foto como prova'
       and (new.imagem_path is null or new.imagem_removida_em is not null))) then
    raise exception 'prova_obrigatoria';
  end if;
  return new;
end $$;
revoke all on function public.caca_visita_anterior_prova_validar() from public, anon, authenticated;
