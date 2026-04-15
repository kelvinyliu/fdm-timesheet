import { useState } from 'react'
import { useLoaderData, useLocation, useNavigate } from 'react-router'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PageHeader from '../../components/shared/PageHeader'
import { createTimesheet } from '../../api/timesheets'
import { formatWeekStart } from '../../utils/dateFormatters'

export default function TimesheetCreatePage({ basePath = '/consultant/timesheets' }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { weekStart, error: loadError } = useLoaderData()
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const returnTo = location.state?.returnTo ?? basePath

  async function handleCreate() {
    setSubmitError(null)
    setSubmitting(true)
    try {
      const newTimesheet = await createTimesheet({ weekStart })
      navigate(`${basePath}/${newTimesheet.id}/edit`, {
        replace: true,
        state: { returnTo },
      })
    } catch (err) {
      setSubmitError(err.message ?? 'Failed to create timesheet.')
      setSubmitting(false)
    }
  }

  return (
    <Box>
      <PageHeader title="New Timesheet" subtitle={`Week of ${formatWeekStart(weekStart)}`}>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate(returnTo)}>
          Back
        </Button>
      </PageHeader>

      <Box sx={{ maxWidth: 560 }}>
        <Stack spacing={3}>
          {loadError && <Alert severity="warning">{loadError}</Alert>}
          {submitError && <Alert severity="error">{submitError}</Alert>}

          <Box>
            <Typography variant="body1" sx={{ mb: 1 }}>
              Create this week&apos;s timesheet, then add client or Internal work categories inside
              the editor.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You can split a day across multiple clients and non-client work after the draft is
              created.
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button variant="contained" onClick={handleCreate} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Timesheet'}
            </Button>
            <Button variant="outlined" onClick={() => navigate(returnTo)} disabled={submitting}>
              Cancel
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Box>
  )
}
