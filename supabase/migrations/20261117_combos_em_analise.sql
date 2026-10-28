-- Visão geral › "Cadastros para aprovar": o que a curadoria precisa ler para decidir sem abrir a ficha.
-- Só LEITURA (get_*): combos de participação aberta com combo_status = 'em_analise', com o nome do combo, o tema, a
-- descrição, os três itens, os custos da marca e desde quando espera (o último "rascunho/correção → em_analise" na
-- auditoria; sem registro, a última alteração da participação). A decisão continua sendo revisar_combo (curadoria.decidir).
create or replace function public.get_combos_em_analise(p_secret text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
begin
  if not public.pode(p_secret, 'curadoria.decidir') then raise exception 'nao_autorizado'; end if;
  return coalesce((
    select jsonb_agg(x.linha || jsonb_build_object('desde', x.desde) order by x.desde asc)
      from (
        select coalesce((
                 select max(a.at) from public.auditoria a
                  where a.alvo_id = pa.id::text and a.acao = 'participacao.operacao'
                    and a.detalhe -> 'para' ->> 'combo_status' = 'em_analise'), pa.updated_at) as desde,
               jsonb_build_object(
                 'participacao_id', pa.id,
                 'participante_id', p.id,
                 'nome_marca', p.nome_marca,
                 'edicao_codigo', pa.edicao_codigo,
                 'combo_nome', pa.combo_nome,
                 'combo_descricao', pa.combo_descricao,
                 'tema_combo', pa.tema_combo,
                 'tema_justificativa', pa.tema_justificativa,
                 'combo_para_viagem', pa.combo_para_viagem,
                 'custo_embalagem', pa.custo_embalagem,
                 'custo_delivery', pa.custo_delivery,
                 'combo_revisao_nota', pa.combo_revisao_nota,
                 'alterado_apos_aprovacao', pa.alterado_apos_aprovacao,
                 'itens', coalesce((
                   select jsonb_agg(jsonb_build_object('tipo', i.tipo, 'nome', i.nome, 'descricao', i.descricao) order by i.posicao)
                     from public.participantes_itens i where i.participacao_id = pa.id), '[]'::jsonb)
               ) as linha
          from public.participacoes pa
          join public.participantes p on p.id = pa.participante_id
         where pa.combo_status = 'em_analise'
           and pa.status_cadastro is distinct from 'encerrado'
           and p.arquivado_em is null
      ) x
  ), '[]'::jsonb);
end $function$;

revoke all on function public.get_combos_em_analise(text) from public;
grant execute on function public.get_combos_em_analise(text) to anon, authenticated;
