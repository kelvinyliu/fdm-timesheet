import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Paper from '@mui/material/Paper'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import SaveIcon from '@mui/icons-material/Save'
import SendIcon from '@mui/icons-material/Send'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import PageHeader from '../../components/shared/PageHeader'
import { useConfirmation } from '../../context/useConfirmation.js'
import {
  useGuardedNavigate,
  useUnsavedChangesGuard,
} from '../../context/useUnsavedChanges.js'
import { getTimesheet, updateEntries, submitTimesheet, autofillTimesheet, getTimesheets } from '../../api/timesheets'
import { getAssignments } from '../../api/assignments'
import { buildWeekDates, formatWeekStart, formatDayName } from '../../utils/dateFormatters'
import { palette } from '../../theme.js'
import {
  buildAutofillEntries,
  getMostRecentClientAssignmentId,
  isConsultantEditableStatus,
} from '../../utils/timesheetWorkflow.js'

function getBucketValue(entryKind, assignmentId) {
  return entryKind === 'CLIENT' ? assignmentId || '' : 'INTERNAL'
}

function parseBucketValue(value) {
  if (value === 'INTERNAL') return { entryKind: 'INTERNAL', assignmentId: null }
  return { entryKind: 'CLIENT', assignmentId: value }
}

function entriesToMatrixRows(entries, nextLocalId) {
  const rowMap = new Map() // key: bucketValue
  entries.forEach(entry => {
    const key = getBucketValue(entry.entryKind, entry.assignmentId)
    if (!rowMap.has(key)) {
      rowMap.set(key, {
        id: `row-${nextLocalId()}`,
        ...parseBucketValue(key),
        hours: {}
      })
    }
    rowMap.get(key).hours[entry.date] = String(entry.hoursWorked ?? '0')
  })
  return Array.from(rowMap.values())
}

function buildArchivedAssignments(timesheet, activeAssignments = []) {
  const activeAssignmentIds = new Set(activeAssignments.map((assignment) => assignment.id))
  const archivedAssignments = new Map()

  for (const entry of timesheet?.entries ?? []) {
    if (entry.entryKind !== 'CLIENT' || !entry.assignmentId || activeAssignmentIds.has(entry.assignmentId)) continue

    archivedAssignments.set(entry.assignmentId, {
      id: entry.assignmentId,
      clientName: entry.bucketLabel ?? 'Unknown client assignment',
      archived: true,
    })
  }

  for (const item of timesheet?.workSummary ?? []) {
    if (item.entryKind !== 'CLIENT' || !item.assignmentId || activeAssignmentIds.has(item.assignmentId)) continue

    archivedAssignments.set(item.assignmentId, {
      id: item.assignmentId,
      clientName: item.bucketLabel ?? 'Unknown client assignment',
      archived: true,
    })
  }

  return [...archivedAssignments.values()]
}

function getAssignmentOptionLabel(assignment) {
  if (!assignment) return 'Unknown client assignment'
  return assignment.archived ? `${assignment.clientName} (Archived)` : assignment.clientName
}

function serializeEntries(entries) {
  return JSON.stringify(
    [...entries]
      .map((entry) => ({
        date: entry.date,
        entryKind: entry.entryKind,
        assignmentId: entry.assignmentId ?? null,
        hoursWorked: Number(entry.hoursWorked),
      }))
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date)
        if (a.entryKind !== b.entryKind) return a.entryKind.localeCompare(b.entryKind)
        if ((a.assignmentId ?? '') !== (b.assignmentId ?? '')) {
          return (a.assignmentId ?? '').localeCompare(b.assignmentId ?? '')
        }
        return a.hoursWorked - b.hoursWorked
      })
  )
}

function rowHasValues(row) {
  return Object.values(row.hours ?? {}).some((value) => String(value ?? '').trim() !== '')
}

export default function TimesheetEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const guardedNavigate = useGuardedNavigate()
  const location = useLocation()
  const localIdRef = useRef(0)
  const autofillWarningShown = useRef(false)
  const { confirm } = useConfirmation()

  const [timesheet, setTimesheet] = useState(null)
  const [matrixRows, setMatrixRows] = useState([])
  const [assignments, setAssignments] = useState([])
  const [archivedAssignments, setArchivedAssignments] = useState([])
  const [preferredAssignmentId, setPreferredAssignmentId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [autofilling, setAutofilling] = useState(false)
  const [savedEntriesSnapshot, setSavedEntriesSnapshot] = useState('[]')
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
    Promise.all([getTimesheet(id), getAssignments(), getTimesheets()])
      .then(([ts, fetchedAssignments, allTimesheets]) => {
        if (!isConsultantEditableStatus(ts.status)) {
          navigate(`/consultant/timesheets/${id}`, { replace: true })
          return
        }

        setTimesheet(ts)
        setAssignments(fetchedAssignments)
        setArchivedAssignments(buildArchivedAssignments(ts, fetchedAssignments))
        setPreferredAssignmentId(getMostRecentClientAssignmentId(allTimesheets, id))
        setMatrixRows(entriesToMatrixRows(ts.entries ?? [], nextLocalId))
        setSavedEntriesSnapshot(serializeEntries(ts.entries ?? []))
      })
      .catch((err) => setFetchError(err.message ?? 'Failed to load timesheet'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const weekDates = timesheet ? buildWeekDates(timesheet.weekStart) : []
  const availableAssignments = [...assignments, ...archivedAssignments]
  const allowedAutofillAssignmentIds = new Set(availableAssignments.map((assignment) => assignment.id))
  const isBusy = saving || submitting || autofilling
  const canChangeBuckets = isConsultantEditableStatus(timesheet?.status)

  const totalHours = matrixRows.reduce((sum, row) => {
    return sum + weekDates.reduce((daySum, date) => daySum + (parseFloat(row.hours[date]) || 0), 0)
  }, 0)

  function showSnackbar(message, severity = 'success') {
    setSnackbar({ open: true, message, severity })
  }

  function handleRowCategoryChange(rowId, value) {
    if (!canChangeBuckets) return
    const { entryKind, assignmentId } = parseBucketValue(value)
    setMatrixRows(prev => prev.map(r => r.id === rowId ? { ...r, entryKind, assignmentId } : r))
  }

  function handleRowHoursChange(rowId, date, value) {
    setMatrixRows(prev => prev.map(r => r.id === rowId ? { ...r, hours: { ...r.hours, [date]: value } } : r))
  }

  function handleAddRow() {
    if (!canChangeBuckets) return
    const selectedAssignment = availableAssignments.length === 1 ? availableAssignments[0] : (availableAssignments.find(a => a.id === preferredAssignmentId) || null)
    setMatrixRows(prev => [...prev, {
      id: `row-${nextLocalId()}`,
      entryKind: selectedAssignment ? 'CLIENT' : 'INTERNAL',
      assignmentId: selectedAssignment?.id ?? null,
      hours: {}
    }])
  }

  async function handleRemoveRow(rowId) {
    if (!canChangeBuckets) return
    const row = matrixRows.find((item) => item.id === rowId)

    if (row && rowHasValues(row)) {
      const result = await confirm({
        variant: 'warning',
        title: 'Remove this work category row?',
        message: 'This row contains entered hours. Removing it now will discard those values from the draft.',
        confirmLabel: 'Remove row',
        cancelLabel: 'Keep row',
      })

      if (result !== 'confirm') return
    }

    setMatrixRows(prev => prev.filter(r => r.id !== rowId))
  }

  function getEntriesPayload() {
    const entries = []
    matrixRows.forEach(row => {
      weekDates.forEach(date => {
        const hw = parseFloat(row.hours[date]) || 0
        if (hw > 0) {
          entries.push({
            date,
            entryKind: row.entryKind,
            assignmentId: row.entryKind === 'CLIENT' ? row.assignmentId : null,
            hoursWorked: hw
          })
        }
      })
    })
    return entries
  }

  const currentEntriesPayload = getEntriesPayload()
  const isDirty = serializeEntries(currentEntriesPayload) !== savedEntriesSnapshot

  useUnsavedChangesGuard({
    isDirty,
    title: 'Leave with unsaved timesheet changes?',
    message: 'This draft has local edits that have not been saved yet. You can save now or discard them.',
    variant: 'warning',
    discardLabel: 'Discard changes',
    stayLabel: 'Keep editing',
    saveLabel: 'Save and leave',
    onSave: saveDraft,
  })

  async function saveDraft() {
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
    const result = await confirm({
      variant: 'info',
      title: 'Submit timesheet for review?',
      message: 'This will send the current draft to your manager for review and lock editing until the sheet is returned.',
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
      await submitTimesheet(id)
      navigate(`/consultant/timesheets/${id}`)
    } catch (err) {
      showSnackbar(err.message ?? 'Failed to submit timesheet.', 'error')
      setSubmitting(false)
    }
  }

  async function handleAutofill() {
    if (isDirty) {
      const result = await confirm({
        variant: 'warning',
        title: 'Replace current draft with last week\'s hours?',
        message: 'Autofill will overwrite the current in-progress matrix with the previous week\'s pattern where possible.',
        confirmLabel: 'Overwrite with autofill',
        cancelLabel: 'Keep current draft',
        summaryItems: [
          { key: 'hours', label: 'Current draft', value: `${totalHours.toFixed(2)}h entered` },
          { key: 'rows', label: 'Work categories', value: `${matrixRows.length} row${matrixRows.length === 1 ? '' : 's'}` },
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

      const {
        entries: nextEntries,
        skippedBucketLabels,
      } = buildAutofillEntries(timesheet.weekStart, previousEntries, allowedAutofillAssignmentIds)

      if (nextEntries.length === 0 && skippedBucketLabels.length > 0) {
        showSnackbar('Autofill skipped archived client categories that are not available on this timesheet.', 'warning')
        return
      }

      setMatrixRows(entriesToMatrixRows(nextEntries, nextLocalId))

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

  if (loading) return <LoadingSpinner />

  if (fetchError) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 3 }}>
          {fetchError}
        </Alert>
        <Button variant="outlined" onClick={() => guardedNavigate('/consultant/timesheets')}>
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
          onClick={() => guardedNavigate('/consultant/timesheets')}
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
          No active client assignments are currently available. Archived work categories already on this timesheet can still be edited.
        </Alert>
      )}

      <Paper sx={{ mb: 3, p: { xs: 0, sm: 0 }, overflow: 'hidden' }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: palette.sidebarBg, color: palette.textInverse }}>
           <Typography variant="h6" sx={{ color: palette.textInverse }}>Weekly Matrix</Typography>
           <Typography variant="h6" sx={{ fontFamily: '"JetBrains Mono", monospace', color: palette.primary }}>
             {totalHours.toFixed(2)}h Total
           </Typography>
        </Box>
        <TableContainer sx={{ borderTop: `2px solid ${palette.borderStrong}` }}>
          <Table size="small" sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 250, borderRight: `2px solid ${palette.border}` }}>Work Category</TableCell>
                {weekDates.map(date => (
                  <TableCell key={date} align="center" sx={{ width: 80, borderRight: `2px solid ${palette.border}` }}>
                    <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: palette.textPrimary }}>
                      {formatDayName(date).slice(0, 3)}
                    </Typography>
                    <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', color: palette.textMuted }}>
                      {date.slice(5)}
                    </Typography>
                  </TableCell>
                ))}
                <TableCell align="center" sx={{ width: 80, borderRight: `2px solid ${palette.border}` }}>Total</TableCell>
                <TableCell align="center" sx={{ width: 60 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {matrixRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6, color: palette.textSecondary }}>
                    No rows added. Click "Add Row" below.
                  </TableCell>
                </TableRow>
              ) : (
                matrixRows.map(row => {
                  const rowTotal = weekDates.reduce((sum, date) => sum + (parseFloat(row.hours[date]) || 0), 0)
                  return (
                    <TableRow key={row.id}>
                      <TableCell sx={{ borderRight: `2px solid ${palette.border}` }}>
                        <TextField
                          select
                          variant="outlined"
                          size="small"
                          value={getBucketValue(row.entryKind, row.assignmentId)}
                          onChange={(e) => handleRowCategoryChange(row.id, e.target.value)}
                          disabled={isBusy || !canChangeBuckets}
                          fullWidth
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }}
                        >
                          {availableAssignments.map((assignment) => (
                            <MenuItem key={assignment.id} value={assignment.id}>
                              {getAssignmentOptionLabel(assignment)}
                            </MenuItem>
                          ))}
                          <MenuItem value="INTERNAL">Internal</MenuItem>
                        </TextField>
                      </TableCell>
                      {weekDates.map(date => (
                        <TableCell key={date} align="center" sx={{ p: 1, borderRight: `2px solid ${palette.border}` }}>
                          <TextField
                            variant="outlined"
                            size="small"
                            type="number"
                            value={row.hours[date] ?? ''}
                            onChange={(e) => handleRowHoursChange(row.id, date, e.target.value)}
                            disabled={isBusy}
                            slotProps={{ htmlInput: { min: 0, max: 24, step: '0.25', style: { textAlign: 'center', padding: '8px 4px' } } }}
                            sx={{ width: '100%', '& .MuiOutlinedInput-root': { borderRadius: 0 } }}
                          />
                        </TableCell>
                      ))}
                      <TableCell align="center" sx={{ borderRight: `2px solid ${palette.border}` }}>
                        <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700 }}>
                          {rowTotal.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                         {canChangeBuckets && (
                         <IconButton
                            onClick={() => {
                              void handleRemoveRow(row.id)
                            }}
                            disabled={isBusy}
                            color="error"
                            size="small"
                          >
                            <DeleteOutlineIcon />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {canChangeBuckets && (
          <Box sx={{ p: 2, borderTop: `2px solid ${palette.border}` }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddRow}
              disabled={isBusy}
            >
              Add Row
            </Button>
          </Box>
        )}
      </Paper>

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
            color="primary"
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
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
