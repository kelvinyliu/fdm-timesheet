import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import { changePassword } from '../../api/auth.js'
import { useConfirmation } from '../../context/useConfirmation.js'
import { useUnsavedChangesGuard } from '../../context/useUnsavedChanges.js'

const EMPTY_PASSWORD_FORM = { current: '', next: '', confirm: '' }

export default function PasswordDialog({ open, onClose }) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'))
  const { confirm } = useConfirmation()
  const [form, setForm] = useState(EMPTY_PASSWORD_FORM)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const isDirty = open && (Boolean(form.current) || Boolean(form.next) || Boolean(form.confirm))

  useUnsavedChangesGuard({
    isDirty,
    title: 'Discard password changes?',
    message: 'You have started editing the password form. Leaving now will discard those values.',
    variant: 'warning',
    discardLabel: 'Discard password changes',
    stayLabel: 'Keep editing',
  })

  function closeDialog() {
    onClose()
    setError('')
    setSuccess(false)
    setForm(EMPTY_PASSWORD_FORM)
  }

  async function attemptCloseDialog() {
    if (!isDirty || loading) {
      closeDialog()
      return
    }

    const result = await confirm({
      variant: 'warning',
      title: 'Discard password changes?',
      message: 'The password form has unsaved values. Closing it now will discard them.',
      confirmLabel: 'Discard changes',
      cancelLabel: 'Keep editing',
    })

    if (result === 'confirm') {
      closeDialog()
    }
  }

  async function handleChangePassword() {
    setError('')
    if (!form.current || !form.next || !form.confirm) {
      setError('All fields are required.')
      return
    }
    if (form.next.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    if (form.next !== form.confirm) {
      setError('New passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await changePassword(form.current, form.next)
      setSuccess(true)
      setForm(EMPTY_PASSWORD_FORM)
    } catch (err) {
      setError(err.message || 'Failed to change password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={
        loading
          ? undefined
          : () => {
              void attemptCloseDialog()
            }
      }
      maxWidth="xs"
      fullWidth
      fullScreen={fullScreen}
    >
      <DialogTitle>Change Password</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2, mt: 1 }}>
            Password changed successfully.
          </Alert>
        )}
        <TextField
          label="Current Password"
          type="password"
          value={form.current}
          onChange={(e) => setForm((p) => ({ ...p, current: e.target.value }))}
          fullWidth
          sx={{ mt: 1, mb: 2 }}
        />
        <TextField
          label="New Password"
          type="password"
          value={form.next}
          onChange={(e) => setForm((p) => ({ ...p, next: e.target.value }))}
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="Confirm New Password"
          type="password"
          value={form.confirm}
          onChange={(e) => setForm((p) => ({ ...p, confirm: e.target.value }))}
          fullWidth
        />
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            void attemptCloseDialog()
          }}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button variant="contained" onClick={handleChangePassword} disabled={loading}>
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
