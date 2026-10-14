# Sweet & Coffee Week Cartoon 2026.2 — especificação do site da edição e do painel

**Estado (14/10/2026, noite):** fases 1, 4, 5 e 6 implementadas em `dev/site-completo` (só preview); banco escrito e **não aplicado**; roteiro de lançamento pronto — ver [09-execucao.md](09-execucao.md).
**Data:** 14/10/2026 · **Branch analisada:** `dev/site-completo` (HEAD `066510d`, igual a `master`).
**Escopo:** a camada de edição Cartoon (site público da 17ª edição) e o que o painel precisa ganhar para alimentá-la.

## Como ler

Cada afirmação traz uma marca:

| Marca | Significa |
|---|---|
| **[Fato]** | conferido no código, no histórico do Git, no banco (leitura) ou na pasta da edição, com a evidência ao lado |
| **[Proposta]** | decisão técnica deste plano; pode ser revista sem consultar ninguém |
| **[Decisão]** | depende da organização (Wilker / F2); está listada em [08-decisoes-pendentes.md](08-decisoes-pendentes.md) com recomendação |

Nada aqui declara aprovação visual, integração operacional ou conformidade legal. O que foi lido no banco foi lido em modo leitura (esquema, restrições, permissões e contagens), sem dado pessoal.

## Arquivos

| # | Arquivo | Conteúdo |
|---|---|---|
| 1 | [01-inventario.md](01-inventario.md) | Sistema atual (site, painel, banco) e experiência Lovers recuperada do Git, com classificação Reutilizar / Adaptar / Reconstruir / Aposentar |
| 2 | [02-arquitetura-rotas-fases.md](02-arquitetura-rotas-fases.md) | Duas camadas, mapa de rotas, endereços canônicos, QR Codes, matriz de fases e publicação, transições e reversão |
| 3 | [03-modelo-de-dados.md](03-modelo-de-dados.md) | Entidades, dicionário de campos, restrições alimentares e substituições, projeção pública, mudanças propostas no banco |
| 4 | [04-painel.md](04-painel.md) | Cadastro progressivo da marca e fluxo de revisão e publicação da organização |
| 5 | [05-paginas-e-wireframes.md](05-paginas-e-wireframes.md) | Estrutura de cada página, wireframes de entrada, catálogo e participante (desktop e celular), movimento, identidade, estados parciais e de falha |
| 6 | [06-mapa-rota-avaliacao.md](06-mapa-rota-avaliacao.md) | Mapa, Minha rota, avaliação e premiação |
| 7 | [07-implementacao-e-testes.md](07-implementacao-e-testes.md) | Nove fases de execução com escopo, arquivos, critérios, testes, riscos e reversão |
| 8 | [08-decisoes-pendentes.md](08-decisoes-pendentes.md) | O que depende da organização, com recomendação e impacto |
| 9 | [09-execucao.md](09-execucao.md) | **Execução (14/10/2026):** estado por fase, como aplicar o banco, testes, roteiro de lançamento e de encerramento |

## O essencial em uma tela

1. **Não existe hoje nenhum caminho público para dado de marca, unidade ou combo.** [Fato] O banco não tem política para `anon` em nenhuma tabela, nem view pública; o site lê Supabase só para formulários. Tudo da página do participante depende de uma **projeção pública nova** (função `SECURITY DEFINER` que lê só versões publicadas).
2. **O cadastro da marca já cobre metade do que a página precisa.** [Fato] Marca, três itens (doce, salgado ou segundo doce, bebida), ingredientes, três selos booleanos, substituição em texto livre, unidades com endereço, bairro, horário em texto e delivery com canais. Faltam: foto por item, coordenadas, horário estruturado do combo, consumo no local e retirada por unidade, WhatsApp público por unidade, declaração alimentar com "não informado", alergênicos, substituição estruturada, prévia e publicação.
3. **O fluxo de revisão já existe e deve ser estendido, não duplicado.** [Fato] `combo_status` (rascunho → em_analise → correcao_solicitada/aprovado), `correcoes_campo` por campo, `solicitacoes`, `auditoria` com antes/depois. Falta a **versão publicada** separada da versão em edição: hoje a marca pode alterar um combo já aprovado sem que nada mude de estado.
4. **Lovers deixa padrões, não código.** [Fato] As páginas públicas saíram em `510b0b7` (22/06/2026); dependiam de dados estáticos em JS e do sistema visual Lovers. Valem como referência: filtros do catálogo, estado "aberto agora", Minha rota, desenho do `submit_vote` (janela validada no servidor, último voto vale). Os votos Lovers não estão mais no banco: `votos` tem 0 linhas hoje.
5. **Configuração em seis interruptores independentes**, dois no código (rota pública da edição e experiência da entrada principal, que mexem no domínio e exigem deploy autorizado) e quatro no banco (participantes, combos, avaliação, resultados), acionados pela organização no painel, sempre por ação humana e com auditoria. Nenhum liga por data.
6. **A página do participante é a única ficha.** `/cartoon/combos/:slug` renderiza a mesma página focada no combo, com endereço canônico do participante.
7. **Bloqueadores de negócio** que não travam o início: critérios e campos da avaliação, categorias da premiação, provedor do mapa, tipografia web da edição, plano do Supabase durante o festival e validação especializada do texto sobre alergênicos.

## Dados reais usados

- Edição `2026.2`: tema `CARTOON`, festival de 05 a 15/11/2026, valor do combo R$ 38,90, 7 vouchers por marca. [Fato: `edicoes`]
- 26 participações em 2026.2: 21 aguardando cadastro, 4 em preenchimento, 1 encerrada; todas com `combo_status = rascunho`. 28 unidades; 5 marcas com mais de uma unidade. 78 itens, nenhum com foto, nenhum com ingredientes preenchidos. [Fato: contagem no banco em 14/10/2026]
- A lista final de participantes ainda não está fechada. Os wireframes usam conteúdo de demonstração, identificado como tal.
