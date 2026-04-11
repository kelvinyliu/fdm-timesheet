import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { palette } from '../../theme.js'

export default function LateBadge() {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: 1.2,
        py: 0.35,
        borderRadius: '6px',
        border: `1px solid ${palette.warning}`,
        backgroundColor: palette.warningBg,
      }}
    >
      <Typography
        component="span"
        sx={{
          fontSize: '0.68rem',
          fontWeight: 600,
          letterSpacing: '0.04em',
          color: palette.warning,
          lineHeight: 1,
          fontFamily: '"Outfit", sans-serif',
        }}
      >
        Late
      </Typography>
    </Box>
  )
}
