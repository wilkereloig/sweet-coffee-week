-- ─────────────────────────────────────────────────────────────────────────────
-- O aviso "<Marca> alterou o cadastro" diz QUAIS CAMPOS mudaram e leva ao primeiro deles
-- (pedido do Wilker, 27/10/2026: "quero saber na notificação o que a marca alterou, e que ao clicar me leve ao campo").
--
-- Antes (20261106_marca_salvar_avisa.sql): o aviso listava ÁREAS ("Logo", "Combo e custos", "Dados da marca") e o toque
-- caía sempre em marcas/<id>/publicacao. Agora:
--   · texto = os NOMES dos campos que a marca mexeu, como aparecem na ficha ("Nome do combo · Bebida: descrição · Logo").
--     Só o nome, não o valor: o salvamento automático grava a cada ~1 s, e o aviso (um só, sem UPDATE a cada gravação)
--     guardaria o valor pela metade. O valor certo está na ficha, já destacado.
--   · link = marcas/<participante>/<seção>/<campo>  (seção: cadastro · combo · unidades; campo: âncora da ficha). Com vários
--     campos, o toque leva ao PRIMEIRO; os outros estão no texto. Sem âncora conhecida, marcas/<id>/<seção>.
-- Resto igual: um aviso ABERTO por marca (chave_grupo), campo novo acumula no mesmo aviso (sem push novo), campo repetido
-- não grava nada, só a marca dispara, e a conclusão automática do cadastro (R6) não muda.
--
-- `campo_alterado_marca` é o catálogo (tabela.coluna → {rótulo, seção, âncora}); coluna fora dele não gera aviso (status,
-- progresso e carimbos continuam de fora). `avisar_alteracao_marca` (por área) fica no banco, sem uso: o painel não deixa
-- apagar função (CLAUDE.md), e os avisos já abertos continuam com o texto antigo.
--
-- Sem `delete from`. Nenhuma linha existente muda. Teste: supabase/testes/marca-salvar-avisa.sql (atualizado) ·
-- Reversão: supabase/reverter/20261118_alteracao_marca_campos.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. O catálogo: coluna → rótulo, seção da ficha e âncora ─────────────────
create or replace function public.campo_alterado_marca(p_tabela text, p_coluna text, r jsonb, p_pa uuid)
 returns text[] language plpgsql stable security definer set search_path to 'public'
as $function$
declare
  v_item uuid; v_pu uuid; v_tipo text; v_pos text; v_nome text; v_ordem text; v_unidade uuid;
begin
  if p_tabela = 'participantes' then
    return case p_coluna
      when 'nome_marca' then array['Nome da marca', 'cadastro', 'nome_marca']
      when 'responsavel' then array['Responsável', 'cadastro', 'responsavel']
      when 'telefone' then array['WhatsApp do responsável', 'cadastro', 'telefone']
      when 'email' then array['E-mail', 'cadastro', 'email']
      when 'instagram' then array['Instagram', 'cadastro', 'instagram']
      when 'site' then array['Site', 'cadastro', 'site']
      when 'cnpj' then array['CNPJ', 'cadastro', 'cnpj']
      when 'razao_social' then array['Razão social', 'cadastro', 'razao_social']
      when 'apresentacao_publica' then array['Apresentação da marca', 'cadastro', 'apresentacao_publica']
      when 'logo_id' then array['Logo', 'cadastro', 'logo']
      when 'combo_nome' then array['Nome do combo', 'combo', 'combo_nome']
      when 'combo_descricao' then array['Descrição do combo', 'combo', 'combo_descricao']
      else null end;
  elsif p_tabela = 'participacoes' then
    return case p_coluna
      when 'tema_combo' then array['Tema do combo', 'combo', 'tema_combo']
      when 'tema_justificativa' then array['Justificativa do tema', 'combo', 'tema_justificativa']
      when 'combo_nome' then array['Nome do combo', 'combo', 'combo_nome']
      when 'combo_descricao' then array['Descrição do combo', 'combo', 'combo_descricao']
      when 'combo_proposta' then array['Proposta do combo', 'combo', 'combo_proposta']
      when 'combo_condicoes' then array['Condições do combo', 'combo', 'combo_condicoes']
      when 'combo_para_viagem' then array['Combo para viagem', 'combo', 'combo_para_viagem']
      when 'custo_embalagem' then array['Custo da embalagem', 'combo', 'custo_embalagem']
      when 'custo_delivery' then array['Custo do delivery', 'combo', 'custo_delivery']
      when 'combo_vegano' then array['Combo vegano (cadastro anterior)', 'combo', '']
      when 'combo_diet' then array['Combo diet (cadastro anterior)', 'combo', '']
      when 'combo_delivery' then array['Delivery do combo (cadastro anterior)', 'combo', '']
      when 'logo_id' then array['Logo', 'cadastro', 'logo']
      else null end;
  elsif p_tabela in ('participantes_itens', 'substituicoes', 'declaracoes_alimentares') then
    -- O item do combo: o tipo (Doce, Salgado, Bebida) e a posição dão o nome e a âncora (fg-item-<posição> na ficha).
    if p_tabela = 'participantes_itens' then v_item := (r ->> 'id')::uuid;
    elsif p_tabela = 'substituicoes' then v_item := (r ->> 'item_id')::uuid;
    else v_item := coalesce((r ->> 'item_id')::uuid, (select s.item_id from public.substituicoes s where s.id = (r ->> 'substituicao_id')::uuid));
    end if;
    select i.tipo, i.posicao::text into v_tipo, v_pos from public.participantes_itens i where i.id = v_item;
    if v_tipo is null then v_tipo := r ->> 'tipo'; v_pos := r ->> 'posicao'; end if;
    v_tipo := case v_tipo when 'doce' then 'Doce' when 'salgado' then 'Salgado' when 'bebida' then 'Bebida' else coalesce(initcap(v_tipo), 'Item') end;
    if p_tabela = 'participantes_itens' then
      return case p_coluna
        when 'nome' then array[v_tipo || ': nome', 'combo', 'item-' || coalesce(v_pos, '')]
        when 'descricao' then array[v_tipo || ': descrição', 'combo', 'item-' || coalesce(v_pos, '')]
        when 'ingredientes' then array[v_tipo || ': ingredientes', 'combo', 'item-' || coalesce(v_pos, '')]
        when 'vegano' then array[v_tipo || ': informações alimentares', 'combo', 'item-' || coalesce(v_pos, '')]
        when 'sem_gluten' then array[v_tipo || ': informações alimentares', 'combo', 'item-' || coalesce(v_pos, '')]
        when 'sem_lactose' then array[v_tipo || ': informações alimentares', 'combo', 'item-' || coalesce(v_pos, '')]
        when 'tem_substituicao' then array[v_tipo || ': trocas', 'combo', 'item-' || coalesce(v_pos, '')]
        when 'substituicao' then array[v_tipo || ': trocas', 'combo', 'item-' || coalesce(v_pos, '')]
        else null end;
    elsif p_tabela = 'substituicoes' then
      return case when p_coluna in ('original', 'alternativa', 'disponibilidade', 'acrescimo', 'como_solicitar', 'modalidades', 'unidades', 'ordem')
        then array[v_tipo || ': trocas', 'combo', 'item-' || coalesce(v_pos, '')] else null end;
    else
      return case when p_coluna in ('aspecto', 'estado', 'observacao', 'item_id', 'substituicao_id')
        then array[v_tipo || ': informações alimentares', 'combo', 'item-' || coalesce(v_pos, '')] else null end;
    end if;
  elsif p_tabela in ('unidades', 'participacao_unidades', 'unidade_disponibilidade') then
    -- A unidade: o nome e a âncora (fg-uni-<id da unidade na edição>) vêm da participação.
    if p_tabela = 'participacao_unidades' then v_pu := (r ->> 'id')::uuid; v_unidade := (r ->> 'unidade_id')::uuid; v_ordem := r ->> 'ordem';
    elsif p_tabela = 'unidade_disponibilidade' then v_pu := (r ->> 'participacao_unidade_id')::uuid;
    else v_unidade := (r ->> 'id')::uuid; v_nome := nullif(btrim(r ->> 'nome_unidade'), '');
      select pu.id, pu.ordem::text into v_pu, v_ordem from public.participacao_unidades pu
       where pu.unidade_id = v_unidade and pu.participacao_id = p_pa order by pu.ordem limit 1;
    end if;
    if v_pu is not null and (v_nome is null or v_ordem is null) then   -- sem linha, o SELECT INTO zeraria o que já se sabe
      select coalesce(v_nome, nullif(btrim(u.nome_unidade), '')), coalesce(v_ordem, pu.ordem::text) into v_nome, v_ordem
        from public.participacao_unidades pu left join public.unidades u on u.id = pu.unidade_id where pu.id = v_pu;
    end if;
    -- Sem nome próprio, a ficha chama de "Unidade N" (N = a posição na participação, a partir de 1).
    if v_nome is null and v_pu is not null then
      select 'Unidade ' || (select count(*) from public.participacao_unidades x
                             where x.participacao_id = pu.participacao_id and (x.ordem, x.id) <= (pu.ordem, pu.id))::text
        into v_nome from public.participacao_unidades pu where pu.id = v_pu;
    end if;
    v_nome := coalesce(v_nome, 'Unidade');
    if p_tabela = 'unidades' then
      return case
        when p_coluna in ('nome_unidade', 'logradouro', 'numero', 'complemento', 'referencia', 'bairro', 'cidade', 'uf', 'cep')
          then array[v_nome || ': endereço', 'unidades', coalesce('uni-' || v_pu::text, '')]
        when p_coluna in ('whatsapp_publico', 'whatsapp_autorizado')
          then array[v_nome || ': WhatsApp da loja', 'unidades', coalesce('uni-' || v_pu::text, '')]
        when p_coluna = 'horario_loja_texto'
          then array[v_nome || ': horário', 'unidades', coalesce('uni-' || v_pu::text, '')]
        else null end;
    elsif p_tabela = 'participacao_unidades' then
      return case
        when p_coluna in ('participa', 'unidade_id') then array[v_nome || ': participação na edição', 'unidades', 'uni-' || v_pu::text]
        when p_coluna in ('endereco', 'bairro') then array[v_nome || ': endereço', 'unidades', 'uni-' || v_pu::text]
        when p_coluna in ('consumo_local', 'retirada', 'delivery_combo') then array[v_nome || ': atendimento do combo', 'unidades', 'uni-' || v_pu::text]
        when p_coluna in ('faz_delivery', 'canais_delivery', 'delivery_regioes', 'delivery_taxa') then array[v_nome || ': delivery', 'unidades', 'uni-' || v_pu::text]
        when p_coluna = 'observacao_combo' then array[v_nome || ': condições na edição', 'unidades', 'uni-' || v_pu::text]
        when p_coluna in ('horarios', 'horario_festival') then array[v_nome || ': horário no festival', 'unidades', 'uni-' || v_pu::text]
        else null end;
    else
      return case when p_coluna in ('data', 'abre', 'fecha', 'observacao')
        then array[v_nome || ': horário no festival', 'unidades', coalesce('uni-' || v_pu::text, '')] else null end;
    end if;
  end if;
  return null;
end $function$;

-- ── 2. O aviso único por marca, agora com o campo e o link ───────────────────
create or replace function public.avisar_alteracao_marca_campo(p_participante uuid, p_rotulo text, p_secao text, p_chave text)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_chave text := 'marca:' || p_participante::text || ':alterou';
  v_id uuid;
  v_texto text;
  v_link text;
begin
  if p_participante is null or coalesce(btrim(p_rotulo), '') = '' then return; end if;
  if current_setting('scw.silencioso', true) = 'on' then return; end if;
  -- Duas abas salvando juntas não abrem dois avisos: uma espera a outra (só dentro desta transação curta).
  perform pg_advisory_xact_lock(hashtext(v_chave));
  select n.id, coalesce(n.texto, '') into v_id, v_texto
    from public.notificacoes n
   where n.para = 'organizacao' and n.para_user_id is null and n.chave_grupo = v_chave
     and not exists (select 1 from public.notificacao_leitura l where l.notificacao_id = n.id)
   order by coalesce(n.atualizada_em, n.criada_em) desc
   limit 1;
  if v_id is not null then
    if p_rotulo = any (string_to_array(v_texto, ' · ')) then return; end if;   -- já dito: nada a gravar
    update public.notificacoes
       set texto = left(case when v_texto = '' then p_rotulo else v_texto || ' · ' || p_rotulo end, 240),
           atualizada_em = now(), n_agrupadas = n_agrupadas + 1
     where id = v_id;
    return;
  end if;
  v_link := 'marcas/' || p_participante::text || '/' || coalesce(nullif(p_secao, ''), 'cadastro')
            || case when coalesce(p_chave, '') ~ '^[A-Za-z0-9_-]{1,80}$' then '/' || p_chave else '' end;
  insert into public.notificacoes (para, participante_id, tipo, titulo, texto, link, chave_grupo)
  values ('organizacao', p_participante, 'cadastro',
          left(coalesce((select nome_marca from public.participantes where id = p_participante), 'Uma marca') || ' alterou o cadastro', 120),
          left(p_rotulo, 240), v_link, v_chave);
end $function$;

-- ── 3. O gatilho: quem gravou, quais campos mudaram, e a conferência automática ─
create or replace function public.marca_alterou()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
declare
  r jsonb; o jsonb; v_mudou text[]; v_campos jsonb := '[]'::jsonb; v_rotulos text[] := '{}'; c text[]; k text; v_campo jsonb;
  v_eu uuid; v_part uuid; v_pa uuid; v_status text; v_combo text;
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
    select coalesce(array_agg(kk order by kk), '{}') into v_mudou
      from jsonb_object_keys(r) kk
     where case when o is null then r -> kk <> 'null'::jsonb else (r -> kk) is distinct from (o -> kk) end;

    -- De quem é a linha e de qual participação.
    if tg_table_name = 'participantes' then
      v_part := (r ->> 'id')::uuid;
      v_pa := public.participacao_corrente(v_part);
    elsif tg_table_name = 'participacoes' then
      v_pa := (r ->> 'id')::uuid;
      v_part := (r ->> 'participante_id')::uuid;
    elsif tg_table_name = 'participantes_itens' then
      v_pa := (r ->> 'participacao_id')::uuid;
    elsif tg_table_name = 'unidades' then
      v_part := (r ->> 'participante_id')::uuid;
      v_pa := public.participacao_corrente(v_part);
    elsif tg_table_name = 'participacao_unidades' then
      v_pa := (r ->> 'participacao_id')::uuid;
    elsif tg_table_name = 'unidade_disponibilidade' then
      select pu.participacao_id into v_pa from public.participacao_unidades pu where pu.id = (r ->> 'participacao_unidade_id')::uuid;
    elsif tg_table_name = 'substituicoes' then
      select i.participacao_id into v_pa from public.participantes_itens i where i.id = (r ->> 'item_id')::uuid;
    elsif tg_table_name = 'declaracoes_alimentares' then
      select i.participacao_id into v_pa from public.participantes_itens i
       where i.id = coalesce((r ->> 'item_id')::uuid,
                             (select s.item_id from public.substituicoes s where s.id = (r ->> 'substituicao_id')::uuid));
    end if;
    if v_part is null and v_pa is not null then
      select pa.participante_id into v_part from public.participacoes pa where pa.id = v_pa;
    end if;
    -- Só a própria marca, no próprio cadastro (a RLS já garante; isto é a segunda trava).
    if v_part is null or v_part <> v_eu then return null; end if;

    -- Os campos (rótulo, seção, âncora) das colunas que a MARCA preenche; um rótulo só aparece uma vez.
    foreach k in array v_mudou loop
      c := public.campo_alterado_marca(tg_table_name, k, r, v_pa);
      if c is not null and c[1] is not null and not (c[1] = any (v_rotulos)) then
        v_rotulos := v_rotulos || c[1];
        v_campos := v_campos || jsonb_build_array(jsonb_build_object('r', c[1], 's', c[2], 'k', c[3]));
      end if;
    end loop;
    if jsonb_array_length(v_campos) = 0 then return null; end if;
  exception when others then
    raise warning 'marca_alterou (leitura): %', sqlerrm;
    return null;
  end;

  -- R7: o aviso. Falhou? O salvamento da marca segue.
  begin
    for v_campo in select * from jsonb_array_elements(v_campos) loop
      perform public.avisar_alteracao_marca_campo(v_part, v_campo ->> 'r', v_campo ->> 's', v_campo ->> 'k');
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

-- ── 4. Funções internas: ninguém chama pela API ─────────────────────────────
revoke all on function public.campo_alterado_marca(text, text, jsonb, uuid) from public, anon, authenticated;
revoke all on function public.avisar_alteracao_marca_campo(uuid, text, text, text) from public, anon, authenticated;
