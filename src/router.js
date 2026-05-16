import React from 'react'

export function useRoute() {
  const parse = () => window.location.hash.replace(/^#/, '') || '/'
  const [path, setPath] = React.useState(parse)
  React.useEffect(() => {
    const onHash = () => { setPath(parse()); window.scrollTo({ top: 0 }) }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const navigate = React.useCallback((to) => {
    window.location.hash = '#' + (to.startsWith('/') ? to : '/' + to)
  }, [])
  return [path, navigate]
}
