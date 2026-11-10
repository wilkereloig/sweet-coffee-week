-- Desfaz 20270122: desliga o delivery na automação (a visita anterior segue). Para voltar à função anterior, reaplicar o corpo de 20270121.
update public.caca_config set valor = 'false'::jsonb where chave = 'auto_aprovar_delivery';
