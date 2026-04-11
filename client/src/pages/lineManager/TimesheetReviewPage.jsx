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
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
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
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import PageHeader from '../../components/shared/PageHeader'
import DetailList from '../../components/shared/DetailList.jsx'
import TimesheetStatusDisplay from '../../components/shared/TimesheetStatusDisplay.jsx'
import { getTimesheet, reviewTimesheet, getTimesheets } from '../../api/timesheets'
import { formatDayName, buildWeekDates, formatWeekStart } from '../../utils/dateFormatters'
import { palette } from '../../theme.js'
import {
  getConsultantDisplayLabel,
  getWorkBucketDisplayLabel,
  getWorkSummaryDisplayLabel,
} from '../../utils/displayLabels'

function getBucketValue(entryKind, assignmentId) {
  return entryKind === 'CLIENT' ? assignmentId || '' : 'INTERNAL'
}

function entriesToMatrixRows(entries) {
  const rowMap = new Map() // key: bucketValue
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

export default function TimesheetReviewPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const navigate = useNavigate()
  const { id } = useParams()

  const [timesheet, setTimesheet] = useState(null)
  const [pendingQueue, setPendingQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [rejectionComment, setRejectionComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [isNextAction, setIsNextAction] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([getTimesheet(id), getTimesheets()])
      .then(([ts, all]) => {
        setTimesheet(ts)
        setPendingQueue(all.filter(t => t.status === 'PENDING'))
      })
      .catch((err) => setError(err.message ?? 'Failed to load timesheet'))
      .finally(() => setLoading(false))
  }, [id, refreshKey])

  function getNextPendingId() {
    const idx = pendingQueue.findIndex(ts => ts.id === id)
    if (idx !== -1 && idx + 1 < pendingQueue.length) {
      return pendingQueue[idx + 1].id
    }
    const nextUnseen = pendingQueue.find(ts => ts.id !== id)
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
        setFeedback({ severity: 'success', message: 'Timesheet approved. Showing next pending timesheet.' })
        navigate(`/manager/timesheets/${nextId}`, { replace: true })
      } else {
        setFeedback({ severity: 'success', message: 'Timesheet approved successfully.' })
        setRefreshKey(k => k + 1)
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
        setFeedback({ severity: 'info', message: 'Timesheet rejected. Showing next pending timesheet.' })
        navigate(`/manager/timesheets/${nextId}`, { replace: true })
      } else {
        setFeedback({ severity: 'info', message: 'Timesheet rejected and returned to the consultant.' })
        setRefreshKey((k) => k + 1)
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
  const matrixRows = timesheet ? entriesToMatrixRows(timesheet.entries ?? []) : []

  return (
    <Box>
      <PageHeader title="Open Timesheet">
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/manager/timesheets')}
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
              {(timesheet.workSummary ?? []).map((item) => (
                <Box
                  key={`${item.entryKind}-${item.assignmentId ?? 'INTERNAL'}`}
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

          {/* Entries */}
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

          {/* Actions */}
          {timesheet.status === 'PENDING' && (
            <Paper sx={{ p: { xs: 2.5, sm: 3 }, backgroundColor: palette.surfaceRaised }}>
              <Typography variant="h6" gutterBottom>
                Actions
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
                    variant="outlined"
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
                      variant="outlined"
                      color="error"
                      startIcon={<FastForwardIcon />}
                      onClick={() => openRejectDialog(true)}
                      disabled={submitting}
                      fullWidth={isMobile}
                      sx={{ borderColor: palette.error, color: palette.error, '&:hover': { backgroundColor: palette.errorBg } }}
                    >
                      Reject & Next
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Paper>
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
                {isNextAction && nextId && " You will be taken to the next pending timesheet."}
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
                {submitting ? 'Approving...' : (isNextAction ? 'Approve & Next' : 'Confirm approval')}
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
                Rejecting this timesheet will return it to the consultant for changes.
                {isNextAction && nextId && " You will be taken to the next pending timesheet."}
              </DialogContentText>
              <TextField
                label="Rejection Comment"
                multiline
                minRows={3}
                fullWidth
                value={rejectionComment}
                onChange={(e) => setRejectionComment(e.target.value)}
                required
                disabled={submitting}
              />
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
                {submitting ? 'Rejecting...' : (isNextAction ? 'Reject & Next' : 'Confirm rejection')}
              </Button>
            </DialogActions>
          </Dialog>

        </>
      )}
    </Box>
  )
}
