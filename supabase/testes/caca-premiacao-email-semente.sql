-- Caça aos Carimbos, premiação coerente com o regulamento (migration 20261218; achados C06 e C03). Roda DEPOIS da migration, numa
-- transação, e SEMPRE termina em exceção: TESTE_OK = passou; nada fica no banco. Troca public.pode só aqui dentro.
create or replace function public.pode(p_secret text default null, p_acao text default 'dado.ler') returns boolean language sql as $f$ select true $f$;

do $t$
declare
  ed constant text := '2026.2';
  k text; id1 uuid; id2 uuid; id3 uuid; id4 uuid; r jsonb; h text := repeat('ab', 32);
begin
  -- C06: 'confirmar' prêmio de pessoa SEM e-mail confirmado é recusado; cancelar/expirar continuam possíveis.
  insert into public.caca_premio (edicao_codigo, tipo, pessoa, apelido, posicao) values (ed, 'final', 'sem-confirmar@exemplo.com.br', 'Sem', 1) returning id into id1;
  begin
    perform public.caca_premio_acao('x', id1, 'confirmar'); raise exception 'confirmou sem e-mail confirmado';
  exception when others then if sqlerrm <> 'email_nao_confirmado' then raise; end if; end;
  if (select estado from public.caca_premio where id = id1) <> 'selecionado' then raise exception 'estado mudou apesar do erro'; end if;
  k := public.mapa_criar_v2(ed, 'Sem', 'sem-confirmar@exemplo.com.br', null, false, true) ->> 'chave';
  begin
    perform public.caca_premio_acao('x', id1, 'confirmar'); raise exception 'mapa não confirmado serviu';
  exception when others then if sqlerrm <> 'email_nao_confirmado' then raise; end if; end;
  r := public.caca_premio_acao('x', id1, 'cancelar', 'teste');
  if r -> 'premio' ->> 'estado' <> 'cancelado' then raise exception 'cancelar: %', r; end if;

  -- C06 (20261217_caca_carimbo_premio_correcao): exceção explícita e auditada, com nota. Só 'confirmar' e 'entregar' têm versão _excecao.
  insert into public.caca_premio (edicao_codigo, tipo, pessoa, apelido, posicao) values (ed, 'final', 'sem-mapa@exemplo.com.br', 'SemMapa', 3) returning id into id3;
  begin
    perform public.caca_premio_acao('x', id3, 'confirmar_excecao'); raise exception 'exceção sem nota aceita';
  exception when others then if sqlerrm <> 'nota_obrigatoria' then raise; end if; end;
  begin
    perform public.caca_premio_acao('x', id3, 'confirmar_excecao', 'curta'); raise exception 'exceção com nota curta aceita';
  exception when others then if sqlerrm <> 'nota_obrigatoria' then raise; end if; end;
  begin
    perform public.caca_premio_acao('x', id3, 'cancelar_excecao', 'nota bem longa o bastante'); raise exception 'cancelar_excecao aceita';
  exception when others then if sqlerrm <> 'acao_invalida' then raise; end if; end;
  begin
    perform public.caca_premio_acao('x', id3, 'entregar', 'x'); raise exception 'entregou sem confirmar';
  exception when others then if sqlerrm <> 'transicao_invalida' then raise; end if; end;
  if (select estado from public.caca_premio where id = id3) <> 'selecionado' then raise exception 'erro de exceção mudou o estado'; end if;
  r := public.caca_premio_acao('x', id3, 'confirmar_excecao', 'Organizacao falou com a pessoa por telefone');
  if r -> 'premio' ->> 'estado' <> 'confirmado' then raise exception 'confirmar_excecao: %', r; end if;
  if not exists (select 1 from public.caca_evento where premio_id = id3 and acao = 'confirmar_excecao' and nota like 'Organizacao falou%') then
    raise exception 'exceção não ficou no histórico'; end if;
  -- confirmada por exceção explícita: a entrega normal passa (a nota já está no histórico)
  r := public.caca_premio_acao('x', id3, 'entregar');
  if r -> 'premio' ->> 'estado' <> 'entregue' then raise exception 'entregar depois de exceção: %', r; end if;

  -- Depois de confirmar o e-mail (código), a confirmação e a entrega seguem.
  update public.mapas_lover set email_confirmado_em = now() where chave_hash = public.mapa_hash(k);
  insert into public.caca_premio (edicao_codigo, tipo, pessoa, apelido, posicao) values (ed, 'final', 'sem-confirmar@exemplo.com.br', 'Sem', 2) returning id into id2;
  r := public.caca_premio_acao('x', id2, 'confirmar');
  if r -> 'premio' ->> 'estado' <> 'confirmado' then raise exception 'confirmar com e-mail ok: %', r; end if;
  if exists (select 1 from public.caca_evento where premio_id = id2 and acao like '%excecao') then raise exception 'ação normal virou exceção'; end if;
  -- C06: 'entregar' também exige e-mail confirmado (e-mail deixou de estar confirmado depois da confirmação do prêmio)
  update public.mapas_lover set email_confirmado_em = null where chave_hash = public.mapa_hash(k);
  begin
    perform public.caca_premio_acao('x', id2, 'entregar'); raise exception 'entregou sem e-mail confirmado';
  exception when others then if sqlerrm <> 'email_nao_confirmado' then raise; end if; end;
  begin
    perform public.caca_premio_acao('x', id2, 'entregar_excecao', 'sem nota'); raise exception 'entregar_excecao com nota curta aceita';
  exception when others then if sqlerrm <> 'nota_obrigatoria' then raise; end if; end;
  r := public.caca_premio_acao('x', id2, 'entregar_excecao', 'Entregue em mãos, contato confirmado pela organização');
  if r -> 'premio' ->> 'estado' <> 'entregue' or not exists (select 1 from public.caca_evento where premio_id = id2 and acao = 'entregar_excecao')
    then raise exception 'entregar_excecao: %', r; end if;
  -- caminho normal (e-mail confirmado): confirmar e entregar sem exceção
  perform public.mapa_criar_v2(ed, 'Com', 'com-email@exemplo.com.br', null, false, true);
  update public.mapas_lover set email_confirmado_em = now() where email_norm = 'com-email@exemplo.com.br';
  insert into public.caca_premio (edicao_codigo, tipo, pessoa, apelido, posicao) values (ed, 'final', 'com-email@exemplo.com.br', 'Com', 1) returning id into id4;
  perform public.caca_premio_acao('x', id4, 'confirmar');
  r := public.caca_premio_acao('x', id4, 'entregar');
  if r -> 'premio' ->> 'estado' <> 'entregue' then raise exception 'entregar: %', r; end if;

  -- C03: o painel enxerga o compromisso da semente.
  r := public.caca_sorteio_estado('x', ed);
  if (r ->> 'registrado')::boolean or (r ->> 'fechada')::boolean or r ->> 'hash' is not null then raise exception 'estado antes do compromisso: %', r; end if;
  perform public.caca_sorteio_comprometer('x', ed, h);
  r := public.caca_sorteio_estado('x', ed);
  if not (r ->> 'registrado')::boolean or r ->> 'hash' <> h or r ->> 'registrado_em' is null then raise exception 'estado depois do compromisso: %', r; end if;
  begin
    perform public.caca_sorteio_comprometer('x', ed, h); raise exception 'segundo compromisso aceito';
  exception when others then if sqlerrm <> 'compromisso_ja_registrado' then raise; end if; end;
  begin
    perform public.caca_sorteio_estado('x', 'edicao-que-nao-existe'); raise exception 'edicao inexistente aceita';
  exception when others then if sqlerrm <> 'edicao_desconhecida' then raise; end if; end;
  create or replace function public.pode(p_secret text default null, p_acao text default 'dado.ler') returns boolean language sql as $f$ select false $f$;
  begin
    perform public.caca_sorteio_estado('x', ed); raise exception 'estado sem permissão';
  exception when others then if sqlerrm <> 'nao_autorizado' then raise; end if; end;
  create or replace function public.pode(p_secret text default null, p_acao text default 'dado.ler') returns boolean language sql as $f$ select true $f$;
  if not has_function_privilege('anon', 'public.caca_sorteio_estado(text,text)', 'execute') then raise exception 'estado sem grant'; end if;

  raise exception 'TESTE_OK';
end $t$;
