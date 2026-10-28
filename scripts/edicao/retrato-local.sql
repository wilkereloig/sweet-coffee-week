-- Retrato local da edição 2026.2 (docs/cartoon-2026-2/10 §10.9 e §10.14).
-- SOMENTE LEITURA: um único SELECT. Nada de INSERT/UPDATE/DELETE nem RPC que escreva.
--
-- Como rodar: pelo MCP `supabase-scw` (execute_sql) com este arquivo inteiro. A
-- resposta é UMA linha, coluna `retrato`, e vira src/edicao/dados/retrato/cartoon.local.json
-- (ver src/edicao/dados/retrato/README.md). O arquivo é local e fica no .gitignore:
-- o repositório é público e o retrato traz casas ainda não publicadas.
--
-- Formato = o de edicao_publica('2026.2'), com três diferenças deliberadas:
--  1. participantes = TODAS as participações ativas (status_cadastro <> 'encerrado',
--     participante não arquivado), publicadas ou não — o objetivo é ver a edição como está;
--  2. cada casa vem de recortar_publico(montar_publico(id, 'marca_e_combo'), true, 'em_andamento'):
--     recortar_publico só tira o preço/whatsapp/horário quando a fase é 'encerrada'; qualquer
--     outra fase deixa combo, preço e unidades inteiros. Usamos 'em_andamento' também no
--     envelope, que é a fase em que o catálogo mostra os combos;
--  3. casa sem slug_publico recebe public.slug_publico_de(nome) e "slug_provisorio": true;
--  4. casa.tema = participacoes.tema_combo. D-17: o tema só aparece depois do post de
--     Confirmados da marca, que já saiu (28/10). montar_publico ainda não traz o campo.
-- Mais a chave `retrato` ({ lido_em, fase_no_banco, ... }) que o site usa no aviso.
--
-- O que NUNCA entra: montar_publico já devolve só a projeção pública (sem contato da equipe,
-- sem WhatsApp não autorizado, sem custos, pagamento, nota de revisão ou conta).
with ed as (
  select e.codigo, e.tema, e.festival_inicio, e.festival_fim,
         c.fase, c.avaliacao_aberta, c.avaliacao_abre_em, c.avaliacao_fecha_em
    from public.edicoes e
    join public.edicao_publicacao c on c.edicao_codigo = e.codigo
   where e.codigo = '2026.2'
), casas as (
  select p.nome_marca, nullif(btrim(pa.tema_combo), '') as tema,
         public.recortar_publico(public.montar_publico(pa.id, 'marca_e_combo'), true, 'em_andamento') as r
    from public.participacoes pa
    join public.participantes p on p.id = pa.participante_id
   where pa.edicao_codigo = '2026.2'
     and pa.status_cadastro <> 'encerrado'
     and p.arquivado_em is null
), casas_slug as (
  select tema,
         case when r ->> 'slug' is null
              then r || jsonb_build_object('slug', public.slug_publico_de(nome_marca), 'slug_provisorio', true)
              else r end as r
    from casas
)
select jsonb_build_object(
  'retrato', jsonb_build_object(
    'lido_em', to_char(now() at time zone 'America/Fortaleza', 'YYYY-MM-DD"T"HH24:MI:SS'),
    'edicao', ed.codigo,
    'fase_no_banco', ed.fase,
    'fase_do_recorte', 'em_andamento',
    'casas', (select count(*) from casas)),
  'edicao', jsonb_build_object('codigo', ed.codigo, 'tema', ed.tema, 'inicio', ed.festival_inicio, 'fim', ed.festival_fim),
  'fase', 'em_andamento',
  'participantes_publicos', true,
  'combos_publicos', true,
  'avaliacao', jsonb_build_object(
    'aberta', coalesce(ed.avaliacao_aberta and now() between ed.avaliacao_abre_em and ed.avaliacao_fecha_em, false),
    'abre_em', ed.avaliacao_abre_em, 'fecha_em', ed.avaliacao_fecha_em),
  'resultados_publicos', false,
  'participantes', (
    select coalesce(jsonb_agg(
             case when tema is null then r else jsonb_set(r, '{casa,tema}', to_jsonb(tema)) end
             order by lower(r #>> '{casa,nome}')), '[]'::jsonb)
      from casas_slug)
) as retrato
from ed;
