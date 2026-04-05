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
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import StatusBadge from '../../components/shared/StatusBadge'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import PageHeader from '../../components/shared/PageHeader'
import { getTimesheet, reviewTimesheet } from '../../api/timesheets'
import { formatLongDate, formatWeekStart, formatDayName } from '../../utils/dateFormatters'

export default function TimesheetReviewPage() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [timesheet, setTimesheet] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [rejectionComment, setRejectionComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

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
      setFeedback({ severity: 'success', message: 'Timesheet rejected.' })
      setRejectionComment('')
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message ?? 'Failed to reject timesheet.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <Box>
      <PageHeader title="Review Timesheet">
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
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Summary
            </Typography>
            <Box display="grid" gridTemplateColumns="140px 1fr" columnGap={2} rowGap={1.5}>
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                Consultant ID
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>
                {timesheet.consultantId}
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

              {timesheet.rejectionComment && (
                <>
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    Rejection Note
                  </Typography>
                  <Typography variant="body2">{timesheet.rejectionComment}</Typography>
                </>
              )}
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

          {/* Actions */}
          {timesheet.status === 'PENDING' && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Actions
              </Typography>
              <Stack spacing={3}>
                <Box>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircleIcon />}
                    onClick={handleApprove}
                    disabled={submitting}
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
                        onClick={handleReject}
                        disabled={submitting || !rejectionComment.trim()}
                      >
                        Reject
                      </Button>
                    </Box>
                  </Stack>
                </Box>
              </Stack>
            </Paper>
          )}

          {(timesheet.status === 'APPROVED' || timesheet.status === 'REJECTED') && (
            <Alert
              severity={timesheet.status === 'APPROVED' ? 'success' : 'error'}
              sx={{ mt: 2 }}
            >
              This timesheet has been{' '}
              <strong>{timesheet.status.toLowerCase()}</strong>.
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
