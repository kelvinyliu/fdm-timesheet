import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import Alert from '@mui/material/Alert'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import PageHeader from '../../components/shared/PageHeader'
import { palette } from '../../theme.js'
import { createTimesheet, autofillTimesheet, updateEntries, getTimesheets } from '../../api/timesheets'
import { getAssignments } from '../../api/assignments'
import { formatWeekStart, getCurrentMonday } from '../../utils/dateFormatters'
import {
  buildAutofillEntries,
  getTimesheetForWeek,
  isConsultantEditableStatus,
} from '../../utils/timesheetWorkflow.js'

export default function TimesheetCreatePage() {
  const navigate = useNavigate()
  const [weekStart] = useState(() => getCurrentMonday())
  const [assignmentId, setAssignmentId] = useState('')
  const [autofill, setAutofill] = useState(false)
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    Promise.all([getAssignments(), getTimesheets()])
      .then(([fetchedAssignments, all]) => {
        const currentWeekTimesheet = getTimesheetForWeek(all, weekStart)
        if (currentWeekTimesheet) {
          navigate(
            isConsultantEditableStatus(currentWeekTimesheet.status)
              ? `/consultant/timesheets/${currentWeekTimesheet.id}/edit`
              : `/consultant/timesheets/${currentWeekTimesheet.id}`,
            { replace: true }
          )
          return
        }

        setAssignments(fetchedAssignments)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [navigate, weekStart])

  async function createTimesheetWithOptions() {
    setSubmitError(null)
    setSubmitting(true)
    try {
      const body = { weekStart }
      if (assignmentId) body.assignmentId = assignmentId

      const newTimesheet = await createTimesheet(body)
      setConfirmOpen(false)
      const newId = newTimesheet.id
      let autofillFeedback = null

      if (autofill) {
        try {
          const prevEntries = await autofillTimesheet(newId)
          if (prevEntries && prevEntries.length > 0) {
            const entries = buildAutofillEntries(weekStart, prevEntries)
            await updateEntries(newId, entries)
          } else {
            autofillFeedback = {
              severity: 'info',
              message: 'No previous week entries were found to copy.',
            }
          }
        } catch (err) {
          autofillFeedback = {
            severity: 'warning',
            message: err.message ?? 'Autofill failed after creating the timesheet.',
          }
        }
      }

      navigate(`/consultant/timesheets/${newId}/edit`, {
        replace: true,
        state: autofillFeedback ? { autofillFeedback } : undefined,
      })
    } catch (err) {
      setSubmitError(err.message ?? 'Failed to create timesheet.')
      setSubmitting(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    setConfirmOpen(true)
  }

  if (loading) return <LoadingSpinner />

  return (
    <Box>
      <PageHeader
        title="New Timesheet"
        subtitle={`Week of ${formatWeekStart(weekStart)}`}
      />

      <Paper sx={{ p: { xs: 2.5, sm: 4 }, maxWidth: 480 }}>
        <Box component="form" onSubmit={handleSubmit} noValidate>
          {submitError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {submitError}
            </Alert>
          )}

          <FormControl fullWidth sx={{ mb: 2.5 }}>
            <InputLabel id="assignment-label">Client Assignment (optional)</InputLabel>
            <Select
              labelId="assignment-label"
              value={assignmentId}
              label="Client Assignment (optional)"
              onChange={(e) => setAssignmentId(e.target.value)}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {assignments.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.clientName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Checkbox
                checked={autofill}
                onChange={(e) => setAutofill(e.target.checked)}
                sx={{
                  color: palette.primary,
                  '&.Mui-checked': { color: palette.primary },
                }}
              />
            }
            label="Copy hours from previous week"
            sx={{ mb: 3, display: 'block' }}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Timesheet'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/consultant/timesheets')}
              disabled={submitting}
            >
              Cancel
            </Button>
          </Stack>
        </Box>
      </Paper>

      <Dialog
        open={confirmOpen}
        onClose={submitting ? undefined : () => setConfirmOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Create timesheet?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will create your timesheet for the week of {formatWeekStart(weekStart)}
            {autofill ? ' and copy hours from the previous week when available.' : '.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={createTimesheetWithOptions}
            variant="contained"
            disabled={submitting}
          >
            {submitting ? 'Creating...' : 'Confirm create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
