-- Reversão de 20261118_alteracao_marca_campos.sql: o gatilho volta a avisar por ÁREA ("Logo", "Combo e custos"…), com o toque em
-- marcas/<id>/publicacao (a função marca_alterou abaixo é a da 20261106_marca_salvar_avisa.sql, seção 2). Avisos já abertos com
-- nome de campo continuam como estão. As duas funções novas saem.
create or replace function public.marca_alterou()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
declare
  r jsonb; o jsonb; v_mudou text[]; v_areas text[] := '{}';
  v_eu uuid; v_part uuid; v_pa uuid; v_status text; v_combo text; v_area text;
begin
  -- Só a gravação direta: o que um gatilho (ou marca_concluir_cadastro) grava por dentro não conta de novo.
  if pg_trigger_depth() <> 1 then return null; end if;
  begin
    if current_setting('scw.silencioso', true) = 'on' or public.ver_como_ativo() then return null; end if;
    v_eu := public.meu_participante();            -- nulo para organização, importação, pg_cron
    if v_eu is null then return null; end if;

    r := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
    o := case when tg_op = 'UPDATE' then to_jsonb(old) end;
    -- UPDATE: as colunas que mudaram. INSERT/DELETE: as que têm valor (a linha que entrou ou saiu).
    select coalesce(array_agg(k), '{}') into v_mudou
      from jsonb_object_keys(r) k
     where case when o is null then r -> k <> 'null'::jsonb else (r -> k) is distinct from (o -> k) end;

    -- Área = colunas que a MARCA preenche. Status, progresso e carimbos não estão em lista nenhuma.
    if tg_table_name = 'participantes' then
      v_part := (r ->> 'id')::uuid;
      v_pa := public.participacao_corrente(v_part);
      if v_mudou && array['nome_marca','responsavel','telefone','email','instagram','site','cnpj','razao_social',
                          'apresentacao_publica','combo_nome','combo_descricao'] then v_areas := v_areas || 'Dados da marca'::text; end if;
      if v_mudou && array['logo_id'] then v_areas := v_areas || 'Logo'::text; end if;
    elsif tg_table_name = 'participacoes' then
      v_pa := (r ->> 'id')::uuid;
      v_part := (r ->> 'participante_id')::uuid;
      if v_mudou && array['tema_combo','tema_justificativa'] then v_areas := v_areas || 'Tema'::text; end if;
      if v_mudou && array['combo_nome','combo_descricao','combo_condicoes','custo_embalagem','custo_delivery',
                          'combo_para_viagem','combo_proposta','combo_vegano','combo_diet','combo_delivery'] then
        v_areas := v_areas || 'Combo e custos'::text;
      end if;
      if v_mudou && array['logo_id'] then v_areas := v_areas || 'Logo'::text; end if;
    elsif tg_table_name = 'participantes_itens' then
      v_pa := (r ->> 'participacao_id')::uuid;
      if v_mudou && array['nome','descricao','tipo','ingredientes'] then v_areas := v_areas || 'Itens do combo'::text; end if;
      if v_mudou && array['vegano','sem_gluten','sem_lactose','tem_substituicao','substituicao'] then
        v_areas := v_areas || 'Alergênicos e trocas'::text;
      end if;
    elsif tg_table_name = 'unidades' then
      v_part := (r ->> 'participante_id')::uuid;
      v_pa := public.participacao_corrente(v_part);
      if v_mudou && array['nome_unidade','logradouro','numero','complemento','referencia','bairro','cidade','uf','cep',
                          'whatsapp_publico','whatsapp_autorizado','horario_loja_texto'] then
        v_areas := v_areas || 'Unidades e atendimento'::text;
      end if;
    elsif tg_table_name = 'participacao_unidades' then
      v_pa := (r ->> 'participacao_id')::uuid;
      if v_mudou && array['participa','ordem','unidade_id','endereco','bairro','consumo_local','retirada','delivery_combo',
                          'faz_delivery','canais_delivery','delivery_regioes','delivery_taxa','observacao_combo'] then
        v_areas := v_areas || 'Unidades e atendimento'::text;
      end if;
      if v_mudou && array['horarios','horario_festival'] then v_areas := v_areas || 'Horário no festival'::text; end if;
    elsif tg_table_name = 'unidade_disponibilidade' then
      select pu.participacao_id into v_pa from public.participacao_unidades pu where pu.id = (r ->> 'participacao_unidade_id')::uuid;
      if v_mudou && array['data','abre','fecha','observacao'] then v_areas := v_areas || 'Horário no festival'::text; end if;
    elsif tg_table_name = 'substituicoes' then
      select i.participacao_id into v_pa from public.participantes_itens i where i.id = (r ->> 'item_id')::uuid;
      if v_mudou && array['original','alternativa','disponibilidade','acrescimo','como_solicitar','modalidades','unidades','ordem'] then
        v_areas := v_areas || 'Alergênicos e trocas'::text;
      end if;
    elsif tg_table_name = 'declaracoes_alimentares' then
      select i.participacao_id into v_pa from public.participantes_itens i
       where i.id = coalesce((r ->> 'item_id')::uuid,
                             (select s.item_id from public.substituicoes s where s.id = (r ->> 'substituicao_id')::uuid));
      if v_mudou && array['aspecto','estado','observacao','item_id','substituicao_id'] then
        v_areas := v_areas || 'Alergênicos e trocas'::text;
      end if;
    end if;

    if v_part is null and v_pa is not null then
      select pa.participante_id into v_part from public.participacoes pa where pa.id = v_pa;
    end if;
    -- Só a própria marca, no próprio cadastro (a RLS já garante; isto é a segunda trava).
    if v_part is null or v_part <> v_eu or cardinality(v_areas) = 0 then return null; end if;
  exception when others then
    raise warning 'marca_alterou (leitura): %', sqlerrm;
    return null;
  end;

  -- R7: o aviso. Falhou? O salvamento da marca segue.
  begin
    foreach v_area in array v_areas loop
      perform public.avisar_alteracao_marca(v_part, v_area);
    end loop;
  exception when others then
    raise warning 'marca_alterou (aviso): %', sqlerrm;
  end;

  -- R6: completo → conferência. Só rascunho em preenchimento; aprovado e ajuste pedido ficam como estão.
  if v_pa is not null then
    begin
      select pa.status_cadastro, pa.combo_status into v_status, v_combo from public.participacoes pa where pa.id = v_pa;
      if v_combo = 'rascunho' and v_status in ('aguardando_cadastro', 'em_preenchimento') then
        perform public.marca_concluir_cadastro(v_pa);   -- incompleto: devolve {ok:false} e não grava nada
      end if;
    exception when others then
      raise warning 'marca_alterou (conclusão): %', sqlerrm;
    end;
  end if;
  return null;
end $function$;

revoke all on function public.marca_alterou() from public, anon, authenticated;
drop function if exists public.avisar_alteracao_marca_campo(uuid, text, text, text);
drop function if exists public.campo_alterado_marca(text, text, jsonb, uuid);
