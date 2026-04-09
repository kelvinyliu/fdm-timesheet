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
import Divider from '@mui/material/Divider'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PaymentIcon from '@mui/icons-material/Payment'
import StatusBadge from '../../components/shared/StatusBadge'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import PageHeader from '../../components/shared/PageHeader'
import DetailList from '../../components/shared/DetailList.jsx'
import { palette } from '../../theme.js'
import { getTimesheet, processPayment, getTimesheetNotes } from '../../api/timesheets'
import { formatDayName, formatLongDate, formatWeekStart, formatTimestamp } from '../../utils/dateFormatters'
import {
  getConsultantDisplayLabel,
  getWorkBucketDisplayLabel,
  getWorkSummaryDisplayLabel,
} from '../../utils/displayLabels'

function bucketKey(item) {
  return `${item.entryKind}-${item.assignmentId ?? 'INTERNAL'}`
}

export default function FinancePaymentPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const navigate = useNavigate()
  const { id } = useParams()

  const [timesheet, setTimesheet] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [bucketRates, setBucketRates] = useState({})
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
        setBucketRates(
          Object.fromEntries(
            (ts.workSummary ?? []).map((item) => [
              bucketKey(item),
              item.suggestedHourlyRate != null ? String(item.suggestedHourlyRate) : '',
            ])
          )
        )
        if (ts.status === 'COMPLETED') {
          getTimesheetNotes(id).then(setFetchedNotes).catch(() => {})
        }
      })
      .catch((err) => setError(err.message ?? 'Failed to load timesheet'))
      .finally(() => setLoading(false))
  }, [id, refreshKey])

  const workSummary = timesheet?.workSummary ?? []
  const isPaymentReady = workSummary.length > 0 && workSummary.every((item) => {
    const rate = Number(bucketRates[bucketKey(item)])
    return Number.isFinite(rate) && rate > 0
  })
  const estimatedTotal = workSummary.reduce((sum, item) => {
    const rate = Number(bucketRates[bucketKey(item)])
    if (!Number.isFinite(rate) || rate <= 0) return sum
    return sum + rate * Number(item.totalHours ?? 0)
  }, 0)

  async function handleProcessPayment() {
    if (!isPaymentReady) return
    setSubmitting(true)
    setFeedback(null)
    try {
      await processPayment(id, {
        breakdowns: workSummary.map((item) => ({
          entryKind: item.entryKind,
          assignmentId: item.assignmentId ?? null,
          hourlyRate: Number(bucketRates[bucketKey(item)]),
        })),
        notes: notes.trim(),
      })
      setFeedback({ severity: 'success', message: 'Payment processed successfully.' })
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message ?? 'Failed to process payment.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingSpinner />

  const summaryItems = timesheet
    ? [
        {
          key: 'consultant',
          label: 'Consultant',
          value: getConsultantDisplayLabel(timesheet.consultantName),
        },
        {
          key: 'week',
          label: 'Week of',
          value: formatWeekStart(timesheet.weekStart),
        },
        {
          key: 'status',
          label: 'Status',
          value: <StatusBadge status={timesheet.status} />,
        },
        {
          key: 'hours',
          label: 'Total Hours',
          value: (
            <Typography
              variant="body2"
              sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 500 }}
            >
              {timesheet.totalHours ?? '-'}
            </Typography>
          ),
        },
        {
          key: 'buckets',
          label: 'Work Categories',
          value: getWorkSummaryDisplayLabel(workSummary, 3),
        },
      ]
    : []

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
          <Paper sx={{ p: { xs: 2.5, sm: 3 }, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Summary
            </Typography>
            <DetailList items={summaryItems} />
          </Paper>

          <Paper sx={{ p: { xs: 2.5, sm: 3 }, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Work Summary
            </Typography>
            <Stack spacing={1.25}>
              {workSummary.map((item) => (
                <Box
                  key={bucketKey(item)}
                  sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}
                >
                  <Typography variant="body2">
                    {getWorkBucketDisplayLabel(item.bucketLabel)}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}
                  >
                    {item.totalHours}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>

          {timesheet.entries && timesheet.entries.length > 0 && (
            <Paper sx={{ mb: 3 }}>
              <Box sx={{ p: 2, pb: 1 }}>
                <Typography variant="h6">Daily Entries</Typography>
              </Box>
              {isMobile ? (
                <Stack divider={<Divider flexItem />}>
                  {timesheet.entries.map((entry) => (
                    <Box key={entry.id ?? `${entry.date}-${entry.assignmentId ?? 'INTERNAL'}`} sx={{ px: 2, py: 1.75 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: 2,
                          mb: 0.5,
                        }}
                      >
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {formatDayName(entry.date)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {getWorkBucketDisplayLabel(entry.bucketLabel)}
                          </Typography>
                        </Box>
                        <Typography
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                          }}
                        >
                          {entry.hoursWorked}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {formatLongDate(entry.date)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <TableContainer sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Day</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Work Category</TableCell>
                        <TableCell align="right">Hours</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {timesheet.entries.map((entry) => (
                        <TableRow key={entry.id ?? `${entry.date}-${entry.assignmentId ?? 'INTERNAL'}`}>
                          <TableCell>{formatDayName(entry.date)}</TableCell>
                          <TableCell>{formatLongDate(entry.date)}</TableCell>
                          <TableCell>{getWorkBucketDisplayLabel(entry.bucketLabel)}</TableCell>
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
              )}
            </Paper>
          )}

          {timesheet.status === 'APPROVED' && (
            <Paper sx={{ p: { xs: 2.5, sm: 3 } }}>
              <Typography variant="h6" gutterBottom>
                Payment Details
              </Typography>
              <Stack spacing={3}>
                {workSummary.map((item) => (
                  <Box
                    key={bucketKey(item)}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'minmax(220px, 1fr) 140px' },
                      gap: 1.5,
                      alignItems: 'center',
                    }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {getWorkBucketDisplayLabel(item.bucketLabel)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.totalHours}h
                      </Typography>
                    </Box>
                    <TextField
                      label="Rate (&pound;/hr)"
                      type="number"
                      required
                      value={bucketRates[bucketKey(item)] ?? ''}
                      onChange={(event) => setBucketRates((prev) => ({
                        ...prev,
                        [bucketKey(item)]: event.target.value,
                      }))}
                      helperText={item.entryKind === 'CLIENT'
                        ? 'Prefilled from the current client assignment rate.'
                        : 'Enter the Internal rate manually.'}
                      slotProps={{ htmlInput: { min: 0.01, step: '0.01' } }}
                    />
                  </Box>
                ))}

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
                    {isPaymentReady ? `\u00A3${estimatedTotal.toFixed(2)}` : '-'}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.65rem',
                      color: palette.textMuted,
                      display: 'block',
                      mb: workSummary.length > 0 ? 1.5 : 0,
                    }}
                  >
                    summed across all client and Internal categories
                  </Typography>
                  <Stack spacing={0.5}>
                    {workSummary.map((item) => {
                      const rate = Number(bucketRates[bucketKey(item)])
                      const hours = Number(item.totalHours ?? 0)
                      const amount = Number.isFinite(rate) && rate > 0
                        ? (rate * hours).toFixed(2)
                        : null

                      return (
                        <Typography
                          key={`working-${bucketKey(item)}`}
                          variant="caption"
                          sx={{
                            display: 'block',
                            fontFamily: '"JetBrains Mono", monospace',
                            color: palette.textMuted,
                          }}
                        >
                          {`${getWorkBucketDisplayLabel(item.bucketLabel)}: ${hours}h x ${
                            Number.isFinite(rate) && rate > 0 ? `\u00A3${rate.toFixed(2)}` : '-'
                          }${amount ? ` = \u00A3${amount}` : ''}`}
                        </Typography>
                      )
                    })}
                  </Stack>
                </Box>

                <TextField
                  label="Notes"
                  multiline
                  minRows={3}
                  fullWidth
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional notes for this payment"
                />

                <Box>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<PaymentIcon />}
                    onClick={handleProcessPayment}
                    disabled={submitting || !isPaymentReady}
                    fullWidth={isMobile}
                  >
                    Process Payment
                  </Button>
                </Box>
              </Stack>
            </Paper>
          )}

          {timesheet.status === 'COMPLETED' && fetchedNotes.length > 0 && (
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
                      {n.authoredByName ?? 'Finance'} - {formatTimestamp(n.createdAt)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Paper>
          )}
        </>
      )}
    </Box>
  )
}
