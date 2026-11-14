-- Reverte 20270206 (apaga o histórico de envios avulsos da organização).
drop table if exists public.email_fila;
