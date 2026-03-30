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
import StatusBadge from '../../components/shared/StatusBadge'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import { getTimesheet, reviewTimesheet } from '../../api/timesheets'
import { formatWeekStart } from '../../utils/dateFormatters'

function formatEntryDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getDayName(dateStr) {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-GB', { weekday: 'long' })
}

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
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Button variant="outlined" onClick={() => navigate('/manager/timesheets')}>
          Back
        </Button>
        <Typography variant="h5" component="h1">
          Review Timesheet
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
              {timesheet.rejectionComment && (
                <Box display="flex" gap={1}>
                  <Typography fontWeight="bold" sx={{ minWidth: 140 }}>Rejection Note:</Typography>
                  <Typography>{timesheet.rejectionComment}</Typography>
                </Box>
              )}
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
                    onClick={handleApprove}
                    disabled={submitting}
                  >
                    Approve
                  </Button>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle1" gutterBottom fontWeight="bold">
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
