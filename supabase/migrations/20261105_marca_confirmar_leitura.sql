-- ─────────────────────────────────────────────────────────────────────────────
-- Arquivo SUBSTITUÍDO volta a pedir a confirmação de leitura (pedido do Wilker, 23/10/2026).
--
-- Antes: `substituir_arquivo` sobe a versão e renova `arquivos.publicado_em`, mas `arquivo_leitura` ficava como estava
-- (a marca só pode INSERIR ali; update/delete revogados) e o painel gravava com `resolution=ignore-duplicates`: a
-- confirmação da versão antiga valia para a nova, e "N confirmaram" da organização contava quem leu a versão anterior.
--
-- Agora:
--  1. `marca_confirmar_leitura(p_arquivo, p_participacao)` (SECURITY DEFINER): o único caminho de gravação do painel da
--     marca. Confere conta ativa, dono da participação (a MESMA regra da policy `leitura_marca_registra`), arquivo
--     publicado, não arquivado e visível àquela participação (geral ou dela). Primeira vez: insere. Já confirmada ESTA
--     versão: não faz nada. Confirmada uma versão anterior: renova `lido_em` (e `user_id`). Devolve `{ lido_em }`.
--  2. `get_arquivos_admin`: "N confirmaram" (`leituras`) conta só leitura da versão atual. Mesma assinatura e colunas.
--
-- Versão atual = `lido_em >= publicado_em - 1 min`: a MESMA tolerância de `publicadoDepoisDaLeitura`
-- (painel-app/src/lib/arquivosMarca.js) — se o banco e a tela divergissem, uma substituição feita segundos depois da
-- leitura deixaria a marca sem o botão e a organização vendo "não confirmou" para sempre.
--
-- Sem `delete from`; nenhuma linha antiga de `arquivo_leitura` muda nesta migration. A policy de INSERT direto continua
-- (o painel antigo em aparelhos ainda não atualizados segue gravando a primeira leitura).
-- Teste: supabase/testes/marca-confirmar-leitura.sql · Reversão: supabase/reverter/20261105_marca_confirmar_leitura.sql
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.marca_confirmar_leitura(p_arquivo uuid, p_participacao uuid)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_publicado timestamptz;
  v_lido timestamptz;
begin
  -- "Ver como participante" nunca grava (o painel já recusa antes; isto é a segunda trava).
  if public.ver_como_ativo() then raise exception 'modo_visualizacao'; end if;
  if not public.conta_ativa() then raise exception 'nao_autorizado'; end if;
  if not exists (select 1 from public.participacoes pa join public.participantes p on p.id = pa.participante_id
                  where pa.id = p_participacao and p.user_id = auth.uid()) then
    raise exception 'participacao_invalida';
  end if;

  select a.publicado_em into v_publicado
    from public.arquivos a
   where a.id = p_arquivo and a.publicado_em is not null and not a.arquivado
     and (a.escopo = 'geral' or a.participacao_id = p_participacao);
  if not found then raise exception 'arquivo_nao_encontrado'; end if;

  insert into public.arquivo_leitura as l (arquivo_id, participacao_id, lido_em, user_id)
  values (p_arquivo, p_participacao, now(), auth.uid())
  on conflict (arquivo_id, participacao_id) do update
     set lido_em = now(), user_id = auth.uid()
   where l.lido_em < v_publicado - interval '1 minute';   -- só renova a leitura de uma versão anterior

  select l.lido_em into v_lido from public.arquivo_leitura l
   where l.arquivo_id = p_arquivo and l.participacao_id = p_participacao;
  return jsonb_build_object('lido_em', v_lido);
end $function$;

revoke all on function public.marca_confirmar_leitura(uuid, uuid) from public, anon, authenticated;
grant execute on function public.marca_confirmar_leitura(uuid, uuid) to authenticated;

create or replace function public.get_arquivos_admin(p_secret text)
 returns table(id uuid, escopo text, nome text, descricao text, versao text, path text, publicado_em timestamp with time zone, arquivado boolean, exige_leitura boolean, marca text, leituras bigint, categoria text, mime text, tamanho bigint, participacao_id uuid, created_at timestamp with time zone)
 language sql stable security definer set search_path to 'public'
as $function$
  select a.id, a.escopo, a.nome, a.descricao, a.versao, a.path,
         a.publicado_em, a.arquivado, a.exige_leitura,
         p.nome_marca,
         -- só quem confirmou a versão ATUAL (a mesma tolerância de 1 min de marca_confirmar_leitura)
         (select count(*) from public.arquivo_leitura l
           where l.arquivo_id = a.id and (a.publicado_em is null or l.lido_em >= a.publicado_em - interval '1 minute')),
         a.categoria, a.mime, a.tamanho, a.participacao_id, a.created_at
    from public.arquivos a
    left join public.participacoes pa on pa.id = a.participacao_id
    left join public.participantes p  on p.id = pa.participante_id
   where public.pode(p_secret, 'dado.ler')
   order by a.publicado_em desc nulls first;
$function$;
