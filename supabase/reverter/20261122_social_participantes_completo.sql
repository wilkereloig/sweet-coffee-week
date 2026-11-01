-- Reversão de 20261122_social_participantes_completo.sql. Tira o gatilho e as funções novas e devolve editorial_combos à
-- forma de 20261121. ⚠️ Apaga as tabelas: as alterações registradas, os "vistos" e as revisões guardadas se perdem
-- (o cadastro das marcas não é tocado — nada daqui gravava nele). Salve as revisões antes, se precisar delas.
do $$
declare t text;
begin
  foreach t in array array['participantes', 'participacoes', 'participantes_itens', 'declaracoes_alimentares', 'substituicoes', 'unidades', 'participacao_unidades'] loop
    execute format('drop trigger if exists alteracao_campo_marca on public.%I', t);
  end loop;
end $$;
drop function if exists public.alteracao_campo_marca();
drop function if exists public.registrar_alteracao_campo(uuid, text, text, text);
drop function if exists public.txt_campo(jsonb);
drop function if exists public.editorial_marcar_visto(text, uuid, text);
drop table if exists public.alteracoes_campo, public.editorial_vistos, public.revisoes_texto;

create or replace function public.editorial_combos(p_secret text, p_edicao text default null)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare v_ed text;
begin
  perform public.redes_exigir(p_secret, 'editorial.ler');
  v_ed := coalesce(nullif(p_edicao, ''), (select edicao_atual from public.admin_config limit 1));
  return jsonb_build_object(
    'edicao', (select jsonb_build_object('codigo', e.codigo, 'nome', e.nome, 'valor_combo', e.valor_combo)
                 from public.edicoes e where e.codigo = v_ed),
    'combos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'participacao_id', pa.id, 'participante_id', pt.id, 'marca', pt.nome_marca,
               'instagram', nullif(btrim(pt.instagram), ''),
               'tema', pa.tema_combo, 'status_cadastro', pa.status_cadastro, 'combo_status', pa.combo_status,
               'alterado_apos_aprovacao', pa.alterado_apos_aprovacao, 'para_viagem', pa.combo_para_viagem,
               'combo', public.montar_publico(pa.id, 'marca_e_combo') -> 'combo')
             order by lower(pt.nome_marca))
        from public.participacoes pa join public.participantes pt on pt.id = pa.participante_id
       where pa.edicao_codigo = v_ed and pa.status_cadastro is distinct from 'encerrado' and pt.arquivado_em is null), '[]'::jsonb));
end $$;
revoke all on function public.editorial_combos(text, text) from public;
grant execute on function public.editorial_combos(text, text) to anon, authenticated;
