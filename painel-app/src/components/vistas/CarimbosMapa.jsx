import React from 'react'
import QRCode from 'qrcode'
import { rpc } from '../../lib/rpc'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { Carregando, Vazio, Erro, Secao, Botao } from '../ui'
import { useLeitura } from '../../lib/leituraVivaReact'
import { entregar } from '../../lib/entrega'
import { ComEdicaoAtual } from './Edicao'
import { confirmar, pedirTexto, avisar } from '../Confirmar'
import '../../styles/carimbos.css'

/*
 * Edição › Carimbos — Mapa da Doçura (docs/cartoon-2026-2/14-mapa-da-docura.md §14.5).
 * Totais, alertas para a auditoria (viagem impossível, unidade sem ponto conferido), ranking, a apuração da
 * Caça aos Carimbos (vouchers dia a dia e sorteio final, §14.14) e os QR das unidades para os adesivos do balcão.
 * Ler: dado.ler. Anular carimbo, trocar QR e gerar link novo: producao.gerir (o banco confere).
 */

const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''
const SITE = 'https://www.sweetcoffeeweek.com.br'
export const urlDoCarimbo = (codigo) => `${SITE}/cartoon/carimbo/${codigo}`
const hora = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Fortaleza', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '')
const csv = (linhas) => linhas.map((l) => l.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')
const baixar = (nome, texto) => entregar(new File(['﻿' + texto], nome, { type: 'text/csv;charset=utf-8' }))

export function CarimbosMapa({ pode, registrarAtualizar }) {
  if (!pode('dado.ler')) return <p className="ui-nota">Sua função não lê os dados da edição.</p>
  return <ComEdicaoAtual registrarAtualizar={registrarAtualizar}>{(atual) => <Painel edicao={atual.codigo} pode={pode} />}</ComEdicaoAtual>
}

function Painel({ edicao, pode }) {
  const resumo = useLeitura(async () => rpc('get_mapa_carimbos', { p_secret: lerSenha(), p_edicao: edicao }), ['carimbos'], { chave: edicao })
  const qrs = useLeitura(async () => rpc('get_carimbo_qr', { p_secret: lerSenha(), p_edicao: edicao }), ['carimbos'], { chave: edicao })
  const gerir = pode('producao.gerir')

  async function anular(a) {
    const motivo = await pedirTexto(`Anular o carimbo de ${a.apelido}? Ele sai do pódio e do sorteio.`, { rotulo: 'Motivo (fica no histórico)' }, { titulo: 'Anular carimbo', acao: 'Anular', perigo: true })
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
            {[['mapas', 'mapas'], ['carimbos', 'carimbos'], ['pontos', 'pontos'], ['avaliadas', 'avaliações com bônus'], ['anulados', 'anulados'], ['sem_conferencia', 'sem ponto conferido']]
              .map(([k, rotulo]) => <li key={k} className="ui-numero"><span className="ui-numero__n">{r.totais?.[k] ?? 0}</span><span className="ui-numero__rotulo">{rotulo}</span></li>)}
          </ul>

          <Secao titulo="Alertas para a auditoria" nota="Viagem impossível: dois carimbos seguidos em casas a mais de 1 km, rápido demais para 60 km/h. Confira antes de divulgar o pódio.">
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

          <Secao titulo="Ranking" nota="Só carimbos validados (casa avaliada). Pontos = 1 por carimbo + 2 por casa avaliada. Empate: mais casas, depois quem chegou primeiro.">
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
      <Apuracao edicao={edicao} pode={pode} />
      <Adesivos leitura={qrs} gerir={gerir} />
    </div>
  )
}

const diaBr = (d) => d.split('-').reverse().slice(0, 2).join('/')

/** Números do sorteio final: cada carimbo é uma chance, em faixas contínuas na ordem da lista. */
export function faixasDoSorteio(lista) {
  let fim = 0
  return lista.map((p) => { const de = fim + 1; fim += Number(p.chances) || 0; return { ...p, de, ate: fim } })
}

/*
 * Apuração da Caça aos Carimbos (get_caca_apuracao). Leitura à parte, com erro próprio: a função só existe depois da
 * migration 20261202 — sem ela, só este bloco mostra o erro.
 */
function Apuracao({ edicao, pode }) {
  const ap = useLeitura(async () => rpc('get_caca_apuracao', { p_secret: lerSenha(), p_edicao: edicao }), ['carimbos'], { chave: edicao })
  const contato = pode('relatorio.ler')
  const a = ap.dados
  const linhaContato = (m) => contato && <td>{[m.email, m.whatsapp].filter(Boolean).join(' · ')}</td>
  const tabela = (rotulo, linhas, colunas, celulas) => (
    <div className="ui-tabela-rolagem" tabIndex={0} role="region" aria-label={rotulo}>
      <table className="ui-tabela">
        <thead><tr>{colunas.map((c) => <th key={c} scope="col">{c}</th>)}{contato && <th scope="col">Contato</th>}</tr></thead>
        <tbody>{linhas.map((m, i) => <tr key={`${m.apelido}-${i}`}>{celulas(m)}{linhaContato(m)}</tr>)}</tbody>
      </table>
    </div>
  )
  if (ap.bloqueada) return <Secao titulo="Caça aos Carimbos: apuração"><Erro texto={ap.erro} onTentar={ap.recarregar} /></Secao>
  if (!a) return <Secao titulo="Caça aos Carimbos: apuração"><Carregando /></Secao>
  const finais = faixasDoSorteio(a.sorteio_final || [])
  return (
    <>
      <Secao titulo="Vouchers do dia" nota="Carimbos validados acumulados desde 5/11, até 23h59 de cada dia. Um voucher por pessoa: quem já ganhou sai das apurações seguintes (pule o nome e use o próximo). Posição repetida = empate, resolvido por sorteio.">
        {(a.apuracoes || []).map((d) => (
          <div key={d.dia} className="ui-pilha">
            <h3 className="ui-modulo__titulo">{diaBr(d.dia)}</h3>
            {!d.ranking?.length ? <p className="ui-nota">Ninguém com carimbo validado até esse dia.</p>
              : tabela(`Apuração de ${diaBr(d.dia)}`, d.ranking, ['#', 'Apelido', 'Carimbos', 'Casas'],
                (m) => <><td>{m.posicao}</td><th scope="row">{m.apelido}</th><td>{m.carimbos}</td><td>{m.casas}</td></>)}
          </div>
        ))}
      </Secao>
      <Secao titulo="Prêmio final" nota={`Concorre quem validou as ${a.total_casas} casas. Cada carimbo validado é uma chance: os números do sorteio vão em faixas, na ordem da lista. Sorteie 3, um de cada vez; quem sair não volta.`}
        acoes={contato && finais.length > 0 && <Botao icone="baixar" variante="secundario" onClick={() => baixar('caca-aos-carimbos-sorteio-final.csv',
          csv([['de', 'ate', 'apelido', 'chances', 'email', 'whatsapp'], ...finais.map((n) => [n.de, n.ate, n.apelido, n.chances, n.email, n.whatsapp])]))}>Lista do sorteio (CSV)</Botao>}>
        {!finais.length ? <p className="ui-nota">Ninguém completou o mapa ainda.</p>
          : tabela('Concorrentes do prêmio final', finais, ['Números', 'Apelido', 'Chances'],
            (m) => <><td>{m.de}–{m.ate}</td><th scope="row">{m.apelido}</th><td>{m.chances}</td></>)}
        {finais.length < 3 && a.reservas?.length > 0 && (
          <>
            <p className="ui-nota">Menos de 3 mapas completos: as vagas que sobram vão, nesta ordem, para quem tem mais casas validadas (empate: mais carimbos; persistindo, sorteio).</p>
            {tabela('Próximos para as vagas que sobram', a.reservas, ['Apelido', 'Casas', 'Carimbos'],
              (m) => <><th scope="row">{m.apelido}</th><td>{m.casas}</td><td>{m.carimbos}</td></>)}
          </>
        )}
      </Secao>
    </>
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
