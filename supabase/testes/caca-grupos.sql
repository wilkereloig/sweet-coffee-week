-- Caça aos Carimbos, grupos e rota colaborativa (migration 20261206). Roda DEPOIS da migration, numa transação, e SEMPRE
-- termina em exceção: TESTE_OK = passou; nada fica no banco (carimbos, avaliações, mapas, grupos e a publicação de casas
-- de teste vão embora no rollback). Não usa p_secret, GPS nem sorteio. Mapas de teste usam e-mails @exemplo.com.br.
do $t$
declare
  ed constant text := '2026.2';
  ca record; cb record; cc record; v_total int;
  sa text; sb text; sc text;                       -- slugs das casas A, B, C
  k_a1 text; k_a2 text; k_b text; k_c text; k_d text; k_e text; k_f text; k_h text; k_n text;   -- chaves dos mapas
  id_a1 uuid; id_a2 uuid; id_b uuid; id_c uuid; id_d uuid; id_f uuid; id_h uuid;
  r jsonb; r2 jsonb; g1 uuid; g2 uuid; tok1 text; tok2 text; tok3 text; v_carimbos int; v_ver int; mem_c uuid; mem_f uuid; mem_a uuid;
begin
  -- Publica as casas com QR (só na transação) para ter um total estável.
  insert into public.publicacoes (participacao_id, versao, nivel, conteudo, vigente)
  select distinct pa.id, 999, 'marca_e_combo', '{}'::jsonb, true
    from public.participacoes pa join public.participacao_unidades pu on pu.participacao_id = pa.id and pu.participa
    join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
   where pa.edicao_codigo = ed and pa.status_cadastro <> 'encerrado'
     and not exists (select 1 from public.publicacoes pb where pb.participacao_id = pa.id and pb.vigente);

  select distinct on (pa.id) pa.id participacao, pu.id unidade, q.codigo qr into ca
    from public.participacoes pa join public.participacao_unidades pu on pu.participacao_id = pa.id and pu.participa
    join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
   where pa.edicao_codigo = ed and pa.status_cadastro <> 'encerrado' order by pa.id limit 1;
  select distinct on (pa.id) pa.id participacao, pu.id unidade, q.codigo qr into cb
    from public.participacoes pa join public.participacao_unidades pu on pu.participacao_id = pa.id and pu.participa
    join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
   where pa.edicao_codigo = ed and pa.status_cadastro <> 'encerrado' and pa.id <> ca.participacao order by pa.id limit 1;
  select distinct on (pa.id) pa.id participacao, pu.id unidade, q.codigo qr into cc
    from public.participacoes pa join public.participacao_unidades pu on pu.participacao_id = pa.id and pu.participa
    join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
   where pa.edicao_codigo = ed and pa.status_cadastro <> 'encerrado' and pa.id not in (ca.participacao, cb.participacao) order by pa.id limit 1;
  if cc.participacao is null then raise exception 'faltam 3 casas com QR'; end if;
  select pa.slug_publico into sa from public.participacoes pa where pa.id = ca.participacao;
  select pa.slug_publico into sb from public.participacoes pa where pa.id = cb.participacao;
  select pa.slug_publico into sc from public.participacoes pa where pa.id = cc.participacao;
  v_total := public.caca_grupo_total(ed);

  -- Pessoas. A tem DOIS mapas (mesmo e-mail). B, C, F, H = integrantes. D = de fora com muito progresso. E = outro grupo. N = novato.
  k_a1 := public.mapa_criar(ed, 'Ana',  'a@exemplo.com.br', null, true, true) ->> 'chave';
  k_a2 := public.mapa_criar(ed, 'Ana2', 'a@exemplo.com.br', null, true, true) ->> 'chave';
  k_b  := public.mapa_criar(ed, 'Beto', 'b@exemplo.com.br', null, true, true) ->> 'chave';
  k_c  := public.mapa_criar(ed, 'Cris', 'c@exemplo.com.br', null, true, true) ->> 'chave';
  k_d  := public.mapa_criar(ed, 'Davi', 'd@exemplo.com.br', null, true, true) ->> 'chave';
  k_e  := public.mapa_criar(ed, 'Eva',  'e@exemplo.com.br', null, true, true) ->> 'chave';
  k_f  := public.mapa_criar(ed, 'Fabi', 'f@exemplo.com.br', null, true, true) ->> 'chave';
  k_h  := public.mapa_criar(ed, 'Hugo', 'h@exemplo.com.br', null, true, true) ->> 'chave';
  k_n  := public.mapa_criar(ed, 'Novo', 'n@exemplo.com.br', null, true, true) ->> 'chave';
  select id into id_a1 from public.mapas_lover where chave_hash = public.mapa_hash(k_a1);
  select id into id_a2 from public.mapas_lover where chave_hash = public.mapa_hash(k_a2);
  select id into id_b  from public.mapas_lover where chave_hash = public.mapa_hash(k_b);
  select id into id_c  from public.mapas_lover where chave_hash = public.mapa_hash(k_c);
  select id into id_d  from public.mapas_lover where chave_hash = public.mapa_hash(k_d);
  select id into id_f  from public.mapas_lover where chave_hash = public.mapa_hash(k_f);
  select id into id_h  from public.mapas_lover where chave_hash = public.mapa_hash(k_h);
  update public.mapas_lover set criado_em = now() - interval '10 days' where id = id_a1;   -- Ana2 fica o perfil (mais recente)

  -- Progresso (carimbo + avaliação do mesmo e-mail):
  --   A: casas A e B, com 1 extra em A (um carimbo em cada mapa)  -> 2 casas, 1 extra
  --   B: A e B                                                    -> 2 casas, 0 extras
  --   F: A e B                                                    -> 2 casas, 0 extras (empata com B)
  --   C: A                                                        -> 1 casa
  --   H: C carimbada, SEM avaliar                                 -> 0 casas (pendente)
  --   D (de fora): A, B, C + 3 extras                             -> 3 casas, líder GLOBAL
  insert into public.carimbos (mapa_id, participacao_id, participacao_unidade_id, qr_codigo, conferido, criado_em) values
    (id_a1, ca.participacao, ca.unidade, ca.qr, true, now() - interval '70 hours'),
    (id_a2, ca.participacao, ca.unidade, ca.qr, true, now() - interval '50 hours'),
    (id_a1, cb.participacao, cb.unidade, cb.qr, true, now() - interval '40 hours'),
    (id_b,  ca.participacao, ca.unidade, ca.qr, true, now() - interval '60 hours'),
    (id_b,  cb.participacao, cb.unidade, cb.qr, true, now() - interval '30 hours'),
    (id_f,  ca.participacao, ca.unidade, ca.qr, true, now() - interval '60 hours'),
    (id_f,  cb.participacao, cb.unidade, cb.qr, true, now() - interval '30 hours'),
    (id_c,  ca.participacao, ca.unidade, ca.qr, true, now() - interval '20 hours'),
    (id_h,  cc.participacao, cc.unidade, cc.qr, true, now() - interval '10 hours'),
    (id_d,  ca.participacao, ca.unidade, ca.qr, true, now() - interval '90 hours'),
    (id_d,  ca.participacao, ca.unidade, ca.qr, true, now() - interval '80 hours'),
    (id_d,  cb.participacao, cb.unidade, cb.qr, true, now() - interval '75 hours'),
    (id_d,  cb.participacao, cb.unidade, cb.qr, true, now() - interval '65 hours'),
    (id_d,  cc.participacao, cc.unidade, cc.qr, true, now() - interval '55 hours'),
    (id_d,  cc.participacao, cc.unidade, cc.qr, true, now() - interval '45 hours');
  insert into public.avaliacoes (edicao_codigo, participacao_id, nome, email_norm, notas)
  select ed, x.part, 'Teste', x.em, '{}'::jsonb
    from (values (ca.participacao, 'a@exemplo.com.br'), (cb.participacao, 'a@exemplo.com.br'),
                 (ca.participacao, 'b@exemplo.com.br'), (cb.participacao, 'b@exemplo.com.br'),
                 (ca.participacao, 'f@exemplo.com.br'), (cb.participacao, 'f@exemplo.com.br'),
                 (ca.participacao, 'c@exemplo.com.br'),
                 (ca.participacao, 'd@exemplo.com.br'), (cb.participacao, 'd@exemplo.com.br'), (cc.participacao, 'd@exemplo.com.br')
         ) x(part, em);
  select count(*) into v_carimbos from public.carimbos;

  -- 0. Tabelas fechadas e funções internas sem grant (anon não enxerga nada fora das RPCs).
  if exists (select 1 from pg_class c where c.relname in ('caca_grupo', 'caca_grupo_membro', 'caca_grupo_convite', 'caca_grupo_rota', 'caca_grupo_config')
                                         and c.relnamespace = 'public'::regnamespace and not c.relrowsecurity)
    then raise exception 'tabela sem RLS'; end if;
  if has_table_privilege('anon', 'public.caca_grupo_membro', 'select') or has_table_privilege('authenticated', 'public.caca_grupo_convite', 'select')
    then raise exception 'anon/authenticated lêem tabela de grupos'; end if;
  if has_function_privilege('anon', 'public.caca_grupo_casas(uuid)', 'execute') or has_function_privilege('anon', 'public.caca_grupo_rota_op(text,uuid,text,text,int,int)', 'execute')
     or has_function_privilege('anon', 'public.caca_grupo_cfg(text,int)', 'execute')
    then raise exception 'função interna exposta'; end if;
  if not has_function_privilege('anon', 'public.caca_grupo_ler(text,uuid)', 'execute') then raise exception 'caca_grupo_ler sem grant'; end if;

  -- 1. Criar: validações e sucesso.
  if public.caca_grupo_criar('chave-errada', 'Amigos', true) ->> 'motivo' <> 'mapa_desconhecido' then raise exception 'criar chave errada'; end if;
  if public.caca_grupo_criar(k_a1, 'x', true) ->> 'motivo' <> 'nome_invalido' then raise exception 'criar nome curto'; end if;
  if public.caca_grupo_criar(k_a1, 'Amigos', false) ->> 'motivo' <> 'aceite_obrigatorio' then raise exception 'criar sem aceite'; end if;
  r := public.caca_grupo_criar(k_a1, '  Amigos   da  Cartoon ', true);
  if not (r ->> 'ok')::boolean or r ->> 'nome' <> 'Amigos da Cartoon' or r ->> 'convite_token' is null then raise exception 'criar: %', r; end if;
  g1 := (r ->> 'grupo_id')::uuid; tok1 := r ->> 'convite_token';
  if exists (select 1 from public.caca_grupo_convite c where c.token_hash = tok1) then raise exception 'token guardado em claro'; end if;

  -- 2. Convite: só nome, quantidade e validade (nada dos integrantes).
  r := public.caca_grupo_convite_ver(tok1);
  if not (r ->> 'valido')::boolean or r ->> 'nome_do_grupo' <> 'Amigos da Cartoon' or (r ->> 'membros_qtd')::int <> 1 then raise exception 'convite_ver: %', r; end if;
  if (select array_agg(k order by k) from jsonb_object_keys(r) k) <> array['membros_qtd', 'nome_do_grupo', 'valido'] then raise exception 'convite_ver vazou chaves: %', r; end if;
  if r::text like '%Ana%' or r::text like '%exemplo%' then raise exception 'convite_ver vazou integrante'; end if;
  r := public.caca_grupo_convite_ver('token-que-nao-existe');
  if (r ->> 'valido')::boolean or r ->> 'nome_do_grupo' is not null then raise exception 'convite inexistente: %', r; end if;

  -- 3. Entrar: aceite obrigatório, mapa próprio, idempotente, dois mapas da mesma pessoa não viram dois integrantes.
  if public.caca_grupo_entrar(k_b, tok1, false) ->> 'motivo' <> 'aceite_obrigatorio' then raise exception 'entrar sem aceite'; end if;
  if public.caca_grupo_entrar('chave-errada', tok1, true) ->> 'motivo' <> 'mapa_desconhecido' then raise exception 'entrar sem mapa'; end if;
  if public.caca_grupo_entrar(k_b, 'token-falso', true) ->> 'motivo' <> 'convite_invalido' then raise exception 'entrar token falso'; end if;
  r := public.caca_grupo_entrar(k_b, tok1, true);
  if not (r ->> 'ok')::boolean or (r ->> 'ja_membro')::boolean then raise exception 'entrar B: %', r; end if;
  r := public.caca_grupo_entrar(k_b, tok1, true);
  if not (r ->> 'ok')::boolean or not (r ->> 'ja_membro')::boolean then raise exception 'entrar B de novo deveria ser idempotente: %', r; end if;
  r := public.caca_grupo_entrar(k_a2, tok1, true);   -- outro mapa da dona (mesmo e-mail)
  if not (r ->> 'ok')::boolean or not (r ->> 'ja_membro')::boolean then raise exception 'segundo mapa da dona virou outro integrante: %', r; end if;
  if (select count(*) from public.caca_grupo_membro m where m.grupo_id = g1 and m.pessoa = 'a@exemplo.com.br') <> 1 then raise exception 'pessoa duplicada'; end if;
  if (select usos from public.caca_grupo_convite c where c.grupo_id = g1 limit 1) <> 1 then raise exception 'entrada repetida gastou uso do convite'; end if;
  if not exists (select 1 from public.caca_grupo_membro m where m.grupo_id = g1 and m.pessoa = 'b@exemplo.com.br' and m.aceite_visibilidade_em is not null)
    then raise exception 'aceite não gravado'; end if;
  perform public.caca_grupo_entrar(k_c, tok1, true);
  perform public.caca_grupo_entrar(k_f, tok1, true);
  perform public.caca_grupo_entrar(k_h, tok1, true);
  if (public.caca_grupo_convite_ver(tok1) ->> 'membros_qtd')::int <> 5 then raise exception 'membros_qtd'; end if;

  -- 4. Ler: ranking do grupo (casas, extras, empate = mesma posição), pendente sem posição, nada de contato, coletivo sem duplicar.
  r := public.caca_grupo_ler(k_b, g1);
  if not (r ->> 'ok')::boolean or jsonb_array_length(r -> 'membros') <> 5 then raise exception 'ler B: %', r; end if;
  if r::text like '%exemplo.com.br%' or r::text ~* '"(email|whatsapp|pessoa|chave)' then raise exception 'ler vazou contato/chave: %', r; end if;
  if not exists (select 1 from jsonb_array_elements(r -> 'membros') m where m ->> 'apelido' = 'Ana2' and (m ->> 'casas')::int = 2 and (m ->> 'extras')::int = 1 and (m ->> 'posicao')::int = 1 and m ->> 'papel' = 'dono')
    then raise exception 'A: 2 casas + 1 extra, posição 1, dono: %', r -> 'membros'; end if;   -- perfil = mapa mais recente (Ana2)
  if (select count(distinct m ->> 'posicao') from jsonb_array_elements(r -> 'membros') m where m ->> 'apelido' in ('Beto', 'Fabi')) <> 1
     or not exists (select 1 from jsonb_array_elements(r -> 'membros') m where m ->> 'apelido' = 'Beto' and (m ->> 'posicao')::int = 2)
    then raise exception 'B e F deveriam empatar em 2º: %', r -> 'membros'; end if;
  if not exists (select 1 from jsonb_array_elements(r -> 'membros') m where m ->> 'apelido' = 'Cris' and (m ->> 'posicao')::int = 4 and (m ->> 'casas')::int = 1)
    then raise exception 'rank deveria pular para 4 após empate de 2: %', r -> 'membros'; end if;
  if not exists (select 1 from jsonb_array_elements(r -> 'membros') m where m ->> 'apelido' = 'Hugo' and (m ->> 'casas')::int = 0 and m -> 'posicao' = 'null'::jsonb)
    then raise exception 'pendente sem posição: %', r -> 'membros'; end if;
  if not exists (select 1 from jsonb_array_elements(r -> 'membros') m where m ->> 'apelido' = 'Beto' and (m ->> 'eu')::boolean) then raise exception 'eu'; end if;
  if r::text like '%Davi%' then raise exception 'quem é de fora apareceu no grupo'; end if;
  -- coletivo: A, B, F, C validaram só A e B -> 2 casas distintas (a casa A foi validada por 4 pessoas e conta 1 vez); a de Hugo é pendente.
  if (r ->> 'casas_coletivas')::int <> 2 or (r ->> 'total_casas')::int <> v_total or (r ->> 'faltam_coletivo')::int <> v_total - 2
     or (r -> 'casas_coletivas_slugs') <> (select jsonb_agg(s order by s) from unnest(array[sa, sb]) s)
    then raise exception 'coletivo: %', r - 'membros'; end if;
  -- Hugo avalia a casa C: o coletivo sobe para 3 e ele passa a 1 casa (empata com Cris, mesma posição).
  insert into public.avaliacoes (edicao_codigo, participacao_id, nome, email_norm, notas) values (ed, cc.participacao, 'Teste', 'h@exemplo.com.br', '{}'::jsonb);
  r := public.caca_grupo_ler(k_c, g1);
  if (r ->> 'casas_coletivas')::int <> 3 then raise exception 'coletivo após avaliar: %', r - 'membros'; end if;
  if (select count(distinct m ->> 'posicao') from jsonb_array_elements(r -> 'membros') m where m ->> 'apelido' in ('Cris', 'Hugo')) <> 1
     or not exists (select 1 from jsonb_array_elements(r -> 'membros') m where m ->> 'apelido' = 'Hugo' and (m ->> 'posicao')::int = 4)
    then raise exception 'Cris e Hugo deveriam empatar em 4º: %', r -> 'membros'; end if;
  -- O segundo mapa da dona lê o mesmo grupo (pessoa = e-mail).
  if not (public.caca_grupo_ler(k_a1, g1) ->> 'ok')::boolean or not (public.caca_grupo_ler(k_a2, g1) ->> 'ok')::boolean then raise exception 'A com qualquer mapa deveria ler'; end if;

  -- 5. Isolamento: de fora (D), de outro grupo (E), grupo inexistente, chave errada e sem grupo.
  r := public.caca_grupo_criar(k_e, 'Grupo da Eva', true);
  g2 := (r ->> 'grupo_id')::uuid; tok2 := r ->> 'convite_token';
  if public.caca_grupo_ler(k_d, g1) ->> 'motivo' <> 'negado' then raise exception 'D (de fora) leu o grupo'; end if;
  if public.caca_grupo_ler(k_e, g1) ->> 'motivo' <> 'negado' then raise exception 'E (de outro grupo) leu o grupo'; end if;
  if public.caca_grupo_ler(k_b, g2) ->> 'motivo' <> 'negado' then raise exception 'B leu o grupo da Eva'; end if;
  if public.caca_grupo_ler(k_b, gen_random_uuid()) ->> 'motivo' <> 'negado' then raise exception 'grupo inexistente deveria dar negado'; end if;
  if public.caca_grupo_ler(k_b, null) ->> 'motivo' <> 'negado' then raise exception 'grupo null'; end if;
  if public.caca_grupo_ler('chave-errada', g1) ->> 'motivo' <> 'mapa_desconhecido' then raise exception 'chave errada'; end if;
  if public.caca_grupo_listar(k_d) -> 'grupos' <> '[]'::jsonb then raise exception 'D listou grupos de outros'; end if;
  if jsonb_array_length(public.caca_grupo_listar(k_b) -> 'grupos') <> 1 or (public.caca_grupo_listar(k_b) -> 'grupos' -> 0 ->> 'grupo_id')::uuid <> g1
    then raise exception 'listar B'; end if;
  if (public.caca_grupo_listar(k_b) -> 'grupos' -> 0 ->> 'casas_coletivas')::int <> 3 or (public.caca_grupo_listar(k_b) -> 'grupos' -> 0 ->> 'membros_qtd')::int <> 5
    then raise exception 'listar: %', public.caca_grupo_listar(k_b); end if;
  -- toda escrita de quem é de fora é negada
    if public.caca_grupo_rota_adicionar(k_d, g1, sa) ->> 'motivo' <> 'negado' or public.caca_grupo_rota_remover(k_d, g1, sa) ->> 'motivo' <> 'negado'
       or public.caca_grupo_rota_mover(k_d, g1, sa, 1) ->> 'motivo' <> 'negado' or public.caca_grupo_convite_novo(k_d, g1) ->> 'motivo' <> 'negado'
       or public.caca_grupo_convite_revogar(k_d, g1) ->> 'motivo' <> 'negado' or public.caca_grupo_sair(k_d, g1) ->> 'motivo' <> 'negado'
       or public.caca_grupo_remover_membro(k_d, g1, gen_random_uuid()) ->> 'motivo' <> 'negado'
      then raise exception 'D conseguiu escrever no grupo'; end if;
  -- Progresso do grupo não depende de quem está fora: D tem 3 casas e a posição global 1, mas o grupo continua com A em 1º.
  if (select (m ->> 'posicao')::int from jsonb_array_elements(public.caca_grupo_ler(k_b, g1) -> 'membros') m where m ->> 'apelido' = 'Ana2') <> 1 then raise exception 'ranking do grupo contaminado'; end if;

  -- 6. Rota colaborativa: qualquer integrante mexe; ordem densa; versão; conflito; nunca cria carimbo.
  r := public.caca_grupo_rota_adicionar(k_b, g1, sa);
  if not (r ->> 'ok')::boolean or (r ->> 'versao')::int <> 1 or r -> 'rota' -> 0 ->> 'slug' <> sa or r -> 'rota' -> 0 ->> 'adicionado_por' <> 'Beto' then raise exception 'rota adicionar: %', r; end if;
  perform public.caca_grupo_rota_adicionar(k_c, g1, sb);
  perform public.caca_grupo_rota_adicionar(k_f, g1, sc);
  r := public.caca_grupo_rota_adicionar(k_c, g1, sb);      -- repetida: idempotente, sem nova versão
  if not (r ->> 'ok')::boolean or (r ->> 'mudou')::boolean or (r ->> 'versao')::int <> 3 or jsonb_array_length(r -> 'rota') <> 3 then raise exception 'rota duplicada: %', r; end if;
  r := public.caca_grupo_rota_mover(k_a1, g1, sc, 1);       -- C vai para a frente
  if not (r ->> 'ok')::boolean or (select array_agg(e ->> 'slug' order by (e ->> 'posicao')::int) from jsonb_array_elements(r -> 'rota') e) <> array[sc, sa, sb]
     or (select array_agg((e ->> 'posicao')::int order by (e ->> 'posicao')::int) from jsonb_array_elements(r -> 'rota') e) <> array[1, 2, 3] then raise exception 'mover para a frente: %', r; end if;
  r := public.caca_grupo_rota_mover(k_a1, g1, sc, 99);      -- além do fim: vai para o fim
  if (select array_agg(e ->> 'slug' order by (e ->> 'posicao')::int) from jsonb_array_elements(r -> 'rota') e) <> array[sa, sb, sc] then raise exception 'mover para o fim: %', r; end if;
  r := public.caca_grupo_rota_mover(k_a1, g1, sa, 2);       -- A desce uma
  if (select array_agg(e ->> 'slug' order by (e ->> 'posicao')::int) from jsonb_array_elements(r -> 'rota') e) <> array[sb, sa, sc] then raise exception 'mover para trás: %', r; end if;
  v_ver := (r ->> 'versao')::int;
  if public.caca_grupo_rota_mover(k_a1, g1, sa, 0) ->> 'motivo' <> 'posicao_invalida' then raise exception 'posicao 0'; end if;
  r2 := public.caca_grupo_rota_remover(k_b, g1, sb, v_ver - 1);   -- versão velha: conflito, nada muda
  if r2 ->> 'motivo' <> 'conflito' or (r2 ->> 'versao')::int <> v_ver or jsonb_array_length(r2 -> 'rota') <> 3 then raise exception 'conflito: %', r2; end if;
  r2 := public.caca_grupo_rota_remover(k_b, g1, sb, v_ver);       -- versão certa
  if not (r2 ->> 'ok')::boolean or (r2 ->> 'versao')::int <> v_ver + 1 or (select array_agg(e ->> 'slug' order by (e ->> 'posicao')::int) from jsonb_array_elements(r2 -> 'rota') e) <> array[sa, sc]
     or (select array_agg((e ->> 'posicao')::int order by (e ->> 'posicao')::int) from jsonb_array_elements(r2 -> 'rota') e) <> array[1, 2] then raise exception 'remover: %', r2; end if;
  if (public.caca_grupo_rota_remover(k_b, g1, sb) ->> 'mudou')::boolean then raise exception 'remover ausente deveria ser idempotente'; end if;
  if public.caca_grupo_rota_mover(k_b, g1, sb, 1) ->> 'motivo' <> 'nao_esta_na_rota' then raise exception 'mover ausente'; end if;
  if public.caca_grupo_rota_adicionar(k_b, g1, 'casa-que-nao-existe') ->> 'motivo' <> 'casa_desconhecida' then raise exception 'casa desconhecida'; end if;
  if public.caca_grupo_ler(k_c, g1) -> 'rota_versao' <> to_jsonb(v_ver + 1) then raise exception 'rota_versao no ler'; end if;
  if (select count(*) from public.carimbos) <> v_carimbos then raise exception 'rota criou carimbo'; end if;
  if (public.caca_grupo_ler(k_c, g1) ->> 'casas_coletivas')::int <> 3 then raise exception 'rota mexeu no progresso'; end if;

  -- 7. Convites: novo por integrante, revogar só dono (e trava integrantes), expirado, esgotado.
  r := public.caca_grupo_convite_novo(k_c, g1);
  if not (r ->> 'ok')::boolean then raise exception 'integrante deveria gerar convite: %', r; end if;
  tok3 := r ->> 'convite_token';
  if public.caca_grupo_convite_revogar(k_b, g1) ->> 'motivo' <> 'so_dono' then raise exception 'integrante revogou'; end if;
  r := public.caca_grupo_convite_revogar(k_a1, g1);
  if not (r ->> 'ok')::boolean or (r ->> 'revogados')::int <> 2 then raise exception 'revogar: %', r; end if;
  if public.caca_grupo_entrar(k_n, tok1, true) ->> 'motivo' <> 'convite_revogado' or public.caca_grupo_entrar(k_n, tok3, true) ->> 'motivo' <> 'convite_revogado'
    then raise exception 'convite revogado deveria recusar'; end if;
  if (public.caca_grupo_convite_ver(tok1) ->> 'valido')::boolean or public.caca_grupo_convite_ver(tok1) ->> 'nome_do_grupo' is not null then raise exception 'ver revogado'; end if;
  if public.caca_grupo_convite_novo(k_c, g1) ->> 'motivo' <> 'so_dono' then raise exception 'integrante gerou convite depois da revogação'; end if;
  r := public.caca_grupo_convite_novo(k_a1, g1);            -- o dono gera e destrava
  tok1 := r ->> 'convite_token';
  if not (r ->> 'ok')::boolean or not (public.caca_grupo_convite_ver(tok1) ->> 'valido')::boolean then raise exception 'dono gera convite: %', r; end if;
  if not (public.caca_grupo_convite_novo(k_c, g1) ->> 'ok')::boolean then raise exception 'destrava após o dono gerar'; end if;
  update public.caca_grupo_convite set expira_em = now() - interval '1 minute' where token_hash = public.mapa_hash(tok1);
  if public.caca_grupo_entrar(k_n, tok1, true) ->> 'motivo' <> 'convite_expirado' or (public.caca_grupo_convite_ver(tok1) ->> 'valido')::boolean then raise exception 'convite expirado deveria recusar'; end if;
  update public.caca_grupo_convite set expira_em = now() + interval '1 day', max_usos = 1, usos = 1 where token_hash = public.mapa_hash(tok1);
  if public.caca_grupo_entrar(k_n, tok1, true) ->> 'motivo' <> 'convite_esgotado' then raise exception 'convite esgotado'; end if;
  update public.caca_grupo_convite set max_usos = null where token_hash = public.mapa_hash(tok1);
  -- Quem já é integrante segue ok mesmo com o convite revogado (idempotência pelo mapa).
  if not (public.caca_grupo_entrar(k_b, tok3, true) ->> 'ok')::boolean then raise exception 'integrante com convite revogado deveria ficar ok'; end if;
  -- Limite de integrantes (configurável): 5 já dentro.
  update public.caca_grupo_config set valor = 5 where chave = 'max_membros';
  if public.caca_grupo_entrar(k_n, tok1, true) ->> 'motivo' <> 'grupo_cheio' then raise exception 'grupo cheio'; end if;
  update public.caca_grupo_config set valor = 30 where chave = 'max_membros';
  -- Limite de grupos por pessoa.
  update public.caca_grupo_config set valor = 1 where chave = 'max_grupos_por_pessoa';
  if public.caca_grupo_criar(k_b, 'Outro grupo', true) ->> 'motivo' <> 'limite_grupos' then raise exception 'limite_grupos'; end if;
  update public.caca_grupo_config set valor = 5 where chave = 'max_grupos_por_pessoa';

  -- 8. Remover (só dono): C sai do grupo, perde o acesso, não volta pelo mesmo link; não pode remover a si mesmo.
  select m.id into mem_c from public.caca_grupo_membro m where m.grupo_id = g1 and m.pessoa = 'c@exemplo.com.br';
  select m.id into mem_a from public.caca_grupo_membro m where m.grupo_id = g1 and m.pessoa = 'a@exemplo.com.br';
  if public.caca_grupo_remover_membro(k_b, g1, mem_c) ->> 'motivo' <> 'so_dono' then raise exception 'integrante removeu'; end if;
  if public.caca_grupo_remover_membro(k_a1, g1, mem_a) ->> 'motivo' <> 'use_sair' then raise exception 'dono removeu a si'; end if;
  if public.caca_grupo_remover_membro(k_a1, g1, gen_random_uuid()) ->> 'motivo' <> 'membro_desconhecido' then raise exception 'membro desconhecido'; end if;
  if not (public.caca_grupo_remover_membro(k_a1, g1, mem_c) ->> 'ok')::boolean then raise exception 'dono não removeu C'; end if;
  if public.caca_grupo_ler(k_c, g1) ->> 'motivo' <> 'negado' then raise exception 'removido ainda lê'; end if;
  if public.caca_grupo_rota_adicionar(k_c, g1, sb) ->> 'motivo' <> 'negado' then raise exception 'removido ainda escreve'; end if;
  if public.caca_grupo_entrar(k_c, tok1, true) ->> 'motivo' <> 'removido_do_grupo' then raise exception 'removido voltou pelo mesmo link'; end if;
  if (public.caca_grupo_ler(k_b, g1) ->> 'casas_coletivas')::int <> 3 then raise exception 'coletivo após remover C (F e D... A cobre as casas)'; end if;
  if jsonb_array_length(public.caca_grupo_ler(k_b, g1) -> 'membros') <> 4 then raise exception 'membros após remover'; end if;
  if exists (select 1 from jsonb_array_elements(public.caca_grupo_ler(k_b, g1) -> 'rota') e where e ->> 'adicionado_por' is null) then raise exception 'rota sem autor'; end if;

  -- 9. Sair: F sai e perde o acesso; coletivo continua só com os ativos; pode voltar por convite válido (não removido).
  select m.id into mem_f from public.caca_grupo_membro m where m.grupo_id = g1 and m.pessoa = 'f@exemplo.com.br';
  if not (public.caca_grupo_sair(k_f, g1) ->> 'ok')::boolean then raise exception 'F não saiu'; end if;
  if public.caca_grupo_ler(k_f, g1) ->> 'motivo' <> 'negado' or public.caca_grupo_rota_remover(k_f, g1, sa) ->> 'motivo' <> 'negado' then raise exception 'F ainda tem acesso depois de sair'; end if;
  if public.caca_grupo_sair(k_f, g1) ->> 'motivo' <> 'negado' then raise exception 'sair duas vezes'; end if;
  if jsonb_array_length(public.caca_grupo_listar(k_f) -> 'grupos') <> 0 then raise exception 'F ainda lista o grupo'; end if;
  r := public.caca_grupo_entrar(k_f, tok1, true);
  if not (r ->> 'ok')::boolean or (r ->> 'ja_membro')::boolean then raise exception 'F deveria poder voltar: %', r; end if;
  if (select m.papel from public.caca_grupo_membro m where m.id = mem_f) <> 'membro' then raise exception 'F voltou com papel errado'; end if;
  update public.caca_grupo_membro set entrou_em = now() - interval '5 hours' where grupo_id = g1 and pessoa = 'b@exemplo.com.br';
  update public.caca_grupo_membro set entrou_em = now() - interval '4 hours' where grupo_id = g1 and pessoa = 'h@exemplo.com.br';
  -- Dono que sai passa o grupo ao integrante ativo mais antigo (B); o dono antigo perde o acesso.
  if not (public.caca_grupo_sair(k_a2, g1) ->> 'ok')::boolean then raise exception 'dona não saiu'; end if;
  if public.caca_grupo_ler(k_a1, g1) ->> 'motivo' <> 'negado' then raise exception 'dona ainda lê (outro mapa)'; end if;
  if (select m.papel from public.caca_grupo_membro m where m.grupo_id = g1 and m.pessoa = 'b@exemplo.com.br') <> 'dono' then raise exception 'B deveria ser o novo dono'; end if;
  if (select count(*) from public.caca_grupo_membro m where m.grupo_id = g1 and m.papel = 'dono' and m.saiu_em is null) <> 1 then raise exception 'deve haver 1 dono'; end if;
  if not (public.caca_grupo_convite_revogar(k_b, g1) ->> 'ok')::boolean then raise exception 'novo dono não revoga'; end if;
  -- Último a sair: os convites morrem.
  r := public.caca_grupo_sair(k_e, g2);
  if not (r ->> 'ok')::boolean or (public.caca_grupo_convite_ver(tok2) ->> 'valido')::boolean then raise exception 'convite do grupo vazio deveria morrer'; end if;
  if public.caca_grupo_entrar(k_n, tok2, true) ->> 'ok' = 'true' then raise exception 'entrou em grupo vazio'; end if;

  raise exception 'TESTE_OK casas=% carimbos_intactos=%', v_total, v_carimbos;
end $t$;
