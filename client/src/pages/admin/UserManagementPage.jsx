import { useState } from 'react'
import { useLoaderData, useRevalidator } from 'react-router'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import InputAdornment from '@mui/material/InputAdornment'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import Snackbar from '@mui/material/Snackbar'
import Button from '@mui/material/Button'
import PageHeader from '../../components/shared/PageHeader'
import { useConfirmation } from '../../context/useConfirmation.js'
import { useUnsavedChangesGuard } from '../../context/useUnsavedChanges.js'
import { createUser, updateUserRole, deleteUser } from '../../api/users'
import CreateUserDialog from './components/CreateUserDialog.jsx'
import UserList from './components/UserList.jsx'
import { useSyncedErrorState } from './hooks/useSyncedErrorState.js'
import { attemptCloseAdminDialog } from './utils/adminDialogs.js'
import { executeAdminMutation } from './utils/adminMutations.js'

const ROLES = ['CONSULTANT', 'LINE_MANAGER', 'FINANCE_MANAGER', 'SYSTEM_ADMIN']
const SENSITIVE_ROLES = new Set(['FINANCE_MANAGER', 'SYSTEM_ADMIN'])
const EMPTY_FORM = { name: '', email: '', password: '', role: 'CONSULTANT' }

function getRoleLabel(role) {
  return role.replace(/_/g, ' ')
}

function getRoleFilterFromUrl() {
  const role = new URLSearchParams(window.location.search).get('role')
  return ROLES.includes(role) ? role : 'ALL'
}

function replaceRoleFilterInUrl(nextRole) {
  const nextUrl = new URL(window.location.href)

  if (nextRole === 'ALL') {
    nextUrl.searchParams.delete('role')
  } else {
    nextUrl.searchParams.set('role', nextRole)
  }

  window.history.replaceState(
    window.history.state,
    '',
    `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`
  )
}

export default function UserManagementPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const revalidator = useRevalidator()
  const { users, error: loadError } = useLoaderData()
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState(getRoleFilterFromUrl)
  const [error, setError] = useSyncedErrorState(loadError)
  const [pendingRoles, setPendingRoles] = useState({})
  const [sortBy, setSortBy] = useState('nameAsc')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [feedback, setFeedback] = useState(null)
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

  function handleRoleFilterChange(nextRole) {
    setRoleFilter(nextRole)
    replaceRoleFilterInUrl(nextRole)
  }

  function handleRoleSelectChange(userId, role) {
    setPendingRoles((prev) => ({ ...prev, [userId]: role }))
  }

  async function handleSaveRole(userId) {
    const role = pendingRoles[userId]
    if (!role) return

    const user = users.find((item) => item.id === userId)
    const currentRole = user?.role ?? null
    const needsConfirmation =
      currentRole !== role && (SENSITIVE_ROLES.has(currentRole) || SENSITIVE_ROLES.has(role))

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

    await executeAdminMutation({
      mutation: () => updateUserRole(userId, role),
      revalidator,
      onSuccess: () => {
        setPendingRoles((prev) => {
          const next = { ...prev }
          delete next[userId]
          return next
        })
        setError('')
        setFeedback({ severity: 'success', message: 'User role updated successfully.' })
      },
      onError: (err) => setError(err.message || 'Failed to update role.'),
    })
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

    await executeAdminMutation({
      mutation: () => deleteUser(userId),
      revalidator,
      onSuccess: () => setError(''),
      onError: (err) => setError(err.message || 'Failed to delete user.'),
    })
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
    await attemptCloseAdminDialog({
      isDirty: isCreateDialogDirty,
      isBusy: formLoading,
      confirm,
      onClose: closeDialog,
      confirmOptions: {
        variant: 'warning',
        title: 'Discard this new user draft?',
        message: 'The create-user form has unsaved values. Closing it now will discard them.',
        confirmLabel: 'Discard draft',
        cancelLabel: 'Keep editing',
      },
    })
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
    await executeAdminMutation({
      mutation: () => createUser(form),
      revalidator,
      onSuccess: () => {
        closeDialog()
        setError('')
      },
      onError: (err) => setFormError(err.message || 'Failed to create user.'),
    })
    setFormLoading(false)
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
    <>
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
            onChange={(e) => handleRoleFilterChange(e.target.value)}
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

      <Snackbar
        open={Boolean(feedback)}
        autoHideDuration={4000}
        onClose={() => setFeedback(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setFeedback(null)}
          severity={feedback?.severity}
          sx={{ width: '100%', boxShadow: 3 }}
        >
          {feedback?.message}
        </Alert>
      </Snackbar>

      <UserList
        users={sortedUsers}
        pendingRoles={pendingRoles}
        roles={ROLES}
        getRoleLabel={getRoleLabel}
        isMobile={isMobile}
        emptyMessage={emptyMessage}
        onRoleChange={handleRoleSelectChange}
        onSaveRole={handleSaveRole}
        onDeleteUser={handleDeleteUser}
      />

      <CreateUserDialog
        open={dialogOpen}
        form={form}
        roles={ROLES}
        getRoleLabel={getRoleLabel}
        isMobile={isMobile}
        formError={formError}
        formLoading={formLoading}
        onClose={() => {
          void attemptCloseDialog()
        }}
        onFieldChange={handleFormChange}
        onSubmit={handleCreateUser}
      />
    </>
  )
}
