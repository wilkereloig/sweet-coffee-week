/*
 * PARTICIPAR — texto e listas editoriais da página (§5.6: dado e texto moram em
 * src/data, o JSX só compõe). Nada aqui é dado histórico: os números vêm de
 * festivalFacts.js e o que se pode dizer da próxima edição vem de
 * proximaEdicao.js (campo null = não exibir, A4).
 *
 * Jornada (12/10/2026): abertura → depoimentos → para quem é e como funciona →
 * o que a participação oferece → depois do pré-cadastro → próximo passo.
 * Cada fato abaixo tem fonte na central de dúvidas (faqCentral.js, assunto
 * "Participação de estabelecimentos") ou no código anterior da página — nada
 * de regra nova inventada aqui.
 */
import { festivalFacts as F } from '../festivalFacts.js'
import { proximaEdicao as PROX } from '../proximaEdicao.js'

/* A próxima edição aparece UMA vez, aqui, vindo do dado: tema e período
   quando proximaEdicao.js os confirma (desde 13/10/2026), senão só o mês. O
   resto da página é permanente e fala de "cada edição". */
/** O `mede` de festivalFacts sem repetir o rótulo que vem antes dele
    ("movimentação direta" + "movimentação direta no caixa…" → "no caixa…"). */
export const semRepetir = (rotulo, mede) =>
  mede.toLowerCase().startsWith(rotulo.toLowerCase()) ? mede.slice(rotulo.length).trim() : mede

const edicaoDoMes = PROX.tema && PROX.periodo
  ? `a edição ${PROX.tema}, de ${PROX.periodo},`
  : PROX.mes ? `a edição de ${PROX.mes}` : 'a próxima edição'

export const ABERTURA = {
  titulo: 'Sua marca na',
  destaque: 'próxima edição.',
  lead: `O pré-cadastro para ${edicaoDoMes} está aberto. Ele registra o interesse da sua casa; quem escolhe as participantes é a curadoria.`,
  acao: 'Fazer pré-cadastro',
  secundaria: 'Ver como funciona',
}

/* 02 Depoimentos REAIS (transcritos do protótipo — não editar o sentido). */
export const DEPOIMENTOS = [
  { frase: '“Para a Jolie, foi um divisor de águas. Foi quando a nossa coxinha realmente passou a ser conhecida em Natal, e isso mudou até a nossa história de faturamento.”', pessoa: 'Carol Barreto', marca: 'Jolie Café Pâtisserie', slug: 'jolie-cafe-patisserie', cor: 'var(--scw-amarelo)', tinta: 'var(--scw-choco)' },
  { frase: '“É uma coisa avassaladora. Uma demanda que a gente não imaginava, essa avalanche de Sweet Lovers. O festival é uma grande vitrine para mostrar quem somos.”', pessoa: 'João Dantas', marca: 'O Maestro Café', slug: 'o-maestro-cafe', cor: 'var(--scw-marrom)', tinta: 'var(--scw-creme)' },
  { frase: '“O Sweet & Coffee Week hoje é como um carnaval das docerias de Natal. É uma oportunidade de negócio, de fazer novos amigos e conquistar novos clientes.”', pessoa: 'Fernando Gurgel', marca: 'Paneer Pâtisserie', slug: 'paneer-patisserie', cor: 'var(--scw-cyan)', tinta: 'var(--scw-choco)' },
  { frase: '“O festival abriu uma janela incrível para a gente. Ficamos mais conhecidos na cidade, ganhamos fôlego e o movimento permaneceu depois da participação.”', pessoa: 'César e Tiago', marca: 'Mr. Cupcake Confeitaria', slug: 'mr-cupcake-confeitaria', cor: 'var(--scw-roxo)', tinta: 'var(--scw-creme)' },
  { frase: '“Foi além das expectativas. Foram onze dias extremamente exaustivos e satisfatórios, trazendo um público diferenciado para a casa.”', pessoa: 'Edvan Barreto', marca: 'Casa 1190 - Restaurant e Coffee', slug: 'casa-1190', cor: 'var(--scw-choco)', tinta: 'var(--scw-creme)' },
]

/* Os cinco depoimentos têm vídeo, com o mesmo slug do participante. */
export const depoVideoSrc = (slug) => `/videos/depoimentos/${slug}.mp4`

/* 03 Para quem é e como funciona. Fonte: faqCentral (quais-tipos-de-negocios,
   e-obrigatorio-ter-loja-fisica, precisa-criar-combo-exclusivo,
   combo-durante-todo-o-festival, e-obrigatorio-decorar). */
export const PARA_QUEM = {
  rotulo: 'Para quem é',
  titulo: 'Casas que criam',
  destaque: 'doce, salgado e café.',
  tipos: ['Cafeterias', 'docerias', 'confeitarias', 'restaurantes', 'sorveterias', 'padarias', 'marcas autorais'],
  onde: 'Em Natal e na região metropolitana, conforme a edição.',
  semLoja: 'Marca sem loja física pode ser aceita quando há estrutura de produção, retirada ou entrega compatível com o formato da edição.',
  comoTitulo: 'Como a edição funciona',
  como: [
    { titulo: 'Um tema por edição', texto: 'A organização anuncia o tema, e é dele que sai a criação de cada casa.', icone: 'tema' },
    { titulo: 'Um combo inédito', texto: 'Doce, salgado e bebida criados pela sua casa para o tema, seguindo as orientações do festival.', icone: 'combo' },
    { titulo: 'Os dias de festival', texto: 'O combo fica disponível nos dias e horários informados, com os materiais oficiais na casa.', icone: 'loja' },
  ],
}

/* 04 O que a participação oferece — quatro ganhos, cada um sobre uma foto do
   acervo (fotoGanho). Nada de promessa (§8.4): o texto diz o que a edição faz
   por quem participa. O ganho "combo" deixou de repetir o "combo inédito" da
   seção anterior: aqui ele é vitrine (faqCentral: o público consulta os
   participantes e escolhe quem visitar). Selo numa cor do ciclo sem o magenta,
   que não fecha 4,5:1 em texto pequeno com nenhuma das duas tintas. */
export const GANHOS = [
  { chave: 'combo', selo: 'Vitrine', titulo: 'Seu combo na vitrine da edição', texto: 'O público consulta as casas participantes, conhece os combos e escolhe quais vai provar.', cor: 'var(--scw-amarelo)', tinta: 'var(--scw-choco)' },
  { chave: 'imprensa', selo: 'Visibilidade', titulo: 'Presença na campanha e na imprensa', texto: 'A campanha oficial e a cobertura de imprensa de cada edição apresentam as casas participantes.', cor: 'var(--scw-cyan)', tinta: 'var(--scw-choco)' },
  { chave: 'publico', selo: 'Público', titulo: 'Sweet Lovers batendo à sua porta', texto: 'Gente que se organiza para provar os combos e sai atrás de endereços que ainda não conhecia.', cor: 'var(--scw-roxo)', tinta: 'var(--scw-creme)' },
  { chave: 'awards', selo: 'Reconhecimento', titulo: 'Concorrer ao Sweet Awards', texto: 'Os combos disputam as categorias da edição, a partir da avaliação do público.', cor: 'var(--scw-laranja)', tinta: 'var(--scw-choco)' },
]

/* A escala do festival. Uma cor por card, na ordem do ciclo do §6.3 sem o
   magenta. Movimentação e combos são históricos: a nota diz quando foram
   apurados. Nada de contagem de marcas por edição (26/08/2026, pedido do Eloi). */
export const NUMEROS = {
  titulo: 'Dez anos em números',
  nota: `Movimentação e combos são históricos, apurados em ${F.revenue.apurado}.`,
  itens: [
    { n: F.revenue.curto, t: 'movimentação direta', d: semRepetir('movimentação direta', F.revenue.mede), i: 'moedas', cor: 'var(--scw-amarelo)', tinta: 'var(--scw-choco)' },
    { n: F.combosSold.curto, t: 'combos vendidos', d: semRepetir('combos vendidos', F.combosSold.mede), i: 'combo', cor: 'var(--scw-cyan)', tinta: 'var(--scw-choco)' },
    { n: `${F.years.value} anos`, t: 'de Sweet & Coffee Week', d: `o festival de doces e cafés de Natal, desde ${F.firstYear}`, i: 'calendario', cor: 'var(--scw-roxo)', tinta: 'var(--scw-creme)' },
    { n: `${F.editions.value} edições`, t: 'já realizadas', d: 'de Início, em 2016, a Lovers, em 2026', i: 'edicao', cor: 'var(--scw-laranja)', tinta: 'var(--scw-choco)' },
  ],
}

/* 05 Depois do pré-cadastro — só passos que existem de fato. Curadoria e
   condições comerciais: faqCentral (como-os-participantes-sao-selecionados,
   existe-taxa-de-participacao). Alteração de combo aprovado passa pela
   organização (alterar-combo-depois-de-aprovado). Nó numa cor do ciclo
   filtrada pelo chocolate (§6.3). */
export const DEPOIS = {
  rotulo: 'Depois do pré-cadastro',
  titulo: 'Do pré-cadastro',
  destaque: 'à estreia do combo.',
  apoio: 'A participação depende da curadoria e das vagas de cada edição.',
  passos: [
    { titulo: 'Pré-cadastro', texto: 'Um formulário curto sobre você e o estabelecimento.', cor: 'var(--scw-amarelo)', tinta: 'var(--scw-choco)' },
    { titulo: 'Curadoria', texto: 'A organização avalia o perfil, a capacidade de atendimento e o alinhamento com a edição. As condições comerciais são apresentadas nessa etapa.', cor: 'var(--scw-cyan)', tinta: 'var(--scw-choco)' },
    { titulo: 'Aprovação e painel', texto: 'Casa aprovada recebe acesso ao painel da marca, onde cadastra o combo e acompanha os pedidos da organização.', cor: 'var(--scw-magenta)', tinta: 'var(--scw-creme)' },
    { titulo: 'Combo aprovado', texto: 'A organização confere o combo antes da estreia. Mudanças depois disso passam por ela.', cor: 'var(--scw-laranja)', tinta: 'var(--scw-choco)' },
    { titulo: 'A edição acontece', texto: 'Os Sweet Lovers visitam as casas, avaliam os combos e o Sweet Awards reconhece os destaques.', cor: 'var(--scw-creme)', tinta: 'var(--scw-choco)' },
  ],
}

/* 06 Próximo passo — a chamada para /quero-participar/ (o formulário mora lá). */
export const PROXIMO = {
  rotulo: 'Pré-cadastro',
  titulo: 'Comece a',
  destaque: 'jornada da sua marca.',
  texto: 'Depois do envio, a equipe avalia o perfil e retorna pelos canais que você informar.',
  lista: [
    { icone: 'horario', texto: 'Dois passos, sete campos, menos de um minuto' },
    { icone: 'loja', texto: 'Seus dados e os do estabelecimento' },
    { icone: 'cadeado', texto: 'Usados só pela organização, para contato e curadoria' },
  ],
  barra: 'Inscrições passam por curadoria.',
}

/* ⛔ Barra final obrigatória (§10.4-b): sem ela a rota cai no fallback do SPA. */
export const PRE_CADASTRO = PROX.preCadastro || '/quero-participar/'

/* Faixa de palavras logo abaixo do herói (Marquee). Volta em 14/10/2026, pedido
   do Wilker ("faixa com movimento em todas as páginas, exceto a principal e
   Edições"); a lista é a que a página usava até 12/10/2026. */
export const PALAVRAS = [
  'um combo autoral', 'presença na campanha', 'nova relação com o público',
  'sua marca na rota', 'sweet lovers',
]
