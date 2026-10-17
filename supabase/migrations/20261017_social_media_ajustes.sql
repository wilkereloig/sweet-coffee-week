-- Ajustes depois de aplicar 20261017_social_media.sql (17/10/2026).
-- 1. Conselheiro de segurança: search_path fixo também na função imutável de texto.
alter function public.redes_data_texto(timestamptz) set search_path = public;
-- 2. Push por pessoa ligado: a enviar-push com push_destinos (pessoal só aos
--    aparelhos do destinatário) já está publicada. Antes dela, ligar isto
--    mandaria o aviso de uma pessoa para todos os aparelhos da organização.
update public.admin_config set push_pessoal = true;
