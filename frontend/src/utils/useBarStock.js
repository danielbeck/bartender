import { useEffect, useState } from 'react'
import { fetchAPI } from '../api'

export default function useBarStock(user) {
  const [state, setState] = useState(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!user) {
      setState(null)
      return
    }
    const controller = new AbortController()
    setState({ user, loading: true, saving: false, error: '' })
    fetchAPI('/bar', { credentials: 'include', signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) {
          setState({ user, ...data, loading: false, saving: false, error: '' })
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setState({ user, loading: false, saving: false, error: error.message })
        }
      })
    return () => controller.abort()
  }, [user, reload])

  const current = state?.user === user ? state : null
  const save = async (changes) => {
    if (!current?.ingredientIds || current.saving) return
    setState((previous) => ({ ...previous, saving: true, error: '' }))
    try {
      const data = await fetchAPI('/bar', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'X-CSRFToken': current.csrfToken },
        body: JSON.stringify({
          ingredientIds: current.ingredientIds,
          stockOnly: current.stockOnly,
          ...changes,
        }),
      })
      setState((previous) => previous?.user === user
        ? { ...previous, ...data, saving: false, error: '' } : previous)
    } catch (error) {
      setState((previous) => previous?.user === user
        ? { ...previous, saving: false, error: error.message } : previous)
    }
  }

  return { ...current, save, retry: () => setReload((value) => value + 1) }
}
