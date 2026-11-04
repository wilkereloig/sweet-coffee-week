/*
 * Minha rota → a página única do mapa entrando pela rota (docs/cartoon-2026-2/14 §14.13): topo "Minha rota", e no
 * celular o painel (paradas, Google Maps, carimbos) vem antes do mapa. O endereço /cartoon/minha-rota continua valendo
 * para os links antigos, a rota compartilhada (?u=) e o link pessoal do Mapa da Doçura (#mapa=).
 */
import React from 'react'
import { Mapa } from './mapa/index.jsx'

export function MinhaRota (props) {
  return <Mapa {...props} entrada="rota" />
}
