import { useCallback, useRef } from 'react'
import { useBeforeUnload } from 'react-router'
import { useConfirmation } from './useConfirmation.js'
import { UnsavedChangesContext } from './UnsavedChangesContext.jsx'

function getLastGuard(guards) {
  const activeGuards = Array.from(guards.values())
    .map((guardRef) => guardRef.current)
    .filter((guard) => guard?.isDirty)
  return activeGuards.at(-1) ?? null
}

export function UnsavedChangesProvider({ children }) {
  const { confirm } = useConfirmation()
  const guardsRef = useRef(new Map())

  const registerGuard = useCallback((id, guardRef) => {
    guardsRef.current.set(id, guardRef)
  }, [])

  const unregisterGuard = useCallback((id) => {
    guardsRef.current.delete(id)
  }, [])

  const runWithGuard = useCallback(async (action) => {
    const guard = getLastGuard(guardsRef.current)

    if (!guard?.isDirty) {
      await action?.()
      return true
    }

    const result = await confirm({
      variant: guard.variant ?? 'warning',
      title: guard.title ?? 'Discard unsaved changes?',
      message:
        guard.message ??
        'You have unsaved changes on this screen. Leaving now will discard them.',
      confirmLabel: guard.discardLabel ?? 'Discard changes',
      cancelLabel: guard.stayLabel ?? 'Stay here',
      secondaryLabel: guard.onSave ? guard.saveLabel ?? 'Save and leave' : '',
      summaryItems: guard.summaryItems ?? [],
    })

    if (result === 'confirm') {
      await action?.()
      return true
    }

    if (result === 'secondary' && guard.onSave) {
      const didSave = await guard.onSave()
      if (didSave !== false) {
        await action?.()
        return true
      }
    }

    return false
  }, [confirm])

  useBeforeUnload((event) => {
    if (!getLastGuard(guardsRef.current)) return
    event.preventDefault()
    event.returnValue = ''
  })

  return (
    <UnsavedChangesContext.Provider
      value={{
        registerGuard,
        unregisterGuard,
        runWithGuard,
      }}
    >
      {children}
    </UnsavedChangesContext.Provider>
  )
}
