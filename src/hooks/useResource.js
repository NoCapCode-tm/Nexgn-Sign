import { useCallback, useEffect, useRef, useState } from 'react'

// Loads on mount and whenever `key` changes. `loading` is derived, so no state is set synchronously in an effect.
export function useResource(load, key) {
  const [state, setState] = useState({ id: null, data: null, error: null })
  const [nonce, setNonce] = useState(0)
  const loadRef = useRef(load)
  const id = `${key}#${nonce}`

  useEffect(() => {
    loadRef.current = load
  })

  useEffect(() => {
    let active = true
    loadRef
      .current()
      .then((data) => active && setState({ id, data, error: null }))
      .catch((error) => active && setState((s) => ({ id, data: s.data, error })))
    return () => {
      active = false
    }
  }, [id])

  const mutate = useCallback(
    (fn) => setState((s) => (s.data == null ? s : { ...s, data: fn(s.data) })),
    [],
  )
  const reload = useCallback(() => setNonce((n) => n + 1), [])

  return {
    data: state.data,
    error: state.id === id ? state.error : null,
    loading: state.id !== id,
    mutate,
    reload,
  }
}