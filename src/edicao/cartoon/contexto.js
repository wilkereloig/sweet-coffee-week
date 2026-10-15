import React from 'react'

/** Uma Minha rota por página (contador da casca e botões das unidades leem a mesma). */
export const RotaContexto = React.createContext(null)
export const useRota = () => React.useContext(RotaContexto)
