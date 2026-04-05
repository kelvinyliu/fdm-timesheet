import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import SaveIcon from '@mui/icons-material/Save'
import SendIcon from '@mui/icons-material/Send'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import PageHeader from '../../components/shared/PageHeader'
import { palette } from '../../theme.js'
import { getTimesheet, updateEntries, submitTimesheet, autofillTimesheet } from '../../api/timesheets'
import { buildWeekDates, formatWeekStart } from '../../utils/dateFormatters'
import {
  buildAutofillHours,
  isConsultantEditableStatus,
} from '../../utils/timesheetWorkflow.js'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function buildInitialHours(weekStart, existingEntries) {
  const dates = buildWeekDates(weekStart)
  return dates.map((date) => {
    const match = existingEntries.find((e) => e.date === date || e.date?.slice(0, 10) === date)
    return match ? String(parseFloat(match.hoursWorked) || 0) : '0'
  })
}

export default function TimesheetEditPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const autofillWarningShown = useRef(false)

  const [timesheet, setTimesheet] = useState(null)
  const [hours, setHours] = useState(Array(7).fill('0'))
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)

  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [autofilling, setAutofilling] = useState(false)

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })

  useEffect(() => {
    const autofillFeedback =
      location.state?.autofillFeedback ??
      (location.state?.autofillWarning
        ? { severity: 'warning', message: location.state.autofillWarning }
        : null)

    if (!autofillFeedback || autofillWarningShown.current) return

    autofillWarningShown.current = true
    setSnackbar({
      open: true,
      message: autofillFeedback.message,
      severity: autofillFeedback.severity,
    })
    navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    getTimesheet(id)
      .then((ts) => {
        if (!isConsultantEditableStatus(ts.status)) {
          navigate(`/consultant/timesheets/${id}`, { replace: true })
          return
        }
        setTimesheet(ts)
        setHours(buildInitialHours(ts.weekStart, ts.entries ?? []))
      })
      .catch((err) => setFetchError(err.message ?? 'Failed to load timesheet'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  function handleHoursChange(index, value) {
    setHours((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  function getEntriesPayload() {
    const dates = buildWeekDates(timesheet.weekStart)
    return dates.map((date, i) => ({
      date,
      hoursWorked: parseFloat(hours[i]) || 0,
    }))
  }

  function showSnackbar(message, severity = 'success') {
    setSnackbar({ open: true, message, severity })
  }

  async function handleSaveDraft() {
    setSaving(true)
    try {
      await updateEntries(id, getEntriesPayload())
      showSnackbar('Draft saved successfully.')
    } catch (err) {
      showSnackbar(err.message ?? 'Failed to save draft.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      await updateEntries(id, getEntriesPayload())
      await submitTimesheet(id)
      navigate(`/consultant/timesheets/${id}`)
    } catch (err) {
      showSnackbar(err.message ?? 'Failed to submit timesheet.', 'error')
      setSubmitting(false)
    }
  }

  async function handleAutofill() {
    setAutofilling(true)
    try {
      const prevEntries = await autofillTimesheet(id)
      if (!prevEntries || prevEntries.length === 0) {
        showSnackbar('No previous week entries found.', 'info')
        return
      }
      setHours(buildAutofillHours(timesheet.weekStart, prevEntries))
      showSnackbar('Hours filled from previous week.')
    } catch (err) {
      showSnackbar(err.message ?? 'Autofill failed.', 'error')
    } finally {
      setAutofilling(false)
    }
  }

  const totalHours = hours.reduce((sum, h) => sum + (parseFloat(h) || 0), 0)

  if (loading) return <LoadingSpinner />

  if (fetchError) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 3 }}>
          {fetchError}
        </Alert>
        <Button variant="outlined" onClick={() => navigate('/consultant/timesheets')}>
          Back to Timesheets
        </Button>
      </Box>
    )
  }

  const weekDates = buildWeekDates(timesheet.weekStart)
  const isBusy = saving || submitting || autofilling

  return (
    <Box>
      <PageHeader
        title="Edit Timesheet"
        subtitle={`Week of ${formatWeekStart(timesheet.weekStart)}`}
      >
        <Button
          variant="outlined"
          startIcon={<AutoFixHighIcon />}
          onClick={handleAutofill}
          disabled={isBusy}
        >
          {autofilling ? 'Loading...' : 'Autofill from last week'}
        </Button>
      </PageHeader>

      {isMobile ? (
        <Paper sx={{ mb: 3, overflow: 'hidden' }}>
          {weekDates.map((date, i) => {
            const isWeekend = i >= 5
            return (
              <Box
                key={date}
                sx={{
                  px: 2,
                  py: 2,
                  backgroundColor: isWeekend ? palette.overlayTextSoft : 'transparent',
                  borderTop: i === 0 ? 'none' : `1px solid ${palette.border}`,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 1.5 }}>
                  <Box>
                    <Typography
                      variant="body2"
                      fontWeight={isWeekend ? 400 : 600}
                      sx={isWeekend ? { color: 'text.secondary' } : undefined}
                    >
                      {DAY_LABELS[i]}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatWeekStart(date)}
                    </Typography>
                  </Box>
                </Box>

                <TextField
                  label="Hours worked"
                  type="number"
                  fullWidth
                  value={hours[i]}
                  onChange={(e) => handleHoursChange(i, e.target.value)}
                  size="small"
                  slotProps={{
                    htmlInput: {
                      min: 0,
                      max: 24,
                      step: 0.5,
                      style: {
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.9rem',
                      },
                    },
                  }}
                  disabled={isBusy}
                />
              </Box>
            )
          })}
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ mb: 3, overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Day</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right">Hours Worked</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {weekDates.map((date, i) => {
                const isWeekend = i >= 5
                return (
                  <TableRow
                    key={date}
                    sx={isWeekend ? { backgroundColor: palette.overlayTextSoft } : {}}
                  >
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight={isWeekend ? 400 : 500}
                        sx={isWeekend ? { color: 'text.secondary' } : {}}
                      >
                        {DAY_LABELS[i]}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatWeekStart(date)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.5 }}>
                      <TextField
                        type="number"
                        value={hours[i]}
                        onChange={(e) => handleHoursChange(i, e.target.value)}
                        size="small"
                        slotProps={{
                          htmlInput: {
                            min: 0,
                            max: 24,
                            step: 0.5,
                            style: {
                              textAlign: 'right',
                              width: 80,
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: '0.85rem',
                            },
                          },
                        }}
                        disabled={isBusy}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Divider sx={{ mb: 2 }} />

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.25 }}>
            Total Hours
          </Typography>
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '1.5rem',
              fontWeight: 600,
              color: palette.textPrimary,
            }}
          >
            {totalHours % 1 === 0 ? totalHours : totalHours.toFixed(1)}
          </Typography>
        </Box>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={handleSaveDraft}
          disabled={isBusy}
        >
          {saving ? 'Saving...' : 'Save Draft'}
        </Button>
        <Button
          variant="contained"
          color="success"
          startIcon={<SendIcon />}
          onClick={handleSubmit}
          disabled={isBusy}
        >
          {submitting ? 'Submitting...' : 'Submit Timesheet'}
        </Button>
        <Button
          variant="outlined"
          onClick={() => navigate('/consultant/timesheets')}
          disabled={isBusy}
        >
          Cancel
        </Button>
      </Stack>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
