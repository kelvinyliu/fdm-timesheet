import { useState } from 'react'
import { useLoaderData, useRevalidator } from 'react-router'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import PageHeader from '../../components/shared/PageHeader'
import { useConfirmation } from '../../context/useConfirmation.js'
import { useUnsavedChangesGuard } from '../../context/useUnsavedChanges.js'
import {
  createAssignment,
  deleteAssignment,
  createManagerAssignment,
  updateManagerAssignment,
  deleteManagerAssignment,
} from '../../api/assignments'
import { getSubmitterDisplayLabel } from '../../utils/displayLabels'
import {
  ClientAssignmentDialog,
  ManagerAssignmentDialog,
} from './components/AssignmentsDialogs.jsx'
import { ClientAssignmentsPanel, ManagerAssignmentsPanel } from './components/AssignmentsPanels.jsx'
import { useSyncedErrorState } from './hooks/useSyncedErrorState.js'
import { attemptCloseAdminDialog } from './utils/adminDialogs.js'
import { executeAdminMutation } from './utils/adminMutations.js'

const EMPTY_CLIENT_FORM = { consultantId: '', clientName: '', clientBillRate: '' }
const EMPTY_MANAGER_FORM = { managerId: '', consultantId: '' }

export default function AssignmentsPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const revalidator = useRevalidator()
  const {
    users,
    clientAssignments,
    managerAssignments,
    clientError: loadedClientError,
    managerError: loadedManagerError,
  } = useLoaderData()
  const [activeTab, setActiveTab] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [clientError, setClientError] = useSyncedErrorState(loadedClientError)
  const [managerError, setManagerError] = useSyncedErrorState(loadedManagerError)
  const [clientDialogOpen, setClientDialogOpen] = useState(false)
  const [clientForm, setClientForm] = useState(EMPTY_CLIENT_FORM)
  const [clientFormError, setClientFormError] = useState('')
  const [clientFormLoading, setClientFormLoading] = useState(false)
  const [managerDialogOpen, setManagerDialogOpen] = useState(false)
  const [managerDialogMode, setManagerDialogMode] = useState('create')
  const [managerEditingId, setManagerEditingId] = useState(null)
  const [managerForm, setManagerForm] = useState(EMPTY_MANAGER_FORM)
  const [managerInitialForm, setManagerInitialForm] = useState(EMPTY_MANAGER_FORM)
  const [managerFormError, setManagerFormError] = useState('')
  const [managerFormLoading, setManagerFormLoading] = useState(false)
  const { confirm } = useConfirmation()

  const isClientDialogDirty =
    clientDialogOpen &&
    (Boolean(clientForm.consultantId) ||
      Boolean(clientForm.clientName) ||
      Boolean(clientForm.clientBillRate))
  const isManagerDialogDirty =
    managerDialogOpen &&
    (managerForm.managerId !== managerInitialForm.managerId ||
      managerForm.consultantId !== managerInitialForm.consultantId)

  useUnsavedChangesGuard({
    isDirty: isClientDialogDirty,
    title: 'Discard this client assignment draft?',
    message: 'The client assignment form has unsaved values.',
    variant: 'warning',
    discardLabel: 'Discard draft',
    stayLabel: 'Keep editing',
  })

  useUnsavedChangesGuard({
    isDirty: isManagerDialogDirty,
    title:
      managerDialogMode === 'edit'
        ? 'Discard manager assignment changes?'
        : 'Discard this manager assignment draft?',
    message:
      managerDialogMode === 'edit'
        ? 'The manager assignment changes have not been saved yet.'
        : 'The manager assignment form has unsaved values.',
    variant: 'warning',
    discardLabel: managerDialogMode === 'edit' ? 'Discard changes' : 'Discard draft',
    stayLabel: 'Keep editing',
  })

  const userById = new Map(users.map((user) => [user.id, user]))
  const submitters = users.filter(
    (user) => user.role === 'CONSULTANT' || user.role === 'LINE_MANAGER'
  )
  const managers = users.filter((user) => user.role === 'LINE_MANAGER')
  const assignmentQuery = searchQuery.toLowerCase()
  const filteredClientAssignments = clientAssignments.filter((assignment) => {
    const submitterName = getSubmitterDisplayLabel(
      userById.get(assignment.consultantId)?.name ?? null
    ).toLowerCase()

    return (
      assignment.clientName.toLowerCase().includes(assignmentQuery) ||
      submitterName.includes(assignmentQuery)
    )
  })
  const filteredManagerAssignments = managerAssignments.filter(
    (assignment) =>
      assignment.managerName.toLowerCase().includes(assignmentQuery) ||
      assignment.consultantName.toLowerCase().includes(assignmentQuery)
  )

  async function handleDeleteClientAssignment(id, assignmentLabel) {
    const result = await confirm({
      variant: 'danger',
      title: 'Remove this client assignment?',
      message: 'This action cannot be undone.',
      confirmLabel: 'Delete assignment',
      cancelLabel: 'Keep assignment',
      summaryItems: assignmentLabel
        ? [{ key: 'assignment', label: 'Assignment', value: assignmentLabel }]
        : [],
    })

    if (result !== 'confirm') return

    await executeAdminMutation({
      mutation: () => deleteAssignment(id),
      revalidator,
      onSuccess: () => setClientError(''),
      onError: (err) => setClientError(err.message || 'Failed to delete assignment.'),
    })
  }

  async function handleDeleteManagerAssignment(id, assignmentLabel) {
    const result = await confirm({
      variant: 'danger',
      title: 'Remove this manager assignment?',
      message: 'This action cannot be undone.',
      confirmLabel: 'Delete assignment',
      cancelLabel: 'Keep assignment',
      summaryItems: assignmentLabel
        ? [{ key: 'assignment', label: 'Assignment', value: assignmentLabel }]
        : [],
    })

    if (result !== 'confirm') return

    await executeAdminMutation({
      mutation: () => deleteManagerAssignment(id),
      revalidator,
      onSuccess: () => setManagerError(''),
      onError: (err) => setManagerError(err.message || 'Failed to delete assignment.'),
    })
  }

  function openClientDialog() {
    setClientForm(EMPTY_CLIENT_FORM)
    setClientFormError('')
    setClientDialogOpen(true)
  }

  async function handleCreateClientAssignment() {
    setClientFormError('')
    const { consultantId, clientName, clientBillRate } = clientForm
    const parsedClientBillRate = Number(clientBillRate)

    if (!consultantId || !clientName || !clientBillRate) {
      setClientFormError('Submitter, Client Name, and Client Bill Rate are required.')
      return
    }

    if (!Number.isFinite(parsedClientBillRate) || parsedClientBillRate <= 0) {
      setClientFormError('Client Bill Rate must be greater than 0.')
      return
    }

    setClientFormLoading(true)
    await executeAdminMutation({
      mutation: () =>
        createAssignment({ consultantId, clientName, clientBillRate: parsedClientBillRate }),
      revalidator,
      onSuccess: () => {
        setClientDialogOpen(false)
        setClientError('')
      },
      onError: (err) => setClientFormError(err.message || 'Failed to create assignment.'),
    })
    setClientFormLoading(false)
  }

  function openManagerDialog() {
    setManagerDialogMode('create')
    setManagerEditingId(null)
    setManagerForm(EMPTY_MANAGER_FORM)
    setManagerInitialForm(EMPTY_MANAGER_FORM)
    setManagerFormError('')
    setManagerDialogOpen(true)
  }

  function openEditManagerDialog(assignment) {
    setManagerDialogMode('edit')
    setManagerEditingId(assignment.id)
    setManagerForm({
      managerId: assignment.managerId ?? '',
      consultantId: assignment.consultantId ?? '',
    })
    setManagerInitialForm({
      managerId: assignment.managerId ?? '',
      consultantId: assignment.consultantId ?? '',
    })
    setManagerFormError('')
    setManagerDialogOpen(true)
  }

  function closeManagerDialog() {
    setManagerDialogOpen(false)
    setManagerFormError('')
  }

  async function attemptCloseClientDialog() {
    await attemptCloseAdminDialog({
      isDirty: isClientDialogDirty,
      isBusy: clientFormLoading,
      confirm,
      onClose: () => setClientDialogOpen(false),
      confirmOptions: {
        variant: 'warning',
        title: 'Discard this client assignment draft?',
        message: 'Closing now will discard the values you have entered.',
        confirmLabel: 'Discard draft',
        cancelLabel: 'Keep editing',
      },
    })
  }

  async function attemptCloseManagerDialog() {
    await attemptCloseAdminDialog({
      isDirty: isManagerDialogDirty,
      isBusy: managerFormLoading,
      confirm,
      onClose: closeManagerDialog,
      confirmOptions: {
        variant: 'warning',
        title:
          managerDialogMode === 'edit'
            ? 'Discard manager assignment changes?'
            : 'Discard this manager assignment draft?',
        message: 'Closing now will discard the current values in this form.',
        confirmLabel: managerDialogMode === 'edit' ? 'Discard changes' : 'Discard draft',
        cancelLabel: 'Keep editing',
      },
    })
  }

  function handleClientFormChange(field, value) {
    setClientForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleManagerFormChange(field, value) {
    setManagerForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmitManagerAssignment() {
    setManagerFormError('')
    const { managerId, consultantId } = managerForm
    if (!managerId || !consultantId) {
      setManagerFormError('Both Manager and Submitter are required.')
      return
    }

    setManagerFormLoading(true)
    await executeAdminMutation({
      mutation: () =>
        managerDialogMode === 'edit' && managerEditingId
          ? updateManagerAssignment(managerEditingId, { managerId, consultantId })
          : createManagerAssignment({ managerId, consultantId }),
      revalidator,
      onSuccess: () => {
        closeManagerDialog()
        setManagerError('')
      },
      onError: (err) =>
        setManagerFormError(
          err.message ||
            `Failed to ${managerDialogMode === 'edit' ? 'update' : 'create'} assignment.`
        ),
    })
    setManagerFormLoading(false)
  }

  return (
    <>
      <PageHeader
        title="Assignments"
        subtitle="Manage client assignments and manager approval ownership"
      />

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
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
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            },
          }}
        />
        <Box sx={{ flexGrow: 1 }} />
        {activeTab === 0 ? (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openClientDialog}>
            Add Client Assignment
          </Button>
        ) : (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openManagerDialog}>
            Add Manager Assignment
          </Button>
        )}
      </Box>

      {activeTab === 0 ? (
        <ClientAssignmentsPanel
          assignments={filteredClientAssignments}
          isMobile={isMobile}
          userById={userById}
          error={clientError}
          onDismissError={() => setClientError('')}
          onDeleteAssignment={handleDeleteClientAssignment}
        />
      ) : (
        <ManagerAssignmentsPanel
          assignments={filteredManagerAssignments}
          isMobile={isMobile}
          error={managerError}
          onDismissError={() => setManagerError('')}
          onEditAssignment={openEditManagerDialog}
          onDeleteAssignment={handleDeleteManagerAssignment}
        />
      )}

      <ClientAssignmentDialog
        open={clientDialogOpen}
        form={clientForm}
        submitters={submitters}
        isMobile={isMobile}
        error={clientFormError}
        loading={clientFormLoading}
        onClose={() => {
          void attemptCloseClientDialog()
        }}
        onChange={handleClientFormChange}
        onSubmit={handleCreateClientAssignment}
      />

      <ManagerAssignmentDialog
        open={managerDialogOpen}
        mode={managerDialogMode}
        form={managerForm}
        managers={managers}
        submitters={submitters}
        isMobile={isMobile}
        error={managerFormError}
        loading={managerFormLoading}
        onClose={() => {
          void attemptCloseManagerDialog()
        }}
        onChange={handleManagerFormChange}
        onSubmit={handleSubmitManagerAssignment}
      />
    </>
  )
}
