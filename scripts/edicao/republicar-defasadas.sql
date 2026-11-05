-- Republica as casas da edição 2026.2 cuja versão pública está atrás do painel.
--
-- Por que existe: o site lê o conteúdo CONGELADO em public.publicacoes. Mudou endereço, coordenada, combo ou foto
-- no painel, só aparece no site depois de republicar a casa. O botão do painel faz isso, mas APAGA casa.tema e
-- casa.logo_desenhada (montar_publico não devolve os dois). Este script republica e PRESERVA os dois.
--
-- Como usar (2 passos, na ordem):
--   1. Rode a PARTE 1 (só lê). Ela lista as casas defasadas e o que mudou. Zero linhas = tudo em dia.
--   2. Com ok do Wilker (escrita no banco), rode a PARTE 2. Ela republica só as defasadas, numa transação.
-- No Supabase (SQL Editor do projeto dgfmoibynftadsyjcclg) ou pelo Claude: "republica as defasadas".
--
-- Não mexe em: combo_status, avisos às marcas, nível (marca ou marca_e_combo continua o mesmo de cada casa).
-- Casa sem publicação vigente não entra (primeira publicação é decisão da organização, no painel).

-- ============================================================ PARTE 1 — relatório (só leitura)
with v as (
  select p.nome_marca, u.nivel, u.versao, u.conteudo, public.montar_publico(pa.id, u.nivel) as vivo
  from public.publicacoes u
  join public.participacoes pa on pa.id = u.participacao_id
  join public.participantes p on p.id = pa.participante_id
  where u.vigente and pa.edicao_codigo = '2026.2'
)
select nome_marca, nivel, versao as versao_no_ar,
       concat_ws(', ',
         case when (conteudo -> 'unidades') is distinct from (vivo -> 'unidades') then 'unidades (endereço, coordenada, pedido)' end,
         case when (conteudo -> 'combo') is distinct from (vivo -> 'combo') then 'combo (itens, fotos, preço)' end,
         case when (conteudo -> 'casa' #- '{tema}' #- '{logo_desenhada}') is distinct from (vivo -> 'casa' #- '{tema}' #- '{logo_desenhada}') then 'casa (nome, logo, links)' end
       ) as o_que_mudou
from v
where (conteudo #- '{casa,tema}' #- '{casa,logo_desenhada}') is distinct from (vivo #- '{casa,tema}' #- '{casa,logo_desenhada}')
order by nome_marca;

-- ============================================================ PARTE 2 — republicar (ESCREVE; só com ok do Wilker)
do $$
declare r record; novo jsonb; n int := 0;
begin
  for r in
    select u.id as pub_id, u.participacao_id as pid, u.versao, u.nivel, u.conteudo
    from public.publicacoes u
    join public.participacoes pa on pa.id = u.participacao_id
    where u.vigente and pa.edicao_codigo = '2026.2'
    order by u.participacao_id
    for update of u
  loop
    novo := public.montar_publico(r.pid, r.nivel);
    if (r.conteudo #- '{casa,tema}' #- '{casa,logo_desenhada}') is distinct from (novo #- '{casa,tema}' #- '{casa,logo_desenhada}') then
      -- tema e logo desenhada não vêm de montar_publico: vêm da versão que estava no ar.
      novo := jsonb_set(novo, '{casa}', (novo -> 'casa') || jsonb_strip_nulls(jsonb_build_object(
        'tema', r.conteudo -> 'casa' -> 'tema', 'logo_desenhada', r.conteudo -> 'casa' -> 'logo_desenhada')));
      update public.publicacoes set vigente = false where id = r.pub_id;
      insert into public.publicacoes (participacao_id, versao, nivel, conteudo, publicado_por)
      values (r.pid, r.versao + 1, r.nivel, novo, 'Claude (republicar-defasadas, ordem do Wilker)');
      n := n + 1;
    end if;
  end loop;
  raise notice 'casas republicadas: %', n;
end $$;
