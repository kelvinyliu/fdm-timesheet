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
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import SaveIcon from '@mui/icons-material/Save'
import SendIcon from '@mui/icons-material/Send'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import PageHeader from '../../components/shared/PageHeader'
import { getTimesheet, updateEntries, submitTimesheet, autofillTimesheet, getTimesheets } from '../../api/timesheets'
import { getAssignments } from '../../api/assignments'
import { buildWeekDates, formatWeekStart } from '../../utils/dateFormatters'
import {
  buildAutofillEntries,
  getMostRecentClientAssignmentId,
  isConsultantEditableStatus,
} from '../../utils/timesheetWorkflow.js'

function getBucketValue(entry) {
  return entry.entryKind === 'CLIENT' ? entry.assignmentId ?? '' : 'INTERNAL'
}

function createLocalEntries(entries, nextLocalId) {
  return (entries ?? []).map((entry) => ({
    id: `row-${nextLocalId()}`,
    date: entry.date,
    entryKind: entry.entryKind,
    assignmentId: entry.assignmentId ?? null,
    hoursWorked: String(entry.hoursWorked ?? '0'),
  }))
}

function buildDefaultEntry(date, assignments, preferredAssignmentId, nextLocalId) {
  const preferredAssignment = assignments.find((assignment) => assignment.id === preferredAssignmentId) ?? null
  const onlyAssignment = assignments.length === 1 ? assignments[0] : null
  const selectedAssignment = onlyAssignment ?? preferredAssignment

  return {
    id: `row-${nextLocalId()}`,
    date,
    entryKind: selectedAssignment ? 'CLIENT' : 'INTERNAL',
    assignmentId: selectedAssignment?.id ?? null,
    hoursWorked: '0',
  }
}

export default function TimesheetEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const localIdRef = useRef(0)
  const autofillWarningShown = useRef(false)

  const [timesheet, setTimesheet] = useState(null)
  const [entries, setEntries] = useState([])
  const [assignments, setAssignments] = useState([])
  const [preferredAssignmentId, setPreferredAssignmentId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [autofilling, setAutofilling] = useState(false)
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false)
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
        setPreferredAssignmentId(getMostRecentClientAssignmentId(allTimesheets, id))
        setEntries(createLocalEntries(ts.entries, nextLocalId))
      })
      .catch((err) => setFetchError(err.message ?? 'Failed to load timesheet'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const weekDates = timesheet ? buildWeekDates(timesheet.weekStart) : []
  const isBusy = saving || submitting || autofilling
  const canChangeBuckets = timesheet?.status === 'DRAFT'
  const totalHours = entries.reduce((sum, entry) => sum + (parseFloat(entry.hoursWorked) || 0), 0)

  function showSnackbar(message, severity = 'success') {
    setSnackbar({ open: true, message, severity })
  }

  function handleRowChange(rowId, patch) {
    setEntries((prev) => prev.map((entry) => (entry.id === rowId ? { ...entry, ...patch } : entry)))
  }

  function handleBucketChange(rowId, value) {
    if (!canChangeBuckets) return

    handleRowChange(rowId, value === 'INTERNAL'
      ? { entryKind: 'INTERNAL', assignmentId: null }
      : { entryKind: 'CLIENT', assignmentId: value })
  }

  function handleAddRow(date) {
    if (!canChangeBuckets) return

    setEntries((prev) => [
      ...prev,
      buildDefaultEntry(date, assignments, preferredAssignmentId, nextLocalId),
    ])
  }

  function handleRemoveRow(rowId) {
    if (!canChangeBuckets) return

    setEntries((prev) => prev.filter((entry) => entry.id !== rowId))
  }

  function getEntriesPayload() {
    return entries.map((entry) => ({
      date: entry.date,
      entryKind: entry.entryKind,
      assignmentId: entry.entryKind === 'CLIENT' ? entry.assignmentId : null,
      hoursWorked: parseFloat(entry.hoursWorked) || 0,
    }))
  }

  async function saveDraft() {
    setSaving(true)
    try {
      await updateEntries(id, getEntriesPayload())
      showSnackbar('Draft saved successfully.')
    } catch (err) {
      showSnackbar(err.message ?? 'Failed to save draft.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      await updateEntries(id, getEntriesPayload())
      await submitTimesheet(id)
      setSubmitConfirmOpen(false)
      navigate(`/consultant/timesheets/${id}`)
    } catch (err) {
      showSnackbar(err.message ?? 'Failed to submit timesheet.', 'error')
      setSubmitting(false)
    }
  }

  async function handleAutofill() {
    setAutofilling(true)
    try {
      const previousEntries = await autofillTimesheet(id)
      if (!previousEntries || previousEntries.length === 0) {
        showSnackbar('No previous week entries found.', 'info')
        return
      }

      setEntries(createLocalEntries(buildAutofillEntries(timesheet.weekStart, previousEntries), nextLocalId))
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
        <Button variant="outlined" onClick={() => navigate('/consultant/timesheets')}>
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
          onClick={() => navigate('/consultant/timesheets')}
        >
          Back
        </Button>
        <Button
          variant="outlined"
          startIcon={<AutoFixHighIcon />}
          onClick={handleAutofill}
          disabled={isBusy || !canChangeBuckets}
        >
          {autofilling ? 'Loading...' : 'Autofill from last week'}
        </Button>
      </PageHeader>

      {timesheet.rejectionComment && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <strong>Manager feedback:</strong> {timesheet.rejectionComment}
        </Alert>
      )}

      {!canChangeBuckets && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Client and Internal categories are locked after first submission. You can update hours on the existing rows only.
        </Alert>
      )}

      {assignments.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No client assignments are currently available. You can still record Internal work.
        </Alert>
      )}

      <Paper sx={{ p: { xs: 2.5, sm: 3 }, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6">Work Categories</Typography>
            <Typography variant="body2" color="text.secondary">
              Split each day across client assignments or Internal work.
            </Typography>
          </Box>
          <Chip label={`${totalHours.toFixed(2)}h total`} variant="outlined" />
        </Stack>
      </Paper>

      <Stack spacing={2.5}>
        {weekDates.map((date) => {
          const rows = entries.filter((entry) => entry.date === date)
          const dayTotal = rows.reduce((sum, entry) => sum + (parseFloat(entry.hoursWorked) || 0), 0)

          return (
            <Paper key={date} sx={{ p: { xs: 2, sm: 2.5 } }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                alignItems={{ sm: 'center' }}
                justifyContent="space-between"
                sx={{ mb: 2 }}
              >
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {formatWeekStart(date)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dayTotal.toFixed(2)}h scheduled
                  </Typography>
                </Box>
                {canChangeBuckets && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => handleAddRow(date)}
                    disabled={isBusy}
                  >
                    Add Row
                  </Button>
                )}
              </Stack>

              {rows.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No work categories added for this day.
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {rows.map((entry) => (
                    <Box
                      key={entry.id}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'minmax(240px, 1fr) 120px auto' },
                        gap: 1.5,
                        alignItems: 'center',
                      }}
                    >
                      <TextField
                        select
                        label="Work Category"
                        value={getBucketValue(entry)}
                        onChange={(event) => handleBucketChange(entry.id, event.target.value)}
                        disabled={isBusy || !canChangeBuckets}
                        fullWidth
                      >
                        {assignments.map((assignment) => (
                          <MenuItem key={assignment.id} value={assignment.id}>
                            {assignment.clientName}
                          </MenuItem>
                        ))}
                        <MenuItem value="INTERNAL">Internal</MenuItem>
                      </TextField>

                      <TextField
                        label="Hours"
                        type="number"
                        value={entry.hoursWorked}
                        onChange={(event) => handleRowChange(entry.id, { hoursWorked: event.target.value })}
                        disabled={isBusy}
                        slotProps={{ htmlInput: { min: 0, max: 24, step: '0.25' } }}
                      />

                      <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-end', sm: 'flex-start' } }}>
                        {canChangeBuckets ? (
                          <IconButton
                            aria-label="Remove work row"
                            onClick={() => handleRemoveRow(entry.id)}
                            disabled={isBusy}
                          >
                            <DeleteOutlineIcon />
                          </IconButton>
                        ) : (
                          <Box sx={{ width: 40 }} />
                        )}
                      </Box>
                    </Box>
                  ))}
                </Stack>
              )}
            </Paper>
          )
        })}
      </Stack>

      <Paper sx={{ p: { xs: 2.5, sm: 3 }, mt: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button
            variant="outlined"
            startIcon={<SaveIcon />}
            onClick={saveDraft}
            disabled={isBusy}
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={() => setSubmitConfirmOpen(true)}
            disabled={isBusy}
          >
            {submitting ? 'Submitting...' : 'Submit for Review'}
          </Button>
        </Stack>
      </Paper>

      <Dialog
        open={submitConfirmOpen}
        onClose={submitting ? undefined : () => setSubmitConfirmOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Submit Timesheet</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Submit this timesheet for manager review? You will not be able to change the client or Internal categories after submission.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setSubmitConfirmOpen(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>

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
