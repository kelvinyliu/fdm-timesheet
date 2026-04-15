import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import ButtonBase from '@mui/material/ButtonBase'

export default function DashboardCard({
  icon: Icon,
  label,
  value,
  subtitle,
  color,
  onClick,
  delay = 0,
}) {
  const interactive = Boolean(onClick)

  return (
    <Paper
      component={interactive ? ButtonBase : 'div'}
      onClick={onClick}
      type={interactive ? 'button' : undefined}
      aria-label={interactive ? `${label}: ${value}. ${subtitle}` : undefined}
      sx={{
        p: 3,
        width: '100%',
        minHeight: 190,
        borderRadius: 3,
        cursor: interactive ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        border: '1px solid',
        borderColor: 'divider',
        animation: 'dashboardFadeUp 0.45s ease both',
        animationDelay: `${delay}ms`,
        '&:hover': interactive
          ? {
              transform: 'translateY(-3px)',
              boxShadow: 3,
              borderColor: 'text.primary',
            }
          : {},
        '&.Mui-focusVisible': interactive
          ? {
              transform: 'translateY(-3px)',
              borderColor: 'text.primary',
            }
          : {},
        '@keyframes dashboardFadeUp': {
          from: {
            opacity: 0,
            transform: 'translateY(14px)',
          },
          to: {
            opacity: 1,
            transform: 'translateY(0)',
          },
        },
      }}
    >
      <Box>
        {Icon ? (
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
              backgroundColor: `${color}18`,
            }}
          >
            <Icon sx={{ color, fontSize: '1.25rem' }} />
          </Box>
        ) : null}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {label}
        </Typography>

        <Typography
          sx={{
            fontSize: { xs: '1.9rem', sm: '2.2rem' },
            fontWeight: 700,
            lineHeight: 1,
            mb: 1.25,
          }}
        >
          {value}
        </Typography>
      </Box>

      <Typography variant="body2" color="text.secondary">
        {subtitle}
      </Typography>
    </Paper>
  )
}
