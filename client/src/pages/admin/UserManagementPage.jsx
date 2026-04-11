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
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import Tooltip from '@mui/material/Tooltip'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import SaveIcon from '@mui/icons-material/Save'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import InputAdornment from '@mui/material/InputAdornment'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import PageHeader from '../../components/shared/PageHeader'
import { useConfirmation } from '../../context/useConfirmation.js'
import { useUnsavedChangesGuard } from '../../context/useUnsavedChanges.js'
import { getUsers, createUser, updateUserRole, deleteUser } from '../../api/users'

const ROLES = ['CONSULTANT', 'LINE_MANAGER', 'FINANCE_MANAGER', 'SYSTEM_ADMIN']
const SENSITIVE_ROLES = new Set(['FINANCE_MANAGER', 'SYSTEM_ADMIN'])

const EMPTY_FORM = { name: '', email: '', password: '', role: 'CONSULTANT' }

export default function UserManagementPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [users, setUsers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [pendingRoles, setPendingRoles] = useState({})

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const { confirm } = useConfirmation()
  const isCreateDialogDirty = dialogOpen && (
    Boolean(form.name) ||
    Boolean(form.email) ||
    Boolean(form.password) ||
    form.role !== EMPTY_FORM.role
  )

  useUnsavedChangesGuard({
    isDirty: isCreateDialogDirty,
    title: 'Discard this new user draft?',
    message: 'The create-user form has unsaved values. Leaving now will discard them.',
    variant: 'warning',
    discardLabel: 'Discard user draft',
    stayLabel: 'Keep editing',
  })

  async function fetchUsers() {
    setLoading(true)
    setError('')
    try {
      const data = await getUsers()
      setUsers(data)
    } catch (err) {
      setError(err.message || 'Failed to load users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  function handleRoleSelectChange(userId, role) {
    setPendingRoles((prev) => ({ ...prev, [userId]: role }))
  }

  async function handleSaveRole(userId) {
    const role = pendingRoles[userId]
    if (!role) return

    const user = users.find((item) => item.id === userId)
    const currentRole = user?.role ?? null
    const needsConfirmation = currentRole !== role && (
      SENSITIVE_ROLES.has(currentRole) || SENSITIVE_ROLES.has(role)
    )

    if (needsConfirmation) {
      const result = await confirm({
        variant: 'warning',
        title: 'Confirm sensitive role change',
        message: 'This role change affects elevated access in the system.',
        confirmLabel: 'Save role change',
        cancelLabel: 'Keep current role',
        summaryItems: [
          { key: 'user', label: 'User', value: user?.name ?? 'Unknown user' },
          { key: 'from', label: 'Current role', value: currentRole?.replace(/_/g, ' ') ?? '-' },
          { key: 'to', label: 'New role', value: role.replace(/_/g, ' ') },
        ],
      })

      if (result !== 'confirm') return
    }

    try {
      await updateUserRole(userId, role)
      setPendingRoles((prev) => {
        const next = { ...prev }
        delete next[userId]
        return next
      })
      await fetchUsers()
    } catch (err) {
      setError(err.message || 'Failed to update role.')
    }
  }

  async function handleDeleteUser(userId, userName) {
    const result = await confirm({
      variant: 'danger',
      title: 'Delete this user?',
      message: 'This action cannot be undone.',
      confirmLabel: 'Delete user',
      cancelLabel: 'Keep user',
      summaryItems: [
        { key: 'user', label: 'User', value: userName ? `"${userName}"` : 'Selected user' },
      ],
    })

    if (result !== 'confirm') return

    try {
      await deleteUser(userId)
      await fetchUsers()
    } catch (err) {
      setError(err.message || 'Failed to delete user.')
    }
  }

  function openDialog() {
    setForm(EMPTY_FORM)
    setFormError('')
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
  }

  async function attemptCloseDialog() {
    if (!isCreateDialogDirty || formLoading) {
      closeDialog()
      return
    }

    const result = await confirm({
      variant: 'warning',
      title: 'Discard this new user draft?',
      message: 'The create-user form has unsaved values. Closing it now will discard them.',
      confirmLabel: 'Discard draft',
      cancelLabel: 'Keep editing',
    })

    if (result === 'confirm') {
      closeDialog()
    }
  }

  function handleFormChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleCreateUser() {
    setFormError('')
    if (!form.name || !form.email || !form.password || !form.role) {
      setFormError('All fields are required.')
      return
    }
    setFormLoading(true)
    try {
      await createUser(form)
      closeDialog()
      await fetchUsers()
    } catch (err) {
      setFormError(err.message || 'Failed to create user.')
    } finally {
      setFormLoading(false)
    }
  }

  if (loading) return <LoadingSpinner />

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase()
    return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
  })

  return (
    <Box>
      <PageHeader title="User Management" subtitle="Create, manage, and assign roles to users">
        <TextField
          placeholder="Search users..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ minWidth: { sm: 240 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <Button variant="contained" startIcon={<AddIcon />} onClick={openDialog}>
          Create User
        </Button>
      </PageHeader>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {isMobile ? (
        filteredUsers.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', borderStyle: 'dashed' }}>
            <Typography variant="body2" color="text.secondary">
              No users found.
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={1.5}>
            {filteredUsers.map((u) => {
              const currentRole = pendingRoles[u.id] ?? u.role
              const isDirty = pendingRoles[u.id] !== undefined && pendingRoles[u.id] !== u.role
              return (
                <Paper key={u.id} sx={{ p: 2.5 }}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                        {u.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.78rem',
                          color: 'text.secondary',
                        }}
                      >
                        {u.email}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="caption" sx={{ display: 'block', mb: 0.75 }}>
                        Role
                      </Typography>
                      <Select
                        size="small"
                        fullWidth
                        value={currentRole}
                        onChange={(e) => handleRoleSelectChange(u.id, e.target.value)}
                      >
                        {ROLES.map((r) => (
                          <MenuItem key={r} value={r}>
                            {r.replace(/_/g, ' ')}
                          </MenuItem>
                        ))}
                      </Select>
                    </Box>

                    <Stack direction="row" spacing={1.5}>
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<SaveIcon />}
                        disabled={!isDirty}
                        onClick={() => handleSaveRole(u.id)}
                      >
                        Save Role
                      </Button>
                      <Button
                        fullWidth
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => {
                          void handleDeleteUser(u.id, u.name)
                        }}
                      >
                        Delete
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              )
            })}
          </Stack>
        )
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((u) => {
                const currentRole = pendingRoles[u.id] ?? u.role
                const isDirty = pendingRoles[u.id] !== undefined && pendingRoles[u.id] !== u.role
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {u.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.8rem',
                        }}
                      >
                        {u.email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Select
                          size="small"
                          value={currentRole}
                          onChange={(e) => handleRoleSelectChange(u.id, e.target.value)}
                          sx={{ minWidth: 160, fontSize: '0.8rem' }}
                        >
                          {ROLES.map((r) => (
                            <MenuItem key={r} value={r}>
                              {r.replace(/_/g, ' ')}
                            </MenuItem>
                          ))}
                        </Select>
                        <Tooltip title="Save role">
                          <span>
                            <IconButton
                              size="small"
                              color="primary"
                              disabled={!isDirty}
                              onClick={() => handleSaveRole(u.id)}
                            >
                              <SaveIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Delete user">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            void handleDeleteUser(u.id, u.name)
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                )
              })}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create User Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={formLoading ? undefined : () => {
          void attemptCloseDialog()
        }}
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
            onChange={(e) => handleFormChange('name', e.target.value)}
            fullWidth
            required
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => handleFormChange('email', e.target.value)}
            fullWidth
            required
            sx={{ mb: 2 }}
          />
          <TextField
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => handleFormChange('password', e.target.value)}
            fullWidth
            required
            sx={{ mb: 2 }}
          />
          <Select
            value={form.role}
            onChange={(e) => handleFormChange('role', e.target.value)}
            fullWidth
            size="medium"
            displayEmpty
          >
            {ROLES.map((r) => (
              <MenuItem key={r} value={r}>
                {r.replace(/_/g, ' ')}
              </MenuItem>
            ))}
          </Select>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            void attemptCloseDialog()
          }} disabled={formLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateUser}
            disabled={formLoading}
          >
            {formLoading ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
