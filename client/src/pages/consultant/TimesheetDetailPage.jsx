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
import EditIcon from '@mui/icons-material/Edit'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import PageHeader from '../../components/shared/PageHeader'
import DetailList from '../../components/shared/DetailList.jsx'
import TimesheetStatusDisplay from '../../components/shared/TimesheetStatusDisplay.jsx'
import { getTimesheet } from '../../api/timesheets'
import { buildWeekDates, formatDayName, formatWeekStart } from '../../utils/dateFormatters'
import { palette } from '../../theme.js'
import {
  getWorkBucketDisplayLabel,
  getWorkSummaryDisplayLabel,
} from '../../utils/displayLabels'
import { isConsultantEditableStatus } from '../../utils/timesheetWorkflow.js'

function getBucketValue(entryKind, assignmentId) {
  return entryKind === 'CLIENT' ? assignmentId || '' : 'INTERNAL'
}

function entriesToMatrixRows(entries) {
  const rowMap = new Map() // key: bucketValue
  entries.forEach(entry => {
    const key = getBucketValue(entry.entryKind, entry.assignmentId)
    if (!rowMap.has(key)) {
      rowMap.set(key, {
        id: key,
        entryKind: entry.entryKind,
        assignmentId: entry.assignmentId,
        bucketLabel: entry.bucketLabel,
        hours: {}
      })
    }
    rowMap.get(key).hours[entry.date] = entry.hoursWorked
  })
  return Array.from(rowMap.values())
}

export default function TimesheetDetailPage({
  basePath = '/consultant/timesheets',
}) {
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
          onClick={() => navigate(basePath)}
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
      value: <TimesheetStatusDisplay status={timesheet.status} submittedLate={timesheet.submittedLate} />,
    },
    {
      key: 'hours',
      label: 'Total Hours',
      value: (
        <Typography
          variant="body2"
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontWeight: 700,
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

  const weekDates = buildWeekDates(timesheet.weekStart)
  const matrixRows = entriesToMatrixRows(entries)

  return (
    <Box>
      <PageHeader title="Timesheet Detail">
        {isConsultantEditableStatus(timesheet.status) && (
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => navigate(`${basePath}/${id}/edit`)}
          >
            Edit
          </Button>
        )}
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(basePath)}
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
                  sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700 }}
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
        <Paper sx={{ mb: 3, p: { xs: 0, sm: 0 }, overflow: 'hidden' }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: palette.sidebarBg, color: palette.textInverse }}>
             <Typography variant="h6" sx={{ color: palette.textInverse }}>Weekly Matrix</Typography>
             <Typography variant="h6" sx={{ fontFamily: '"JetBrains Mono", monospace', color: palette.primary }}>
               {timesheet.totalHours ?? '-'}h Total
             </Typography>
          </Box>
          <TableContainer sx={{ borderTop: `2px solid ${palette.borderStrong}` }}>
            <Table size="small" sx={{ minWidth: 800 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 250, borderRight: `2px solid ${palette.border}` }}>Work Category</TableCell>
                  {weekDates.map(date => (
                    <TableCell key={date} align="center" sx={{ width: 80, borderRight: `2px solid ${palette.border}` }}>
                      <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: palette.textPrimary }}>
                        {formatDayName(date).slice(0, 3)}
                      </Typography>
                      <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', color: palette.textMuted }}>
                        {date.slice(5)}
                      </Typography>
                    </TableCell>
                  ))}
                  <TableCell align="center" sx={{ width: 80 }}>Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {matrixRows.map(row => {
                  const rowTotal = weekDates.reduce((sum, date) => sum + (parseFloat(row.hours[date]) || 0), 0)
                  return (
                    <TableRow key={row.id}>
                      <TableCell sx={{ borderRight: `2px solid ${palette.border}`, fontWeight: 600 }}>
                        {getWorkBucketDisplayLabel(row.bucketLabel)}
                      </TableCell>
                      {weekDates.map(date => {
                        const val = row.hours[date]
                        return (
                          <TableCell key={date} align="center" sx={{ p: 1, borderRight: `2px solid ${palette.border}` }}>
                            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', color: val ? palette.textPrimary : palette.textMuted }}>
                              {val || '-'}
                            </Typography>
                          </TableCell>
                        )
                      })}
                      <TableCell align="center">
                        <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700 }}>
                          {rowTotal.toFixed(2)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  )
}
