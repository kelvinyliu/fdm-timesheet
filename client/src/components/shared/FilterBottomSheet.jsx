import { useId } from 'react'
import Drawer from '@mui/material/Drawer'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import { palette } from '../../theme.js'

export default function FilterBottomSheet({
  open,
  onClose,
  title = 'Filters',
  onClear,
  clearLabel = 'Clear',
  applyLabel = 'Apply',
  onApply,
  children,
}) {
  const titleId = useId()

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      ModalProps={{
        'aria-labelledby': titleId,
      }}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: 'rgba(252, 251, 249, 0.82)',
            backdropFilter: 'blur(8px)',
          },
        },
        paper: {
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: `1px solid ${palette.border}`,
            borderBottom: 'none',
            backgroundColor: palette.surface,
            backgroundImage: 'none',
            color: palette.textPrimary,
            boxShadow: palette.shadowStrong,
          },
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          pt: 2.25,
          pb: 1.5,
          borderBottom: `1px solid ${palette.border}`,
          backgroundColor: palette.surface,
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: palette.borderStrong,
            position: 'absolute',
            left: '50%',
            top: 8,
            transform: 'translateX(-50%)',
          }}
        />
        <Typography id={titleId} sx={{ fontWeight: 600, fontSize: '1rem', color: palette.textPrimary }}>
          {title}
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
          aria-label="Close filters"
          sx={{ color: palette.textSecondary }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, backgroundColor: palette.bg }}>
        <Stack spacing={2}>{children}</Stack>
      </Box>

      <Box
        sx={{
          px: 2,
          py: 1.5,
          pb: 'calc(12px + env(safe-area-inset-bottom, 0px))',
          borderTop: `1px solid ${palette.border}`,
          display: 'grid',
          gridTemplateColumns: onClear ? '1fr 1fr' : '1fr',
          gap: 1.5,
          backgroundColor: palette.surface,
        }}
      >
        {onClear && (
          <Button variant="outlined" onClick={onClear}>
            {clearLabel}
          </Button>
        )}
        <Button
          variant="contained"
          onClick={() => {
            onApply?.()
            onClose?.()
          }}
        >
          {applyLabel}
        </Button>
      </Box>
    </Drawer>
  )
}
