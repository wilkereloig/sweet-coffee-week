# Comando de execução — Claude Code

Você vai construir, revisar e concluir o sistema de painéis do Sweet & Coffee Week:
a área da organização e a área das marcas participantes, funcionando como aplicativo
instalável, com notificações e segurança. Trabalhe com autonomia: tome as decisões
técnicas que forem necessárias, sem parar para perguntar — **exceto as quatro listadas
no item 4**, que não são suas para decidir.

---

## 0. Leia primeiro, nesta ordem

1. `CLAUDE.md` — regras duras do projeto.
2. `docs/BRIEFING-painel-completo-2026-08.md` — **o que o cliente quer.** É o documento
   mais recente e manda em caso de divergência.
3. `docs/INSTRUCAO-marca-completa.md` — **como fazer.** Modelo de dados, SQL, telas,
   push, testes. Detalhe técnico do briefing.
4. `docs/INSTRUCAO-painel-fase2.md` — autenticação da organização.

**Precedência:** onde o briefing e a instrução divergirem, vale o briefing.

**O briefing acrescenta quatro coisas que a instrução técnica ainda não cobre. Nenhuma
pode ser pulada:**

- contas da organização por função, criadas por um administrador (§1.2 do briefing);
- área de arquivos para download, geral e por marca (§2.4);
- campos de delivery no cadastro do participante (§3.1);
- a seção de segurança inteira (§7) — hoje **não existe nenhuma proteção contra robô**
  nos formulários públicos, e isso é o item mais exposto do sistema.

**Nunca siga `docs/_arquivo-instrucoes-antigas/`.** Está superado e contém suposições
erradas.

---

## 1. Trava — nada começa antes disto

**Gere o backup do banco antes de aplicar qualquer migration.**

- `supabase db dump`, guardado fora do repositório.
- **O dump nunca vai para o git.** Ele contém nome, e-mail e telefone de pessoas reais.
  Confirme o `.gitignore` antes de gerar.
- Se não conseguir gerar o backup, **pare e avise**. Não aplique migration nenhuma sem
  ele. O banco tem dado real e não há como voltar atrás.

---

## 2. Absolutos

- Trabalhe só em `dev/site-completo`. Nunca em `master`.
- Toda migration testada antes dentro de `begin; ... rollback;`.
- Mudança de schema é sempre **aditiva** — não altere nem remova coluna existente sem
  migrar o dado real primeiro.
- A chave `service_role` e a chave privada VAPID vivem só como variável de ambiente de
  Edge Function. Nunca em `public/`, nunca em `src/`.
- Toda tabela nova nasce com RLS ligada e política explícita. Sem exceção.
- Todo dado vindo do banco passa pela função `escapar()` que já existe antes de ir para
  `innerHTML`.
- Um único bloco `<script>` por arquivo estático. Toda função declarada como
  `function nome(...)`, nunca `const nome = () => {}`.
- Não toque em `/quero-participar/` além de acrescentar a proteção anti-robô.
- Não apague a linha de teste que já existe em `participantes`.
- Captcha é conferido **no servidor**. Validação só no navegador não conta como proteção.
- Nunca afirme que gravou antes de o servidor confirmar.

---

## 3. Decisões já tomadas — execute, não pergunte

1. **Funções da organização:** construa o controle de permissão como dado, não como
   código — uma tabela de funções e permissões, semeada com quatro: `administrador`
   (tudo, inclusive criar contas), `curadoria` (candidaturas e liberação de acesso),
   `producao` (avisos, solicitações, prazos, arquivos, fotos) e `consulta` (lê tudo,
   não altera nada). Assim mudar a equipe depois é editar dado, não reescrever código.
2. **Segundo fator no administrador:** ative, se estiver disponível no plano atual. Se
   exigir plano pago, não force — registre no relatório final.
3. **Confirmação de leitura em arquivos:** construa a capacidade (uma marcação por
   arquivo), com o padrão desligado. Ligar depois é configuração.
4. **CNPJ e razão social:** crie os campos como opcionais. Não torne obrigatórios e não
   bloqueie nada por causa deles.
5. **Anti-robô:** Turnstile da Cloudflare, com token conferido no servidor, mais
   campo-armadilha, mais tempo mínimo de preenchimento, mais limite por origem. Quando
   bloquear, responda como se tivesse dado certo — descarte silencioso.
   As chaves do Turnstile vêm de variável de ambiente. Se não existirem, deixe o código
   pronto, desligado por bandeira, e diga no relatório o que falta.
6. **Chaves VAPID:** gere você mesmo.
7. **Retenção de dados:** construa o mecanismo (exportar e excluir os próprios dados),
   mas **não apague nada automaticamente** e não defina prazo sozinho.
8. **Plano Supabase:** continua o gratuito. Não proponha migração paga para resolver
   problema que tem solução gratuita.

---

## 4. O que você NÃO decide sozinho — pare e pergunte

1. Qualquer exclusão definitiva de dado real já existente no banco.
2. Prazo de descarte de dados pessoais (candidaturas não aproveitadas).
3. Contratar plano pago de qualquer serviço.
4. Publicar em produção (`master`) ou tornar qualquer painel acessível sem login.

Fora desses quatro, decida e siga.

---

## 5. Ordem de execução

Faça **um commit por fase**, com mensagem descritiva. Ao terminar cada fase, anote o
estado em `docs/PROGRESSO-execucao.md` (crie o arquivo): o que ficou pronto, o que não
ficou, e por quê.

1. **Backup** (item 1) — trava tudo.
2. **Segurança dos formulários públicos** — Turnstile, campo-armadilha, tempo mínimo,
   limite por origem, nos quatro formulários do site. É o risco mais exposto e não
   depende de nada.
3. **Autenticação da organização** — Fase 2 mais as contas por função e o administrador
   que cria contas. Aposente a senha compartilhada quando as contas existirem; até lá,
   ponha limite de tentativa nela.
4. **Modelo de dados** — itens do combo, avisos, solicitações com prazo e
   acompanhamento, sessões de fotos, arquivos, campos de delivery, inscrições de push.
   Buckets de Storage com política própria e link que expira.
5. **Painel da marca** — cadastro completo (tema, três itens, unidades, horários,
   delivery), sessão de fotos, downloads, avisos e prazos, canais.
6. **Painel da organização** — central de formulários com estado e responsável, ficha
   completa do participante, avisos e solicitações com acompanhamento de quem respondeu,
   agendamento e envio de fotos, área de arquivos, gestão de contas.
7. **Aplicativo instalável e notificações** — PWA em `/marca/`, handler de push nos dois
   painéis, Edge Function de envio, e a orientação de instalação no iPhone.
8. **Testes** — estenda `tests/marca.test.mjs` e `tests/organizacao.test.mjs`.
9. **Revisão final** (item 7).

Se o contexto acabar antes do fim: **pare limpo.** Commit do que está pronto, atualize
`docs/PROGRESSO-execucao.md` e diga exatamente onde parou. Nunca deixe uma migration
aplicada pela metade nem uma tela quebrada.

---

## 6. Como testar

`npm run dev` **não serve** as páginas estáticas dos painéis. Teste sempre contra o build:

```bash
npm run build && npx vite preview --port 4173
# http://localhost:4173/organizacao/   e   http://localhost:4173/marca/   — com a barra final
```

---

## 7. Revisão final — obrigatória

Depois de construir, revise o próprio trabalho e corrija o que achar:

- Rode a suíte de testes inteira. Rode os Security Advisors do Supabase.
- Confira, arquivo por arquivo: nenhum segundo `<script>`; nenhuma função declarada como
  arrow; nenhum dado do banco indo para `innerHTML` sem `escapar()`; nenhuma chave
  secreta fora de variável de ambiente; nenhuma tabela nova sem RLS e sem política.
- Teste que uma marca não lê o dado de outra — autenticando de verdade como duas contas
  diferentes, não só lendo o código.
- Teste que a marca não consegue escrever no campo de foto, chamando a API direto.
- Teste que o captcha rejeita envio sem token, chamando o endpoint direto — sem passar
  pela tela.
- Instale os dois painéis num Android e num iPhone e confirme que a notificação chega.
- Confira o briefing item por item e marque o que ficou de fora.

---

## 8. O que reportar no fim

- O que foi construído e **testado de verdade**, separado do que foi construído e não
  testado.
- O que ficou de fora, e por quê.
- Toda decisão que você tomou e que valha o cliente saber.
- Todo campo, nome de coluna ou comportamento que não bateu com o que os documentos
  previam.
- O que depende de ação dele: chaves do Turnstile, onde guardar o backup, prazo de
  retenção, e qualquer outra coisa que você tenha encostado no item 4.

Não diga que está pronto o que você não viu funcionando.
