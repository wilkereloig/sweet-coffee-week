import React from 'react'
import { rpc } from '../../lib/rpc'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { Carregando, Vazio, Erro, Secao, Botao, Escolha } from '../ui'
import { useLeitura } from '../../lib/leituraVivaReact'
import { entregar } from '../../lib/entrega'
import { ComEdicaoAtual } from './Edicao'
import {
  PERIODOS, colunasVisiveis, ordensDisponiveis, rotuloTipo, argumentosDoPeriodo, ordenarCasas, comPosicao, filtrarPorTexto, larguraBarra, maiorValor,
  numero, ultimaLeitura, diaCurto, rotuloLugar, rotuloAparelho, csvCasas, csvPecas, csvDias, nomeDoArquivo,
} from '../../lib/qr'
import '../../styles/qr.css'

/*
 * Operação › QR Codes (Fase 2 de docs/cartoon-2026-2/12-plano-qr-leituras.md): quantas vezes cada peça com QR foi lida
 * e por qual participante, dia, hora, cidade e aparelho. Só leitura: o banco soma por hora (get_qr_resumo, dado.ler) e
 * aqui se ordena, busca e exporta CSV. Conta LEITURAS, não pessoas; a cidade vem do IP e erra; robôs ficam de fora.
 */

const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''
const baixar = (assunto, texto) => entregar(new File([texto], nomeDoArquivo(assunto), { type: 'text/csv;charset=utf-8' }))

function Numero({ n, rotulo }) {
  return <li className="ui-numero"><span className="ui-numero__n">{numero(n)}</span><span className="ui-numero__rotulo">{rotulo}</span></li>
}

// Tabela de rolagem com barra atrás do número: a largura vem de --p (lib/qr.js › larguraBarra).
function TabelaBarras({ rotulo, colunaRotulo, linhas, maximo }) {
  return (
    <div className="ui-tabela-rolagem" tabIndex={0} role="region" aria-label={rotulo}>
      <table className="ui-tabela">
        <thead><tr><th scope="col" className="qr-nome">{colunaRotulo}</th><th scope="col" className="qr-num">Leituras</th></tr></thead>
        <tbody>{linhas.map(([chave, nome, n]) => (
          <tr key={chave}>
            <th scope="row" className="qr-nome">{nome}</th>
            <td className="qr-num qr-barra" style={{ '--p': larguraBarra(n, maximo) + '%' }}>{numero(n)}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

const DESCRICAO = {
  hoje: 'Só as leituras de hoje (horário de Natal).',
  tudo: 'Tudo o que já foi lido, inclusive o ponto de teste e as leituras de antes da abertura.',
}
const descricaoDoPeriodo = (periodo, inicio) => DESCRICAO[periodo]
  || (inicio ? 'Contando desde ' + diaCurto(inicio) + ', a abertura do festival. Testes de antes ficam de fora.' : 'A edição ainda não tem data de início: mostrando tudo, menos o ponto de teste.')

export function QrCodes({ pode, registrarAtualizar }) {
  if (!pode('dado.ler')) return <p className="ui-nota">Sua função não lê os dados da edição.</p>
  return (
    <ComEdicaoAtual registrarAtualizar={registrarAtualizar}>
      {(atual) => <Leituras inicio={atual.festival_inicio} />}
    </ComEdicaoAtual>
  )
}

function Leituras({ inicio }) {
  const [periodo, setPeriodo] = React.useState('abertura')
  const [ordem, setOrdem] = React.useState('total')
  const [buscaCasa, setBuscaCasa] = React.useState('')
  const [buscaPeca, setBuscaPeca] = React.useState('')
  const args = argumentosDoPeriodo(periodo, inicio)
  // Sem domínio de sincronização: o número muda a cada QR lido, não por ação da equipe. Leitura nova: "Atualizar".
  const leitura = useLeitura(
    async () => rpc('get_qr_resumo', { p_secret: lerSenha(), ...args }),
    [], { chave: periodo + '|' + (inicio || '') },
  )
  const r = leitura.dados
  const casas = React.useMemo(() => (r ? comPosicao(ordenarCasas(r.casas, ordem), ordem) : []), [r, ordem])

  const controles = (
    <div className="ui-linha-acoes qr-controles">
      <Escolha rotulo="Período" valor={periodo} opcoes={PERIODOS} onMudar={setPeriodo} />
      <Botao icone="atualizar" variante="secundario" onClick={leitura.recarregar}>Atualizar</Botao>
    </div>
  )
  if (leitura.bloqueada) return <>{controles}<Erro texto={leitura.erro} onTentar={leitura.recarregar} /></>
  if (!r) return <>{controles}<Carregando /></>

  const t = r.totais
  const nomeDaCasa = Object.fromEntries(r.casas.map((c) => [c.participacao_id, c.nome]))
  const casasVisiveis = filtrarPorTexto(casas, buscaCasa, ['nome'])
  const pecasVisiveis = filtrarPorTexto(r.pontos, buscaPeca, ['codigo', 'rotulo'])
  const cols = colunasVisiveis(r.casas)
  const maiorCasa = maiorValor(r.casas, 'total')

  return (
    <div className="ui-pilha">
      {controles}
      {leitura.falhouAtualizar && <Erro titulo="Não consegui atualizar" texto={leitura.erro} onTentar={leitura.recarregar} />}
      <p className="ui-nota">{descricaoDoPeriodo(periodo, inicio)}{t.ultima ? ' Última hora com leitura: ' + ultimaLeitura(t.ultima) + '.' : ''}</p>
      <ul className="ui-numeros ui-numeros--compacto">
        <Numero n={t.leituras} rotulo="leituras no período" />
        {periodo !== 'hoje' && <Numero n={t.hoje} rotulo="hoje" />}
        {r.tipos.map((x) => <Numero key={x.tipo} n={x.leituras} rotulo={rotuloTipo(x.tipo)} />)}
        <Numero n={t.robos} rotulo="de robôs (não contam)" />
      </ul>

      {!t.leituras ? (
        <Vazio titulo="Nenhuma leitura neste período">
          As leituras aparecem aqui assim que alguém ler o QR de uma peça. Antes da abertura, escolha “Tudo, com testes” para ver os testes.
        </Vazio>
      ) : (
        <>
          <Secao titulo="Participantes com mais leituras"
            nota={cols.detalhar ? 'Cada participante soma as peças com o QR dele: a face 1 leva ao combo.' : 'Cada participante conta as leituras do QR do combo dele. Avaliação, premiação e página inicial têm um QR geral cada, em “Peça por peça”.'}
            acoes={<Botao icone="baixar" variante="secundario" onClick={() => baixar('casas', csvCasas(ordenarCasas(r.casas, 'total')))}>Baixar CSV</Botao>}>
            <div className="ui-linha-acoes qr-filtros">
              <Escolha rotulo="Ordenar por" valor={ordem} opcoes={ordensDisponiveis(cols)} onMudar={setOrdem} />
              <label className="og-campo qr-busca"><span>Buscar participante</span>
                <input type="search" value={buscaCasa} onChange={(e) => setBuscaCasa(e.target.value)} /></label>
            </div>
            {casasVisiveis.length ? (
              <div className="ui-tabela-rolagem" tabIndex={0} role="region" aria-label="Leituras por participante">
                <table className="ui-tabela">
                  <thead><tr>
                    {ordem !== 'nome' && <th scope="col" className="qr-num">#</th>}
                    <th scope="col" className="qr-nome">Participante</th>
                    {cols.detalhar && <th scope="col" className="qr-num">Face 1 · combo</th>}
                    {cols.face2 && <th scope="col" className="qr-num">Face 2 · avaliar</th>}
                    {cols.outras && <th scope="col" className="qr-num">Outras peças</th>}
                    <th scope="col" className="qr-num">{cols.detalhar ? 'Total' : 'Leituras'}</th>
                    <th scope="col">Última leitura</th>
                  </tr></thead>
                  <tbody>{casasVisiveis.map((c) => (
                    <tr key={c.participacao_id}>
                      {ordem !== 'nome' && <td className="qr-num">{c.posicao || '—'}</td>}
                      <th scope="row" className="qr-nome">{c.nome}</th>
                      {cols.detalhar && <td className="qr-num">{numero(c.face1)}</td>}
                      {cols.face2 && <td className="qr-num">{numero(c.face2)}</td>}
                      {cols.outras && <td className="qr-num">{numero(c.outras)}</td>}
                      <td className="qr-num qr-barra" style={{ '--p': larguraBarra(c.total, maiorCasa) + '%' }}>{numero(c.total)}</td>
                      <td>{ultimaLeitura(c.ultima)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <p className="ui-nota">Nenhum participante com esse nome.</p>}
          </Secao>

          <Secao titulo="Por dia" nota="Dias no horário de Natal."
            acoes={<Botao icone="baixar" variante="secundario" onClick={() => baixar('dias', csvDias(r.dias))}>Baixar CSV</Botao>}>
            <TabelaBarras rotulo="Leituras por dia" colunaRotulo="Dia" maximo={maiorValor(r.dias, 'leituras')}
              linhas={r.dias.map((d) => [d.dia, diaCurto(d.dia), d.leituras])} />
          </Secao>

          <Secao titulo="Por hora do dia" nota="Soma de todos os dias do período: mostra a que horas as pessoas leem.">
            <TabelaBarras rotulo="Leituras por hora do dia" colunaRotulo="Hora" maximo={maiorValor(r.horas, 'leituras')}
              linhas={r.horas.map((h) => [h.hora, String(h.hora).padStart(2, '0') + 'h', h.leituras])} />
          </Secao>

          <Secao titulo="Lugar e aparelho"
            nota="A cidade vem do endereço de rede do celular e às vezes erra: a rede móvel pode cair em outra cidade. O lugar de verdade é a peça, o display da casa.">
            <div className="qr-duas">
              <TabelaBarras rotulo="Leituras por cidade" colunaRotulo="Cidade" maximo={maiorValor(r.cidades, 'leituras')}
                linhas={r.cidades.map((c) => [c.regiao + '|' + c.cidade, rotuloLugar(c), c.leituras])} />
              <TabelaBarras rotulo="Leituras por aparelho" colunaRotulo="Aparelho" maximo={maiorValor(r.aparelhos, 'leituras')}
                linhas={r.aparelhos.map((a) => [a.aparelho, rotuloAparelho(a.aparelho), a.leituras])} />
            </div>
          </Secao>
        </>
      )}

      <Secao titulo="Peça por peça"
        nota="Cada peça impressa tem um código fixo; o QR dela aponta para o endereço /q/ seguido do código."
        acoes={<Botao icone="baixar" variante="secundario" onClick={() => baixar('pecas', csvPecas(r.pontos, nomeDaCasa))}>Baixar CSV</Botao>}>
        <div className="ui-linha-acoes qr-filtros">
          <label className="og-campo qr-busca"><span>Buscar peça ou código</span>
            <input type="search" value={buscaPeca} onChange={(e) => setBuscaPeca(e.target.value)} /></label>
        </div>
        {pecasVisiveis.length ? (
          <div className="ui-tabela-rolagem" tabIndex={0} role="region" aria-label="Leituras por peça">
            <table className="ui-tabela">
              <thead><tr>
                <th scope="col" className="qr-nome">Peça</th><th scope="col">Código</th>
                <th scope="col" className="qr-num">Leituras</th><th scope="col">Última leitura</th>
              </tr></thead>
              <tbody>{pecasVisiveis.map((p) => (
                <tr key={p.codigo}>
                  <th scope="row" className="qr-nome">{p.rotulo}{!p.ativo && <span className="qr-pausada"> · pausada</span>}</th>
                  <td><code className="qr-codigo">{p.codigo}</code></td>
                  <td className="qr-num">{numero(p.leituras)}</td>
                  <td>{ultimaLeitura(p.ultima)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className="ui-nota">Nenhuma peça com esse nome ou código.</p>}
      </Secao>

      <p className="ui-nota">Conta leituras, não pessoas: quem lê duas vezes conta duas. Robôs de pré-visualização (WhatsApp, Instagram, verificadores de link) e o ponto de teste ficam de fora. Nada é apagado: o período só filtra o que aparece aqui.</p>
    </div>
  )
}
