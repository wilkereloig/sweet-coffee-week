-- ─────────────────────────────────────────────────────────────────────────────
-- Social media › Biblioteca: a contagem da PASTA passa a ser a do que se vê (21/10/2026).
-- Bug: o cartão da pasta dizia "84 arquivos" e a pasta mostrava 30. `n_itens` contava
-- TODA linha de social_biblioteca_pasta_item, inclusive arte já removida da postagem
-- (54 em "Posts Confirmados") e a mesma arte repetida em duas postagens (mesmo caminho
-- no Storage; a lista mostra uma só). Só ACRESCENTA: mesma assinatura e mesmo retorno
-- de social_pastas_listar, com `n_itens` corrigido e `n_itens_todos` (a conta bruta,
-- que arquivar pasta continua usando para saber se há conteúdo).
-- Depende de 20261019_social_pastas.sql e 20261023_social_biblioteca_apagar.sql.
-- ─────────────────────────────────────────────────────────────────────────────

-- "Aparece na lista por padrão?" — o mesmo critério da situação "disponível" de social_biblioteca.
create or replace function public.social_item_disponivel(p_tipo text, p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case p_tipo
    when 'arte' then exists (select 1 from public.redes_arquivos a where a.id = p_id and a.bucket = 'redes' and a.removido_em is null)
    when 'foto_combo' then exists (select 1 from public.midias_participacao m where m.id = p_id and m.papel <> 'loja' and m.estado not in ('recusada', 'substituida', 'removida'))
    when 'foto_loja' then exists (select 1 from public.midias_participacao m where m.id = p_id and m.papel = 'loja' and m.estado not in ('recusada', 'substituida', 'removida'))
    when 'logo' then exists (select 1 from public.logos_marca l join public.participantes pt on pt.id = l.participante_id
                              where l.id = p_id and (l.id = pt.logo_id or exists (select 1 from public.participacoes x where x.logo_id = l.id)))
    else public.social_item_existe(p_tipo, p_id) end
$$;
revoke all on function public.social_item_disponivel(text, uuid) from public, anon, authenticated;

create or replace function public.social_pastas_listar(p_secret text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public.redes_exigir(p_secret, 'redes.ver');
  return jsonb_build_object(
    'pastas', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id, 'pai_id', p.pai_id, 'nome', p.nome, 'edicao_codigo', p.edicao_codigo,
               'participante_id', p.participante_id, 'participante_nome', pt.nome_marca,
               'criada_em', p.criada_em, 'criada_por_rotulo', p.criada_por_rotulo, 'atualizada_em', p.atualizada_em,
               -- o que a pasta MOSTRA: arte disponível (uma por arquivo no Storage) e o resto disponível
               'n_itens', (select count(*) from (
                             select 'arte:' || a.path as k
                               from public.social_biblioteca_pasta_item i
                               join public.redes_arquivos a on i.tipo = 'arte' and a.id = i.item_id and a.bucket = 'redes' and a.removido_em is null
                              where i.pasta_id = p.id
                             union
                             select i.tipo || ':' || i.item_id::text
                               from public.social_biblioteca_pasta_item i
                              where i.pasta_id = p.id and i.tipo <> 'arte' and public.social_item_disponivel(i.tipo, i.item_id)) z),
               -- a conta bruta (inclui apagadas): é ela que decide se arquivar a pasta pede confirmação
               'n_itens_todos', (select count(*) from public.social_biblioteca_pasta_item i where i.pasta_id = p.id),
               'n_pastas', (select count(*) from public.social_pastas f where f.pai_id = p.id and f.arquivada_em is null))
             order by lower(p.nome))
        from public.social_pastas p left join public.participantes pt on pt.id = p.participante_id
       where p.arquivada_em is null), '[]'::jsonb),
    'pode_organizar', public.pode(p_secret, 'redes.gerir'));
end $$;
