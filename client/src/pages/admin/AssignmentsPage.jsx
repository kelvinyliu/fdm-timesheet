import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
import Alert from '@mui/material/Alert'
import Tooltip from '@mui/material/Tooltip'
import Grid from '@mui/material/Grid'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import PageHeader from '../../components/shared/PageHeader'
import {
  getAllAssignments,
  createAssignment,
  deleteAssignment,
  getManagerAssignments,
  createManagerAssignment,
  deleteManagerAssignment,
} from '../../api/assignments'
import { getUsers } from '../../api/users'

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

const EMPTY_CLIENT_FORM = { consultantId: '', clientName: '', hourlyRate: '' }
const EMPTY_MANAGER_FORM = { managerId: '', consultantId: '' }

export default function AssignmentsPage() {
  const [users, setUsers] = useState([])

  const [clientAssignments, setClientAssignments] = useState([])
  const [clientLoading, setClientLoading] = useState(true)
  const [clientError, setClientError] = useState('')

  const [managerAssignments, setManagerAssignments] = useState([])
  const [managerLoading, setManagerLoading] = useState(true)
  const [managerError, setManagerError] = useState('')

  const [clientDialogOpen, setClientDialogOpen] = useState(false)
  const [clientForm, setClientForm] = useState(EMPTY_CLIENT_FORM)
  const [clientFormError, setClientFormError] = useState('')
  const [clientFormLoading, setClientFormLoading] = useState(false)

  const [managerDialogOpen, setManagerDialogOpen] = useState(false)
  const [managerForm, setManagerForm] = useState(EMPTY_MANAGER_FORM)
  const [managerFormError, setManagerFormError] = useState('')
  const [managerFormLoading, setManagerFormLoading] = useState(false)

  const consultants = users.filter((u) => u.role === 'CONSULTANT')
  const managers = users.filter((u) => u.role === 'LINE_MANAGER')

  async function fetchClientAssignments() {
    setClientLoading(true)
    setClientError('')
    try {
      const data = await getAllAssignments()
      setClientAssignments(data)
    } catch (err) {
      setClientError(err.message || 'Failed to load client assignments.')
    } finally {
      setClientLoading(false)
    }
  }

  async function fetchManagerAssignments() {
    setManagerLoading(true)
    setManagerError('')
    try {
      const data = await getManagerAssignments()
      setManagerAssignments(data)
    } catch (err) {
      setManagerError(err.message || 'Failed to load manager assignments.')
    } finally {
      setManagerLoading(false)
    }
  }

  useEffect(() => {
    fetchClientAssignments()
    fetchManagerAssignments()
    getUsers().then(setUsers).catch(() => {})
  }, [])

  async function handleDeleteClientAssignment(id) {
    if (!window.confirm('Remove this client assignment?')) return
    try {
      await deleteAssignment(id)
      await fetchClientAssignments()
    } catch (err) {
      setClientError(err.message || 'Failed to delete assignment.')
    }
  }

  function openClientDialog() {
    setClientForm(EMPTY_CLIENT_FORM)
    setClientFormError('')
    setClientDialogOpen(true)
  }

  async function handleCreateClientAssignment() {
    setClientFormError('')
    const { consultantId, clientName, hourlyRate } = clientForm
    const parsedHourlyRate = Number(hourlyRate)

    if (!consultantId || !clientName || !hourlyRate) {
      setClientFormError('Consultant, Client Name, and Hourly Rate are required.')
      return
    }

    if (!Number.isFinite(parsedHourlyRate) || parsedHourlyRate <= 0) {
      setClientFormError('Hourly Rate must be greater than 0.')
      return
    }

    setClientFormLoading(true)
    try {
      await createAssignment({ consultantId, clientName, hourlyRate: parsedHourlyRate })
      setClientDialogOpen(false)
      await fetchClientAssignments()
    } catch (err) {
      setClientFormError(err.message || 'Failed to create assignment.')
    } finally {
      setClientFormLoading(false)
    }
  }

  async function handleDeleteManagerAssignment(id) {
    if (!window.confirm('Remove this manager assignment?')) return
    try {
      await deleteManagerAssignment(id)
      await fetchManagerAssignments()
    } catch (err) {
      setManagerError(err.message || 'Failed to delete assignment.')
    }
  }

  function openManagerDialog() {
    setManagerForm(EMPTY_MANAGER_FORM)
    setManagerFormError('')
    setManagerDialogOpen(true)
  }

  async function handleCreateManagerAssignment() {
    setManagerFormError('')
    const { managerId, consultantId } = managerForm
    if (!managerId || !consultantId) {
      setManagerFormError('Both Manager and Consultant are required.')
      return
    }
    setManagerFormLoading(true)
    try {
      await createManagerAssignment({ managerId, consultantId })
      setManagerDialogOpen(false)
      await fetchManagerAssignments()
    } catch (err) {
      setManagerFormError(err.message || 'Failed to create assignment.')
    } finally {
      setManagerFormLoading(false)
    }
  }

  return (
    <Box>
      <PageHeader
        title="Assignments"
        subtitle="Manage client and manager-consultant assignments"
      />

      <Grid container spacing={4}>
        {/* Client Assignments */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Client Assignments
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={openClientDialog}
            >
              Add
            </Button>
          </Box>

          {clientError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setClientError('')}>
              {clientError}
            </Alert>
          )}

          {clientLoading ? (
            <LoadingSpinner />
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Consultant</TableCell>
                    <TableCell>Client Name</TableCell>
                    <TableCell>Hourly Rate</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {clientAssignments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {users.find((u) => u.id === a.consultantId)?.name ?? a.consultantId}
                        </Typography>
                      </TableCell>
                      <TableCell>{a.clientName}</TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.78rem' }}
                        >
                          {formatCurrency(a.hourlyRate)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.78rem' }}
                        >
                          {formatDate(a.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Remove assignment">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteClientAssignment(a.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {clientAssignments.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        align="center"
                        sx={{ py: 4, color: 'text.secondary' }}
                      >
                        No client assignments found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Grid>

        {/* Manager Assignments */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Manager Assignments
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={openManagerDialog}
            >
              Add
            </Button>
          </Box>

          {managerError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setManagerError('')}>
              {managerError}
            </Alert>
          )}

          {managerLoading ? (
            <LoadingSpinner />
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Manager</TableCell>
                    <TableCell>Consultant</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {managerAssignments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {a.managerName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {a.consultantName}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Remove assignment">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteManagerAssignment(a.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {managerAssignments.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        align="center"
                        sx={{ py: 4, color: 'text.secondary' }}
                      >
                        No manager assignments found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Grid>
      </Grid>

      {/* Add Client Assignment Dialog */}
      <Dialog
        open={clientDialogOpen}
        onClose={() => setClientDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Add Client Assignment</DialogTitle>
        <DialogContent>
          {clientFormError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {clientFormError}
            </Alert>
          )}
          <FormControl fullWidth required sx={{ mt: 1, mb: 2 }}>
            <InputLabel>Consultant</InputLabel>
            <Select
              value={clientForm.consultantId}
              label="Consultant"
              onChange={(e) => setClientForm((p) => ({ ...p, consultantId: e.target.value }))}
            >
              {consultants.map((u) => (
                <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Client Name"
            value={clientForm.clientName}
            onChange={(e) => setClientForm((p) => ({ ...p, clientName: e.target.value }))}
            fullWidth
            required
            sx={{ mb: 2 }}
          />
          <TextField
            label="Hourly Rate"
            type="number"
            value={clientForm.hourlyRate}
            onChange={(e) => setClientForm((p) => ({ ...p, hourlyRate: e.target.value }))}
            fullWidth
            required
            sx={{ mb: 2 }}
            inputProps={{ min: '0.01', step: '0.01' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClientDialogOpen(false)} disabled={clientFormLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateClientAssignment}
            disabled={clientFormLoading}
          >
            {clientFormLoading ? 'Adding...' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Manager Assignment Dialog */}
      <Dialog
        open={managerDialogOpen}
        onClose={() => setManagerDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Add Manager Assignment</DialogTitle>
        <DialogContent>
          {managerFormError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {managerFormError}
            </Alert>
          )}
          <FormControl fullWidth required sx={{ mt: 1, mb: 2 }}>
            <InputLabel>Manager</InputLabel>
            <Select
              value={managerForm.managerId}
              label="Manager"
              onChange={(e) => setManagerForm((p) => ({ ...p, managerId: e.target.value }))}
            >
              {managers.map((u) => (
                <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth required>
            <InputLabel>Consultant</InputLabel>
            <Select
              value={managerForm.consultantId}
              label="Consultant"
              onChange={(e) => setManagerForm((p) => ({ ...p, consultantId: e.target.value }))}
            >
              {consultants.map((u) => (
                <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManagerDialogOpen(false)} disabled={managerFormLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateManagerAssignment}
            disabled={managerFormLoading}
          >
            {managerFormLoading ? 'Adding...' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
