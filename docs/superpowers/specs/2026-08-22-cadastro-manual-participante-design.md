# Cadastro manual de participante

**Data:** 22/08/2026 · **Branch:** `dev/site-completo` · **Estado:** aprovado

## O problema

Hoje uma marca só ganha acesso por um caminho: preencher o formulário público
`/quero-participar/`, ser aprovada no painel, e receber o acesso pelo botão
**Criar acesso** da ficha. `participantes.origem_id` aponta para a candidatura.

Isso deixa de fora a marca que a organização convida direto — a que o Eloi
conhece, chama por WhatsApp, e que nunca vai preencher formulário nenhum. Hoje
ela só entra se alguém preencher a candidatura no lugar dela, o que produz um
registro falso na lista de inscrições.

## Decisões tomadas

| Pergunta | Decisão |
|---|---|
| A conta nasce junto com o cadastro? | **Sim, uma tela só.** Preenche, aperta, sai com login e senha na mão |
| Quais campos? | **Nome do estabelecimento, telefone, e-mail, responsável** |
| E se a marca já existir? | **Recusa e explica**, nos dois casos: já tem conta, ou já tem candidatura |
| Onde a conta é criada? | **Estendendo a Edge Function existente**, não numa nova |

### Por que estender e não criar função nova

O modelo de acesso — formato do login, geração de senha, `deve_trocar_senha`,
devolução das credenciais — é exatamente a coisa que não pode ter duas cópias.
Nesta mesma sessão foi preciso escrever um teste comparando as duas
slugificações (Edge Function e `/marca/`) justamente porque elas vivem em
arquivos diferentes e divergiriam caladas.

Com uma segunda função, `deve_trocar_senha` ganharia a mesma exposição — e o
modo de falha é pior que um login que não abre: seria uma marca cadastrada à
mão **sem a trava**, com senha permanente no histórico do WhatsApp, sem
ninguém notar.

### Descartado

**Criar uma candidatura silenciosa e reusar o fluxo inteiro.** Zero código
novo, mas encheria `quero_participar` de registros que ninguém enviou — e eles
apareceriam na aba "Respostas" como inscrições reais. Dado inventado por outro
meio.

## Arquitetura

### 1. Banco — `vincular_marca_manual(p_user, p_nome, p_responsavel, p_telefone, p_email)`

Irmã de `vincular_conta_marca`, com as diferenças que o caso exige e nenhuma
além:

| Igual | Diferente |
|---|---|
| perfil com `papel = 'marca'` fixo — nunca cria organização | `origem_id` fica `null` |
| linha vazia em `participantes_operacao` — sem ela a policy de UPDATE não tem o que atualizar | dados vêm de argumento, não da candidatura |
| `security definer`, `revoke` de `public`, `anon` e `authenticated` | não toca em `quero_participar` |
| grava auditoria | `detalhe` carrega `origem: 'manual'` |

⚠️ `on conflict (origem_id)` **não serve aqui**: com `origem_id` nulo o índice
único não se aplica (NULLs não são iguais em Postgres), então o `ON CONFLICT`
nunca dispararia. O insert é direto, e quem impede duplicata é a checagem de
colisão na Edge Function, antes de criar o usuário.

### 2. Edge Function — segundo ponto de entrada

`criar-acesso-marca` passa a aceitar:

```
{ secret, origem_id }                                    // candidatura aprovada
{ secret, marca: { nome, responsavel, telefone, email } } // cadastro manual
```

Exatamente um dos dois. Os dois juntos ou nenhum → `400 entrada_ambigua`.

Do slug para baixo o caminho é **idêntico**: `slugLivre`, `gerarSenha`,
`createUser`, `deve_trocar_senha`, `slug`, credenciais.

Duas recusas novas, antes de tocar no Auth:

- slug já pertence a um participante → `409 marca_ja_tem_acesso`
- existe candidatura com o mesmo nome normalizado → `409 existe_candidatura`,
  **com o id dela**, para a tela mandar usar o Criar acesso da ficha em vez de
  só reclamar. Sem isso a candidatura ficaria órfã, sem vínculo com a conta.

### 3. Painel — a tela

- Botão **Cadastrar marca** no cabeçalho da aba `marcas` e dentro do estado
  vazio.
- Abre na **folha do detalhe** que já existe. Nenhuma superfície nova.
- Quatro campos. **Nome e telefone obrigatórios** — um vira o login, o outro é
  o botão do WhatsApp. E-mail e responsável opcionais: marca sem e-mail não
  pode ficar sem acesso, já que a entrega não depende de caixa de entrada.
- **Mostra o login que vai nascer**, ao vivo, enquanto o nome é digitado
  (`ELOI Doces` → `eloi-doces`). O login não se troca depois: nome digitado
  errado vira login errado para sempre, e a correção seria apagar e refazer.
  Ver o login antes de criar é o que torna isso reversível de graça.
- No sucesso, reusa `mostrarCredenciais()`.
- Corrige o texto do estado vazio, que ainda descreve o modelo de convite por
  e-mail removido em 22/08/2026.

### 4. Testes

Em `tests/organizacao.test.mjs` e `tests/marca.test.mjs`:

- a RPC nova existe na migration e é revogada de `anon`/`authenticated`;
- a Edge Function recusa entrada ambígua (os dois pontos) e vazia (nenhum);
- as duas colisões têm código de erro próprio e mensagem na tela;
- o cadastro manual passa pela mesma geração de senha e liga `deve_trocar_senha`
  — não há segundo caminho que escape da trava;
- o estado vazio não menciona mais convite por e-mail;
- campos do formulário passam por `escapar()` antes de ir para `innerHTML`;
- nada afirma criação antes de o servidor confirmar.

**Todas falsificadas por mutação** antes do commit. Regra desta sessão, aprendida
três vezes hoje: asserção de ausência lê código sem comentário, senão casa com a
explicação de por que aquilo não é usado.

## Fora de escopo, de propósito

**Apagar marca com acesso.** É mais delicado que apagar candidatura — há sessão
viva, cadastro preenchido e possivelmente foto no Storage. Merece desenho
próprio.

**Editar marca já cadastrada.** O Eloi dispensou explicitamente na conversa
anterior; a própria marca edita em `/marca/`.

## Riscos

| Risco | Mitigação |
|---|---|
| Marca cadastrada à mão sem a trava de primeiro uso | O caminho é o mesmo da candidatura, e há teste garantindo que não existe segundo caminho |
| Duas marcas com nomes que colapsam no mesmo slug | `slugLivre` já resolve com sufixo; a checagem de colisão avisa antes |
| Candidatura órfã, sem vínculo com a conta criada à mão | Recusa com o id da candidatura, apontando o caminho certo |
| Nome digitado errado vira login errado, e login não se troca | A tela mostra o login que vai nascer, antes de criar |
