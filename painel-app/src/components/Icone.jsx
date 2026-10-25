import INTERFACE from '../../../src/components/scw-icons/gerado/interface'
import EXPRESSIVA from '../../../src/components/scw-icons/gerado/expressiva'
import { criarIcone, canonico } from '../../../src/components/scw-icons/registro'
import { plataforma } from '../lib/instalar'

/*
 * Ícones do painel — adaptador do registro ÚNICO do site (v3, 14/10/2026).
 *
 * Os desenhos não moram mais aqui: site e painel leem a mesma fonte
 * (icones/*.svg → src/components/scw-icons/gerado). Os nomes antigos do painel
 * ("ok-circulo", "lixeira", "etapa-novas"…) continuam valendo por alias
 * (icones/aliases.json). Escala: 16 · 20 · 24 interface, 32+ expressiva.
 * Cor: sempre currentColor. Contrato mantido: `nome`, `tamanho`, `titulo`, `className`.
 */
export const Icone = criarIcone({ interface: INTERFACE, expressiva: EXPRESSIVA }, 20)

/*
 * Um assunto = um ícone, em todo o painel (lista, ficha, menu, área da marca).
 * O teste painel-app-reconstrucao confere que toda chave daqui existe.
 */
export const MODULO_ICONE = {
  resumo: 'visao', cadastro: 'ficha', combo: 'combo', doce: 'cupcake', salgado: 'coxinha',
  bebida: 'xicara', preco: 'preco', tema: 'tema', unidades: 'local', pedidos: 'pedido',
  operacao: 'operacao', fotos: 'camera', arquivos: 'pasta', logo: 'imagem', acesso: 'chave',
  mensagens: 'mensagens', historico: 'historico', trajetoria: 'trofeu', notificacoes: 'sino',
  pendencias: 'atencao', aprovado: 'sucesso', whatsapp: 'mensagem', voucher: 'voucher',
  presskit: 'imprensa', contatos: 'contatos', participantes: 'pessoas', config: 'configuracoes',
  edicao: 'edicao', instagram: 'instagram', email: 'email', estabelecimento: 'loja',
}

/**
 * Compartilhar abre as opções do APARELHO, então o desenho é o dele (25/10/2026): no iPhone/iPad o quadrado com a
 * seta; no Android e no computador os três pontos ligados.
 */
export const ICONE_COMPARTILHAR = plataforma().ios ? 'compartilhar-ios' : 'compartilhar'

/** A cor do selo diz a natureza; o ícone repete a natureza sem depender da cor. */
export const ICONE_TOM = { neutro: 'neutro', andamento: 'horario', atencao: 'atencao', ok: 'sucesso', encerrado: 'arquivar' }

export function existeIcone(nome) {
  const c = canonico(nome)
  return !!(INTERFACE[c] || EXPRESSIVA[c])
}
