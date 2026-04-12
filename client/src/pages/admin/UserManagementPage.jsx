import { useState, useEffect } from 'react'
import { useLoaderData, useRevalidator, useSearchParams } from 'react-router'
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
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import InputAdornment from '@mui/material/InputAdornment'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import SaveIcon from '@mui/icons-material/Save'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import PageHeader from '../../components/shared/PageHeader'
import { useConfirmation } from '../../context/useConfirmation.js'
import { useUnsavedChangesGuard } from '../../context/useUnsavedChanges.js'
import { createUser, updateUserRole, deleteUser } from '../../api/users'

const ROLES = ['CONSULTANT', 'LINE_MANAGER', 'FINANCE_MANAGER', 'SYSTEM_ADMIN']
const SENSITIVE_ROLES = new Set(['FINANCE_MANAGER', 'SYSTEM_ADMIN'])
const EMPTY_FORM = { name: '', email: '', password: '', role: 'CONSULTANT' }

function getRoleLabel(role) {
  return role.replace(/_/g, ' ')
}

export default function UserManagementPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const revalidator = useRevalidator()
  const { users: loadedUsers, error: loadError } = useLoaderData()
  const [searchParams] = useSearchParams()

  const [users, setUsers] = useState(loadedUsers)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState(loadError)
  const [pendingRoles, setPendingRoles] = useState({})
  const [roleFilter, setRoleFilter] = useState(searchParams.get('role') || 'ALL')
  const [sortBy, setSortBy] = useState('nameAsc')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  const { confirm } = useConfirmation()
  const isCreateDialogDirty =
    dialogOpen &&
    (Boolean(form.name) ||
      Boolean(form.email) ||
      Boolean(form.password) ||
      form.role !== EMPTY_FORM.role)

  useUnsavedChangesGuard({
    isDirty: isCreateDialogDirty,
    title: 'Discard this new user draft?',
    message: 'The create-user form has unsaved values. Leaving now will discard them.',
    variant: 'warning',
    discardLabel: 'Discard user draft',
    stayLabel: 'Keep editing',
  })

  useEffect(() => {
    setUsers(loadedUsers)
    setError(loadError)
  }, [loadedUsers, loadError])

  useEffect(() => {
    setRoleFilter(searchParams.get('role') || 'ALL')
  }, [searchParams])

  function handleRoleSelectChange(userId, role) {
    setPendingRoles((prev) => ({ ...prev, [userId]: role }))
  }

  async function handleSaveRole(userId) {
    const role = pendingRoles[userId]
    if (!role) return

    const user = users.find((item) => item.id === userId)
    const currentRole = user?.role ?? null
    const needsConfirmation =
      currentRole !== role &&
      (SENSITIVE_ROLES.has(currentRole) || SENSITIVE_ROLES.has(role))

    if (needsConfirmation) {
      const result = await confirm({
        variant: 'warning',
        title: 'Confirm sensitive role change',
        message: 'This role change affects elevated access in the system.',
        confirmLabel: 'Save role change',
        cancelLabel: 'Keep current role',
        summaryItems: [
          { key: 'user', label: 'User', value: user?.name ?? 'Unknown user' },
          {
            key: 'from',
            label: 'Current role',
            value: currentRole?.replace(/_/g, ' ') ?? '-',
          },
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
      setError('')
      revalidator.revalidate()
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
      setError('')
      revalidator.revalidate()
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
      setError('')
      revalidator.revalidate()
    } catch (err) {
      setFormError(err.message || 'Failed to create user.')
    } finally {
      setFormLoading(false)
    }
  }

  const normalizedQuery = searchQuery.trim().toLowerCase()

  const filteredUsers = users.filter((user) => {
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter
    const matchesSearch =
      normalizedQuery.length === 0 ||
      (user.name || '').toLowerCase().includes(normalizedQuery) ||
      (user.email || '').toLowerCase().includes(normalizedQuery)

    return matchesRole && matchesSearch
  })

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (sortBy === 'nameAsc') return a.name.localeCompare(b.name)
    if (sortBy === 'nameDesc') return b.name.localeCompare(a.name)
    if (sortBy === 'roleAsc') return a.role.localeCompare(b.role)
    if (sortBy === 'roleDesc') return b.role.localeCompare(a.role)
    return 0
  })

  let emptyMessage = 'No users found.'
  if (roleFilter !== 'ALL' && normalizedQuery) {
    emptyMessage = `No users found for "${searchQuery.trim()}" with role "${getRoleLabel(roleFilter)}".`
  } else if (roleFilter !== 'ALL') {
    emptyMessage = `No users found with role "${getRoleLabel(roleFilter)}".`
  } else if (normalizedQuery) {
    emptyMessage = `No users found for "${searchQuery.trim()}".`
  }

  return (
    <Box>
      <PageHeader title="User Management" subtitle="Create, manage, and assign roles to users">
        <TextField
          placeholder="Search users..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ minWidth: { sm: 220 } }}
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

        <FormControl size="small" sx={{ minWidth: 170 }}>
          <InputLabel id="user-role-filter-label">Role</InputLabel>
          <Select
            labelId="user-role-filter-label"
            value={roleFilter}
            label="Role"
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <MenuItem value="ALL">All</MenuItem>
            {ROLES.map((role) => (
              <MenuItem key={role} value={role}>
                {getRoleLabel(role)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 170 }}>
          <InputLabel id="user-sort-label">Sort</InputLabel>
          <Select
            labelId="user-sort-label"
            value={sortBy}
            label="Sort"
            onChange={(e) => setSortBy(e.target.value)}
          >
            <MenuItem value="nameAsc">Name (A → Z)</MenuItem>
            <MenuItem value="nameDesc">Name (Z → A)</MenuItem>
            <MenuItem value="roleAsc">Role (A → Z)</MenuItem>
            <MenuItem value="roleDesc">Role (Z → A)</MenuItem>
          </Select>
        </FormControl>

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
        sortedUsers.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', borderStyle: 'dashed' }}>
            <Typography variant="body2" color="text.secondary">
              {emptyMessage}
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={1.5}>
            {sortedUsers.map((user) => {
              const currentRole = pendingRoles[user.id] ?? user.role
              const isDirty =
                pendingRoles[user.id] !== undefined && pendingRoles[user.id] !== user.role

              return (
                <Paper key={user.id} sx={{ p: 2.5 }}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                        {user.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {user.email}
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
                        onChange={(e) => handleRoleSelectChange(user.id, e.target.value)}
                      >
                        {ROLES.map((role) => (
                          <MenuItem key={role} value={role}>
                            {getRoleLabel(role)}
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
                        onClick={() => handleSaveRole(user.id)}
                      >
                        Save Role
                      </Button>
                      <Button
                        fullWidth
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => {
                          void handleDeleteUser(user.id, user.name)
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
              {sortedUsers.map((user) => {
                const currentRole = pendingRoles[user.id] ?? user.role
                const isDirty =
                  pendingRoles[user.id] !== undefined && pendingRoles[user.id] !== user.role

                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {user.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {user.email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Select
                          size="small"
                          value={currentRole}
                          onChange={(e) => handleRoleSelectChange(user.id, e.target.value)}
                          sx={{ minWidth: 180, fontSize: '0.85rem' }}
                        >
                          {ROLES.map((role) => (
                            <MenuItem key={role} value={role}>
                              {getRoleLabel(role)}
                            </MenuItem>
                          ))}
                        </Select>

                        <Tooltip title="Save role">
                          <span>
                            <IconButton
                              size="small"
                              color="primary"
                              disabled={!isDirty}
                              onClick={() => handleSaveRole(user.id)}
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
                            void handleDeleteUser(user.id, user.name)
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                )
              })}

              {sortedUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={dialogOpen}
        onClose={
          formLoading
            ? undefined
            : () => {
                void attemptCloseDialog()
              }
        }
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
            displayEmpty
          >
            {ROLES.map((role) => (
              <MenuItem key={role} value={role}>
                {getRoleLabel(role)}
              </MenuItem>
            ))}
          </Select>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              void attemptCloseDialog()
            }}
            disabled={formLoading}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={handleCreateUser} disabled={formLoading}>
            {formLoading ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
