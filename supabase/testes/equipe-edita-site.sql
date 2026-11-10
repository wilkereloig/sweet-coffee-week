-- Teste de 20270116 (equipe edita o que o site mostra). Não deixa rastro: termina em exceção. Esperado: "TESTE_OK".
-- Precisa de 1 administrador ativo (conta pessoal) e de 1 participação com unidade que participa e itens.
do $$
declare
  adm uuid; pa uuid; pu uuid; part uuid; it uuid; sub uuid; n int; j jsonb; msg text; pub jsonb;
begin
  select user_id into adm from public.perfis
   where funcao = 'administrador' and papel = 'organizacao' and ativo and bloqueado_em is null and not deve_trocar_senha limit 1;
  select pu_.id, pu_.participacao_id, pa_.participante_id into pu, pa, part
    from public.participacao_unidades pu_ join public.participacoes pa_ on pa_.id = pu_.participacao_id
   where pu_.participa and pa_.status_cadastro <> 'encerrado'
     and exists (select 1 from public.participantes_itens i where i.participacao_id = pa_.id and i.posicao = 1)
   order by pu_.id limit 1;
  if adm is null or pu is null then raise exception 'preparo: faltou administrador ou unidade'; end if;
  select id into it from public.participantes_itens where participacao_id = pa and posicao = 1;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', adm, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', adm::text, true);
  set local role authenticated;

  -- A. apresentação da casa
  perform public.org_salvar_participante(null, part, '{"apresentacao_publica":"Texto da equipe."}'::jsonb);
  if (select apresentacao_publica from public.participantes where id = part) <> 'Texto da equipe.' then raise exception 'A apresentacao'; end if;

  -- B. unidade: endereço completo, WhatsApp e atendimento; o espelho acompanha
  perform public.org_salvar_unidade_site(null, pa, pu, jsonb_build_object(
    'nome_unidade', 'Loja teste', 'logradouro', 'Rua A', 'numero', '10', 'bairro', 'Tirol', 'cidade', 'Natal', 'uf', 'rn',
    'cep', '59020-000', 'whatsapp_publico', '84999998888', 'consumo_local', 'sim', 'retirada', 'nao',
    'delivery_combo', 'nao_informado', 'faz_delivery', true, 'delivery_taxa', 'R$ 5', 'delivery_regioes', 'Tirol'));
  reset role;
  if not exists (select 1 from public.unidades u join public.participacao_unidades x on x.unidade_id = u.id
                  where x.id = pu and u.nome_unidade = 'Loja teste' and u.uf = 'RN' and u.cep = '59020000'
                    and u.whatsapp_publico = '84999998888' and u.whatsapp_autorizado) then raise exception 'B unidade'; end if;
  if not exists (select 1 from public.participacao_unidades where id = pu and endereco = 'Rua A, 10' and bairro = 'Tirol'
                  and faz_delivery and delivery_taxa = 'R$ 5' and consumo_local = 'sim') then raise exception 'B espelho'; end if;
  set local role authenticated;
  begin
    perform public.org_salvar_unidade_site(null, pa, pu, '{"horario_festival":[]}'::jsonb);
    raise exception 'B2 devia recusar chave desconhecida';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'campo_invalido' then raise; end if; end;

  -- C. alimentar: item + troca com declarações; o site (montar_publico) passa a mostrar
  perform public.org_salvar_alimentar(null, pa, jsonb_build_object('itens', jsonb_build_array(jsonb_build_object(
    'item_id', it,
    'declaracoes', jsonb_build_object('gluten', jsonb_build_object('estado', 'contem'), 'vegano', jsonb_build_object('estado', 'nao')),
    'trocas', jsonb_build_array(jsonb_build_object('alternativa', 'Versão sem leite', 'descricao', 'Feita sem leite.',
       'disponibilidade', 'sempre', 'declaracoes', jsonb_build_object('leite', jsonb_build_object('estado', 'nao_contem'),
                                                                        'vegano', jsonb_build_object('estado', 'sim'))))))));
  reset role;
  if (select estado from public.declaracoes_alimentares where item_id = it and aspecto = 'gluten') <> 'contem' then raise exception 'C1'; end if;
  select id into sub from public.substituicoes where item_id = it and alternativa = 'Versão sem leite';
  if sub is null or (select estado from public.declaracoes_alimentares where substituicao_id = sub and aspecto = 'vegano') <> 'sim' then raise exception 'C2'; end if;
  pub := public.montar_publico(pa, 'marca_e_combo');
  if pub::text not like '%Versão sem leite%' then raise exception 'C3 o site não mostra a troca'; end if;
  -- "outro" sem dizer qual não grava; estado vazio não mexe
  set local role authenticated;
  perform public.org_salvar_alimentar(null, pa, jsonb_build_object('itens', jsonb_build_array(jsonb_build_object(
    'item_id', it, 'declaracoes', jsonb_build_object('outro_alergenico', jsonb_build_object('estado', 'contem'), 'ovo', jsonb_build_object('estado', ''))))));
  reset role;
  if exists (select 1 from public.declaracoes_alimentares where item_id = it and aspecto in ('outro_alergenico', 'ovo') and estado <> 'nao_informado') then raise exception 'C4'; end if;
  if (select count(*) from public.substituicoes where item_id = it) <> 1 then raise exception 'C5 trocas ausentes do envio devem ficar'; end if;
  -- lista de trocas vazia remove a troca e as declarações dela
  set local role authenticated;
  perform public.org_salvar_alimentar(null, pa, jsonb_build_object('itens', jsonb_build_array(jsonb_build_object('item_id', it, 'trocas', '[]'::jsonb))));
  reset role;
  if exists (select 1 from public.substituicoes where item_id = it) or exists (select 1 from public.declaracoes_alimentares where substituicao_id = sub) then raise exception 'C6'; end if;

  -- D. quem não é da organização não grava
  perform set_config('request.jwt.claims', jsonb_build_object('role', 'anon')::text, true);
  perform set_config('request.jwt.claim.sub', '', true);
  set local role anon;
  begin
    perform public.org_salvar_alimentar('x', pa, '{}'::jsonb);
    raise exception 'D devia recusar';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'nao_autorizado' then raise; end if; end;
  reset role;

  raise exception 'TESTE_OK';
end $$;
