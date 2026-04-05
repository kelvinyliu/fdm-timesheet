import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

const STATUS_STYLES = {
  DRAFT: {
    bg: '#F3F4F6',
    color: '#4B5563',
    border: '#E5E7EB',
  },
  PENDING: {
    bg: '#FDF6E3',
    color: '#8B6914',
    border: '#F0DCA0',
  },
  APPROVED: {
    bg: '#EDF5F0',
    color: '#2D6A3F',
    border: '#B8D8C3',
  },
  REJECTED: {
    bg: '#FDF0EF',
    color: '#B03A33',
    border: '#E8B4B0',
  },
  COMPLETED: {
    bg: '#EDF2F7',
    color: '#2C4057',
    border: '#B4C7D9',
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
        gap: 0.6,
        px: 1.2,
        py: 0.35,
        borderRadius: '6px',
        border: `1px solid ${style.border}`,
        backgroundColor: style.bg,
      }}
    >
      <Box
        sx={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: style.color,
          flexShrink: 0,
        }}
      />
      <Typography
        component="span"
        sx={{
          fontSize: '0.68rem',
          fontWeight: 600,
          letterSpacing: '0.04em',
          color: style.color,
          lineHeight: 1,
          textTransform: 'uppercase',
          fontFamily: '"Outfit", sans-serif',
        }}
      >
        {status}
      </Typography>
    </Box>
  )
}
