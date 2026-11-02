-- 02/11/2026 (pedido do Wilker): a troca vira um ITEM COMPLETO — nome, descrição, disponibilidade e os mesmos alergênicos
-- e características do item principal ("o Marlon tem o cachorro-quente e, de troca, o vegetariano"). Várias por item.
-- E o combo pede nome e descrição como obrigatórios.
--
-- 1. `substituicoes.descricao` (nova). `alternativa` passa a ser o NOME do item da troca; `original` deixa de ser perguntado
--    e é gravado com o nome do próprio item (a coluna segue NOT NULL). Os alergênicos da troca já tinham lugar:
--    `declaracoes_alimentares.substituicao_id` (RLS e índice único prontos desde 20261014).
-- 2. `preenchimento_estado` devolve, por item, a lista `trocas` (com id, descrição e alergênicos); `troca` (a primeira)
--    continua para rascunho e envio antigos.
-- 3. `org_preenchimento_decidir` ("Aplicar" da equipe) aceita `trocas` (lista) e, de envio antigo, `troca` (uma).
--    Aplicar troca a lista inteira do item: apaga as trocas do item e grava as do envio, com os alergênicos de cada uma.
-- 4. `montar_publico` (site, Social, Word) leva a `descricao` da troca; os alergênicos dela já iam.
-- 5. `alteracao_campo_marca` (marcação "Alterado" do Social) passa a ver a descrição da troca.
-- 6. `campos_cadastro` conta nome e descrição do combo como obrigatórios (13 → 15 campos-base).
--
-- 3, 4 e 5 trocam um TRECHO da função em vigor (textos longos que não mudam no resto); cada troca confere que o trecho
-- existia e falha alto se não existir. Reversão em supabase/reverter/. Teste: supabase/testes/trocas-completas.sql.

alter table public.substituicoes add column if not exists descricao text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'substituicoes_descricao_tamanho') then
    alter table public.substituicoes add constraint substituicoes_descricao_tamanho
      check (descricao is null or char_length(descricao) <= 600);
  end if;
end $$;

-- ── 2 · leitura do formulário ───────────────────────────────────────────────
create or replace function public.preenchimento_estado(p_participacao uuid)
 returns jsonb language sql stable security definer set search_path to 'public'
as $function$
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
                            from public.substituicoes s where s.item_id = i.id order by s.ordem, s.criado_em limit 1),
                -- Trocas completas (02/11/2026): cada uma com descrição e os próprios alergênicos.
                'trocas', (select coalesce(jsonb_agg(jsonb_build_object(
                              'id', s.id, 'original', s.original, 'alternativa', s.alternativa, 'descricao', s.descricao,
                              'disponibilidade', s.disponibilidade,
                              'alimentar', (select coalesce(jsonb_object_agg(d.aspecto, d.estado), '{}'::jsonb)
                                              from public.declaracoes_alimentares d where d.substituicao_id = s.id),
                              'outro_alergenico', (select d.observacao from public.declaracoes_alimentares d
                                                    where d.substituicao_id = s.id and d.aspecto = 'outro_alergenico'))
                              order by s.ordem, s.criado_em), '[]'::jsonb)
                             from public.substituicoes s where s.item_id = i.id))
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
$function$;

-- ── 3 · "Aplicar" da equipe: lista de trocas ────────────────────────────────
do $patch$
declare f text; ini int; fim int; novo text;
begin
  f := pg_get_functiondef('public.org_preenchimento_decidir(text,uuid,boolean,text)'::regprocedure);
  if strpos(f, 'v_trocas jsonb') > 0 then return; end if; -- já aplicada
  if strpos(f, 'v_ini date; v_fim date;') = 0 then raise exception 'trocas_completas: declare de org_preenchimento_decidir mudou'; end if;
  f := replace(f, 'v_ini date; v_fim date;', 'v_ini date; v_fim date; v_trocas jsonb; v_tr jsonb; v_sub uuid; v_ot int;');
  ini := strpos(f, '      -- Troca (substituição): uma por item neste formulário.');
  fim := strpos(f, E'    end loop;\n  end if;\n\n  -- Unidades');
  if ini = 0 or fim = 0 or fim < ini then raise exception 'trocas_completas: trecho da troca em org_preenchimento_decidir não encontrado'; end if;
  novo := $novo$      -- Trocas (02/11/2026): lista de itens completos (nome, descrição, disponibilidade, alergênicos). Envio antigo traz
      -- `troca` (uma só): vira lista de um. Aplicar troca a lista INTEIRA do item; "Não" apaga todas.
      if jsonb_typeof(it -> 'tem_troca') = 'boolean' then
        if not (it ->> 'tem_troca')::boolean then
          delete from public.substituicoes where item_id = v_atual.id;
        else
          v_trocas := case when jsonb_typeof(it -> 'trocas') = 'array' then it -> 'trocas'
                           when jsonb_typeof(it -> 'troca') = 'object' then jsonb_build_array(it -> 'troca') end;
          if v_trocas is not null and exists (select 1 from jsonb_array_elements(v_trocas) x
                                               where jsonb_typeof(x) = 'object'
                                                 and public.preenchimento_texto(x, 'alternativa', 200) is not null) then
            delete from public.substituicoes where item_id = v_atual.id;  -- leva junto os alergênicos (on delete cascade)
            v_ot := 0;
            for v_tr in select value from jsonb_array_elements(v_trocas) loop
              continue when jsonb_typeof(v_tr) <> 'object' or public.preenchimento_texto(v_tr, 'alternativa', 200) is null;
              v_ot := v_ot + 1;
              insert into public.substituicoes (item_id, original, alternativa, descricao, disponibilidade, acrescimo, modalidades, unidades, ordem)
              values (v_atual.id,
                      -- a troca é sempre do próprio item: o nome dele (o envio antigo ainda pode trazer `original`)
                      coalesce(public.preenchimento_texto(v_tr, 'original', 80),
                               left(coalesce(public.preenchimento_texto(it, 'nome', 120), nullif(btrim(v_atual.nome), '')), 80), 'Item'),
                      public.preenchimento_texto(v_tr, 'alternativa', 200),
                      public.preenchimento_texto(v_tr, 'descricao', 600),
                      case when v_tr ->> 'disponibilidade' in ('sempre', 'sob_consulta', 'limitada')
                           then v_tr ->> 'disponibilidade' else 'sempre' end,
                      0,  -- sem custo: o combo tem valor único
                      '{}', '{}', v_ot)
              returning id into v_sub;
              if jsonb_typeof(v_tr -> 'alimentar') = 'object' then
                insert into public.declaracoes_alimentares (substituicao_id, aspecto, estado)
                select v_sub, e.key, e.value #>> '{}' from jsonb_each(v_tr -> 'alimentar') e
                 where jsonb_typeof(e.value) = 'string'
                   and ((e.key in ('gluten', 'leite', 'ovo', 'amendoim', 'castanhas', 'soja', 'peixe', 'crustaceos')
                          and e.value #>> '{}' in ('contem', 'nao_contem', 'pode_conter', 'nao_informado'))
                        or (e.key in ('lactose', 'vegano', 'vegetariano', 'acucar_adicionado')
                          and e.value #>> '{}' in ('sim', 'nao', 'nao_informado')));
              end if;
              v_txt := public.preenchimento_texto(v_tr, 'outro_alergenico', 160);
              if v_txt is not null then
                insert into public.declaracoes_alimentares (substituicao_id, aspecto, estado, observacao)
                values (v_sub, 'outro_alergenico', 'contem', v_txt);
              end if;
            end loop;
          end if;
        end if;
      end if;
$novo$;
  f := substr(f, 1, ini - 1) || novo || substr(f, fim);
  execute f;
end $patch$;

-- ── 4 · site / Social / Word: descrição da troca ────────────────────────────
do $patch$
declare f text; antes text := $a$'original', s.original, 'alternativa', s.alternativa, 'disponibilidade', s.disponibilidade,$a$;
begin
  f := pg_get_functiondef('public.montar_publico(uuid,text)'::regprocedure);
  if strpos(f, $a$'descricao', s.descricao$a$) > 0 then return; end if;
  if strpos(f, antes) = 0 then raise exception 'trocas_completas: trecho das trocas em montar_publico não encontrado'; end if;
  execute replace(f, antes, $a$'original', s.original, 'alternativa', s.alternativa, 'descricao', s.descricao, 'disponibilidade', s.disponibilidade,$a$);
end $patch$;

-- ── 5 · marcação "Alterado": a troca inclui a descrição ─────────────────────
do $patch$
declare f text;
  a1 text := $a$concat_ws(' → ', nullif(btrim(s.original), ''), nullif(btrim(s.alternativa), ''))$a$;
  a2 text := $a$concat_ws(' → ', nullif(btrim(a ->> 'original'), ''), nullif(btrim(a ->> 'alternativa'), ''))$a$;
begin
  f := pg_get_functiondef('public.alteracao_campo_marca()'::regprocedure);
  if strpos(f, 's.descricao') > 0 then return; end if;
  if strpos(f, a1) = 0 or strpos(f, a2) = 0 then raise exception 'trocas_completas: trecho das trocas em alteracao_campo_marca não encontrado'; end if;
  f := replace(f, a1, $a$concat_ws(' → ', nullif(btrim(s.original), ''), concat_ws(' — ', nullif(btrim(s.alternativa), ''), nullif(btrim(s.descricao), '')))$a$);
  f := replace(f, a2, $a$concat_ws(' → ', nullif(btrim(a ->> 'original'), ''), concat_ws(' — ', nullif(btrim(a ->> 'alternativa'), ''), nullif(btrim(a ->> 'descricao'), '')))$a$);
  execute f;
end $patch$;

-- ── 6 · obrigatórios: nome e descrição do combo ─────────────────────────────
create or replace function public.campos_cadastro(p_participacao uuid)
 returns table(total integer, faltando integer)
 language sql stable security definer set search_path to 'public'
as $function$
  with pa as (select * from public.participacoes where id = p_participacao),
       p as (select pt.* from public.participantes pt join pa on pa.participante_id = pt.id),
       it as (select i.* from public.participantes_itens i where i.participacao_id = p_participacao),
       entrega as (select exists (select 1 from public.participacao_unidades u
                                   where u.participacao_id = p_participacao and u.faz_delivery) as sim),
       vazios as (
         select (case when coalesce(btrim(p.nome_marca), '') = '' then 1 else 0 end)
              + (case when coalesce(btrim(p.responsavel), '') = '' then 1 else 0 end)
              + (case when coalesce(btrim(p.telefone), '') = '' then 1 else 0 end)
              + (case when pa.logo_id is null then 1 else 0 end)
              + (case when coalesce(btrim(pa.tema_combo), '') = '' then 1 else 0 end)
              + (case when coalesce(btrim(pa.tema_justificativa), '') = '' then 1 else 0 end)
              + (case when coalesce(btrim(pa.combo_nome), '') = '' then 1 else 0 end)
              + (case when coalesce(btrim(pa.combo_descricao), '') = '' then 1 else 0 end)
              + (case when pa.combo_para_viagem is true and pa.custo_embalagem is null then 1 else 0 end)
              + (case when (select sim from entrega) and pa.custo_delivery is null then 1 else 0 end)
              + (case when exists (select 1 from public.participacao_unidades u where u.participacao_id = p_participacao
                                      and coalesce(btrim(u.endereco), '') <> '') then 0 else 1 end) as n,
                15 + (case when pa.combo_para_viagem is true then 1 else 0 end)
                   + (case when (select sim from entrega) then 1 else 0 end) as t
           from pa, p)
  select (select t from vazios),
         (select n from vazios)
         + (select coalesce(sum((case when coalesce(btrim(nome), '') = '' then 1 else 0 end)
                              + (case when coalesce(btrim(descricao), '') = '' then 1 else 0 end)), 0)::int from it)
         + 2 * greatest(0, 3 - (select count(*)::int from it))
$function$;
