-- =============================================================================
-- Fase 11 — a organização fica sabendo do tema (docs/EVOLUCAO-PAINEL-2026-09.md)
--
-- temas_sincronizar (Fase 3) ganha o aviso: quando a MARCA informa um tema
-- novo (não a cada tecla — a mesma proposta é reescrita por 30 min), a
-- organização recebe "X informou o tema"; se outra marca da edição já pediu o
-- mesmo tema, o aviso vira "Conflito de tema". Link: edicao/temas.
-- Durante a importação (scw.silencioso) nada é avisado.
-- =============================================================================
create or replace function public.temas_sincronizar()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_ativa public.temas_propostos%rowtype; v_origem text; v_marca text; v_outras int;
begin
  if new.tema_combo is not distinct from old.tema_combo then return new; end if;
  v_origem := case when exists (select 1 from public.participantes
                                 where id = new.participante_id and user_id = auth.uid())
                   then 'marca' else 'organizacao' end;
  if current_setting('scw.importando', true) = 'on' then v_origem := 'importacao'; end if;

  select * into v_ativa from public.temas_propostos
   where participacao_id = new.id and status in ('proposto','aprovado')
   order by created_at desc limit 1;

  if public.normalizar_nome(new.tema_combo) is null then
    update public.temas_propostos set status = 'substituido'
     where participacao_id = new.id and status in ('proposto','aprovado');
    return new;
  end if;

  if v_ativa.id is not null and v_ativa.status = 'proposto'
     and v_ativa.created_at > now() - interval '30 minutes' then
    update public.temas_propostos
       set tema = btrim(new.tema_combo), justificativa = new.tema_justificativa
     where id = v_ativa.id;
  else
    update public.temas_propostos set status = 'substituido'
     where participacao_id = new.id and status in ('proposto','aprovado');
    insert into public.temas_propostos (edicao_codigo, participacao_id, tema, justificativa, origem)
    values (new.edicao_codigo, new.id, btrim(new.tema_combo), new.tema_justificativa, v_origem);

    if v_origem = 'marca' then
      select nome_marca into v_marca from public.participantes where id = new.participante_id;
      select count(*) into v_outras from public.temas_propostos t
       where t.edicao_codigo = new.edicao_codigo and t.participacao_id <> new.id
         and t.status in ('proposto','aprovado') and t.tema_norm = public.normalizar_nome(new.tema_combo);
      if v_outras > 0 then
        perform public.notificar('organizacao', null, 'tema', 'Conflito de tema: ' || btrim(new.tema_combo),
          v_marca || ' pediu um tema que ' || v_outras || case when v_outras = 1 then ' outra marca já pediu.' else ' outras marcas já pediram.' end,
          'edicao/temas');
      else
        perform public.notificar('organizacao', null, 'tema', v_marca || ' informou o tema',
          btrim(new.tema_combo), 'edicao/temas');
      end if;
    end if;
  end if;
  return new;
end $$;
revoke all on function public.temas_sincronizar() from public, anon, authenticated;
