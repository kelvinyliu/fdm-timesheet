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
import EditNoteIcon from '@mui/icons-material/EditNote'
import HourglassTopIcon from '@mui/icons-material/HourglassTop'
import ReplayIcon from '@mui/icons-material/Replay'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import DashboardCard from '../../components/shared/DashboardCard'
import StatusBadge from '../../components/shared/StatusBadge'
import { useAuth } from '../../context/useAuth'
import { formatCurrency } from '../../utils/currency'
import { formatWeekStart, getCurrentMonday } from '../../utils/dateFormatters'

export default function ConsultantDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { timesheets, error } = useLoaderData()

  const firstName = user?.name?.split(' ')[0] || 'there'
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const currentWeekStart = getCurrentMonday()

  const drafts = timesheets.filter((t) => t.status === 'DRAFT')
  const pending = timesheets.filter((t) => t.status === 'PENDING')
  const rejected = timesheets.filter((t) => t.status === 'REJECTED')
  const approved = timesheets.filter((t) => t.status === 'APPROVED' || t.status === 'COMPLETED')
  const editableTimesheets = timesheets.filter(
    (t) => t.status === 'DRAFT' || t.status === 'REJECTED'
  )
  const sortedRecent = [...timesheets]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .slice(0, 5)

  const primaryAction = drafts[0]
    ? {
        label: 'Continue Draft',
        onClick: () => navigate(`/consultant/timesheets/${drafts[0].id}/edit`),
      }
    : rejected[0]
      ? {
          label: 'Fix Rejected Timesheet',
          onClick: () => navigate(`/consultant/timesheets/${rejected[0].id}/edit`),
        }
      : {
          label: 'View All Timesheets',
          onClick: () => navigate('/consultant/timesheets'),
        }


  const monthlyEarnings = timesheets
    .filter((ts) => {
      const date = new Date(ts.weekStart)
      return (
        (ts.status === 'APPROVED' || ts.status === 'COMPLETED') &&
        date.getMonth() === currentMonth &&
        date.getFullYear() === currentYear
      )
    })
    .reduce((acc, ts) => acc + (ts.totalBillAmount || 0), 0)

  const pendingPayment = timesheets
    .filter((ts) => ts.status === 'PENDING' || ts.status === 'APPROVED')
    .reduce((acc, ts) => acc + (ts.totalBillAmount || 0), 0)

  const currentWeekTimesheet = timesheets.find((ts) => ts.weekStart === currentWeekStart)
  const hoursThisWeek = Number(currentWeekTimesheet?.totalHours) || 0
  const utilizationLimit = 40
  const utilizationPercentage = Math.min((hoursThisWeek / utilizationLimit) * 100, 100)

  const ytdHours = timesheets
    .filter((ts) => new Date(ts.weekStart).getFullYear() === currentYear)
    .reduce((acc, ts) => acc + (Number(ts.totalHours) || 0), 0)

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
                fontSize: { xs: '2.4rem', sm: '2.8rem', md: '3.1rem' },
                lineHeight: 1.15,
                letterSpacing: '-0.01em',
                mb: 1.2,
              }}
            >
              Welcome back, {firstName}...
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
              Check your current timesheet progress, pick up drafts, and keep submissions moving.
            </Typography>

            <Chip
              label={
                editableTimesheets.length > 0
                  ? `${editableTimesheets.length} timesheet${editableTimesheets.length > 1 ? 's' : ''} need attention`
                  : 'Everything is up to date'
              }
              color={editableTimesheets.length > 0 ? 'warning' : 'success'}
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
              startIcon={<AccessTimeIcon />}
              onClick={primaryAction.onClick}
              sx={{ minWidth: 220 }}
            >
              {primaryAction.label}
            </Button>
          </Stack>
        </Stack>
      </Paper>
      <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid size={{ xs: 12, md: 8 }}>
        <Paper
          sx={{
            p: 3,
            height: '100%',
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}
        >
          <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Financial Health
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4} divider={<Divider orientation="vertical" flexItem />}>
            <Box>
              <Typography variant="caption" color="text.secondary">Earned this Month</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'success.main', fontFamily: '"JetBrains Mono", monospace' }}>
                {formatCurrency(monthlyEarnings)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Pending Payment</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'warning.main', fontFamily: '"JetBrains Mono", monospace' }}>
                {formatCurrency(pendingPayment)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">YTD Total Hours</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: '"JetBrains Mono", monospace' }}>
                {ytdHours.toFixed(1)} <span style={{ fontSize: '0.8rem', color: 'gray' }}>HRS</span>
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <Paper
          sx={{
            p: 3,
            height: '100%',
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
      <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Weekly Utilization
      </Typography>
      <Box sx={{ mt: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-end" sx={{ mb: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1 }}>
            {Math.round(utilizationPercentage)}%
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {hoursThisWeek} / {utilizationLimit} hrs
          </Typography>
        </Stack>
        <Box
          sx={{
            height: 10,
            width: '100%',
            bgcolor: 'action.hover',
            borderRadius: 5,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <Box
            sx={{
              height: '100%',
              width: `${utilizationPercentage}%`,
              bgcolor: utilizationPercentage >= 100 ? 'success.main' : 'primary.main',
              transition: 'width 1s ease-in-out',
            }}
          />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {utilizationPercentage >= 100 ? "Goal reached! Great work." : "Keep it up to reach your 40hr goal."}
        </Typography>
      </Box>
    </Paper>
  </Grid>
</Grid>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <DashboardCard
            icon={EditNoteIcon}
            label="Drafts"
            value={drafts.length}
            subtitle="Still being worked on"
            color="#1976D2"
            onClick={() => navigate('/consultant/timesheets?tab=approved')}
            delay={80}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <DashboardCard
            icon={HourglassTopIcon}
            label="Pending"
            value={pending.length}
            subtitle="Waiting for review"
            color="#C58A00"
            onClick={() => navigate('/consultant/timesheets?tab=approved')}
            delay={160}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <DashboardCard
            icon={ReplayIcon}
            label="Rejected"
            value={rejected.length}
            subtitle="Needs correction"
            color="#D32F2F"
            onClick={() => navigate('/consultant/timesheets?tab=approved')}
            delay={240}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <DashboardCard
            icon={AccessTimeIcon}
            label="Approved / Paid"
            value={approved.length}
            subtitle="Completed submissions"
            color="#2E7D32"
            onClick={() => navigate('/consultant/timesheets?tab=approved')}
            delay={320}
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
          animationDelay: '400ms',
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
              Recent timesheets
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Open your latest timesheets and pick up where you left off.
            </Typography>
          </Box>

          <Button
            size="small"
            variant="outlined"
            onClick={() => navigate('/consultant/timesheets?tab=approved')}
          >
            View all timesheets
          </Button>
        </Stack>

        {sortedRecent.length === 0 ? (
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
              No timesheets yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create your first timesheet to get started.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {sortedRecent.map((ts) => {
              const isEditable = ts.status === 'DRAFT' || ts.status === 'REJECTED'
              const targetPath = isEditable
                ? `/consultant/timesheets/${ts.id}/edit`
                : `/consultant/timesheets/${ts.id}`

              return (
                <Box
                  key={ts.id}
                  onClick={() => navigate(targetPath)}
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
                        {formatWeekStart(ts.weekStart)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.85 }}>
                        {ts.totalHours != null
                          ? `${Number(ts.totalHours).toFixed(2)} hrs (${isEditable ? 'Editable' : 'Read-only'})`
                          : isEditable
                            ? 'Editable'
                            : 'Read-only'}
                      </Typography>
                    </Box>

                    <StatusBadge status={ts.status} />
                  </Stack>
                </Box>
              )
            })}

            <Divider sx={{ my: 0.5 }} />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="flex-start">
              <Button variant="contained" onClick={primaryAction.onClick}>
                {primaryAction.label}
              </Button>
            </Stack>
          </Stack>
        )}
      </Paper>
    </Box>
  )
}
