/*
 * Home / "O festival" — conteúdo EDITORIAL (12/10/2026).
 *
 * Só texto e listas escritas pela equipe. Dado histórico e número continuam
 * nas fontes deles (festivalFacts.js, sweetCoffeeHistory.js, handoff/*,
 * proximaEdicao.js) e são combinados nas seções — nada de contagem copiada
 * para cá (§5.2).
 *
 * Títulos com palavra destacada vêm em três partes: { antes, destaque, depois }.
 * O espaço fica FORA do destaque, e a pontuação final vai junto dele quando
 * não pode órfã (§10.5).
 */

/* --- 01 Abertura (institucional; a da edição em destaque vem de
   destaqueEdicao.js) ---------------------------------------------------- */
export const ABERTURA = {
  rotulo: 'Festival gastronômico · Natal/RN',
  titulo: { antes: 'O festival dos ', destaque: 'combos autorais', depois: ' de Natal.' },
  lead:
    'Desde 2016, o Sweet & Coffee Week convida casas da cidade a criar um combo exclusivo para o tema de cada edição. O público vai de casa em casa, prova e avalia.',
  acaoPrincipal: 'Explorar as edições',
  acaoSecundaria: 'Como funciona',
  /* A legenda existe para ninguém ler as fotos como material da próxima
     edição: são registros da Lovers (2026.1). */
  /* Espaços inquebráveis em volta do ponto: a linha nunca começa com ele. */
  legenda: 'Registros da edição Lovers · 2026',
  ficha: { edicoes: 'Edições', marcas: 'Marcas', proxima: 'Próxima edição' },
  /* Modo destaque: o caminho para o resto da Home continua à vista. */
  destaqueSecundaria: 'Conhecer o festival',
}

/* --- 02 Como funciona ----------------------------------------------------- */
export const COMO_FUNCIONA = {
  rotulo: 'Como funciona',
  titulo: { antes: 'Um tema, ', destaque: 'um combo por casa', depois: ', a cidade como rota.' },
  apoio:
    'Cada edição começa com um tema. Cada casa responde com uma composição própria, criada só para aquela edição — e é ela que leva o público de um endereço a outro.',
  anatomia: 'A anatomia do combo',
  /* Não diz "onze dias" nem "preço único": são fatos de edições passadas que
     soariam como regra da próxima (duração e valor dela são null). */
  lacos: [
    ['Para as casas', 'Um produto novo, criado para o tema, que muitas mantêm no cardápio depois.'],
    ['Para o público', 'Descobertas pela cidade: escolher por onde começar, provar e avaliar.'],
    ['Para Natal', 'A gastronomia local tratada como programa cultural, edição após edição.'],
  ],
}

/* --- 03 Em registros ------------------------------------------------------ */
export const REGISTROS = {
  rotulo: 'Em registros',
  titulo: { antes: 'Gente à mesa, casas cheias, ', destaque: 'combos que viram assunto.', depois: '' },
  apoio: 'Pessoas, equipes e combos de edições passadas — cada legenda diz o que o registro mostra.',
  /* Depoimento sempre identificado: pessoa + marca (gravado em vídeo,
     página Participar). */
  voz: {
    rotulo: 'Quem participa',
    frase: '“Para a Jolie, foi um divisor de águas. Foi quando a nossa coxinha realmente passou a ser conhecida em Natal.”',
    pessoa: 'Carol Barreto',
    marca: 'Jolie Café Pâtisserie',
    link: 'Ver os depoimentos em vídeo',
  },
}

/* --- 04 Trajetória -------------------------------------------------------- */
export const TRAJETORIA = {
  rotulo: 'Trajetória',
  titulo: { antes: 'Dez anos, ', destaque: 'um tema novo', depois: ' a cada edição.' },
  /* Cada número diz o que mede (texto vem de festivalFacts.*.mede). */
  numeros: [
    { fato: 'participations', icone: 'combos/trio', titulo: 'Participações', antes: '', depois: '' },
    { fato: 'combosSold', icone: 'combos/doce-cafe', titulo: 'Combos vendidos', antes: '+', depois: ' mil' },
    { fato: 'revenue', icone: 'mecanica/loja', titulo: 'Movimento nas casas', antes: '+R$ ', depois: ' mil' },
    { fato: 'igViews', icone: 'redes/instagram', titulo: 'Visualizações', antes: '+', depois: ' mi' },
  ],
  edicoes: {
    eixo: 'Edições',
    titulo: 'Tema a tema, desde a primeira edição.',
    texto: 'Os temas, as casas participantes e as fotos de cada ano.',
    cta: 'Explorar as edições',
  },
  imprensa: {
    rotulo: 'Na imprensa',
    verTodas: (n) => `Ver todas as ${n} matérias`,
    verMenos: 'Mostrar menos matérias',
  },
}

/* Matérias reais, com link verificado. A primeira abre em destaque. Os títulos
   são resumo da matéria na grafia oficial (§8.2), sem preço (§2.2). */
export const IMPRENSA = [
  { veiculo: 'Diário do RN', ano: '2026', titulo: '10 anos de festival e economia criativa', href: 'https://diariodorn.com.br/sweet-coffee-week-chega-aos-10-anos-e-reforca-forca-da-economia-criativa-em-natal/' },
  { veiculo: '96 FM', ano: '2026', titulo: 'Sweet & Coffee Week celebra 10 anos', href: 'https://96fm.com.br/post/sweet-coffee-week-celebra-10-anos' },
  { veiculo: 'Tribuna do Norte', ano: '2026', titulo: 'Edição de 10 anos, de 04 a 14 de junho', href: 'https://blog.tribunadonorte.com.br/territoriolivre/de-04-a-14-de-junho-ocorre-o-sweet-coffee-week-2026-edicao-10-anos/' },
  { veiculo: 'Blog do BG', ano: '2025', titulo: 'A maior celebração da doçura do Brasil chega à 15ª edição', href: 'https://www.blogdobg.com.br/sweet-coffee-week-2025-a-maior-celebracao-da-docura-do-brasil-chega-a-15a-edicao/' },
  { veiculo: 'O Potengi', ano: '2025', titulo: 'Celebration reúne mais de 25 estabelecimentos', href: 'https://opotengi.com.br/sweet-coffee-celebration-chega-aos-15o-ano-reunindo-mais-de-25-estabelecimentos/' },
  { veiculo: 'TV Ponta Negra', ano: '2025', titulo: 'Entrevista com Eline Eulália sobre a edição de 2025', href: 'https://www.youtube.com/watch?v=1lPd434s3rk' },
  { veiculo: 'Conversa Gastronômica', ano: '2024', titulo: 'A 14ª edição acontece em Natal e Parnamirim', href: 'https://conversagastronomica.com/14a-sweet-coffee-week-acontece-entre-os-dias-14-e-24-de-novembro-em-natal-e-parnamirim/' },
  { veiculo: 'UFRN', ano: '2022', titulo: 'O festival como experiência gastronômica', href: 'https://repositorioslatinoamericanos.uchile.cl/handle/2250/8603735' },
  { veiculo: 'Agência Sebrae', ano: '2021', titulo: 'Ingredientes potiguares em destaque', href: 'https://rn.agenciasebrae.com.br/arquivo/produtos-terroir-serao-destaques-na-sweet-coffee-week-2021/' },
  { veiculo: 'Conversa Gastronômica', ano: '2020', titulo: 'Heróis & Vilões chegam aos combos', href: 'https://conversagastronomica.com/herois-e-viloes-trazem-combos-a-r2090-de-12-a-22-de-novembro-em-natal/' },
  { veiculo: 'Hilneth Correia', ano: '2019', titulo: 'A 7ª edição traz o sabor dos contos de fadas', href: 'https://hilnethcorreia.com.br/2019/09/07/7a-sweet-coffee-week-traz-o-sabor-dos-contos-de-fadas/' },
  { veiculo: 'Conversa Gastronômica', ano: '2018', titulo: 'A 5ª edição resgata sabores da infância', href: 'https://conversagastronomica.com/5a-sweet-coffee-resgata-sabores-da-infancia/' },
  { veiculo: 'Conversa Gastronômica', ano: '2018', titulo: 'A edição Namorados celebra o amor em combos', href: 'https://conversagastronomica.com/sweet-e-coffee-celebra-o-amor-em-combos-a-r1890/' },
  { veiculo: 'Agora RN', ano: '', titulo: 'O evento mais doce da capital potiguar', href: 'https://agorarn.com.br/ultimas/sweet-coffee-week-evento-mais-doce-natal/' },
  { veiculo: 'NOVO Notícias', ano: '', titulo: 'Atenção, Sweet Lovers: a semana mais doce do ano vai começar!', href: 'https://novonoticias.com.br/atencao-sweet-lovers-a-semana-mais-doce-do-ano-vai-comecar/' },
  { veiculo: 'NOVO Notícias', ano: '', titulo: 'Uma volta ao mundo em 11 dias', href: 'https://novonoticias.com.br/sweet-coffee-week-proporciona-uma-volta-ao-mundo-em-11-dias/' },
  { veiculo: '98 FM Natal', ano: '', titulo: 'O festival movimenta a economia criativa em Natal', href: 'https://98fmnatal.com.br/ultimas/sweet-coffee-week-comeca-hoje-e-movimenta-a-economia-criativa-em-natal/339772/' },
]

/* --- 05 Reconhecimento ---------------------------------------------------- */
export const RECONHECIMENTO = {
  rotulo: 'Sweet Awards',
  titulo: { antes: 'O público avalia. ', destaque: 'O festival reconhece.', depois: '' },
  /* §7.3: premiação desde 2019; desde 2022 só os Sweet Lovers dão a nota. */
  texto:
    'A premiação começou em 2019. Desde 2022, quem dá a nota são os Sweet Lovers: o público avalia os combos e o festival reconhece os destaques de cada categoria.',
  numero: 'edições premiadas',
  cta: 'Ver o Sweet Awards',
}

/* --- 06 Faça parte -------------------------------------------------------- */
export const FACA_PARTE = {
  rotulo: 'Faça parte',
  titulo: { antes: 'Um festival feito por ', destaque: 'casas e parceiros.', depois: '' },
  participar: {
    eixo: 'Para casas',
    titulo: 'Quer criar um combo para a próxima edição?',
    texto: 'Cafeterias, confeitarias, docerias, padarias, sorveterias, bistrôs e restaurantes de Natal e região.',
    proxima: 'Próxima edição',
    // ponytail: só o estado de hoje tem texto; outro status some com a linha até a Home ser revista.
    estado: { 'pre-cadastro': 'pré-cadastro aberto' },
    nota: 'O pré-cadastro registra o interesse. A participação depende da curadoria e das vagas da edição.',
    acao: 'Fazer pré-cadastro',
    link: 'Como participar',
  },
  apoiar: {
    eixo: 'Para empresas',
    titulo: 'Apoie a próxima edição.',
    texto: 'Conecte sua marca à gastronomia, à cultura e à economia criativa de Natal, ao lado das casas e do público do festival.',
    acao: 'Quero apoiar',
  },
  contato: {
    texto: 'Outra dúvida? A central de dúvidas e a equipe respondem.',
    link: 'Falar com a equipe',
  },
}

/* --- 07 Realização (F2 Experience) ---------------------------------------- */
/* Números da F2 Experience — fornecidos pelo Wilker no patch da seção de
   realização. Não saem do acervo do festival; só "16 edições" é conferível. */
export const F2_NUMEROS = [
  ['01', '+1', 'K', 'projetos realizados'],
  ['02', '+400', 'K', 'pessoas impactadas'],
  ['03', '16', '', 'edições do festival assinadas'],
  ['04', 'BR', '', 'atuação nacional'],
]
