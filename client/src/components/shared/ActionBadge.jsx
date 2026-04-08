import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { palette } from '../../theme.js'

const ACTION_COLORS = {
  SUBMISSION: 'var(--ui-info)',
  APPROVAL: 'var(--ui-success)',
  REJECTION: 'var(--ui-error)',
  PROCESSING: 'var(--ui-warning)',
}

export default function ActionBadge({ action }) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.6,
        px: 1,
        py: 0.3,
        borderRadius: '5px',
        backgroundColor:
          action === 'APPROVAL'
            ? 'var(--ui-success-bg)'
            : action === 'REJECTION'
              ? 'var(--ui-error-bg)'
              : action === 'PROCESSING'
                ? 'var(--ui-warning-bg)'
                : 'var(--ui-info-bg)',
        border:
          action === 'APPROVAL'
            ? '1px solid var(--ui-status-approved-border)'
            : action === 'REJECTION'
              ? '1px solid var(--ui-status-rejected-border)'
              : action === 'PROCESSING'
                ? '1px solid var(--ui-status-pending-border)'
                : '1px solid var(--ui-status-completed-border)',
      }}
    >
      <Typography
        component="span"
        sx={{
          fontSize: '0.68rem',
          fontWeight: 600,
          color: ACTION_COLORS[action] ?? palette.textSecondary,
          letterSpacing: '0.03em',
        }}
      >
        {action}
      </Typography>
    </Box>
  )
}
