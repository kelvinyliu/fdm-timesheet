import { useNavigate, useParams, useLoaderData } from 'react-router'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import EditIcon from '@mui/icons-material/Edit'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PageHeader from '../../components/shared/PageHeader'
import DetailList from '../../components/shared/DetailList.jsx'
import TimesheetStatusDisplay from '../../components/shared/TimesheetStatusDisplay.jsx'
import WeeklyMatrix from '../../components/shared/WeeklyMatrix.jsx'
import { buildWeekDates, formatWeekStart } from '../../utils/dateFormatters'
import { getWorkBucketDisplayLabel, getWorkSummaryDisplayLabel } from '../../utils/displayLabels'
import { isConsultantEditableStatus } from '../../utils/timesheetWorkflow.js'
import { entriesToReadOnlyMatrixRows } from '../../utils/timesheetMatrix.js'

export default function TimesheetDetailPage({ basePath = '/consultant/timesheets' }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { timesheet, error } = useLoaderData()

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate(basePath)}>
          Back to Timesheets
        </Button>
      </Box>
    )
  }

  const entries = timesheet.entries ?? []
  const workSummary = timesheet.workSummary ?? []
  const hasManagerFeedback = Boolean(timesheet.rejectionComment)
  const feedbackSeverity = timesheet.status === 'REJECTED' ? 'error' : 'warning'
  const feedbackTitle = timesheet.status === 'REJECTED' ? 'Rejected' : 'Manager feedback'
  const detailItems = [
    {
      key: 'week',
      label: 'Week of',
      value: formatWeekStart(timesheet.weekStart),
    },
    {
      key: 'status',
      label: 'Status',
      value: (
        <TimesheetStatusDisplay status={timesheet.status} submittedLate={timesheet.submittedLate} />
      ),
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
  const matrixRows = entriesToReadOnlyMatrixRows(entries)

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
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate(basePath)}>
          Back
        </Button>
      </PageHeader>

      {hasManagerFeedback && (
        <Alert severity={feedbackSeverity} sx={{ mb: 3 }}>
          <strong>{feedbackTitle}:</strong> {timesheet.rejectionComment}
        </Alert>
      )}

      <Paper sx={{ 
        p: 3, 
        borderRadius: 3, 
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
        border: '1px solid rgba(0,0,0,0.05)', 
        background: 'linear-gradient(to bottom right, #ffffff, #fdfdfd)'
        }}>
        <DetailList items={detailItems} rowGap={2} />
      </Paper>

      <Paper sx={{ 
        p: 3, 
        borderRadius: 3,
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)', 
        border: '1px solid rgba(0,0,0,0.05)',
        background: 'linear-gradient(to bottom right, #ffffff, #fdfdfd)'
        }}>
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
        <WeeklyMatrix
          rows={[]}
          weekDates={weekDates}
          totalHours={timesheet.totalHours ?? '-'}
          emptyMessage="No entries recorded for this timesheet."
        />
      ) : (
        <WeeklyMatrix
          rows={matrixRows}
          weekDates={weekDates}
          totalHours={timesheet.totalHours ?? '-'}
        />
      )}
    </Box>
  )
}
