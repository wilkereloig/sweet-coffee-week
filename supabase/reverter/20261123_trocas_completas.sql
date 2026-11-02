-- Reverte 20261123_trocas_completas. As funções voltam pela reaplicação das migrations que as definiam por último:
--   preenchimento_estado e montar_publico → 20261107_horario_festival.sql
--   org_preenchimento_decidir           → 20261107_horario_festival_formulario.sql
--   alteracao_campo_marca               → 20261122_social_participantes_completo.sql
--   campos_cadastro                     → a definição anterior (13 campos-base, sem nome/descrição do combo)
-- Rodar esses trechos (create or replace) e, por último, apagar a coluna. ⚠️ Apagar a coluna perde as descrições já
-- preenchidas pelas marcas: exportar antes (select id, item_id, alternativa, descricao from substituicoes where descricao is not null).
alter table public.substituicoes drop constraint if exists substituicoes_descricao_tamanho;
alter table public.substituicoes drop column if exists descricao;
