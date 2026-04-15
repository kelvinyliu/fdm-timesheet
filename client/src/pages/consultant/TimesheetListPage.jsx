import { useState } from 'react'
import { useLoaderData, useNavigate, useSearchParams } from 'react-router'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Tooltip from '@mui/material/Tooltip'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Alert from '@mui/material/Alert'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import HistoryIcon from '@mui/icons-material/History'
import VisibilityIcon from '@mui/icons-material/Visibility'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import PageHeader from '../../components/shared/PageHeader'
import TimesheetStatusDisplay from '../../components/shared/TimesheetStatusDisplay.jsx'
import { createTimesheet } from '../../api/timesheets'
import { formatWeekStart, getCurrentMonday } from '../../utils/dateFormatters'
import { getWorkSummaryDisplayLabel } from '../../utils/displayLabels'
import { getTimesheetForWeek, isConsultantEditableStatus } from '../../utils/timesheetWorkflow.js'

export default function TimesheetListPage({
  basePath = '/consultant/timesheets',
  title = 'My Timesheets',
  subtitle = 'View and manage your weekly timesheets',
}) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { timesheets, eligibility, error: loadError, eligibilityError } = useLoaderData()
  const [error, setError] = useState(loadError)
  const [missingWeekDialogOpen, setMissingWeekDialogOpen] = useState(false)
  const [creatingWeekStart, setCreatingWeekStart] = useState(null)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'approved' ? 1 : 0)

  const currentMonday = eligibility.currentWeekStart || getCurrentMonday()
  const missingPastWeekStarts = eligibility.missingPastWeekStarts ?? []
  const currentWeekTimesheet = getTimesheetForWeek(timesheets, currentMonday)
  const canCreateCurrentWeek = !currentWeekTimesheet
  const missingWeekButtonTooltip =
    eligibilityError ??
    (missingPastWeekStarts.length > 0 ? '' : 'No missing weeks are available in the last 4 weeks.')

  async function handleCreateForWeek(weekStart) {
    setError(null)
    setCreatingWeekStart(weekStart)

    try {
      const newTimesheet = await createTimesheet({ weekStart })
      setMissingWeekDialogOpen(false)
      navigate(`${basePath}/${newTimesheet.id}/edit`, { replace: true })
    } catch (err) {
      setError(err.message ?? 'Failed to create timesheet.')
    } finally {
      setCreatingWeekStart(null)
    }
  }

  function renderPrimaryActionButton() {
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
                ? `${basePath}/${currentWeekTimesheet.id}/edit`
                : `${basePath}/${currentWeekTimesheet.id}`
            )
          }
        >
          {isEditable ? 'Continue Current Week' : 'View Current Week'}
        </Button>
      )
    }

    if (canCreateCurrentWeek) {
      return (
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate(`${basePath}/new`)}
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

  function renderMissingWeekButton() {
    const disabled = Boolean(missingWeekButtonTooltip) || creatingWeekStart !== null

    return (
      <Tooltip
        title={missingWeekButtonTooltip || 'Create a missing timesheet from the last 4 weeks'}
      >
        <span>
          <Button
            variant="outlined"
            startIcon={<HistoryIcon />}
            disabled={disabled}
            onClick={() => setMissingWeekDialogOpen(true)}
          >
            Create Missing Week
          </Button>
        </span>
      </Tooltip>
    )
  }

  const draftCount = timesheets.filter((ts) => ts.status === 'DRAFT').length
  const pendingCount = timesheets.filter((ts) => ts.status === 'PENDING').length
  const rejectedCount = timesheets.filter((ts) => ts.status === 'REJECTED').length
  const approvedOrPaidCount = timesheets.filter(
    (ts) => ts.status === 'APPROVED' || ts.status === 'COMPLETED'
  ).length

  const displayTimesheets = timesheets.filter((ts) =>
    activeTab === 0
      ? ts.status === 'DRAFT' || ts.status === 'PENDING' || ts.status === 'REJECTED'
      : ts.status === 'APPROVED' || ts.status === 'COMPLETED'
  )

  return (
    <Box>
      <PageHeader title={title} subtitle={subtitle}>
        {renderPrimaryActionButton()}
        {renderMissingWeekButton()}
      </PageHeader>

      {/* Compact status summary from ui-tweak1, kept above the existing list/table views. */}
      {!error && timesheets.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            mb: 4,
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            borderRadius: 3,
            border: '1px solid rgba(0,0,0,0.08)',
            background: 'linear-gradient(to right, rgba(255,255,255,0.7), rgba(252,252,252,0.8))',
            backdropFilter: 'blur(10px)',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 2, sm: 0 },
          }}
        >
          {[
            { label: 'Drafts', count: draftCount, color: 'text.secondary' },
            { label: 'Pending', count: pendingCount, color: '#ed6c02' },
            { label: 'Rejected', count: rejectedCount, color: '#d32f2f' },
            { label: 'Approved / Paid', count: approvedOrPaidCount, color: '#2e7d32' },
          ].map((item, index) => (
            <Box
              key={item.label}
              sx={{
                flex: 1,
                textAlign: 'center',
                borderRight: {
                  xs: 'none',
                  sm: index !== 3 ? '1px solid rgba(0,0,0,0.08)' : 'none',
                },
                borderBottom: {
                  xs: index !== 3 ? '1px solid rgba(0,0,0,0.08)' : 'none',
                  sm: 'none',
                },
                pb: { xs: index !== 3 ? 2 : 0, sm: 0 },
                width: '100%',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  display: 'block',
                }}
              >
                {item.label}
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontWeight: 800,
                  color: item.color,
                  mt: 0.5,
                }}
              >
                {item.count}
              </Typography>
            </Box>
          ))}
        </Paper>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_e, val) => { setActiveTab(val); navigate(`${basePath}${val === 1 ? '?tab=approved' : ''}`, { replace: true }) }}>
          <Tab label="Pending & Drafts" />
          <Tab label="Approved & Paid" />
        </Tabs>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {eligibilityError && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {eligibilityError}
        </Alert>
      )}

      {!error && displayTimesheets.length === 0 && (
        <Paper
          sx={{
            p: 6,
            textAlign: 'center',
            borderStyle: 'dashed',
          }}
        >
          <Typography
            sx={{
              fontFamily: 'Poppins, Georgia, serif',
              fontSize: '1.2rem',
              color: 'text.secondary',
              mb: 1,
            }}
          >
            {timesheets.length === 0
              ? 'No timesheets yet'
              : activeTab === 0
                ? 'No pending or draft timesheets'
                : 'No approved or paid timesheets'}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontFamily: '"Instrument Serif", Georgia, serif',
              fontSize: '1.2rem',
              mb: 1,
            }}
          >
            {timesheets.length === 0 ? 'Create one to get started.' : ''}
          </Typography>
        </Paper>
      )}

      {!error &&
        displayTimesheets.length > 0 &&
        (isMobile ? (
          <Stack spacing={1.5}>
            {displayTimesheets.map((ts) => {
              const isEditable = isConsultantEditableStatus(ts.status)
              const actionLabel = isEditable ? 'Edit Timesheet' : 'View Timesheet'
              const ActionIcon = isEditable ? EditIcon : VisibilityIcon
              const destination = isEditable ? `${basePath}/${ts.id}/edit` : `${basePath}/${ts.id}`

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
                      <TimesheetStatusDisplay status={ts.status} submittedLate={ts.submittedLate} />
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
                        {ts.totalHours != null ? Number(ts.totalHours).toFixed(2) : '-'}
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
            <Table sx={{ tableLayout: 'fixed', minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: '15%' }}>Week of</TableCell>
                  <TableCell sx={{ width: '35%' }}>Work Categories</TableCell>
                  <TableCell sx={{ width: '20%' }}>Status</TableCell>
                  <TableCell align="right" sx={{ width: '10%' }}>Total Hours</TableCell>
                  <TableCell align="right" sx={{ width: '20%' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayTimesheets.map((ts) => (
                  <TableRow key={ts.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {formatWeekStart(ts.weekStart)}
                      </Typography>
                    </TableCell>
                    <TableCell>{getWorkSummaryDisplayLabel(ts.workSummary, 2)}</TableCell>
                    <TableCell>
                      <TimesheetStatusDisplay status={ts.status} submittedLate={ts.submittedLate} />
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.85rem',
                        }}
                      >
                        {ts.totalHours != null ? Number(ts.totalHours).toFixed(2) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {isConsultantEditableStatus(ts.status) ? (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EditIcon sx={{ fontSize: '0.9rem' }} />}
                          onClick={() => navigate(`${basePath}/${ts.id}/edit`)}
                        >
                          Edit
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<VisibilityIcon sx={{ fontSize: '0.9rem' }} />}
                          onClick={() => navigate(`${basePath}/${ts.id}`)}
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
        ))}

      <Dialog
        open={missingWeekDialogOpen}
        onClose={creatingWeekStart ? undefined : () => setMissingWeekDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Create Missing Week</DialogTitle>
        <DialogContent dividers>
          {missingPastWeekStarts.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No eligible missing weeks are available right now.
            </Typography>
          ) : (
            <Stack spacing={1.25}>
              <Typography variant="body2" color="text.secondary">
                Select a missing week from the last 4 weeks.
              </Typography>
              {missingPastWeekStarts.map((weekStart) => {
                const isCreating = creatingWeekStart === weekStart
                return (
                  <Button
                    key={weekStart}
                    variant="outlined"
                    onClick={() => handleCreateForWeek(weekStart)}
                    disabled={creatingWeekStart !== null}
                    sx={{ justifyContent: 'space-between' }}
                  >
                    <span>{formatWeekStart(weekStart)}</span>
                    <span>{isCreating ? 'Creating...' : 'Create'}</span>
                  </Button>
                )
              })}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setMissingWeekDialogOpen(false)}
            disabled={creatingWeekStart !== null}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
