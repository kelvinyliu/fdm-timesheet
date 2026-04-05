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
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import VisibilityIcon from '@mui/icons-material/Visibility'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import StatusBadge from '../../components/shared/StatusBadge'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import PageHeader from '../../components/shared/PageHeader'
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
          startIcon={<ArrowForwardIcon />}
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
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/consultant/timesheets/new')}
        >
          New Timesheet
        </Button>
      )
    }
    return (
      <Tooltip title="A new timesheet will be available on Monday">
        <span>
          <Button variant="contained" disabled startIcon={<AddIcon />}>
            New Timesheet
          </Button>
        </span>
      </Tooltip>
    )
  }

  return (
    <Box>
      <PageHeader title="My Timesheets" subtitle="View and manage your weekly timesheets">
        {renderActionButton()}
      </PageHeader>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!error && timesheets.length === 0 && (
        <Paper
          sx={{
            p: 6,
            textAlign: 'center',
            borderStyle: 'dashed',
          }}
        >
          <Typography
            sx={{
              fontFamily: '"Instrument Serif", Georgia, serif',
              fontSize: '1.2rem',
              color: 'text.secondary',
              mb: 1,
            }}
          >
            No timesheets yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create one to get started.
          </Typography>
        </Paper>
      )}

      {!error && timesheets.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Week of</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Total Hours</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {timesheets.map((ts) => (
                <TableRow key={ts.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {formatWeekStart(ts.weekStart)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={ts.status} />
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.85rem',
                      }}
                    >
                      {ts.totalHours ?? '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {ts.status === 'DRAFT' ? (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<EditIcon sx={{ fontSize: '0.9rem' }} />}
                        onClick={() => navigate(`/consultant/timesheets/${ts.id}/edit`)}
                      >
                        Edit
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<VisibilityIcon sx={{ fontSize: '0.9rem' }} />}
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
