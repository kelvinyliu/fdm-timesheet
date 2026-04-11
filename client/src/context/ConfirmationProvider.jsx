import { useRef, useState } from 'react'
import ConfirmActionDialog from '../components/shared/ConfirmActionDialog.jsx'
import { ConfirmationContext } from './ConfirmationContext.jsx'

export function ConfirmationProvider({ children }) {
  const resolverRef = useRef(null)
  const [request, setRequest] = useState(null)

  function close(result) {
    const resolve = resolverRef.current
    resolverRef.current = null
    setRequest(null)
    resolve?.(result)
  }

  function confirm(options) {
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
    })
  }

  return (
    <ConfirmationContext.Provider value={{ confirm }}>
      {children}
      <ConfirmActionDialog
        open={Boolean(request)}
        title={request?.title ?? ''}
        message={request?.message ?? ''}
        confirmLabel={request?.confirmLabel}
        cancelLabel={request?.cancelLabel}
        secondaryLabel={request?.secondaryLabel}
        summaryItems={request?.summaryItems}
        variant={request?.variant}
        loading={request?.loading}
        onConfirm={() => close('confirm')}
        onCancel={() => close('cancel')}
        onSecondary={() => close('secondary')}
      />
    </ConfirmationContext.Provider>
  )
}
