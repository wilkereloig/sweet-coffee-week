<!-- Parte das regras do projeto. Índice: src/pages/CLAUDE.md. Movido sem reescrita de src/pages/CLAUDE.md em 10/11/2026. -->

### 7.9 Documentos legais — `/privacidade`, `/cookies`, `/termos`, `/uso-de-imagem` (13/10/2026)

**Onde mora:** `src/pages/legal/index.jsx` (uma página para os quatro, chunk `Legal`);
texto em `src/data/conteudo/legal.js`; CSS em `scw-legal.css` (prefixo `.lg-`). A
rota resolve em `src/lib/rotas.js` **antes de qualquer flag de publicação**: com o
site restrito a uma página, os quatro documentos continuam abrindo — e só eles
(`tests/consentimento.test.mjs`, item 12). Os rewrites da Vercel servem o link limpo
(`/privacidade`); o hash (`#/privacidade`) também funciona. Links no rodapé (sempre,
inclusive com `semLinks`; em Edições também) e na folha "mais" — nunca
no menu principal. Sem movimento de entrada (`data-mo-fora`).

**Dados confirmados pelo Wilker em 13/10/2026** (`src/config/channels.js`):
F2 EXPERIENCE LIVE MARKETING LTDA, CNPJ 26.723.343/0001-78, canal
`contato@fabrica2.com.br` com o assunto "Privacidade — Sweet & Coffee Week"
(`PRIVACIDADE_MAILTO`). ⚠️ `/quero-participar/` repete o e-mail em
`CONFIG.emailDestino` (página estática, fora do bundle).

**Análise de acesso — legítimo interesse, não consentimento (decisão do Wilker,
13/10/2026).** O Google Analytics vem ligado e o aviso só informa, com recusa a um
clique (§6.10 de `src/CLAUDE.md`). As políticas dizem isso com todas as letras. ⚠️ O
guia de cookies da ANPD admite legítimo interesse para medir audiência, mas com o
Google (terceiro, fora do Brasil) é contestável — a avaliação escrita do legítimo
interesse é a pendência nº 1 abaixo.

**Uso de imagem (`/uso-de-imagem`, pedido do Wilker):** explica que há fotos de pessoas
das edições e como pedir a retirada — e-mail com o assunto "Retirada de imagem — Sweet &
Coffee Week" (`IMAGEM_MAILTO` em `channels.js`), sem precisar justificar; a equipe
confirma quando a foto sair. Linkado no rodapé, na Privacidade e nos Termos. **A
retirada é manual:** tirar a foto de `imageLibrary.js` (e da série/galeria que a usa) e
publicar.

**Formulários:** Contato, Apoiar e `/quero-participar/` têm nota de finalidade com link
para a Política de Privacidade (`NotaPrivacidade.jsx`; no estático, `.pa-nota`). É
ciência, não consentimento: **sem checkbox**, e o envio nunca depende do aviso de
cookies.

⛔ **Pendências de validação interna — NÃO preencher no texto público por suposição:**
0. **avaliação escrita do legítimo interesse (LIA) para o Google Analytics** — a base
   que as políticas declaram depende dela; sem ela, voltar ao modelo de consentimento;
0b. quem atende os pedidos de retirada de imagem e em quanto tempo (o texto promete
   retirar e confirmar por e-mail, sem prazo);
1. encarregado (DPO): não há pessoa nomeada; a LGPD pede a identidade e o contato
   do encarregado — decidir quem é, ou registrar a dispensa aplicável;
2. base legal de cada finalidade (Contato, Apoio, pré-cadastro, registros técnicos,
   painel) — só a análise de acesso tem base declarada (legítimo interesse);
3. prazos de guarda dos formulários, dos registros técnicos da Edge Function e a
   retenção configurada na propriedade do Google Analytics (`G-FM5ZJXL3MV`);
4. onde ficam os servidores (região do projeto Supabase, Vercel, Google, Adobe,
   Cloudflare) e se há transferência internacional;
5. contratos/termos de tratamento com os fornecedores;
6. se o segredo do Turnstile está configurado na Edge Function (o widget carrega no
   pré-cadastro; a conferência no servidor depende de `TURNSTILE_SECRET_KEY`);
7. Archivo via Google Fonts e Nexa via Adobe Fonts falam com terceiros em toda
   página, sem depender de escolha — considerar hospedar a Archivo localmente;
8. quem lê `contato@fabrica2.com.br` e como os pedidos de titular são registrados e
   respondidos;
9. o Painel SCW tem dados próprios (contas, operação das marcas) descritos só em
   linhas gerais — detalhar se o painel ganhar política própria;
10. regulamentos de edição, participação, premiação e uso de imagem são documentos
    distintos e não existem no site — revisar quando houver;
11. revisão jurídica dos quatro textos antes de tratá-los como finais.

