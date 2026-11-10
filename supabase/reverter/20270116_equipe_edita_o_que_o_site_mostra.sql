-- Reversão de 20270116_equipe_edita_o_que_o_site_mostra.sql. Só desfaz o que a migration ACRESCENTOU; nenhum dado é apagado.
drop function if exists public.org_salvar_unidade_site(text, uuid, uuid, jsonb);
drop function if exists public.org_salvar_alimentar(text, uuid, jsonb);
drop function if exists public._org_gravar_declaracoes(uuid, uuid, jsonb);
drop function if exists public.get_alimentar_participacao(text, uuid);
-- get_ficha_participacao (a chave `_un` em cada unidade é aditiva) e org_salvar_participante (a chave 'apresentacao_publica'
-- a mais) continuam compatíveis com o painel antigo; para voltar ao texto exato, recrie-as a partir de
-- 20260930_etapa3_cadastro_editavel.sql (org_salvar_participante) e da definição anterior de get_ficha_participacao.
