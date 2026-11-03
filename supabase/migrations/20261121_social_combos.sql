-- 31/10/2026 (pedido do Wilker): Social media › Combos — todos os combos da edição numa página só, uma seção por participante,
-- para a Micaela (Micka, função "social") escrever as postagens sem abrir marca por marca.
--
-- editorial_combos: SÓ LEITURA (editorial.ler, a mesma permissão de editorial_participantes e editorial_ficha). Devolve, por
-- participação da edição (não encerrada, de marca não arquivada), o MESMO combo que a ficha editorial lê: o `combo` de
-- montar_publico(…, 'marca_e_combo') — nome, descrição, condições, preço, itens com as declarações alimentares e as trocas.
-- Sem telefone, e-mail, CNPJ, custos nem pagamento (nada disso passa por montar_publico). Não grava nada.
--
-- Quem decide o que é "preenchido" e monta o texto é o painel (lib/combosTexto.js): o banco entrega a edição inteira, inclusive
-- as casas ainda em branco, para a tela poder dizer quem falta.
-- Reversão em supabase/reverter/.

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
