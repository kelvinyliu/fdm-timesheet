import { useEffect, useState } from 'react'
import { useLoaderData, useLocation, useNavigate } from 'react-router'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
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
import MobileDetailDrawer from '../../components/shared/MobileDetailDrawer.jsx'
import useQueryState from '../../hooks/useQueryState.js'
import { createTimesheet } from '../../api/timesheets'
import { formatWeekStart, getCurrentMonday } from '../../utils/dateFormatters'
import { getWorkSummaryDisplayLabel } from '../../utils/displayLabels'
import {
  getConsultantVisibleStatus,
  getTimesheetForWeek,
  isConsultantApprovedStatus,
  isConsultantEditableStatus,
  isConsultantPendingStatus,
} from '../../utils/timesheetWorkflow.js'

export default function TimesheetListPage({
  basePath = '/consultant/timesheets',
  title = 'My Timesheets',
  subtitle = 'View and manage your weekly timesheets',
}) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const location = useLocation()
  const navigate = useNavigate()
  const { timesheets, eligibility, error: loadError, eligibilityError } = useLoaderData()
  const [error, setError] = useState(loadError)
  const [missingWeekDialogOpen, setMissingWeekDialogOpen] = useState(false)
  const [creatingWeekStart, setCreatingWeekStart] = useState(null)
  const [selectedMobileId, setSelectedMobileId] = useState(null)
  const [tab, setTab] = useQueryState('tab', 'active')
  const normalizedTab = tab === 'approved' ? 'history' : tab
  const activeTab = normalizedTab === 'history' ? 1 : 0
  const returnTo = `${location.pathname}${location.search}`

  useEffect(() => {
    if (tab === 'approved') {
      setTab('history')
    }
  }, [setTab, tab])

  const selectedMobileTimesheet = timesheets.find((ts) => ts.id === selectedMobileId)
  const isMobileEditable = selectedMobileTimesheet ? isConsultantEditableStatus(selectedMobileTimesheet.status) : false
  const mobileActionLabel = isMobileEditable ? 'Edit Timesheet' : 'View Timesheet'
  const MobileActionIcon = selectedMobileTimesheet && isMobileEditable ? EditIcon : VisibilityIcon
  const mobileDestination = selectedMobileTimesheet ? (isMobileEditable ? `${basePath}/${selectedMobileId}/edit` : `${basePath}/${selectedMobileId}`) : ''

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
      navigate(`${basePath}/${newTimesheet.id}/edit`, {
        replace: true,
        state: { returnTo },
      })
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
                : `${basePath}/${currentWeekTimesheet.id}`,
              { state: { returnTo } }
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
          onClick={() => navigate(`${basePath}/new`, { state: { returnTo } })}
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
  const pendingCount = timesheets.filter((ts) => isConsultantPendingStatus(ts.status)).length
  const rejectedCount = timesheets.filter((ts) => ts.status === 'REJECTED').length
  const approvedOrPaidCount = timesheets.filter((ts) => isConsultantApprovedStatus(ts.status)).length

  const displayTimesheets = timesheets.filter((ts) =>
    activeTab === 0
      ? ts.status === 'DRAFT' || isConsultantPendingStatus(ts.status) || ts.status === 'REJECTED'
      : isConsultantApprovedStatus(ts.status)
  )

  return (
    <Box>
      <PageHeader title={title} subtitle={subtitle}>
        {renderPrimaryActionButton()}
        {renderMissingWeekButton()}
      </PageHeader>

      {!error && timesheets.length > 0 && (
        <Box
          sx={{
            mb: 4,
            pb: 3,
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
            gap: { xs: 3, sm: 4 },
          }}
        >
          {[
            { label: 'Drafts', count: draftCount, color: 'text.primary' },
            { label: 'Pending', count: pendingCount, color: '#8a5a00' },
            { label: 'Rejected', count: rejectedCount, color: '#e55c58' },
            { label: 'Approved / Paid', count: approvedOrPaidCount, color: '#2f6b36' },
          ].map((item) => (
            <Box key={item.label}>
              <Typography
                sx={{
                  fontSize: '0.72rem',
                  fontWeight: 500,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.18em',
                  mb: 1,
                }}
              >
                {item.label}
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"Outfit", system-ui, sans-serif',
                  fontWeight: 400,
                  fontSize: { xs: '2.2rem', sm: '2.6rem' },
                  lineHeight: 1,
                  letterSpacing: '-0.03em',
                  color: item.color,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {item.count}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_e, val) => setTab(val === 1 ? 'history' : 'active')}>
          <Tab label={`Pending & Drafts (${draftCount + pendingCount + rejectedCount})`} />
          <Tab label={`Approved & Paid (${approvedOrPaidCount})`} />
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
        <Box
          sx={{
            py: 6,
            textAlign: 'center',
            borderTop: '1px dashed',
            borderBottom: '1px dashed',
            borderColor: 'divider',
          }}
        >
          <Typography
            sx={{
              fontFamily: '"Outfit", system-ui, sans-serif',
              fontSize: '1.3rem',
              color: 'text.primary',
              mb: 0.5,
            }}
          >
            {timesheets.length === 0
              ? 'No timesheets yet'
              : activeTab === 0
                ? 'No pending or draft timesheets'
                : 'No approved or paid timesheets'}
          </Typography>
          {timesheets.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Create one to get started.
            </Typography>
          )}
        </Box>
      )}

      {!error &&
        displayTimesheets.length > 0 &&
        (isMobile ? (
          <Stack
            divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}
            spacing={0}
          >
            {displayTimesheets.map((ts) => {
              return (
                <ButtonBase
                  key={ts.id}
                  component="button"
                  type="button"
                  onClick={() => setSelectedMobileId(ts.id)}
                  aria-label={`Open details for timesheet week of ${formatWeekStart(ts.weekStart)}`}
                  sx={{
                    width: '100%',
                    display: 'block',
                    textAlign: 'left',
                    py: 2.25,
                    px: 1,
                    mx: -1,
                    borderRadius: 1.5,
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease',
                    '&:hover': { backgroundColor: 'action.hover' },
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                    <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
                      <Typography variant="body2" fontWeight={600} sx={{ mb: 0.25 }} noWrap>
                        {formatWeekStart(ts.weekStart)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {getWorkSummaryDisplayLabel(ts.workSummary, 2)}
                        {ts.totalHours != null && ` · ${Number(ts.totalHours).toFixed(2)} hrs`}
                      </Typography>
                    </Box>
                    <TimesheetStatusDisplay
                      status={getConsultantVisibleStatus(ts.status)}
                      submittedLate={ts.submittedLate}
                    />
                  </Stack>
                </ButtonBase>
              )
            })}
          </Stack>
        ) : (
          <TableContainer component={Paper}>
            <Table sx={{ tableLayout: 'auto' }}>
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
                {displayTimesheets.map((ts) => {
                  const editable = isConsultantEditableStatus(ts.status)
                  const destination = editable
                    ? `${basePath}/${ts.id}/edit`
                    : `${basePath}/${ts.id}`
                  return (
                    <TableRow
                      key={ts.id}
                      hover
                      tabIndex={0}
                      onClick={() => navigate(destination, { state: { returnTo } })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          navigate(destination, { state: { returnTo } })
                        }
                      }}
                      sx={{
                        cursor: 'pointer',
                        '&:focus-visible': {
                          outline: '2px solid',
                          outlineColor: 'primary.main',
                          outlineOffset: -2,
                        },
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {formatWeekStart(ts.weekStart)}
                        </Typography>
                      </TableCell>
                      <TableCell>{getWorkSummaryDisplayLabel(ts.workSummary, 2)}</TableCell>
                      <TableCell>
                        <TimesheetStatusDisplay
                          status={getConsultantVisibleStatus(ts.status)}
                          submittedLate={ts.submittedLate}
                        />
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
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        {editable ? (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditIcon sx={{ fontSize: '0.9rem' }} />}
                            onClick={() =>
                              navigate(`${basePath}/${ts.id}/edit`, { state: { returnTo } })
                            }
                          >
                            Edit
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<VisibilityIcon sx={{ fontSize: '0.9rem' }} />}
                            onClick={() =>
                              navigate(`${basePath}/${ts.id}`, { state: { returnTo } })
                            }
                          >
                            View
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ))}

      {isMobile && selectedMobileTimesheet && (
        <MobileDetailDrawer
          open={!!selectedMobileId}
          onClose={() => setSelectedMobileId(null)}
          title={`Week of ${formatWeekStart(selectedMobileTimesheet.weekStart)}`}
          subtitle={getWorkSummaryDisplayLabel(selectedMobileTimesheet.workSummary, 3)}
          data={[
            {
              label: 'Status',
              node: (
                <Stack direction="row" sx={{ mt: 0.5 }}>
                  <TimesheetStatusDisplay
                    status={getConsultantVisibleStatus(selectedMobileTimesheet.status)}
                    submittedLate={selectedMobileTimesheet.submittedLate}
                  />
                </Stack>
              ),
            },
            {
              label: 'Total Hours',
              value:
                selectedMobileTimesheet.totalHours != null
                  ? `${Number(selectedMobileTimesheet.totalHours).toFixed(2)} hrs`
                  : '-',
            },
          ]}
          actions={
            <Button
              variant="contained"
              fullWidth
              size="large"
              startIcon={<MobileActionIcon />}
              onClick={() => navigate(mobileDestination, { state: { returnTo } })}
            >
              {mobileActionLabel}
            </Button>
          }
        />
      )}

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
