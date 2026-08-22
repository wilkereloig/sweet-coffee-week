-- ═══════════════════════════════════════════════════════════════════════════
-- Apagar um registro pelo painel da organização
--
-- Pedido do Eloi em 22/08/2026: o painel só sabia mudar status e anotar. Para
-- teste enviado por engano, duplicata e candidatura que a marca pediu para
-- remover, faltava a saída.
--
-- DUAS DECISÕES QUE O DESENHO CARREGA:
--
-- 1. É APAGAR DE VERDADE, não `deleted_at`. O caso de uso principal é o direito
--    do titular de pedir remoção (LGPD) — e "marquei como apagado" não atende
--    pedido de exclusão, só esconde da tela. Soft delete aqui seria fingir.
--
-- 2. A AUDITORIA NÃO GUARDA O DADO PESSOAL. Registrar nome e e-mail de quem foi
--    apagado devolveria pela porta dos fundos exatamente o que a exclusão tirou.
--    Fica o que responde "o que aconteceu aqui?" sem reidentificar ninguém:
--    tabela, id, status no momento e quantos dias o registro viveu.
--
-- ⛔ Candidatura com conta de participante vinculada NÃO é apagada. A FK é
--    `on delete set null`, então o banco deixaria o participante vivo e órfão,
--    sem apontar para nada — pior que os dois estados possíveis. A função
--    recusa e explica; quem quiser mesmo apagar remove a conta primeiro.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.organizacao_apagar_registro(
  p_secret text,
  p_origem text,
  p_id     uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_tabela  text;
  v_status  text;
  v_criado  timestamptz;
  v_n       int;
begin
  if not public.admin_ok(p_secret) then
    return jsonb_build_object('ok', false, 'erro', 'nao_autorizado');
  end if;

  -- Mesmo mapa de origens do organizacao_atualizar_registro. Duplicado de
  -- propósito: são duas funções `security definer` independentes, e uma tabela
  -- de apoio compartilhada viraria mais uma coisa para manter em dia.
  v_tabela := case p_origem
    when 'contato'          then 'contact_requests'
    when 'participar'       then 'participation_interests'
    when 'apoiar'           then 'support_interests'
    when 'quero_participar' then 'quero_participar'
  end;
  if v_tabela is null then
    return jsonb_build_object('ok', false, 'erro', 'origem_invalida');
  end if;

  -- ⛔ Vínculo vivo bloqueia. Ver o cabeçalho.
  if p_origem = 'quero_participar'
     and exists (select 1 from public.participantes where origem_id = p_id) then
    return jsonb_build_object('ok', false, 'erro', 'tem_conta');
  end if;

  -- Lê antes de apagar: depois do delete não há de onde tirar o contexto.
  execute format('select status, created_at from public.%I where id = $1', v_tabela)
    into v_status, v_criado using p_id;

  if v_criado is null then
    return jsonb_build_object('ok', false, 'erro', 'nao_encontrado');
  end if;

  execute format('delete from public.%I where id = $1', v_tabela) using p_id;
  get diagnostics v_n = row_count;

  if v_n = 0 then
    return jsonb_build_object('ok', false, 'erro', 'nao_encontrado');
  end if;

  -- Sem nome, sem e-mail, sem telefone: ver a decisão 2 no cabeçalho.
  insert into public.auditoria (acao, alvo_tabela, alvo_id, detalhe)
  values (
    'registro.apagado',
    v_tabela,
    p_id::text,
    jsonb_build_object(
      'origem',           p_origem,
      'status_ao_apagar', v_status,
      'dias_de_vida',     greatest(0, extract(day from (now() - v_criado))::int)
    )
  );

  return jsonb_build_object('ok', true);
end;
$function$;

-- Mesmo padrão das demais RPCs do painel: o `anon` chama, e a senha dentro da
-- função é o que decide. (A superfície disso é assunto da Fase 2, que troca a
-- senha compartilhada por conta nominal — ver o plano.)
revoke all on function public.organizacao_apagar_registro(text, text, uuid) from public;
grant execute on function public.organizacao_apagar_registro(text, text, uuid) to anon, authenticated;

comment on function public.organizacao_apagar_registro(text, text, uuid) is
  'Apaga um registro de formulário pelo painel. Recusa candidatura com conta '
  'vinculada. Audita sem guardar dado pessoal.';
