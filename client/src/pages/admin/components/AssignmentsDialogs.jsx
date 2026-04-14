import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import Alert from '@mui/material/Alert'

export function ClientAssignmentDialog({
  open,
  form,
  submitters,
  isMobile,
  error,
  loading,
  onClose,
  onChange,
  onSubmit,
}) {
  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle>Add Client Assignment</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mt: 1, mb: 2 }}>
          <Autocomplete
            options={submitters}
            getOptionLabel={(option) => option.name || ''}
            value={submitters.find((user) => user.id === form.consultantId) || null}
            onChange={(_, newValue) => onChange('consultantId', newValue ? newValue.id : '')}
            renderInput={(params) => <TextField {...params} label=""Employee"" required />}
          />
        </Box>
        <TextField
          label="Client Name"
          value={form.clientName}
          onChange={(e) => onChange('clientName', e.target.value)}
          fullWidth
          required
          sx={{ mb: 2 }}
        />
        <TextField
          label="Client Bill Rate"
          type="number"
          value={form.clientBillRate}
          onChange={(e) => onChange('clientBillRate', e.target.value)}
          fullWidth
          required
          sx={{ mb: 2 }}
          slotProps={{ htmlInput: { min: '0.01', step: '0.01' } }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={onSubmit} disabled={loading}>
          {loading ? 'Adding...' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export function ManagerAssignmentDialog({
  open,
  mode,
  form,
  managers,
  submitters,
  isMobile,
  error,
  loading,
  onClose,
  onChange,
  onSubmit,
}) {
  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle>
        {mode === 'edit' ? 'Edit Manager Assignment' : 'Add Manager Assignment'}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ mt: 1, mb: 2 }}>
          <Autocomplete
            options={managers}
            getOptionLabel={(option) => option.name || ''}
            value={managers.find((user) => user.id === form.managerId) || null}
            onChange={(_, newValue) => onChange('managerId', newValue ? newValue.id : '')}
            renderInput={(params) => <TextField {...params} label="Manager" required />}
          />
        </Box>
        <Box sx={{ mb: 2 }}>
          <Autocomplete
            options={submitters}
            getOptionLabel={(option) => option.name || ''}
            value={submitters.find((user) => user.id === form.consultantId) || null}
            onChange={(_, newValue) => onChange('consultantId', newValue ? newValue.id : '')}
            renderInput={(params) => <TextField {...params} label=""Employee"" required />}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={onSubmit} disabled={loading}>
          {loading
            ? mode === 'edit'
              ? 'Saving...'
              : 'Adding...'
            : mode === 'edit'
              ? 'Save'
              : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
