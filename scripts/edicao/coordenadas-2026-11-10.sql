-- Correção de coordenadas de 11 unidades da edição Cartoon (2026.2), levantada em 10/11/2026.
-- APLICADO em 10/11/2026 com autorização do Wilker ("Sim, aplicar"). Conferido depois: 11/11 em `unidades` e 11/11 em
-- `publicacoes.conteudo` (vigentes); o site segue com 27 casas e 42 unidades. Não rodar de novo: a trava abaixo recusa (pontos já mudaram).
--
-- Método: cada endereço do cadastro foi conferido de duas formas independentes no Google Maps (geocodificação do endereço e
-- busca da ficha da loja pelo nome). Entram aqui só as unidades em que as duas concordam entre si e ficam a mais de 80 m
-- do ponto gravado. As outras 30 unidades ficaram a até 85 m (conferidas, sem mudança).
-- O ponto novo é o da ficha da loja no Google (Places). Distância = do ponto antigo ao novo.
--
--   unidade (id público)                      antigo                     novo                      distância
--   Caroli Douces · Potengi (uf8dd0a)         -5.748108, -35.251767  →  -5.753918, -35.252680      654 m
--   Caroli Douces · Lagoa Nova (u24103b)      -5.818330, -35.205481  →  -5.820052, -35.205502      192 m
--   Caroli Douces · Lagoa Seca (u0d8345)      -5.804935, -35.211303  →  -5.805789, -35.211218       95 m
--   Cookitos · Shopping Cidade Jardim (u46e59a) -5.857872, -35.195853 → -5.850903, -35.205505    1319 m
--   Jolie · Capim Macio (u0d211b)             -5.845396, -35.206951  →  -5.847233, -35.206695      206 m
--   Jolie · Cidade Verde (u57aa68)            -5.895179, -35.198426  →  -5.896640, -35.198212      164 m
--   Jolie · Lagoa Nova (ude02a2)              -5.819525, -35.216394  →  -5.821220, -35.216090      191 m
--   Jolie · Petrópolis (uc37fb8)              -5.785277, -35.197593  →  -5.786602, -35.196908      166 m
--   Paneer · Capim Macio (u261914)            -5.854719, -35.199028  →  -5.858627, -35.198689      436 m  (mesmo prédio da Wow Cookies, Rua Neuza Farache 1870)
--   Paneer · Tirol, Espaço Casa 893 (u63fda6) -5.789815, -35.198352  →  -5.793373, -35.198957      401 m
--   Paneer · Lagoa Nova (u077655)             -5.818001, -35.222216  →  -5.820908, -35.221962      325 m
--
-- Desfazer: o bloco "VOLTAR" no fim troca os valores de volta.

begin;

create temp table _coord (unidade uuid primary key, lat numeric, lng numeric, lat_antiga numeric, lng_antiga numeric) on commit drop;
insert into _coord values
  ('54fa4b1c-9673-4512-9b19-941f569c4c72', -5.753918, -35.252680, -5.748108, -35.251767),
  ('6ba18728-fbef-45c6-afde-4f36376a39e2', -5.820052, -35.205502, -5.818330, -35.205481),
  ('3b5fd1a0-9ea6-42f1-89b4-be86196bf859', -5.805789, -35.211218, -5.804935, -35.211303),
  ('ae8a7aba-8f6c-43e7-abe7-7f09c598446b', -5.850903, -35.205505, -5.857872, -35.195853),
  ('d39c10e8-c045-463d-ba40-90060ac189a5', -5.847233, -35.206695, -5.845396, -35.206951),
  ('e08453ea-3bc5-4ba0-ab96-579dcd7b356f', -5.896640, -35.198212, -5.895179, -35.198426),
  ('bcb5fa31-9211-457f-b4c7-34a2771091f1', -5.821220, -35.216090, -5.819525, -35.216394),
  ('2b7fee0d-9a6a-478e-b79c-a8ab401f5d69', -5.786602, -35.196908, -5.785277, -35.197593),
  ('94fb9d1c-212c-49e9-8554-9286ad8378d9', -5.858627, -35.198689, -5.854719, -35.199028),
  ('fc3d8071-57d8-4374-90f5-a6a198206d81', -5.793373, -35.198957, -5.789815, -35.198352),
  ('e36ca8aa-3cb5-4ee5-b05f-556b54fac1bd', -5.820908, -35.221962, -5.818001, -35.222216);

-- Trava: só segue se cada unidade ainda estiver com o ponto antigo (ninguém mexeu desde a conferência).
do $$ begin
  if (select count(*) from public.unidades u join _coord c on c.unidade = u.id where u.lat = c.lat_antiga and u.lng = c.lng_antiga) <> 11 then
    raise exception 'unidades mudaram desde a conferência de 10/11: rever antes de aplicar';
  end if;
end $$;

-- 1) Cadastro (painel).
update public.unidades u set lat = c.lat, lng = c.lng, coordenada_verificada_em = now(), coordenada_verificada_por = 'Google Maps (ficha da loja), conferido em 10/11/2026'
  from _coord c where c.unidade = u.id;

-- 2) Conteúdo publicado (o que o site lê): troca só `coordenada` da unidade, nada mais do JSON.
update public.publicacoes pb set conteudo = jsonb_set(pb.conteudo, '{unidades}', (
    select jsonb_agg(case when m.id_publico is not null then jsonb_set(x, '{coordenada}', jsonb_build_object('lat', m.lat, 'lng', m.lng)) else x end order by ord)
      from jsonb_array_elements(pb.conteudo -> 'unidades') with ordinality e(x, ord)
      left join (select pu.id_publico, c.lat, c.lng from public.participacao_unidades pu join _coord c on c.unidade = pu.unidade_id) m on m.id_publico = x ->> 'id'))
 where pb.vigente and exists (
   select 1 from jsonb_array_elements(pb.conteudo -> 'unidades') x
     join public.participacao_unidades pu on pu.id_publico = x ->> 'id' join _coord c on c.unidade = pu.unidade_id);

commit;

-- VOLTAR (desfaz as duas partes):
-- begin;
-- create temp table _coord (...mesmos valores acima...) on commit drop;
-- update public.unidades u set lat = c.lat_antiga, lng = c.lng_antiga from _coord c where c.unidade = u.id;
-- (e o mesmo update de publicacoes usando lat_antiga/lng_antiga)
-- commit;
