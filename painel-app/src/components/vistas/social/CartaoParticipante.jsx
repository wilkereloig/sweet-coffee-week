import React from 'react'
import { Icone, MODULO_ICONE } from '../../Icone'
import { Selo, Modulo, Botao, MarcaComLogo } from '../../ui'
import {
  AGUARDANDO, NAO_INFORMADO, TIPOS, preenchido, arroba, real, selosEAlergenicos, trocasEOpcoes, ONDE_DESCRICAO,
  enderecoTexto, foneTexto, atendimentoTexto,
} from '../../../lib/combosTexto'
import { marcaDoCampo, marcaDeCampos, contarAlteracoes, textoDoAntes, quandoMudou, ROTULO_MARCA } from '../../../lib/alteracoesCampo'

/*
 * Um participante, tudo à vista (Social media › Participantes, 31/10/2026). Campos FIXOS, na mesma ordem para todos: o que a
 * marca não respondeu fica no lugar dele como "Aguardando informação". `d` já vem revisado (`paraTexto`); `bruto` é a linha
 * de `editorial_combos` (as marcações "Novo / Alterado" e o "antes" vêm dela). Só lê: nada aqui grava no cadastro.
 */
const ROTULO_TIPO = Object.fromEntries(TIPOS)

function Marca({ m, campo, datas }) {
  if (!m) return null
  const antes = m.tipo === 'alterado' || m.tipo === 'removido' ? textoDoAntes(campo, m.antes, datas) : ''
  return (
    <span className="scb-marca">
      <Selo tom={m.tipo === 'novo' ? 'ok' : 'atencao'}>{ROTULO_MARCA[m.tipo]}{m.em ? ' · ' + quandoMudou(m.em) : ''}</Selo>
      {antes && <span className="scb-antes">Antes: {antes}</span>}
    </span>
  )
}

function Campo({ rotulo, valor, vazio = AGUARDANDO, m, campo, datas, forte }) {
  return (
    <div className={'scb-campo' + (m ? ' scb-campo--marcado' : '')}>
      <dt>{rotulo}</dt>
      <dd>
        {valor ? (forte ? <b>{valor}</b> : valor) : <span className={vazio === AGUARDANDO ? 'scb-aguardando' : 'scb-vazio'}>{vazio}</span>}
        <Marca m={m} campo={campo} datas={datas} />
      </dd>
    </div>
  )
}

export function CartaoParticipante({ d, bruto, editorial, datas = [], valorCombo, horario, onAbrir, onCopiar, onVisto, marcando }) {
  const c = d.combo || {}
  const b = bruto || d
  const mc = (campo) => marcaDoCampo(b, campo)
  const n = contarAlteracoes(b)
  const tr = trocasEOpcoes(d)
  const us = d.unidades || []
  const nPosts = editorial ? Number(editorial.n_posts) || 0 : null
  return (
    <Modulo
      largo className="scb-cartao" icone={MODULO_ICONE.combo}
      titulo={<MarcaComLogo nome={d.marca} participanteId={d.participante_id} tamanho={32} />}
      sub={[d.tema ? 'Tema: ' + d.tema : null, arroba(d.instagram)].filter(Boolean).join(' · ') || 'Tema ainda não definido'}
      status={(
        <>
          {preenchido(d) ? <Selo dominio="combo" valor={d.combo_status} /> : <Selo tom="atencao">Combo em branco</Selo>}
          {d.alterado_apos_aprovacao && <Selo tom="atencao">Alterado depois de aprovado</Selo>}
          {editorial && editorial.no_site && <Selo tom="ok">No site</Selo>}
          {nPosts != null && (nPosts
            ? <span className="rd-campo__nota"><Icone nome="calendario" tamanho={16} /> {nPosts} {nPosts === 1 ? 'postagem' : 'postagens'}</span>
            : <Selo tom="atencao">Sem postagem</Selo>)}
        </>
      )}
      acoes={(
        <>
          <Botao variante="secundario" icone="copiar" soIcone onClick={() => onCopiar(d)}>Copiar texto de {d.marca}</Botao>
          {onAbrir && <Botao variante="secundario" icone="ir" onClick={onAbrir}>Abrir ficha</Botao>}
        </>
      )}
    >
      {n > 0 && (
        <div className="scb-novidades" role="status">
          <p><Icone nome="alerta" tamanho={20} /><span><b>{n === 1 ? '1 alteração' : n + ' alterações'} da marca</b> desde a sua última visita.</span></p>
          {onVisto && <Botao variante="secundario" icone="feito" disabled={marcando} onClick={onVisto}>Marquei como visto</Botao>}
        </div>
      )}

      <div className="scb-blocos">
        <section className="scb-bloco" aria-label={'Participante: ' + d.marca}>
          <h4 className="scb-bloco__titulo">Participante</h4>
          <dl className="scb-dl">
            <Campo rotulo="Instagram" valor={arroba(d.instagram)} vazio={NAO_INFORMADO} m={mc('instagram')} campo="instagram" />
            <Campo rotulo="Tema" valor={d.tema} m={mc('tema')} campo="tema" />
          </dl>
        </section>
        <section className="scb-bloco" aria-label={'Combo de ' + d.marca}>
          <h4 className="scb-bloco__titulo">Combo</h4>
          <dl className="scb-dl">
            <Campo rotulo="Nome do combo" valor={c.nome} forte m={mc('combo.nome')} campo="combo.nome" />
            <Campo rotulo="Descrição" valor={c.descricao} m={mc('combo.descricao')} campo="combo.descricao" />
            <Campo rotulo="Condições" valor={c.condicoes} vazio="Nenhuma informada" m={mc('combo.condicoes')} campo="combo.condicoes" />
            <Campo rotulo="Para viagem" valor={d.para_viagem === true ? 'Sim' : d.para_viagem === false ? 'Não' : ''} m={mc('para_viagem')} campo="para_viagem" />
            {valorCombo != null && <Campo rotulo="Valor" valor={real(valorCombo) + ' (definido pela organização)'} />}
          </dl>
        </section>
      </div>

      <ul className="scb-itens" aria-label={'Itens do combo de ' + d.marca}>
        {TIPOS.map(([tipo, rotulo]) => {
          const i = (c.itens || []).find((x) => x.tipo === tipo) || {}
          const sa = selosEAlergenicos(i)
          return (
            <li key={tipo} className={'scb-item scb-item--' + tipo}>
              <p className="scb-item__tipo"><Icone nome={MODULO_ICONE[tipo] || MODULO_ICONE.combo} tamanho={18} />{rotulo}</p>
              <dl className="scb-dl scb-dl--item">
                <Campo rotulo="Nome" valor={i.nome} forte m={mc(tipo + '.nome')} campo={tipo + '.nome'} />
                <Campo rotulo="Descrição" valor={i.descricao} m={mc(tipo + '.descricao')} campo={tipo + '.descricao'} />
                <Campo rotulo="Ingredientes" valor={i.ingredientes} vazio={NAO_INFORMADO} m={mc(tipo + '.ingredientes')} campo={tipo + '.ingredientes'} />
                <Campo rotulo="Selos" valor={sa.selos} m={mc(tipo + '.alimentar')} campo={tipo + '.alimentar'} />
                <Campo rotulo="Alergênicos" valor={sa.alergenicos} />
              </dl>
            </li>
          )
        })}
      </ul>

      <section className="scb-bloco" aria-label={'Trocas e opções de ' + d.marca}>
        <h4 className="scb-bloco__titulo">Trocas e opções</h4>
        {tr.length ? (
          <dl className="scb-dl">
            {tr.map((x, k) => (
              <Campo key={k} rotulo={ROTULO_TIPO[x.tipo] || x.tipo}
                valor={x.daDescricao ? <>{x.texto}<span className="scb-origem">Informado {ONDE_DESCRICAO[x.daDescricao]}.</span></> : x.texto}
                m={x.campo ? mc(x.campo) : null} campo={x.campo || ''} />
            ))}
          </dl>
        ) : (
          <dl className="scb-dl">
            <Campo rotulo="Trocas" valor="" vazio="Nenhuma troca ou opção informada" m={marcaDeCampos(b, TIPOS.map(([tp]) => tp + '.trocas'))} campo="trocas" />
          </dl>
        )}
      </section>

      <section className="scb-bloco" aria-label={'Onde encontrar ' + d.marca}>
        <h4 className="scb-bloco__titulo">{us.length > 1 ? 'Onde encontrar (' + us.length + ' unidades)' : 'Onde encontrar'}</h4>
        {!us.length && <dl className="scb-dl"><Campo rotulo="Unidade" valor="" /></dl>}
        <div className="scb-unidades">
          {us.map((u) => {
            const k = 'unidade:' + u.id + '.'
            return (
              <dl key={u.id} className="scb-dl scb-unidade">
                <Campo rotulo="Unidade" valor={u.nome} vazio={NAO_INFORMADO} forte m={mc(k + 'nome')} campo={k + 'nome'} />
                <Campo rotulo="Endereço" valor={enderecoTexto(u.endereco)} m={mc(k + 'endereco')} campo={k + 'endereco'} />
                <Campo rotulo="WhatsApp da loja" valor={foneTexto(u.whatsapp)} vazio={NAO_INFORMADO} m={mc(k + 'whatsapp')} campo={k + 'whatsapp'} />
                <Campo rotulo="Atendimento" valor={atendimentoTexto(u)} m={mc(k + 'atendimento')} campo={k + 'atendimento'} />
                <Campo rotulo="Horário no festival" valor={horario ? horario(u) : ''} m={mc(k + 'horario')} campo={k + 'horario'} datas={datas} />
              </dl>
            )
          })}
        </div>
      </section>
    </Modulo>
  )
}
