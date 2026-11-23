import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

/** Filters live in the URL so refresh, back/forward and shared links all restore the same view. */
export function useUrlFilters<T extends Record<string, string>>(defaults: T) {
  const [params, setParams] = useSearchParams()

  const values = Object.fromEntries(Object.keys(defaults).map((k) => [k, params.get(k) ?? defaults[k]])) as T

  const set = useCallback((patch: Partial<Record<keyof T, string>>, opts: { keepPage?: boolean } = {}) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === '' || v === defaults[k]) next.delete(k)
        else next.set(k, v as string)
      }
      if (!opts.keepPage && !('page' in patch)) next.delete('page')
      return next
    }, { replace: true })
  }, [setParams, defaults])

  const reset = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams])
  const activeCount = Object.keys(defaults).filter((k) => !['page', 'sort', 'order'].includes(k) && values[k] !== defaults[k]).length

  return { values, set, reset, activeCount }
}

export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}
