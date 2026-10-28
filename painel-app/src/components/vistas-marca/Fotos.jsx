import React from 'react'
import { estadoDaSessao, pendenciasDeFotos } from '../../lib/fotosMarca'
import { VistaCabeca } from '../VistaCabeca'
import { Carregando, Erro, Vazio } from '../ui'
import { useSessoesFotos } from './fotos/useSessoesFotos'
import { PendenciasFotos } from './fotos/PendenciasFotos'
import { Agendamento } from './fotos/Agendamento'
import { Preparacao } from './fotos/Preparacao'
import { FotosOficiais } from './fotos/FotosOficiais'
import '../../styles/fotos-marca.css'

/*
 * Fotos (marca) — três blocos, nesta ordem (22/10/2026):
 *   1 · Agendamento da sessão   (fotos/Agendamento.jsx: dia, hora e local; as vagas por dia)
 *   2 · Preparação              (fotos/Preparacao.jsx: o Guia de fotos, que já existe)
 *   3 · Fotos oficiais          (fotos/FotosOficiais.jsx: miniaturas, baixar, "conferi")
 * As decisões moram em lib/fotosMarca.js; o que falta nesta aba vem de `resumo` (lib/guia.js), sem recalcular.
 * Em "Ver como participante" a tela aparece igual: quem bloqueia a gravação é lib/marcaApi.js.
 */
export function Fotos({ irPara, abrirLink, alvo, consumirAlvo, dadosMarca, resumo, erroResumo, recarregarResumo }) {
  const participacao = dadosMarca && dadosMarca.participacao
  const participante = dadosMarca && dadosMarca.participante
  const sessoes = useSessoesFotos({ participacao, participante, recarregarResumo })
  // Alvo com id (aviso de foto oficial) é do bloco das fotos, que o consome; sem id, quem consome é esta tela.
  React.useEffect(() => { if (alvo && !alvo.id && consumirAlvo) consumirAlvo() }, [alvo]) // eslint-disable-line react-hooks/exhaustive-deps

  const estado = !dadosMarca ? 'carregando' : !participante ? 'sem-marca' : !participacao ? 'sem-participacao' : 'pronto'
  // `minhas`/`vagas` já vêm só desta participação e da edição dela (a RLS devolve todas): fotosDaParticipacao, em guia.js.
  const sessao = estado === 'pronto' ? estadoDaSessao({ participacao, minhas: sessoes.minhas, vagas: sessoes.vagas }) : null

  return (
    <section className="ui-vista-marca fm">
      <VistaCabeca acento="magenta" icone="fotos" titulo="Fotos" nota="Agendamento da sessão, preparação e fotos oficiais" />

      {estado === 'carregando' && (erroResumo
        ? <Erro texto={erroResumo} onTentar={recarregarResumo} />
        : <Carregando linhas={3} texto="Carregando as fotos…" />)}
      {estado === 'sem-marca' && <Erro titulo="Conta sem marca" texto="Sua conta existe, mas ainda não há marca ligada a ela. Fale com a organização pelo WhatsApp." />}
      {estado === 'sem-participacao' && (
        <Vazio titulo="Sem edição aberta" icone="fotos">A sessão de fotos aparece aqui quando a sua participação na edição abrir.</Vazio>
      )}

      {estado === 'pronto' && (
        <>
          <PendenciasFotos itens={pendenciasDeFotos(resumo)} abrirLink={abrirLink} />
          <Agendamento situacao={sessoes.situacao} estado={sessao} minhas={sessoes.minhas} vagas={sessoes.vagas}
            reservando={sessoes.reservando} aviso={sessoes.aviso} onReservar={sessoes.reservar} onTentar={sessoes.tentarDeNovo} />
          <Preparacao irPara={irPara} estado={sessao} />
          <FotosOficiais participacao={participacao} alvo={alvo} consumirAlvo={consumirAlvo} recarregarResumo={recarregarResumo} />
        </>
      )}
    </section>
  )
}
