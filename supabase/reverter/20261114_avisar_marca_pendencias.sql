-- Reversão de 20261114_avisar_marca_pendencias.sql: some o aviso de pendência/ajuste (as mensagens já enviadas ficam).
drop function if exists public.org_avisar_marca(text, uuid, text, text, text, text);
