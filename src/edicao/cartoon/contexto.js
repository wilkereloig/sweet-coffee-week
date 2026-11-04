import React from 'react'
import { MAPA_PUBLICO } from '../config.js'

/** Mapa no ar: chave pública ou preview (mesma regra de INSTITUTIONAL_PREVIEW em App.jsx; o domínio nunca libera). */
export const MAPA_NO_AR = MAPA_PUBLICO || !!import.meta.env?.DEV || (typeof window !== 'undefined'
  && !/(^|\.)sweetcoffeeweek\.com\.br$/i.test(window.location.hostname) && new URLSearchParams(window.location.search).has('preview'))

/** Uma Minha rota por página (contador da casca e botões das unidades leem a mesma). */
export const RotaContexto = React.createContext(null)
export const useRota = () => React.useContext(RotaContexto)
