import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Alert from '@mui/material/Alert'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import VisibilityIcon from '@mui/icons-material/Visibility'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import StatusBadge from '../../components/shared/StatusBadge'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import PageHeader from '../../components/shared/PageHeader'
import { getTimesheets } from '../../api/timesheets'
import { formatWeekStart, getCurrentMonday } from '../../utils/dateFormatters'
import { getWorkSummaryDisplayLabel } from '../../utils/displayLabels'
import {
  getTimesheetForWeek,
  isConsultantEditableStatus,
} from '../../utils/timesheetWorkflow.js'

export default function TimesheetListPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
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

  const currentMonday = getCurrentMonday()
  const currentWeekTimesheet = getTimesheetForWeek(timesheets, currentMonday)
  const canCreate = !currentWeekTimesheet

  function renderActionButton() {
    if (currentWeekTimesheet) {
      const isEditable = isConsultantEditableStatus(currentWeekTimesheet.status)
      const ActionIcon = isEditable ? ArrowForwardIcon : VisibilityIcon
      return (
        <Button
          variant="contained"
          startIcon={<ActionIcon />}
          onClick={() =>
            navigate(
              isEditable
                ? `/consultant/timesheets/${currentWeekTimesheet.id}/edit`
                : `/consultant/timesheets/${currentWeekTimesheet.id}`
            )
          }
        >
          {isEditable ? 'Continue Timesheet' : 'View Timesheet'}
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
        isMobile ? (
          <Stack spacing={1.5}>
            {timesheets.map((ts) => {
              const isEditable = isConsultantEditableStatus(ts.status)
              const actionLabel = isEditable ? 'Edit Timesheet' : 'View Timesheet'
              const ActionIcon = isEditable ? EditIcon : VisibilityIcon
              const destination = isEditable
                ? `/consultant/timesheets/${ts.id}/edit`
                : `/consultant/timesheets/${ts.id}`

              return (
                <Paper key={ts.id} sx={{ p: 2.5 }}>
                  <Stack spacing={2}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 1.5,
                      }}
                    >
                      <Box>
                        <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                          Week of
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {formatWeekStart(ts.weekStart)}
                        </Typography>
                      </Box>
                      <StatusBadge status={ts.status} />
                    </Box>

                    <Box>
                      <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                        Work Categories
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {getWorkSummaryDisplayLabel(ts.workSummary, 2)}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                        Total Hours
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '1rem',
                          fontWeight: 600,
                        }}
                      >
                        {ts.totalHours ?? '-'}
                      </Typography>
                    </Box>

                    <Button
                      variant="outlined"
                      startIcon={<ActionIcon sx={{ fontSize: '0.95rem' }} />}
                      onClick={() => navigate(destination)}
                    >
                      {actionLabel}
                    </Button>
                  </Stack>
                </Paper>
              )
            })}
          </Stack>
        ) : (
          <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Week of</TableCell>
                  <TableCell>Work Categories</TableCell>
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
                    <TableCell>{getWorkSummaryDisplayLabel(ts.workSummary, 2)}</TableCell>
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
                      {isConsultantEditableStatus(ts.status) ? (
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
        )
      )}
    </Box>
  )
}
