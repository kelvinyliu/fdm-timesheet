import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import { palette } from '../../theme.js'

export default function StickyActionBar({
  position = 'bottom',
  children,
  secondary,
  sx,
}) {
  const stickyProps =
    position === 'bottom'
      ? { bottom: 0, borderTop: `1px solid ${palette.border}` }
      : { top: 0, borderBottom: `1px solid ${palette.border}` }

  return (
    <Box
      sx={{
        position: 'sticky',
        zIndex: 10,
        backgroundColor: palette.surface,
        mx: { xs: -2, sm: -3, md: -4 },
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 1.5, md: 2 },
        boxShadow:
          position === 'bottom'
            ? '0 -4px 12px rgba(0,0,0,0.04)'
            : '0 4px 12px rgba(0,0,0,0.04)',
        ...stickyProps,
        ...sx,
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>{secondary}</Box>
        <Stack
          direction={{ xs: 'column-reverse', sm: 'row' }}
          spacing={1.5}
          sx={{ '& > *': { width: { xs: '100%', sm: 'auto' } } }}
        >
          {children}
        </Stack>
      </Stack>
    </Box>
  )
}
