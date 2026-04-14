import { useState } from 'react'
import { useLoaderData, useNavigate } from 'react-router'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import RateReviewIcon from '@mui/icons-material/RateReview'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import StatusBadge from '../../components/shared/StatusBadge'
import { useAuth } from '../../context/useAuth'
import { formatWeekStart } from '../../utils/dateFormatters'
import { getConsultantDisplayLabel } from '../../utils/displayLabels'
import {
  buildManagerTimesheetListPath,
  MANAGER_STATUS_FILTERS,
} from './utils/managerTimesheetFilters.js'

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

function FigureCell({ label, value, onClick, accent, sx }) {
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
          fontSize: { xs: '2.6rem', sm: '3rem', md: '3.4rem' },
          lineHeight: 1,
          letterSpacing: '-0.03em',
          color: accent || 'text.primary',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </Typography>
    </Box>
  )
}

export default function ManagerDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { timesheets, error } = useLoaderData()
  const [mountedAt] = useState(() => Date.now())
  const getPendingQueueEnteredAt = (timesheet) =>
    new Date(timesheet.submittedAt || timesheet.weekStart).getTime()

  const firstName = user?.name?.split(' ')[0] || 'there'
  const pending = timesheets.filter((t) => t.status === 'PENDING')
  const approved = timesheets.filter((t) => t.status === 'APPROVED' || t.status === 'COMPLETED')
  const rejected = timesheets.filter((t) => t.status === 'REJECTED')

  const latePendingCount = pending.filter((t) => t.submittedLate).length

  const pendingSorted = [...pending].sort(
    (a, b) => getPendingQueueEnteredAt(a) - getPendingQueueEnteredAt(b)
  )
  const oldestPending = pendingSorted[0]
  const oldestPendingDays = oldestPending
    ? Math.max(
        0,
        Math.floor((mountedAt - getPendingQueueEnteredAt(oldestPending)) / (1000 * 60 * 60 * 24))
      )
    : null

  const pendingPreview = pendingSorted.slice(0, 5)

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
              Review queue
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
              {pending.length > 0
                ? `${pending.length} timesheet${pending.length > 1 ? 's' : ''} waiting for review.`
                : 'No pending reviews. Your team is caught up.'}
            </Typography>
            {pending.length > 0 && (oldestPendingDays != null || latePendingCount > 0) && (
              <Stack
                direction="row"
                spacing={2}
                sx={{ mt: 1.25, flexWrap: 'wrap' }}
                useFlexGap
              >
                {oldestPendingDays != null && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: oldestPendingDays >= 14 ? '#b22a25' : 'text.secondary',
                      fontWeight: oldestPendingDays >= 14 ? 600 : 500,
                      letterSpacing: '0.04em',
                    }}
                  >
                    Oldest waiting: {oldestPendingDays} day{oldestPendingDays === 1 ? '' : 's'}
                  </Typography>
                )}
                {latePendingCount > 0 && (
                  <Typography
                    variant="caption"
                    sx={{ color: '#8a5a00', fontWeight: 600, letterSpacing: '0.04em' }}
                  >
                    {latePendingCount} late submission{latePendingCount === 1 ? '' : 's'}
                  </Typography>
                )}
              </Stack>
            )}
          </Box>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ width: { xs: '100%', md: 'auto' } }}
          >
            <Button
              variant="contained"
              size="large"
              startIcon={<RateReviewIcon />}
              onClick={() =>
                navigate(buildManagerTimesheetListPath(MANAGER_STATUS_FILTERS.PENDING))
              }
              sx={{ minWidth: { xs: '100%', sm: 200 } }}
            >
              Review Pending
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/manager/timesheets')}
              sx={{ minWidth: { xs: '100%', sm: 160 } }}
            >
              View All
            </Button>
          </Stack>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {/* Figures */}
      <Box
        sx={{
          pb: { xs: 4, md: 5 },
          mb: { xs: 4, md: 5 },
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
          gap: { xs: 3, sm: 4, md: 6 },
        }}
      >
        <FigureCell
          label="Pending"
          value={pending.length}
          accent="#8a5a00"
          onClick={() =>
            navigate(buildManagerTimesheetListPath(MANAGER_STATUS_FILTERS.PENDING))
          }
        />
        <FigureCell
          label="Approved"
          value={approved.length}
          accent="#2f6b36"
          onClick={() =>
            navigate(buildManagerTimesheetListPath(MANAGER_STATUS_FILTERS.APPROVED_GROUP))
          }
        />
        <FigureCell
          label="Rejected"
          value={rejected.length}
          accent="#e55c58"
          onClick={() =>
            navigate(buildManagerTimesheetListPath(MANAGER_STATUS_FILTERS.REJECTED))
          }
          sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}
        />
      </Box>

      {/* Pending list */}
      <Box>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 2 }}
        >
          <SectionLabel>Pending reviews</SectionLabel>
          <Box
            component="button"
            onClick={() =>
              navigate(buildManagerTimesheetListPath(MANAGER_STATUS_FILTERS.PENDING))
            }
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
            View all pending
            <ArrowForwardIcon sx={{ fontSize: 16 }} />
          </Box>
        </Stack>

        {pendingPreview.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
            All caught up. No timesheets are waiting for review right now.
          </Typography>
        ) : (
          <Stack divider={<Divider flexItem />} spacing={0}>
            {pendingPreview.map((ts) => (
              <Box
                key={ts.id}
                onClick={() => navigate(`/manager/timesheets/${ts.id}`)}
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
                      {getConsultantDisplayLabel(ts.consultantName)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatWeekStart(ts.weekStart)}
                      {ts.totalHours != null && ` (${Number(ts.totalHours).toFixed(2)} hrs)`}
                    </Typography>
                  </Box>

                  <StatusBadge status={ts.status} />
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  )
}
