import { useLoaderData, useNavigate } from 'react-router'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import PeopleIcon from '@mui/icons-material/People'
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount'
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts'
import HistoryIcon from '@mui/icons-material/History'
import DashboardCard from '../../components/shared/DashboardCard'
import { getAuditActionDisplayLabel } from '../../utils/displayLabels.js'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { users, auditLog, error } = useLoaderData()

  const consultants = users.filter((u) => u.role === 'CONSULTANT').length
  const managers = users.filter((u) => u.role === 'LINE_MANAGER').length
  const financeManagers = users.filter((u) => u.role === 'FINANCE_MANAGER').length
  const admins = users.filter((u) => u.role === 'SYSTEM_ADMIN').length
  const totalUsers = users.length
  const roleBreakdown = [
    {
      label: 'Consultants',
      count: consultants,
      color: '#2E7D32',
      desc: 'Active timesheet contributors',
    },
    {
      label: 'Line Managers',
      count: managers,
      color: '#C58A00',
      desc: 'Approvals & team oversight',
    },
    {
      label: 'Finance Managers',
      count: financeManagers,
      color: '#1976D2',
      desc: 'Payroll & billing processing',
    },
    {
      label: 'System Admins',
      count: admins,
      color: '#6A1B9A',
      desc: 'Platform configuration',
    },
  ].map((role) => ({
    ...role,
    width: totalUsers > 0 ? `${(role.count / totalUsers) * 100}%` : '0%',
  }))
  const ACTION_STYLES = {
    SUBMISSION: { color: '#2E7D32', label: 'Submitted', bg: '#E8F5E9' },
    APPROVAL: { color: '#1976D2', label: 'Approved', bg: '#E3F2FD' },
    REJECTION: { color: '#D32F2F', label: 'Rejected', bg: '#FFEBEE' },
    PROCESSING: { color: '#ED6C02', label: 'Processed payment', bg: '#FFF3E0' },
    DEFAULT: { color: '#757575', label: 'System Action', bg: '#F5F5F5' }
  };
  const recentActivity = auditLog.slice(0, 5)
  const systemMessage =
    recentActivity.length > 0
      ? `${recentActivity.length} recent audit event${recentActivity.length > 1 ? 's' : ''} recorded.`
      : 'No recent system activity recorded.'

  return (
    <Box sx={{ maxWidth: 1280, width: '100%' }}>
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
        <Box>
          <Typography
            component="h1"
            sx={{
              fontSize: { xs: '2.4rem', sm: '2.8rem', md: '3.1rem' },
              lineHeight: 1.15,
              letterSpacing: '-0.01em',
              mb: 1.2,
            }}
          >
            Admin overview
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 2, maxWidth: 760 }}>
            Monitor account distribution and recent system activity across the platform.
          </Typography>

          <Chip
            label={systemMessage}
            color={recentActivity.length > 0 ? 'warning' : 'success'}
            variant="outlined"
          />
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <DashboardCard
            icon={PeopleIcon}
            label="Total Users"
            value={users.length}
            subtitle="All active accounts"
            color="#1976D2"
            delay={80}
            onClick={() => navigate('/admin/users')}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <DashboardCard
            icon={ManageAccountsIcon}
            label="Consultants"
            value={consultants}
            subtitle="Submitting timesheets"
            color="#2E7D32"
            delay={160}
            onClick={() => navigate('/admin/users?role=CONSULTANT')}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <DashboardCard
            icon={SupervisorAccountIcon}
            label="Managers"
            value={managers}
            subtitle="Reviewing submissions"
            color="#C58A00"
            delay={240}
            onClick={() => navigate('/admin/users?role=LINE_MANAGER')}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <DashboardCard
            icon={HistoryIcon}
            label="Audit Events"
            value={auditLog.length}
            subtitle="Tracked system actions"
            color="#6A1B9A"
            delay={320}
            onClick={() => navigate('/admin/audit-log')}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
  <Paper
    sx={{
      p: 3,
      borderRadius: 3,
      border: '1px solid',
      borderColor: 'divider',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    <Typography variant="h6" sx={{ mb: 2.5, fontWeight: 700 }}>
      Role distribution
    </Typography>
    <Box
  sx={{
    display: 'flex',
    height: 16,
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    bgcolor: 'action.hover',
    mb: 3,
    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
  }}
>
  {roleBreakdown.map((role) => (
    <Box key={role.label} sx={{ width: role.width, bgcolor: role.color, transition: '0.5s' }} />
  ))}
</Box>

<Stack spacing={2} sx={{ flexGrow: 1 }}>
  {roleBreakdown.map((role) => (
    <Box
      key={role.label}
      sx={{
        p: 2,
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        transition: 'transform 0.2s, background-color 0.2s',
        '&:hover': {
          bgcolor: 'action.hover',
          transform: 'translateX(4px)',
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: '20%',
          bottom: '20%',
          width: 4,
          borderRadius: '0 4px 4px 0',
          bgcolor: role.color,
          boxShadow: `2px 0 10px ${role.color}66`
        },
      }}
    >
      <Box sx={{ pl: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
          {role.label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {role.desc}
        </Typography>
      </Box>

      <Typography 
        variant="h4" 
        sx={{ 
          fontWeight: 900, 
          fontFamily: '"JetBrains Mono", monospace',
          color: 'text.primary',
          opacity: 0.9
        }}
      >
        {role.count}
      </Typography>
    </Box>
  ))}
</Stack>

      
    
  </Paper>
    </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>
              Recent activity
            </Typography>

            {recentActivity.length === 0 ? (
              <Box
                sx={{
                  py: 4,
                  textAlign: 'center',
                  borderRadius: 2,
                  border: '1px dashed',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  No recent activity to show.
                </Typography>
              </Box>
            ) : (
              <Stack divider={<Divider flexItem />} spacing={0}>
                {recentActivity.map((item) => (
                  <Box key={item.id} sx={{ py: 1.75 }}>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1.5}
                      justifyContent="space-between"
                      alignItems={{ xs: 'flex-start', sm: 'center' }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={600} sx={{ mb: 0.35 }}>
                          {getAuditActionLabel(item.action)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleString([], {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Unknown time'}
                        </Typography>
                      </Box>

              <Chip 
                label={item.action} 
                size="small" 
                sx={{ 
                  fontWeight: 600, 
                  bgcolor: style.bg, 
                  color: style.color,
                  border: 'none'
                }} 
              />
            </Box>
          );
        })}
      </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
