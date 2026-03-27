import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Alert from '@mui/material/Alert'
import StatusBadge from '../../components/shared/StatusBadge'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import { getTimesheets } from '../../api/timesheets'
import { formatWeekStart, getCurrentMonday } from '../../utils/dateFormatters'

export default function TimesheetListPage() {
  const navigate = useNavigate()
  const [timesheets, setTimesheets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getTimesheets()
      .then(setTimesheets)
      .catch((err) => setError(err.message ?? 'Failed to load timesheets'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />

  const activeDraft = timesheets.find(
    (ts) => ts.status === 'DRAFT' || ts.status === 'PENDING'
  )
  const currentMonday = getCurrentMonday()
  const hasTimesheetThisWeek = timesheets.some((ts) => ts.weekStart === currentMonday)
  const canCreate = !activeDraft && !hasTimesheetThisWeek

  function renderActionButton() {
    if (activeDraft) {
      return (
        <Button
          variant="contained"
          onClick={() =>
            navigate(
              activeDraft.status === 'DRAFT'
                ? `/consultant/timesheets/${activeDraft.id}/edit`
                : `/consultant/timesheets/${activeDraft.id}`
            )
          }
        >
          Continue Timesheet
        </Button>
      )
    }
    if (canCreate) {
      return (
        <Button variant="contained" onClick={() => navigate('/consultant/timesheets/new')}>
          New Timesheet
        </Button>
      )
    }
    return (
      <Tooltip title="A new timesheet will be available on Monday">
        <span>
          <Button variant="contained" disabled>
            New Timesheet
          </Button>
        </span>
      </Tooltip>
    )
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h1">
          My Timesheets
        </Typography>
        {renderActionButton()}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!error && timesheets.length === 0 && (
        <Typography color="text.secondary">
          No timesheets yet. Create one to get started.
        </Typography>
      )}

      {!error && timesheets.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Week of</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Total Hours</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {timesheets.map((ts) => (
                <TableRow key={ts.id} hover>
                  <TableCell>{formatWeekStart(ts.weekStart)}</TableCell>
                  <TableCell>
                    <StatusBadge status={ts.status} />
                  </TableCell>
                  <TableCell>{ts.totalHours ?? '—'}</TableCell>
                  <TableCell>
                    {ts.status === 'DRAFT' ? (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => navigate(`/consultant/timesheets/${ts.id}/edit`)}
                      >
                        Edit
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => navigate(`/consultant/timesheets/${ts.id}`)}
                      >
                        View
                      </Button>
                    )}
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
