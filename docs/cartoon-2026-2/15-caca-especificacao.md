# 15 · Caça aos Carimbos — especificação da experiência completa

Decisões do Wilker (04/11/2026). Fonte única da regra; o contrato técnico das funções está em `15-caca-contrato.md`.
Regras de operação: `AGENTS.md`/`CLAUDE.md` (branch `dev/site-completo`, nada de `master`, nada de deploy de produção,
não mexer em flags públicas como `MAPA_PUBLICO`, nunca ler/mostrar/versionar segredos, commit só dos arquivos da tarefa).

## 1. Objetivo e progresso
- Objetivo: fazer as pessoas **conhecerem casas diferentes** e completar as 27. Revisita é incentivada, com vantagem menor.
- Progresso principal = **casas diferentes validadas (0..27)**. Revisita válida = **carimbo extra**.
- Casa NÃO é validada por estar na rota nem por marcação manual "já fui".
- Total de casas vem da fonte da edição (hoje 27), nunca de um número escrito à mão.
- Sem "+2 por avaliação": só casas e extras contam. A pessoa é o **e-mail normalizado** (dois mapas com o mesmo e-mail = uma pessoa).

## 2. Primeiro carimbo e avaliação
Para validar o primeiro carimbo de uma casa: mapa criado/recuperado + carimbo presencial na casa + avaliação do combo daquela casa
com o e-mail do mapa. **Ordem livre.** Avaliar sozinho não cria carimbo. Revisita não exige nova avaliação.
Enquanto falta a avaliação: **"Carimbo pendente — falta avaliar"** + ação direta para avaliar. Intervalo de **12 h** por casa e
por mapa/e-mail (unidades da mesma casa juntas). Nunca afirmar gravação sem confirmação do servidor.

## 3. Duas portas, sincronizadas
- Mapa/QR → carimba → se não avaliou, convite claro para avaliar (casa e dados já preenchidos).
- Avaliação → informa que também pode validar um carimbo da Caça → convida a criar/abrir o mapa reaproveitando os dados; explica
  que ainda é preciso carimbar presencialmente. Testar as duas ordens e um segundo aparelho.

## 4. Criação e recuperação do mapa
- Criar **antes de visitar**; sem senha; apelido + e-mail, WhatsApp opcional; entra na hora; e-mail confirmado depois
  (lembrete discreto enquanto pendente).
- Recuperação por e-mail com código/link temporário seguro; quem só sabe o e-mail não acessa o mapa.
- **Preservar** o mecanismo atual de chave/link pessoal e os mapas existentes (não invalidar chaves). Links pessoais/credenciais
  nunca em artes públicas, rankings, URLs de compartilhamento, logs ou analytics.
- Decisão técnica: recuperar emite uma chave NOVA e invalida a antiga daquele mapa (só no momento da recuperação).

## 5. Vouchers diários
- **Um voucher por dia, 7 a 11/11** (5 vouchers). Apuração com progresso validado acumulado até **23h59 de Natal**
  (`America/Fortaleza`) de cada dia. Ordem: mais casas diferentes → mais extras → sorteio entre empatados.
- Quem ganhou (confirmado/entregue) sai das apurações seguintes. Continua jogando e concorre ao prêmio final.
- Carimbo só entra no dia se validado até o corte; avaliação depois do corte conta nas apurações seguintes.
- Validade do voucher: até **15/11**.
- Confirmação: se o e-mail do selecionado não está confirmado, tem até **12h do dia seguinte** para confirmar; senão a organização
  chama o próximo elegível (ou novo sorteio entre empatados). Prazo das chamadas seguintes: **2 h após o aviso — é proposta, não
  decisão; deixar configurável e sinalizar**. Seleção provisória não é ganho definitivo nem exclusão permanente. Estados:
  selecionado → confirmado → entregue; expirado; substituído; tudo auditado.
- Datas, horários, quantidades, validade e prazos são **configuráveis e auditáveis**; não criar prêmios novos sozinho.

## 6. Prêmio final
- Concorre quem validou **as 27 casas**. Premiações e regra do regulamento (até 3 completos / vagas restantes) preservadas.
- **Peso base 100 + 1 por carimbo extra válido** (0 extras = 100, 5 = 105, 10 = 110). Peso é relativo, não probabilidade garantida.
- 3 ganhadores sem reposição. Ganhar voucher não exclui. Apuração verificável/auditável. **Nenhum sorteio real em testes.**
- ⛔ A surpresa do prêmio final (plaquinha Sweet Lover) NÃO pode ser revelada ao público: escrever "uma surpresa".

## 7. Ranking
Geral e de grupo: mais casas diferentes → mais extras → empate na MESMA posição (sem desempate por hora).
- Geral: um recorte dos primeiros + a posição da própria pessoa (mesmo fora do recorte); só quem optou por aparecer; só apelido e
  progresso; nunca e-mail/WhatsApp.
- Grupo: visível só aos integrantes; avisar na entrada que apelido e progresso serão vistos pelos demais.

## 8. Grupos privados e rota colaborativa
- Cria grupo (nome) e compartilha link de convite; o convite não torna o conteúdo público. Quem abre precisa criar/abrir o próprio
  mapa e aceitar. Só integrantes consultam dados do grupo. Entrar no grupo não cria carimbo para ninguém.
- Mostra ranking dos amigos e **progresso coletivo** (casas validadas por pelo menos um integrante; cada casa conta uma vez);
  é conquista visual, não substitui as regras individuais.
- Rota colaborativa: todos os integrantes adicionam, reordenam e removem casas; é lista de planejamento (nunca marca visita);
  mostra quem adicionou. Tratar conflitos de edição, convite revogado, saída de membro, controle de acesso **no servidor**.

## 9. Central da Caça
O app abre numa **central**, não direto no tabuleiro: progresso (casas/faltam), próxima ação útil ("Escolha uma casa para
começar" quando vazio; avaliar pendente; continuar), mapa lúdico e real, ranking geral, grupos e rota colaborativa, metas e
novidades, compartilhar, avisos (e-mail pendente). Sem tutorial longo antes de criar o mapa.

## 10. Meu mapa — três visualizações
1. **Ilustrado** (principal, lúdico, identidade Cartoon): progresso claro, zoom por toque e controles acessíveis, estados que não
   dependem só de cor (não visitada / pendente-falta avaliar / conquistada / revisitas com contador), cartão da casa com ver combo,
   avaliar, adicionar à rota, como chegar; destacar o próximo passo; busca/lista; microanimação de conquista respeitando
   movimento reduzido; aviso "mapa ilustrativo, não mostra posições reais"; sem desenhar rota como trajeto viário. Respeitar o estado
   de aprovação da arte (`aprovada` em `src/data/mundoEdicao.js`): não ativar arte provisória como definitiva.
2. **Real**: coordenadas conferidas, estados claros para aproximada/não informada, busca, filtros, fichas, navegação.
3. **Lista**: acessível, busca.

## 11. Sicredi
Patrocinadora. Agências com marcador próprio (distinto das casas), nome, endereço, "Como chegar", na vista ilustrada e na real
(só com dados geográficos conferidos nas fontes oficiais; sem inventar endereço/coordenada). Deixar claro que **não contam como casa nem carimbo**.

## 12. Carimbo presencial autônomo
QR + localização, sem funcionário validando. Se a localização falhar: explicar como verificar permissão e tentar de novo.
Alternativa excepcional para falha persistente **ainda não decidida**: analisar opções seguras, não enfraquecer a validação e não
implementar exceção insegura. QR fixo sozinho não prova presença.

## 13. Metas, compartilhamento, notificações
- Marcos comemorativos por casas validadas, **configuráveis** (5/10/20 eram só exemplo). Não prometer prêmios novos.
- Compartilhar progresso em arte vertical para Stories (apelido + casas + convite), sem e-mail/WhatsApp/chave/link de recuperação.
  Link público de divulgação não expõe dados do grupo.
- Notificações com consentimento e gestão da preferência; avisos úteis (avaliação pendente, meta, retorno, grupo, edição), sem
  excesso; transacionais × por preferência; alternativa para quem não puder/quiser push; nunca disparar notificações reais em teste.

## 14. App instalável
PWA própria da Caça (ícone, abre na central), instalação opcional e oferecida em momento útil; instruções Android/iPhone/navegadores;
no iPhone o armazenamento do app instalado pode ser separado: caminho simples e seguro para recuperar o mapa. Manifest/SW próprios,
sem quebrar o PWA do Painel SCW (`/painel/`). Não prometer offline completo.

## Pendências de decisão (não inventar)
2ª chamada do voucher (2 h = proposta); alternativa ao GPS; números dos marcos; regulamento (idade mínima, entrega do prêmio final,
retenção); posições exatas das agências Sicredi (só com fonte oficial).
