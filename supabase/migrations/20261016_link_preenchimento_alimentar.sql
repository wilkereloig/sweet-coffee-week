-- ─────────────────────────────────────────────────────────────────────────────
-- Link de preenchimento — v2, 16/10/2026 (pedido do Wilker: "tudo do combo, em
-- caixas de seleção"). O formulário passa a trazer, por item, as declarações
-- alimentares (alergênicos e características) e a troca (substituição).
-- Grava nas tabelas da camada de edição: declaracoes_alimentares e substituicoes.
-- Regra que não se negocia: aspecto ausente = não respondido, nunca "não contém".
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.preenchimento_estado(p_participacao uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'marca', (select jsonb_build_object(
                'responsavel', p.responsavel, 'telefone', p.telefone, 'email', p.email,
                'instagram', p.instagram, 'site', p.site, 'cnpj', p.cnpj, 'razao_social', p.razao_social)
                from public.participantes p join public.participacoes pa on pa.participante_id = p.id
               where pa.id = p_participacao),
    'combo', (select jsonb_build_object(
                'tema_combo', pa.tema_combo, 'tema_justificativa', pa.tema_justificativa,
                'combo_nome', pa.combo_nome, 'combo_descricao', pa.combo_descricao,
                'combo_para_viagem', pa.combo_para_viagem,
                'custo_embalagem', pa.custo_embalagem, 'custo_delivery', pa.custo_delivery)
                from public.participacoes pa where pa.id = p_participacao),
    'itens', (select jsonb_agg(jsonb_build_object(
                'posicao', g.pos, 'nome', i.nome, 'descricao', i.descricao, 'ingredientes', i.ingredientes,
                -- Só o que foi DECLARADO: aspecto ausente = não respondido, nunca "não contém".
                'alimentar', (select coalesce(jsonb_object_agg(d.aspecto, d.estado), '{}'::jsonb)
                                from public.declaracoes_alimentares d where d.item_id = i.id),
                'outro_alergenico', (select d.observacao from public.declaracoes_alimentares d
                                      where d.item_id = i.id and d.aspecto = 'outro_alergenico'),
                -- Sem troca cadastrada = não respondido (null), nunca "não tem troca".
                'tem_troca', case when exists (select 1 from public.substituicoes s where s.item_id = i.id) then true end,
                'troca', (select jsonb_build_object('original', s.original, 'alternativa', s.alternativa,
                                   'disponibilidade', s.disponibilidade, 'acrescimo', s.acrescimo)
                            from public.substituicoes s where s.item_id = i.id order by s.ordem, s.criado_em limit 1))
                order by g.pos)
                from generate_series(1, 3) g(pos)
                left join lateral (select * from public.participantes_itens x
                                    where x.participacao_id = p_participacao and x.posicao = g.pos
                                    limit 1) i on true),
    'unidades', (select coalesce(jsonb_agg(jsonb_build_object(
                'id', pu.id, 'nome_unidade', u.nome_unidade,
                -- Legado: antes da unidade permanente o endereço morava na participação.
                'logradouro', coalesce(u.logradouro, pu.endereco), 'numero', u.numero,
                'complemento', u.complemento, 'bairro', coalesce(u.bairro, pu.bairro),
                'cidade', u.cidade, 'cep', u.cep, 'referencia', u.referencia,
                'whatsapp', u.whatsapp_publico, 'whatsapp_autorizado', coalesce(u.whatsapp_autorizado, false),
                'horario_loja', u.horario_loja_texto, 'horario_combo', pu.horarios,
                'consumo_local', pu.consumo_local, 'retirada', pu.retirada, 'delivery_combo', pu.delivery_combo)
                order by pu.ordem), '[]'::jsonb)
                from public.participacao_unidades pu
                left join public.unidades u on u.id = pu.unidade_id
               where pu.participacao_id = p_participacao and pu.participa is not false)
  )
$$;
revoke all on function public.preenchimento_estado(uuid) from public, anon, authenticated;

create or replace function public.org_preenchimento_decidir(p_secret text, p_envio uuid, p_aplicar boolean,
                                                            p_motivo text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_e public.preenchimento_envios; v_pa public.participacoes; d jsonb; c jsonb; m jsonb; it jsonb; un jsonb;
  v_pos int; v_atual public.participantes_itens; v_pu uuid; v_un uuid; v_dig text; v_txt text;
  v_ordem int; k text; v_num text;
begin
  if not public.pode(p_secret, 'cadastro.editar') then raise exception 'nao_autorizado'; end if;
  select * into v_e from public.preenchimento_envios where id = p_envio for update;
  if not found then raise exception 'envio_nao_encontrado'; end if;
  if v_e.status <> 'pendente' then raise exception 'envio_ja_revisado'; end if;
  select * into v_pa from public.participacoes where id = v_e.participacao_id;

  if not p_aplicar then
    update public.preenchimento_envios
       set status = 'descartado', revisado_em = now(), revisado_por_rotulo = public.rotulo_ator(),
           motivo = left(nullif(btrim(p_motivo), ''), 500)
     where id = p_envio;
    insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, participacao_id, detalhe)
    values ('preenchimento.descartado', 'preenchimento_envios', p_envio::text, v_pa.participante_id, v_pa.id,
            jsonb_build_object('motivo', p_motivo));
    return;
  end if;

  d := v_e.dados;

  -- Marca: só as colunas que o editor do painel aceita (nome da marca fica de fora: é login).
  if jsonb_typeof(d -> 'marca') = 'object' then
    select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into m
      from jsonb_each(d -> 'marca')
     where key in ('responsavel', 'telefone', 'email', 'instagram', 'site', 'cnpj', 'razao_social')
       and jsonb_typeof(value) in ('string', 'null');
    if m <> '{}'::jsonb then perform public.org_salvar_participante(p_secret, v_pa.participante_id, m); end if;
  end if;

  if jsonb_typeof(d -> 'combo') = 'object' then
    c := d -> 'combo';
    m := '{}'::jsonb;
    foreach k in array array['tema_combo', 'tema_justificativa'] loop
      if jsonb_typeof(c -> k) in ('string', 'null') then m := m || jsonb_build_object(k, c -> k); end if;
    end loop;
    if jsonb_typeof(c -> 'combo_para_viagem') in ('boolean', 'null') then
      m := m || jsonb_build_object('combo_para_viagem', c -> 'combo_para_viagem');
    end if;
    -- Custo: "12,50", "R$ 12,50" ou 12.5 → '12.50'. Valor que não é dinheiro fica de fora.
    foreach k in array array['custo_embalagem', 'custo_delivery'] loop
      if jsonb_typeof(c -> k) = 'null' or (jsonb_typeof(c -> k) = 'string' and btrim(c ->> k) = '') then
        m := m || jsonb_build_object(k, null);
      elsif jsonb_typeof(c -> k) in ('string', 'number') then
        v_num := regexp_replace(replace(c ->> k, ',', '.'), '[^0-9.]', '', 'g');
        if v_num ~ '^\d{1,4}(\.\d{1,2})?$' then m := m || jsonb_build_object(k, v_num); end if;
      end if;
    end loop;
    if m <> '{}'::jsonb then perform public.org_salvar_participacao(p_secret, v_pa.id, m); end if;

    if (c ? 'combo_nome' and public.preenchimento_texto(c, 'combo_nome', 80) is distinct from v_pa.combo_nome)
       or (c ? 'combo_descricao' and public.preenchimento_texto(c, 'combo_descricao', 400) is distinct from v_pa.combo_descricao) then
      perform public.org_salvar_dados_publicos(p_secret, v_pa.id, jsonb_build_object(
        'combo_nome', coalesce(public.preenchimento_texto(c, 'combo_nome', 80), ''),
        'combo_descricao', coalesce(public.preenchimento_texto(c, 'combo_descricao', 400), '')));
    end if;
  end if;

  -- Itens: doce (1), salgado (2), bebida (3). Só grava o que mudou.
  if jsonb_typeof(d -> 'itens') = 'array' then
    for it in select value from jsonb_array_elements(d -> 'itens') loop
      continue when jsonb_typeof(it) <> 'object' or coalesce(it ->> 'posicao', '') !~ '^[123]$';
      v_pos := (it ->> 'posicao')::int;
      select * into v_atual from public.participantes_itens
       where participacao_id = v_pa.id and posicao = v_pos limit 1;
      if v_atual.id is null then  -- item que nunca existiu: cria vazio para receber as declarações
        perform public.org_salvar_item(p_secret, v_pa.id, v_pos, '{}'::jsonb);
        select * into v_atual from public.participantes_itens where participacao_id = v_pa.id and posicao = v_pos limit 1;
      end if;
      if public.preenchimento_texto(it, 'nome', 120) is distinct from v_atual.nome
         or public.preenchimento_texto(it, 'descricao', 600) is distinct from v_atual.descricao
         or public.preenchimento_texto(it, 'ingredientes', 800) is distinct from v_atual.ingredientes then
        perform public.org_salvar_item(p_secret, v_pa.id, v_pos, jsonb_build_object(
          'nome', coalesce(public.preenchimento_texto(it, 'nome', 120), ''),
          'descricao', coalesce(public.preenchimento_texto(it, 'descricao', 600), ''),
          'ingredientes', coalesce(public.preenchimento_texto(it, 'ingredientes', 800), '')));
      end if;

      -- Declarações alimentares: só aspecto e estado válidos (o CHECK do banco decide o par).
      if jsonb_typeof(it -> 'alimentar') = 'object' then
        for k, v_num in select key, value #>> '{}' from jsonb_each(it -> 'alimentar')
                       where jsonb_typeof(value) = 'string' loop
          continue when not (
            (k in ('gluten', 'leite', 'ovo', 'amendoim', 'castanhas', 'soja', 'peixe', 'crustaceos')
               and v_num in ('contem', 'nao_contem', 'pode_conter', 'nao_informado'))
            or (k in ('lactose', 'vegano', 'vegetariano', 'acucar_adicionado') and v_num in ('sim', 'nao', 'nao_informado')));
          insert into public.declaracoes_alimentares (item_id, aspecto, estado)
          values (v_atual.id, k, v_num)
          on conflict (item_id, aspecto) where item_id is not null
          do update set estado = excluded.estado, atualizado_em = now();
        end loop;
        v_txt := public.preenchimento_texto(it, 'outro_alergenico', 160);
        if v_txt is not null then
          insert into public.declaracoes_alimentares (item_id, aspecto, estado, observacao)
          values (v_atual.id, 'outro_alergenico', 'contem', v_txt)
          on conflict (item_id, aspecto) where item_id is not null
          do update set estado = 'contem', observacao = excluded.observacao, atualizado_em = now();
        elsif it ? 'outro_alergenico' then
          delete from public.declaracoes_alimentares where item_id = v_atual.id and aspecto = 'outro_alergenico';
        end if;
      end if;

      -- Troca (substituição): uma por item neste formulário.
      if jsonb_typeof(it -> 'tem_troca') = 'boolean' then
        if not (it ->> 'tem_troca')::boolean then
          delete from public.substituicoes where item_id = v_atual.id;
        elsif jsonb_typeof(it -> 'troca') = 'object'
              and public.preenchimento_texto(it -> 'troca', 'alternativa', 200) is not null then
          v_num := regexp_replace(replace(coalesce(it -> 'troca' ->> 'acrescimo', ''), ',', '.'), '[^0-9.]', '', 'g');
          update public.substituicoes set
            original = coalesce(public.preenchimento_texto(it -> 'troca', 'original', 80), left(v_atual.nome, 80), 'Item'),
            alternativa = public.preenchimento_texto(it -> 'troca', 'alternativa', 200),
            disponibilidade = case when it -> 'troca' ->> 'disponibilidade' in ('sempre', 'sob_consulta', 'limitada')
                                   then it -> 'troca' ->> 'disponibilidade' else 'sempre' end,
            acrescimo = case when v_num ~ '^\d{1,4}(\.\d{1,2})?$' then v_num::numeric else null end
           where id = (select id from public.substituicoes where item_id = v_atual.id order by ordem, criado_em limit 1);
          if not found then
            insert into public.substituicoes (item_id, original, alternativa, disponibilidade, acrescimo, modalidades, unidades, ordem)
            values (v_atual.id,
                    coalesce(public.preenchimento_texto(it -> 'troca', 'original', 80), left(v_atual.nome, 80), 'Item'),
                    public.preenchimento_texto(it -> 'troca', 'alternativa', 200),
                    case when it -> 'troca' ->> 'disponibilidade' in ('sempre', 'sob_consulta', 'limitada')
                         then it -> 'troca' ->> 'disponibilidade' else 'sempre' end,
                    case when v_num ~ '^\d{1,4}(\.\d{1,2})?$' then v_num::numeric else null end,
                    '{}', '{}', 1);
          end if;
        end if;
      end if;
    end loop;
  end if;

  -- Unidades: a permanente (unidades) e a desta edição (participacao_unidades).
  if jsonb_typeof(d -> 'unidades') = 'array' then
    for un in select value from jsonb_array_elements(d -> 'unidades') limit 12 loop
      continue when jsonb_typeof(un) <> 'object';
      v_pu := null; v_un := null;
      if coalesce(un ->> 'id', '') ~ '^[0-9a-f-]{36}$' then
        select id, unidade_id into v_pu, v_un from public.participacao_unidades
         where id = (un ->> 'id')::uuid and participacao_id = v_pa.id;
      end if;
      if (un ->> 'remover') = 'true' then
        if v_pu is not null then
          update public.participacao_unidades set participa = false where id = v_pu;
        end if;
        continue;
      end if;
      v_txt := public.preenchimento_texto(un, 'logradouro', 160);
      if v_pu is null then
        continue when v_txt is null; -- unidade nova sem endereço não entra
        select coalesce(max(ordem), 0) + 1 into v_ordem from public.participacao_unidades where participacao_id = v_pa.id;
        insert into public.participacao_unidades (participacao_id, ordem, endereco, bairro, faz_delivery, canais_delivery, so_delivery)
        values (v_pa.id, v_ordem, v_txt, public.preenchimento_texto(un, 'bairro', 80), false, '[]'::jsonb, false)
        returning id, unidade_id into v_pu, v_un;   -- o gatilho cria a unidade permanente
      elsif v_un is null then
        -- Linha antiga sem unidade permanente: tocar nela faz o gatilho criar.
        update public.participacao_unidades set ordem = ordem where id = v_pu returning unidade_id into v_un;
      end if;

      v_dig := regexp_replace(coalesce(un ->> 'cep', ''), '\D', '', 'g');
      update public.unidades set
        nome_unidade = case when un ? 'nome_unidade' then public.preenchimento_texto(un, 'nome_unidade', 60) else nome_unidade end,
        logradouro = case when un ? 'logradouro' then v_txt else logradouro end,
        numero = case when un ? 'numero' then public.preenchimento_texto(un, 'numero', 20) else numero end,
        complemento = case when un ? 'complemento' then public.preenchimento_texto(un, 'complemento', 80) else complemento end,
        bairro = case when un ? 'bairro' then public.preenchimento_texto(un, 'bairro', 80) else bairro end,
        cidade = case when un ? 'cidade' then public.preenchimento_texto(un, 'cidade', 80) else cidade end,
        cep = case when not (un ? 'cep') then cep when v_dig = '' then null when v_dig ~ '^\d{8}$' then v_dig else cep end,
        referencia = case when un ? 'referencia' then public.preenchimento_texto(un, 'referencia', 120) else referencia end,
        horario_loja_texto = case when un ? 'horario_loja' then public.preenchimento_texto(un, 'horario_loja', 200) else horario_loja_texto end
       where id = v_un;
      if un ? 'whatsapp' then
        v_dig := regexp_replace(coalesce(un ->> 'whatsapp', ''), '\D', '', 'g');
        if length(v_dig) in (12, 13) and v_dig like '55%' then v_dig := substr(v_dig, 3); end if;
        if v_dig = '' or v_dig ~ '^\d{10,11}$' then
          update public.unidades set whatsapp_publico = nullif(v_dig, ''),
                 whatsapp_autorizado = (un -> 'whatsapp_autorizado') = 'true'::jsonb and v_dig <> ''
           where id = v_un;
        end if;
      end if;

      update public.participacao_unidades pu set
        participa = true,
        -- Espelho para quem ainda lê o endereço da participação (lista, campos_cadastro).
        endereco = nullif(concat_ws(', ', u.logradouro, u.numero), ''),
        bairro = u.bairro,
        horarios = case when un ? 'horario_combo' then public.preenchimento_texto(un, 'horario_combo', 300) else pu.horarios end,
        consumo_local = case when un ->> 'consumo_local' in ('sim', 'nao', 'nao_informado') then un ->> 'consumo_local' else pu.consumo_local end,
        retirada = case when un ->> 'retirada' in ('sim', 'nao', 'nao_informado') then un ->> 'retirada' else pu.retirada end,
        delivery_combo = case when un ->> 'delivery_combo' in ('sim', 'nao', 'nao_informado') then un ->> 'delivery_combo' else pu.delivery_combo end,
        faz_delivery = case when un ->> 'delivery_combo' in ('sim', 'nao', 'nao_informado') then (un ->> 'delivery_combo') = 'sim' else pu.faz_delivery end
        from public.unidades u
       where pu.id = v_pu and u.id = pu.unidade_id;

      insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, participacao_id, detalhe)
      values ('cadastro.editado', 'participacao_unidades', v_pu::text, v_pa.participante_id, v_pa.id,
              jsonb_build_object('bloco', 'unidade', 'origem', 'preenchimento', 'endereco', v_txt));
    end loop;
  end if;

  update public.preenchimento_envios
     set status = 'aplicado', revisado_em = now(), revisado_por_rotulo = public.rotulo_ator()
   where id = p_envio;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, participacao_id, detalhe)
  values ('preenchimento.aplicado', 'preenchimento_envios', p_envio::text, v_pa.participante_id, v_pa.id,
          jsonb_build_object('observacao', d -> 'observacao'));
end $$;
