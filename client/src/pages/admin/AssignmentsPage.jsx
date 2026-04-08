import { useState, useEffect, useMemo } from 'react'
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
import InputAdornment from '@mui/material/InputAdornment'
import Autocomplete from '@mui/material/Autocomplete'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Alert from '@mui/material/Alert'
import Tooltip from '@mui/material/Tooltip'
import Stack from '@mui/material/Stack'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
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
import { getConsultantDisplayLabel } from '../../utils/displayLabels'
import { formatDate } from '../../utils/dateFormatters'

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
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [users, setUsers] = useState([])

  const [activeTab, setActiveTab] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState({ id: null, type: null })

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

  const filteredClientAssignments = useMemo(() => {
    return clientAssignments.filter((a) => {
      const q = searchQuery.toLowerCase()
      const consultantName = getConsultantDisplayLabel(
        users.find((u) => u.id === a.consultantId)?.name ?? null
      ).toLowerCase()
      return a.clientName.toLowerCase().includes(q) || consultantName.includes(q)
    })
  }, [clientAssignments, searchQuery, users])

  const filteredManagerAssignments = useMemo(() => {
    return managerAssignments.filter((a) => {
      const q = searchQuery.toLowerCase()
      return (
        a.managerName.toLowerCase().includes(q) ||
        a.consultantName.toLowerCase().includes(q)
      )
    })
  }, [managerAssignments, searchQuery])

  function handleDeleteClientAssignment(id) {
    setDeleteTarget({ id, type: 'client' })
    setDeleteDialogOpen(true)
  }

  function handleDeleteManagerAssignment(id) {
    setDeleteTarget({ id, type: 'manager' })
    setDeleteDialogOpen(true)
  }

  async function confirmDeletion() {
    if (!deleteTarget.id || !deleteTarget.type) return

    try {
      if (deleteTarget.type === 'client') {
        await deleteAssignment(deleteTarget.id)
        await fetchClientAssignments()
      } else {
        await deleteManagerAssignment(deleteTarget.id)
        await fetchManagerAssignments()
      }
      setDeleteDialogOpen(false)
    } catch (err) {
      if (deleteTarget.type === 'client') {
        setClientError(err.message || 'Failed to delete assignment.')
      } else {
        setManagerError(err.message || 'Failed to delete assignment.')
      }
      setDeleteDialogOpen(false)
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

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Client Assignments" />
          <Tab label="Manager Assignments" />
        </Tabs>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          placeholder="Search assignments..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ minWidth: 250, flexGrow: { xs: 1, sm: 0 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <Box sx={{ flexGrow: 1 }} />
        {activeTab === 0 ? (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openClientDialog}
          >
            Add Client Assignment
          </Button>
        ) : (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openManagerDialog}
          >
            Add Manager Assignment
          </Button>
        )}
      </Box>

      {/* Client Assignments Tab */}
      {activeTab === 0 && (
        <Box>
          {clientError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setClientError('')}>
              {clientError}
            </Alert>
          )}

          {clientLoading ? (
            <LoadingSpinner />
          ) : isMobile ? (
            filteredClientAssignments.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center', borderStyle: 'dashed' }}>
                <Typography variant="body2" color="text.secondary">
                  No client assignments found.
                </Typography>
              </Paper>
            ) : (
              <Stack spacing={1.5}>
                {filteredClientAssignments.map((a) => (
                  <Paper key={a.id} sx={{ p: 2.5 }}>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                          Consultant
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {getConsultantDisplayLabel(
                            users.find((u) => u.id === a.consultantId)?.name ?? null
                          )}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '0.72rem',
                            color: 'text.secondary',
                            mt: 0.5,
                          }}
                        >
                          {a.consultantId}
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                          gap: 1.5,
                        }}
                      >
                        <Box>
                          <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                            Client
                          </Typography>
                          <Typography variant="body2">{a.clientName}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                            Hourly Rate
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.78rem' }}
                          >
                            {formatCurrency(a.hourlyRate)}
                          </Typography>
                        </Box>
                      </Box>

                      <Box>
                        <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                          Created
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.78rem' }}
                        >
                          {formatDate(a.createdAt)}
                        </Typography>
                      </Box>

                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDeleteClientAssignment(a.id)}
                      >
                        Remove Assignment
                      </Button>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )
          ) : (
            <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
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
                  {filteredClientAssignments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {getConsultantDisplayLabel(
                              users.find((u) => u.id === a.consultantId)?.name ?? null
                            )}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: '0.68rem',
                              color: 'text.secondary',
                            }}
                          >
                            {a.consultantId}
                          </Typography>
                        </Box>
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
                  {filteredClientAssignments.length === 0 && (
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
        </Box>
      )}

      {/* Manager Assignments Tab */}
      {activeTab === 1 && (
        <Box>
          {managerError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setManagerError('')}>
              {managerError}
            </Alert>
          )}

          {managerLoading ? (
            <LoadingSpinner />
          ) : isMobile ? (
            filteredManagerAssignments.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center', borderStyle: 'dashed' }}>
                <Typography variant="body2" color="text.secondary">
                  No manager assignments found.
                </Typography>
              </Paper>
            ) : (
              <Stack spacing={1.5}>
                {filteredManagerAssignments.map((a) => (
                  <Paper key={a.id} sx={{ p: 2.5 }}>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                          Manager
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {a.managerName}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                          Consultant
                        </Typography>
                        <Typography variant="body2">{a.consultantName}</Typography>
                      </Box>

                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDeleteManagerAssignment(a.id)}
                      >
                        Remove Assignment
                      </Button>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )
          ) : (
            <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Manager</TableCell>
                    <TableCell>Consultant</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredManagerAssignments.map((a) => (
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
                  {filteredManagerAssignments.length === 0 && (
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
        </Box>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove this assignment? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmDeletion}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Client Assignment Dialog */}
      <Dialog
        open={clientDialogOpen}
        onClose={() => setClientDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>Add Client Assignment</DialogTitle>
        <DialogContent>
          {clientFormError && (
            <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
              {clientFormError}
            </Alert>
          )}
          <Box sx={{ mt: 1, mb: 2 }}>
            <Autocomplete
              options={consultants}
              getOptionLabel={(option) => option.name || ''}
              value={consultants.find((u) => u.id === clientForm.consultantId) || null}
              onChange={(e, newValue) => {
                setClientForm((p) => ({ ...p, consultantId: newValue ? newValue.id : '' }))
              }}
              renderInput={(params) => (
                <TextField {...params} label="Consultant" required />
              )}
            />
          </Box>
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
        fullScreen={isMobile}
      >
        <DialogTitle>Add Manager Assignment</DialogTitle>
        <DialogContent>
          {managerFormError && (
            <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
              {managerFormError}
            </Alert>
          )}
          <Box sx={{ mt: 1, mb: 2 }}>
            <Autocomplete
              options={managers}
              getOptionLabel={(option) => option.name || ''}
              value={managers.find((u) => u.id === managerForm.managerId) || null}
              onChange={(e, newValue) => {
                setManagerForm((p) => ({ ...p, managerId: newValue ? newValue.id : '' }))
              }}
              renderInput={(params) => (
                <TextField {...params} label="Manager" required />
              )}
            />
          </Box>
          <Box sx={{ mb: 2 }}>
            <Autocomplete
              options={consultants}
              getOptionLabel={(option) => option.name || ''}
              value={consultants.find((u) => u.id === managerForm.consultantId) || null}
              onChange={(e, newValue) => {
                setManagerForm((p) => ({ ...p, consultantId: newValue ? newValue.id : '' }))
              }}
              renderInput={(params) => (
                <TextField {...params} label="Consultant" required />
              )}
            />
          </Box>
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
