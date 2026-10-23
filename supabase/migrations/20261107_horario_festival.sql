-- ─────────────────────────────────────────────────────────────────────────────
-- Horário NO FESTIVAL — uma pergunta só (pedido do Wilker, 23/10/2026).
--
-- Antes: "horário da loja" (texto livre, unidades.horario_loja_texto) × "horário do combo" (texto livre,
-- participacao_unidades.horarios) e, à parte, o horário dia a dia (unidade_disponibilidade), que só existia quando a
-- marca o montava no painel. Nenhuma das 38 unidades tinha linha ali, então nenhuma casa passava em
-- pendencias_publicacao ("unidade:<id>:horario") e nenhuma podia ser publicada.
--
-- Agora a única informação é COMO A UNIDADE FUNCIONA EM CADA DIA DO FESTIVAL. Ela mora na própria unidade da edição,
-- na coluna participacao_unidades.horario_festival: um array jsonb de períodos
--     [{"data": "2026-11-05", "abre": "10:00", "fecha": "22:00"}, …]
-- (até 2 períodos por dia, p.ex. fecha para o almoço; "meia-noite" é "24:00"; DIA SEM PERÍODO = NÃO ABRE; array vazio =
-- ainda não respondido). É um documento que sempre se edita por inteiro, então trocar o horário é um UPDATE de uma
-- coluna: atômico, validado por gatilho em qualquer caminho de escrita (marca, equipe, formulário) e sem apagar linha.
-- O horário comercial padrão da loja deixa de ser pedido e de ser publicado. As colunas de texto antigas
-- (participacao_unidades.horarios, unidades.horario_loja_texto) ficam como legado, só para leitura ("Hoje está: …").
-- A tabela unidade_disponibilidade (vazia) fica no banco, sem uso, como registro do modelo anterior.
--
--  1. horario_festival_normalizar(linhas, ini, fim) .... valida e devolve a forma canônica (ordenada, "HH:MM")
--  2. gatilho horario_festival_validar ................. roda a normalização em todo INSERT/UPDATE da coluna
--  3. horario_festival_de_texto(texto, ini, fim) ....... lê o texto no formato do /preencher ("Seg a Sex, 10h às 22h;
--                                                         Dom, fechado"); null se não ler por inteiro
--  4. org_salvar_horario_unidade(...) .................. a equipe edita pela ficha; auditoria antes/depois
--  5. pendencias_publicacao / preenchimento_estado / org_preenchimento_decidir / montar_publico leem e gravam a coluna;
--     o formulário e a página pública deixam de falar em "horário da loja"; o WhatsApp preenchido vale como publicável
--  6. Backfill: as unidades cujo texto está no formato do /preencher (as que a própria página montou) são convertidas.
--     As demais ficam sem horário: a marca confirma pelo seletor novo e a equipe pode editar ("Hoje está: …").
--
-- Nada é apagado. Teste: supabase/testes/horario-festival.sql · Reversão: supabase/reverter/20261107_horario_festival.sql
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.participacao_unidades
  add column if not exists horario_festival jsonb not null default '[]'::jsonb
  constraint participacao_unidades_horario_festival_tipo check (jsonb_typeof(horario_festival) = 'array');
comment on column public.participacao_unidades.horario_festival is
  'Como a unidade funciona em cada dia do festival: [{data, abre, fecha, observacao?}] ("HH:MM"; até 2 períodos por dia; dia sem período = não abre; [] = não respondido). Validado por horario_festival_normalizar.';
-- A marca grava o horário da própria unidade (a RLS unidades_marca_tudo já limita a linha; o grant de coluna, a coluna).
grant update (horario_festival) on public.participacao_unidades to authenticated;

-- Valida e devolve a forma canônica. Recusa: não é array, item que não é objeto, data/hora ilegível, fecha <= abre, dia
-- fora do festival, mais de 2 períodos no dia, períodos que se sobrepõem, o mesmo início duas vezes, observação > 120.
-- p_inicio nulo = não confere o festival.
create or replace function public.horario_festival_normalizar(p_linhas jsonb, p_inicio date, p_fim date)
 returns jsonb language plpgsql stable set search_path to 'public'
as $function$
declare
  v_novas jsonb;
begin
  if p_linhas is null or jsonb_typeof(p_linhas) <> 'array' or jsonb_array_length(p_linhas) > 44
     or exists (select 1 from jsonb_array_elements(p_linhas) e where jsonb_typeof(e) <> 'object') then
    raise exception 'horario_invalido';
  end if;

  begin
    select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
             'data', x.data, 'abre', to_char(x.abre, 'HH24:MI'), 'fecha', to_char(x.fecha, 'HH24:MI'), 'observacao', x.obs))
             order by x.data, x.abre), '[]'::jsonb)
      into v_novas
      from (select (e ->> 'data')::date as data, (e ->> 'abre')::time as abre, (e ->> 'fecha')::time as fecha,
                   nullif(btrim(e ->> 'observacao'), '') as obs
              from jsonb_array_elements(p_linhas) e) x;
  exception when others then
    raise exception 'horario_invalido';
  end;

  if exists (select 1 from jsonb_to_recordset(v_novas) n(data date, abre time, fecha time, observacao text)
              where n.data is null or n.abre is null or n.fecha is null or n.fecha <= n.abre
                 or char_length(coalesce(n.observacao, '')) > 120) then
    raise exception 'horario_invalido';
  end if;
  if p_inicio is not null and exists (select 1 from jsonb_to_recordset(v_novas) n(data date, abre time, fecha time, observacao text)
                                       where n.data < p_inicio or n.data > p_fim) then
    raise exception 'data_fora_do_festival';
  end if;
  if exists (select 1
               from (select n.abre, lag(n.fecha) over (partition by n.data order by n.abre) as anterior,
                            count(*) over (partition by n.data) as no_dia
                       from jsonb_to_recordset(v_novas) n(data date, abre time, fecha time, observacao text)) z
              where z.no_dia > 2 or z.abre < z.anterior)
     or (select count(distinct (n.data, n.abre)) from jsonb_to_recordset(v_novas) n(data date, abre time, fecha time, observacao text))
        <> jsonb_array_length(v_novas) then
    raise exception 'horario_invalido';
  end if;
  return v_novas;
end $function$;
revoke all on function public.horario_festival_normalizar(jsonb, date, date) from public, anon, authenticated;

-- Todo caminho de escrita da coluna (painel da marca, RPC da equipe, "Aplicar" do formulário, backfill) passa por aqui.
create or replace function public.horario_festival_validar()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_ini date; v_fim date;
begin
  select e.festival_inicio, e.festival_fim into v_ini, v_fim
    from public.participacoes pa join public.edicoes e on e.codigo = pa.edicao_codigo
   where pa.id = new.participacao_id;
  new.horario_festival := public.horario_festival_normalizar(new.horario_festival, v_ini, v_fim);
  return new;
end $function$;
revoke all on function public.horario_festival_validar() from public, anon, authenticated;
create or replace trigger horario_festival_validar before insert or update of horario_festival on public.participacao_unidades
  for each row execute function public.horario_festival_validar();

-- Lê o texto que o formulário /preencher montava ("Qui, 15h às 23h; Sex e Sáb, 14h às 23h; Dom, 12h30 às 22h"). Só aceita
-- esse formato, por inteiro: hora de 5h a 23h30, de meia em meia hora, até 2 períodos por dia, nenhum dia repetido.
-- Dia que o texto não menciona = não abre. Qualquer coisa fora disso devolve null (nada é adivinhado).
create or replace function public.horario_festival_de_texto(p_texto text, p_inicio date, p_fim date)
 returns jsonb language plpgsql stable set search_path to 'public'
as $function$
declare
  nomes constant text[] := array['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];
  per constant text := '\d{1,2}h(?:\d{2})? às \d{1,2}h(?:\d{2})?';
  v_dia text[] := array[null, null, null, null, null, null, null]::text[];   -- 1 = seg … 7 = dom: 'F' ou 'HH:MI-HH:MI[|HH:MI-HH:MI]'
  v_parte text; v_m text[]; v_r text[]; v_idx int[]; v_nome text; v_a int; v_b int; v_i int;
  v_per text; v_p text; v_pm text[]; v_h1 int; v_m1 int; v_h2 int; v_m2 int; v_ab time; v_fe time; v_ult time;
  v_dt date; v_linhas jsonb := '[]'::jsonb; v_x text;
begin
  if p_texto is null or btrim(p_texto) = '' or p_inicio is null or p_fim is null
     or p_fim < p_inicio or p_fim - p_inicio > 60 then
    return null;
  end if;
  for v_parte in select btrim(x) from unnest(string_to_array(p_texto, ';')) x where btrim(x) <> '' loop
    v_m := regexp_match(v_parte, '^(.*), (fechado|' || per || '(?: e ' || per || ')*)$', 'i');
    if v_m is null then return null; end if;

    v_idx := '{}';
    if lower(btrim(v_m[1])) = 'todos os dias' then
      v_idx := array[1, 2, 3, 4, 5, 6, 7];
    else
      v_r := regexp_match(btrim(v_m[1]), '^(\S+) a (\S+)$');
      if v_r is not null then
        v_a := array_position(nomes, replace(lower(v_r[1]), 'sab', 'sáb'));
        v_b := array_position(nomes, replace(lower(v_r[2]), 'sab', 'sáb'));
        if v_a is null or v_b is null or v_b < v_a then return null; end if;
        v_idx := array(select generate_series(v_a, v_b));
      else
        foreach v_nome in array string_to_array(replace(v_m[1], ' e ', ','), ',') loop
          v_a := array_position(nomes, replace(lower(btrim(v_nome)), 'sab', 'sáb'));
          if v_a is null then return null; end if;
          v_idx := v_idx || v_a;
        end loop;
      end if;
    end if;

    if lower(v_m[2]) = 'fechado' then
      v_per := 'F';
    else
      v_per := ''; v_ult := null;
      foreach v_p in array string_to_array(v_m[2], ' e ') loop
        v_pm := regexp_match(btrim(v_p), '^(\d{1,2})h(\d{2})? às (\d{1,2})h(\d{2})?$', 'i');
        if v_pm is null then return null; end if;
        v_h1 := v_pm[1]::int; v_m1 := coalesce(v_pm[2], '00')::int;
        v_h2 := v_pm[3]::int; v_m2 := coalesce(v_pm[4], '00')::int;
        if v_h1 not between 5 and 23 or v_h2 not between 5 and 23 or v_m1 not in (0, 30) or v_m2 not in (0, 30) then
          return null;
        end if;
        v_ab := make_time(v_h1, v_m1, 0); v_fe := make_time(v_h2, v_m2, 0);
        if v_fe <= v_ab or (v_ult is not null and v_ab < v_ult) then return null; end if;
        v_per := v_per || case when v_per = '' then '' else '|' end || to_char(v_ab, 'HH24:MI') || '-' || to_char(v_fe, 'HH24:MI');
        v_ult := v_fe;
      end loop;
    end if;

    foreach v_i in array v_idx loop
      if v_dia[v_i] is not null then return null; end if;   -- o mesmo dia em duas faixas: ambíguo, não adivinha
      v_dia[v_i] := v_per;
    end loop;
  end loop;
  if array_to_string(v_dia, '') = '' then return null; end if;

  for v_i in 0 .. (p_fim - p_inicio) loop
    v_dt := p_inicio + v_i;
    v_per := v_dia[extract(isodow from v_dt)::int];
    if v_per is null or v_per = 'F' then continue; end if;
    foreach v_x in array string_to_array(v_per, '|') loop
      v_linhas := v_linhas || jsonb_build_object('data', v_dt, 'abre', split_part(v_x, '-', 1), 'fecha', split_part(v_x, '-', 2));
    end loop;
  end loop;
  if jsonb_array_length(v_linhas) = 0 then return null; end if;
  return v_linhas;
end $function$;
revoke all on function public.horario_festival_de_texto(text, date, date) from public, anon, authenticated;

-- A equipe edita o horário da unidade pela ficha (mesmo seletor da marca). Guardada por cadastro.editar, como as outras
-- org_salvar_*; a unidade tem que ser da participação. Gravar o que já está não faz nada (nem aviso de "alterado após
-- aprovação"). Auditoria com o antes e o depois. Devolve quantos períodos ficaram.
create or replace function public.org_salvar_horario_unidade(p_secret text, p_participacao uuid, p_unidade uuid, p_linhas jsonb)
 returns integer language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_pa public.participacoes%rowtype; v_ini date; v_fim date; v_antes jsonb; v_novo jsonb;
begin
  if not public.pode(p_secret, 'cadastro.editar') then raise exception 'nao_autorizado'; end if;
  select * into v_pa from public.participacoes where id = p_participacao;
  if not found then raise exception 'participacao_nao_encontrada'; end if;
  select horario_festival into v_antes from public.participacao_unidades where id = p_unidade and participacao_id = p_participacao;
  if not found then raise exception 'unidade_nao_encontrada'; end if;
  select festival_inicio, festival_fim into v_ini, v_fim from public.edicoes where codigo = v_pa.edicao_codigo;
  v_novo := public.horario_festival_normalizar(p_linhas, v_ini, v_fim);
  if v_novo is distinct from v_antes then
    update public.participacao_unidades set horario_festival = v_novo where id = p_unidade;
    insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, participacao_id, detalhe)
    values ('cadastro.editado', 'participacao_unidades', p_unidade::text, v_pa.participante_id, p_participacao,
            jsonb_build_object('bloco', 'horario_festival', 'antes', v_antes, 'depois', v_novo));
  end if;
  return jsonb_array_length(v_novo);
end $function$;
revoke all on function public.org_salvar_horario_unidade(text, uuid, uuid, jsonb) from public;
grant execute on function public.org_salvar_horario_unidade(text, uuid, uuid, jsonb) to anon, authenticated;

-- O que falta para publicar: o horário vem da coluna nova.
create or replace function public.pendencias_publicacao(p_participacao uuid)
 returns text[] language plpgsql stable security definer set search_path to 'public'
as $$
declare
  v_pa public.participacoes%rowtype; v_f text[] := '{}'; r record;
  alergenicos constant text[] := array['gluten', 'leite', 'ovo', 'amendoim', 'castanhas', 'soja', 'peixe', 'crustaceos'];
begin
  select * into v_pa from public.participacoes where id = p_participacao;
  if not found then return array['participacao_nao_encontrada']; end if;
  if coalesce(btrim(v_pa.combo_nome), '') = '' then v_f := v_f || 'combo_nome'::text; end if;
  if not exists (select 1 from public.participacao_unidades where participacao_id = p_participacao and participa) then
    v_f := v_f || 'sem_unidade'::text;
  end if;
  for r in select pu.*, u.logradouro, u.bairro as u_bairro, u.cidade
             from public.participacao_unidades pu left join public.unidades u on u.id = pu.unidade_id
            where pu.participacao_id = p_participacao and pu.participa order by pu.ordem loop
    if coalesce(btrim(r.logradouro), '') = '' or coalesce(btrim(r.u_bairro), '') = '' or coalesce(btrim(r.cidade), '') = '' then
      v_f := v_f || ('unidade:' || r.id_publico || ':endereco');
    end if;
    if 'nao_informado' in (r.consumo_local, r.retirada, r.delivery_combo) then
      v_f := v_f || ('unidade:' || r.id_publico || ':modos');
    end if;
    if r.delivery_combo = 'sim' and jsonb_array_length(coalesce(r.canais_delivery, '[]'::jsonb)) = 0 then
      v_f := v_f || ('unidade:' || r.id_publico || ':canais');
    end if;
    -- Horário no festival (23/10/2026): períodos em participacao_unidades.horario_festival; [] = ainda não respondido.
    if jsonb_array_length(coalesce(r.horario_festival, '[]'::jsonb)) = 0 then
      v_f := v_f || ('unidade:' || r.id_publico || ':horario');
    end if;
  end loop;
  -- Cada componente responde TODOS os alergênicos da lista — "não sei" vale e
  -- grava nao_informado explícito; o que não pode é não ter perguntado.
  for r in select i.id, i.posicao from public.participantes_itens i where i.participacao_id = p_participacao order by i.posicao loop
    if (select count(distinct aspecto) from public.declaracoes_alimentares d
         where d.item_id = r.id and d.aspecto = any (alergenicos)) < array_length(alergenicos, 1) then
      v_f := v_f || ('item:' || r.posicao || ':alimentar');
    end if;
  end loop;
  return v_f;
end $$;
revoke all on function public.pendencias_publicacao(uuid) from public, anon, authenticated;

-- O formulário de preenchimento: o estado devolve os períodos (horario_festival) e deixa de devolver o horário da loja.
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
                -- Horário no festival (23/10/2026): os períodos dia a dia. 'horario_combo' é o texto antigo, só para "Hoje está: …";
                -- o horário comercial da loja deixou de ser pedido.
                'horario_combo', pu.horarios, 'horario_festival', pu.horario_festival,
                'consumo_local', pu.consumo_local, 'retirada', pu.retirada, 'delivery_combo', pu.delivery_combo)
                order by pu.ordem), '[]'::jsonb)
                from public.participacao_unidades pu
                left join public.unidades u on u.id = pu.unidade_id
               where pu.participacao_id = p_participacao and pu.participa is not false)
  )
$$;
revoke all on function public.preenchimento_estado(uuid) from public, anon, authenticated;

-- A página pública deixa de levar o horário da loja; o horário é só o do festival, em combo.disponibilidade.
create or replace function public.montar_publico(p_participacao uuid, p_nivel text default 'marca_e_combo')
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare
  v_pa public.participacoes%rowtype; v_p public.participantes%rowtype; v_e public.edicoes%rowtype;
  v_logo text; v_unidades jsonb; v_itens jsonb; v_fotos jsonb; v_combo jsonb := null;
  v_com_combo boolean := p_nivel = 'marca_e_combo';
begin
  select * into v_pa from public.participacoes where id = p_participacao;
  if not found then return null; end if;
  select * into v_p from public.participantes where id = v_pa.participante_id;
  select * into v_e from public.edicoes where codigo = v_pa.edicao_codigo;
  select path into v_logo from public.logos_marca where id = coalesce(v_pa.logo_id, v_p.logo_id);

  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
           'id', pu.id_publico,
           'nome', u.nome_unidade,
           'endereco', jsonb_strip_nulls(jsonb_build_object(
              'logradouro', coalesce(u.logradouro, pu.endereco), 'numero', u.numero, 'complemento', u.complemento,
              'bairro', coalesce(u.bairro, pu.bairro), 'cidade', u.cidade, 'uf', u.uf, 'referencia', u.referencia)),
           'coordenada', case when u.coordenada_verificada_em is not null and u.lat is not null
                              then jsonb_build_object('lat', u.lat, 'lng', u.lng) end,
           'whatsapp', case when u.whatsapp_autorizado then u.whatsapp_publico end,
           'fotos', (select jsonb_agg(jsonb_build_object('path', m.path, 'alt', m.alt, 'largura', m.largura, 'altura', m.altura) order by m.ordem)
                       from public.midias_participacao m
                      where m.participacao_unidade_id = pu.id and m.papel = 'loja' and m.estado = 'aprovada'),
           'combo', case when v_com_combo then jsonb_strip_nulls(jsonb_build_object(
              'modos', jsonb_build_object('local', pu.consumo_local, 'retirada', pu.retirada, 'delivery', pu.delivery_combo),
              'canais', case when pu.delivery_combo = 'sim' then pu.canais_delivery end,
              'delivery_regioes', case when pu.delivery_combo = 'sim' then pu.delivery_regioes end,
              'delivery_taxa', case when pu.delivery_combo = 'sim' then pu.delivery_taxa end,
              'observacao', pu.observacao_combo,
              -- Horário no festival: dia a dia, de participacao_unidades.horario_festival (a tabela antiga ficou sem uso).
              'disponibilidade', (select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                                     'data', d.data, 'abre', d.abre, 'fecha', d.fecha, 'observacao', d.observacao)) order by d.data, d.abre)
                                    from jsonb_to_recordset(pu.horario_festival) d(data text, abre text, fecha text, observacao text)))) end
         )) order by pu.ordem), '[]'::jsonb)
    into v_unidades
    from public.participacao_unidades pu left join public.unidades u on u.id = pu.unidade_id
   where pu.participacao_id = p_participacao and pu.participa;

  if v_com_combo then
    select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
             'tipo', i.tipo, 'posicao', i.posicao, 'nome', i.nome, 'descricao', i.descricao, 'ingredientes', i.ingredientes,
             'alimentar', (select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('aspecto', d.aspecto, 'estado', d.estado, 'observacao', d.observacao)) order by d.aspecto)
                             from public.declaracoes_alimentares d where d.item_id = i.id),
             'substituicoes', (select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                                  'original', s.original, 'alternativa', s.alternativa, 'disponibilidade', s.disponibilidade,
                                  'acrescimo', s.acrescimo, 'como_solicitar', s.como_solicitar,
                                  'modalidades', case when cardinality(s.modalidades) > 0 then to_jsonb(s.modalidades) end,
                                  'unidades', case when cardinality(s.unidades) > 0 then
                                                (select jsonb_agg(pu.id_publico) from public.participacao_unidades pu
                                                  where pu.id = any (s.unidades) and pu.participa) end,
                                  'alimentar', (select jsonb_agg(jsonb_build_object('aspecto', d.aspecto, 'estado', d.estado) order by d.aspecto)
                                                  from public.declaracoes_alimentares d where d.substituicao_id = s.id)
                               )) order by s.ordem, s.criado_em)
                                 from public.substituicoes s where s.item_id = i.id),
             'foto', (select jsonb_build_object('path', m.path, 'alt', m.alt, 'largura', m.largura, 'altura', m.altura)
                        from public.midias_participacao m
                       where m.item_id = i.id and m.papel = 'item' and m.estado = 'aprovada' order by m.ordem limit 1)
           )) order by i.posicao), '[]'::jsonb)
      into v_itens
      from public.participantes_itens i where i.participacao_id = p_participacao;

    select jsonb_strip_nulls(jsonb_build_object(
             'principal', (select jsonb_build_object('path', m.path, 'alt', m.alt, 'largura', m.largura, 'altura', m.altura,
                                                     'foco', case when m.foco_x is not null then jsonb_build_object('x', m.foco_x, 'y', m.foco_y) end)
                             from public.midias_participacao m
                            where m.participacao_id = p_participacao and m.papel = 'combo_principal' and m.estado = 'aprovada' limit 1),
             'galeria', (select jsonb_agg(jsonb_build_object('path', m.path, 'alt', m.alt, 'largura', m.largura, 'altura', m.altura) order by m.ordem)
                           from public.midias_participacao m
                          where m.participacao_id = p_participacao and m.papel = 'combo_galeria' and m.estado = 'aprovada')))
      into v_fotos;

    v_combo := jsonb_strip_nulls(jsonb_build_object(
      'nome', v_pa.combo_nome, 'descricao', v_pa.combo_descricao, 'condicoes', v_pa.combo_condicoes,
      'preco', v_e.valor_combo, 'itens', v_itens, 'fotos', v_fotos));
  end if;

  return jsonb_strip_nulls(jsonb_build_object(
    'slug', v_pa.slug_publico,
    'nivel', p_nivel,
    'casa', jsonb_strip_nulls(jsonb_build_object(
      'nome', v_p.nome_marca, 'apresentacao', v_p.apresentacao_publica,
      'instagram', nullif(btrim(v_p.instagram), ''), 'site', nullif(btrim(v_p.site), ''),
      'logo', case when v_logo is not null then jsonb_build_object('bucket', 'logos', 'path', v_logo) end)),
    'unidades', v_unidades,
    'combo', v_combo));
end $$;
revoke all on function public.montar_publico(uuid, text) from public, anon, authenticated;

-- Mudar o horário de um combo já aprovado marca "alterado após aprovação", como mudar modos ou canais (mesma função,
-- uma coluna a mais na lista).
create or replace trigger unidades_part_alterou
  after insert or delete or update of participa, consumo_local, retirada, delivery_combo, canais_delivery, delivery_regioes,
                                      delivery_taxa, observacao_combo, unidade_id, horario_festival
  on public.participacao_unidades
  for each row execute function public.filho_alterou();

-- Backfill: unidade ainda sem horário cujo texto está no formato do /preencher por inteiro é convertida. É o texto que a
-- PRÓPRIA marca montou ao escolher dias e horas; o resto (digitado à mão, planilha) não é adivinhado — fica para a marca
-- confirmar no seletor, com o texto antigo à vista. Só unidades que participam; só o horário DO COMBO (o horário comercial
-- da loja deixou de ser pedido). Idempotente: quem já tem horário não é tocado.
update public.participacao_unidades pu
   set horario_festival = x.h
  from (select pu2.id, public.horario_festival_de_texto(pu2.horarios, e.festival_inicio, e.festival_fim) as h
          from public.participacao_unidades pu2
          join public.participacoes pa on pa.id = pu2.participacao_id
          join public.edicoes e on e.codigo = pa.edicao_codigo
         where pu2.participa and nullif(btrim(pu2.horarios), '') is not null and pu2.horario_festival = '[]'::jsonb) x
 where pu.id = x.id and x.h is not null;

comment on table public.unidade_disponibilidade is
  'LEGADO (23/10/2026): o horário no festival passou a morar em participacao_unidades.horario_festival. Sem uso; fica como registro do modelo anterior.';
