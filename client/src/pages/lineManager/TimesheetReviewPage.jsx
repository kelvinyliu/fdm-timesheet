import { useState } from 'react'
import { useLocation, useNavigate, useParams, useLoaderData, useRevalidator } from 'react-router'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import TextField from '@mui/material/TextField'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import FastForwardIcon from '@mui/icons-material/FastForward'
import BlockIcon from '@mui/icons-material/Block'
import PageHeader from '../../components/shared/PageHeader'
import DetailList from '../../components/shared/DetailList.jsx'
import FieldGroup from '../../components/shared/FieldGroup.jsx'
import TimesheetStatusDisplay from '../../components/shared/TimesheetStatusDisplay.jsx'
import WeeklyMatrix from '../../components/shared/WeeklyMatrix.jsx'
import { reviewTimesheet } from '../../api/timesheets'
import { buildWeekDates, formatWeekStart } from '../../utils/dateFormatters'
import {
  getSubmitterDisplayLabel,
  getWorkBucketDisplayLabel,
  getWorkSummaryDisplayLabel,
} from '../../utils/displayLabels'
import { entriesToReadOnlyMatrixRows } from '../../utils/timesheetMatrix.js'
import { buildManagerTimesheetListPath } from './utils/managerTimesheetFilters.js'

const REJECTION_PRESETS = [
  'Hours logged are inconsistent with expected schedule.',
  'Work category allocation is incorrect.',
  'Needs supporting detail or comment for the recorded hours.',
  'Timesheet was submitted for the wrong week.',
]

export default function TimesheetReviewPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const location = useLocation()
  const navigate = useNavigate()
  const revalidator = useRevalidator()
  const { id } = useParams()
  const { timesheet, pendingQueue, error } = useLoaderData()
  const returnTo = location.state?.returnTo ?? buildManagerTimesheetListPath()

  const [rejectionComment, setRejectionComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [isNextAction, setIsNextAction] = useState(false)

  function getNextPendingId() {
    const idx = pendingQueue.findIndex((timesheet) => timesheet.id === id)
    if (idx !== -1 && idx + 1 < pendingQueue.length) {
      return pendingQueue[idx + 1].id
    }
    const nextUnseen = pendingQueue.find((timesheet) => timesheet.id !== id)
    return nextUnseen ? nextUnseen.id : null
  }

  const nextId = getNextPendingId()

  async function handleApprove() {
    setSubmitting(true)
    setFeedback(null)

    try {
      await reviewTimesheet(id, { action: 'APPROVE', comment: '' })
      setApproveDialogOpen(false)

      if (isNextAction && nextId) {
        setFeedback({
          severity: 'success',
          message: 'Timesheet approved. Showing next pending timesheet.',
        })
        navigate(`/manager/timesheets/${nextId}`, {
          replace: true,
          state: { returnTo },
        })
      } else {
        setFeedback({ severity: 'success', message: 'Timesheet approved successfully.' })
        revalidator.revalidate()
      }
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message ?? 'Failed to approve timesheet.' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReject() {
    if (!rejectionComment.trim()) return

    setSubmitting(true)
    setFeedback(null)

    try {
      await reviewTimesheet(id, { action: 'REJECT', comment: rejectionComment.trim() })
      setRejectDialogOpen(false)
      setRejectionComment('')

      if (isNextAction && nextId) {
        setFeedback({
          severity: 'info',
          message: 'Timesheet rejected. Showing next pending timesheet.',
        })
        navigate(`/manager/timesheets/${nextId}`, {
          replace: true,
          state: { returnTo },
        })
      } else {
        setFeedback({
          severity: 'info',
          message: 'Timesheet rejected and returned to the submitter.',
        })
        revalidator.revalidate()
      }
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message ?? 'Failed to reject timesheet.' })
    } finally {
      setSubmitting(false)
    }
  }

  function openApproveDialog(goNext) {
    setIsNextAction(goNext)
    setApproveDialogOpen(true)
  }

  function openRejectDialog(goNext) {
    setIsNextAction(goNext)
    setRejectionComment('')
    setRejectDialogOpen(true)
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
          value: getWorkSummaryDisplayLabel(timesheet.workSummary, 3),
        },
      ]
    : []

  if (timesheet?.rejectionComment) {
    summaryItems.push({
      key: 'rejection',
      label: 'Rejection Note',
      value: timesheet.rejectionComment,
    })
  }

  const weekDates = timesheet ? buildWeekDates(timesheet.weekStart) : []
  const matrixRows = timesheet ? entriesToReadOnlyMatrixRows(timesheet.entries ?? []) : []

  return (
    <Box>
      <PageHeader title="Open Timesheet">
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(returnTo)}
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
            {(timesheet.workSummary ?? []).length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No client or Internal categories recorded for this week.
              </Typography>
            ) : (
              <DetailList
                items={(timesheet.workSummary ?? []).map((item) => ({
                  key: `${item.entryKind}-${item.assignmentId ?? 'INTERNAL'}`,
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

          {timesheet.status === 'PENDING' && (
            <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
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
                Decision
              </Typography>
              <Stack spacing={3}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircleIcon />}
                    onClick={() => openApproveDialog(false)}
                    disabled={submitting}
                    fullWidth={isMobile}
                  >
                    Approve
                  </Button>
                  {nextId && (
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<FastForwardIcon />}
                      onClick={() => openApproveDialog(true)}
                      disabled={submitting}
                      fullWidth={isMobile}
                      sx={{ backgroundColor: '#25562b', '&:hover': { backgroundColor: '#1e4a23' } }}
                    >
                      Approve & Next
                    </Button>
                  )}
                </Stack>

                <Divider />

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<CancelIcon />}
                    onClick={() => openRejectDialog(false)}
                    disabled={submitting}
                    fullWidth={isMobile}
                  >
                    Reject
                  </Button>
                  {nextId && (
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<FastForwardIcon />}
                      onClick={() => openRejectDialog(true)}
                      disabled={submitting}
                      fullWidth={isMobile}
                      sx={{
                        backgroundColor: '#b22a25',
                        '&:hover': { backgroundColor: '#8a201c' },
                      }}
                    >
                      Reject & Next
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Box>
          )}

          <Dialog
            open={approveDialogOpen}
            onClose={submitting ? undefined : () => setApproveDialogOpen(false)}
            fullWidth
            maxWidth="xs"
          >
            <DialogTitle>Approve timesheet?</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Approving this timesheet will mark it as approved and make it available to finance
                for payment processing.
                {isNextAction && nextId && ' You will be taken to the next pending timesheet.'}
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setApproveDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button
                onClick={handleApprove}
                color="success"
                variant="contained"
                disabled={submitting}
              >
                {submitting ? 'Approving...' : isNextAction ? 'Approve & Next' : 'Confirm approval'}
              </Button>
            </DialogActions>
          </Dialog>

          <Dialog
            open={rejectDialogOpen}
            onClose={submitting ? undefined : () => setRejectDialogOpen(false)}
            fullWidth
            maxWidth="sm"
          >
            <DialogTitle>Reject timesheet?</DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ mb: 2 }}>
                Rejecting this timesheet will return it to the submitter for changes.
                {isNextAction && nextId && ' You will be taken to the next pending timesheet.'}
              </DialogContentText>
              <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap' }} useFlexGap>
                {REJECTION_PRESETS.map((preset) => (
                  <Chip
                    key={preset}
                    label={preset.length > 32 ? `${preset.slice(0, 30)}…` : preset}
                    onClick={() => setRejectionComment(preset)}
                    size="small"
                    variant="outlined"
                    disabled={submitting}
                    sx={{ mb: 0.5 }}
                  />
                ))}
              </Stack>
              <FieldGroup
                label="Rejection comment"
                htmlFor="rejection-comment"
                required
                error={
                  rejectionComment.length > 0 && !rejectionComment.trim()
                    ? 'Rejection comment cannot be blank.'
                    : undefined
                }
                helper="A clear reason helps the consultant correct and resubmit quickly."
              >
                <TextField
                  id="rejection-comment"
                  multiline
                  minRows={3}
                  fullWidth
                  value={rejectionComment}
                  onChange={(e) => setRejectionComment(e.target.value)}
                  disabled={submitting}
                  error={rejectionComment.length > 0 && !rejectionComment.trim()}
                />
              </FieldGroup>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setRejectDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                color="error"
                variant="contained"
                disabled={submitting || !rejectionComment.trim()}
              >
                {submitting ? 'Rejecting...' : isNextAction ? 'Reject & Next' : 'Confirm rejection'}
              </Button>
            </DialogActions>
          </Dialog>

          {(timesheet.status === 'APPROVED' || timesheet.status === 'REJECTED' || timesheet.status === 'COMPLETED') && (
            <Alert severity={timesheet.status === 'APPROVED' ? 'success' : timesheet.status === 'REJECTED' ? 'error' : 'info'} icon={timesheet.status === 'REJECTED' ? <BlockIcon /> : undefined} sx={{ mt: 2 }}>
              {timesheet.status === 'APPROVED' ? (
                <>
                  This timesheet has been <strong>approved</strong>.
                </>
              ) : timesheet.status === 'COMPLETED' ? (
                <>
                  This timesheet has been <strong>paid</strong>.
                </>
              ) : (
                <>
                  This timesheet has been <strong>rejected</strong> and returned to the submitter
                  for changes.
                </>
              )}
              {timesheet.status === 'REJECTED' && timesheet.rejectionComment && (
                <> Reason: {timesheet.rejectionComment}</>
              )}
            </Alert>
          )}
        </>
      )}
    </Box>
  )
}
