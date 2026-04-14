import { useLoaderData, useNavigate } from 'react-router'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import StatusBadge from '../../components/shared/StatusBadge'
import { useAuth } from '../../context/useAuth'
import { formatCurrency } from '../../utils/currency'
import { formatWeekStart, getCurrentMonday } from '../../utils/dateFormatters'

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

function FigureCell({ label, value, suffix, onClick, accent, sx }) {
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
      <Stack direction="row" alignItems="baseline" spacing={0.75}>
        <Typography
          sx={{
            fontFamily: '"Outfit", system-ui, sans-serif',
            fontWeight: 400,
            fontSize: { xs: '2.4rem', sm: '2.8rem', md: '3.2rem' },
            lineHeight: 1,
            letterSpacing: '-0.03em',
            color: accent || 'text.primary',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </Typography>
        {suffix && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              fontSize: '0.78rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {suffix}
          </Typography>
        )}
      </Stack>
    </Box>
  )
}

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

  const statusCounts = [
    {
      key: 'DRAFT',
      label: 'Drafts',
      value: drafts.length,
      accent: '#26556f',
    },
    {
      key: 'PENDING',
      label: 'Pending',
      value: pending.length,
      accent: '#8a5a00',
    },
    {
      key: 'REJECTED',
      label: 'Rejected',
      value: rejected.length,
      accent: '#e55c58',
    },
    {
      key: 'APPROVED',
      label: 'Approved / Paid',
      value: approved.length,
      accent: '#2f6b36',
    },
  ]

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
      <Box sx={{ mb: { xs: 4, md: 6 } }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'flex-end' }}
          spacing={3}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="overline"
              sx={{
                color: 'text.secondary',
                letterSpacing: '0.2em',
                fontSize: '0.72rem',
                fontWeight: 500,
              }}
            >
              Your workspace
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
              Welcome back, {firstName}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 640 }}>
              {editableTimesheets.length > 0
                ? `${editableTimesheets.length} timesheet${editableTimesheets.length > 1 ? 's' : ''} need your attention.`
                : 'Everything is up to date. Nice work.'}
            </Typography>
          </Box>

          <Button
            variant="contained"
            size="large"
            startIcon={<AccessTimeIcon />}
            onClick={primaryAction.onClick}
            sx={{ minWidth: { xs: '100%', sm: 220 } }}
          >
            {primaryAction.label}
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {/* Weekly utilization */}
      <Box
        sx={{
          pb: { xs: 4, md: 5 },
          mb: { xs: 4, md: 5 },
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'baseline' }}
          spacing={0.5}
          sx={{ mb: 2.5 }}
        >
          <SectionLabel>Weekly utilisation</SectionLabel>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {hoursThisWeek} / {utilizationLimit} hrs
          </Typography>
        </Stack>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
          spacing={{ xs: 2, sm: 4 }}
          sx={{ mb: 2 }}
        >
          <Typography
            sx={{
              fontFamily: '"Outfit", system-ui, sans-serif',
              fontWeight: 400,
              fontSize: { xs: '3rem', sm: '3.6rem', md: '4.2rem' },
              lineHeight: 1,
              letterSpacing: '-0.03em',
              color: 'text.primary',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {Math.round(utilizationPercentage)}%
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ pb: { sm: 1 } }}
          >
            {utilizationPercentage >= 100
              ? 'Goal reached. Great work.'
              : 'Keep logging hours to reach your 40hr goal.'}
          </Typography>
        </Stack>

        <Box
          sx={{
            height: 6,
            width: '100%',
            bgcolor: 'action.hover',
            borderRadius: 999,
            overflow: 'hidden',
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
      </Box>

      {/* Financial snapshot */}
      <Box
        sx={{
          pb: { xs: 4, md: 5 },
          mb: { xs: 4, md: 5 },
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <SectionLabel>Financial snapshot</SectionLabel>
        <Box
          sx={{
            mt: 2.5,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: { xs: 3, sm: 4, md: 6 },
          }}
        >
          <FigureCell
            label="Earned this month"
            value={formatCurrency(monthlyEarnings)}
            accent="#2f6b36"
          />
          <FigureCell
            label="Pending payment"
            value={formatCurrency(pendingPayment)}
            accent="#8a5a00"
          />
          <FigureCell label="YTD hours" value={ytdHours.toFixed(1)} suffix="hrs" />
        </Box>
      </Box>

      {/* Status counts */}
      <Box
        sx={{
          pb: { xs: 4, md: 5 },
          mb: { xs: 4, md: 5 },
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <SectionLabel>By status</SectionLabel>
        <Box
          sx={{
            mt: 2.5,
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
            gap: { xs: 3, sm: 4 },
          }}
        >
          {statusCounts.map((s) => (
            <FigureCell
              key={s.key}
              label={s.label}
              value={s.value}
              accent={s.accent}
              onClick={() => navigate('/consultant/timesheets')}
            />
          ))}
        </Box>
      </Box>

      {/* Recent timesheets */}
      <Box>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 2 }}
        >
          <SectionLabel>Recent timesheets</SectionLabel>
          <Box
            component="button"
            onClick={() => navigate('/consultant/timesheets')}
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

        {sortedRecent.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
            No timesheets yet. Create your first timesheet to get started.
          </Typography>
        ) : (
          <Stack divider={<Divider flexItem />} spacing={0}>
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
                    py: 2,
                    px: { xs: 1, sm: 1.5 },
                    mx: { xs: -1, sm: -1.5 },
                    borderRadius: 1.5,
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={{ xs: 1, sm: 2 }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} sx={{ mb: 0.4 }}>
                        {formatWeekStart(ts.weekStart)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
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
          </Stack>
        )}
      </Box>
    </Box>
  )
}
