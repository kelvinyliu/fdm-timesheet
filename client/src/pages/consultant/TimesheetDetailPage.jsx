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
import Stack from '@mui/material/Stack'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import EditIcon from '@mui/icons-material/Edit'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import StatusBadge from '../../components/shared/StatusBadge'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import PageHeader from '../../components/shared/PageHeader'
import DetailList from '../../components/shared/DetailList.jsx'
import { getTimesheet } from '../../api/timesheets'
import { formatDayName, formatLongDate, formatWeekStart } from '../../utils/dateFormatters'
import { getClientAssignmentDisplayLabel } from '../../utils/displayLabels'
import { isConsultantEditableStatus } from '../../utils/timesheetWorkflow.js'

export default function TimesheetDetailPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
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
  const detailItems = [
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
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontWeight: 500,
          }}
        >
          {timesheet.totalHours ?? '-'}
        </Typography>
      ),
    },
  ]

  if (timesheet.assignmentId) {
    detailItems.push({
      key: 'assignment',
      label: 'Client Assignment',
      value: getClientAssignmentDisplayLabel(timesheet.assignmentClientName),
    })
  }

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

      <Paper sx={{ p: { xs: 2.5, sm: 3 }, mb: 3 }}>
        <DetailList items={detailItems} rowGap={2} />
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
        isMobile ? (
          <Paper sx={{ overflow: 'hidden' }}>
            <Stack divider={<Divider flexItem />}>
              {entries.map((entry) => (
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
          </Paper>
        ) : (
          <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
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
        )
      )}
    </Box>
  )
}
