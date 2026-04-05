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
import EditIcon from '@mui/icons-material/Edit'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import StatusBadge from '../../components/shared/StatusBadge'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import PageHeader from '../../components/shared/PageHeader'
import { getTimesheet } from '../../api/timesheets'
import { formatWeekStart } from '../../utils/dateFormatters'
import { isConsultantEditableStatus } from '../../utils/timesheetWorkflow.js'

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
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/consultant/timesheets')}
        >
          Back to Timesheets
        </Button>
      </Box>
    )
  }

  const entries = timesheet.entries ?? []

  return (
    <Box>
      <PageHeader title="Timesheet Detail">
        {isConsultantEditableStatus(timesheet.status) && (
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/consultant/timesheets/${id}/edit`)}
          >
            Edit
          </Button>
        )}
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/consultant/timesheets')}
        >
          Back
        </Button>
      </PageHeader>

      {timesheet.status === 'REJECTED' && timesheet.rejectionComment && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <strong>Rejected:</strong> {timesheet.rejectionComment}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="grid" gridTemplateColumns="140px 1fr" columnGap={2} rowGap={2}>
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
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 500,
            }}
          >
            {timesheet.totalHours ?? '-'}
          </Typography>

          {timesheet.assignmentId && (
            <>
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                Assignment ID
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                {timesheet.assignmentId}
              </Typography>
            </>
          )}
        </Box>
      </Paper>

      <Divider sx={{ mb: 3 }} />

      <Typography variant="h6" component="h2" mb={2}>
        Daily Entries
      </Typography>

      {entries.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderStyle: 'dashed' }}>
          <Typography variant="body2" color="text.secondary">
            No entries recorded for this timesheet.
          </Typography>
        </Paper>
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
                  <TableCell>{formatWeekStart(entry.date)}</TableCell>
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
    </Box>
  )
}
