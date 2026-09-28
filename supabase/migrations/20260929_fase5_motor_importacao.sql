-- =============================================================================
-- Fase 5 da evolução do painel — motor de importação (docs/EVOLUCAO-PAINEL-2026-09.md)
--
-- ARQUIVO ORIGINAL → linhas cruas (scripts/importacao/planilha_para_json.py)
--   → import_linhas (dados_originais, nunca reescrito)
--   → importacao_analisar: normaliza, classifica, abre pendências
--   → conferência humana dos números
--   → importacao_promover: grava nas tabelas finais, marcado com o lote
--   → importacao_reverter: desfaz o lote enquanto nenhuma marca tiver conta
--
-- Formato: a "planilha geral da edição" da organização (abas Participantes,
-- FOTOS AGENDAMENTO, PRESS KIT …). As colunas são achadas pelo TEXTO do
-- cabeçalho, não pela posição — a planilha da próxima edição pode reordenar.
--
-- Regras que não se negociam (instrução de 28/09/2026):
-- - nada é corrigido sozinho: o que parece errado vira PENDÊNCIA com o valor
--   original; a correção é de uma pessoa, no painel;
-- - modelo vazio não vira registro; campo vazio não vira tarefa concluída;
-- - ausência no acervo NÃO é "participante novo" (sem_correspondencia_no_acervo);
-- - alias não é prova: correspondência com o acervo nasce como sugestão;
-- - se a conferência dos números divergir, a promoção PARA.
-- =============================================================================

alter table public.sessoes_fotos
  add column if not exists responsavel_participante text,
  add column if not exists responsavel_organizacao  text,
  add column if not exists import_lote_id uuid references public.import_lotes(id) on delete set null;

-- Autoria de operação em lote: uma função interna pode declarar QUEM está
-- agindo para a transação (ex.: "Importação · <pessoa>"). O navegador não tem
-- como chamar set_config — só funções nossas o fazem, e só as internas.
create or replace function public.ator_rotulo_atual()
returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif(current_setting('scw.ator_rotulo', true), ''), public.rotulo_de_user(auth.uid()))
$$;
revoke all on function public.ator_rotulo_atual() from public, anon, authenticated;

-- ── utilidades ──────────────────────────────────────────────────────────────
-- Posição (0-based) da primeira coluna do cabeçalho que casa com o padrão.
create or replace function public.imp_col(p_cab jsonb, p_padrao text)
returns int language sql immutable as $$
  select (min(o) - 1)::int from jsonb_array_elements_text(p_cab) with ordinality as c(v, o)
   where c.v ilike p_padrao
$$;

create or replace function public.imp_cel(p_linha jsonb, p_pos int)
returns text language sql immutable as $$
  select nullif(btrim(p_linha -> 'celulas' ->> p_pos), '')
$$;

-- "13h" · "11h30" · "16h 30" · "14:00"
create or replace function public.imp_hora(p text)
returns time language plpgsql immutable as $$
declare m text[];
begin
  m := regexp_match(lower(coalesce(p, '')), '^\s*(\d{1,2})\s*[h:]\s*(\d{2})?\s*$');
  if m is null or m[1]::int > 23 or coalesce(m[2], '0')::int > 59 then return null; end if;
  return make_time(m[1]::int, coalesce(m[2], '0')::int, 0);
end $$;

-- Nome sem espaço, para comparar "Bolo mania" com "BOLOMANIA".
create or replace function public.imp_compacto(p text)
returns text language sql immutable as $$
  select replace(coalesce(public.normalizar_nome(p), ''), ' ', '')
$$;

revoke all on function public.imp_col(jsonb, text), public.imp_cel(jsonb, int), public.imp_hora(text),
  public.imp_compacto(text) from public, anon, authenticated;

-- ── 1. criar o lote (só linhas cruas) ──────────────────────────────────────
create or replace function public.importacao_criar_lote_interna(p_meta jsonb, p_abas jsonb, p_rotulo text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_lote uuid; v_aba text; v_l jsonb;
begin
  insert into public.import_lotes (fonte, arquivo_nome, arquivo_sha256, arquivo_externo, edicao_codigo,
                                   observacao, totais, importado_rotulo)
  values (p_meta ->> 'fonte', p_meta ->> 'arquivo_nome', p_meta ->> 'arquivo_sha256',
          p_meta ->> 'arquivo_externo', p_meta ->> 'edicao_codigo', p_meta ->> 'observacao',
          jsonb_build_object('aliases_informados', coalesce(p_meta -> 'aliases', '[]'::jsonb)),
          coalesce(p_rotulo, public.ator_rotulo_atual()))
  returning id into v_lote;
  for v_aba in select jsonb_object_keys(p_abas) loop
    for v_l in select * from jsonb_array_elements(p_abas -> v_aba) loop
      insert into public.import_linhas (lote_id, aba, linha, dados_originais)
      values (v_lote, v_aba, (v_l ->> 'linha')::int, jsonb_build_object('celulas', v_l -> 'celulas'));
    end loop;
  end loop;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, ator_rotulo, detalhe)
  values ('importacao.lote_criado', 'import_lotes', v_lote::text, coalesce(p_rotulo, public.ator_rotulo_atual()),
          jsonb_build_object('fonte', p_meta ->> 'fonte', 'sha256', p_meta ->> 'arquivo_sha256'));
  return v_lote;
end $$;

-- Casa um nome curto (agenda, horários) com UMA linha de Participantes do lote.
-- Regras, nesta ordem: (1) alias informado pela organização; (2) o nome curto,
-- sem espaço, é começo do nome fantasia ou da razão social. Só vale se sobrar
-- exatamente uma linha — senão é pendência.
create or replace function public.imp_casar_participante(p_lote uuid, p_nome text)
returns table (linha_id uuid, regra text, candidatos int)
language plpgsql stable security definer set search_path = public as $$
declare v_alvo text := public.imp_compacto(p_nome); v_alias text; v_regra text := 'prefixo';
begin
  select public.imp_compacto(a ->> 0) into v_alias
    from public.import_lotes l, jsonb_array_elements(l.totais -> 'aliases_informados') a
   where l.id = p_lote and public.imp_compacto(a ->> 1) = v_alvo limit 1;
  if v_alias is not null then v_alvo := v_alias; v_regra := 'alias_informado'; end if;
  if coalesce(v_alvo, '') = '' then return query select null::uuid, null::text, 0; return; end if;
  return query
    with c as (
      select il.id from public.import_linhas il
       where il.lote_id = p_lote and il.aba = 'Participantes' and il.dados_normalizados ? 'nome_fantasia'
         and (public.imp_compacto(il.dados_normalizados ->> 'nome_fantasia') like v_alvo || '%'
              or public.imp_compacto(il.dados_normalizados ->> 'razao_social') like v_alvo || '%'))
    select case when (select count(*) from c) = 1 then (select id from c) end,
           v_regra, (select count(*)::int from c);
end $$;

-- ── 2. analisar: normaliza, classifica, abre pendências ────────────────────
create or replace function public.importacao_analisar_interna(p_lote uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_ed text; v_cab jsonb; r record; n jsonb; c record;
  i_lib int; i_carimbo int; i_razao int; i_fant int; i_cnpj int; i_cont int; i_tel int; i_mail int; i_obs int;
  i_part int; i_local int; i_data int; i_hora int; i_resp int;
  i_nome int; i_insta int; i_end int; i_bairro int; i_contato int; i_voucher int; i_obs2 int;
  v_lib text; v_data date; v_hora time; v_tot int; v_casou int; v_totais jsonb := '{}'::jsonb;
  v_conf jsonb; v_tipo text; v_ed_pk text; v_rotulo_aba text;
begin
  select edicao_codigo into v_ed from public.import_lotes where id = p_lote for update;
  if not found then raise exception 'lote_nao_encontrado'; end if;
  if (select status from public.import_lotes where id = p_lote) not in ('staging','validado') then
    raise exception 'lote_nao_analisavel';
  end if;

  delete from public.revisao_pendencias where lote_id = p_lote and status = 'aberta';
  update public.import_linhas set dados_normalizados = null, classificacao = 'revisar', status = 'pendente'
   where lote_id = p_lote;

  -- 2a. Participantes -------------------------------------------------------
  select dados_originais -> 'celulas' into v_cab from public.import_linhas
   where lote_id = p_lote and aba = 'Participantes' order by linha limit 1;
  if v_cab is not null then
    i_lib := public.imp_col(v_cab, 'LIBERADO FOTO%');   i_carimbo := public.imp_col(v_cab, 'Carimbo%');
    i_razao := public.imp_col(v_cab, '%RAZAO SOCIAL%'); i_fant := public.imp_col(v_cab, 'NOME FANTASIA%');
    i_cnpj := public.imp_col(v_cab, 'CNPJ%');           i_cont := public.imp_col(v_cab, 'Nome da pessoa%');
    i_tel := public.imp_col(v_cab, 'Telefone%');        i_mail := public.imp_col(v_cab, 'E-mail%');
    i_obs := public.imp_col(v_cab, 'Observa%');

    for r in select * from public.import_linhas where lote_id = p_lote and aba = 'Participantes' order by linha loop
      if r.linha = (select min(linha) from public.import_linhas where lote_id = p_lote and aba = 'Participantes') then
        update public.import_linhas set classificacao = 'modelo_vazio', status = 'ignorado',
               dados_normalizados = '{"cabecalho": true}' where id = r.id;
        continue;
      end if;
      v_lib := lower(public.imp_cel(r.dados_originais, i_lib));
      n := jsonb_build_object(
        'liberado_foto', case when v_lib in ('sim','s') then true when v_lib in ('não','nao','n') then false end,
        'liberado_foto_original', public.imp_cel(r.dados_originais, i_lib),
        -- O carimbo do Google Forms é hora de Natal (UTC−3): mesmos dígitos, fuso
        -- explícito. Chega como "DD/MM/AAAA HH:MM:SS" (texto) ou ISO (célula de data).
        'inscrito_em', (select case
                          when x.c ~ '^\d{2}/\d{2}/\d{4} \d{2}:\d{2}:\d{2}$'
                            then to_char(to_timestamp(x.c, 'DD/MM/YYYY HH24:MI:SS'), 'YYYY-MM-DD"T"HH24:MI:SS') || '-03:00'
                          when x.c ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$'
                            then x.c || case when length(x.c) = 16 then ':00' else '' end || '-03:00' end
                          from (select public.imp_cel(r.dados_originais, i_carimbo) as c) x),
        'razao_social', public.imp_cel(r.dados_originais, i_razao),
        'nome_fantasia', public.imp_cel(r.dados_originais, i_fant),
        'cnpj', public.imp_cel(r.dados_originais, i_cnpj),
        'cnpj_normalizado', public.normalizar_cnpj(public.imp_cel(r.dados_originais, i_cnpj)),
        'cnpj_valido', public.cnpj_valido(public.imp_cel(r.dados_originais, i_cnpj)),
        'contato', public.imp_cel(r.dados_originais, i_cont),
        'telefone', public.imp_cel(r.dados_originais, i_tel),
        'telefone_normalizado', public.normalizar_telefone(public.imp_cel(r.dados_originais, i_tel)),
        'email', lower(public.imp_cel(r.dados_originais, i_mail)),
        'observacao', public.imp_cel(r.dados_originais, i_obs));
      update public.import_linhas set dados_normalizados = n, classificacao = 'atual_confirmado' where id = r.id;

      if n ->> 'nome_fantasia' is null and n ->> 'razao_social' is null then
        insert into public.revisao_pendencias (tipo, severidade, titulo, lote_id, linha_id)
        values ('dado_ausente', 'bloqueio', 'Linha sem nome fantasia nem razão social', p_lote, r.id);
      end if;
      if (n ->> 'liberado_foto') is null then
        insert into public.revisao_pendencias (tipo, severidade, titulo, campo, valor_original, lote_id, linha_id)
        values ('dado_ausente', 'aviso', 'Liberação para foto sem Sim/Não', 'foto_liberacao',
                n ->> 'liberado_foto_original', p_lote, r.id);
      end if;
      if not (n ->> 'cnpj_valido')::boolean then
        insert into public.revisao_pendencias (tipo, severidade, titulo, descricao, campo, valor_original, lote_id, linha_id)
        values ('dado_inconsistente', 'aviso', 'CNPJ não confere',
                'Dígitos verificadores inválidos ou quantidade de dígitos diferente de 14. Importado como veio.',
                'cnpj', n ->> 'cnpj', p_lote, r.id);
      end if;
      if n ->> 'telefone_normalizado' is null then
        insert into public.revisao_pendencias (tipo, severidade, titulo, campo, valor_original, lote_id, linha_id)
        values ('dado_inconsistente', 'aviso', 'Telefone fora do padrão', 'telefone', n ->> 'telefone', p_lote, r.id);
      end if;
      if coalesce(n ->> 'email', '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
        insert into public.revisao_pendencias (tipo, severidade, titulo, campo, valor_original, lote_id, linha_id)
        values ('dado_inconsistente', 'aviso', 'E-mail fora do padrão', 'email', n ->> 'email', p_lote, r.id);
      end if;
      if public.normalizar_nome(n ->> 'nome_fantasia') = public.normalizar_nome(n ->> 'contato') then
        insert into public.revisao_pendencias (tipo, severidade, titulo, descricao, campo, valor_original, sugestao, lote_id, linha_id)
        values ('dado_inconsistente', 'aviso', 'Nome fantasia igual ao nome da pessoa de contato',
                'O campo "nome fantasia" parece conter o nome de uma pessoa. Importado como veio — confirmar o nome da marca.',
                'nome_marca', n ->> 'nome_fantasia',
                jsonb_build_object('campo', 'nome_marca', 'razao_social', n ->> 'razao_social'), p_lote, r.id);
      end if;
      if (n ->> 'razao_social') ~* 'ltda[a-z]' then
        insert into public.revisao_pendencias (tipo, severidade, titulo, descricao, campo, valor_original, lote_id, linha_id)
        values ('dado_inconsistente', 'aviso', 'Razão social com possível texto colado',
                'Há letras grudadas depois de "LTDA". Importado como veio — conferir com o cartão CNPJ.',
                'razao_social', n ->> 'razao_social', p_lote, r.id);
      end if;
      if (n ->> 'observacao') ilike '%confirmar%' then
        insert into public.revisao_pendencias (tipo, severidade, titulo, campo, valor_original, lote_id, linha_id)
        values ('outro', 'aviso', 'Observação pede confirmação', 'observacao', n ->> 'observacao', p_lote, r.id);
      end if;
    end loop;

    -- CNPJ repetido no próprio lote, ou já existente no banco
    insert into public.revisao_pendencias (tipo, severidade, titulo, campo, valor_original, lote_id, linha_id)
    select 'possivel_duplicidade', 'bloqueio', 'CNPJ repetido na planilha', 'cnpj', a.dados_normalizados ->> 'cnpj', p_lote, a.id
      from public.import_linhas a
     where a.lote_id = p_lote and a.aba = 'Participantes' and a.dados_normalizados ->> 'cnpj_normalizado' is not null
       and exists (select 1 from public.import_linhas b where b.lote_id = p_lote and b.aba = 'Participantes'
                    and b.id <> a.id and b.dados_normalizados ->> 'cnpj_normalizado' = a.dados_normalizados ->> 'cnpj_normalizado');
  end if;

  -- 2b. FOTOS AGENDAMENTO ---------------------------------------------------
  select dados_originais -> 'celulas' into v_cab from public.import_linhas
   where lote_id = p_lote and aba = 'FOTOS AGENDAMENTO' order by linha limit 1;
  if v_cab is not null then
    i_part := public.imp_col(v_cab, 'Participante%'); i_local := public.imp_col(v_cab, 'Local%');
    i_data := public.imp_col(v_cab, 'Data%');         i_hora := public.imp_col(v_cab, 'Hora%');
    i_resp := public.imp_col(v_cab, 'Respons%');      i_obs := public.imp_col(v_cab, 'Observa%');
    for r in select * from public.import_linhas where lote_id = p_lote and aba = 'FOTOS AGENDAMENTO' order by linha loop
      if r.linha = (select min(linha) from public.import_linhas where lote_id = p_lote and aba = 'FOTOS AGENDAMENTO') then
        update public.import_linhas set classificacao = 'modelo_vazio', status = 'ignorado',
               dados_normalizados = '{"cabecalho": true}' where id = r.id;
        continue;
      end if;
      v_data := case when public.imp_cel(r.dados_originais, i_data) ~ '^\d{4}-\d{2}-\d{2}$'
                     then public.imp_cel(r.dados_originais, i_data)::date end;
      v_hora := public.imp_hora(public.imp_cel(r.dados_originais, i_hora));
      select * into c from public.imp_casar_participante(p_lote, public.imp_cel(r.dados_originais, i_part));
      n := jsonb_build_object('participante', public.imp_cel(r.dados_originais, i_part),
        'participante_linha_id', c.linha_id, 'regra', c.regra, 'candidatos', c.candidatos,
        'local', public.imp_cel(r.dados_originais, i_local), 'data', v_data, 'hora', v_hora,
        'responsavel', public.imp_cel(r.dados_originais, i_resp), 'observacao', public.imp_cel(r.dados_originais, i_obs));
      update public.import_linhas set dados_normalizados = n, classificacao = 'atual_confirmado' where id = r.id;
      if c.linha_id is null then
        insert into public.revisao_pendencias (tipo, severidade, titulo, descricao, campo, valor_original, lote_id, linha_id)
        values ('possivel_correspondencia', 'bloqueio',
                case when c.candidatos > 1 then 'Agendamento com mais de um participante possível'
                     else 'Agendamento sem participante correspondente' end,
                'A sessão não será criada até alguém dizer de quem é.', 'participante',
                public.imp_cel(r.dados_originais, i_part), p_lote, r.id);
      end if;
      if v_data is null or v_hora is null then
        insert into public.revisao_pendencias (tipo, severidade, titulo, campo, valor_original, lote_id, linha_id)
        values ('dado_inconsistente', 'bloqueio', 'Data ou hora da sessão ilegível', 'data_hora',
                coalesce(public.imp_cel(r.dados_originais, i_data), '') || ' ' || coalesce(public.imp_cel(r.dados_originais, i_hora), ''),
                p_lote, r.id);
      elsif not exists (select 1 from public.edicao_cronograma k
                         where k.edicao_codigo = v_ed and k.chave = 'fotos' and v_data between k.inicio and k.fim) then
        insert into public.revisao_pendencias (tipo, severidade, titulo, campo, valor_original, lote_id, linha_id)
        values ('dado_inconsistente', 'aviso', 'Sessão fora dos períodos de fotos do cronograma', 'data',
                v_data::text, p_lote, r.id);
      end if;
      if c.linha_id is not null and exists (select 1 from public.import_linhas p where p.id = c.linha_id
                                             and (p.dados_normalizados ->> 'liberado_foto')::boolean is false) then
        insert into public.revisao_pendencias (tipo, severidade, titulo, lote_id, linha_id)
        values ('dado_inconsistente', 'aviso', 'Sessão agendada para participante não liberado para foto', p_lote, r.id);
      end if;
    end loop;
  end if;

  -- 2c. Press Kit (histórico e atual) -------------------------------------
  for v_rotulo_aba in select distinct aba from public.import_linhas where lote_id = p_lote and aba ilike 'PRESS KIT%' loop
    select dados_originais -> 'celulas' into v_cab from public.import_linhas
     where lote_id = p_lote and aba = v_rotulo_aba order by linha limit 1;
    i_nome := coalesce(public.imp_col(v_cab, 'CONVIDADO%'), public.imp_col(v_cab, 'INFLUENCER%'));
    i_insta := public.imp_col(v_cab, 'INSTAGRAM%'); i_end := public.imp_col(v_cab, 'ENDERE%');
    i_bairro := public.imp_col(v_cab, 'BAIRRO%');   i_contato := public.imp_col(v_cab, 'CONTATO%');
    i_voucher := public.imp_col(v_cab, 'VOUCHER%'); i_obs2 := public.imp_col(v_cab, 'OBS%');
    v_tipo := case when public.imp_col(v_cab, 'INFLUENCER%') is not null then 'influenciador' else 'convidado' end;
    -- Edição da lista: só quando o rótulo da aba a identifica sem ambiguidade.
    v_ed_pk := case when v_rotulo_aba ~* '2024' then '2024'
                    when v_rotulo_aba ~* 'JUN\s*26' then '2026.1'
                    when v_rotulo_aba ~* 'NOV\s*26' then '2026.2' end;
    for r in select * from public.import_linhas where lote_id = p_lote and aba = v_rotulo_aba order by linha loop
      if r.linha = (select min(linha) from public.import_linhas where lote_id = p_lote and aba = v_rotulo_aba) then
        update public.import_linhas set classificacao = 'modelo_vazio', status = 'ignorado',
               dados_normalizados = '{"cabecalho": true}' where id = r.id;
        continue;
      end if;
      n := jsonb_build_object('nome', public.imp_cel(r.dados_originais, i_nome),
        'instagram_original', public.imp_cel(r.dados_originais, i_insta),
        'instagram', case when public.imp_cel(r.dados_originais, i_insta) ~ '^@?[A-Za-z0-9._]+$'
                          then public.imp_cel(r.dados_originais, i_insta) end,
        'endereco', case when public.imp_cel(r.dados_originais, i_end) !~* 'falta responder'
                         then public.imp_cel(r.dados_originais, i_end) end,
        'bairro', public.imp_cel(r.dados_originais, i_bairro),
        'telefone', public.imp_cel(r.dados_originais, i_contato),
        'voucher', public.imp_cel(r.dados_originais, i_voucher),
        'observacao', public.imp_cel(r.dados_originais, i_obs2),
        'tipo', v_tipo, 'edicao_codigo', v_ed_pk, 'edicao_texto', v_rotulo_aba);
      n := n || jsonb_build_object('instagram_norm',
             nullif(lower(regexp_replace(coalesce(n ->> 'instagram', ''), '[^A-Za-z0-9._]', '', 'g')), ''));
      -- Linha só com o nome (ex.: "Indicacao Suzi") não é um contato: fica em
      -- revisão e não é importada.
      if n ->> 'instagram_original' is null and public.imp_cel(r.dados_originais, i_end) is null
         and n ->> 'bairro' is null and n ->> 'telefone' is null and n ->> 'voucher' is null
         and n ->> 'observacao' is null then
        update public.import_linhas set dados_normalizados = n, classificacao = 'revisar' where id = r.id;
        insert into public.revisao_pendencias (tipo, severidade, titulo, descricao, valor_original, lote_id, linha_id)
        values ('dado_ausente', 'aviso', 'Linha só com nome — não importada',
                'Sem Instagram, endereço nem contato. Completar na planilha ou cadastrar à mão.',
                n ->> 'nome', p_lote, r.id);
        continue;
      end if;
      update public.import_linhas set dados_normalizados = n,
             classificacao = case when v_ed_pk = v_ed then 'atual_confirmado' else 'historico_confirmado' end
       where id = r.id;
      if n ->> 'nome' is null then
        insert into public.revisao_pendencias (tipo, severidade, titulo, lote_id, linha_id)
        values ('dado_ausente', 'bloqueio', 'Contato sem nome', p_lote, r.id);
      end if;
      if n ->> 'instagram_original' is not null and n ->> 'instagram' is null then
        insert into public.revisao_pendencias (tipo, severidade, titulo, descricao, campo, valor_original, lote_id, linha_id)
        values ('dado_inconsistente', 'aviso', 'Instagram fora do padrão',
                'O valor não parece um @perfil. Guardado nas observações do contato.', 'instagram',
                n ->> 'instagram_original', p_lote, r.id);
      end if;
      if n ->> 'endereco' is null then
        insert into public.revisao_pendencias (tipo, severidade, titulo, campo, valor_original, lote_id, linha_id)
        values ('dado_ausente', 'aviso', 'Contato sem endereço', 'endereco',
                public.imp_cel(r.dados_originais, i_end), p_lote, r.id);
      end if;
    end loop;
  end loop;

  -- Mesmo @ com pontuação diferente (@indo.comer × @indocomer): duplicidade
  -- POSSÍVEL, nunca unida sozinha. Mesmo @ exato é a mesma pessoa.
  insert into public.revisao_pendencias (tipo, severidade, titulo, descricao, valor_original, lote_id, linha_id)
  select distinct on (a.id) 'possivel_duplicidade', 'aviso', 'Contato possivelmente duplicado',
         'Instagram parecido com o de outra linha: ' || (b.dados_normalizados ->> 'instagram_original')
           || ' (' || b.aba || ').', a.dados_normalizados ->> 'instagram_original', p_lote, a.id
    from public.import_linhas a join public.import_linhas b
      on b.lote_id = a.lote_id and b.id <> a.id and b.aba ilike 'PRESS KIT%'
     and replace(replace(a.dados_normalizados ->> 'instagram_norm', '.', ''), '_', '')
       = replace(replace(b.dados_normalizados ->> 'instagram_norm', '.', ''), '_', '')
     and a.dados_normalizados ->> 'instagram_norm' <> b.dados_normalizados ->> 'instagram_norm'
   where a.lote_id = p_lote and a.aba ilike 'PRESS KIT%' and a.dados_normalizados ->> 'instagram_norm' is not null;

  -- Mesmo nome com @ diferente (ou sem @): também só sugestão.
  insert into public.revisao_pendencias (tipo, severidade, titulo, descricao, valor_original, lote_id, linha_id)
  select distinct on (a.id) 'possivel_duplicidade', 'aviso', 'Contato possivelmente duplicado',
         'Mesmo nome em outra linha (' || b.aba || ', linha ' || b.linha || ') com Instagram diferente.',
         a.dados_normalizados ->> 'nome', p_lote, a.id
    from public.import_linhas a join public.import_linhas b
      on b.lote_id = a.lote_id and b.id <> a.id and b.aba ilike 'PRESS KIT%'
     and public.normalizar_nome(a.dados_normalizados ->> 'nome') = public.normalizar_nome(b.dados_normalizados ->> 'nome')
     and (a.dados_normalizados ->> 'instagram_norm') is distinct from (b.dados_normalizados ->> 'instagram_norm')
   where a.lote_id = p_lote and a.aba ilike 'PRESS KIT%' and a.dados_normalizados ->> 'nome' is not null
     and not exists (select 1 from public.revisao_pendencias x where x.linha_id = a.id and x.tipo = 'possivel_duplicidade');

  -- 2d. Abas-modelo (sem dado) e abas de outra edição -----------------------
  -- Aba de edição (COMBOS, TEMA, VENDAS, HORÁRIOS, MATERIAIS …): cada linha que
  -- sobrou sem classificação. Se os nomes não casam com os participantes do
  -- lote, a aba é de OUTRA edição (herança de planilha copiada) → histórico
  -- incerto, não importado.
  for v_rotulo_aba in select distinct aba from public.import_linhas
                       where lote_id = p_lote and classificacao = 'revisar' loop
    -- Linha de dado = não é a primeira da aba, não é só zeros de fórmula e não
    -- é um cabeçalho repetido ("PARTICIPANTE(S)" na primeira célula).
    select count(*), count(*) filter (where (select linha_id from public.imp_casar_participante(
                                              p_lote, il.dados_originais -> 'celulas' ->> 0)) is not null)
      into v_tot, v_casou
      from public.import_linhas il
     where il.lote_id = p_lote and il.aba = v_rotulo_aba and il.classificacao = 'revisar'
       and il.linha > (select min(linha) from public.import_linhas where lote_id = p_lote and aba = v_rotulo_aba)
       and exists (select 1 from jsonb_array_elements_text(il.dados_originais -> 'celulas') x
                    where x is not null and x <> '0')
       and coalesce(il.dados_originais -> 'celulas' ->> 0, '') !~* '^\s*participantes?\s*$';
    if v_tot = 0 then
      update public.import_linhas set classificacao = 'modelo_vazio', status = 'ignorado'
       where lote_id = p_lote and aba = v_rotulo_aba and classificacao = 'revisar';
    elsif v_casou * 2 < v_tot then
      update public.import_linhas set classificacao = 'historico_incerto', status = 'ignorado'
       where lote_id = p_lote and aba = v_rotulo_aba and classificacao = 'revisar';
      insert into public.revisao_pendencias (tipo, severidade, titulo, descricao, lote_id)
      values ('outro', 'aviso', 'Aba "' || v_rotulo_aba || '" parece ser de outra edição',
              'Só ' || v_casou || ' de ' || v_tot || ' linhas citam participantes desta planilha. '
              || 'Guardada como histórico incerto; nada foi importado dela.', p_lote);
    else
      insert into public.revisao_pendencias (tipo, severidade, titulo, descricao, lote_id)
      values ('outro', 'aviso', 'Aba "' || v_rotulo_aba || '" não tem importação automática',
              v_tot || ' linhas guardadas no lote, sem gravar em tabela final.', p_lote);
    end if;
  end loop;

  -- 3. Totais e a conferência -----------------------------------------------
  select jsonb_object_agg(aba, jsonb_build_object('linhas', total, 'validas', validas, 'ignoradas', ignoradas))
    into v_totais
    from (select aba, count(*) total,
                 count(*) filter (where classificacao in ('atual_confirmado','historico_confirmado')) validas,
                 count(*) filter (where status = 'ignorado') ignoradas
            from public.import_linhas where lote_id = p_lote group by aba) t;

  v_conf := jsonb_build_object(
    'participantes', (select count(*) from public.import_linhas where lote_id = p_lote and aba = 'Participantes'
                        and classificacao = 'atual_confirmado'),
    'liberados_foto', (select count(*) from public.import_linhas where lote_id = p_lote and aba = 'Participantes'
                        and (dados_normalizados ->> 'liberado_foto')::boolean),
    'nao_liberados_foto', (select count(*) from public.import_linhas where lote_id = p_lote and aba = 'Participantes'
                        and (dados_normalizados ->> 'liberado_foto')::boolean is false),
    'agendamentos', (select count(*) from public.import_linhas where lote_id = p_lote and aba = 'FOTOS AGENDAMENTO'
                        and classificacao = 'atual_confirmado'),
    'agendamentos_casados', (select count(*) from public.import_linhas where lote_id = p_lote and aba = 'FOTOS AGENDAMENTO'
                        and dados_normalizados ->> 'participante_linha_id' is not null),
    'liberados_sem_agendamento', (
      select coalesce(jsonb_agg(p.dados_normalizados ->> 'nome_fantasia' order by p.linha), '[]'::jsonb)
        from public.import_linhas p
       where p.lote_id = p_lote and p.aba = 'Participantes' and (p.dados_normalizados ->> 'liberado_foto')::boolean
         and not exists (select 1 from public.import_linhas f where f.lote_id = p_lote and f.aba = 'FOTOS AGENDAMENTO'
                          and f.dados_normalizados ->> 'participante_linha_id' = p.id::text)),
    'nao_liberados', (
      select coalesce(jsonb_agg(p.dados_normalizados ->> 'nome_fantasia' order by p.linha), '[]'::jsonb)
        from public.import_linhas p
       where p.lote_id = p_lote and p.aba = 'Participantes' and (p.dados_normalizados ->> 'liberado_foto')::boolean is false),
    'temas', (select count(*) from public.import_linhas where lote_id = p_lote and aba = 'TEMA' and classificacao not in ('modelo_vazio')),
    'combos', (select count(*) from public.import_linhas where lote_id = p_lote and aba = 'COMBOS' and classificacao not in ('modelo_vazio')),
    'vendas', (select count(*) from public.import_linhas where lote_id = p_lote and aba = 'VENDAS COMBOS' and classificacao not in ('modelo_vazio')),
    'contatos_press_kit', (select count(*) from public.import_linhas where lote_id = p_lote and aba ilike 'PRESS KIT%'
                        and classificacao in ('atual_confirmado','historico_confirmado')),
    'linhas_press_kit', (select coalesce(jsonb_object_agg(aba, qtd), '{}'::jsonb) from (
                          select il.aba, count(*) filter (where il.dados_normalizados ->> 'cabecalho' is null) qtd
                            from public.import_linhas il where il.lote_id = p_lote and il.aba ilike 'PRESS KIT%'
                           group by il.aba) t),
    'pendencias_bloqueio', (select count(*) from public.revisao_pendencias where lote_id = p_lote and status = 'aberta' and severidade = 'bloqueio'),
    'pendencias_aviso', (select count(*) from public.revisao_pendencias where lote_id = p_lote and status = 'aberta' and severidade = 'aviso'));

  update public.import_lotes
     set totais = (totais - 'abas' - 'conferencia') || jsonb_build_object('abas', v_totais, 'conferencia', v_conf),
         status = case when (v_conf ->> 'pendencias_bloqueio')::int = 0 then 'validado' else 'staging' end
   where id = p_lote;
  return v_conf;
end $$;

-- ── 3. promover (só com a conferência batendo) ─────────────────────────────
create or replace function public.importacao_promover_interna(p_lote uuid, p_conferencia jsonb, p_rotulo text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_lote public.import_lotes%rowtype; v_conf jsonb; k text; r record; n jsonb;
  v_part uuid; v_pa uuid; v_contato uuid; v_cands text; v_qtd jsonb;
  v_np int := 0; v_ns int := 0; v_nc int := 0; v_ne int := 0; v_nv int := 0;
begin
  select * into v_lote from public.import_lotes where id = p_lote for update;
  if not found then raise exception 'lote_nao_encontrado'; end if;
  if v_lote.status <> 'validado' then raise exception 'lote_nao_validado: %', v_lote.status; end if;
  v_conf := v_lote.totais -> 'conferencia';
  -- PARE se qualquer número informado pela pessoa divergir do que o lote contou.
  for k in select jsonb_object_keys(p_conferencia) loop
    if (v_conf -> k) is distinct from (p_conferencia -> k) then
      raise exception 'conferencia_divergente: % esperado % obtido %', k, p_conferencia -> k, v_conf -> k;
    end if;
  end loop;

  perform set_config('scw.silencioso', 'on', true);
  perform set_config('scw.importando', 'on', true);
  perform set_config('scw.ator_rotulo', coalesce(p_rotulo, public.ator_rotulo_atual()), true);

  -- Participantes → estabelecimento + participação na edição
  for r in select * from public.import_linhas where lote_id = p_lote and aba = 'Participantes'
                      and classificacao = 'atual_confirmado' and status = 'pendente' order by linha loop
    n := r.dados_normalizados;
    select id into v_part from public.participantes
     where cnpj_normalizado is not null and cnpj_normalizado = n ->> 'cnpj_normalizado';
    if v_part is null then
      insert into public.participantes (nome_marca, razao_social, cnpj, responsavel, telefone, email,
                                        status_cadastro, import_lote_id, dados_originais)
      values (coalesce(n ->> 'nome_fantasia', n ->> 'razao_social'), n ->> 'razao_social', n ->> 'cnpj',
              n ->> 'contato', n ->> 'telefone', n ->> 'email', 'aguardando_cadastro', p_lote, r.dados_originais)
      returning id into v_part;
      v_np := v_np + 1;
    end if;
    v_pa := public.abrir_participacao_interna(v_part, v_lote.edicao_codigo);
    update public.participacoes set
      classificacao = 'atual_confirmado', import_lote_id = p_lote,
      foto_liberacao = case when (n ->> 'liberado_foto')::boolean then 'liberado'
                            when (n ->> 'liberado_foto')::boolean is false then 'nao_liberado' else 'pendente' end,
      foto_liberacao_motivo = case when n ->> 'liberado_foto_original' is not null
                                   then 'Planilha da organização: LIBERADO FOTO = ' || (n ->> 'liberado_foto_original') end,
      snapshot = jsonb_build_object('nome_marca', coalesce(n ->> 'nome_fantasia', n ->> 'razao_social'),
                   'razao_social', n ->> 'razao_social', 'cnpj', n ->> 'cnpj', 'responsavel', n ->> 'contato',
                   'inscrito_em', n ->> 'inscrito_em', 'fonte', v_lote.fonte)
     where id = v_pa;
    update public.import_linhas set status = 'importado', destino_tabela = 'participacoes', destino_id = v_pa where id = r.id;
    update public.revisao_pendencias set participante_id = v_part, participacao_id = v_pa where linha_id = r.id;

    -- Aliases que a própria organização informou para esta marca
    insert into public.participante_aliases (participante_id, alias, fonte)
    select v_part, x.alias, 'Organização (instrução de 28/09/2026)'
      from jsonb_array_elements(v_lote.totais -> 'aliases_informados') a,
           lateral (values (a ->> 0), (a ->> 1)) as x(alias)
     where public.imp_compacto(a ->> 0) in (public.imp_compacto(n ->> 'nome_fantasia'), public.imp_compacto(n ->> 'razao_social'))
        or public.imp_compacto(a ->> 1) in (public.imp_compacto(n ->> 'nome_fantasia'), public.imp_compacto(n ->> 'razao_social'))
    on conflict do nothing;

    -- Sugestões de correspondência com o acervo (NUNCA confirmadas aqui)
    insert into public.participante_vinculos (participante_id, chave, status, origem, motivo)
    select distinct v_part, h.chave, 'possivel', 'importacao',
           'Nome parecido: "' || nomes.nome || '" × "' || h.alias || '"'
      from (select n ->> 'nome_fantasia' as nome union select n ->> 'razao_social'
            union select alias from public.participante_aliases where participante_id = v_part) nomes,
           public.historico_aliases h
     where length(public.imp_compacto(nomes.nome)) >= 4
       and (public.imp_compacto(h.alias) = public.imp_compacto(nomes.nome)
            or (length(public.imp_compacto(h.alias)) >= 5
                and (public.imp_compacto(nomes.nome) like public.imp_compacto(h.alias) || '%'
                     or public.imp_compacto(h.alias) like public.imp_compacto(nomes.nome) || '%')))
    on conflict do nothing;

    select string_agg(distinct m.nome, ', ') into v_cands
      from public.participante_vinculos v join public.historico_marcas m on m.chave = v.chave
     where v.participante_id = v_part and v.status = 'possivel';
    update public.participantes set historico_status = case
        when exists (select 1 from public.participante_vinculos where participante_id = v_part and status = 'confirmado')
          then 'recorrente_confirmado'
        when v_cands is not null then 'possivel_correspondencia'
        else 'sem_correspondencia_no_acervo' end
     where id = v_part;
    if v_cands is not null then
      insert into public.revisao_pendencias (tipo, severidade, titulo, descricao, participante_id, participacao_id, lote_id, linha_id)
      values ('possivel_correspondencia', 'aviso', 'Possível participação em edições anteriores',
              'Nomes parecidos no acervo: ' || v_cands || '. Confirmar ou descartar no painel.',
              v_part, v_pa, p_lote, r.id);
    end if;
  end loop;

  -- Sessões de fotos agendadas
  for r in select * from public.import_linhas where lote_id = p_lote and aba = 'FOTOS AGENDAMENTO'
                      and classificacao = 'atual_confirmado' and status = 'pendente'
                      and dados_normalizados ->> 'participante_linha_id' is not null
                      and dados_normalizados ->> 'data' is not null and dados_normalizados ->> 'hora' is not null loop
    n := r.dados_normalizados;
    select destino_id into v_pa from public.import_linhas where id = (n ->> 'participante_linha_id')::uuid;
    if v_pa is null then continue; end if;
    insert into public.sessoes_fotos (participante_id, participacao_id, edicao_codigo, data_hora, local, status,
                                      responsavel_participante, observacoes, import_lote_id)
    select pa.participante_id, pa.id, pa.edicao_codigo,
           ((n ->> 'data') || ' ' || (n ->> 'hora'))::timestamp at time zone 'America/Fortaleza',
           n ->> 'local', 'agendada', n ->> 'responsavel', n ->> 'observacao', p_lote
      from public.participacoes pa where pa.id = v_pa
    returning id into v_part;
    update public.import_linhas set status = 'importado', destino_tabela = 'sessoes_fotos', destino_id = v_part where id = r.id;
    update public.revisao_pendencias rp set participacao_id = v_pa,
           participante_id = (select participante_id from public.participacoes where id = v_pa)
     where rp.linha_id = r.id;
    v_ns := v_ns + 1;
  end loop;

  -- Contatos de relacionamento + quem esteve em cada lista de Press Kit
  for r in select * from public.import_linhas where lote_id = p_lote and aba ilike 'PRESS KIT%'
                      and classificacao in ('atual_confirmado','historico_confirmado') and status = 'pendente'
                      and dados_normalizados ->> 'nome' is not null
                    order by dados_normalizados ->> 'edicao_codigo' desc nulls last, linha loop
    n := r.dados_normalizados;
    v_contato := null;
    if n ->> 'instagram_norm' is not null then
      select id into v_contato from public.contatos_relacionamento where instagram_norm = n ->> 'instagram_norm';
    end if;
    if v_contato is null then
      insert into public.contatos_relacionamento (nome, instagram, telefone, endereco, bairro, observacoes, tipo,
                                                  fonte, import_lote_id, dados_originais)
      values (n ->> 'nome', n ->> 'instagram', n ->> 'telefone', n ->> 'endereco', n ->> 'bairro',
              case when n ->> 'instagram' is null and n ->> 'instagram_original' is not null
                   then 'Instagram na planilha: ' || (n ->> 'instagram_original') end,
              n ->> 'tipo', v_lote.fonte || ' · ' || r.aba, p_lote, r.dados_originais)
      returning id into v_contato;
      v_nc := v_nc + 1;
    else
      -- Mesma pessoa numa lista MAIS ANTIGA (a ordem é da mais recente para a
      -- mais antiga): completa só o que estava vazio. O endereço daquela época
      -- fica no próprio envio (endereco_confirmado).
      update public.contatos_relacionamento set
        telefone = coalesce(telefone, n ->> 'telefone'),
        endereco = coalesce(endereco, n ->> 'endereco'),
        bairro   = coalesce(bairro, n ->> 'bairro')
       where id = v_contato;
    end if;
    insert into public.presskit_envios (contato_id, edicao_codigo, edicao_texto, status, voucher, itens,
                                        observacao, fonte, import_lote_id, responsavel, responsavel_rotulo,
                                        endereco_confirmado)
    values (v_contato, n ->> 'edicao_codigo', n ->> 'edicao_texto',
            case when n ->> 'edicao_codigo' = v_lote.edicao_codigo then 'selecionado' else 'constou_na_lista' end,
            n ->> 'voucher', case when r.aba ~* 'JUN' then n ->> 'observacao' end,
            case when r.aba !~* 'JUN' then n ->> 'observacao' end,
            v_lote.fonte || ' · ' || r.aba, p_lote, null, coalesce(p_rotulo, public.ator_rotulo_atual()),
            n ->> 'endereco')
    on conflict do nothing;
    v_ne := v_ne + 1;
    update public.import_linhas set status = 'importado', destino_tabela = 'contatos_relacionamento', destino_id = v_contato
     where id = r.id;
    update public.revisao_pendencias set contato_id = v_contato where linha_id = r.id;
  end loop;

  v_qtd := jsonb_build_object('participantes_criados', v_np, 'sessoes_criadas', v_ns,
                              'contatos_criados', v_nc, 'presenca_em_listas', v_ne);
  update public.import_lotes set status = 'promovido', totais = totais || jsonb_build_object('promovido', v_qtd)
   where id = p_lote;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, ator_rotulo, detalhe)
  values ('importacao.promovida', 'import_lotes', p_lote::text, coalesce(p_rotulo, public.ator_rotulo_atual()), v_qtd);
  return v_qtd;
end $$;

-- ── 4. reverter (enquanto ninguém começou a usar) ──────────────────────────
create or replace function public.importacao_reverter_interna(p_lote uuid, p_rotulo text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if exists (select 1 from public.participantes where import_lote_id = p_lote and user_id is not null) then
    raise exception 'lote_em_uso: ja ha marca com conta criada a partir deste lote';
  end if;
  perform set_config('scw.silencioso', 'on', true);
  v := jsonb_build_object(
    'sessoes', (select count(*) from public.sessoes_fotos where import_lote_id = p_lote),
    'participantes', (select count(*) from public.participantes where import_lote_id = p_lote),
    'contatos', (select count(*) from public.contatos_relacionamento where import_lote_id = p_lote));
  delete from public.sessoes_fotos where import_lote_id = p_lote;
  delete from public.presskit_envios where import_lote_id = p_lote;
  delete from public.contatos_relacionamento c where c.import_lote_id = p_lote
     and not exists (select 1 from public.presskit_envios e where e.contato_id = c.id);
  delete from public.participantes where import_lote_id = p_lote and user_id is null;
  update public.import_linhas set status = 'pendente', destino_tabela = null, destino_id = null where lote_id = p_lote;
  update public.import_lotes set status = 'revertido' where id = p_lote;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, ator_rotulo, detalhe)
  values ('importacao.revertida', 'import_lotes', p_lote::text, coalesce(p_rotulo, public.ator_rotulo_atual()), v);
  return v;
end $$;

revoke all on function public.importacao_criar_lote_interna(jsonb, jsonb, text),
  public.imp_casar_participante(uuid, text), public.importacao_analisar_interna(uuid),
  public.importacao_promover_interna(uuid, jsonb, text), public.importacao_reverter_interna(uuid, text)
  from public, anon, authenticated;

-- ── 5. portas do painel (importacao.gerir = só administrador) ─────────────
create or replace function public.importacao_criar_lote(p_secret text, p_meta jsonb, p_abas jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
begin
  if not public.pode(p_secret, 'importacao.gerir') then raise exception 'nao_autorizado'; end if;
  return public.importacao_criar_lote_interna(p_meta, p_abas);
end $$;

create or replace function public.importacao_analisar(p_secret text, p_lote uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.pode(p_secret, 'importacao.gerir') then raise exception 'nao_autorizado'; end if;
  return public.importacao_analisar_interna(p_lote);
end $$;

create or replace function public.importacao_promover(p_secret text, p_lote uuid, p_conferencia jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.pode(p_secret, 'importacao.gerir') then raise exception 'nao_autorizado'; end if;
  return public.importacao_promover_interna(p_lote, p_conferencia);
end $$;

create or replace function public.importacao_reverter(p_secret text, p_lote uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.pode(p_secret, 'importacao.gerir') then raise exception 'nao_autorizado'; end if;
  return public.importacao_reverter_interna(p_lote);
end $$;

create or replace function public.get_importacoes(p_secret text)
returns table (id uuid, fonte text, arquivo_nome text, arquivo_sha256 text, edicao_codigo text, status text,
               totais jsonb, importado_rotulo text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select l.id, l.fonte, l.arquivo_nome, l.arquivo_sha256, l.edicao_codigo, l.status,
         l.totais - 'aliases_informados', l.importado_rotulo, l.created_at
    from public.import_lotes l
   where public.pode(p_secret, 'importacao.gerir')
   order by l.created_at desc
$$;

create or replace function public.get_importacao_linhas(p_secret text, p_lote uuid, p_aba text default null)
returns table (id uuid, aba text, linha int, dados_originais jsonb, dados_normalizados jsonb,
               classificacao text, status text, destino_tabela text, destino_id uuid)
language sql stable security definer set search_path = public as $$
  select il.id, il.aba, il.linha, il.dados_originais, il.dados_normalizados, il.classificacao, il.status,
         il.destino_tabela, il.destino_id
    from public.import_linhas il
   where public.pode(p_secret, 'importacao.gerir') and il.lote_id = p_lote
     and (p_aba is null or il.aba = p_aba)
   order by il.aba, il.linha
$$;

revoke all on function public.importacao_criar_lote(text, jsonb, jsonb), public.importacao_analisar(text, uuid),
  public.importacao_promover(text, uuid, jsonb), public.importacao_reverter(text, uuid),
  public.get_importacoes(text), public.get_importacao_linhas(text, uuid, text) from public;
grant execute on function public.importacao_criar_lote(text, jsonb, jsonb), public.importacao_analisar(text, uuid),
  public.importacao_promover(text, uuid, jsonb), public.importacao_reverter(text, uuid),
  public.get_importacoes(text), public.get_importacao_linhas(text, uuid, text) to anon, authenticated;
