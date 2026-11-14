-- Reverte 20270205: devolve as avaliações anuladas para `avaliacoes` e remove a gaveta.
-- ATENÇÃO: falha se a pessoa já tiver avaliado a mesma casa de novo (chave única); resolver caso a caso.
insert into public.avaliacoes
select id, edicao_codigo, participacao_id, participacao_unidade_id, nome, email_norm, notas, comentario, aceita_novidades,
       substituicoes, criado_em, atualizado_em, comentario_evento, sugestao_festival
  from public.avaliacoes_anuladas;
drop function if exists public.avaliacao_anular(uuid, text, text);
drop table if exists public.avaliacoes_anuladas;
