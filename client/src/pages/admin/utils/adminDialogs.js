export async function attemptCloseAdminDialog({
  isDirty,
  isBusy,
  confirm,
  confirmOptions,
  onClose,
}) {
  if (!isDirty || isBusy) {
    onClose()
    return true
  }

  const result = await confirm(confirmOptions)
  if (result === 'confirm') {
    onClose()
    return true
  }

  return false
}
