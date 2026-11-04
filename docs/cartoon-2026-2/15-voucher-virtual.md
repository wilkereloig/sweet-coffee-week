# 15 · Voucher virtual

**Estado (04/11/2026): migration APLICADA no banco (projeto `dgfmoibynftadsyjcclg`, `TESTE_OK`), site testado, NADA publicado. Vouchers virtuais GERADOS em 04/11/2026 (54 = 2 por marca das 27 casas com cartão; ver "Falta" 1).** Decisões do Wilker (chat 4bb80e0c): vale só na casa que cedeu, com **cota extra de 2 por marca** (não sai dos 7 impressos), entrega por **link**, validação pela marca **digitando o código ou lendo o QR**. O cartão impresso (cartão de crédito Sicredi) tem a arte em `…/07_VOUCHERS/04_CARTAO_SICREDI/`; **a arte virtual é a mesma, em tela, e foi feita em 04/11** (ver "Arte em tela").

## Como funciona

| Passo | Quem | O quê |
|---|---|---|
| 1 | Organização | `gerar_vouchers_virtuais` completa cada marca até `edicoes.vouchers_virtuais_por_participante` (padrão 2). Cada voucher nasce com **código** `SCW-XXXXX` e **token** de 12 letras |
| 2 | Organização | `destinar_vouchers_virtuais` liga N vouchers a um contato e devolve `{codigo, link_token}`; o link é `/cartoon/voucher/<token>` |
| 3 | Cliente | Abre o link: vê a casa, o código, o QR e o estado (válido, ainda não vale, vencido, usado, cancelado). Só o **token** abre a página; o código não abre |
| 4 | Marca | Dá baixa com `marca_usar_voucher(código)`, **a mesma do impresso**. Painel: digitar (já existe) ou ler o QR (falta) |

## Segurança (por que o token existe)

O código tem 5 caracteres (~33 milhões). Com uma página pública por código, alguém varreria a faixa inteira e descobriria códigos válidos. O **token** (31^12 ≈ 8 × 10^17) é secreto e só vai no link; a função pública `voucher_virtual_ver` devolve **um voucher por token** e nunca lista. Tabelas seguem fechadas (RLS sem política).

## O que mudou no banco (`20261201_voucher_virtual.sql`)

- `vouchers.canal` (`fisico` | `virtual`) e `vouchers.link_token`; constraint: virtual **sempre** tem token, impresso **nunca**.
- `gerar_vouchers` e `destinar_vouchers` passam a olhar **só os impressos** (sem isso o virtual entraria na conta da cota de 7).
- `get_vouchers` ganha `cota_virtual` (e cada voucher traz `canal` e `link_token`); `marca_meus_vouchers` ganha `virtuais` e `canal` em cada utilizado. As chaves antigas continuam.
- Reverter: `supabase/reverter/20261201_voucher_virtual.sql` (**apaga** os virtuais). Teste no banco: `supabase/testes/voucher-virtual.sql` (esperado `TESTE_OK`).

## O que está no site

`src/edicao/rota/voucherVirtual.js` (funções puras) · `src/edicao/cartoon/paginas/VoucherVirtual.jsx` · cena `voucher` em `src/edicao/rotas.js` · `src/styles/cartoon/12-voucher.css` · teste `tests/cartoon-voucher-virtual.test.mjs` (no `test:cartoon`). A rota nasce em `/cartoon/voucher/<token>`, atrás do mesmo gate de `CARTOON_PUBLICA` do carimbo. **Para o cliente abrir o link de verdade, `/cartoon` precisa estar público** (decisão do Wilker, com deploy).

## O que está no painel (feito em 04/11, `painel-app/CLAUDE.md` tem o detalhe)

- **Organização:** Contatos › Vouchers › seletor "Canal" (Impressos · Virtuais): gerar, destinar, **copiar link** e **copiar mensagem**.
- **Marca:** o cartão de vouchers mostra os virtuais; o campo do código é preenchido por **`/painel/?voucher=SCW-XXXXX`** (QR aberto pela câmera do celular, guardado antes do login) ou por **"Ler o QR do cliente"** no painel (só onde há `BarcodeDetector`). Ler só preenche; **registrar é sempre um toque da marca**.

## Arte em tela (04/11/2026)

A página mostra o cartão da casa em SVG (`viewBox` 84 × 54 mm = o corte do impresso): a **frente** é a do impresso de cada casa (com o nome do titular) e o **verso** é o da cor dela **sem QR e sem código**; o QR (só os módulos, 16,42 mm) e o código entram por cima, nas posições do impresso. Botão "Ver o verso" / "Ver a frente" vira a face. O QR grande e o código abaixo do cartão continuam sendo o que a marca lê.
- Imagens: `public/images/marcas-edicoes/2026.2/voucher/` (27 `frente-<slug>.webp` + 3 `verso-<cor>.webp`, 1008 × 648, 1,8 MB no total). Dados: `src/data/voucherArteEdicao.js` (**gerado**: cor de cada casa, medidas, `arteDoVoucher(slug)`). Casa sem cartão impresso (hoje Delas Café Bistrô e Docinhos da Lalá) cai no bloco com logo e nome, sem cartão.
- Gerado por scripts da pasta da edição (`07_VOUCHERS/04_CARTAO_SICREDI/_bastidores/`): `gerar_versos_virtual.jsx` (Illustrator, numa cópia do `.ai`), `arte_voucher_virtual.py` (exporta e gera o `.js`), `previa_voucher_virtual.py` (prévia ao lado do impresso).
- Testes: `tests/cartoon-voucher-virtual.test.mjs` (27 casas, 9 por cor, arquivos no disco, geometria) e `npm run build && npm run test:cartoon-voucher` (navegador, com o RPC interceptado e o relógio dentro da validade).

## Falta

1. ~~Gerar os virtuais~~ — **feito em 04/11/2026** (ordem do Wilker): 54 vouchers `canal='virtual'`, 2 por marca nas 27 casas elegíveis (Delas Café Bistrô e Docinhos da Lalá estão `encerrado` e ficam de fora, como no impresso), todos `disponivel` com token de 12 letras, códigos e tokens únicos, 189 impressos intactos. Gerado por SQL com a mesma regra de `gerar_vouchers_virtuais` (a função exige o segredo de um usuário do painel) e registrado em `auditoria` (`vouchers.gerados_virtuais`, 54). **Falta destinar:** pelo painel (Contatos › Vouchers › Virtuais), ligar cada voucher a um contato e copiar o link/mensagem.
2. ~~Arte do voucher virtual~~ — feita em 04/11 (ver acima). Falta o Wilker ver no aparelho.
3. **Publicar** (decisão do Wilker): sem `CARTOON_PUBLICA` o cliente não abre o link. Painel e página só vão ao ar com o commit e o push.
4. **Verificar em aparelho:** abrir o QR no iPhone e no Android, e a câmera do painel (Chrome Android).
5. Quantidade (2) e validade (5 a 15/11, fuso de Natal, em `voucherVirtual.js`) estão decididas; mudar a cota é uma coluna, sem código.
