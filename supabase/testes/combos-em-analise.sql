-- get_combos_em_analise: só quem decide curadoria lê; devolve o combo, o tema, os itens e "desde" de cada combo em análise.
-- Termina em exceção (TESTE_OK) para desfazer tudo. Usa a conta de um administrador real só para a identidade da sessão.
do $t$
declare v jsonb; ok boolean := false; c jsonb;
begin
  -- 1 · sem login nem senha: recusa
  begin perform public.get_combos_em_analise('segredo-errado'); exception when others then ok := sqlerrm = 'nao_autorizado'; end;
  if not ok then raise exception 'FALHA 1: sem login devia recusar'; end if;

  -- 2 · com a sessão de quem tem curadoria.decidir: lista, e cada item traz o que a tela precisa
  perform set_config('request.jwt.claims',
    '{"sub":"' || (select pf.user_id from public.perfis pf join public.permissoes pm on pm.funcao = pf.funcao
                    where pm.acao = 'curadoria.decidir' and pf.papel = 'organizacao' and pf.ativo
                      and pf.bloqueado_em is null and not pf.deve_trocar_senha limit 1) || '","role":"authenticated"}', true);
  v := public.get_combos_em_analise(null);
  if jsonb_typeof(v) <> 'array' then raise exception 'FALHA 2: devia ser lista'; end if;
  for c in select * from jsonb_array_elements(v) loop
    if c ->> 'participacao_id' is null or c ->> 'nome_marca' is null or c ->> 'desde' is null
       or jsonb_typeof(c -> 'itens') <> 'array' then
      raise exception 'FALHA 2: item sem campo obrigatório: %', c;
    end if;
  end loop;

  -- 3 · a lista é exatamente o que o cartão conta: combo em análise, marca ativa, participação não encerrada
  if jsonb_array_length(v) <> (select count(*) from public.participacoes pa join public.participantes p on p.id = pa.participante_id
                                where pa.combo_status = 'em_analise' and pa.status_cadastro is distinct from 'encerrado' and p.arquivado_em is null) then
    raise exception 'FALHA 3: tamanho da lista diferente do que o cartão conta';
  end if;

  raise exception 'TESTE_OK';
end $t$;
