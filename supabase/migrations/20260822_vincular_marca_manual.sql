-- ═══════════════════════════════════════════════════════════════════════════
-- Cadastro manual de participante
-- Desenho: docs/superpowers/specs/2026-08-22-cadastro-manual-participante-design.md
-- Aplicada em 22/08/2026.
--
-- Irmã de `vincular_conta_marca`, para a marca que a organização convida direto
-- e que nunca preencheu o formulário público.
--
-- ⛔ NÃO dá para reusar a outra: ela exige `p_origem` e lê tudo de
--    `quero_participar`. Aqui não existe candidatura — e criar uma silenciosa
--    só para reusar encheria a lista de inscrições com registro que ninguém
--    enviou, que é dado inventado por outro meio.
--
-- ⚠️ Sem `on conflict (origem_id)`: com `origem_id` nulo o índice único não se
--    aplica (NULLs não são iguais em Postgres), então o ON CONFLICT nunca
--    dispararia — e daria falsa sensação de proteção a quem lesse o código.
--    Quem impede duplicata é a checagem de colisão na Edge Function, ANTES de
--    criar o usuário.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.vincular_marca_manual(
  p_user        uuid,
  p_nome        text,
  p_responsavel text default null,
  p_telefone    text default null,
  p_email       text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_id uuid;
begin
  if p_user is null or coalesce(btrim(p_nome), '') = '' then
    raise exception 'dados_insuficientes';
  end if;

  -- 1. Perfil. `papel` fixo em 'marca', igual à irmã: esta função NUNCA cria
  --    organização. Nenhum erro de argumento aqui pode promover alguém.
  insert into public.perfis (user_id, papel)
       values (p_user, 'marca')
  on conflict (user_id) do update set ativo = true;

  -- 2. Participante, com `origem_id` NULO: não há candidatura de onde vir.
  insert into public.participantes
         (origem_id, user_id, nome_marca, responsavel, telefone, email,
          status_cadastro)
       values
         (null, p_user, btrim(p_nome), nullif(btrim(coalesce(p_responsavel,'')), ''),
          nullif(btrim(coalesce(p_telefone,'')), ''), nullif(lower(btrim(coalesce(p_email,''))), ''),
          'aguardando_cadastro')
    returning id into v_id;

  -- 3. Linha de operação vazia. A policy de UPDATE exige linha existente — sem
  --    ela a marca abriria o formulário e não teria onde gravar preço e
  --    unidades. Criar aqui evita conceder INSERT ao cliente.
  insert into public.participantes_operacao (participante_id)
       values (v_id)
  on conflict (participante_id) do nothing;

  -- 4. Auditoria. `origem: manual` é o que deixa o log distinguir marca que se
  --    inscreveu de marca que a organização cadastrou — sem isso as duas
  --    ficariam iguais no histórico.
  insert into public.auditoria (acao, alvo_tabela, alvo_id, detalhe)
       values ('criar_acesso_marca', 'participantes', v_id::text,
               jsonb_build_object('origem', 'manual', 'user_id', p_user));

  return v_id;
end;
$fn$;

-- Só a chave de serviço (Edge Function) chama. Nunca o navegador: criar conta
-- não é operação que possa sair de um bundle público.
revoke all on function public.vincular_marca_manual(uuid, text, text, text, text)
  from public, anon, authenticated;

comment on function public.vincular_marca_manual(uuid, text, text, text, text) is
  'Cria participante sem candidatura, para marca convidada direto pela organização.';
