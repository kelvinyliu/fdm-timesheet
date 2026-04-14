import { useState } from 'react'
import { useLoaderData, useNavigate } from 'react-router'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import PaymentsIcon from '@mui/icons-material/Payments'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import StatusBadge from '../../components/shared/StatusBadge'
import { useAuth } from '../../context/useAuth'
import { formatWeekStart } from '../../utils/dateFormatters'
import { getConsultantDisplayLabel } from '../../utils/displayLabels'
import { formatCurrency } from '../../utils/currency.js'

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
            fontSize: { xs: '2.6rem', sm: '3rem', md: '3.4rem' },
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

export default function FinanceDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { timesheets, error } = useLoaderData()
  const [mountedAt] = useState(() => Date.now())
  const getPaymentQueueEnteredAt = (timesheet) =>
    new Date(timesheet.updatedAt || timesheet.weekStart).getTime()

  const firstName = user?.name?.split(' ')[0] || 'there'
  const approved = timesheets.filter((t) => t.status === 'APPROVED')
  const completed = timesheets.filter((t) => t.status === 'COMPLETED')
  const totalApprovedHours = approved.reduce((sum, ts) => sum + Number(ts.totalHours || 0), 0)

  const currentYear = new Date().getFullYear()
  const completedThisYear = completed.filter(
    (ts) => new Date(ts.weekStart).getFullYear() === currentYear
  )
  const ytdMargin = completedThisYear.reduce(
    (sum, ts) => sum + Number(ts.marginAmount || 0),
    0
  )
  const marginRiskCount = completedThisYear.filter(
    (ts) => ts.marginAmount != null && Number(ts.marginAmount) < 0
  ).length

  const readyForPayment = [...approved]
    .sort((a, b) => getPaymentQueueEnteredAt(a) - getPaymentQueueEnteredAt(b))
    .slice(0, 5)

  const oldestApproved = [...approved].sort(
    (a, b) => getPaymentQueueEnteredAt(a) - getPaymentQueueEnteredAt(b)
  )[0]
  const oldestApprovedDays = oldestApproved
    ? Math.max(
        0,
        Math.floor(
          (mountedAt - getPaymentQueueEnteredAt(oldestApproved)) / (1000 * 60 * 60 * 24)
        )
      )
    : null

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
              Payment queue
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
              {approved.length > 0
                ? `${approved.length} timesheet${approved.length > 1 ? 's' : ''} ready for payment.`
                : 'No timesheets awaiting payment right now.'}
            </Typography>
            {(oldestApprovedDays != null || marginRiskCount > 0) && (
              <Stack
                direction="row"
                spacing={2}
                sx={{ mt: 1.25, flexWrap: 'wrap' }}
                useFlexGap
              >
                {oldestApprovedDays != null && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: oldestApprovedDays >= 14 ? '#b22a25' : 'text.secondary',
                      fontWeight: oldestApprovedDays >= 14 ? 600 : 500,
                      letterSpacing: '0.04em',
                    }}
                  >
                    Oldest approved: {oldestApprovedDays} day{oldestApprovedDays === 1 ? '' : 's'}
                  </Typography>
                )}
                {marginRiskCount > 0 && (
                  <Typography
                    variant="caption"
                    sx={{ color: '#b22a25', fontWeight: 600, letterSpacing: '0.04em' }}
                  >
                    {marginRiskCount} negative-margin sheet{marginRiskCount === 1 ? '' : 's'}
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
              startIcon={<PaymentsIcon />}
              onClick={() => navigate('/finance/timesheets')}
              sx={{ minWidth: { xs: '100%', sm: 200 } }}
            >
              Process Payments
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/finance/timesheets')}
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
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
          gap: { xs: 3, sm: 4, md: 6 },
        }}
      >
        <FigureCell
          label="Awaiting payment"
          value={approved.length}
          accent="#8a5a00"
          onClick={() => navigate('/finance/timesheets')}
        />
        <FigureCell
          label="Paid"
          value={completed.length}
          accent="#2f6b36"
          onClick={() => navigate('/finance/timesheets')}
        />
        <FigureCell
          label="Workload"
          value={totalApprovedHours}
          suffix="hrs"
          onClick={() => navigate('/finance/timesheets?status=APPROVED')}
        />
        <FigureCell
          label="YTD margin"
          value={formatCurrency(ytdMargin)}
          accent={ytdMargin >= 0 ? '#2f6b36' : '#b22a25'}
          sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}
        />
      </Box>

      {/* Ready for payment list */}
      <Box>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 2 }}
        >
          <SectionLabel>Ready for payment</SectionLabel>
          <Box
            component="button"
            onClick={() => navigate('/finance/timesheets')}
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

        {readyForPayment.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
            Nothing waiting right now. Approved timesheets will appear here when ready.
          </Typography>
        ) : (
          <Stack divider={<Divider flexItem />} spacing={0}>
            {readyForPayment.map((ts) => (
              <Box
                key={ts.id}
                onClick={() => navigate(`/finance/timesheets/${ts.id}`)}
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
