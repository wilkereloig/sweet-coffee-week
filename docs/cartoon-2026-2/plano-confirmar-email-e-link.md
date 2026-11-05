# Plano — confirmar e-mail, link pessoal e mapa duplicado (05/11/2026)

Status: **proposto, aguardando ok do Wilker**. Nada alterado em código, banco ou mapa de ninguém.

## O que a investigação achou (só leitura)

1. **O fluxo existe e está no ar.** Código por e-mail (`CodigoPorEmail`), lembrete (`EmailPendente`), "Receber meu link" (`ReceberLink`), recuperação (`Recuperar`), edge `caca-email` v8 com a finalidade `link`, e as RPCs `mapa_link_validar_interno`, `mapa_codigo_emitir_interno`, `mapa_criar_v2` no banco. Em `master`.
2. **A causa do relato: o lembrete só existe na Central (`/cartoon/caca`).** `EmailPendente` e `ReceberLink` só são montados em `Central.jsx`. Quem cria o mapa pelo `Carimbo.jsx`, pelo `Convite.jsx` (página do mapa) ou pelo `caca/index.jsx` cai direto no mapa/carimbo e nunca vê "Confirmar e-mail". Mapa antigo também: só aparece se a pessoa abrir a Central.
3. **Preencher de novo cria OUTRO mapa.** `mapa_criar_v2` não procura mapa existente (de propósito: responder "esse e-mail já tem mapa" revelaria quem tem). Só limita 5 criações por e-mail em 24 h. Hoje: 206 mapas, 198 e-mails, **4 e-mails com 2+ mapas**, 40 mapas com e-mail confirmado.
4. **Vários mapas no mesmo e-mail:** `caca_mapa_principal` escolhe o principal (mais carimbos ativos; empate = o mais antigo); "confirmar" vale para o mapa da chave do aparelho; "recuperar" vale para o principal. Nada une ou apaga carimbo.
5. **"Agora não"** esconde o lembrete só na visita (sessionStorage) e ele volta. Já atende "não sumir para sempre".
6. **Não verificado:** se o provedor de e-mail (Resend/Brevo) está configurado e entrega. O log de edge não abriu pela ferramenta; sem mandar e-mail real não dá para provar. Precisa de um teste combinado com você.

## Pedido reescrito

Quem tem mapa com e-mail não confirmado deve ver "Confirmar e-mail" em **toda tela da Caça onde já tem mapa** (Central, mapa, carimbo, avaliação), sem bloquear o uso. Depois de confirmar, o link pessoal vai ao e-mail, com estado verdadeiro (enviado / falhou + tentar de novo). Com e-mail já confirmado, "Receber meu link" fica à mão. "Já tenho mapa / Recuperar" aparece **antes** do formulário em toda porta de criação. Preencher de novo não pode parecer que é o mesmo mapa: avisar quando o aparelho já tem mapa.

## Mudanças propostas (só front, sem migration nova, sem mexer em dado)

| # | O que | Arquivos |
|---|---|---|
| 1 | Extrair `CartaoEmail` (junta `EmailPendente` + `ReceberLink`, mesmo texto e estados) e montar na Central, no mapa, no carimbo e na avaliação | `caca/CartaoEmail.jsx` (novo), `Central.jsx`, `paginas/mapa/index.jsx`, `Carimbo.jsx` |
| 2 | "Já tenho mapa / Recuperar meu mapa" visível fora do `<details>` fechado, acima do formulário, nas 3 portas de criação | `CriarMapa.jsx`, `textos.js` |
| 3 | Aparelho já tem chave: formulário de criar avisa "Você já tem um mapa neste aparelho" e leva a ele, em vez de criar outro | `CriarMapa.jsx` |
| 4 | Estado do link: hoje `semLink` e `limitado` existem; acrescentar botão "Tentar de novo" na falha e manter o mapa acessível | `CartaoEmail.jsx` |
| 5 | Aviso na recuperação: "troca a chave; outros aparelhos precisam recuperar de novo" (já existe em `Recuperar`; garantir em `CodigoPorEmail`) | `textos.js` |
| 6 | Testes: unidade (estados do cartão, regra de exibição) + navegador (390 e 1440, mapa novo, antigo, confirmado, falha de envio com RPC interceptada, recarregar) | `tests/cartoon-caca-email-*.mjs` |

Não muda: banco, edge function, chaves, mapas existentes, flags. Nenhum e-mail real é enviado nos testes (RPC interceptada).

## Fora do escopo (perguntar antes)

- **Unir os 4 e-mails com 2+ mapas:** não fazer sem ordem. Só dá para unir com decisão sua, caso a caso.
- **Teste real de entrega:** mandar 1 código e 1 link para um e-mail seu, com sua combinação.
- **Detectar "e-mail já tem mapa" no formulário:** revela quem tem mapa; só com verificação por código. Proposta: não fazer.

## Decisão posterior (05/11/2026): um mapa por e-mail

Wilker: um e-mail não pode ter vários mapas; quem tentar criar de novo é avisado e entra no mapa que já tem.
Aplicado: migration `20261225_caca_um_mapa_por_email` (aplicada no Supabase em 05/11) — `mapa_criar_v2` devolve `{ ok:false, motivo:'email_ja_tem_mapa' }` (JSON, para o pedido seguir contando no limite por IP) e não cria. A tela (`CriarMapa`) mostra "Esse e-mail já tem um mapa" e leva a "Entrar no meu mapa" (recuperação por código, e-mail já preenchido). Mapas já duplicados (4 e-mails) não foram tocados. Custo declarado: o aviso revela que o e-mail participa; limites de 60/10 min por IP e 5/24 h por e-mail seguem. Reverter: `supabase/reverter/20261225_caca_um_mapa_por_email.sql`. Testes SQL antigos que duplicavam e-mail passaram a usar `mapa_criar` (v1); só `caca-um-mapa-por-email.sql` foi rodado de novo no banco.
