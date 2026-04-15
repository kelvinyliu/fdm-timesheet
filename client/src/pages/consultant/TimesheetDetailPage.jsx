import { useLoaderData, useLocation, useNavigate, useParams } from 'react-router'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import EditIcon from '@mui/icons-material/Edit'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PageHeader from '../../components/shared/PageHeader'
import DetailList from '../../components/shared/DetailList.jsx'
import TimesheetStatusDisplay from '../../components/shared/TimesheetStatusDisplay.jsx'
import WeeklyMatrix from '../../components/shared/WeeklyMatrix.jsx'
import { formatCurrency } from '../../utils/currency.js'
import { buildWeekDates, formatWeekStart } from '../../utils/dateFormatters'
import {
  getSheetManagerDisplayLabel,
  getWorkBucketDisplayLabel,
  getWorkSummaryDisplayLabel,
} from '../../utils/displayLabels'
import { getConsultantVisibleStatus, isConsultantEditableStatus } from '../../utils/timesheetWorkflow.js'
import { entriesToReadOnlyMatrixRows } from '../../utils/timesheetMatrix.js'

export default function TimesheetDetailPage({ basePath = '/consultant/timesheets' }) {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { timesheet, error, managerInfo, managerError } = useLoaderData()
  const returnTo = location.state?.returnTo ?? basePath

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate(returnTo)}>
          Back to Timesheets
        </Button>
      </Box>
    )
  }

  const entries = timesheet.entries ?? []
  const workSummary = timesheet.workSummary ?? []
  const hasManagerFeedback =
    timesheet.status === 'REJECTED' && Boolean(timesheet.rejectionComment)
  const managerLabel =
    managerInfo?.source === 'snapshot' || managerInfo?.source === 'legacy_fallback'
      ? 'Sheet Manager'
      : 'Current Sheet Manager'
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
        <TimesheetStatusDisplay
          status={getConsultantVisibleStatus(timesheet.status)}
          submittedLate={timesheet.submittedLate}
        />
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
          {timesheet.totalHours != null ? `${Number(timesheet.totalHours).toFixed(2)}h` : '-'}
        </Typography>
      ),
    },
    {
      key: 'buckets',
      label: 'Work Categories',
      value: getWorkSummaryDisplayLabel(workSummary, 3),
    },
    {
      key: 'manager',
      label: managerLabel,
      value: managerError
        ? 'Unable to load sheet manager'
        : getSheetManagerDisplayLabel(managerInfo?.manager),
    },
    ...(timesheet.status === 'COMPLETED' && timesheet.totalPayAmount != null
      ? [
          {
            key: 'paidAmount',
            label: 'You were paid',
            value: (
              <Typography
                variant="body2"
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontWeight: 700,
                }}
              >
                {formatCurrency(timesheet.totalPayAmount)}
              </Typography>
            ),
          },
        ]
      : []),
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
            onClick={() => navigate(`${basePath}/${id}/edit`, { state: { returnTo } })}
          >
            Edit
          </Button>
        )}
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate(returnTo)}>
          Back
        </Button>
      </PageHeader>

      {hasManagerFeedback && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <strong>Rejected:</strong> {timesheet.rejectionComment}
        </Alert>
      )}

      {managerError && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {managerError}
        </Alert>
      )}

      <Box sx={{ mb: 4, pb: 4, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography
          sx={{
            fontFamily: '"Outfit", system-ui, sans-serif',
            fontSize: '0.72rem',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            color: 'text.secondary',
            mb: 2,
          }}
        >
          Summary
        </Typography>
        <DetailList items={detailItems} rowGap={2} />

        <Divider sx={{ my: 3 }} />

        <Typography
          sx={{
            fontFamily: '"Outfit", system-ui, sans-serif',
            fontSize: '0.72rem',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            color: 'text.secondary',
            mb: 2,
          }}
        >
          Weekly Work Summary
        </Typography>
        {workSummary.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No client or Internal categories recorded for this week.
          </Typography>
        ) : (
          <DetailList
            items={workSummary.map((item) => ({
              key: `${item.entryKind}-${item.assignmentId ?? 'INTERNAL'}`,
              label: getWorkBucketDisplayLabel(item.bucketLabel),
              value: (
                <Typography
                  variant="body2"
                  sx={{ fontFamily: '"Outfit", system-ui, sans-serif', fontWeight: 700 }}
                >
                  {item.totalHours != null ? `${Number(item.totalHours).toFixed(2)}h` : '-'}
                </Typography>
              ),
            }))}
            rowGap={1.25}
          />
        )}
      </Box>

      <Typography
        component="h2"
        sx={{
          fontFamily: '"Outfit", system-ui, sans-serif',
          fontSize: '0.72rem',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          color: 'text.secondary',
          mb: 2,
        }}
      >
        Daily Entries
      </Typography>

      {entries.length === 0 ? (
        <WeeklyMatrix
          rows={[]}
          weekDates={weekDates}
          totalHours={timesheet.totalHours != null ? Number(timesheet.totalHours).toFixed(2) : '-'}
          emptyMessage="No entries recorded for this timesheet."
        />
      ) : (
        <WeeklyMatrix
          rows={matrixRows}
          weekDates={weekDates}
          totalHours={timesheet.totalHours != null ? Number(timesheet.totalHours).toFixed(2) : '-'}
        />
      )}
    </Box>
  )
}
