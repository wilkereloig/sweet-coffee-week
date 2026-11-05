-- Um mapa por e-mail (migration 20261225). Roda DEPOIS da migration, numa transação, e sempre termina em exceção:
-- TESTE_OK = passou; nada fica no banco.
do $t$
declare ed constant text := '2026.2'; r jsonb; r2 jsonb; ch text; n int;
begin
  r := public.mapa_criar_v2(ed, 'Ana', '  UmMapa@Exemplo.com.br ', null, true, true);
  ch := r ->> 'chave';
  if ch is null or length(ch) < 30 then raise exception 'primeiro mapa deveria ser criado: %', r; end if;

  -- mesmo e-mail (maiúscula/espaço): recusa, devolve o motivo e não cria
  r2 := public.mapa_criar_v2(ed, 'Outra', 'ummapa@exemplo.com.br', '84999990000', true, true);
  if r2 ->> 'motivo' is distinct from 'email_ja_tem_mapa' or (r2 ->> 'ok')::boolean is not false or r2 ? 'chave' then raise exception 'segundo mapa deveria ser recusado sem chave: %', r2; end if;
  select count(*) into n from public.mapas_lover where edicao_codigo = ed and email_norm = 'ummapa@exemplo.com.br';
  if n <> 1 then raise exception 'deveria haver 1 mapa, há %', n; end if;

  -- o mapa existente segue lendo, e outro e-mail cria normalmente
  if public.mapa_ler_v2(ch) is null then raise exception 'mapa existente deixou de ler'; end if;
  if public.mapa_criar_v2(ed, 'Beto', 'outroemail@exemplo.com.br', null, true, true) ->> 'chave' is null then raise exception 'outro e-mail deveria criar'; end if;

  -- apagar libera o e-mail
  perform public.mapa_apagar(ch);
  if public.mapa_criar_v2(ed, 'Ana2', 'ummapa@exemplo.com.br', null, true, true) ->> 'chave' is null then raise exception 'depois de apagar, o e-mail deveria liberar'; end if;

  -- validações anteriores seguem: e-mail ruim
  begin perform public.mapa_criar_v2(ed, 'X', 'sem-arroba', null, true, true); raise exception 'e-mail inválido passou';
  exception when others then if sqlerrm <> 'email_invalido' then raise; end if; end;

  raise exception 'TESTE_OK';
end $t$;
