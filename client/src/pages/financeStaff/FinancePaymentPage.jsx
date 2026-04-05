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
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PaymentIcon from '@mui/icons-material/Payment'
import StatusBadge from '../../components/shared/StatusBadge'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import PageHeader from '../../components/shared/PageHeader'
import { palette } from '../../theme.js'
import { getTimesheet, processPayment, getTimesheetNotes } from '../../api/timesheets'
import { formatDayName, formatLongDate, formatWeekStart } from '../../utils/dateFormatters'
import { getConsultantDisplayLabel } from '../../utils/displayLabels'

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
  const isDailyRateValid = Number.isFinite(dailyRateNum) && dailyRateNum > 0
  const totalPayment = isDailyRateValid ? ((dailyRateNum * totalHours) / 8).toFixed(2) : null

  async function handleProcessPayment() {
    if (!isDailyRateValid) return
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
      <PageHeader title="Process Payment">
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/finance/timesheets')}
        >
          Back
        </Button>
      </PageHeader>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {feedback && (
        <Alert severity={feedback.severity} sx={{ mb: 3 }} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      )}

      {timesheet && (
        <>
          {/* Summary */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Summary
            </Typography>
            <Box display="grid" gridTemplateColumns="140px 1fr" columnGap={2} rowGap={1.5}>
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                Consultant
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {getConsultantDisplayLabel(timesheet.consultantName)}
              </Typography>

              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                Week of
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {formatWeekStart(timesheet.weekStart)}
              </Typography>

              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                Status
              </Typography>
              <Box>
                <StatusBadge status={timesheet.status} />
              </Box>

              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                Total Hours
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 500 }}
              >
                {timesheet.totalHours ?? '-'}
              </Typography>
            </Box>
          </Paper>

          {/* Entries */}
          {timesheet.entries && timesheet.entries.length > 0 && (
            <Paper sx={{ mb: 3 }}>
              <Box sx={{ p: 2, pb: 1 }}>
                <Typography variant="h6">Daily Entries</Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Day</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">Hours</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {timesheet.entries.map((entry) => (
                      <TableRow key={entry.id ?? entry.date}>
                        <TableCell>{formatDayName(entry.date)}</TableCell>
                        <TableCell>{formatLongDate(entry.date)}</TableCell>
                        <TableCell align="right">
                          <Typography
                            sx={{
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: '0.85rem',
                            }}
                          >
                            {entry.hoursWorked}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {/* Payment form */}
          {timesheet.status === 'APPROVED' && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Payment Details
              </Typography>
              <Stack spacing={3}>
                <TextField
                  label="Daily Rate (&pound;)"
                  type="number"
                  required
                  value={dailyRate}
                  onChange={(e) => setDailyRate(e.target.value)}
                  inputProps={{ min: 0.01, step: '0.01' }}
                  sx={{ maxWidth: 240 }}
                />

                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    border: `1px solid ${palette.border}`,
                    backgroundColor: palette.surfaceMuted,
                  }}
                >
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Estimated Total Payment
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '1.75rem',
                      fontWeight: 600,
                      color: palette.textPrimary,
                    }}
                  >
                    {totalPayment !== null ? `\u00A3${totalPayment}` : '-'}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.65rem',
                      color: palette.textMuted,
                    }}
                  >
                    daily rate x total hours / 8
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
                    startIcon={<PaymentIcon />}
                    onClick={handleProcessPayment}
                    disabled={submitting || !isDailyRateValid}
                  >
                    Process Payment
                  </Button>
                </Box>
              </Stack>
            </Paper>
          )}

          {/* Completed state */}
          {timesheet.status === 'COMPLETED' && (
            <>
              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography fontWeight={600} gutterBottom sx={{ fontSize: '0.85rem' }}>
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
                      <Box
                        key={n.id}
                        sx={{
                          p: 2,
                          borderRadius: 1.5,
                          backgroundColor: palette.surfaceMuted,
                          border: `1px solid ${palette.border}`,
                        }}
                      >
                        <Typography variant="body2">{n.note}</Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '0.65rem',
                            mt: 0.5,
                            display: 'block',
                          }}
                        >
                          {n.authoredByName ?? 'Finance'} -{' '}
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
