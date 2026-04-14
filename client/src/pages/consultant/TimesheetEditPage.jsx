import { useState, useEffect, useRef } from 'react'
import { useLoaderData, useNavigate, useParams, useLocation } from 'react-router'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import SaveIcon from '@mui/icons-material/Save'
import SendIcon from '@mui/icons-material/Send'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EditableWeeklyMatrix from '../../components/shared/EditableWeeklyMatrix.jsx'
import PageHeader from '../../components/shared/PageHeader'
import { useConfirmation } from '../../context/useConfirmation.js'
import { useGuardedNavigate, useUnsavedChangesGuard } from '../../context/useUnsavedChanges.js'
import { updateEntries, submitTimesheet, autofillTimesheet } from '../../api/timesheets'
import { buildWeekDates, formatWeekStart } from '../../utils/dateFormatters'
import { palette } from '../../theme.js'
import { buildAutofillEntries, isConsultantEditableStatus } from '../../utils/timesheetWorkflow.js'
import {
  entriesToEditableMatrixRows,
  getBucketValue,
  getDuplicateBucketValues,
  getMatrixTotalHours,
  getNextAvailableBucketValue,
  normaliseHoursValue,
  parseBucketValue,
  rowHasValues,
  serializeEntries,
} from '../../utils/timesheetMatrix.js'

function buildArchivedAssignments(timesheet, activeAssignments = []) {
  const activeAssignmentIds = new Set(activeAssignments.map((assignment) => assignment.id))
  const archivedAssignments = new Map()

  for (const entry of timesheet?.entries ?? []) {
    if (
      entry.entryKind !== 'CLIENT' ||
      !entry.assignmentId ||
      activeAssignmentIds.has(entry.assignmentId)
    )
      continue

    archivedAssignments.set(entry.assignmentId, {
      id: entry.assignmentId,
      clientName: entry.bucketLabel ?? 'Unknown client assignment',
      archived: true,
    })
  }

  for (const item of timesheet?.workSummary ?? []) {
    if (
      item.entryKind !== 'CLIENT' ||
      !item.assignmentId ||
      activeAssignmentIds.has(item.assignmentId)
    )
      continue

    archivedAssignments.set(item.assignmentId, {
      id: item.assignmentId,
      clientName: item.bucketLabel ?? 'Unknown client assignment',
      archived: true,
    })
  }

  return [...archivedAssignments.values()]
}

export default function TimesheetEditPage({ basePath = '/consultant/timesheets' }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const guardedNavigate = useGuardedNavigate()
  const location = useLocation()
  const { timesheet, assignments, preferredAssignmentId, error: fetchError } = useLoaderData()
  const localIdRef = useRef(0)
  const autofillWarningShown = useRef(false)
  const { confirm } = useConfirmation()

  const [matrixRows, setMatrixRows] = useState(() =>
    entriesToEditableMatrixRows(timesheet?.entries ?? [], nextLocalId)
  )
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [autofilling, setAutofilling] = useState(false)
  const [savedEntriesSnapshot, setSavedEntriesSnapshot] = useState(() =>
    serializeEntries(timesheet?.entries ?? [])
  )
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })

  function nextLocalId() {
    localIdRef.current += 1
    return localIdRef.current
  }

  useEffect(() => {
    const autofillFeedback =
      location.state?.autofillFeedback ??
      (location.state?.autofillWarning
        ? { severity: 'warning', message: location.state.autofillWarning }
        : null)

    if (!autofillFeedback || autofillWarningShown.current) return

    autofillWarningShown.current = true
    setSnackbar({
      open: true,
      message: autofillFeedback.message,
      severity: autofillFeedback.severity,
    })
    navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    localIdRef.current = 0
    setMatrixRows(entriesToEditableMatrixRows(timesheet?.entries ?? [], nextLocalId))
    setSavedEntriesSnapshot(serializeEntries(timesheet?.entries ?? []))
  }, [timesheet])

  const weekDates = timesheet ? buildWeekDates(timesheet.weekStart) : []
  const archivedAssignments = buildArchivedAssignments(timesheet, assignments)
  const availableAssignments = [...assignments, ...archivedAssignments]
  const allowedAutofillAssignmentIds = new Set(
    availableAssignments.map((assignment) => assignment.id)
  )
  const isBusy = saving || submitting || autofilling
  const canChangeBuckets = isConsultantEditableStatus(timesheet?.status)

  const totalHours = getMatrixTotalHours(matrixRows, weekDates)

  function showSnackbar(message, severity = 'success') {
    setSnackbar({ open: true, message, severity })
  }

  function handleRowCategoryChange(rowId, value) {
    if (!canChangeBuckets) return
    const isDuplicateBucket = matrixRows.some(
      (row) => row.id !== rowId && getBucketValue(row.entryKind, row.assignmentId) === value
    )
    if (isDuplicateBucket) {
      showSnackbar('Each work category can only appear once in the weekly matrix.', 'warning')
      return
    }

    const { entryKind, assignmentId } = parseBucketValue(value)
    setMatrixRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, entryKind, assignmentId } : r))
    )
  }

  function handleRowHoursChange(rowId, date, value) {
    setMatrixRows((prev) =>
      prev.map((r) =>
        r.id === rowId ? { ...r, hours: { ...r.hours, [date]: normaliseHoursValue(value) } } : r
      )
    )
  }

  function handleAddRow() {
    if (!canChangeBuckets) return
    const nextBucketValue = getNextAvailableBucketValue(
      matrixRows,
      availableAssignments,
      preferredAssignmentId
    )

    if (!nextBucketValue) {
      showSnackbar('All available work categories have already been added.', 'info')
      return
    }

    const { entryKind, assignmentId } = parseBucketValue(nextBucketValue)
    setMatrixRows((prev) => [
      ...prev,
      {
        id: `row-${nextLocalId()}`,
        entryKind,
        assignmentId,
        hours: {},
      },
    ])
  }

  async function handleRemoveRow(rowId) {
    if (!canChangeBuckets) return
    const row = matrixRows.find((item) => item.id === rowId)

    if (row && rowHasValues(row)) {
      const result = await confirm({
        variant: 'warning',
        title: 'Remove this work category row?',
        message:
          'This row contains entered hours. Removing it now will discard those values from the draft.',
        confirmLabel: 'Remove row',
        cancelLabel: 'Keep row',
      })

      if (result !== 'confirm') return
    }

    setMatrixRows((prev) => prev.filter((r) => r.id !== rowId))
  }

  function getEntriesPayload() {
    const entries = []
    matrixRows.forEach((row) => {
      weekDates.forEach((date) => {
        const hw = parseFloat(row.hours[date]) || 0
        if (hw > 0) {
          entries.push({
            date,
            entryKind: row.entryKind,
            assignmentId: row.entryKind === 'CLIENT' ? row.assignmentId : null,
            hoursWorked: hw,
          })
        }
      })
    })
    return entries
  }

  const currentEntriesPayload = getEntriesPayload()
  const isDirty = serializeEntries(currentEntriesPayload) !== savedEntriesSnapshot
  const shouldBlockUnsavedChanges = isDirty && !submitting

  function validateMatrixRows() {
    if (getDuplicateBucketValues(matrixRows).length === 0) return true
    showSnackbar('Each work category can only appear once in the weekly matrix.', 'error')
    return false
  }

  useUnsavedChangesGuard({
    isDirty: shouldBlockUnsavedChanges,
    title: 'Leave with unsaved timesheet changes?',
    message:
      'This draft has local edits that have not been saved yet. You can save now or discard them.',
    variant: 'warning',
    discardLabel: 'Discard changes',
    stayLabel: 'Keep editing',
    saveLabel: 'Save and leave',
    onSave: saveDraft,
  })

  async function saveDraft() {
    if (!validateMatrixRows()) return false
    setSaving(true)
    try {
      await updateEntries(id, currentEntriesPayload)
      setSavedEntriesSnapshot(serializeEntries(currentEntriesPayload))
      showSnackbar('Draft saved successfully.')
      return true
    } catch (err) {
      showSnackbar(err.message ?? 'Failed to save draft.', 'error')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit() {
    if (!validateMatrixRows()) return

    const result = await confirm({
      variant: 'info',
      title: 'Submit timesheet for review?',
      message:
        'This will send the current draft to your manager for review and lock editing until the sheet is returned.',
      confirmLabel: 'Submit for review',
      cancelLabel: 'Keep editing',
      summaryItems: [
        { key: 'week', label: 'Week of', value: formatWeekStart(timesheet.weekStart) },
        { key: 'hours', label: 'Total hours', value: `${totalHours.toFixed(2)}h` },
      ],
    })

    if (result !== 'confirm') return

    setSubmitting(true)
    try {
      await updateEntries(id, currentEntriesPayload)
      setSavedEntriesSnapshot(serializeEntries(currentEntriesPayload))
      await submitTimesheet(id)
      navigate(`${basePath}/${id}`)
    } catch (err) {
      showSnackbar(err.message ?? 'Failed to submit timesheet.', 'error')
      setSubmitting(false)
    }
  }

  async function handleAutofill() {
    if (isDirty) {
      const result = await confirm({
        variant: 'warning',
        title: "Replace current draft with last week's hours?",
        message:
          "Autofill will overwrite the current in-progress matrix with the previous week's pattern where possible.",
        confirmLabel: 'Overwrite with autofill',
        cancelLabel: 'Keep current draft',
        summaryItems: [
          { key: 'hours', label: 'Current draft', value: `${totalHours.toFixed(2)}h entered` },
          {
            key: 'rows',
            label: 'Work categories',
            value: `${matrixRows.length} row${matrixRows.length === 1 ? '' : 's'}`,
          },
        ],
      })

      if (result !== 'confirm') return
    }

    setAutofilling(true)
    try {
      const previousEntries = await autofillTimesheet(id)
      if (!previousEntries || previousEntries.length === 0) {
        showSnackbar('No previous week entries found.', 'info')
        return
      }

      const { entries: nextEntries, skippedBucketLabels } = buildAutofillEntries(
        timesheet.weekStart,
        previousEntries,
        allowedAutofillAssignmentIds
      )

      if (nextEntries.length === 0 && skippedBucketLabels.length > 0) {
        showSnackbar(
          'Autofill skipped archived client categories that are not available on this timesheet.',
          'warning'
        )
        return
      }

      setMatrixRows(entriesToEditableMatrixRows(nextEntries, nextLocalId))

      if (skippedBucketLabels.length > 0) {
        showSnackbar('Hours copied, but some archived client categories were skipped.', 'warning')
        return
      }

      showSnackbar('Hours copied from the previous week.')
    } catch (err) {
      showSnackbar(err.message ?? 'Autofill failed.', 'error')
    } finally {
      setAutofilling(false)
    }
  }

  if (fetchError) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 3 }}>
          {fetchError}
        </Alert>
        <Button variant="outlined" onClick={() => guardedNavigate(basePath)}>
          Back to Timesheets
        </Button>
      </Box>
    )
  }

  return (
    <Box>
      <PageHeader
        title="Edit Timesheet"
        subtitle={`Week of ${formatWeekStart(timesheet.weekStart)}`}
      >
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => guardedNavigate(basePath)}
        >
          Back
        </Button>
        <Button
          variant="outlined"
          startIcon={<AutoFixHighIcon />}
          onClick={handleAutofill}
          disabled={isBusy}
        >
          {autofilling ? 'Loading...' : 'Autofill from last week'}
        </Button>
      </PageHeader>

      {timesheet.rejectionComment && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <strong>Manager feedback:</strong> {timesheet.rejectionComment}
        </Alert>
      )}

      {assignments.length === 0 && archivedAssignments.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No client assignments are currently available. You can still record Internal work.
        </Alert>
      )}

      {assignments.length === 0 && archivedAssignments.length > 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No active client assignments are currently available. Archived work categories already on
          this timesheet can still be edited.
        </Alert>
      )}

      <EditableWeeklyMatrix
        rows={matrixRows}
        weekDates={weekDates}
        totalHours={totalHours}
        availableAssignments={availableAssignments}
        canChangeBuckets={canChangeBuckets}
        isBusy={isBusy}
        onAddRow={handleAddRow}
        onRemoveRow={handleRemoveRow}
        onRowCategoryChange={handleRowCategoryChange}
        onRowHoursChange={handleRowHoursChange}
      />

      <Paper sx={{ p: { xs: 2.5, sm: 3 }, mt: 3, backgroundColor: palette.surfaceRaised }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="flex-end">
          <Button
            variant="outlined"
            startIcon={<SaveIcon />}
            onClick={saveDraft}
            disabled={isBusy}
            size="large"
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={() => {
              void handleSubmit()
            }}
            disabled={isBusy}
            size="large"
          >
            {submitting ? 'Submitting...' : 'Submit for Review'}
          </Button>
        </Stack>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ mt: { xs: 8, sm: 9 } }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          sx={{ width: '100%', boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
