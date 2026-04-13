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
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import PageHeader from '../../components/shared/PageHeader'
import TimesheetStatusDisplay from '../../components/shared/TimesheetStatusDisplay.jsx'
import {
  createTimesheet,
  getEligibleWeeks,
  getTimesheets,
} from '../../api/timesheets'
import { formatWeekStart, getCurrentMonday } from '../../utils/dateFormatters'
import { getWorkSummaryDisplayLabel } from '../../utils/displayLabels'
import {
  getTimesheetForWeek,
  isConsultantEditableStatus,
} from '../../utils/timesheetWorkflow.js'

const EMPTY_ELIGIBILITY = {
  currentWeekStart: getCurrentMonday(),
  missingPastWeekStarts: [],
}

export default function TimesheetListPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const navigate = useNavigate()
  const [timesheets, setTimesheets] = useState([])
  const [eligibility, setEligibility] = useState(EMPTY_ELIGIBILITY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [eligibilityError, setEligibilityError] = useState(null)
  const [missingWeekDialogOpen, setMissingWeekDialogOpen] = useState(false)
  const [creatingWeekStart, setCreatingWeekStart] = useState(null)

  useEffect(() => {
    let active = true

    Promise.allSettled([getTimesheets(), getEligibleWeeks()])
      .then(([timesheetResult, eligibilityResult]) => {
        if (!active) return

        if (timesheetResult.status === 'fulfilled') {
          setTimesheets(timesheetResult.value)
        } else {
          setError(timesheetResult.reason?.message ?? 'Failed to load timesheets')
        }

        if (eligibilityResult.status === 'fulfilled') {
          setEligibility(eligibilityResult.value)
        } else {
          setEligibilityError('Missing-week creation is temporarily unavailable.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  if (loading) return <LoadingSpinner />

  const currentMonday = eligibility.currentWeekStart || getCurrentMonday()
  const missingPastWeekStarts = eligibility.missingPastWeekStarts ?? []
  const currentWeekTimesheet = getTimesheetForWeek(timesheets, currentMonday)
  const canCreateCurrentWeek = !currentWeekTimesheet
  const missingWeekButtonTooltip = eligibilityError
    ?? (missingPastWeekStarts.length > 0
      ? ''
      : 'No missing weeks are available in the last 4 weeks.')

  async function handleCreateForWeek(weekStart) {
    setError(null)
    setCreatingWeekStart(weekStart)

    try {
      const newTimesheet = await createTimesheet({ weekStart })
      setMissingWeekDialogOpen(false)
      navigate(`/consultant/timesheets/${newTimesheet.id}/edit`, { replace: true })
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
                ? `/consultant/timesheets/${currentWeekTimesheet.id}/edit`
                : `/consultant/timesheets/${currentWeekTimesheet.id}`
            )
          }
        >
          {isEditable ? 'Continue Timesheet' : 'View Timesheet'}
        </Button>
      )
    }

    if (canCreateCurrentWeek) {
      return (
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/consultant/timesheets/new')}
          sx={{backgroundColor : '#c5ff00', '&:hover': {backgroundColor: '#000000',color: '#ffffff'}}}
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
      <Tooltip title={missingWeekButtonTooltip || 'Create a missing timesheet from the last 4 weeks'}>
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

  return (
    <Box>
      <PageHeader title="My Timesheets" subtitle="View and manage your weekly timesheets">
        {renderPrimaryActionButton()}
        {renderMissingWeekButton()}
      
      </PageHeader>

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
              fontFamily: 'Poppins, Georgia, serif',
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
              <TableHead >
                <TableRow >
                  <TableCell sx ={{ backgroundColor: '#1e1e1e !important', color: '#ffffff !important',fontSize: '1.3rem !important' }}>Week of</TableCell>
                  <TableCell sx ={{ backgroundColor: '#1e1e1e !important', color: '#ffffff !important',fontSize: '1.3rem !important' }}>Work Categories</TableCell>
                  <TableCell sx ={{ backgroundColor: '#1e1e1e !important', color: '#ffffff !important',fontSize: '1.3rem !important' }}>Status</TableCell>
                  <TableCell align="right" sx ={{ backgroundColor: '#1e1e1e !important', color: '#ffffff !important',fontSize: '1.3rem !important' }}>
                    Total Hours
                  </TableCell>
                  <TableCell align="right" sx ={{ backgroundColor: '#1e1e1e !important', color: '#ffffff !important',fontSize: '1.3rem !important' }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {timesheets.map((ts) => (
                  <TableRow key={ts.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{fontSize: '1rem'}}>
                        {formatWeekStart(ts.weekStart)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{fontFamily : '"Outfit", system-ui, sans-serif', fontSize: '1rem !important'}}>{getWorkSummaryDisplayLabel(ts.workSummary, 2)}</TableCell>
                    <TableCell>
                      <TimesheetStatusDisplay status={ts.status} submittedLate={ts.submittedLate} />
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        sx={{
                          fontFamily: '"Outfit", system-ui, sans-serif',
                          fontSize: '1rem',
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
