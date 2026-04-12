import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router'
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
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import PageHeader from '../../components/shared/PageHeader'
import { getUsers, createUser, updateUserRole, deleteUser } from '../../api/users'

const ROLES = ['CONSULTANT', 'LINE_MANAGER', 'FINANCE_MANAGER', 'SYSTEM_ADMIN']
const EMPTY_FORM = { name: '', email: '', password: '', role: 'CONSULTANT' }

function getRoleLabel(role) {
  return role.replace(/_/g, ' ')
}

export default function UserManagementPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [searchParams] = useSearchParams()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [pendingRoles, setPendingRoles] = useState({})

  const [roleFilter, setRoleFilter] = useState(searchParams.get('role') || 'ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('nameAsc')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState({ id: null, name: '' })

  useEffect(() => {
    setRoleFilter(searchParams.get('role') || 'ALL')
  }, [searchParams])

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

  function openDeleteDialog(userId, userName) {
    setDeleteTarget({ id: userId, name: userName })
    setDeleteDialogOpen(true)
  }

  function closeDeleteDialog() {
    setDeleteDialogOpen(false)
    setDeleteTarget({ id: null, name: '' })
  }

  async function confirmDelete() {
    if (!deleteTarget.id) return
    try {
      await deleteUser(deleteTarget.id)
      closeDeleteDialog()
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

  const normalizedQuery = searchQuery.trim().toLowerCase()

  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter
    const matchesSearch =
      normalizedQuery.length === 0 ||
      u.name.toLowerCase().includes(normalizedQuery) ||
      u.email.toLowerCase().includes(normalizedQuery)

    return matchesRole && matchesSearch
  })

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (sortBy === 'nameAsc') {
      return a.name.localeCompare(b.name)
    }
    if (sortBy === 'nameDesc') {
      return b.name.localeCompare(a.name)
    }
    if (sortBy === 'roleAsc') {
      return a.role.localeCompare(b.role)
    }
    if (sortBy === 'roleDesc') {
      return b.role.localeCompare(a.role)
    }
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
            {sortedUsers.map((u) => {
              const currentRole = pendingRoles[u.id] ?? u.role
              const isDirty = pendingRoles[u.id] !== undefined && pendingRoles[u.id] !== u.role

              return (
                <Paper key={u.id} sx={{ p: 2.5 }}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                        {u.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
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
                            {getRoleLabel(r)}
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
                        onClick={() => openDeleteDialog(u.id, u.name)}
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
              {sortedUsers.map((u) => {
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
                      <Typography variant="body2" color="text.secondary">
                        {u.email}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Select
                          size="small"
                          value={currentRole}
                          onChange={(e) => handleRoleSelectChange(u.id, e.target.value)}
                          sx={{ minWidth: 180, fontSize: '0.85rem' }}
                        >
                          {ROLES.map((r) => (
                            <MenuItem key={r} value={r}>
                              {getRoleLabel(r)}
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
                          onClick={() => openDeleteDialog(u.id, u.name)}
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

      <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {deleteTarget.name ? `"${deleteTarget.name}"` : 'this user'}?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
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
            {ROLES.map((r) => (
              <MenuItem key={r} value={r}>
                {getRoleLabel(r)}
              </MenuItem>
            ))}
          </Select>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeDialog} disabled={formLoading}>
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