import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'

export default function CreateUserDialog({
  open,
  form,
  roles,
  getRoleLabel,
  isMobile,
  formError,
  formLoading,
  onClose,
  onFieldChange,
  onSubmit,
}) {
  return (
    <Dialog
      open={open}
      onClose={formLoading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle>Create User</DialogTitle>
      <DialogContent>
        {formError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {formError}
          </Alert>
        )}

        <TextField
          label="Name"
          value={form.name}
          onChange={(e) => onFieldChange('name', e.target.value)}
          fullWidth
          required
          sx={{ mt: 1, mb: 2 }}
        />
        <TextField
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => onFieldChange('email', e.target.value)}
          fullWidth
          required
          sx={{ mb: 2 }}
        />
        <TextField
          label="Password"
          type="password"
          value={form.password}
          onChange={(e) => onFieldChange('password', e.target.value)}
          fullWidth
          required
          sx={{ mb: 2 }}
        />
        <Select
          value={form.role}
          onChange={(e) => onFieldChange('role', e.target.value)}
          fullWidth
          displayEmpty
        >
          {roles.map((role) => (
            <MenuItem key={role} value={role}>
              {getRoleLabel(role)}
            </MenuItem>
          ))}
        </Select>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={formLoading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={onSubmit} disabled={formLoading}>
          {formLoading ? 'Creating...' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
