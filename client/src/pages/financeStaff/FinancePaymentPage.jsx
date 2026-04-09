import { useEffect, useMemo, useState } from 'react'
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

function formatCurrency(value) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function buildCompletedSummaryItems(timesheet) {
  if (timesheet?.status !== 'COMPLETED') return []

  return [
    {
      key: 'received',
      label: 'Money Received',
      value: timesheet.totalBillAmount != null ? formatCurrency(timesheet.totalBillAmount) : '-',
    },
    {
      key: 'paidOut',
      label: 'Paid Out',
      value: timesheet.totalPayAmount != null ? formatCurrency(timesheet.totalPayAmount) : '-',
    },
    {
      key: 'net',
      label: 'Net Margin',
      value: timesheet.marginAmount != null ? formatCurrency(timesheet.marginAmount) : '-',
    },
  ]
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
              {
                billRate: item.suggestedBillRate != null ? String(item.suggestedBillRate) : '',
                payRate: item.suggestedPayRate != null ? String(item.suggestedPayRate) : '',
              },
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
  const computedBuckets = useMemo(() => (
    workSummary.map((item) => {
      const values = bucketRates[bucketKey(item)] ?? { billRate: '', payRate: '' }
      const billRate = Number(values.billRate)
      const payRate = Number(values.payRate)
      const hours = Number(item.totalHours ?? 0)
      const hasValidBillRate = item.entryKind === 'INTERNAL'
        ? billRate === 0
        : Number.isFinite(billRate) && billRate > 0
      const hasValidPayRate = Number.isFinite(payRate) && payRate > 0

      return {
        ...item,
        values,
        hours,
        billRate,
        payRate,
        hasValidBillRate,
        hasValidPayRate,
        billAmount: hasValidBillRate ? billRate * hours : null,
        payAmount: hasValidPayRate ? payRate * hours : null,
      }
    })
  ), [bucketRates, workSummary])

  const isPaymentReady = computedBuckets.length > 0 && computedBuckets.every((item) => (
    item.hasValidBillRate && item.hasValidPayRate
  ))

  const totals = computedBuckets.reduce((sum, item) => ({
    incoming: sum.incoming + (item.billAmount ?? 0),
    outgoing: sum.outgoing + (item.payAmount ?? 0),
  }), { incoming: 0, outgoing: 0 })
  const netMargin = totals.incoming - totals.outgoing

  async function handleProcessPayment() {
    if (!isPaymentReady) return
    setSubmitting(true)
    setFeedback(null)
    try {
      await processPayment(id, {
        breakdowns: computedBuckets.map((item) => ({
          entryKind: item.entryKind,
          assignmentId: item.assignmentId ?? null,
          billRate: item.entryKind === 'INTERNAL' ? 0 : Number(item.values.billRate),
          payRate: Number(item.values.payRate),
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
        ...buildCompletedSummaryItems(timesheet),
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
                {computedBuckets.map((item) => (
                  <Box
                    key={bucketKey(item)}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: '1fr',
                        md: 'minmax(220px, 1fr) minmax(160px, 180px) minmax(160px, 180px)',
                      },
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
                      label="Client Bill Rate (&pound;/hr)"
                      type="number"
                      required={item.entryKind === 'CLIENT'}
                      value={bucketRates[bucketKey(item)]?.billRate ?? ''}
                      onChange={(event) => setBucketRates((prev) => ({
                        ...prev,
                        [bucketKey(item)]: {
                          ...(prev[bucketKey(item)] ?? {}),
                          billRate: event.target.value,
                        },
                      }))}
                      helperText={item.entryKind === 'CLIENT'
                        ? 'Prefilled from the client assignment and can be overridden for this payment.'
                        : 'Internal work does not generate incoming client revenue.'}
                      slotProps={{ htmlInput: { min: 0, step: '0.01', readOnly: item.entryKind === 'INTERNAL' } }}
                      disabled={item.entryKind === 'INTERNAL'}
                    />
                    <TextField
                      label="Consultant Pay Rate (&pound;/hr)"
                      type="number"
                      required
                      value={bucketRates[bucketKey(item)]?.payRate ?? ''}
                      onChange={(event) => setBucketRates((prev) => ({
                        ...prev,
                        [bucketKey(item)]: {
                          ...(prev[bucketKey(item)] ?? {}),
                          payRate: event.target.value,
                        },
                      }))}
                      helperText={item.suggestedPayRate != null
                        ? 'Prefilled from the consultant default pay rate.'
                        : 'No consultant default pay rate is set yet.'}
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
                    Finance Totals
                  </Typography>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    sx={{ mb: computedBuckets.length > 0 ? 1.5 : 0 }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" sx={{ color: palette.textMuted, display: 'block' }}>
                        Total Incoming
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '1.35rem',
                          fontWeight: 600,
                          color: palette.textPrimary,
                        }}
                      >
                        {isPaymentReady ? formatCurrency(totals.incoming) : '-'}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" sx={{ color: palette.textMuted, display: 'block' }}>
                        Total Outgoing
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '1.35rem',
                          fontWeight: 600,
                          color: palette.textPrimary,
                        }}
                      >
                        {isPaymentReady ? formatCurrency(totals.outgoing) : '-'}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" sx={{ color: palette.textMuted, display: 'block' }}>
                        Net Margin
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '1.35rem',
                          fontWeight: 600,
                          color: palette.textPrimary,
                        }}
                      >
                        {isPaymentReady ? formatCurrency(netMargin) : '-'}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack spacing={0.5}>
                    {computedBuckets.map((item) => {
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
                          {`${getWorkBucketDisplayLabel(item.bucketLabel)}: ${item.hours}h · In ${
                            item.hasValidBillRate ? formatCurrency(item.billAmount ?? 0) : '-'
                          } · Out ${
                            item.hasValidPayRate ? formatCurrency(item.payAmount ?? 0) : '-'
                          }${
                            item.hasValidBillRate && item.hasValidPayRate
                              ? ` · Net ${formatCurrency((item.billAmount ?? 0) - (item.payAmount ?? 0))}`
                              : ''
                          }`}
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
