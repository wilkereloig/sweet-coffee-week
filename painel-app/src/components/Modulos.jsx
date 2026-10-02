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
  return <Modulo id="visao" {...props} nota="O que precisa de atenção, e onde cada marca está" abas={[
    { chave: '', rotulo: 'Visão geral', render: () => <Mesa {...props} /> },
  ]} />
}

export function Participantes(props) {
  return <Modulo id="participantes" {...props} abas={[
    { chave: 'lista', rotulo: 'Marcas', render: () => <Marcas {...props} /> },
    { chave: 'candidaturas', rotulo: 'Candidaturas', render: () => <Respostas {...props} origens={['quero_participar']} /> },
    { chave: 'temas', rotulo: 'Temas', render: () => <ComEdicaoAtual registrarAtualizar={props.registrarAtualizar}>{(atual) => <AbaTemas edicao={atual} pode={props.pode} irPara={props.irPara} registrarAtualizar={props.registrarAtualizar} />}</ComEdicaoAtual> },
    { chave: 'vendas', rotulo: 'Vendas', render: () => <ComEdicaoAtual registrarAtualizar={props.registrarAtualizar}>{(atual) => <AbaVendas edicao={atual} pode={props.pode} registrarAtualizar={props.registrarAtualizar} />}</ComEdicaoAtual> },
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
    { chave: 'pedidos', rotulo: 'Pedidos', render: () => <Producao {...props} secao="pedidos" /> },
    { chave: 'fotos', rotulo: 'Fotos', render: () => <Producao {...props} secao="fotos" /> },
    { chave: 'materiais', rotulo: 'Materiais', render: () => <MateriaisEdicao {...props} /> },
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
  // Duas leituras da edição atual na mesma aba (get_config_admin no bloco de
  // cima, get_edicoes no de baixo): abrir outra edição em cima remonta o de
  // baixo, que relê — senão ele seguiria dizendo "nenhuma edição atual".
  const [versao, setVersao] = React.useState(0)
  return <Modulo id="edicao" {...props} abas={[
    { chave: 'configuracao', rotulo: 'Configuração', render: () => (
      <div className="ui-pilha">
        <Producao {...props} secao="edicao" registrarAtualizar={null} onEdicaoMudou={() => setVersao((v) => v + 1)} />
        <ComEdicaoAtual key={versao} registrarAtualizar={props.registrarAtualizar}>{(atual, carregar) => <AbaConfiguracao edicao={atual} pode={props.pode} onMudou={carregar} />}</ComEdicaoAtual>
      </div>
    ) },
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
  arquivos: ModArquivos, edicao: ModEdicao, admin: Admin,
}
