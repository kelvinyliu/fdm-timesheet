import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useBeforeUnload, useBlocker } from 'react-router'
import { useConfirmation } from './useConfirmation.js'
import { UnsavedChangesContext } from './UnsavedChangesContext.jsx'

function getLastGuard(guards) {
  const activeGuards = Array.from(guards.values())
    .map((guardRef) => guardRef.current)
    .filter((guard) => guard?.isDirty)
  return activeGuards.at(-1) ?? null
}

function getGuardDialogOptions(guard) {
  return {
    variant: guard.variant ?? 'warning',
    title: guard.title ?? 'Discard unsaved changes?',
    message:
      guard.message ??
      'You have unsaved changes on this screen. Leaving now will discard them.',
    confirmLabel: guard.discardLabel ?? 'Discard changes',
    cancelLabel: guard.stayLabel ?? 'Stay here',
    secondaryLabel: guard.onSave ? guard.saveLabel ?? 'Save and leave' : '',
    summaryItems: guard.summaryItems ?? [],
  }
}

function hasLocationChanged(currentLocation, nextLocation) {
  return (
    currentLocation.pathname !== nextLocation.pathname ||
    currentLocation.search !== nextLocation.search ||
    currentLocation.hash !== nextLocation.hash
  )
}

export function UnsavedChangesProvider({ children }) {
  const { confirm } = useConfirmation()
  const guardsRef = useRef(new Map())
  const allowNavigationRef = useRef(false)
  const handlingBlockedNavigationRef = useRef('')

  const registerGuard = useCallback((id, guardRef) => {
    guardsRef.current.set(id, guardRef)
  }, [])

  const unregisterGuard = useCallback((id) => {
    guardsRef.current.delete(id)
  }, [])

  const resolveGuardDecision = useCallback(async (guard) => {
    if (!guard?.isDirty) return true

    const result = await confirm(getGuardDialogOptions(guard))

    if (result === 'confirm') {
      return true
    }

    if (result === 'secondary' && guard.onSave) {
      const didSave = await guard.onSave()
      return didSave !== false
    }

    return false
  }, [confirm])

  const runWithoutBlocking = useCallback(async (action) => {
    const wasNavigationAllowed = allowNavigationRef.current
    allowNavigationRef.current = true

    try {
      await action?.()
    } finally {
      allowNavigationRef.current = wasNavigationAllowed
    }
  }, [])

  const runWithGuard = useCallback(async (action) => {
    const guard = getLastGuard(guardsRef.current)

    if (!guard?.isDirty) {
      await action?.()
      return true
    }

    const shouldProceed = await resolveGuardDecision(guard)
    if (!shouldProceed) return false

    await runWithoutBlocking(action)
    return true
  }, [resolveGuardDecision, runWithoutBlocking])

  const blocker = useBlocker(useCallback(({ currentLocation, nextLocation }) => {
    if (allowNavigationRef.current) return false

    const guard = getLastGuard(guardsRef.current)
    if (!guard?.isDirty) return false

    return hasLocationChanged(currentLocation, nextLocation)
  }, []))

  useEffect(() => {
    if (blocker.state !== 'blocked') {
      handlingBlockedNavigationRef.current = ''
      return
    }

    const blockedNavigationId = [
      blocker.location.pathname,
      blocker.location.search,
      blocker.location.hash,
      blocker.location.key ?? '',
    ].join('|')

    if (handlingBlockedNavigationRef.current === blockedNavigationId) return
    handlingBlockedNavigationRef.current = blockedNavigationId

    let isCurrentAttempt = true

    ;(async () => {
      const guard = getLastGuard(guardsRef.current)
      const shouldProceed = await resolveGuardDecision(guard)

      if (!isCurrentAttempt) return

      handlingBlockedNavigationRef.current = ''
      if (shouldProceed) {
        blocker.proceed()
        return
      }

      blocker.reset()
    })()

    return () => {
      isCurrentAttempt = false
    }
  }, [blocker, resolveGuardDecision])

  useBeforeUnload((event) => {
    if (!getLastGuard(guardsRef.current)) return
    event.preventDefault()
    event.returnValue = ''
  })

  const value = useMemo(() => ({
    registerGuard,
    unregisterGuard,
    runWithGuard,
  }), [registerGuard, unregisterGuard, runWithGuard])

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
    </UnsavedChangesContext.Provider>
  )
}
