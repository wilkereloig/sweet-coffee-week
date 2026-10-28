import React from 'react'
import { VistaCabeca } from './VistaCabeca'
import { Abas, painelDaAba } from './ui'
import { ACENTO_VISTA, ICONE_DESTINO, TITULOS } from './PainelShell'
import { Mesa, Formularios } from './vistas/Mesa'
import { Marcas } from './vistas/Marcas'
import { Respostas } from './vistas/Respostas'
import { Contatos } from './vistas/Contatos'
import { PressKit } from './vistas/PressKit'
import { Vouchers } from './vistas/Vouchers'
import { Producao } from './vistas/Producao'
import { MateriaisEdicao } from './vistas/MateriaisEdicao'
import { ArquivosOrg } from './vistas/ArquivosOrg'
import { Equipe } from './vistas/Equipe'
import { ComEdicaoAtual, useEdicoes, AbaConfiguracao, AbaTemas, AbaVendas, AbaRevisao, AbaImportacoes, AbaEdicoes } from './vistas/Edicao'
import { Carregando, Erro } from './ui'
import { ListaPublicacao } from './vistas/Publicacao'
import { ListaPreenchimento } from './vistas/Preenchimento'
import { ListaLocalizacoes } from './vistas/Localizacoes'
import { ChavesEdicao, Avaliacoes } from './vistas/PublicacaoEdicao'
import { Redes, ResumoRedes } from './vistas/Redes'
import { SocialBiblioteca } from './vistas/SocialBiblioteca'
import { SocialCampanhas } from './vistas/SocialCampanhas'
import { SocialParticipantes } from './vistas/SocialParticipantes'
import { NOMES_PUBLICACAO } from '../lib/nomesPublicacao'
import { useRotulosDasAbas } from './Trilha'

/*
 * Os sete módulos da organização (reestruturação 29/09/2026 — spec em
 * docs/superpowers/specs/2026-09-29-painel-reestruturacao-design.md).
 *
 * Cada módulo é um cabeçalho + abas; a aba ativa mora no endereço
 * (`rota.aba`). As vistas de dentro são as de sempre, sem cabeçalho próprio.
 * Aba sem permissão não aparece (a RPC continua sendo quem decide).
 */
function Modulo({ id, rota, navegar, abas, nota }) {
  const visiveis = abas.filter((a) => a.mostrar !== false)
  const ativa = visiveis.find((a) => a.chave === rota.aba) || visiveis[0]
  const idAbas = React.useId()
  const comAbas = visiveis.length > 1
  // O Voltar e as Telas recentes dizem "Operação › Fotos" com o nome que a aba mostra.
  useRotulosDasAbas(id, visiveis)
  return (
    <section className="og-vista">
      <VistaCabeca acento={ACENTO_VISTA[id]} icone={ICONE_DESTINO[id]} titulo={TITULOS[id][0]} nota={nota || TITULOS[id][1]} />
      {comAbas && (
        <Abas
          idBase={idAbas}
          rotulo={'Seções de ' + TITULOS[id][0]}
          ativa={ativa.chave}
          onMudar={(chave) => navegar({ vista: id, aba: chave, filtros: {} })}
          abas={visiveis.map(({ chave, rotulo, n }) => ({ chave, rotulo, n }))}
        />
      )}
      <div {...(comAbas && ativa ? painelDaAba(idAbas, ativa.chave) : {})} className="ui-painel-aba">
        {ativa ? <React.Fragment key={ativa.chave}>{ativa.render()}</React.Fragment> : null}
      </div>
    </section>
  )
}

export function Visao(props) {
  return <Modulo id="visao" {...props} nota="O que precisa da equipe agora, como estão as marcas e o que aconteceu por último" abas={[
    // Quem só trabalha com redes (função Social media, sem dado.ler) vê só o resumo das redes.
    { chave: '', rotulo: 'Visão geral', render: () => (props.pode('dado.ler') ? <Mesa {...props} /> : <ResumoRedes navegar={props.navegar} pode={props.pode} />) },
  ]} />
}

export function Participantes(props) {
  return <Modulo id="participantes" {...props} abas={[
    { chave: 'lista', rotulo: 'Marcas', render: () => <Marcas {...props} /> },
    { chave: 'candidaturas', rotulo: 'Candidaturas', render: () => <Respostas {...props} origens={['quero_participar']} /> },
    { chave: 'temas', rotulo: 'Temas', render: () => <ComEdicaoAtual registrarAtualizar={props.registrarAtualizar}>{(atual) => <AbaTemas edicao={atual} pode={props.pode} irPara={props.irPara} registrarAtualizar={props.registrarAtualizar} />}</ComEdicaoAtual> },
    { chave: 'vendas', rotulo: 'Vendas', render: () => <ComEdicaoAtual registrarAtualizar={props.registrarAtualizar}>{(atual) => <AbaVendas edicao={atual} pode={props.pode} registrarAtualizar={props.registrarAtualizar} />}</ComEdicaoAtual> },
    // Cartoon 2026.2: revisar e publicar a página de CADA marca (filtros por revisão e publicação).
    // A chave de rota segue `publicacao`; o nome visível vem de lib/nomesPublicacao.js (não é a liberação da edição).
    { chave: 'publicacao', rotulo: NOMES_PUBLICACAO.marcas.rotulo, render: () => <ComEdicaoAtual registrarAtualizar={props.registrarAtualizar}>{(atual) => <ListaPublicacao edicao={atual} rota={props.rota} navegar={props.navegar} registrarAtualizar={props.registrarAtualizar} />}</ComEdicaoAtual> },
    // Link de preenchimento (16/10/2026): uma página por marca, sem login; o envio passa por revisão na ficha.
    { chave: 'preenchimento', rotulo: 'Preenchimento', render: () => <ListaPreenchimento pode={props.pode} irPara={props.irPara} /> },
    // Conferência do ponto no mapa (28/10/2026): só da administração; o participante só preenche o endereço.
    { chave: 'localizacoes', rotulo: 'Localizações', render: () => <ComEdicaoAtual registrarAtualizar={props.registrarAtualizar}>{(atual) => <ListaLocalizacoes edicao={atual} pode={props.pode} />}</ComEdicaoAtual> },
  ]} />
}

export function ModContatos(props) {
  return <Modulo id="contatos" {...props} abas={[
    { chave: 'pessoas', rotulo: 'Pessoas', render: () => <Contatos {...props} /> },
    { chave: 'presskit', rotulo: 'Press Kit', render: () => <PressKit {...props} /> },
    { chave: 'vouchers', rotulo: 'Vouchers', render: () => <Vouchers {...props} /> },
    { chave: 'recebidos', rotulo: 'Recebidos do site', render: () => <Respostas {...props} origens={['apoiar', 'contato']} /> },
  ]} />
}

export function Operacao(props) {
  return <Modulo id="operacao" {...props} abas={[
    { chave: 'pedidos', rotulo: 'Pedidos', mostrar: props.pode('dado.ler'), render: () => <Producao {...props} secao="pedidos" /> },
    { chave: 'fotos', rotulo: 'Fotos', mostrar: props.pode('dado.ler'), render: () => <Producao {...props} secao="fotos" /> },
    { chave: 'materiais', rotulo: 'Materiais', mostrar: props.pode('dado.ler'), render: () => <MateriaisEdicao {...props} /> },
  ]} />
}

/*
 * Social media (17/10/2026): planejamento do Instagram, biblioteca de artes e
 * participantes para a equipe de conteúdo. Era Operação › Redes sociais — o
 * endereço antigo (#operacao/redes) cai aqui (lib/rota.js migrarRota).
 * Não é "Liberação no site" (Edição) nem "Páginas das marcas" (Participantes):
 * aqui é a agenda da equipe (lib/nomesPublicacao.js).
 */
export function ModSocial(props) {
  return <Modulo id="social" {...props} nota={NOMES_PUBLICACAO.instagram.frase + ' — o painel registra, não publica'} abas={[
    { chave: 'planejamento', rotulo: NOMES_PUBLICACAO.instagram.rotulo, render: () => <Redes {...props} /> },
    { chave: 'campanhas', rotulo: 'Campanhas', render: () => <SocialCampanhas {...props} /> },
    { chave: 'biblioteca', rotulo: 'Biblioteca', render: () => <SocialBiblioteca {...props} /> },
    { chave: 'participantes', rotulo: 'Participantes', mostrar: props.pode('editorial.ler'), render: () => <SocialParticipantes {...props} /> },
  ]} />
}

export function ModArquivos(props) {
  return <Modulo id="arquivos" {...props} abas={[
    { chave: 'gerais', rotulo: 'Para todas as marcas', render: () => <ArquivosOrg {...props} aba="gerais" /> },
    { chave: 'participantes', rotulo: 'Por participante', render: () => <ArquivosOrg {...props} aba="participantes" /> },
    { chave: 'arquivados', rotulo: 'Arquivados', render: () => <ArquivosOrg {...props} aba="arquivados" /> },
  ]} />
}

function TodasEdicoes({ registrarAtualizar }) {
  const { edicoes, erro, carregar } = useEdicoes(registrarAtualizar)
  if (erro) return <Erro texto={erro} onTentar={carregar} />
  if (!edicoes) return <Carregando />
  return <AbaEdicoes edicoes={edicoes} />
}

export function ModEdicao(props) {
  // Duas leituras da edição atual na mesma aba (get_config_admin no bloco de cima, get_edicoes no de
  // baixo): as duas assinam o domínio "edicao", então abrir outra edição em cima atualiza o de baixo
  // pelo sinal — sem remontar (remontar perderia o que está sendo digitado na Configuração).
  return <Modulo id="edicao" {...props} abas={[
    { chave: 'configuracao', rotulo: 'Configuração', render: () => (
      <div className="ui-pilha">
        <Producao {...props} secao="edicao" registrarAtualizar={null} />
        <ComEdicaoAtual registrarAtualizar={props.registrarAtualizar}>{(atual, carregar) => <AbaConfiguracao edicao={atual} pode={props.pode} onMudou={carregar} />}</ComEdicaoAtual>
      </div>
    ) },
    // Cartoon 2026.2: fase e chaves do site (interruptores 1 e 3–6) e o resumo das avaliações.
    // Chave de rota `publicacao` mantida; nome visível: "Liberação no site" (a edição inteira, não uma marca).
    { chave: 'publicacao', rotulo: NOMES_PUBLICACAO.edicao.rotulo, render: () => <ComEdicaoAtual registrarAtualizar={props.registrarAtualizar}>{(atual) => <ChavesEdicao edicao={atual} pode={props.pode} />}</ComEdicaoAtual> },
    { chave: 'avaliacoes', rotulo: 'Avaliações', mostrar: props.pode('relatorio.ler'), render: () => <ComEdicaoAtual registrarAtualizar={props.registrarAtualizar}>{(atual) => <Avaliacoes edicao={atual} pode={props.pode} />}</ComEdicaoAtual> },
    { chave: 'edicoes', rotulo: 'Todas as edições', render: () => <TodasEdicoes registrarAtualizar={props.registrarAtualizar} /> },
  ]} />
}

export function Admin(props) {
  const { pode } = props
  return <Modulo id="admin" {...props} abas={[
    { chave: 'equipe', rotulo: 'Equipe', mostrar: pode('acesso.gerir'), render: () => <Equipe {...props} secao="equipe" /> },
    { chave: 'revisao', rotulo: 'Revisão de dados', render: () => <AbaRevisao pode={pode} irPara={props.irPara} registrarAtualizar={props.registrarAtualizar} /> },
    { chave: 'importacoes', rotulo: 'Importações', mostrar: pode('importacao.gerir'), render: () => <AbaImportacoes pode={pode} registrarAtualizar={props.registrarAtualizar} /> },
    { chave: 'historico', rotulo: 'Histórico', mostrar: pode('acesso.gerir'), render: () => <Equipe {...props} secao="historico" /> },
    { chave: 'formularios', rotulo: 'Formulários', render: () => <Formularios /> },
  ]} />
}

// Mapa para o PainelShell (a ordem do menu é DESTINOS, lá).
export const MODULOS_ORG = {
  visao: Visao, participantes: Participantes, contatos: ModContatos, operacao: Operacao,
  social: ModSocial, arquivos: ModArquivos, edicao: ModEdicao, admin: Admin,
}
