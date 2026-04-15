import { useId } from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
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
  const titleId = useId()

  return (
    <Dialog
      open={open}
      onClose={formLoading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      fullScreen={isMobile}
      aria-labelledby={titleId}
    >
      <DialogTitle id={titleId}>Create User</DialogTitle>
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
        <FormControl fullWidth>
          <InputLabel id="create-user-role-label">Role</InputLabel>
          <Select
            labelId="create-user-role-label"
            label="Role"
            value={form.role}
            onChange={(e) => onFieldChange('role', e.target.value)}
            fullWidth
          >
            {roles.map((role) => (
              <MenuItem key={role} value={role}>
                {getRoleLabel(role)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
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
