import { useContext, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { UnsavedChangesContext } from './UnsavedChangesContext.jsx'

export function useUnsavedChangesController() {
  const value = useContext(UnsavedChangesContext)
  if (!value) throw new Error('useUnsavedChangesController must be used within UnsavedChangesProvider')
  return value
}

export function useUnsavedChangesGuard({
  isDirty,
  title,
  message,
  onSave,
  variant,
  summaryItems,
  discardLabel,
  stayLabel,
  saveLabel,
}) {
  const { registerGuard, unregisterGuard } = useUnsavedChangesController()
  const guardIdRef = useRef(Symbol('unsaved-guard'))
  const guardRef = useRef({
    isDirty,
    title,
    message,
    onSave,
    variant,
    summaryItems,
    discardLabel,
    stayLabel,
    saveLabel,
  })

  guardRef.current = {
    isDirty,
    title,
    message,
    onSave,
    variant,
    summaryItems,
    discardLabel,
    stayLabel,
    saveLabel,
  }

  useEffect(() => {
    const guardId = guardIdRef.current

    if (!isDirty) {
      unregisterGuard(guardId)
      return undefined
    }

    registerGuard(guardId, guardRef)

    return () => unregisterGuard(guardId)
  }, [isDirty, registerGuard, unregisterGuard])
}

export function useGuardedNavigate() {
  const navigate = useNavigate()
  const { runWithGuard } = useUnsavedChangesController()

  async function guardedNavigate(to, options) {
    return runWithGuard(() => navigate(to, options))
  }

  return guardedNavigate
}
