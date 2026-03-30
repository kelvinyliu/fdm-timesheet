import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import Divider from '@mui/material/Divider'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import { getTimesheet, updateEntries, submitTimesheet, autofillTimesheet } from '../../api/timesheets'
import { formatWeekStart } from '../../utils/dateFormatters'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function addDays(dateStr, days) {
  const date = new Date(dateStr + 'T00:00:00')
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function buildWeekDates(weekStart) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

function buildInitialHours(weekStart, existingEntries) {
  const dates = buildWeekDates(weekStart)
  return dates.map((date) => {
    const match = existingEntries.find((e) => e.date === date || e.date?.slice(0, 10) === date)
    return match ? String(parseFloat(match.hoursWorked) || 0) : '0'
  })
}

export default function TimesheetEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [timesheet, setTimesheet] = useState(null)
  const [hours, setHours] = useState(Array(7).fill('0'))
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)

  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [autofilling, setAutofilling] = useState(false)

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })

  useEffect(() => {
    getTimesheet(id)
      .then((ts) => {
        if (ts.status !== 'DRAFT') {
          navigate(`/consultant/timesheets/${id}`, { replace: true })
          return
        }
        setTimesheet(ts)
        setHours(buildInitialHours(ts.weekStart, ts.entries ?? []))
      })
      .catch((err) => setFetchError(err.message ?? 'Failed to load timesheet'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  function handleHoursChange(index, value) {
    setHours((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  function getEntriesPayload() {
    const dates = buildWeekDates(timesheet.weekStart)
    return dates.map((date, i) => ({
      date,
      hoursWorked: parseFloat(hours[i]) || 0,
    }))
  }

  function showSnackbar(message, severity = 'success') {
    setSnackbar({ open: true, message, severity })
  }

  async function handleSaveDraft() {
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
      navigate(`/consultant/timesheets/${id}`)
    } catch (err) {
      showSnackbar(err.message ?? 'Failed to submit timesheet.', 'error')
      setSubmitting(false)
    }
  }

  async function handleAutofill() {
    setAutofilling(true)
    try {
      const prevEntries = await autofillTimesheet(id)
      if (!prevEntries || prevEntries.length === 0) {
        showSnackbar('No previous week entries found.', 'info')
        return
      }
      const dates = buildWeekDates(timesheet.weekStart)
      const newHours = dates.map((date) => {
        const match = prevEntries.find(
          (e) => e.date === date || e.date?.slice(0, 10) === date
        )
        return match ? String(parseFloat(match.hoursWorked) || 0) : '0'
      })
      setHours(newHours)
      showSnackbar('Hours filled from previous week.')
    } catch (err) {
      showSnackbar(err.message ?? 'Autofill failed.', 'error')
    } finally {
      setAutofilling(false)
    }
  }

  const totalHours = hours.reduce((sum, h) => sum + (parseFloat(h) || 0), 0)

  if (loading) return <LoadingSpinner />

  if (fetchError) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {fetchError}
        </Alert>
        <Button variant="outlined" onClick={() => navigate('/consultant/timesheets')}>
          Back to Timesheets
        </Button>
      </Box>
    )
  }

  const weekDates = buildWeekDates(timesheet.weekStart)
  const isBusy = saving || submitting || autofilling

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h1">
          Edit Timesheet
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Week of {formatWeekStart(timesheet.weekStart)}
        </Typography>
      </Box>

      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button
          variant="outlined"
          size="small"
          onClick={handleAutofill}
          disabled={isBusy}
        >
          {autofilling ? 'Loading…' : 'Autofill from last week'}
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Day</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="right">Hours Worked</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {weekDates.map((date, i) => (
              <TableRow key={date}>
                <TableCell>{DAY_LABELS[i]}</TableCell>
                <TableCell>{formatWeekStart(date)}</TableCell>
                <TableCell align="right" sx={{ py: 0.5 }}>
                  <TextField
                    type="number"
                    value={hours[i]}
                    onChange={(e) => handleHoursChange(i, e.target.value)}
                    size="small"
                    slotProps={{
                      htmlInput: { min: 0, max: 24, step: 0.5, style: { textAlign: 'right', width: 80 } },
                    }}
                    disabled={isBusy}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Divider sx={{ mb: 2 }} />

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="subtitle1">
          <strong>Total Hours:</strong> {totalHours % 1 === 0 ? totalHours : totalHours.toFixed(1)}
        </Typography>
      </Box>

      <Box display="flex" gap={2}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSaveDraft}
          disabled={isBusy}
        >
          {saving ? 'Saving…' : 'Save Draft'}
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleSubmit}
          disabled={isBusy}
        >
          {submitting ? 'Submitting…' : 'Submit Timesheet'}
        </Button>
        <Button
          variant="outlined"
          onClick={() => navigate('/consultant/timesheets')}
          disabled={isBusy}
        >
          Cancel
        </Button>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
