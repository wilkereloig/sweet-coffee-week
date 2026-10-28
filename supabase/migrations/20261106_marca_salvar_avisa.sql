-- ─────────────────────────────────────────────────────────────────────────────
-- A marca só SALVA; o banco avisa a organização e passa o cadastro completo para a conferência
-- (pedido do Wilker, 23/10/2026).
--
-- Antes: a marca preenchia (salvamento automático) e, num passo à parte, tocava em "Enviar para análise"
-- (`marca_concluir_cadastro`). Edição de campo NÃO avisava ninguém (comentário de 20260928_painel_mensagens_
-- avisos_autoria.sql, "campo editado não notifica") — só "X concluiu o cadastro" e "X enviou uma nova logo".
-- A regra muda nos dois pontos:
--
--  R7. Toda alteração de cadastro que a MARCA grava avisa a organização no sino, para ela atualizar o sistema e o site.
--      Um aviso ABERTO por marca (`chave_grupo = 'marca:<participante>:alterou'`, para = organizacao, para todos —
--      `para_user_id` nulo; "aberto" = ninguém da organização leu: sem linha em `notificacao_leitura`):
--        · não há aviso aberto  → INSERT "<Nome da marca> alterou o cadastro", texto = a área, tipo 'cadastro',
--                                 link marcas/<id>/publicacao → UM push (o gatilho `disparar_push` é AFTER INSERT);
--        · área nova            → acrescenta " · <área>" e sobe `atualizada_em`/`n_agrupadas` (sem push novo);
--        · área que já está lá  → não faz nada (o salvamento automático grava a cada ~1 s: sem UPDATE, sem
--                                 tempestade de sinais em tempo real).
--      Áreas, lista fechada: Dados da marca · Logo · Tema · Combo e custos · Itens do combo · Alergênicos e trocas ·
--      Unidades e atendimento · Horário no festival. Coluna que só a contabilidade mexe (status, progresso,
--      carimbos, alterado_apos_aprovacao…) não entra: cada área é uma lista de colunas que a marca preenche.
--
--  R6. Quando o cadastro fica completo, ele vai SOZINHO para a conferência (decisão do Wilker: "equipe confere e
--      publica"). No mesmo gatilho, se a participação está com o combo em `rascunho` e o cadastro em
--      `aguardando_cadastro`/`em_preenchimento`, roda `marca_concluir_cadastro` — que não muda nada enquanto falta
--      dado e, completo, faz a cadeia de sempre (cadastro_completo → combo em_analise pelo gatilho
--      combo_em_analise, aviso "concluiu o cadastro", auditoria). Combo APROVADO não volta para análise: fica
--      `aprovado` com `alterado_apos_aprovacao` (marcado por filho_alterou/participacao_alterou) para a equipe
--      republicar. Ajuste pedido (`correcao_solicitada`) também não: a correção fica aberta até a equipe decidir.
--
-- Quem dispara: SÓ a marca (`meu_participante()` = dono da linha). Organização (editor da ficha, org_salvar_*,
-- "Aplicar" do /preencher), importação, pg_cron e "Ver como participante" (`ver_como_ativo()`) não avisam.
-- `pg_trigger_depth() = 1`: o que outro gatilho ou o próprio marca_concluir_cadastro grava por dentro não conta
-- de novo. Falha aqui NUNCA derruba o salvamento da marca (cada parte num bloco `exception`, como sync_gatilho).
--
-- `marca_definir_logo` perde o `notificar` próprio ("enviou uma nova logo"): a troca de logo passa pelo gatilho
-- (área "Logo") e, sem isso, a organização receberia dois avisos da mesma troca. Corpo lido do banco em 23/10/2026.
--
-- Sem `delete from`. Nenhuma linha existente muda nesta migration.
-- Teste: supabase/testes/marca-salvar-avisa.sql · Reversão: supabase/reverter/20261106_marca_salvar_avisa.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. O aviso único por marca ──────────────────────────────────────────────
create or replace function public.avisar_alteracao_marca(p_participante uuid, p_area text)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_chave text := 'marca:' || p_participante::text || ':alterou';
  v_id uuid;
  v_texto text;
begin
  if p_participante is null or coalesce(btrim(p_area), '') = '' then return; end if;
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
    if p_area = any (string_to_array(v_texto, ' · ')) then return; end if;   -- já dito: nada a gravar
    update public.notificacoes
       set texto = left(case when v_texto = '' then p_area else v_texto || ' · ' || p_area end, 240),
           atualizada_em = now(), n_agrupadas = n_agrupadas + 1
     where id = v_id;
    return;
  end if;
  insert into public.notificacoes (para, participante_id, tipo, titulo, texto, link, chave_grupo)
  values ('organizacao', p_participante, 'cadastro',
          left(coalesce((select nome_marca from public.participantes where id = p_participante), 'Uma marca') || ' alterou o cadastro', 120),
          p_area, 'marcas/' || p_participante::text || '/publicacao', v_chave);
end $function$;

-- ── 2. O gatilho: quem gravou, o que mudou, e a conferência automática ───────
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

-- ── 3. Os gatilhos, um por tabela que a marca grava ─────────────────────────
create or replace trigger marca_alterou after insert or update or delete on public.participantes
  for each row execute function public.marca_alterou();
create or replace trigger marca_alterou after insert or update or delete on public.participacoes
  for each row execute function public.marca_alterou();
create or replace trigger marca_alterou after insert or update or delete on public.participantes_itens
  for each row execute function public.marca_alterou();
create or replace trigger marca_alterou after insert or update or delete on public.unidades
  for each row execute function public.marca_alterou();
create or replace trigger marca_alterou after insert or update or delete on public.participacao_unidades
  for each row execute function public.marca_alterou();
create or replace trigger marca_alterou after insert or update or delete on public.unidade_disponibilidade
  for each row execute function public.marca_alterou();
create or replace trigger marca_alterou after insert or update or delete on public.declaracoes_alimentares
  for each row execute function public.marca_alterou();
create or replace trigger marca_alterou after insert or update or delete on public.substituicoes
  for each row execute function public.marca_alterou();

-- ── 4. A logo deixa de avisar por conta própria (o gatilho cobre, área "Logo") ─
create or replace function public.marca_definir_logo(p_dados jsonb)
 returns uuid language plpgsql security definer set search_path to 'public'
as $function$
declare v_p uuid := public.meu_participante(); v_id uuid;
begin
  if v_p is null then raise exception 'sem_marca'; end if;
  v_id := public.registrar_logo(v_p, p_dados, 'participante');
  return v_id;
end $function$;

-- ── 5. Funções internas: ninguém chama pela API ─────────────────────────────
revoke all on function public.avisar_alteracao_marca(uuid, text) from public, anon, authenticated;
revoke all on function public.marca_alterou() from public, anon, authenticated;
