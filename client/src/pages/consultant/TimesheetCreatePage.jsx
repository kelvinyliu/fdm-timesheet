import { useState } from 'react'
import { useLoaderData, useNavigate } from 'react-router'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PageHeader from '../../components/shared/PageHeader'
import { createTimesheet } from '../../api/timesheets'
import { formatWeekStart } from '../../utils/dateFormatters'

export default function TimesheetCreatePage({
  basePath = '/consultant/timesheets',
}) {
  const navigate = useNavigate()
  const { weekStart } = useLoaderData()
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  async function handleCreate() {
    setSubmitError(null)
    setSubmitting(true)
    try {
      const newTimesheet = await createTimesheet({ weekStart })
      navigate(`${basePath}/${newTimesheet.id}/edit`, { replace: true })
    } catch (err) {
      setSubmitError(err.message ?? 'Failed to create timesheet.')
      setSubmitting(false)
    }
  }

  return (
    <Box>
      <PageHeader
        title="New Timesheet"
        subtitle={`Week of ${formatWeekStart(weekStart)}`}
      >
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(basePath)}
        >
          Back
        </Button>
      </PageHeader>

      <Paper sx={{ p: { xs: 2.5, sm: 4 }, maxWidth: 560 }}>
        <Stack spacing={3}>
          {submitError && (
            <Alert severity="error">
              {submitError}
            </Alert>
          )}

          <Box>
            <Typography variant="body1" sx={{ mb: 1 }}>
              Create this week&apos;s timesheet, then add client or Internal work categories inside the editor.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You can split a day across multiple clients and non-client work after the draft is created.
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button
              variant="contained"
              onClick={handleCreate}
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create Timesheet'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate(basePath)}
              disabled={submitting}
            >
              Cancel
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  )
}
