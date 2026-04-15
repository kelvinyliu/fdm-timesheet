import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import EditNoteIcon from '@mui/icons-material/EditNote'
import { palette } from '../../theme.js'

const STATE_PRESETS = {
  idle: { color: palette.textSecondary, bg: palette.surfaceMuted, border: palette.border },
  dirty: { color: palette.warning, bg: palette.warningBg, border: '#f2e2b6' },
  saving: { color: palette.info, bg: palette.infoBg, border: '#d2eaf5' },
  saved: { color: palette.success, bg: palette.successBg, border: '#d4ebd0' },
  error: { color: palette.error, bg: palette.errorBg, border: '#fcd5d3' },
}

export default function SaveStateBanner({ state = 'idle', message, timestamp }) {
  const preset = STATE_PRESETS[state] ?? STATE_PRESETS.idle

  const icon = (() => {
    if (state === 'saving') return <CircularProgress size={14} thickness={5} sx={{ color: preset.color }} />
    if (state === 'saved') return <CheckCircleOutlineIcon sx={{ fontSize: 16, color: preset.color }} />
    if (state === 'error') return <ErrorOutlineIcon sx={{ fontSize: 16, color: preset.color }} />
    if (state === 'dirty') return <EditNoteIcon sx={{ fontSize: 16, color: preset.color }} />
    return null
  })()

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 0.6,
        borderRadius: '999px',
        backgroundColor: preset.bg,
        border: `1px solid ${preset.border}`,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.75}>
        {icon}
        <Typography
          sx={{
            fontSize: '0.75rem',
            fontWeight: 500,
            color: preset.color,
            letterSpacing: '0.02em',
          }}
        >
          {message}
        </Typography>
        {timestamp && (
          <Typography
            sx={{
              fontSize: '0.7rem',
              color: palette.textMuted,
              fontFamily: '"JetBrains Mono", monospace',
            }}
          >
            {timestamp}
          </Typography>
        )}
      </Stack>
    </Box>
  )
}
