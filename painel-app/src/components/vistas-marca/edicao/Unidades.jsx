import React from 'react'
import { Icone } from '../../Icone'
import { confirmar } from '../../Confirmar'
import { mascaraWhatsApp } from '../../../lib/participantes'
import { nomeDaUnidade, idCampoUnidade, erroCep, erroUf, erroWhatsappUnidade } from '../../../lib/edicaoMarca'
import { EstadoCampo, Correcao, Publico } from './campos'

/*
 * Bloco 4 · Unidades. A unidade é PERMANENTE (`unidades`: endereço, WhatsApp,
 * horário da loja) e participa da edição por `participacao_unidades`
 * (`participa`). Coordenada do mapa é só da organização: a marca vê se já foi
 * conferida, nunca a edita. Uma unidade cadastrada em outra edição aparece como
 * sugestão, sem ser copiada sozinha (04-painel.md §4.2).
 */
function Campo({ rotulo, opcional, publico = true, id, erro, children, nota }) {
  const idErro = erro && id ? 'erro-' + id : undefined
  return (
    <label>
      <span>{rotulo} {opcional && <em>(opcional)</em>} <Publico sim={publico} /></span>
      {React.cloneElement(children, { id, 'aria-invalid': erro ? true : undefined, 'aria-describedby': idErro })}
      {erro && <span className="gm-campo-erro" id={idErro}>{erro}</span>}
      {nota && <span className="nota">{nota}</span>}
    </label>
  )
}

export function Unidades({ unidades, sugestoes, est, alterar, adicionar, remover, usarSugestao }) {
  return (
    <>
      <p className="nota">Uma por endereço. Rede com várias lojas cadastra cada uma — continua contando como
        uma marca só. O endereço fica guardado para as próximas edições.</p>
      {sugestoes.length > 0 && (
        <div className="em-sugestoes">
          <b>Unidades já cadastradas</b>
          <p className="nota">Estão guardadas de outra edição. Nada entra nesta sem você confirmar.</p>
          {sugestoes.map((s, i) => (
            <div className="em-sugestoes__linha" key={s.id}>
              <span>{nomeDaUnidade(s, i)}{s.logradouro ? ' · ' + s.logradouro + (s.numero ? ', ' + s.numero : '') : ''}</span>
              <button className="acao secundaria" type="button" onClick={() => usarSugestao(s)}>
                <Icone nome="mais" tamanho={16} />Usar nesta edição
              </button>
            </div>
          ))}
        </div>
      )}
      {unidades.map((u, i) => {
        const nome = nomeDaUnidade(u, i)
        const k = u._key
        const campo = (c) => (e) => alterar(k, c, e.target.value)
        return (
          <div className="unidade" key={k}>
            <div className="topo">
              <b>{nome}</b>
              {!u.participa && <span className="selo">Fora desta edição</span>}
              <button className="link" type="button" aria-label={'Remover ' + nome + ' desta edição'} onClick={async () => { if (await confirmar('Remover ' + nome + ' desta edição?' + '\n\n' + 'O que você preencheu nesta unidade (endereço, horários, canais) sai daqui. Dá para adicioná-la de novo depois.', { acao: 'Remover unidade', perigo: true })) remover(k) }}>remover</button>
            </div>
            <label className="marcar">
              <input type="checkbox" checked={u.participa} onChange={(e) => alterar(k, 'participa', e.target.checked)} />
              <span>Esta unidade participa da Cartoon</span>
            </label>
            <Campo rotulo="Nome da unidade" opcional nota="Ex.: Lagoa Nova, Midway. Sem nome, o site mostra o bairro.">
              <input maxLength={60} value={u.nome_unidade} onChange={campo('nome_unidade')} />
            </Campo>
            <div className="dupla">
              <label>
                <span>Rua ou avenida {i === 0 && <EstadoCampo e={est('unidade-endereco')} />} <Publico /></span>
                <input id={'campo-' + idCampoUnidade('unidade-endereco', i)} maxLength={160} autoComplete="address-line1" value={u.logradouro} onChange={campo('logradouro')} />
                {i === 0 && <Correcao e={est('unidade-endereco')} />}
              </label>
              <Campo rotulo="Número"><input maxLength={20} inputMode="numeric" value={u.numero} onChange={campo('numero')} /></Campo>
            </div>
            <div className="dupla">
              <Campo rotulo="Complemento" opcional><input maxLength={80} value={u.complemento} onChange={campo('complemento')} /></Campo>
              <Campo rotulo="Referência" opcional nota="Ex.: dentro do shopping, piso L2.">
                <input maxLength={120} value={u.referencia} onChange={campo('referencia')} />
              </Campo>
            </div>
            <div className="dupla">
              <Campo rotulo="Bairro"><input maxLength={80} value={u.bairro} onChange={campo('bairro')} /></Campo>
              <Campo rotulo="Cidade"><input maxLength={80} autoComplete="address-level2" value={u.cidade} onChange={campo('cidade')} /></Campo>
            </div>
            <div className="dupla">
              <Campo rotulo="Estado (UF)" id={'uf-' + k} erro={erroUf(u.uf)}>
                <input maxLength={2} autoComplete="address-level1" value={u.uf} onChange={(e) => alterar(k, 'uf', e.target.value.toUpperCase())} />
              </Campo>
              <Campo rotulo="CEP" opcional publico={false} id={'cep-' + k} erro={erroCep(u.cep)}>
                <input inputMode="numeric" maxLength={9} autoComplete="postal-code" value={u.cep} onChange={campo('cep')} />
              </Campo>
            </div>
            <p className="nota em-mapa">
              <Icone nome="local" tamanho={16} />
              {u.verificada
                ? 'Localização no mapa: conferida pela organização.'
                : 'Localização no mapa: em conferência. A organização confere o ponto no mapa a partir do endereço — mudar o endereço pede conferência nova.'}
            </p>
            <label>
              <span>WhatsApp da unidade <em>(opcional)</em> {i === 0 && <EstadoCampo e={est('unidade-whatsapp')} />} <Publico /></span>
              <input id={i === 0 ? 'campo-unidade-whatsapp' : undefined} type="tel" inputMode="tel" autoComplete="off"
                aria-invalid={erroWhatsappUnidade(u.whatsapp_publico) ? true : undefined}
                aria-describedby={erroWhatsappUnidade(u.whatsapp_publico) ? 'erro-whats-' + k : undefined}
                value={u.whatsapp_publico} onChange={(e) => alterar(k, 'whatsapp_publico', mascaraWhatsApp(e.target.value))} />
              {erroWhatsappUnidade(u.whatsapp_publico) && <span className="gm-campo-erro" id={'erro-whats-' + k}>{erroWhatsappUnidade(u.whatsapp_publico)}</span>}
              {i === 0 && <Correcao e={est('unidade-whatsapp')} />}
            </label>
            <label className="marcar">
              <input type="checkbox" checked={u.whatsapp_autorizado} onChange={(e) => alterar(k, 'whatsapp_autorizado', e.target.checked)} />
              <span>Autorizo publicar este WhatsApp no site</span>
            </label>
            {u.whatsapp_publico && !u.whatsapp_autorizado && <p className="nota">Sem a autorização, o número fica só com a organização.</p>}
            <label>
              <span>Horário da loja <em>(opcional, informativo)</em> {i === 0 && <EstadoCampo e={est('unidade-horario-loja')} />} <Publico /></span>
              <input id={i === 0 ? 'campo-unidade-horario-loja' : undefined} maxLength={200} value={u.horario_loja_texto} onChange={campo('horario_loja_texto')} />
              <span className="nota">Ex.: seg a sáb, 10h às 22h. O horário em que o combo está à venda é outro: fica em Atendimento e horário do combo.</span>
              {i === 0 && <Correcao e={est('unidade-horario-loja')} />}
            </label>
          </div>
        )
      })}
      <button className="acao secundaria" type="button" onClick={adicionar}><Icone nome="mais" tamanho={16} />Adicionar unidade</button>
    </>
  )
}
