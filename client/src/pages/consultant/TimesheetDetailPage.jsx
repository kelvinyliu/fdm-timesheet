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
import Divider from '@mui/material/Divider'
import StatusBadge from '../../components/shared/StatusBadge'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import { getTimesheet } from '../../api/timesheets'
import { formatWeekStart } from '../../utils/dateFormatters'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatEntryDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function TimesheetDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [timesheet, setTimesheet] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getTimesheet(id)
      .then(setTimesheet)
      .catch((err) => setError(err.message ?? 'Failed to load timesheet'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <LoadingSpinner />

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={() => navigate('/consultant/timesheets')}>
          Back to Timesheets
        </Button>
      </Box>
    )
  }

  const entries = timesheet.entries ?? []

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h1">
          Timesheet Detail
        </Typography>
        <Box display="flex" gap={1}>
          {timesheet.status === 'DRAFT' && (
            <Button
              variant="contained"
              onClick={() => navigate(`/consultant/timesheets/${id}/edit`)}
            >
              Edit
            </Button>
          )}
          <Button variant="outlined" onClick={() => navigate('/consultant/timesheets')}>
            Back
          </Button>
        </Box>
      </Box>

      {timesheet.status === 'REJECTED' && timesheet.rejectionComment && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <strong>Rejected:</strong> {timesheet.rejectionComment}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="grid" gridTemplateColumns="auto 1fr" columnGap={2} rowGap={1.5}>
          <Typography color="text.secondary">Week of</Typography>
          <Typography>{formatWeekStart(timesheet.weekStart)}</Typography>

          <Typography color="text.secondary">Status</Typography>
          <Box>
            <StatusBadge status={timesheet.status} />
          </Box>

          <Typography color="text.secondary">Total Hours</Typography>
          <Typography>{timesheet.totalHours ?? '—'}</Typography>

          {timesheet.assignmentId && (
            <>
              <Typography color="text.secondary">Assignment ID</Typography>
              <Typography>{timesheet.assignmentId}</Typography>
            </>
          )}
        </Box>
      </Paper>

      <Divider sx={{ mb: 3 }} />

      <Typography variant="h6" component="h2" mb={2}>
        Daily Entries
      </Typography>

      {entries.length === 0 ? (
        <Typography color="text.secondary">No entries recorded for this timesheet.</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell align="right">Hours</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id ?? entry.date}>
                  <TableCell>{formatEntryDate(entry.date)}</TableCell>
                  <TableCell align="right">{entry.hoursWorked}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}
