import React from 'react'
import { Icone } from '../../Icone'
import { confirmar } from '../../Confirmar'
import { mascaraWhatsApp } from '../../../lib/participantes'
import { nomeDaUnidade, idCampoUnidade, erroCep, erroUf, erroWhatsappUnidade, whatsappLegado } from '../../../lib/edicaoMarca'
import { EstadoCampo, Correcao, Publico, GrupoPublico, Opcional } from './campos'

/*
 * Bloco 4 · Unidades. A unidade é PERMANENTE (`unidades`: endereço e WhatsApp da loja) e participa da
 * edição por `participacao_unidades` (`participa`). A marca preenche o endereço inteiro (rua, número, bairro, cidade
 * e CEP) e não vê nada do mapa: conferir o ponto é só da organização (Participantes › Localizações, 28/10/2026).
 * Uma unidade cadastrada em outra edição aparece como sugestão, sem ser copiada sozinha (04-painel.md §4.2).
 * O horário da unidade nos dias do festival é do bloco 6 (Atendimento).
 */
function Campo({ rotulo, opcional, publico = true, id, erro, children, nota }) {
  const idErro = erro && id ? 'erro-' + id : undefined
  return (
    <label>
      {/* A visibilidade é explicada UMA vez, na cabeça do grupo; o selo por linha fica só para a exceção (CEP, uso interno). */}
      <span>{rotulo} {opcional && <Opcional />} {!publico && <Publico sim={false} />}</span>
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
        uma marca só. O endereço fica guardado para as próximas edições. Preencha rua, número, bairro, cidade e CEP.</p>
      <GrupoPublico>
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
                  <span>Rua ou avenida {i === 0 && <EstadoCampo e={est('unidade-endereco')} />}</span>
                  <input id={'campo-' + idCampoUnidade('unidade-endereco', i)} maxLength={160} autoComplete="address-line1" value={u.logradouro} onChange={campo('logradouro')} />
                  {i === 0 && <Correcao e={est('unidade-endereco')} />}
                </label>
                <Campo rotulo="Número" nota="Sem número? Escreva S/N."><input maxLength={20} value={u.numero} onChange={campo('numero')} /></Campo>
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
                <Campo rotulo="Estado (UF)" opcional id={'uf-' + k} erro={erroUf(u.uf)}>
                  <input maxLength={2} autoComplete="address-level1" value={u.uf} onChange={(e) => alterar(k, 'uf', e.target.value.toUpperCase())} />
                </Campo>
                <Campo rotulo="CEP" publico={false} id={'cep-' + k} erro={erroCep(u.cep)}>
                  <input inputMode="numeric" maxLength={9} autoComplete="postal-code" value={u.cep} onChange={campo('cep')} />
                </Campo>
              </div>
              {/* O WhatsApp DA LOJA, um por unidade, vai para o site quando preenchido. O contato do responsável
                  (Dados da marca) é outro: fica só com a organização. */}
              <label>
                <span>WhatsApp da loja <Opcional /> {i === 0 && <EstadoCampo e={est('unidade-whatsapp')} />}</span>
                <input id={i === 0 ? 'campo-unidade-whatsapp' : undefined} type="tel" inputMode="tel" autoComplete="off"
                  aria-invalid={erroWhatsappUnidade(u.whatsapp_publico) ? true : undefined}
                  aria-describedby={erroWhatsappUnidade(u.whatsapp_publico) ? 'erro-whats-' + k : undefined}
                  value={u.whatsapp_publico} onChange={(e) => alterar(k, 'whatsapp_publico', mascaraWhatsApp(e.target.value))} />
                {erroWhatsappUnidade(u.whatsapp_publico) && <span className="gm-campo-erro" id={'erro-whats-' + k}>{erroWhatsappUnidade(u.whatsapp_publico)}</span>}
                <span className="nota">
                  Aparece no site para os clientes falarem com esta loja. Cada unidade tem o seu. Para falar com você, a organização usa o
                  WhatsApp do responsável, em Dados da marca.
                  {whatsappLegado(u) && <b> Este número vai para o site quando você salvar esta unidade.</b>}
                </span>
                {i === 0 && <Correcao e={est('unidade-whatsapp')} />}
              </label>
            </div>
          )
        })}
      </GrupoPublico>
      <button className="acao secundaria" type="button" onClick={adicionar}><Icone nome="mais" tamanho={16} />Adicionar unidade</button>
    </>
  )
}
