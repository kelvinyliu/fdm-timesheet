import { useCallback, useEffect, useMemo, useState } from 'react'
import { useInRouterContext, useLocation, useNavigate } from 'react-router'

const QUERY_STATE_EVENT = 'fdm-query-state-change'

function readSearchParams(search = null) {
  if (typeof window === 'undefined') {
    return new URLSearchParams()
  }

  return new URLSearchParams(search ?? window.location.search)
}

function readValue(key, defaultValue, search = null) {
  return readSearchParams(search).get(key) ?? defaultValue
}

function normaliseValue(value, defaultValue) {
  if (value === defaultValue || value === '' || value == null) {
    return defaultValue
  }

  return String(value)
}

function readObjectValues(config, search = null) {
  return Object.fromEntries(
    Object.entries(config).map(([key, defaultValue]) => [key, readValue(key, defaultValue, search)])
  )
}

function areObjectValuesEqual(currentValues, nextValues) {
  const currentKeys = Object.keys(currentValues)
  const nextKeys = Object.keys(nextValues)

  if (currentKeys.length !== nextKeys.length) return false

  return currentKeys.every((key) => currentValues[key] === nextValues[key])
}

function replaceSearchParams(mutator) {
  if (typeof window === 'undefined') return

  const nextUrl = new URL(window.location.href)
  mutator(nextUrl.searchParams)
  window.history.replaceState(
    window.history.state,
    '',
    `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`
  )
  window.dispatchEvent(new Event(QUERY_STATE_EVENT))
}

function subscribeToQueryState(callback) {
  if (typeof window === 'undefined') return () => {}

  window.addEventListener('popstate', callback)
  window.addEventListener(QUERY_STATE_EVENT, callback)

  return () => {
    window.removeEventListener('popstate', callback)
    window.removeEventListener(QUERY_STATE_EVENT, callback)
  }
}

export default function useQueryState(key, defaultValue = '') {
  const inRouter = useInRouterContext()
  const location = inRouter ? useLocation() : null
  const navigate = inRouter ? useNavigate() : null
  const currentSearch = location?.search ?? null
  const [value, setValueState] = useState(() => readValue(key, defaultValue, currentSearch))

  useEffect(() => {
    if (inRouter) {
      setValueState(readValue(key, defaultValue, currentSearch))
      return undefined
    }

    const sync = () => setValueState(readValue(key, defaultValue))
    return subscribeToQueryState(sync)
  }, [currentSearch, defaultValue, inRouter, key])

  const setValue = useCallback(
    (next) => {
      const resolved =
        typeof next === 'function' ? next(readValue(key, defaultValue, currentSearch)) : next
      const writeParams = (params) => {
        if (resolved === defaultValue || resolved === '' || resolved == null) {
          params.delete(key)
        } else {
          params.set(key, String(resolved))
        }
      }

      if (inRouter && navigate) {
        const nextParams = readSearchParams(currentSearch)
        writeParams(nextParams)
        const nextSearch = nextParams.toString()
        navigate(
          {
            search: nextSearch ? `?${nextSearch}` : '',
          },
          { replace: true }
        )
      } else {
        replaceSearchParams(writeParams)
      }
      setValueState(normaliseValue(resolved, defaultValue))
    },
    [currentSearch, defaultValue, inRouter, key, navigate]
  )

  return [value, setValue]
}

export function useQueryStateObject(config) {
  const inRouter = useInRouterContext()
  const location = inRouter ? useLocation() : null
  const navigate = inRouter ? useNavigate() : null
  const currentSearch = location?.search ?? null
  const configSignature = JSON.stringify(Object.entries(config))
  const stableConfig = useMemo(() => Object.fromEntries(Object.entries(config)), [configSignature])
  const [values, setValuesState] = useState(() => readObjectValues(stableConfig, currentSearch))

  useEffect(() => {
    const syncValues = (search = currentSearch) => {
      const nextValues = readObjectValues(stableConfig, search)
      setValuesState((prev) => (areObjectValuesEqual(prev, nextValues) ? prev : nextValues))
    }

    if (inRouter) {
      syncValues(currentSearch)
      return undefined
    }

    const sync = () => syncValues()

    return subscribeToQueryState(sync)
  }, [currentSearch, inRouter, stableConfig])

  const setValues = useCallback(
    (patch) => {
      const resolvedPatch = typeof patch === 'function' ? patch(values) : patch

      const writeParams = (params) => {
        for (const [key, value] of Object.entries(resolvedPatch)) {
          const defaultValue = config[key]
          if (value === defaultValue || value === '' || value == null) {
            params.delete(key)
          } else {
            params.set(key, String(value))
          }
        }
      }

      if (inRouter && navigate) {
        const nextParams = readSearchParams(currentSearch)
        writeParams(nextParams)
        const nextSearch = nextParams.toString()
        navigate(
          {
            search: nextSearch ? `?${nextSearch}` : '',
          },
          { replace: true }
        )
      } else {
        replaceSearchParams(writeParams)
      }

      setValuesState((prev) => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(resolvedPatch).map(([key, value]) => [
            key,
            normaliseValue(value, stableConfig[key]),
          ])
        ),
      }))
    },
    [currentSearch, inRouter, navigate, stableConfig, values]
  )

  return useMemo(() => [values, setValues], [setValues, values])
}
