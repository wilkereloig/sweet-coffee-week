-- Reverte 20261222_caca_link_por_email. Só remove a função interna; nada de dado do mapa é tocado.
-- (A edge function caca-email precisa voltar à versão sem a finalidade 'link' antes, ou o envio do link responde 'falha_temporaria'.)
drop function if exists public.mapa_link_validar_interno(text, text, text, text);
