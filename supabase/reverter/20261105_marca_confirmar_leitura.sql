-- =============================================================================
-- REVERSÃO da migration 20261105_marca_confirmar_leitura.
--
-- Tira `marca_confirmar_leitura` e devolve `get_arquivos_admin` à definição que estava no banco em 23/10/2026
-- (lida do banco por pg_get_functiondef antes da migration): "N confirmaram" volta a contar qualquer leitura.
--
-- ⚠️ ANTES de rodar: publicar o painel que grava a leitura direto em `arquivo_leitura` (POST com
-- `resolution=ignore-duplicates`, como até 22/10/2026). Sem a função, o painel novo não consegue confirmar a leitura
-- ("Não deu para registrar a leitura agora").
-- Dados que a reversão NÃO desfaz (de propósito): leituras renovadas pela função ficam com a hora da renovação.
-- =============================================================================

drop function if exists public.marca_confirmar_leitura(uuid, uuid);

create or replace function public.get_arquivos_admin(p_secret text)
 returns table(id uuid, escopo text, nome text, descricao text, versao text, path text, publicado_em timestamp with time zone, arquivado boolean, exige_leitura boolean, marca text, leituras bigint, categoria text, mime text, tamanho bigint, participacao_id uuid, created_at timestamp with time zone)
 language sql stable security definer set search_path to 'public'
as $function$
  select a.id, a.escopo, a.nome, a.descricao, a.versao, a.path,
         a.publicado_em, a.arquivado, a.exige_leitura,
         p.nome_marca,
         (select count(*) from public.arquivo_leitura l where l.arquivo_id = a.id),
         a.categoria, a.mime, a.tamanho, a.participacao_id, a.created_at
    from public.arquivos a
    left join public.participacoes pa on pa.id = a.participacao_id
    left join public.participantes p  on p.id = pa.participante_id
   where public.pode(p_secret, 'dado.ler')
   order by a.publicado_em desc nulls first;
$function$;
