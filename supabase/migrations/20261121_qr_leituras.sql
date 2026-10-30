-- QR de contagem por peça — 30/10/2026.
-- Plano: docs/cartoon-2026-2/12-plano-qr-leituras.md (§12.5 e §12.6).
--
--  * qr_pontos — uma linha por peça física que leva QR. O CÓDIGO vai impresso em
--    https://www.sweetcoffeeweek.com.br/q/<código> e NUNCA muda; para onde a leitura leva sai da
--    regra do código (src/edicao/qrPontos.js) e `destino` guarda só uma troca manual ("/caminho").
--  * qr_leituras_hora — contador por HORA (fuso de Natal), não um registro por pessoa: peça, hora,
--    lugar aproximado (país/região/cidade que a Vercel já manda), aparelho e se parece robô.
--    Sem IP, sem cookie, sem identificar ninguém.
--  * registrar_leitura_qr — chamada por api/q.js com a chave pública. Só conta código existente e
--    ativo; trava a variedade de lugares por peça e hora (a tabela não cresce com chamada direta);
--    devolve o destino manual ou null. Quem decide o destino padrão é o código, não o banco.
--  Tabelas fechadas (RLS ligada, sem grant): só a função escreve. A leitura para o painel é a fase 2.
--  Idempotente: pode rodar de novo sem duplicar nada.

create table if not exists public.qr_pontos (
  codigo text primary key
    check (char_length(codigo) <= 80 and codigo ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  tipo text not null
    check (tipo in ('display_face1', 'display_face2', 'placa', 'mapa', 'teste', 'outro')),
  rotulo text not null check (char_length(rotulo) <= 120),
  participacao_id uuid references public.participacoes(id) on delete set null,
  destino text
    check (destino is null or (destino like '/%' and destino not like '//%' and destino !~ '\s' and position(chr(92) in destino) = 0)),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
comment on table public.qr_pontos is
  'Uma linha por peça física que leva QR (display, placa, mapa…). O código vai impresso em /q/<código> e NUNCA muda. destino é só uma troca manual de destino ("/caminho"); sem ela vale a regra do código (src/edicao/qrPontos.js). ativo=false para de contar.';
alter table public.qr_pontos enable row level security;
revoke all on public.qr_pontos from anon, authenticated;

create table if not exists public.qr_leituras_hora (
  codigo text not null references public.qr_pontos(codigo) on update cascade,
  hora timestamptz not null,
  pais text not null default '',
  regiao text not null default '',
  cidade text not null default '',
  aparelho text not null default 'outro' check (aparelho in ('ios', 'android', 'outro')),
  robo boolean not null default false,
  leituras integer not null default 0 check (leituras >= 0),
  primary key (codigo, hora, pais, regiao, cidade, aparelho, robo)
);
comment on table public.qr_leituras_hora is
  'Leituras de QR somadas por peça e por hora cheia (fuso de Natal). Sem IP, sem cookie, sem pessoa. robo=true: pré-visualização, verificador de link ou HEAD — fora da soma de pessoas.';
alter table public.qr_leituras_hora enable row level security;
revoke all on public.qr_leituras_hora from anon, authenticated;

create or replace function public.registrar_leitura_qr(
  p_codigo text,
  p_pais text default '',
  p_regiao text default '',
  p_cidade text default '',
  p_aparelho text default 'outro',
  p_robo boolean default false
) returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_ponto public.qr_pontos%rowtype;
  v_hora timestamptz := date_trunc('hour', now(), 'America/Fortaleza');
  v_pais text := left(upper(regexp_replace(coalesce(p_pais, ''), '[^A-Za-z]', '', 'g')), 2);
  v_regiao text := left(regexp_replace(coalesce(p_regiao, ''), '[^A-Za-z0-9]', '', 'g'), 8);
  v_cidade text := left(btrim(regexp_replace(coalesce(p_cidade, ''), '[[:cntrl:]]', '', 'g')), 60);
  v_aparelho text := case when p_aparelho in ('ios', 'android') then p_aparelho else 'outro' end;
  v_robo boolean := coalesce(p_robo, false);
begin
  select * into v_ponto from public.qr_pontos where codigo = lower(btrim(coalesce(p_codigo, '')));
  if not found or not v_ponto.ativo then
    return null; -- código desconhecido ou pausado: não conta (api/q.js redireciona pela regra do código)
  end if;

  -- Trava: no máximo 25 combinações de lugar/aparelho/robô por peça e hora; o excedente cai em "sem lugar".
  -- Sem ela, quem chamasse a função direto com a chave pública inventaria uma cidade por chamada.
  if not exists (
       select 1 from public.qr_leituras_hora l
        where l.codigo = v_ponto.codigo and l.hora = v_hora and l.pais = v_pais and l.regiao = v_regiao
          and l.cidade = v_cidade and l.aparelho = v_aparelho and l.robo = v_robo)
     and (select count(*) from public.qr_leituras_hora l where l.codigo = v_ponto.codigo and l.hora = v_hora) >= 25
  then
    v_pais := ''; v_regiao := ''; v_cidade := '';
  end if;

  insert into public.qr_leituras_hora as t (codigo, hora, pais, regiao, cidade, aparelho, robo, leituras)
  values (v_ponto.codigo, v_hora, v_pais, v_regiao, v_cidade, v_aparelho, v_robo, 1)
  on conflict (codigo, hora, pais, regiao, cidade, aparelho, robo)
  do update set leituras = t.leituras + 1;

  return v_ponto.destino;
end $$;
comment on function public.registrar_leitura_qr(text, text, text, text, text, boolean) is
  'Soma 1 na leitura da peça (por hora/lugar/aparelho/robô) e devolve o destino manual do ponto ou null. Chamada por api/q.js com a chave pública.';
-- Esta SIM é aberta para anon (api/q.js usa a chave pública): fecha PUBLIC e abre só os papéis certos.
revoke all on function public.registrar_leitura_qr(text, text, text, text, text, boolean) from public;
grant execute on function public.registrar_leitura_qr(text, text, text, text, text, boolean) to anon, authenticated, service_role;

-- Semente: display (faces 1 e 2) das casas ativas da 2026.2 + placa geral + mapa do cliente + teste.
-- Casa nova depois: o painel cadastra o ponto (fase 2); o código segue o mesmo desenho d1-/d2-<slug>.
insert into public.qr_pontos (codigo, tipo, rotulo, participacao_id)
select 'd1-' || p.slug_publico, 'display_face1',
       'Display de mesa · face 1 (combo) · ' || coalesce(pt.nome_marca, p.slug_publico), p.id
  from public.participacoes p
  join public.participantes pt on pt.id = p.participante_id
 where p.edicao_codigo = '2026.2' and p.slug_publico is not null and p.status_cadastro <> 'encerrado'
on conflict (codigo) do nothing;

insert into public.qr_pontos (codigo, tipo, rotulo, participacao_id)
select 'd2-' || p.slug_publico, 'display_face2',
       'Display de mesa · face 2 (avaliar) · ' || coalesce(pt.nome_marca, p.slug_publico), p.id
  from public.participacoes p
  join public.participantes pt on pt.id = p.participante_id
 where p.edicao_codigo = '2026.2' and p.slug_publico is not null and p.status_cadastro <> 'encerrado'
on conflict (codigo) do nothing;

insert into public.qr_pontos (codigo, tipo, rotulo) values
  ('pl-geral', 'placa', 'Placa de sinalização (geral)'),
  ('mapa-bitly', 'mapa', 'Mapa · QR do cliente (Bitly aponta para /q/mapa-bitly)'),
  ('teste', 'teste', 'Teste (não entra na soma)')
on conflict (codigo) do nothing;
