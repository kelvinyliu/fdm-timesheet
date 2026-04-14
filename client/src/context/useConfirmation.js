import { useContext } from 'react'
import { ConfirmationContext } from './ConfirmationContext.jsx'

export function useConfirmation() {
  const value = useContext(ConfirmationContext)
  if (!value) throw new Error('useConfirmation must be used within ConfirmationProvider')
  return value
}
