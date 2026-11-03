-- 03/11/2026 (Wilker, repassando a pergunta da Jolie via Carolina: "os combos têm limite de caracteres pra descrição dos itens?" —
-- "se tiver limite, retire"). As descrições do ITEM, da TROCA e do COMBO deixam de ter o limite de 300/400/600 caracteres.
-- Fica só um TETO TÉCNICO de 5.000 caracteres (colar um documento inteiro por engano não pode estourar o cadastro/o texto do post).
-- Onde havia limite no banco: participacoes.combo_descricao (check 400), substituicoes.descricao (check 600),
-- `org_preenchimento_decidir` (corta em 400/600/600 ao aplicar o /preencher) e `editorial_salvar` (recusa > 400).
-- A descrição do item no painel da marca só tinha o limite na TELA (maxLength 300). Reversão: voltar os números 400/600.
alter table public.participacoes drop constraint if exists participacoes_combo_descricao_check;
alter table public.participacoes add constraint participacoes_combo_descricao_check
  check (combo_descricao is null or char_length(combo_descricao) <= 5000);
alter table public.substituicoes drop constraint if exists substituicoes_descricao_tamanho;
alter table public.substituicoes add constraint substituicoes_descricao_tamanho
  check (descricao is null or char_length(descricao) <= 5000);

do $mig$
declare v_def text; v_novo text;
begin
  select pg_get_functiondef('public.org_preenchimento_decidir(text,uuid,boolean,text)'::regprocedure) into v_def;
  v_novo := replace(replace(replace(v_def,
    $a$preenchimento_texto(c, 'combo_descricao', 400)$a$, $b$preenchimento_texto(c, 'combo_descricao', 5000)$b$),
    $a$preenchimento_texto(it, 'descricao', 600)$a$, $b$preenchimento_texto(it, 'descricao', 5000)$b$),
    $a$preenchimento_texto(v_tr, 'descricao', 600)$a$, $b$preenchimento_texto(v_tr, 'descricao', 5000)$b$);
  if v_novo <> v_def then execute v_novo; end if;
end $mig$;

do $mig$
declare v_oid oid; v_def text; v_novo text;
begin
  select p.oid into v_oid from pg_proc p where p.proname = 'editorial_salvar' and p.pronamespace = 'public'::regnamespace;
  v_def := pg_get_functiondef(v_oid);
  v_novo := replace(replace(v_def,
    $a$char_length(btrim(coalesce(p_dados->>'combo_descricao', ''))) > 400$a$, $b$char_length(btrim(coalesce(p_dados->>'combo_descricao', ''))) > 5000$b$),
    $a$char_length(coalesce(v_desc, '')) > 400$a$, $b$char_length(coalesce(v_desc, '')) > 5000$b$);
  if v_novo <> v_def then execute v_novo; end if;
end $mig$;
