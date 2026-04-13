import { useLoaderData, useNavigate } from 'react-router'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import RateReviewIcon from '@mui/icons-material/RateReview'
import DashboardCard from '../../components/shared/DashboardCard'
import StatusBadge from '../../components/shared/StatusBadge'
import { useAuth } from '../../context/useAuth'
import { formatWeekStart } from '../../utils/dateFormatters'
import { getConsultantDisplayLabel } from '../../utils/displayLabels'
import {
  buildManagerTimesheetListPath,
  MANAGER_STATUS_FILTERS,
} from './utils/managerTimesheetFilters.js'

export default function ManagerDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { timesheets, error } = useLoaderData()

  const firstName = user?.name?.split(' ')[0] || 'there'
  const pending = timesheets.filter((t) => t.status === 'PENDING')
  const approved = timesheets.filter((t) => t.status === 'APPROVED' || t.status === 'COMPLETED')
  const rejected = timesheets.filter((t) => t.status === 'REJECTED')

  return (
    <Box sx={{ maxWidth: 1200, width: '100%' }}>
      <Paper
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 3,
          mb: 4,
          border: '1px solid',
          borderColor: 'divider',
          animation: 'dashboardHeroIn 0.45s ease both',
          '@keyframes dashboardHeroIn': {
            from: { opacity: 0, transform: 'translateY(10px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={3}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography
              sx={{
                fontFamily: '"Instrument Serif", Georgia, serif',
                fontSize: { xs: '2.4rem', sm: '2.8rem', md: '3.1rem' },
                lineHeight: 1.15,
                letterSpacing: '-0.01em',
                mb: 1.2,
                animation: 'fadeIn 0.4s ease',
                '@keyframes fadeIn': {
                  from: { opacity: 0, transform: 'translateY(6px)' },
                  to: { opacity: 1, transform: 'translateY(0)' },
                },
              }}
            >
              Welcome back, {firstName}...
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
              Review submitted timesheets, keep approvals moving, and make sure your team gets clear
              feedback quickly.
            </Typography>

            <Chip
              label={
                pending.length > 0
                  ? `${pending.length} pending review${pending.length > 1 ? 's' : ''}`
                  : 'No pending reviews'
              }
              color={pending.length > 0 ? 'warning' : 'success'}
              variant="outlined"
            />
          </Box>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ width: { xs: '100%', md: 'auto' } }}
          >
            <Button
              variant="contained"
              size="large"
              startIcon={<RateReviewIcon />}
              onClick={() => navigate(buildManagerTimesheetListPath(MANAGER_STATUS_FILTERS.PENDING))}
              sx={{ minWidth: 220 }}
            >
              Review Pending
            </Button>

            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/manager/timesheets')}
              sx={{ minWidth: 180 }}
            >
              View All
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <DashboardCard
            icon={HourglassEmptyIcon}
            label="Pending Reviews"
            value={pending.length}
            subtitle="Needs attention now"
            color="#C58A00"
            onClick={() => navigate(buildManagerTimesheetListPath(MANAGER_STATUS_FILTERS.PENDING))}
            delay={80}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <DashboardCard
            icon={CheckCircleOutlineIcon}
            label="Approved"
            value={approved.length}
            subtitle="Already signed off"
            color="#2E7D32"
            onClick={() =>
              navigate(buildManagerTimesheetListPath(MANAGER_STATUS_FILTERS.APPROVED_GROUP))
            }
            delay={160}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <DashboardCard
            icon={ErrorOutlineIcon}
            label="Rejected"
            value={rejected.length}
            subtitle="Returned for changes"
            color="#D32F2F"
            onClick={() =>
              navigate(buildManagerTimesheetListPath(MANAGER_STATUS_FILTERS.REJECTED))
            }
            delay={240}
          />
        </Grid>
      </Grid>

      <Paper
        sx={{
          p: { xs: 2.5, sm: 3 },
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          animation: 'dashboardPanelIn 0.45s ease both',
          animationDelay: '320ms',
          '@keyframes dashboardPanelIn': {
            from: { opacity: 0, transform: 'translateY(10px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
          sx={{ mb: 2.5 }}
        >
          <Box>
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              Pending reviews
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Open the most recent submissions waiting for your decision.
            </Typography>
          </Box>

          <Button
            size="small"
            variant="outlined"
            onClick={() => navigate(buildManagerTimesheetListPath(MANAGER_STATUS_FILTERS.PENDING))}
          >
            View all pending
          </Button>
        </Stack>

        {pending.length === 0 ? (
          <Box
            sx={{
              py: 5,
              textAlign: 'center',
              borderRadius: 2,
              border: '1px dashed',
              borderColor: 'divider',
            }}
          >
            <Typography sx={{ fontSize: '1.15rem', fontWeight: 600, mb: 0.5 }}>
              All caught up
            </Typography>
            <Typography variant="body2" color="text.secondary">
              No timesheets are waiting for review right now.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {pending.slice(0, 5).map((ts) => (
              <Box
                key={ts.id}
                onClick={() => navigate(`/manager/timesheets/${ts.id}`)}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  cursor: 'pointer',
                  transition:
                    'background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                    borderColor: 'text.primary',
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  justifyContent="space-between"
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 0.4 }}>
                      {getConsultantDisplayLabel(ts.consultantName)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatWeekStart(ts.weekStart)}
                      {ts.totalHours != null && ` (${ts.totalHours} hrs)`}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <StatusBadge status={ts.status} />
                  </Stack>
                </Stack>
              </Box>
            ))}

            <Divider sx={{ my: 0.5 }} />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="flex-start">
              <Button
                variant="contained"
                onClick={() => navigate('/manager/timesheets?status=PENDING')}
              >
                Review pending
              </Button>
              <Button variant="text" onClick={() => navigate('/manager/timesheets')}>
                Browse all timesheets
              </Button>
            </Stack>
          </Stack>
        )}
      </Paper>
    </Box>
  )
}
