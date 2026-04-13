import { useEffect, useState } from 'react'

export function useSyncedErrorState(initialError) {
  const [error, setError] = useState(initialError)

  useEffect(() => {
    setError(initialError)
  }, [initialError])

  return [error, setError]
}
