/*
 * Destaque de edição na abertura da Home — fonte única (12/10/2026).
 *
 * O institucional é permanente. Quando uma edição for lançada e o conteúdo
 * estiver APROVADO para o público, ela pode assumir o protagonismo da abertura
 * da Home; o resto do site segue igual. Este arquivo é o único ponto de
 * configuração dessa chamada.
 *
 * COMO LIGAR (decisão do Wilker, nunca automática):
 *   1. preencher TODOS os campos obrigatórios abaixo com conteúdo já público;
 *   2. a foto vem de `src/data/imageLibrary.js` (caminho nunca escrito aqui à
 *      mão — §6.12); registre a foto lá primeiro e importe o objeto;
 *   3. trocar `ativo` para `true`, rodar `npm run build` e os testes, conferir
 *      no preview (`*.vercel.app?preview=1`) e só então publicar.
 *   Nada aqui liga por data: não existe ativação pelo relógio. Também não mexe
 *   em flag de publicação (src/App.jsx) — sob o gate atual a Home nem aparece.
 *
 * COMO DESLIGAR: `ativo: false`. A Home volta à abertura institucional
 * completa, sem espaço vazio.
 *
 * ⚠️ Nada de dado privado: tema, datas, participantes ou peças da edição só
 * entram aqui depois do anúncio oficial (A4). O pré-cadastro continua vindo de
 * `proximaEdicao.js`, que é a fonte do que já é público sobre a próxima edição.
 */
export const destaqueEdicao = {
  ativo: false,
  rotulo: null,     // ex.: 'Edição de novembro' — curto, acima do título
  titulo: null,     // obrigatório
  texto: null,      // obrigatório — uma ou duas frases
  imagem: null,     // obrigatório — objeto de imageLibrary.js: { src, alt, position }
  legenda: null,    // obrigatório — diz o que a foto mostra (registro × peça da edição)
  acao: null,       // obrigatório — { rotulo, href }; href externo ou com barra final (§10.4-b)
}

/**
 * O destaque só vale com todos os campos que o tornam honesto: título e texto
 * para dizer o que é, foto COM alt e legenda para não parecer registro de
 * outra edição, e uma ação que leve a algum lugar. Faltou um → abertura
 * institucional, nunca um bloco pela metade.
 */
export function destaqueValido(d = destaqueEdicao) {
  if (!d || d.ativo !== true) return false
  const texto = (v) => typeof v === 'string' && v.trim().length > 0
  return (
    texto(d.titulo) &&
    texto(d.texto) &&
    texto(d.legenda) &&
    !!d.imagem && texto(d.imagem.src) && texto(d.imagem.alt) &&
    !!d.acao && texto(d.acao.rotulo) && texto(d.acao.href)
  )
}

export default destaqueEdicao
