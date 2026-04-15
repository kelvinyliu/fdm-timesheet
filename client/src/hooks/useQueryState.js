import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

function readSearchParams(search = '') {
  return new URLSearchParams(search)
}

function readValue(key, defaultValue, search = '') {
  return readSearchParams(search).get(key) ?? defaultValue
}

function readObjectValues(config, search = '') {
  return Object.fromEntries(
    Object.entries(config).map(([key, defaultValue]) => [key, readValue(key, defaultValue, search)])
  )
}

function getSearchString(params) {
  const nextSearch = params.toString()
  return nextSearch ? `?${nextSearch}` : ''
}

export default function useQueryState(key, defaultValue = '') {
  const location = useLocation()
  const navigate = useNavigate()
  const value = readValue(key, defaultValue, location.search)

  const setValue = useCallback(
    (next) => {
      const resolved = typeof next === 'function' ? next(value) : next
      const nextParams = readSearchParams(location.search)

      if (resolved === defaultValue || resolved === '' || resolved == null) {
        nextParams.delete(key)
      } else {
        nextParams.set(key, String(resolved))
      }

      const nextSearch = getSearchString(nextParams)
      if (nextSearch === location.search) return

      navigate(
        {
          search: nextSearch,
        },
        { replace: true }
      )
    },
    [defaultValue, key, location.search, navigate, value]
  )

  return useMemo(() => [value, setValue], [setValue, value])
}

export function useQueryStateObject(config) {
  const location = useLocation()
  const navigate = useNavigate()
  const values = useMemo(
    () => readObjectValues(config, location.search),
    [config, location.search]
  )

  const setValues = useCallback(
    (patch) => {
      const resolvedPatch = typeof patch === 'function' ? patch(values) : patch
      const nextParams = readSearchParams(location.search)

      for (const [key, value] of Object.entries(resolvedPatch)) {
        const defaultValue = config[key]
        if (value === defaultValue || value === '' || value == null) {
          nextParams.delete(key)
        } else {
          nextParams.set(key, String(value))
        }
      }

      const nextSearch = getSearchString(nextParams)
      if (nextSearch === location.search) return

      navigate(
        {
          search: nextSearch,
        },
        { replace: true }
      )
    },
    [config, location.search, navigate, values]
  )

  return useMemo(() => [values, setValues], [setValues, values])
}

export function useDebouncedValue(value, onCommit, delay = 500) {
  const [draftValue, setDraftValue] = useState(value)
  const latestOnCommitRef = useRef(onCommit)

  useEffect(() => {
    latestOnCommitRef.current = onCommit
  }, [onCommit])

  useEffect(() => {
    setDraftValue(value)
  }, [value])

  useEffect(() => {
    if (draftValue === value) return

    const timeoutId = setTimeout(() => {
      latestOnCommitRef.current(draftValue)
    }, delay)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [delay, draftValue, value])

  return useMemo(() => [draftValue, setDraftValue], [draftValue])
}
