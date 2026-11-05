-- Caça aos Carimbos, sorteio final com semente comprometida (migration 20261212; achado CACA-SEC-07). Roda DEPOIS da migration,
-- numa transação, e SEMPRE termina em exceção: TESTE_OK = passou; nada fica no banco. Troca public.pode só dentro da transação.
-- Não precisa de concorrentes: testa o compromisso, o travamento e o rastro da simulação. O cálculo dos ganhadores é o de
-- supabase/testes/caca-premiacao.sql (que também precisa do compromisso para o sorteio real).
create or replace function public.pode(p_secret text default null, p_acao text default 'dado.ler') returns boolean language sql as $f$ select true $f$;

do $t$
declare
  ed constant text := '2026.2';
  v_sem constant text := 'semente-publica-123';
  v_hash text := encode(extensions.digest('semente-publica-123', 'sha256'), 'hex');
  r jsonb; v_erro text; v_antes int; v_depois int;
begin
  update public.edicao_publicacao set fase = 'em_andamento', avaliacao_aberta = true,
         avaliacao_abre_em = now() - interval '2 days', avaliacao_fecha_em = now() + interval '1 day' where edicao_codigo = ed;
  if (select count(*) from public.caca_evento where edicao_codigo = ed and acao = 'sorteio_semente_comprometida') <> 0 then
    raise exception 'já existe compromisso real nesta edição; o teste não vale mais'; end if;

  -- 1. Simulação deixa rastro (só o hash da semente), não cria prêmio e não revela a semente no evento.
  select count(*) into v_antes from public.caca_evento where edicao_codigo = ed and acao = 'sorteio_simulado';
  r := public.caca_sorteio_final('x', ed, v_sem, true);
  select count(*) into v_depois from public.caca_evento where edicao_codigo = ed and acao = 'sorteio_simulado';
  if v_depois <> v_antes + 1 then raise exception 'simulação sem rastro'; end if;
  if exists (select 1 from public.caca_evento e where e.acao = 'sorteio_simulado' and e.depois::text like '%' || v_sem || '%') then raise exception 'semente em claro no rastro'; end if;
  if not exists (select 1 from public.caca_evento e where e.acao = 'sorteio_simulado' and e.depois ->> 'semente_hash' = v_hash and not (e.depois ->> 'comprometida')::boolean)
    then raise exception 'rastro da simulação'; end if;
  if exists (select 1 from public.caca_premio where edicao_codigo = ed and tipo = 'final') then raise exception 'simulação criou prêmio'; end if;

  -- 2. Sorteio real antes de a avaliação fechar: recusado (mesmo com semente).
  begin perform public.caca_sorteio_final('x', ed, v_sem, false); v_erro := null; exception when others then v_erro := sqlerrm; end;
  if v_erro is distinct from 'avaliacao_ainda_aberta' then raise exception 'real antes do fechamento: %', v_erro; end if;

  -- 3. Compromisso: hash inválido, depois do fechamento (tardio), no prazo; uma vez só.
  begin perform public.caca_sorteio_comprometer('x', ed, 'nao-e-hash'); v_erro := null; exception when others then v_erro := sqlerrm; end;
  if v_erro is distinct from 'hash_invalido' then raise exception 'hash inválido aceito: %', v_erro; end if;
  update public.edicao_publicacao set avaliacao_fecha_em = now() - interval '1 minute', avaliacao_abre_em = now() - interval '2 days' where edicao_codigo = ed;
  begin perform public.caca_sorteio_comprometer('x', ed, v_hash); v_erro := null; exception when others then v_erro := sqlerrm; end;
  if v_erro is distinct from 'compromisso_tardio' then raise exception 'compromisso depois do fechamento: %', v_erro; end if;
  update public.edicao_publicacao set avaliacao_fecha_em = now() + interval '1 day' where edicao_codigo = ed;
  r := public.caca_sorteio_comprometer('x', ed, upper(v_hash));
  if not (r ->> 'ok')::boolean or r ->> 'hash' <> v_hash then raise exception 'compromisso: %', r; end if;
  begin perform public.caca_sorteio_comprometer('x', ed, encode(extensions.digest('outra', 'sha256'), 'hex')); v_erro := null; exception when others then v_erro := sqlerrm; end;
  if v_erro is distinct from 'compromisso_ja_registrado' then raise exception 'segundo compromisso aceito: %', v_erro; end if;

  -- 4. Simulação com a semente comprometida é marcada como tal; com outra, não.
  perform public.caca_sorteio_final('x', ed, v_sem, true);
  perform public.caca_sorteio_final('x', ed, 'outra-semente', true);
  if (select count(*) from public.caca_evento e where e.edicao_codigo = ed and e.acao = 'sorteio_simulado' and (e.depois ->> 'comprometida')::boolean) <> 1
    then raise exception 'marcação de comprometida'; end if;

  -- 5. Depois do fechamento: semente diferente da comprometida é recusada; a comprometida roda e grava o desfecho com a semente revelada.
  update public.edicao_publicacao set avaliacao_fecha_em = now() - interval '1 minute' where edicao_codigo = ed;
  begin perform public.caca_sorteio_final('x', ed, 'outra-semente', false); v_erro := null; exception when others then v_erro := sqlerrm; end;
  if v_erro is distinct from 'semente_nao_comprometida' then raise exception 'semente trocada aceita: %', v_erro; end if;
  r := public.caca_sorteio_final('x', ed, '  ' || v_sem || '  ', false);
  if (r ->> 'simulacao')::boolean then raise exception 'deveria ser o sorteio real: %', r; end if;
  if not exists (select 1 from public.caca_evento e where e.edicao_codigo = ed and e.acao = 'sorteio_final_realizado' and e.depois ->> 'semente' = v_sem)
    then raise exception 'desfecho sem a semente revelada'; end if;

  -- 6. Privilégios: compromisso é RPC de painel (secret); a leitura interna é fechada.
  if not has_function_privilege('anon', 'public.caca_sorteio_comprometer(text,text,text)', 'execute') or has_function_privilege('anon', 'public.caca_sorteio_compromisso(text)', 'execute')
    then raise exception 'privilégios do compromisso'; end if;

  raise exception 'TESTE_OK';
end $t$;
