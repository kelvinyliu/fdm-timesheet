import { useState } from 'react'
import { useLoaderData, useNavigate } from 'react-router'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'

function getAuditActionLabel(action) {
  switch (action) {
    case 'SUBMISSION':
      return 'Timesheet submitted'
    case 'APPROVAL':
      return 'Timesheet approved'
    case 'REJECTION':
      return 'Timesheet rejected'
    case 'PROCESSING':
      return 'Payment processed'
    default:
      return action
  }
}

function getAuditActionTone(action) {
  switch (action) {
    case 'APPROVAL':
    case 'PROCESSING':
      return '#2f6b36'
    case 'REJECTION':
      return '#e55c58'
    case 'SUBMISSION':
      return '#26556f'
    default:
      return '#6c6c6b'
  }
}

function SectionLabel({ children }) {
  return (
    <Typography
      sx={{
        fontFamily: '"Outfit", system-ui, sans-serif',
        fontSize: '0.72rem',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.2em',
        color: 'text.secondary',
      }}
    >
      {children}
    </Typography>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { users, auditLog, error } = useLoaderData()
  const [mountedAt] = useState(() => Date.now())

  const consultants = users.filter((u) => u.role === 'CONSULTANT').length
  const managers = users.filter((u) => u.role === 'LINE_MANAGER').length
  const financeManagers = users.filter((u) => u.role === 'FINANCE_MANAGER').length
  const admins = users.filter((u) => u.role === 'SYSTEM_ADMIN').length
  const totalUsers = users.length

  const roleBreakdown = [
    { key: 'CONSULTANT', label: 'Consultants', count: consultants, color: '#2f6b36' },
    { key: 'LINE_MANAGER', label: 'Line managers', count: managers, color: '#8a5a00' },
    { key: 'FINANCE_MANAGER', label: 'Finance', count: financeManagers, color: '#26556f' },
    { key: 'SYSTEM_ADMIN', label: 'Admins', count: admins, color: '#6A1B9A' },
  ].map((role) => ({
    ...role,
    pct: totalUsers > 0 ? (role.count / totalUsers) * 100 : 0,
  }))

  const recentActivity = auditLog.slice(0, 6)

  const sevenDaysAgo = mountedAt - 7 * 24 * 60 * 60 * 1000
  const twentyFourHoursAgo = mountedAt - 24 * 60 * 60 * 1000
  const recentRejectionCount = auditLog.filter(
    (entry) =>
      entry.action === 'REJECTION' &&
      entry.createdAt &&
      new Date(entry.createdAt).getTime() >= sevenDaysAgo
  ).length
  const last24hCount = auditLog.filter(
    (entry) => entry.createdAt && new Date(entry.createdAt).getTime() >= twentyFourHoursAgo
  ).length

  return (
    <Box
      sx={{
        maxWidth: 1180,
        width: '100%',
        mx: 'auto',
        px: { xs: 0.5, sm: 1 },
        animation: 'fadeUp 0.5s ease both',
        '@keyframes fadeUp': {
          from: { opacity: 0, transform: 'translateY(8px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      {/* Header */}
      <Box sx={{ mb: { xs: 5, md: 7 } }}>
        <Typography
          variant="overline"
          sx={{
            color: 'text.secondary',
            letterSpacing: '0.2em',
            fontSize: '0.72rem',
            fontWeight: 500,
          }}
        >
          Administration
        </Typography>
        <Typography
          component="h1"
          sx={{
            fontFamily: '"Outfit", system-ui, sans-serif',
            fontWeight: 400,
            fontSize: { xs: '2.1rem', sm: '2.6rem', md: '3rem' },
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            mt: 0.5,
            mb: 1.5,
          }}
        >
          Platform overview
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 640 }}>
          Account distribution and recent system activity at a glance.
        </Typography>
        {(recentRejectionCount > 0 || last24hCount > 0) && (
          <Stack
            direction="row"
            spacing={2}
            sx={{ mt: 1.5, flexWrap: 'wrap' }}
            useFlexGap
          >
            {recentRejectionCount > 0 && (
              <Typography
                variant="caption"
                sx={{
                  color: recentRejectionCount >= 5 ? '#b22a25' : '#8a5a00',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                }}
              >
                {recentRejectionCount} rejection{recentRejectionCount === 1 ? '' : 's'} in last 7 days
              </Typography>
            )}
            {last24hCount > 0 && (
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', fontWeight: 500, letterSpacing: '0.04em' }}
              >
                {last24hCount} event{last24hCount === 1 ? '' : 's'} in last 24h
              </Typography>
            )}
          </Stack>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {/* Figures row */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' },
          gap: { xs: 3, sm: 4, md: 6 },
          pb: { xs: 4, md: 5 },
          borderBottom: '1px solid',
          borderColor: 'divider',
          mb: { xs: 5, md: 6 },
        }}
      >
        <FigureCell
          label="Total users"
          value={totalUsers}
          onClick={() => navigate('/admin/users')}
        />
        <FigureCell
          label="Active consultants"
          value={consultants}
          onClick={() => navigate('/admin/users?role=CONSULTANT')}
        />
        <FigureCell
          label="Audit events"
          value={auditLog.length}
          onClick={() => navigate('/admin/audit-log')}
          sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}
        />
      </Box>

      {/* Role distribution */}
      <Box sx={{ mb: { xs: 5, md: 7 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'baseline' }}
          spacing={0.5}
          sx={{ mb: 2.5 }}
        >
          <SectionLabel>Role distribution</SectionLabel>
          <Typography variant="caption" color="text.secondary">
            {totalUsers} {totalUsers === 1 ? 'account' : 'accounts'} total
          </Typography>
        </Stack>

        <Box
          sx={{
            display: 'flex',
            height: 6,
            width: '100%',
            borderRadius: 999,
            overflow: 'hidden',
            bgcolor: 'action.hover',
            mb: 3,
          }}
        >
          {roleBreakdown.map((role) => (
            <Box
              key={role.key}
              sx={{
                width: `${role.pct}%`,
                bgcolor: role.color,
                transition: 'width 0.5s ease',
              }}
            />
          ))}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: { xs: 2.5, md: 3 },
          }}
        >
          {roleBreakdown.map((role) => (
            <Box key={role.key}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: role.color,
                    flexShrink: 0,
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{ color: 'text.secondary', fontSize: '0.82rem' }}
                >
                  {role.label}
                </Typography>
              </Stack>
              <Stack direction="row" alignItems="baseline" spacing={0.75} sx={{ pl: 2 }}>
                <Typography
                  sx={{
                    fontFamily: '"Outfit", system-ui, sans-serif',
                    fontSize: '1.5rem',
                    fontWeight: 400,
                    lineHeight: 1,
                    color: 'text.primary',
                  }}
                >
                  {role.count}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {role.pct > 0 ? `${Math.round(role.pct)}%` : '-'}
                </Typography>
              </Stack>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Activity */}
      <Box>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 2 }}
        >
          <SectionLabel>Recent activity</SectionLabel>
          <Box
            component="button"
            onClick={() => navigate('/admin/audit-log')}
            sx={{
              background: 'none',
              border: 0,
              p: 0,
              cursor: 'pointer',
              color: 'text.primary',
              fontFamily: '"Outfit", system-ui, sans-serif',
              fontSize: '0.82rem',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              transition: 'gap 0.2s ease',
              '&:hover': { gap: 1 },
            }}
          >
            View all
            <ArrowForwardIcon sx={{ fontSize: 16 }} />
          </Box>
        </Stack>

        {recentActivity.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
            No recent activity to show.
          </Typography>
        ) : (
          <Stack divider={<Divider flexItem />} spacing={0}>
            {recentActivity.map((item) => {
              const tone = getAuditActionTone(item.action)
              return (
                <Stack
                  key={item.id}
                  direction={{ xs: 'column', sm: 'row' }}
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  justifyContent="space-between"
                  spacing={{ xs: 0.75, sm: 2 }}
                  sx={{ py: 2 }}
                >
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: tone,
                        flexShrink: 0,
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 500, color: 'text.primary' }}
                    >
                      {getAuditActionLabel(item.action)}
                    </Typography>
                  </Stack>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      fontVariantNumeric: 'tabular-nums',
                      pl: { xs: 2.25, sm: 0 },
                    }}
                  >
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Unknown time'}
                  </Typography>
                </Stack>
              )
            })}
          </Stack>
        )}
      </Box>
    </Box>
  )
}

function FigureCell({ label, value, onClick, sx }) {
  return (
    <Box
      component={onClick ? 'button' : 'div'}
      onClick={onClick}
      sx={{
        textAlign: 'left',
        background: 'none',
        border: 0,
        p: 0,
        cursor: onClick ? 'pointer' : 'default',
        color: 'inherit',
        fontFamily: 'inherit',
        '&:hover .figure-arrow': onClick
          ? { opacity: 1, transform: 'translateX(2px)' }
          : {},
        ...sx,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1.25 }}>
        <Typography
          sx={{
            fontSize: '0.72rem',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            color: 'text.secondary',
          }}
        >
          {label}
        </Typography>
        {onClick && (
          <ArrowForwardIcon
            className="figure-arrow"
            sx={{
              fontSize: 14,
              color: 'text.secondary',
              opacity: 0,
              transition: 'opacity 0.2s ease, transform 0.2s ease',
            }}
          />
        )}
      </Stack>
      <Typography
        sx={{
          fontFamily: '"Outfit", system-ui, sans-serif',
          fontWeight: 400,
          fontSize: { xs: '2.6rem', sm: '3rem', md: '3.6rem' },
          lineHeight: 1,
          letterSpacing: '-0.03em',
          color: 'text.primary',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </Typography>
    </Box>
  )
}
