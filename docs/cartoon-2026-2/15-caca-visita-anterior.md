# 15 · Caça — carimbo de visita anterior (pedidos só em 05/11/2026)

**Status (05/11/2026):** banco aplicado (`20261226_caca_visita_anterior` + `caca_visita_anterior_origem`, projeto `nlamznxoocmygfvnqcns`, teste `supabase/testes/caca-visita-anterior.sql` → `TESTE_OK`); site e painel só em `dev/site-completo`, **não publicados**.

## O que é
Quem visitou uma casa antes de conhecer a Caça pede, na central, que a **organização** analise a visita. O pedido não carimba nem conta nada.
Aprovado, vira um carimbo com `origem = 'visita_anterior'` a partir da aprovação, e só vira casa **validada** depois da avaliação do combo com o mesmo e-mail do mapa (regra de todo carimbo).

## Decisões
- **Reaproveita a fila de revisão de presença** (`caca_carimbo_excecao`, painel Caça › Carimbos › Pedidos de presença): mesmo painel, mesma auditoria (`caca_evento` + `auditoria`). Diferença: `motivo = 'visita_anterior'` + `visita_data`.
- **Prazo no servidor:** `caca_visita_anterior_prazo()` — o pedido só entra antes de `2026-11-06 00:00` em `America/Fortaleza` (= até 23h59:59 de 05/11). Mudar o prazo = mudar só essa função. A análise e a aprovação podem acontecer depois; a consulta dos pedidos (`caca_excecao_minhas`) não tem prazo.
- **Uma por casa:** pedido pendente ou aprovado bloqueia outro na mesma casa (qualquer endereço); negado permite tentar de novo uma vez (limite 2 por casa). Quem já tem carimbo na casa não pode pedir (`ja_carimbou`) e, se carimbar depois de pedir, a aprovação é recusada (`ja_carimbou`). Máximo 5 pendentes por pessoa, 60 por casa.
- **Exige e-mail confirmado do mapa principal** (como o pedido de GPS): carimbo e avaliação usam o mesmo e-mail.
- **Unidade obrigatória** quando a casa tem mais de um endereço; data entre o início do festival e hoje (Natal).
- **Voucher:** o carimbo nasce `now()` na aprovação; nada retroage nem reabre apuração já feita. Pedido enviado no prazo e aprovado depois de 05/11 funciona.
- **Sem comprovante:** só observação de até 200 caracteres (não há armazenamento/retenção definidos para fotos ou arquivos de visitantes). Retenção dos pedidos: não decidida; ficam enquanto o mapa existir.
- O gatilho `carimbos_origem` sobrescrevia qualquer origem fora de `excecao_painel`: agora preserva também `visita_anterior`.
- Casa e o funcionário não participam do fluxo.

## Estados para a pessoa
Em análise (não conta nada) · Aprovado — falta avaliar (carimbo no mapa, não validado) · Aprovado — validado · Não aprovado (texto respeitoso + link para Contato, sem nota interna).

## Painel
Mesma tela de pedidos de presença: selo "Visita anterior", data informada pela pessoa, endereço (e aviso quando a casa tem mais de um), se já avaliou, quantos carimbos já tem na casa, contato (só com `relatorio.ler`). Aprovar/negar com a conta pessoal (`producao.gerir`); negar exige o motivo. O carimbo aprovado aparece em "Revisão sem GPS" como **Visita anterior aprovada**.

## E-mail preparado (NÃO enviado)
Só enviar se o site com a ação estiver publicado **e** antes das 23h59:59 de 05/11.

> **Assunto:** Visitou uma casa antes de conhecer a Caça aos Carimbos? Peça o seu carimbo até hoje
>
> Olá!
>
> Se você visitou uma casa participante do Sweet & Coffee Week antes de conhecer a Caça aos Carimbos e não carimbou na hora, a organização vai analisar a sua visita.
>
> Como pedir: abra a Caça aos Carimbos, entre no seu mapa (ou crie um, com o mesmo e-mail da avaliação) e toque em "Visitei uma casa antes de conhecer a Caça". Escolha a casa e o endereço, informe a data aproximada e, se quiser, deixe uma observação.
>
> Importante:
> - Os pedidos são aceitos **somente até 23h59:59 de 5 de novembro de 2026, horário de Natal**.
> - Enviar o pedido não é aprovação: a organização analisa cada caso e o resultado aparece no seu mapa.
> - Se for aprovado, o carimbo conta a partir da aprovação e só vale como casa validada depois que você avaliar o combo daquela casa com o mesmo e-mail do mapa.
> - Não é preciso comprovante.
>
> Boa Caça!
> Equipe Sweet & Coffee Week

## O que falta para abrir ao público
1. Publicar `dev/site-completo` (ordem do Wilker: nada foi para `master`).
2. Antes do prazo (23h59:59 de 05/11), testar com um mapa de teste e e-mail confirmado.
3. Só então enviar o e-mail acima (envio é do Wilker).
4. Decidir retenção dos pedidos (pendente).
