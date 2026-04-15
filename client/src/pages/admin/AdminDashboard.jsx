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

const ACTION_STYLES = {
  SUBMISSION: { color: '#2E7D32', label: 'Submitted', bg: '#E8F5E9' },
  APPROVAL: { color: '#1976D2', label: 'Approved', bg: '#E3F2FD' },
  REJECTION: { color: '#D32F2F', label: 'Rejected', bg: '#FFEBEE' },
  PROCESSING: { color: '#ED6C02', label: 'Processed payment', bg: '#FFF3E0' },
  DEFAULT: { color: '#757575', label: 'System Action', bg: '#F5F5F5' },
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { users, auditLog, error } = useLoaderData()

  // Data processing
  const consultants = users.filter((u) => u.role === 'CONSULTANT').length
  const managers = users.filter((u) => u.role === 'LINE_MANAGER').length
  const financeManagers = users.filter((u) => u.role === 'FINANCE_MANAGER').length
  const admins = users.filter((u) => u.role === 'SYSTEM_ADMIN').length
  const totalUsers = users.length

  const roleBreakdown = [
    { label: 'Consultants', count: consultants, color: '#2E7D32', desc: 'Active contributors' },
    { label: 'Line Managers', count: managers, color: '#C58A00', desc: 'Team oversight' },
    { label: 'Finance Managers', count: financeManagers, color: '#1976D2', desc: 'Payroll processing' },
    { label: 'System Admins', count: admins, color: '#6A1B9A', desc: 'Platform config' },
  ].map((role) => ({
    ...role,
    width: totalUsers > 0 ? `${(role.count / totalUsers) * 100}%` : '0%',
  }))

  const recentActivity = auditLog.slice(0, 5)
  const systemMessage =
    recentActivity.length > 0
      ? `${recentActivity.length} recent audit event${recentActivity.length > 1 ? 's' : ''} recorded.`
      : 'No recent system activity recorded.'

  return (
    <Box sx={{ maxWidth: 1280, width: '100%', mx: 'auto', p: 2 }}>
      {/* Hero Header */}
      <Paper
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 4,
          mb: 4,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          animation: 'heroIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
          '@keyframes heroIn': {
            from: { opacity: 0, transform: 'translateY(20px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
        }}
      >
        <Typography
          variant="h3"
          sx={{
            fontWeight: 800,
            lineHeight: 1.1,
            mb: 1.5,
            letterSpacing: '-0.02em',
          }}
        >
          Admin overview
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 600 }}>
          Monitor account distribution and recent system activity across the platform.
        </Typography>
        <Chip
          label={systemMessage}
          color={recentActivity.length > 0 ? 'warning' : 'success'}
          variant="filled"
          sx={{ fontWeight: 600 }}
        />
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Metric Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardCard
            icon={PeopleIcon}
            label="Total Users"
            value={totalUsers}
            color="#1976D2"
            onClick={() => navigate('/admin/users')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardCard
            icon={ManageAccountsIcon}
            label="Consultants"
            value={consultants}
            color="#2E7D32"
            onClick={() => navigate('/admin/users?role=CONSULTANT')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardCard
            icon={SupervisorAccountIcon}
            label="Managers"
            value={managers}
            color="#C58A00"
            onClick={() => navigate('/admin/users?role=LINE_MANAGER')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardCard
            icon={HistoryIcon}
            label="Audit Events"
            value={auditLog.length}
            color="#6A1B9A"
            onClick={() => navigate('/admin/audit-log')}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Role Distribution Section */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 4,
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
            }}
          >
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
              Role distribution
            </Typography>
            <Box
              sx={{
                display: 'flex',
                height: 12,
                width: '100%',
                borderRadius: 6,
                overflow: 'hidden',
                bgcolor: 'action.hover',
                mb: 4,
              }}
            >
              {roleBreakdown.map((role) => (
                <Box key={role.label} sx={{ width: role.width, bgcolor: role.color, transition: '0.8s ease' }} />
              ))}
            </Box>

            <Stack spacing={2}>
              {roleBreakdown.map((role) => (
                <Box
                  key={role.label}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: '0.2s',
                    '&:hover': { bgcolor: 'action.hover', transform: 'translateX(5px)' },
                  }}
                >
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{role.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{role.desc}</Typography>
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: role.color }}>{role.count}</Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>

        {/* Improved Recent Activity Section */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 4,
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
            }}
          >
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
              Recent activity
            </Typography>

            {recentActivity.length === 0 ? (
              <Box sx={{ py: 8, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 4 }}>
                <Typography color="text.secondary">No recent activity recorded.</Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {recentActivity.map((item, index) => {
                  const style = ACTION_STYLES[item.action] || ACTION_STYLES.DEFAULT;
                  return (
                    <Box
                      key={item.id}
                      sx={{
                        p: 2,
                        borderRadius: 4, // "Roundness texture"
                        border: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        animation: 'itemIn 0.5s ease both',
                        animationDelay: `${index * 0.1}s`,
                        '@keyframes itemIn': {
                          from: { opacity: 0, transform: 'translateX(-15px)' },
                          to: { opacity: 1, transform: 'translateX(0)' },
                        },
                        '&:hover': {
                          transform: 'scale(1.01) translateX(4px)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                          borderColor: style.color,
                        },
                      }}
                    >
                      <Box sx={{ width: 4, height: 32, borderRadius: 2, bgcolor: style.color }} />
                      
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body2" fontWeight={700} sx={{ color: style.color }}>
                          {style.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.createdAt 
                            ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                            : 'Time unknown'}
                        </Typography>
                      </Box>

                      <Chip 
                        label={item.action} 
                        size="small" 
                        sx={{ 
                          fontWeight: 700, 
                          fontSize: '0.65rem',
                          bgcolor: style.bg, 
                          color: style.color 
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