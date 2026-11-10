-- 09/11/2026 (pedido do Wilker): tudo que o site de um participante mostra tem que poder ser editado pelo painel.
-- Auditoria achou, do lado da EQUIPE: apresentação da casa, atendimento por unidade, WhatsApp e endereço completo da
-- unidade, e informações alimentares/trocas (a ficha gravava as colunas legadas, que o site não lê).
--   * org_salvar_participante     aceita também apresentacao_publica;
--   * get_ficha_participacao     cada unidade traz a linha permanente (`_un`) para a ficha mostrar e editar;
--   * get_alimentar_participacao lê declaracoes_alimentares + substituicoes dos itens da participação;
--   * org_salvar_alimentar       grava alergênicos/características por item e a lista de trocas (modelo da marca);
--   * org_salvar_unidade_site    grava a unidade permanente e o atendimento (participacao_unidades) de uma vez.
-- Reversão: supabase/reverter/20270116_equipe_edita_o_que_o_site_mostra.sql.

create or replace function public.org_salvar_participante(p_secret text, p_participante uuid, p_dados jsonb)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare
  v public.participantes%rowtype;
  k text; v_de text; v_para text; v_mud jsonb := '{}'::jsonb;
begin
  if not public.pode(p_secret, 'cadastro.editar') then raise exception 'nao_autorizado'; end if;
  select * into v from public.participantes where id = p_participante for update;
  if not found then raise exception 'participante_nao_encontrado'; end if;
  for k in select jsonb_object_keys(coalesce(p_dados, '{}'::jsonb)) loop
    if k not in ('nome_marca','responsavel','telefone','email','instagram','site','cnpj','razao_social','apresentacao_publica') then
      raise exception 'campo_invalido';
    end if;
    v_para := nullif(btrim(p_dados ->> k), '');
    execute format('select %I from public.participantes where id = $1', k) into v_de using p_participante;
    if v_de is not distinct from v_para then continue; end if;
    if k = 'nome_marca' then
      if v_para is null then raise exception 'nome_obrigatorio'; end if;
      if v.user_id is not null and public.normalizar_nome(v_para) is distinct from public.normalizar_nome(v_de) then
        raise exception 'nome_com_conta';
      end if;
    end if;
    execute format('update public.participantes set %I = $1 where id = $2', k) using v_para, p_participante;
    -- cnpj_normalizado e telefone_normalizado são colunas geradas: acompanham sozinhas.
    v_mud := v_mud || public.campo_auditado(k, v_de, v_para);
  end loop;
  if v_mud <> '{}'::jsonb then
    insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, detalhe)
    values ('cadastro.editado', 'participantes', p_participante::text, p_participante,
            jsonb_build_object('bloco', 'marca', 'campos', v_mud));
  end if;
end $function$;

create or replace function public.get_ficha_participacao(p_secret text, p_participacao uuid)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $function$
declare v jsonb; v_part uuid;
begin
  if not public.pode(p_secret, 'dado.ler') then return null; end if;

  select participante_id into v_part from public.participacoes where id = p_participacao;
  if v_part is null then return null; end if;

  select jsonb_build_object(
    'marca', (select to_jsonb(p) from public.participantes p where p.id = v_part),
    'participacao', (select to_jsonb(pa) from public.participacoes pa where pa.id = p_participacao),
    'itens', coalesce((
      select jsonb_agg(to_jsonb(i) order by array_position(array['doce','salgado','bebida'], i.tipo))
        from public.participantes_itens i where i.participacao_id = p_participacao), '[]'::jsonb),
    'unidades', coalesce((
      select jsonb_agg(to_jsonb(u) || jsonb_build_object('_un', (select to_jsonb(x) from public.unidades x where x.id = u.unidade_id))
                       order by u.ordem)
        from public.participacao_unidades u where u.participacao_id = p_participacao), '[]'::jsonb),
    'solicitacoes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', s.id, 'titulo', s.titulo, 'texto', s.texto, 'bloco', s.bloco,
               'escopo', s.escopo, 'prazo_em', s.prazo_em, 'publicada_em', s.publicada_em,
               'arquivada', s.arquivada,
               'estado', coalesce(e.estado, 'pendente'), 'respondido_em', e.respondido_em)
             order by s.prazo_em nulls last)
        from public.solicitacoes s
        left join public.solicitacao_estado e
               on e.solicitacao_id = s.id and e.participacao_id = p_participacao
       where s.publicada_em is not null and not s.arquivada
         and (s.participacao_id = p_participacao or s.escopo = 'geral')), '[]'::jsonb),
    'arquivos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', a.id, 'nome', a.nome, 'escopo', a.escopo, 'versao', a.versao,
               'path', a.path, 'exige_leitura', a.exige_leitura,
               'publicado_em', a.publicado_em,
               'lido_em', l.lido_em) order by a.created_at desc)
        from public.arquivos a
        left join public.arquivo_leitura l
               on l.arquivo_id = a.id and l.participacao_id = p_participacao
       where a.publicado_em is not null and not a.arquivado
         and (a.participacao_id = p_participacao or a.escopo = 'geral')), '[]'::jsonb),
    'sessoes', coalesce((
      select jsonb_agg(to_jsonb(f) order by f.data_hora desc)
        from public.sessoes_fotos f
       where f.participacao_id = p_participacao or f.participante_id = v_part), '[]'::jsonb),
    'vendas', coalesce((
      select jsonb_agg(jsonb_build_object('dia', v.dia, 'quantidade', v.quantidade) order by v.dia desc)
        from public.vendas_diarias v where v.participacao_id = p_participacao), '[]'::jsonb),
    'edicoes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', t.id, 'edicao_codigo', t.edicao_codigo,
               'status_cadastro', t.status_cadastro, 'tema_combo', t.tema_combo)
             order by t.created_at desc)
        from public.participacoes t where t.participante_id = v_part), '[]'::jsonb)
  ) into v;

  return v;
end;
$function$;

create or replace function public.get_alimentar_participacao(p_secret text, p_participacao uuid)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $function$
begin
  if not public.pode(p_secret, 'dado.ler') then return null; end if;
  return jsonb_build_object(
    'declaracoes', coalesce((
      select jsonb_agg(to_jsonb(d))
        from public.declaracoes_alimentares d
       where d.item_id in (select id from public.participantes_itens where participacao_id = p_participacao)
          or d.substituicao_id in (select s.id from public.substituicoes s join public.participantes_itens i on i.id = s.item_id
                                    where i.participacao_id = p_participacao)), '[]'::jsonb),
    'substituicoes', coalesce((
      select jsonb_agg(to_jsonb(s) order by s.item_id, s.ordem, s.criado_em)
        from public.substituicoes s join public.participantes_itens i on i.id = s.item_id
       where i.participacao_id = p_participacao), '[]'::jsonb));
end $function$;

-- Grava as declarações de UM alvo (item ou troca). Estado vazio = não mexe; "outro" respondido sem dizer qual não grava
-- (o check do banco); observação vazia vira null.
create or replace function public._org_gravar_declaracoes(p_item uuid, p_sub uuid, p_decl jsonb)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare a text; d jsonb; e text; o text;
begin
  if p_decl is null or jsonb_typeof(p_decl) <> 'object' then return; end if;
  for a in select jsonb_object_keys(p_decl) loop
    d := p_decl -> a;
    e := nullif(btrim(d ->> 'estado'), '');
    o := left(nullif(btrim(d ->> 'observacao'), ''), 160);
    if e is null then continue; end if;
    if a = 'outro_alergenico' and e <> 'nao_informado' and o is null then continue; end if;
    if p_item is not null then
      insert into public.declaracoes_alimentares (item_id, aspecto, estado, observacao, atualizado_em)
      values (p_item, a, e, o, now())
      on conflict (item_id, aspecto) where item_id is not null
      do update set estado = excluded.estado, observacao = excluded.observacao, atualizado_em = now();
    else
      insert into public.declaracoes_alimentares (substituicao_id, aspecto, estado, observacao, atualizado_em)
      values (p_sub, a, e, o, now())
      on conflict (substituicao_id, aspecto) where substituicao_id is not null
      do update set estado = excluded.estado, observacao = excluded.observacao, atualizado_em = now();
    end if;
  end loop;
end $function$;
revoke all on function public._org_gravar_declaracoes(uuid, uuid, jsonb) from public, anon, authenticated;

/*
 * p_dados = { "itens": [ { "item_id": uuid,
 *                          "declaracoes": { "<aspecto>": { "estado", "observacao" } },
 *                          "trocas": [ { "id"?: uuid, "alternativa", "descricao", "disponibilidade", "como_solicitar",
 *                                        "modalidades": [..], "unidades": [uuid..], "declaracoes": { … } } ] } ] }
 * `trocas` ausente = não mexe nas trocas do item; presente = É a lista inteira (a que não vier é removida, com as
 * declarações dela). Troca sem nome não é gravada. A troca é um item completo e não muda o valor (acréscimo 0).
 */
create or replace function public.org_salvar_alimentar(p_secret text, p_participacao uuid, p_dados jsonb)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_pa public.participacoes%rowtype; it jsonb; tr jsonb; v_item uuid; v_sub uuid; v_ids uuid[]; v_nome text; v_alt text; v_n int := 0;
begin
  if not public.pode(p_secret, 'cadastro.editar') then raise exception 'nao_autorizado'; end if;
  select * into v_pa from public.participacoes where id = p_participacao;
  if not found then raise exception 'participacao_nao_encontrada'; end if;
  for it in select * from jsonb_array_elements(coalesce(p_dados -> 'itens', '[]'::jsonb)) loop
    v_item := (it ->> 'item_id')::uuid;
    select nome into v_nome from public.participantes_itens where id = v_item and participacao_id = p_participacao;
    if not found then raise exception 'item_nao_encontrado'; end if;
    perform public._org_gravar_declaracoes(v_item, null, it -> 'declaracoes');
    if it ? 'trocas' and jsonb_typeof(it -> 'trocas') = 'array' then
      v_ids := '{}';
      for tr in select * from jsonb_array_elements(it -> 'trocas') loop
        v_alt := left(nullif(btrim(tr ->> 'alternativa'), ''), 200);
        if v_alt is null then continue; end if;
        v_sub := nullif(tr ->> 'id', '')::uuid;
        if v_sub is not null and not exists (select 1 from public.substituicoes where id = v_sub and item_id = v_item) then
          raise exception 'troca_nao_encontrada';
        end if;
        if v_sub is null then
          insert into public.substituicoes (item_id, original, alternativa) values (v_item, 'x', v_alt) returning id into v_sub;
        end if;
        update public.substituicoes set
          original = coalesce(nullif(left(btrim(coalesce(v_nome, '')), 80), ''), 'Item'),
          alternativa = v_alt,
          descricao = left(nullif(btrim(tr ->> 'descricao'), ''), 5000),
          disponibilidade = coalesce(nullif(tr ->> 'disponibilidade', ''), 'sob_consulta'),
          acrescimo = 0,
          como_solicitar = left(nullif(btrim(tr ->> 'como_solicitar'), ''), 160),
          modalidades = coalesce(array(select jsonb_array_elements_text(coalesce(tr -> 'modalidades', '[]'::jsonb))), '{}'),
          unidades = coalesce(array(select jsonb_array_elements_text(coalesce(tr -> 'unidades', '[]'::jsonb))::uuid), '{}')
         where id = v_sub;
        v_ids := v_ids || v_sub;
        perform public._org_gravar_declaracoes(null, v_sub, tr -> 'declaracoes');
      end loop;
      delete from public.substituicoes where item_id = v_item and not (id = any (v_ids));
    end if;
    v_n := v_n + 1;
  end loop;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, participacao_id, detalhe)
  values ('cadastro.editado', 'declaracoes_alimentares', p_participacao::text, v_pa.participante_id, p_participacao,
          jsonb_build_object('bloco', 'alimentar', 'itens', v_n));
end $function$;

/*
 * Uma unidade do site: a permanente (`unidades`) e o atendimento nesta edição (`participacao_unidades`).
 * Chaves da permanente: nome_unidade, logradouro, numero, complemento, bairro, cidade, uf, cep, referencia, whatsapp_publico.
 * WhatsApp preenchido = publicável (whatsapp_autorizado = true), como no cadastro da marca. Chaves do atendimento:
 * consumo_local, retirada, delivery_combo, canais_delivery, delivery_regioes, delivery_taxa, observacao_combo, faz_delivery,
 * so_delivery, mesas. O espelho `participacao_unidades.endereco/bairro` acompanha a permanente. Unidade sem a linha
 * permanente ganha uma, a partir do endereço antigo.
 */
create or replace function public.org_salvar_unidade_site(p_secret text, p_participacao uuid, p_pu uuid, p_dados jsonb)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_pa public.participacoes%rowtype; v_pu public.participacao_unidades%rowtype; v_un uuid; k text; v_antes jsonb;
  v_chaves_un text[] := array['nome_unidade','logradouro','numero','complemento','bairro','cidade','uf','cep','referencia','whatsapp_publico'];
  v_chaves_pu text[] := array['consumo_local','retirada','delivery_combo','canais_delivery','delivery_regioes','delivery_taxa','observacao_combo','faz_delivery','so_delivery','mesas'];
  v_log text; v_num text; v_bai text;
begin
  if not public.pode(p_secret, 'cadastro.editar') then raise exception 'nao_autorizado'; end if;
  p_dados := coalesce(p_dados, '{}'::jsonb);
  select * into v_pa from public.participacoes where id = p_participacao;
  if not found then raise exception 'participacao_nao_encontrada'; end if;
  select * into v_pu from public.participacao_unidades where id = p_pu and participacao_id = p_participacao for update;
  if not found then raise exception 'unidade_nao_encontrada'; end if;
  for k in select jsonb_object_keys(coalesce(p_dados, '{}'::jsonb)) loop
    if not (k = any (v_chaves_un) or k = any (v_chaves_pu)) then raise exception 'campo_invalido'; end if;
  end loop;
  v_antes := to_jsonb(v_pu) || jsonb_build_object('_un', (select to_jsonb(x) from public.unidades x where x.id = v_pu.unidade_id));

  v_un := v_pu.unidade_id;
  if v_un is null and exists (select 1 from jsonb_object_keys(p_dados) j(k) where j.k = any (v_chaves_un)) then
    insert into public.unidades (participante_id, logradouro, bairro)
    values (v_pa.participante_id, v_pu.endereco, v_pu.bairro) returning id into v_un;
    update public.participacao_unidades set unidade_id = v_un where id = p_pu;
  end if;

  if v_un is not null then
    update public.unidades set
      nome_unidade = case when p_dados ? 'nome_unidade' then nullif(btrim(p_dados ->> 'nome_unidade'), '') else nome_unidade end,
      logradouro = case when p_dados ? 'logradouro' then nullif(btrim(p_dados ->> 'logradouro'), '') else logradouro end,
      numero = case when p_dados ? 'numero' then nullif(btrim(p_dados ->> 'numero'), '') else numero end,
      complemento = case when p_dados ? 'complemento' then nullif(btrim(p_dados ->> 'complemento'), '') else complemento end,
      bairro = case when p_dados ? 'bairro' then nullif(btrim(p_dados ->> 'bairro'), '') else bairro end,
      cidade = case when p_dados ? 'cidade' then nullif(btrim(p_dados ->> 'cidade'), '') else cidade end,
      uf = case when p_dados ? 'uf' then upper(nullif(btrim(p_dados ->> 'uf'), '')) else uf end,
      cep = case when p_dados ? 'cep' then nullif(regexp_replace(coalesce(p_dados ->> 'cep', ''), '\D', '', 'g'), '') else cep end,
      referencia = case when p_dados ? 'referencia' then nullif(btrim(p_dados ->> 'referencia'), '') else referencia end,
      whatsapp_publico = case when p_dados ? 'whatsapp_publico' then nullif(regexp_replace(coalesce(p_dados ->> 'whatsapp_publico', ''), '\D', '', 'g'), '') else whatsapp_publico end,
      whatsapp_autorizado = case when p_dados ? 'whatsapp_publico'
                                 then nullif(regexp_replace(coalesce(p_dados ->> 'whatsapp_publico', ''), '\D', '', 'g'), '') is not null
                                 else whatsapp_autorizado end
     where id = v_un
    returning logradouro, numero, bairro into v_log, v_num, v_bai;
  end if;

  update public.participacao_unidades set
    consumo_local = case when p_dados ? 'consumo_local' then p_dados ->> 'consumo_local' else consumo_local end,
    retirada = case when p_dados ? 'retirada' then p_dados ->> 'retirada' else retirada end,
    delivery_combo = case when p_dados ? 'delivery_combo' then p_dados ->> 'delivery_combo' else delivery_combo end,
    canais_delivery = case when p_dados ? 'canais_delivery' then coalesce(p_dados -> 'canais_delivery', '[]'::jsonb) else canais_delivery end,
    delivery_regioes = case when p_dados ? 'delivery_regioes' then left(nullif(btrim(p_dados ->> 'delivery_regioes'), ''), 200) else delivery_regioes end,
    delivery_taxa = case when p_dados ? 'delivery_taxa' then left(nullif(btrim(p_dados ->> 'delivery_taxa'), ''), 120) else delivery_taxa end,
    observacao_combo = case when p_dados ? 'observacao_combo' then left(nullif(btrim(p_dados ->> 'observacao_combo'), ''), 200) else observacao_combo end,
    faz_delivery = case when p_dados ? 'faz_delivery' then coalesce((p_dados ->> 'faz_delivery')::boolean, false) else faz_delivery end,
    so_delivery = case when p_dados ? 'so_delivery' then coalesce((p_dados ->> 'so_delivery')::boolean, false) else so_delivery end,
    mesas = case when p_dados ? 'mesas' then nullif(p_dados ->> 'mesas', '')::int else mesas end,
    -- espelho para quem ainda lê o endereço da participação
    endereco = case when v_un is not null and (p_dados ? 'logradouro' or p_dados ? 'numero')
                    then nullif(concat_ws(', ', nullif(btrim(v_log), ''), nullif(btrim(v_num), '')), '') else endereco end,
    bairro = case when v_un is not null and p_dados ? 'bairro' then v_bai else bairro end
   where id = p_pu;

  insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, participacao_id, detalhe)
  values ('cadastro.editado', 'participacao_unidades', p_pu::text, v_pa.participante_id, p_participacao,
          jsonb_build_object('bloco', 'unidade_site', 'campos', (select jsonb_agg(j.k) from jsonb_object_keys(p_dados) j(k)),
                             'antes', v_antes));
end $function$;

-- Só quem chama pela API (anon/authenticated) alcança estas, e todas conferem `pode(secret, …)` por dentro, como as org_salvar_*.
grant execute on function public.get_alimentar_participacao(text, uuid) to anon, authenticated;
grant execute on function public.org_salvar_alimentar(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.org_salvar_unidade_site(text, uuid, uuid, jsonb) to anon, authenticated;
