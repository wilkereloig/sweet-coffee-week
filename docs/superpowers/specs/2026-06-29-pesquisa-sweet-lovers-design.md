# Pesquisa Sweet Lovers — Design

**Data:** 2026-06-29
**Branch:** `dev/site-completo`
**Status:** desenho aprovado, aguardando revisão do spec

## Objetivo

Criar uma pesquisa de perfil branded ("Pesquisa Sweet Lovers") como página no
site, com a identidade visual **Lovers** (`.kv-lovers`). A pesquisa é enviada por
e-mail (campanha no **Brevo**) para a lista de contatos coletada na votação da
premiação Sweet & Coffee Week Lovers. As respostas são gravadas no **Supabase**
(mesmo projeto/padrão da votação) e ficam visíveis/exportáveis no Painel.

## Decisões tomadas

- **Onde vive:** página nova no próprio site React, rota `#/lovers/pesquisa`.
  Reusa o KV Lovers já existente (fontes, cores, componentes). Não cria infra nova.
- **Destino das respostas:** Supabase, reusando o padrão da votação
  (`src/lib/supabase.js`, projeto `dgfmoibynftadsyjcclg`, publishable key
  client-safe). Nada de Formspree/Sheets — dado próprio, sem cap de volume.
- **Identificação:** sem seção de contato no formulário. O e-mail da pessoa chega
  pelo parâmetro de URL `?e=`, preenchido pela merge tag do Brevo
  (`?e={{contact.EMAIL}}`). Campo **Nome** opcional de cortesia.
- **Envio:** Brevo dispara a campanha com o link carimbado. Configuração da
  campanha no Brevo é manual (feita pelo Wilke no painel do Brevo) — fora do
  escopo de código.
- **Painel:** estender o Painel Lovers para listar/exportar as respostas da
  pesquisa, mirrorando o fluxo de export da votação.

## Fluxo

```
Brevo (campanha → lista da votação Lovers)
  → e-mail com botão "Responder pesquisa"
  → link: https://www.sweetcoffeeweek.com.br/#/lovers/pesquisa?e={{contact.EMAIL}}
       → página Pesquisa Sweet Lovers (KV Lovers, no site)
            → grava resposta no Supabase (RPC insert)
                 → Painel Lovers lê / exporta XLSX
```

## Conteúdo da pesquisa (15 perguntas, 7 seções)

Réplica fiel do Google Form atual. Tipos: `multi` (checkbox múltiplo),
`multi-max:N` (checkbox com limite N), `single` (radio). "Outro" = opção com
campo de texto livre. `*` = obrigatória.

**Intro**
- Título: "Pesquisa Sweet Lovers"
- Subtítulo: "Ei, Sweet Lover! Queremos te conhecer melhor e de quebra você
  concorre a brindes especiais do Sweet & Coffee Week. São só alguns minutinhos!"

**Seção 1 — Perfil de lazer**
- Q1 `multi` * "Nos seus momentos livres, o que você mais curte fazer?"
  Sair para comer ou tomar café · Ouvir música · Ir ao cinema ou teatro ·
  Passear ao ar livre (praia, parque ou praça) · Explorar shoppings e lojas ·
  Eventos culturais e festivais · Praticar esportes ·
  Ficar em casa (séries, jogos, livros) · Viajar e explorar lugares novos · Outro
- Q2 `multi-max:3` * "Quais desses lugares você frequenta? (escolha até 3)"
  Cafeterias · Docerias e confeitarias · Restaurantes · Bares e pubs ·
  Praças ou Parques · Food parks e mercados gastronômicos · Praias e orla · Outro

**Seção 2 — Esportes**
- Q3 `single` * "Você pratica algum esporte ou atividade física?"
  Sim, regularmente · Sim, mas de vez em quando · Não pratico no momento
- Q4 `multi` "Se sim, quais?"
  Musculação e academia · Corrida e caminhada · Futebol e futsal ·
  Vôlei e beach vôlei · Natação · Yoga e pilates · Ciclismo ·
  Artes marciais e luta · Dança · Crossfit e funcional · Outro

**Seção 3 — Música**
- Q5 `multi` * "Que estilo de música embala o seu dia a dia?"
  Pop brasileiro · Sertanejo · MPB e Bossa Nova · Rock e Indie ·
  Eletrônico e Lo-fi · Forró e Baião · Internacional (Pop, R&B, K-pop) ·
  Jazz e Blues · Reggae e Soul · Outro

**Seção 4 — Gastronomia**
- Q6 `multi` * "Quando o assunto é salgado, o que você não resiste?"
  Coxinha · Croissant e folhado · Pão de queijo · Tapioca salgada ·
  Sanduíche artesanal · Empada e esfiha · Quiche · Tábua de frios e bruschetta ·
  Wrap e crepe salgado · Outro
- Q7 `multi` * "E na hora do doce, qual é o seu fraco?"
  Bolo e torta · Brigadeiro e docinhos · Cheesecake · Macaron e petit four ·
  Açaí com granola · Sorvete e gelato · Crepe doce · Brownie e cookies ·
  Bolo no pote · Outro
- Q8 `single` * "Quando vai a um restaurante, que tipo de comida você mais pede?"
  Brasileira (tradicional) · Italiana · Japonesa e asiática ·
  Árabe e mediterrânea · Hamburguer artesanal · Mexicana · Frutos do mar ·
  Vegana e vegetariana · Outro
- Q9 `single` * "Como você se define na hora de comer?"
  Aventureiro: adoro experimentar coisas novas ·
  Fiel: tenho meus favoritos e fico neles · Equilibrado: depende do dia ·
  Saudável: sempre buscando opções leves

**Seção 5 — Sweet Lovers**
- Q10 `single` * "Com que frequência você vai a cafeterias?"
  Todo dia · Algumas vezes por semana · Uma vez por semana · A cada 15 dias ·
  Raramente · Só em eventos especiais como o SCW
- Q11 `multi-max:5` * "O que mais te atrai numa cafeteria ou doceria? (selecione até 5)"
  Qualidade do café · Qualidade do doce · Qualidade do salgado ·
  Ambiente e decoração · Variedade do cardápio · Preço acessível · Localização ·
  Experiência e conceito diferente · Bom atendimento · Outro

**Seção 6 — Brindes e prêmios**
- Q12 `multi` * "Que tipo de brinde seria realmente útil pra você no dia a dia?"
  Copo e caneca temática · Kit de café em casa ·
  Voucher em estabelecimentos parceiros · Necessaire ou acessório de bolsa ·
  Voucher de experiência gastronômica · Livro ou planner · Ecobag estilosa ·
  Fone de ouvido e acessório tech · Outro
- Q13 `single` * "E se fosse um prêmio maior, o que você escolheria?"
  Viagem curta (passagem e hospedagem) · Experiência gastronômica premium ·
  Kit de equipamentos de café · Vale-presente em loja de lifestyle ·
  Curso ou workshop de café e gastronomia · Outro

**Seção 7 — Conexão com o SCW**
- Q14 `multi` * "Qual canal você prefere para ficar por dentro do SCW?"
  Instagram · WhatsApp · E-mail · TikTok · Cartaz e divulgação física · Outro
- Q15 `texto` (opcional) "Deixa um recado pra gente: o que você gostaria de ver
  no próximo Sweet?" — última pergunta.

## Arquitetura front-end

- **Dados:** `src/data/pesquisaSweetLovers.js` — array de seções/perguntas
  (id, tipo, label, obrigatória, opções, limite). Mantém a página enxuta e
  declarativa; uma fonte única pro form e pro mapeamento de respostas.
- **Página:** `src/pages/lovers/Pesquisa.jsx` — wrapper `.kv-lovers`. Lê `?e=`
  da URL. Renderiza seções a partir do data. Estado das respostas em `useState`.
  Componentes internos: grupo checkbox (com limite "até N"), grupo radio, input
  "Outro", textarea, botão enviar, tela de sucesso.
- **Rota:** registrar `#/lovers/pesquisa` no router (`src/router.js` / `App.jsx`).
  Não colide com slugs congelados de QR (`#/lovers/combos/:slug`, `#/lovers/awards`).
- **Validação:** obrigatórias exigem ≥1 seleção; `multi-max:N` trava seleção
  extra (desabilita + aviso). "Outro" exige texto quando marcado.
- **Envio:** monta objeto `respostas` (chaveado por q1..q15, valor array ou
  string, + `q*_outro` quando houver) e chama o RPC de insert do Supabase.
- **Sucesso:** tela "Valeu, Sweet Lover! 🍫" substituindo o form. Sem reenvio.
- **Mobile-first**, acessível (labels, aria, navegação por teclado).

## Modelo de dados (Supabase)

Tabela `public.pesquisa_sweet_lovers`:

| coluna       | tipo          | nota                                  |
|--------------|---------------|---------------------------------------|
| `id`         | uuid pk       | `default gen_random_uuid()`           |
| `created_at` | timestamptz   | `default now()`                       |
| `email`      | text          | do `?e=`, pode ser nulo               |
| `nome`       | text          | opcional                              |
| `respostas`  | jsonb         | objeto completo das respostas         |
| `user_agent` | text          | opcional, diagnóstico                 |

**Insert via RPC** (mirror do padrão de votação, que usa `supabase.rpc(...)`):
`public.pesquisa_submit(p_email text, p_nome text, p_respostas jsonb)`
`SECURITY DEFINER`, faz o insert e retorna `id`. `GRANT EXECUTE` para `anon`.
RLS na tabela bloqueia acesso direto anon; gravação só pela RPC.

**Leitura no Painel via RPC protegida** (mirror do `admin_ping`/segredo já usado):
`public.pesquisa_list(p_secret text)` retorna as respostas para o Painel.

A criação da tabela + RPCs vai por migration, alinhada às migrations existentes
do projeto Supabase da votação.

## Painel

Estender `src/pages/lovers/Painel.jsx` com uma aba/seção "Pesquisa": lista as
respostas via `pesquisa_list` e exporta XLSX, reaproveitando o mecanismo de
export já presente para a votação. Mesmo login por senha (sessionStorage).

## Brevo (fora do escopo de código)

- Wilke configura no painel do Brevo: campanha para a lista da votação Lovers,
  com botão/CTA apontando para
  `https://www.sweetcoffeeweek.com.br/#/lovers/pesquisa?e={{contact.EMAIL}}`.
- Opcional (futuro): e-mail HTML branded Lovers — pode ser entregue depois como
  tarefa separada.

## Fora de escopo

- Configuração da conta/campanha Brevo (manual, no Brevo).
- E-mail HTML branded (opcional, tarefa futura).
- Sorteio dos brindes em si (operacional, fora do site).
- Alterar rotas/slugs existentes ou qualquer coisa de produção.

## Riscos / observações

- Projeto Supabase free pausa se ocioso — mitigado por ser o mesmo da votação
  (ativo). Se pausar na hora do disparo, o insert falha; tratar erro com mensagem
  e não perder a resposta silenciosamente.
- Volume alto (lista inteira) → Supabase aguenta; sem cap como teria o Formspree.
- Link encaminhado: `?e=` pode não corresponder a quem responde; por isso o
  campo Nome opcional e o e-mail é "melhor esforço", não identidade garantida.
- Confirmar a convenção exata de RPC/migrations do projeto Supabase antes de
  codar (inspecionar migrations existentes da votação).

## Validação prevista

- `npm run build` verde.
- Teste manual no preview: abrir `#/lovers/pesquisa?e=teste@x.com`, responder,
  validar limites "até N" e obrigatórias, enviar, confirmar linha no Supabase e
  visualização no Painel.
