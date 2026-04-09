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
import StatusBadge from '../../components/shared/StatusBadge'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import PageHeader from '../../components/shared/PageHeader'
import DetailList from '../../components/shared/DetailList.jsx'
import { getTimesheet, reviewTimesheet } from '../../api/timesheets'
import { formatLongDate, formatWeekStart, formatDayName } from '../../utils/dateFormatters'
import { getConsultantDisplayLabel } from '../../utils/displayLabels'

export default function TimesheetReviewPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const navigate = useNavigate()
  const { id } = useParams()

  const [timesheet, setTimesheet] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [rejectionComment, setRejectionComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getTimesheet(id)
      .then(setTimesheet)
      .catch((err) => setError(err.message ?? 'Failed to load timesheet'))
      .finally(() => setLoading(false))
  }, [id, refreshKey])

  async function handleApprove() {
    setSubmitting(true)
    setFeedback(null)
    try {
      await reviewTimesheet(id, { action: 'APPROVE', comment: '' })
      setFeedback({ severity: 'success', message: 'Timesheet approved successfully.' })
      setApproveDialogOpen(false)
      setRefreshKey((k) => k + 1)
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
      setFeedback({
        severity: 'info',
        message: 'Timesheet rejected and returned to the consultant for changes.',
      })
      setRejectDialogOpen(false)
      setRejectionComment('')
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message ?? 'Failed to reject timesheet.' })
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
      ]
    : []

  if (timesheet?.rejectionComment) {
    summaryItems.push({
      key: 'rejection',
      label: 'Rejection Note',
      value: timesheet.rejectionComment,
    })
  }

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

          {/* Entries */}
          {timesheet.entries && timesheet.entries.length > 0 && (
            <Paper sx={{ mb: 3 }}>
              <Box sx={{ p: 2, pb: 1 }}>
                <Typography variant="h6">Daily Entries</Typography>
              </Box>
              {isMobile ? (
                <Stack divider={<Divider flexItem />}>
                  {timesheet.entries.map((entry) => (
                    <Box key={entry.id ?? entry.date} sx={{ px: 2, py: 1.75 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: 2,
                          mb: 0.5,
                        }}
                      >
                        <Typography variant="body2" fontWeight={600}>
                          {formatDayName(entry.date)}
                        </Typography>
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
              )}
            </Paper>
          )}

          {/* Actions */}
          {timesheet.status === 'PENDING' && (
            <Paper sx={{ p: { xs: 2.5, sm: 3 } }}>
              <Typography variant="h6" gutterBottom>
                Actions
              </Typography>
              <Stack spacing={3}>
                <Box>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircleIcon />}
                    onClick={() => setApproveDialogOpen(true)}
                    disabled={submitting}
                    fullWidth={isMobile}
                  >
                    Approve
                  </Button>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle1" gutterBottom fontWeight={600} sx={{ fontSize: '0.85rem' }}>
                    Reject Timesheet
                  </Typography>
                  <Stack spacing={2}>
                    <TextField
                      label="Rejection Comment"
                      multiline
                      minRows={3}
                      fullWidth
                      value={rejectionComment}
                      onChange={(e) => setRejectionComment(e.target.value)}
                      required
                      placeholder="Provide a reason for rejection (required)"
                    />
                    <Box>
                      <Button
                        variant="contained"
                        color="error"
                        startIcon={<CancelIcon />}
                        onClick={() => setRejectDialogOpen(true)}
                        disabled={submitting || !rejectionComment.trim()}
                        fullWidth={isMobile}
                      >
                        Reject
                      </Button>
                    </Box>
                  </Stack>
                </Box>
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
                {submitting ? 'Approving...' : 'Confirm approval'}
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
                {submitting ? 'Rejecting...' : 'Confirm rejection'}
              </Button>
            </DialogActions>
          </Dialog>

          {(timesheet.status === 'APPROVED' || timesheet.status === 'REJECTED') && (
            <Alert
              severity={timesheet.status === 'APPROVED' ? 'success' : 'info'}
              sx={{ mt: 2 }}
            >
              {timesheet.status === 'APPROVED'
                ? (
                    <>
                      This timesheet has been <strong>approved</strong>.
                    </>
                  )
                : (
                    <>
                      This timesheet has been <strong>rejected</strong> and returned to the
                      consultant for changes.
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
