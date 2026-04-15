import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { getTimesheetStatusDisplayLabel } from '../../utils/displayLabels'

const STATUS_STYLES = {
  DRAFT: {
    bg: 'var(--ui-status-draft-bg)',
    color: 'var(--ui-status-draft)',
    border: 'var(--ui-status-draft-border)',
  },
  PENDING: {
    bg: 'var(--ui-status-pending-bg)',
    color: 'var(--ui-status-pending)',
    border: 'var(--ui-status-pending-border)',
  },
  APPROVED: {
    bg: 'var(--ui-status-approved-bg)',
    color: 'var(--ui-status-approved)',
    border: 'var(--ui-status-approved-border)',
  },
  FINANCE_REJECTED: {
    bg: 'var(--ui-status-pending-bg)',
    color: 'var(--ui-status-pending)',
    border: 'var(--ui-status-pending-border)',
  },
  REJECTED: {
    bg: 'var(--ui-status-rejected-bg)',
    color: 'var(--ui-status-rejected)',
    border: 'var(--ui-status-rejected-border)',
  },
  COMPLETED: {
    bg: 'var(--ui-status-completed-bg)',
    color: 'var(--ui-status-completed)',
    border: 'var(--ui-status-completed-border)',
  },
}

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.6,
        px: 1.2,
        py: 0.35,
        minWidth: 90,
        borderRadius: '6px',
        border: `1px solid ${style.border}`,
        backgroundColor: style.bg,
      }}
    >
      <Typography
        component="span"
        sx={{
          fontSize: '0.68rem',
          fontWeight: 600,
          letterSpacing: '0.04em',
          color: style.color,
          lineHeight: 1,
          fontFamily: '"Outfit", sans-serif',
        }}
      >
        {getTimesheetStatusDisplayLabel(status)}
      </Typography>
    </Box>
  )
}
