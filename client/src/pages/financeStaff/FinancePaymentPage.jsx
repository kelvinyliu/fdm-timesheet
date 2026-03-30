import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'
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
import Alert from '@mui/material/Alert'
import TextField from '@mui/material/TextField'
import Stack from '@mui/material/Stack'
import StatusBadge from '../../components/shared/StatusBadge'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import { getTimesheet, processPayment, getTimesheetNotes } from '../../api/timesheets'
import { formatWeekStart } from '../../utils/dateFormatters'

function getDayName(dateStr) {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-GB', { weekday: 'long' })
}

function formatEntryDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function FinancePaymentPage() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [timesheet, setTimesheet] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dailyRate, setDailyRate] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [fetchedNotes, setFetchedNotes] = useState([])

  useEffect(() => {
    setLoading(true)
    setError(null)
    getTimesheet(id)
      .then((ts) => {
        setTimesheet(ts)
        if (ts.status === 'COMPLETED') {
          getTimesheetNotes(id).then(setFetchedNotes).catch(() => {})
        }
      })
      .catch((err) => setError(err.message ?? 'Failed to load timesheet'))
      .finally(() => setLoading(false))
  }, [id, refreshKey])

  const totalHours = timesheet?.totalHours ? Number(timesheet.totalHours) : 0
  const dailyRateNum = parseFloat(dailyRate)
  const totalPayment =
    dailyRate !== '' && !isNaN(dailyRateNum) && dailyRateNum >= 0
      ? ((dailyRateNum * totalHours) / 8).toFixed(2)
      : null

  async function handleProcessPayment() {
    if (!dailyRate || isNaN(dailyRateNum) || dailyRateNum < 0) return
    setSubmitting(true)
    setFeedback(null)
    try {
      await processPayment(id, { dailyRate: dailyRateNum, notes: notes.trim() })
      setFeedback({ severity: 'success', message: 'Payment processed successfully.' })
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message ?? 'Failed to process payment.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Button variant="outlined" onClick={() => navigate('/finance/timesheets')}>
          Back
        </Button>
        <Typography variant="h5" component="h1">
          Process Payment
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {feedback && (
        <Alert severity={feedback.severity} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      )}

      {timesheet && (
        <>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Summary
            </Typography>
            <Stack spacing={1}>
              <Box display="flex" gap={1}>
                <Typography fontWeight="bold" sx={{ minWidth: 140 }}>Consultant ID:</Typography>
                <Typography>{timesheet.consultantId}</Typography>
              </Box>
              <Box display="flex" gap={1}>
                <Typography fontWeight="bold" sx={{ minWidth: 140 }}>Week of:</Typography>
                <Typography>{formatWeekStart(timesheet.weekStart)}</Typography>
              </Box>
              <Box display="flex" gap={1} alignItems="center">
                <Typography fontWeight="bold" sx={{ minWidth: 140 }}>Status:</Typography>
                <StatusBadge status={timesheet.status} />
              </Box>
              <Box display="flex" gap={1}>
                <Typography fontWeight="bold" sx={{ minWidth: 140 }}>Total Hours:</Typography>
                <Typography>{timesheet.totalHours ?? '—'}</Typography>
              </Box>
            </Stack>
          </Paper>

          {timesheet.entries && timesheet.entries.length > 0 && (
            <Paper sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ p: 2, pb: 1 }}>
                Daily Entries
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Day</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Hours</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {timesheet.entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{getDayName(entry.date)}</TableCell>
                        <TableCell>{formatEntryDate(entry.date)}</TableCell>
                        <TableCell>{entry.hoursWorked}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {timesheet.status === 'APPROVED' && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Payment Details
              </Typography>
              <Stack spacing={3}>
                <TextField
                  label="Daily Rate (£)"
                  type="number"
                  required
                  value={dailyRate}
                  onChange={(e) => setDailyRate(e.target.value)}
                  inputProps={{ min: 0, step: '0.01' }}
                  sx={{ maxWidth: 240 }}
                />

                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Estimated Total Payment
                  </Typography>
                  <Typography variant="h5">
                    {totalPayment !== null ? `£${totalPayment}` : '—'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Calculated as: daily rate × total hours ÷ 8
                  </Typography>
                </Box>

                <TextField
                  label="Notes"
                  multiline
                  minRows={3}
                  fullWidth
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes for this payment"
                />

                <Box>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleProcessPayment}
                    disabled={
                      submitting ||
                      !dailyRate ||
                      isNaN(dailyRateNum) ||
                      dailyRateNum < 0
                    }
                  >
                    Process Payment
                  </Button>
                </Box>
              </Stack>
            </Paper>
          )}

          {timesheet.status === 'COMPLETED' && (
            <>
              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography fontWeight="bold" gutterBottom>
                  Payment Completed
                </Typography>
                This timesheet has been fully processed and payment has been recorded.
              </Alert>

              {fetchedNotes.length > 0 && (
                <Paper sx={{ p: 3, mt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Finance Notes
                  </Typography>
                  <Stack spacing={2}>
                    {fetchedNotes.map((n) => (
                      <Box key={n.id}>
                        <Typography variant="body2">{n.note}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {n.authoredByName ?? 'Finance'} &mdash;{' '}
                          {new Date(n.createdAt).toLocaleString('en-GB', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Paper>
              )}
            </>
          )}
        </>
      )}
    </Box>
  )
}
