import { useCallback, useMemo, useRef, useState } from 'react'
import ConfirmActionDialog from '../components/shared/ConfirmActionDialog.jsx'
import { ConfirmationContext } from './ConfirmationContext.jsx'

export function ConfirmationProvider({ children }) {
  const resolverRef = useRef(null)
  const [request, setRequest] = useState(null)
  const [open, setOpen] = useState(false)

  const close = useCallback((result) => {
    const resolve = resolverRef.current
    resolverRef.current = null
    setOpen(false)
    resolve?.(result)
  }, [])

  const handleExited = useCallback(() => {
    setRequest(null)
  }, [])

  const confirm = useCallback((options) => {
    if (resolverRef.current) {
      resolverRef.current('cancel')
      resolverRef.current = null
    }

    return new Promise((resolve) => {
      resolverRef.current = resolve
      setRequest({
        variant: 'info',
        confirmLabel: 'Confirm',
        cancelLabel: 'Cancel',
        secondaryLabel: '',
        summaryItems: [],
        loading: false,
        ...options,
      })
      setOpen(true)
    })
  }, [])

  const value = useMemo(() => ({ confirm }), [confirm])

  return (
    <ConfirmationContext.Provider value={value}>
      {children}
      <ConfirmActionDialog
        open={open}
        title={request?.title ?? ''}
        message={request?.message ?? ''}
        confirmLabel={request?.confirmLabel}
        cancelLabel={request?.cancelLabel}
        secondaryLabel={request?.secondaryLabel}
        summaryItems={request?.summaryItems}
        variant={request?.variant}
        loading={request?.loading}
        onExited={handleExited}
        onConfirm={() => close('confirm')}
        onCancel={() => close('cancel')}
        onSecondary={() => close('secondary')}
      />
    </ConfirmationContext.Provider>
  )
}
