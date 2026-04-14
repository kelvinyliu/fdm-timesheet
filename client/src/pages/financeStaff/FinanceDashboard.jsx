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
import PaymentsIcon from '@mui/icons-material/Payments'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import DashboardCard from '../../components/shared/DashboardCard'
import StatusBadge from '../../components/shared/StatusBadge'
import { useAuth } from '../../context/useAuth'
import { formatWeekStart } from '../../utils/dateFormatters'
import { getConsultantDisplayLabel } from '../../utils/displayLabels'

export default function FinanceDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { timesheets, error } = useLoaderData()

  const firstName = user?.name?.split(' ')[0] || 'there'
  const approved = timesheets.filter((t) => t.status === 'APPROVED')
  const completed = timesheets.filter((t) => t.status === 'COMPLETED')
  const totalApprovedHours = approved.reduce((sum, ts) => sum + Number(ts.totalHours || 0), 0)
  const readyForPayment = [...approved]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .slice(0, 5)

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
              Welcome back, {firstName}
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
              Review approved timesheets, process payments, and keep payroll moving smoothly.
            </Typography>

            <Chip
              label={
                approved.length > 0
                  ? `${approved.length} timesheet${approved.length > 1 ? 's' : ''} ready for payment`
                  : 'No timesheets awaiting payment'
              }
              color={approved.length > 0 ? 'warning' : 'success'}
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
              startIcon={<PaymentsIcon />}
              onClick={() => navigate('/finance/timesheets')}
              sx={{ minWidth: 220 }}
            >
              Process Payments
            </Button>

            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/finance/timesheets')}
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
        <Grid size={{ xs: 12, md: 4 }}>
          <DashboardCard
            icon={PaymentsIcon}
            label="Awaiting Payment"
            value={approved.length}
            subtitle="Approved and ready to process"
            color="#C58A00"
            onClick={() => navigate('/finance/timesheets')}
            delay={80}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <DashboardCard
            icon={TaskAltIcon}
            label="Paid"
            value={completed.length}
            subtitle="Already processed"
            color="#2E7D32"
            onClick={() => navigate('/finance/timesheets')}
            delay={160}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <DashboardCard
            icon={ReceiptLongIcon}
            label="Workload"
            value={totalApprovedHours}
            subtitle="Hours awaiting payment"
            color="#1976D2"
            onClick={() => navigate('/finance/timesheets?status=APPROVED')}
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
              Ready for payment
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Open approved timesheets and complete payment processing.
            </Typography>
          </Box>

          <Button size="small" variant="outlined" onClick={() => navigate('/finance/timesheets')}>
            View all finance timesheets
          </Button>
        </Stack>

        {readyForPayment.length === 0 ? (
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
              Nothing waiting right now
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Approved timesheets will appear here when they are ready for payment.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {readyForPayment.map((ts) => (
              <Box
                key={ts.id}
                onClick={() => navigate(`/finance/timesheets/${ts.id}`)}
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
                      {ts.totalHours != null && ` (${Number(ts.totalHours).toFixed(2)} hrs)`}
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
                onClick={() => navigate('/finance/timesheets?status=APPROVED')}
              >
                Process approved timesheets
              </Button>
              <Button variant="text" onClick={() => navigate('/finance/timesheets')}>
                Browse all finance timesheets
              </Button>
            </Stack>
          </Stack>
        )}
      </Paper>
    </Box>
  )
}
