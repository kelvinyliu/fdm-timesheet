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
import {
  getWorkBucketDisplayLabel,
  getWorkSummaryDisplayLabel,
} from '../../utils/displayLabels'
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
  const workSummary = timesheet.workSummary ?? []
  const hasManagerFeedback = Boolean(timesheet.rejectionComment)
  const feedbackSeverity = timesheet.status === 'REJECTED' ? 'error' : 'warning'
  const feedbackTitle = timesheet.status === 'REJECTED'
    ? 'Rejected'
    : 'Manager feedback'
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
    {
      key: 'buckets',
      label: 'Work Categories',
      value: getWorkSummaryDisplayLabel(workSummary, 3),
    },
  ]

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

      {hasManagerFeedback && (
        <Alert severity={feedbackSeverity} sx={{ mb: 3 }}>
          <strong>{feedbackTitle}:</strong> {timesheet.rejectionComment}
        </Alert>
      )}

      <Paper sx={{ p: { xs: 2.5, sm: 3 }, mb: 3 }}>
        <DetailList items={detailItems} rowGap={2} />
      </Paper>

      <Paper sx={{ p: { xs: 2.5, sm: 3 }, mb: 3 }}>
        <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
          Weekly Work Summary
        </Typography>
        {workSummary.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No client or Internal categories recorded for this week.
          </Typography>
        ) : (
          <Stack spacing={1.25}>
            {workSummary.map((item) => (
              <Box
                key={`${item.entryKind}-${item.assignmentId ?? 'INTERNAL'}`}
                sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}
              >
                <Typography variant="body2">
                  {getWorkBucketDisplayLabel(item.bucketLabel)}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}
                >
                  {item.totalHours}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
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
                <Box key={entry.id ?? `${entry.date}-${entry.assignmentId ?? 'INTERNAL'}`} sx={{ px: 2, py: 1.75 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 2,
                      mb: 0.5,
                    }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {formatDayName(entry.date)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {getWorkBucketDisplayLabel(entry.bucketLabel)}
                      </Typography>
                    </Box>
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
                  <TableCell>Day</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Work Category</TableCell>
                  <TableCell align="right">Hours</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id ?? `${entry.date}-${entry.assignmentId ?? 'INTERNAL'}`}>
                    <TableCell>{formatDayName(entry.date)}</TableCell>
                    <TableCell>{formatLongDate(entry.date)}</TableCell>
                    <TableCell>{getWorkBucketDisplayLabel(entry.bucketLabel)}</TableCell>
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
