import { useEffect, useMemo, useState, Fragment } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
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
import InputAdornment from '@mui/material/InputAdornment'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PaymentIcon from '@mui/icons-material/Payment'
import FastForwardIcon from '@mui/icons-material/FastForward'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import PageHeader from '../../components/shared/PageHeader'
import DetailList from '../../components/shared/DetailList.jsx'
import TimesheetStatusDisplay from '../../components/shared/TimesheetStatusDisplay.jsx'
import { useConfirmation } from '../../context/useConfirmation.js'
import {
  useGuardedNavigate,
  useUnsavedChangesGuard,
} from '../../context/useUnsavedChanges.js'
import { palette } from '../../theme.js'
import { getTimesheet, processPayment, getTimesheetNotes, getTimesheets } from '../../api/timesheets'
import { formatDayName, buildWeekDates, formatWeekStart, formatTimestamp } from '../../utils/dateFormatters'
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
      label: 'Money In',
      value: (
        <Typography
          variant="body2"
          fontWeight={700}
          sx={{ color: palette.success, fontFamily: '"JetBrains Mono", monospace' }}
        >
          {timesheet.totalBillAmount != null ? formatCurrency(timesheet.totalBillAmount) : '-'}
        </Typography>
      ),
    },
    {
      key: 'paidOut',
      label: 'Money Out',
      value: (
        <Typography
          variant="body2"
          fontWeight={700}
          sx={{ color: palette.error, fontFamily: '"JetBrains Mono", monospace' }}
        >
          {timesheet.totalPayAmount != null ? formatCurrency(timesheet.totalPayAmount) : '-'}
        </Typography>
      ),
    },
    {
      key: 'net',
      label: 'Net Margin',
      value: (
        <Typography
          variant="body2"
          fontWeight={700}
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            color: (timesheet.marginAmount ?? 0) >= 0 ? palette.success : palette.error,
          }}
        >
          {timesheet.marginAmount != null ? formatCurrency(timesheet.marginAmount) : '-'}
        </Typography>
      ),
    },
  ]
}

function getBucketValue(entryKind, assignmentId) {
  return entryKind === 'CLIENT' ? assignmentId || '' : 'INTERNAL'
}

function entriesToMatrixRows(entries) {
  const rowMap = new Map()
  entries.forEach(entry => {
    const key = getBucketValue(entry.entryKind, entry.assignmentId)
    if (!rowMap.has(key)) {
      rowMap.set(key, {
        id: key,
        entryKind: entry.entryKind,
        assignmentId: entry.assignmentId,
        bucketLabel: entry.bucketLabel,
        hours: {}
      })
    }
    rowMap.get(key).hours[entry.date] = entry.hoursWorked
  })
  return Array.from(rowMap.values())
}

function serializePaymentDraft(bucketRates, notes) {
  return JSON.stringify({
    notes,
    rates: Object.entries(bucketRates)
      .map(([key, value]) => ({
        key,
        billRate: value?.billRate ?? '',
        payRate: value?.payRate ?? '',
      }))
      .sort((a, b) => a.key.localeCompare(b.key)),
  })
}

export default function FinancePaymentPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const location = useLocation()
  const navigate = useNavigate()
  const guardedNavigate = useGuardedNavigate()
  const { id } = useParams()
  const { confirm } = useConfirmation()

  const [timesheet, setTimesheet] = useState(null)
  const [approvedQueue, setApprovedQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [bucketRates, setBucketRates] = useState({})
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [fetchedNotes, setFetchedNotes] = useState([])
  const [savedDraftSnapshot, setSavedDraftSnapshot] = useState('{"notes":"","rates":[]}')

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([getTimesheet(id), getTimesheets()])
      .then(([ts, all]) => {
        setTimesheet(ts)
        setApprovedQueue(all.filter(t => t.status === 'APPROVED'))
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
        setSavedDraftSnapshot(
          serializePaymentDraft(
            Object.fromEntries(
              (ts.workSummary ?? []).map((item) => [
                bucketKey(item),
                {
                  billRate: item.suggestedBillRate != null ? String(item.suggestedBillRate) : '',
                  payRate: item.suggestedPayRate != null ? String(item.suggestedPayRate) : '',
                },
              ])
            ),
            ''
          )
        )
        setNotes('')
        if (ts.status === 'COMPLETED') {
          getTimesheetNotes(id).then(setFetchedNotes).catch(() => {})
        }
      })
      .catch((err) => setError(err.message ?? 'Failed to load timesheet'))
      .finally(() => setLoading(false))
  }, [id, refreshKey])

  const workSummary = timesheet?.workSummary
  const computedBuckets = useMemo(() => (
    (workSummary ?? []).map((item) => {
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

  function getNextApprovedId() {
    const idx = approvedQueue.findIndex(ts => ts.id === id)
    if (idx !== -1 && idx + 1 < approvedQueue.length) {
      return approvedQueue[idx + 1].id
    }
    const nextUnseen = approvedQueue.find(ts => ts.id !== id)
    return nextUnseen ? nextUnseen.id : null
  }

  const nextId = getNextApprovedId()
  const isDirty = serializePaymentDraft(bucketRates, notes) !== savedDraftSnapshot

  useUnsavedChangesGuard({
    isDirty,
    title: 'Leave with unsaved payment changes?',
    message: 'You have adjusted rates or notes on this payment screen. Leaving now will discard those local changes.',
    variant: 'warning',
    discardLabel: 'Discard changes',
    stayLabel: 'Keep editing',
  })

  async function handleProcessPayment(goNext = false) {
    if (!isPaymentReady) return

    const result = await confirm({
      variant: 'danger',
      title: goNext ? 'Process payment and move to the next sheet?' : 'Process payment?',
      message: goNext
        ? 'This will mark the current timesheet as paid using the values below and then open the next approved timesheet.'
        : 'This will mark the current timesheet as paid using the values below.',
      confirmLabel: goNext ? 'Process and continue' : 'Process payment',
      cancelLabel: 'Review again',
      summaryItems: [
        { key: 'consultant', label: 'Consultant', value: getConsultantDisplayLabel(timesheet.consultantName) },
        { key: 'week', label: 'Week of', value: formatWeekStart(timesheet.weekStart) },
        { key: 'hours', label: 'Total hours', value: `${timesheet.totalHours ?? 0}h` },
        { key: 'incoming', label: 'Money in', value: formatCurrency(totals.incoming) },
        { key: 'outgoing', label: 'Money out', value: formatCurrency(totals.outgoing) },
        { key: 'margin', label: 'Net margin', value: formatCurrency(netMargin) },
      ],
    })

    if (result !== 'confirm') return

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
      
      if (goNext && nextId) {
        setFeedback({ severity: 'success', message: 'Payment processed. Showing next approved timesheet.' })
        navigate(`/finance/timesheets/${nextId}`, { replace: true })
      } else {
        setFeedback({ severity: 'success', message: 'Payment processed successfully.' })
        setRefreshKey((k) => k + 1)
      }
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
          value: <TimesheetStatusDisplay status={timesheet.status} submittedLate={timesheet.submittedLate} />,
        },
        {
          key: 'hours',
          label: 'Total Hours',
          value: (
            <Typography
              variant="body2"
              sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700 }}
            >
              {timesheet.totalHours ?? '-'}
            </Typography>
          ),
        },
        {
          key: 'buckets',
          label: 'Work Categories',
          value: getWorkSummaryDisplayLabel(workSummary ?? [], 3),
        },
        ...buildCompletedSummaryItems(timesheet),
      ]
    : []

  const backDestination = location.state?.returnTo ?? '/finance/timesheets?tab=to-pay'
  const weekDates = timesheet ? buildWeekDates(timesheet.weekStart) : []
  const matrixRows = timesheet ? entriesToMatrixRows(timesheet.entries ?? []) : []

  return (
    <Box>
      <PageHeader title="Process Payment">
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => guardedNavigate(backDestination)}
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
              {(workSummary ?? []).map((item) => (
                <Box
                  key={bucketKey(item)}
                  sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}
                >
                  <Typography variant="body2">
                    {getWorkBucketDisplayLabel(item.bucketLabel)}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700 }}
                  >
                    {item.totalHours}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>

          {timesheet.entries && timesheet.entries.length > 0 && (
            <Paper sx={{ mb: 3, p: { xs: 0, sm: 0 }, overflow: 'hidden' }}>
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: palette.sidebarBg, color: palette.textInverse }}>
                 <Typography variant="h6" sx={{ color: palette.textInverse }}>Weekly Matrix</Typography>
                 <Typography variant="h6" sx={{ fontFamily: '"JetBrains Mono", monospace', color: palette.primary }}>
                   {timesheet.totalHours ?? '-'}h Total
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
                      <TableCell align="center" sx={{ width: 80 }}>Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {matrixRows.map(row => {
                      const rowTotal = weekDates.reduce((sum, date) => sum + (parseFloat(row.hours[date]) || 0), 0)
                      return (
                        <TableRow key={row.id}>
                          <TableCell sx={{ borderRight: `2px solid ${palette.border}`, fontWeight: 600 }}>
                            {getWorkBucketDisplayLabel(row.bucketLabel)}
                          </TableCell>
                          {weekDates.map(date => {
                            const val = row.hours[date]
                            return (
                              <TableCell key={date} align="center" sx={{ p: 1, borderRight: `2px solid ${palette.border}` }}>
                                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', color: val ? palette.textPrimary : palette.textMuted }}>
                                  {val || '-'}
                                </Typography>
                              </TableCell>
                            )
                          })}
                          <TableCell align="center">
                            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700 }}>
                              {rowTotal.toFixed(2)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {timesheet.status === 'APPROVED' && (
            <Paper sx={{ p: { xs: 2.5, sm: 3 }, backgroundColor: palette.surfaceRaised }}>
              <Typography variant="h6" gutterBottom>
                Payment Details
              </Typography>
              <Alert severity="info" sx={{ mb: 4 }}>
                Rates are pre-filled from client assignments and consultant defaults.
                Overrides only affect this payment processing.
              </Alert>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: '1fr 160px 160px',
                  },
                  columnGap: 2,
                  rowGap: { xs: 4, sm: 3 },
                  alignItems: 'start',
                }}
              >
                {!isMobile && (
                  <>
                    <Typography variant="caption" fontWeight={700} sx={{ color: palette.textPrimary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Work Category
                    </Typography>
                    <Typography variant="caption" fontWeight={700} sx={{ color: palette.textPrimary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Client Bill Rate
                    </Typography>
                    <Typography variant="caption" fontWeight={700} sx={{ color: palette.textPrimary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Consultant Pay Rate
                    </Typography>
                    <Box sx={{ gridColumn: '1 / -1', mt: -1 }}>
                      <Divider />
                    </Box>
                  </>
                )}

                {computedBuckets.map((item) => (
                  <Fragment key={bucketKey(item)}>
                    <Box sx={{ pt: { sm: 1 } }}>
                      <Typography variant="body2" fontWeight={700}>
                        {getWorkBucketDisplayLabel(item.bucketLabel)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {item.totalHours} hours recorded
                      </Typography>
                    </Box>

                    <TextField
                      label={isMobile ? "Client Bill Rate (£/hr)" : ""}
                      type="number"
                      size="small"
                      required={item.entryKind === 'CLIENT'}
                      value={bucketRates[bucketKey(item)]?.billRate ?? ''}
                      onChange={(event) => setBucketRates((prev) => ({
                        ...prev,
                        [bucketKey(item)]: {
                          ...(prev[bucketKey(item)] ?? {}),
                          billRate: event.target.value,
                        },
                      }))}
                      slotProps={{
                        input: {
                          startAdornment: <InputAdornment position="start">£</InputAdornment>,
                          readOnly: item.entryKind === 'INTERNAL',
                        },
                        htmlInput: { min: 0, step: '0.01' }
                      }}
                      disabled={item.entryKind === 'INTERNAL'}
                      fullWidth
                    />

                    <TextField
                      label={isMobile ? "Consultant Pay Rate (£/hr)" : ""}
                      type="number"
                      size="small"
                      required
                      value={bucketRates[bucketKey(item)]?.payRate ?? ''}
                      onChange={(event) => setBucketRates((prev) => ({
                        ...prev,
                        [bucketKey(item)]: {
                          ...(prev[bucketKey(item)] ?? {}),
                          payRate: event.target.value,
                        },
                      }))}
                      slotProps={{
                        input: {
                          startAdornment: <InputAdornment position="start">£</InputAdornment>,
                        },
                        htmlInput: { min: 0.01, step: '0.01' }
                      }}
                      fullWidth
                    />
                  </Fragment>
                ))}
              </Box>

              <Box
                sx={{
                  p: 3,
                  mt: 5,
                  borderTop: `4px solid ${palette.textPrimary}`,
                  borderBottom: `4px solid ${palette.textPrimary}`,
                  backgroundColor: palette.surface,
                }}
              >
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Finance Totals
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                    gap: 3,
                    mb: computedBuckets.length > 0 ? 4 : 0,
                  }}
                >
                  <Box>
                    <Typography variant="caption" sx={{ color: palette.textMuted, display: 'block', mb: 0.5, fontWeight: 700 }}>
                      MONEY IN
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '1.8rem',
                        fontWeight: 800,
                        color: isPaymentReady ? palette.success : palette.textPrimary,
                        lineHeight: 1
                      }}
                    >
                      {isPaymentReady ? formatCurrency(totals.incoming) : '-'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: palette.textMuted, display: 'block', mb: 0.5, fontWeight: 700 }}>
                      MONEY OUT
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '1.8rem',
                        fontWeight: 800,
                        color: isPaymentReady ? palette.error : palette.textPrimary,
                        lineHeight: 1
                      }}
                    >
                      {isPaymentReady ? formatCurrency(totals.outgoing) : '-'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: palette.textMuted, display: 'block', mb: 0.5, fontWeight: 700 }}>
                      NET MARGIN
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '1.8rem',
                        fontWeight: 800,
                        color: isPaymentReady
                          ? netMargin >= 0
                            ? palette.success
                            : palette.error
                          : palette.textPrimary,
                        lineHeight: 1
                      }}
                    >
                      {isPaymentReady ? formatCurrency(netMargin) : '-'}
                    </Typography>
                  </Box>
                </Box>

                {computedBuckets.length > 0 && (
                  <Stack spacing={1} sx={{ pt: 2, borderTop: `2px solid ${palette.border}` }}>
                    {computedBuckets.map((item) => {
                      const itemMargin = (item.billAmount ?? 0) - (item.payAmount ?? 0)
                      return (
                        <Box
                          key={`working-${bucketKey(item)}`}
                          sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            gap: 1,
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '0.725rem',
                          }}
                        >
                          <Typography variant="inherit" sx={{ fontWeight: 600, color: palette.textSecondary, minWidth: 120 }}>
                            {getWorkBucketDisplayLabel(item.bucketLabel)}:
                          </Typography>
                          <Typography variant="inherit" sx={{ color: palette.textMuted }}>
                            {item.hours}h
                          </Typography>
                          <Typography variant="inherit" sx={{ color: palette.border }}>|</Typography>
                          <Typography variant="inherit" sx={{ color: palette.success, fontWeight: 500 }}>
                            In {item.hasValidBillRate ? formatCurrency(item.billAmount ?? 0) : '-'}
                          </Typography>
                          <Typography variant="inherit" sx={{ color: palette.border }}>|</Typography>
                          <Typography variant="inherit" sx={{ color: palette.error, fontWeight: 500 }}>
                            Out {item.hasValidPayRate ? formatCurrency(item.payAmount ?? 0) : '-'}
                          </Typography>
                          {item.hasValidBillRate && item.hasValidPayRate && (
                            <>
                              <Typography variant="inherit" sx={{ color: palette.border }}>|</Typography>
                              <Typography
                                variant="inherit"
                                sx={{
                                  fontWeight: 700,
                                  color: itemMargin >= 0 ? palette.success : palette.error,
                                }}
                              >
                                Net {formatCurrency(itemMargin)}
                              </Typography>
                            </>
                          )}
                        </Box>
                      )
                    })}
                  </Stack>
                )}
              </Box>

              <Box sx={{ mt: 4 }}>
                <TextField
                  label="Payment Notes"
                  multiline
                  minRows={3}
                  fullWidth
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional notes for this payment (e.g. processing references)"
                />
              </Box>

              <Box sx={{ mt: 3 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    startIcon={<PaymentIcon />}
                    onClick={() => handleProcessPayment(false)}
                    disabled={submitting || !isPaymentReady}
                    fullWidth={isMobile}
                  >
                    Process Payment
                  </Button>
                  {nextId && (
                    <Button
                      variant="contained"
                      color="primary"
                      size="large"
                      startIcon={<FastForwardIcon />}
                      onClick={() => handleProcessPayment(true)}
                      disabled={submitting || !isPaymentReady}
                      fullWidth={isMobile}
                    >
                      Process & Next
                    </Button>
                  )}
                </Stack>
              </Box>
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
                      borderRadius: 0,
                      backgroundColor: palette.surfaceMuted,
                      border: `2px solid ${palette.border}`,
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
