import { useEffect, useState } from 'react'
import { useLoaderData, useLocation, useNavigate, useParams, useRevalidator } from 'react-router'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import FinanceNotesPanel from './FinanceNotesPanel.jsx'
import PaymentDetailsPanel from './PaymentDetailsPanel.jsx'
import PageHeader from '../../components/shared/PageHeader'
import DetailList from '../../components/shared/DetailList.jsx'
import SaveStateBanner from '../../components/shared/SaveStateBanner.jsx'
import TimesheetStatusDisplay from '../../components/shared/TimesheetStatusDisplay.jsx'
import WeeklyMatrix from '../../components/shared/WeeklyMatrix.jsx'
import { useConfirmation } from '../../context/useConfirmation.js'
import { useGuardedNavigate, useUnsavedChangesGuard } from '../../context/useUnsavedChanges.js'
import { palette } from '../../theme.js'
import { processPayment } from '../../api/timesheets'
import { formatCurrency } from '../../utils/currency.js'
import { buildWeekDates, formatWeekStart } from '../../utils/dateFormatters'
import {
  getSubmitterDisplayLabel,
  getWorkBucketDisplayLabel,
  getWorkSummaryDisplayLabel,
} from '../../utils/displayLabels'
import { entriesToReadOnlyMatrixRows, getWorkBucketKey } from '../../utils/timesheetMatrix.js'

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

function buildInitialBucketRates(timesheet) {
  return Object.fromEntries(
    (timesheet?.workSummary ?? []).map((item) => [
      getWorkBucketKey(item),
      {
        billRate: item.suggestedBillRate != null ? String(item.suggestedBillRate) : '',
        payRate: item.suggestedPayRate != null ? String(item.suggestedPayRate) : '',
      },
    ])
  )
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
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const location = useLocation()
  const navigate = useNavigate()
  const revalidator = useRevalidator()
  const guardedNavigate = useGuardedNavigate()
  const { id } = useParams()
  const { confirm } = useConfirmation()
  const { timesheet, approvedQueue, fetchedNotes, error } = useLoaderData()

  const [bucketRates, setBucketRates] = useState(() => buildInitialBucketRates(timesheet))
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [savedDraftSnapshot, setSavedDraftSnapshot] = useState(() =>
    serializePaymentDraft(buildInitialBucketRates(timesheet), '')
  )

  useEffect(() => {
    const initialRates = buildInitialBucketRates(timesheet)
    setBucketRates(initialRates)
    setSavedDraftSnapshot(serializePaymentDraft(initialRates, ''))
    setNotes('')
  }, [timesheet])

  const workSummary = timesheet?.workSummary
  const computedBuckets = (workSummary ?? []).map((item) => {
    const values = bucketRates[getWorkBucketKey(item)] ?? { billRate: '', payRate: '' }
    const billRate = Number(values.billRate)
    const payRate = Number(values.payRate)
    const hours = Number(item.totalHours ?? 0)
    const hasValidBillRate =
      item.entryKind === 'INTERNAL' ? billRate === 0 : Number.isFinite(billRate) && billRate > 0
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

  const isPaymentReady =
    computedBuckets.length > 0 &&
    computedBuckets.every((item) => item.hasValidBillRate && item.hasValidPayRate)

  const totals = computedBuckets.reduce(
    (sum, item) => ({
      incoming: sum.incoming + (item.billAmount ?? 0),
      outgoing: sum.outgoing + (item.payAmount ?? 0),
    }),
    { incoming: 0, outgoing: 0 }
  )
  const netMargin = totals.incoming - totals.outgoing
  const invalidBucketCount = computedBuckets.filter(
    (item) => !item.hasValidBillRate || !item.hasValidPayRate
  ).length

  function getNextApprovedId() {
    const idx = approvedQueue.findIndex((ts) => ts.id === id)
    if (idx !== -1 && idx + 1 < approvedQueue.length) {
      return approvedQueue[idx + 1].id
    }
    const nextUnseen = approvedQueue.find((ts) => ts.id !== id)
    return nextUnseen ? nextUnseen.id : null
  }

  const nextId = getNextApprovedId()
  const isDirty = serializePaymentDraft(bucketRates, notes) !== savedDraftSnapshot
  const disabledReason =
    computedBuckets.length === 0
      ? 'No rate-bearing work categories are available for payment on this timesheet.'
      : invalidBucketCount > 0
        ? `Add valid bill and pay rates for ${invalidBucketCount} work categor${invalidBucketCount === 1 ? 'y' : 'ies'} before processing.`
        : ''
  const paymentState = submitting
    ? { state: 'saving', message: 'Processing payment...' }
    : feedback?.severity === 'error'
      ? { state: 'error', message: 'Payment processing failed' }
      : isDirty
        ? {
            state: 'dirty',
            message: `${Object.keys(bucketRates).length > 0 ? 'Rate' : 'Payment'} changes ready to process`,
          }
        : isPaymentReady
          ? { state: 'saved', message: 'Rates complete and ready to process' }
          : { state: 'idle', message: 'Complete the required rate fields' }

  useUnsavedChangesGuard({
    isDirty,
    title: 'Leave with unsaved payment changes?',
    message:
      'You have adjusted rates or notes on this payment screen. Leaving now will discard those local changes.',
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
        {
          key: 'submitter',
          label: 'Submitter',
          value: getSubmitterDisplayLabel(timesheet.consultantName),
        },
        { key: 'week', label: 'Week of', value: formatWeekStart(timesheet.weekStart) },
        { key: 'hours', label: 'Total hours', value: `${timesheet.totalHours != null ? Number(timesheet.totalHours).toFixed(2) : 0}h` },
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
        setFeedback({
          severity: 'success',
          message: 'Payment processed. Showing next approved timesheet.',
        })
        navigate(`/finance/timesheets/${nextId}`, { replace: true })
      } else {
        setFeedback({ severity: 'success', message: 'Payment processed successfully.' })
        revalidator.revalidate()
      }
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message ?? 'Failed to process payment.' })
    } finally {
      setSubmitting(false)
    }
  }

  const summaryItems = timesheet
    ? [
        {
          key: 'submitter',
          label: 'Submitter',
          value: getSubmitterDisplayLabel(timesheet.consultantName),
        },
        {
          key: 'week',
          label: 'Week of',
          value: formatWeekStart(timesheet.weekStart),
        },
        {
          key: 'status',
          label: 'Status',
          value: (
            <TimesheetStatusDisplay
              status={timesheet.status}
              submittedLate={timesheet.submittedLate}
            />
          ),
        },
        {
          key: 'hours',
          label: 'Total Hours',
          value: (
            <Typography
              variant="body2"
              sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700 }}
            >
              {timesheet.totalHours != null ? Number(timesheet.totalHours).toFixed(2) : '-'}
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
  const matrixRows = timesheet ? entriesToReadOnlyMatrixRows(timesheet.entries ?? []) : []

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

      {timesheet?.status === 'APPROVED' && (
        <Box sx={{ mb: 3 }}>
          <SaveStateBanner state={paymentState.state} message={paymentState.message} />
        </Box>
      )}

      {timesheet && (
        <>
          <Box sx={{ mb: 4, pb: 4, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography
              sx={{
                fontFamily: '"Outfit", system-ui, sans-serif',
                fontSize: '0.72rem',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                color: 'text.secondary',
                mb: 2,
              }}
            >
              Summary
            </Typography>
            <DetailList items={summaryItems} />

            <Divider sx={{ my: 3 }} />

            <Typography
              sx={{
                fontFamily: '"Outfit", system-ui, sans-serif',
                fontSize: '0.72rem',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                color: 'text.secondary',
                mb: 2,
              }}
            >
              Work Summary
            </Typography>
            {(workSummary ?? []).length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No client or Internal categories recorded for this week.
              </Typography>
            ) : (
              <DetailList
                items={(workSummary ?? []).map((item) => ({
                  key: getWorkBucketKey(item),
                  label: getWorkBucketDisplayLabel(item.bucketLabel),
                  value: (
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700 }}
                    >
                      {item.totalHours != null ? Number(item.totalHours).toFixed(2) : '-'}
                    </Typography>
                  )
                }))}
                rowGap={1.25}
              />
            )}
          </Box>

          <WeeklyMatrix
            rows={matrixRows}
            weekDates={weekDates}
            totalHours={timesheet.totalHours != null ? Number(timesheet.totalHours).toFixed(2) : '-'}
            emptyMessage="No entries recorded for this timesheet."
          />

          {timesheet.status === 'APPROVED' && (
            <PaymentDetailsPanel
              isMobile={isMobile}
              computedBuckets={computedBuckets}
              bucketRates={bucketRates}
              setBucketRates={setBucketRates}
              notes={notes}
              setNotes={setNotes}
              isPaymentReady={isPaymentReady}
              totals={totals}
              netMargin={netMargin}
              submitting={submitting}
              nextId={nextId}
              onProcessPayment={handleProcessPayment}
              formatCurrency={formatCurrency}
              saveState={paymentState}
              disabledReason={disabledReason}
            />
          )}

          {timesheet.status === 'COMPLETED' && <FinanceNotesPanel notes={fetchedNotes} />}
        </>
      )}
    </Box>
  )
}
