-- Teste de 20261201 (voucher virtual). Não deixa rastro: termina em exceção. Esperado: "TESTE_OK".
-- Rodar DEPOIS de aplicar a migration. Precisa de 1 participação qualquer na edição atual.
do $$
declare
  pa uuid; ed text; tok text; r jsonb; falhou boolean := false; cota_fisica_antes int; cota_fisica_depois int;
begin
  select p.id, p.edicao_codigo into pa, ed from public.participacoes p where p.edicao_codigo = public.edicao_atual() limit 1;
  if pa is null then raise exception 'preparo: sem participação na edição atual'; end if;

  -- Virtual sem token não pode existir; impresso com token também não.
  begin
    insert into public.vouchers (codigo, edicao_codigo, participacao_id, canal) values (public.novo_codigo_voucher(), ed, pa, 'virtual');
  exception when check_violation then falhou := true; end;
  if not falhou then raise exception 'virtual sem token foi aceito'; end if;
  falhou := false;
  begin
    insert into public.vouchers (codigo, edicao_codigo, participacao_id, canal, link_token)
    values (public.novo_codigo_voucher(), ed, pa, 'fisico', 'abcdefgh2345');
  exception when check_violation then falhou := true; end;
  if not falhou then raise exception 'impresso com token foi aceito'; end if;

  -- O token é novo, tem o formato certo e o virtual não entra na conta dos impressos.
  select count(*) into cota_fisica_antes from public.vouchers where participacao_id = pa and canal = 'fisico' and status <> 'cancelado';
  tok := public.novo_token_voucher();
  if tok !~ '^[a-hjkmnp-z2-9]{12}$' then raise exception 'token fora do formato: %', tok; end if;
  insert into public.vouchers (codigo, edicao_codigo, participacao_id, canal, link_token, status)
  values (public.novo_codigo_voucher(), ed, pa, 'virtual', tok, 'enviado');
  select count(*) into cota_fisica_depois from public.vouchers where participacao_id = pa and canal = 'fisico' and status <> 'cancelado';
  if cota_fisica_antes <> cota_fisica_depois then raise exception 'virtual mexeu na conta dos impressos'; end if;

  -- A página pública: válido, depois usado; token desconhecido, curto e nulo viram null.
  r := public.voucher_virtual_ver(tok);
  if r is null or r ->> 'estado' <> 'valido' or r ->> 'codigo' !~ '^SCW-' or coalesce(r ->> 'marca', '') = '' then
    raise exception 'ver válido falhou: %', r;
  end if;
  update public.vouchers set status = 'utilizado', utilizado_em = now() where link_token = tok;
  if (public.voucher_virtual_ver(tok) ->> 'estado') <> 'usado' then raise exception 'ver usado falhou'; end if;
  update public.vouchers set status = 'cancelado', utilizado_em = null where link_token = tok;
  if (public.voucher_virtual_ver(tok) ->> 'estado') <> 'cancelado' then raise exception 'ver cancelado falhou'; end if;
  if public.voucher_virtual_ver('zzzzzzzzzzzz') is not null then raise exception 'token desconhecido devolveu algo'; end if;
  if public.voucher_virtual_ver('curto') is not null or public.voucher_virtual_ver(null) is not null then raise exception 'token ruim devolveu algo'; end if;

  -- O código SCW-XXXXX não abre a página: só o token abre.
  if public.voucher_virtual_ver((select codigo from public.vouchers where link_token = tok)) is not null then
    raise exception 'o código abriu a página pública';
  end if;

  raise exception 'TESTE_OK';
end $$;
