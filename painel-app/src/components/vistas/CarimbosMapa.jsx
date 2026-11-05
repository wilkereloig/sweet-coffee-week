import React from 'react'
import QRCode from 'qrcode'
import { rpc } from '../../lib/rpc'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { Carregando, Vazio, Erro, Secao, Botao, Abas, painelDaAba } from '../ui'
import { useLeitura } from '../../lib/leituraVivaReact'
import { horaNatal as hora } from '../../lib/caca'
import { PainelCaca, ABAS_CACA } from './caca/PainelCaca'
import { ComEdicaoAtual } from './Edicao'
import { confirmar, pedirTexto, avisar } from '../Confirmar'
import '../../styles/carimbos.css'

/*
 * Edição › Carimbos — Mapa da Doçura (docs/cartoon-2026-2/14-mapa-da-docura.md §14.5).
 * Aba "Mapa e adesivos": totais, alertas para a auditoria (viagem impossível, unidade sem ponto conferido), ranking e os
 * QR das unidades para os adesivos do balcão. As outras abas são a Caça aos Carimbos (vouchers do dia, prêmio final,
 * revisão, regras, metas, avisos e auditoria: vistas/caca/*, regra em docs/cartoon-2026-2/15-caca-especificacao.md).
 * Ler: dado.ler. Anular carimbo, trocar QR e gerar link novo: producao.gerir (o banco confere).
 */

const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''
const SITE = 'https://www.sweetcoffeeweek.com.br'
export const urlDoCarimbo = (codigo) => `${SITE}/cartoon/carimbo/${codigo}`

export function CarimbosMapa({ pode, registrarAtualizar }) {
  if (!pode('dado.ler')) return <p className="ui-nota">Sua função não lê os dados da edição.</p>
  return <ComEdicaoAtual registrarAtualizar={registrarAtualizar}>{(atual) => <Painel edicao={atual.codigo} pode={pode} />}</ComEdicaoAtual>
}

const ABAS = [{ chave: 'mapa', rotulo: 'Mapa e adesivos' }, ...ABAS_CACA]

function Painel({ edicao, pode }) {
  const [aba, setAba] = React.useState('mapa')
  const idAbas = React.useId()
  return (
    <div className="ui-pilha">
      <Abas idBase={idAbas} rotulo="Seções dos carimbos e da Caça aos Carimbos" ativa={aba} onMudar={setAba} abas={ABAS} />
      <div {...painelDaAba(idAbas, aba)} className="ui-painel-aba">
        {aba === 'mapa' ? <MapaDocura edicao={edicao} pode={pode} /> : <PainelCaca edicao={edicao} pode={pode} aba={aba} />}
      </div>
    </div>
  )
}

function MapaDocura({ edicao, pode }) {
  const resumo = useLeitura(async () => rpc('get_mapa_carimbos', { p_secret: lerSenha(), p_edicao: edicao }), ['carimbos'], { chave: edicao })
  const qrs = useLeitura(async () => rpc('get_carimbo_qr', { p_secret: lerSenha(), p_edicao: edicao }), ['carimbos'], { chave: edicao })
  const gerir = pode('producao.gerir')

  async function anular(a) {
    const motivo = await pedirTexto(`Anular o carimbo de ${a.apelido}? Ele deixa de contar nas apurações e no sorteio.`, { rotulo: 'Motivo (fica no histórico)' }, { titulo: 'Anular carimbo', acao: 'Anular', perigo: true })
    if (motivo === null) return
    await rpc('carimbo_anular', { p_secret: lerSenha(), p_carimbo: a.carimbo_id, p_motivo: motivo })
    resumo.recarregar()
  }
  async function linkNovo(m) {
    if (!await confirmar(`Gerar link novo para o mapa de ${m.apelido}? O link antigo para de funcionar.`, { acao: 'Gerar link', perigo: true })) return
    const chave = await rpc('mapa_nova_chave', { p_secret: lerSenha(), p_mapa: m.mapa_id })
    if (chave) await avisar(`Mande este link para a pessoa: ${SITE}/cartoon/minha-rota#mapa=${chave}`)
  }

  const r = resumo.dados
  return (
    <div className="ui-pilha">
      <div className="ui-linha-acoes">
        <Botao icone="atualizar" variante="secundario" onClick={() => { resumo.recarregar(); qrs.recarregar() }}>Atualizar</Botao>
      </div>
      {resumo.bloqueada ? <Erro texto={resumo.erro} onTentar={resumo.recarregar} /> : !r ? <Carregando /> : (
        <>
          <ul className="ui-numeros ui-numeros--compacto">
            {[['mapas', 'mapas'], ['carimbos', 'carimbos'], ['pontos', 'pontos'], ['avaliadas', 'avaliações (legado)'], ['anulados', 'anulados'], ['sem_conferencia', 'sem ponto conferido']]
              .map(([k, rotulo]) => <li key={k} className="ui-numero"><span className="ui-numero__n">{r.totais?.[k] ?? 0}</span><span className="ui-numero__rotulo">{rotulo}</span></li>)}
          </ul>

          <Secao titulo="Alertas para a auditoria" nota="Viagem impossível: dois carimbos seguidos em casas a mais de 1 km, rápido demais para 60 km/h. Confira antes de divulgar os ganhadores.">
            {!r.alertas?.length ? <p className="ui-nota">Nenhum alerta.</p> : (
              <ul className="cm-alertas">
                {r.alertas.map((a) => (
                  <li key={a.carimbo_id + a.tipo}>
                    <span>
                      <strong>{a.apelido}</strong>{' · '}
                      {a.tipo === 'viagem' ? `${a.de} → ${a.para}: ${a.km} km em ${a.minutos} min` : `${a.casa}: unidade sem ponto conferido`}
                      {' · '}{hora(a.em)}
                    </span>
                    {gerir && <Botao variante="secundario" onClick={() => anular(a)}>Anular</Botao>}
                  </li>
                ))}
              </ul>
            )}
          </Secao>

          <Secao titulo="Pontuação do Mapa da Doçura (legado, não decide prêmio)" nota="Regra antiga, por mapa: 1 ponto por carimbo + 2 por casa avaliada. Não vale para a Caça: voucher do dia e prêmio final contam casas e extras por pessoa (e-mail). Veja Vouchers do dia e Prêmio final. Não divulgue esta lista como pódio.">
            {!r.ranking?.length ? <Vazio titulo="Nenhum carimbo ainda">O ranking aparece aqui no primeiro carimbo.</Vazio> : (
              <div className="ui-tabela-rolagem" tabIndex={0} role="region" aria-label="Ranking do Mapa da Doçura">
                <table className="ui-tabela">
                  <thead><tr><th scope="col">#</th><th scope="col">Apelido</th><th scope="col">Pontos</th><th scope="col">Casas</th><th scope="col">Carimbos</th><th scope="col">Avaliadas</th><th scope="col">Último</th>{pode('relatorio.ler') && <th scope="col">Contato</th>}{gerir && <th scope="col"><span className="ui-sr">Ações</span></th>}</tr></thead>
                  <tbody>{r.ranking.map((m) => (
                    <tr key={m.mapa_id}>
                      <td>{m.posicao}</td><th scope="row">{m.apelido}{m.no_ranking ? '' : ' (oculto)'}</th><td>{m.pontos}</td><td>{m.casas}</td><td>{m.carimbos}</td><td>{m.avaliadas}</td><td>{hora(m.ultimo)}</td>
                      {pode('relatorio.ler') && <td>{[m.email, m.whatsapp].filter(Boolean).join(' · ')}</td>}
                      {gerir && <td><Botao variante="secundario" onClick={() => linkNovo(m)}>Link novo</Botao></td>}
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </Secao>
        </>
      )}
      <Adesivos leitura={qrs} gerir={gerir} />
    </div>
  )
}

/** QR de cada unidade (um adesivo por balcão). Imprimir = só os adesivos, sem a casca do painel. */
function Adesivos({ leitura, gerir }) {
  const lista = leitura.dados || []
  const [imagens, setImagens] = React.useState({})
  React.useEffect(() => {
    let vivo = true
    Promise.all(lista.map(async (u) => [u.codigo, await QRCode.toDataURL(urlDoCarimbo(u.codigo), { margin: 1, width: 600, errorCorrectionLevel: 'M' })]))
      .then((pares) => { if (vivo) setImagens(Object.fromEntries(pares)) })
      .catch(() => {})
    return () => { vivo = false }
  }, [lista])

  function imprimir() {
    document.body.classList.add('cm-imprimindo')
    const tira = () => { document.body.classList.remove('cm-imprimindo'); window.removeEventListener('afterprint', tira) }
    window.addEventListener('afterprint', tira)
    window.print()
  }
  async function trocar(u) {
    if (!await confirmar(`Trocar o QR de ${u.casa} (${u.nome_unidade || u.bairro || u.unidade})? O adesivo atual para de valer e precisa ser reimpresso.`, { acao: 'Trocar QR', perigo: true })) return
    await rpc('carimbo_qr_novo', { p_secret: lerSenha(), p_participacao_unidade: u.participacao_unidade_id })
    leitura.recarregar()
  }

  const semPonto = lista.filter((u) => !u.conferida).length
  return (
    <Secao titulo="Adesivos do balcão" nota={`Um QR por unidade (${lista.length}). Confira o nome da unidade antes de colar.${semPonto ? ` ${semPonto} sem ponto conferido em Participantes › Localizações: o carimbo entra, mas vai para os alertas.` : ''}`}
      acoes={lista.length > 0 && <Botao icone="baixar" variante="secundario" onClick={imprimir}>Imprimir adesivos</Botao>}>
      {leitura.bloqueada ? <Erro texto={leitura.erro} onTentar={leitura.recarregar} /> : !leitura.dados ? <Carregando /> : !lista.length ? <Vazio titulo="Nenhuma unidade na edição" /> : (
        <ul className="cm-adesivos">
          {lista.map((u) => (
            <li key={u.codigo} className="cm-adesivo">
              <p className="cm-adesivo__marca">Mapa da Doçura</p>
              {imagens[u.codigo] ? <img className="cm-adesivo__qr" src={imagens[u.codigo]} alt={`QR do carimbo de ${u.casa}`} /> : <span className="cm-adesivo__qr" />}
              <p className="cm-adesivo__chamada">Leia e carimbe sua visita</p>
              <p className="cm-adesivo__casa">{u.casa}</p>
              <p className="cm-adesivo__unidade">{u.nome_unidade || u.bairro || ''}</p>
              <p className="cm-adesivo__tela">
                {!u.conferida && <span className="cm-adesivo__alerta">sem ponto conferido · </span>}
                {!u.publicada && <span className="cm-adesivo__alerta">casa não publicada · </span>}
                <code>{u.codigo}</code>
                {gerir && <> · <button type="button" className="cm-adesivo__trocar" onClick={() => trocar(u)}>trocar QR</button></>}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Secao>
  )
}
