import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

export default function useQueryState(key, defaultValue = '') {
  const [params, setParams] = useSearchParams()
  const value = params.get(key) ?? defaultValue

  const setValue = useCallback(
    (next) => {
      setParams(
        (prev) => {
          const newParams = new URLSearchParams(prev)
          const resolved = typeof next === 'function' ? next(newParams.get(key) ?? defaultValue) : next
          if (resolved === defaultValue || resolved === '' || resolved == null) {
            newParams.delete(key)
          } else {
            newParams.set(key, String(resolved))
          }
          return newParams
        },
        { replace: true }
      )
    },
    [key, defaultValue, setParams]
  )

  return [value, setValue]
}

export function useQueryStateObject(config) {
  const [params, setParams] = useSearchParams()

  const values = useMemo(() => {
    const out = {}
    for (const [key, defaultValue] of Object.entries(config)) {
      out[key] = params.get(key) ?? defaultValue
    }
    return out
  }, [params, config])

  const setValues = useCallback(
    (patch) => {
      setParams(
        (prev) => {
          const newParams = new URLSearchParams(prev)
          for (const [key, v] of Object.entries(patch)) {
            const def = config[key]
            if (v === def || v === '' || v == null) {
              newParams.delete(key)
            } else {
              newParams.set(key, String(v))
            }
          }
          return newParams
        },
        { replace: true }
      )
    },
    [config, setParams]
  )

  return [values, setValues]
}
