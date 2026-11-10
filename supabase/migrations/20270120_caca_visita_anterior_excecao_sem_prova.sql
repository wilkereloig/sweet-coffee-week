-- Visita anterior sem relato/foto: a prova segue obrigatória, mas a organização pode aprovar COM EXCEÇÃO.
-- A exceção exige o motivo escrito, gravado na decisão (decisao_nota começa com o prefixo abaixo) e na auditoria.
-- Aprovação comum e "Aprovar todos" (nota "Aprovado em lote") continuam barradas sem prova.
create or replace function public.caca_visita_anterior_prova_validar()
 returns trigger language plpgsql set search_path to 'public'
as $$
declare v_sem_prova boolean;
begin
  if old.motivo = 'visita_anterior' and old.estado = 'pendente' and new.estado = 'aprovado' then
    v_sem_prova := btrim(coalesce(new.nota, '')) = ''
      or (btrim(coalesce(new.nota, '')) = 'Foto como prova' and (new.imagem_path is null or new.imagem_removida_em is not null));
    if v_sem_prova and not (coalesce(new.decisao_nota, '') like 'Exceção sem prova: %' and length(btrim(new.decisao_nota)) >= 34) then
      raise exception 'prova_obrigatoria';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.caca_visita_anterior_prova_validar() from public, anon, authenticated;
