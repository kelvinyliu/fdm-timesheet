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
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import PageHeader from '../../components/shared/PageHeader'
import { createTimesheet, autofillTimesheet, updateEntries, getTimesheets } from '../../api/timesheets'
import { getAssignments } from '../../api/assignments'
import { formatWeekStart, getCurrentMonday } from '../../utils/dateFormatters'

export default function TimesheetCreatePage() {
  const navigate = useNavigate()
  const [weekStart] = useState(() => getCurrentMonday())
  const [assignmentId, setAssignmentId] = useState('')
  const [autofill, setAutofill] = useState(false)
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  useEffect(() => {
    Promise.all([getAssignments(), getTimesheets()])
      .then(([fetchedAssignments, all]) => {
        const activeDraft = all.find(
          (ts) => ts.status === 'DRAFT' || ts.status === 'PENDING'
        )
        if (activeDraft) {
          navigate(
            activeDraft.status === 'DRAFT'
              ? `/consultant/timesheets/${activeDraft.id}/edit`
              : `/consultant/timesheets/${activeDraft.id}`,
            { replace: true }
          )
          return
        }

        const hasTimesheetThisWeek = all.some((ts) => ts.weekStart === getCurrentMonday())
        if (hasTimesheetThisWeek) {
          navigate('/consultant/timesheets', { replace: true })
          return
        }

        setAssignments(fetchedAssignments)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitError(null)
    setSubmitting(true)
    try {
      const body = { weekStart }
      if (assignmentId) body.assignmentId = assignmentId

      const newTimesheet = await createTimesheet(body)
      const newId = newTimesheet.id

      if (autofill) {
        try {
          const prevEntries = await autofillTimesheet(newId)
          if (prevEntries && prevEntries.length > 0) {
            const entries = prevEntries.map((e) => ({
              date: e.date,
              hoursWorked: parseFloat(e.hoursWorked) || 0,
            }))
            await updateEntries(newId, entries)
          }
        } catch {
          // Autofill failing is non-fatal
        }
      }

      navigate(`/consultant/timesheets/${newId}/edit`)
    } catch (err) {
      setSubmitError(err.message ?? 'Failed to create timesheet.')
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <Box>
      <PageHeader
        title="New Timesheet"
        subtitle={`Week of ${formatWeekStart(weekStart)}`}
      />

      <Paper sx={{ p: 4, maxWidth: 480 }}>
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
                  color: '#3D5A80',
                  '&.Mui-checked': { color: '#3D5A80' },
                }}
              />
            }
            label="Copy hours from previous week"
            sx={{ mb: 3, display: 'block' }}
          />

          <Box display="flex" gap={2}>
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
          </Box>
        </Box>
      </Paper>
    </Box>
  )
}
