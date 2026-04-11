import React, { useEffect, useRef } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded'
import { palette } from '../../theme.js'

const VARIANT_STYLES = {
  info: {
    icon: InfoOutlinedIcon,
    accent: palette.info,
    bg: palette.infoBg,
    pill: 'Information',
  },
  warning: {
    icon: WarningAmberRoundedIcon,
    accent: palette.warning,
    bg: palette.warningBg,
    pill: 'Please review',
  },
  danger: {
    icon: DeleteOutlineRoundedIcon,
    accent: palette.error,
    bg: palette.errorBg,
    pill: 'High impact',
  },
  success: {
    icon: CheckCircleOutlineRoundedIcon,
    accent: palette.success,
    bg: palette.successBg,
    pill: 'Ready to continue',
  },
}

export default function ConfirmActionDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  secondaryLabel = '',
  summaryItems = [],
  variant = 'info',
  loading = false,
  onExited,
  onConfirm,
  onCancel,
  onSecondary,
}) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const variantStyle = VARIANT_STYLES[variant] ?? VARIANT_STYLES.info
  const Icon = variantStyle.icon
  const cancelBtnRef = useRef(null)

  useEffect(() => {
    if (open && variant === 'danger' && cancelBtnRef.current) {
      // Small timeout ensures the dialog is fully rendered before focusing
      setTimeout(() => {
        cancelBtnRef.current?.focus()
      }, 50)
    }
  }, [open, variant])

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onCancel}
      fullWidth
      maxWidth="sm"
      fullScreen={isMobile}
      slotProps={{
        transition: {
          onExited,
        },
        paper: {
          sx: {
            overflow: 'hidden',
            borderRadius: { xs: 0, sm: '20px' },
            backgroundColor: palette.surface,
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.08), 0 12px 24px rgba(0, 0, 0, 0.04)',
            border: `1px solid ${palette.border}`,
            // Soft radial glow behind the icon
            backgroundImage: `radial-gradient(circle at 48px 48px, ${variantStyle.bg} 0%, transparent 70%)`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: '150% 200px',
            '@keyframes dialogEnter': {
              '0%': { opacity: 0, transform: 'scale(0.97)' },
              '100%': { opacity: 1, transform: 'scale(1)' },
            },
            animation: 'dialogEnter 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          },
        },
      }}
    >
      <DialogTitle sx={{ px: { xs: 3, sm: 4 }, pt: { xs: 3, sm: 4 }, pb: 2 }}>
        <Stack direction="row" spacing={2.5} alignItems="flex-start">
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: '16px',
              backgroundColor: variantStyle.accent,
              color: palette.textInverse,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.25), 0 8px 20px ${variantStyle.accent}25`,
              flexShrink: 0,
            }}
          >
            <Icon sx={{ fontSize: 24 }} />
          </Box>

          <Box sx={{ minWidth: 0, pt: 0.5 }}>
            <Typography
              variant="caption"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                px: 1.25,
                py: 0.35,
                mb: 1.5,
                borderRadius: '999px',
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${variantStyle.accent}33`,
                color: variantStyle.accent,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                boxShadow: `0 2px 8px ${variantStyle.accent}11`,
              }}
            >
              {variantStyle.pill}
            </Typography>
            <Typography 
              variant="h4" 
              sx={{ 
                color: palette.textPrimary,
                fontWeight: 600,
                lineHeight: 1.2,
                letterSpacing: '-0.01em'
              }}
            >
              {title}
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ px: { xs: 3, sm: 4 }, pb: 1, overflowX: 'hidden' }}>
        <Box sx={{ pl: { sm: 9 } }}>
          <Alert
            icon={false}
            sx={{
              mb: summaryItems.length > 0 ? 4 : 2,
              p: 0,
              backgroundColor: 'transparent',
              border: 'none',
              borderLeft: `3px solid ${variantStyle.accent}88`,
              borderRadius: 0,
              pl: 2.5,
              py: 0.5,
              '& .MuiAlert-message': {
                width: '100%',
                p: 0,
              },
            }}
          >
            <Typography 
              variant="body1" 
              sx={{ 
                color: palette.textSecondary,
                lineHeight: 1.6,
                fontSize: '0.95rem'
              }}
            >
              {message}
            </Typography>
          </Alert>

          {summaryItems.length > 0 && (
            <Box sx={{ mb: 2 }}>
              {summaryItems.map((item, index) => (
                <Box key={item.key}>
                  {index > 0 && (
                    <Divider 
                      sx={{ 
                        my: 1.5, 
                        borderStyle: 'dashed', 
                        borderColor: palette.border,
                        opacity: 0.7 
                      }} 
                    />
                  )}
                  <Box
                    sx={{
                      py: 0.5,
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '140px 1fr' },
                      gap: { xs: 0.5, sm: 2 },
                      alignItems: 'start',
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color: palette.textMuted,
                        fontWeight: 600,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        mt: 0.5
                      }}
                    >
                      {item.label}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: palette.textPrimary, 
                        fontWeight: 500,
                        lineHeight: 1.5
                      }}
                    >
                      {item.value}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 3, sm: 4 },
          py: { xs: 2.5, sm: 3 },
          mt: 2,
          gap: 1.5,
          flexDirection: { xs: 'column-reverse', sm: 'row' },
          alignItems: 'stretch',
          justifyContent: 'flex-end',
          position: { xs: 'sticky', sm: 'static' },
          bottom: 0,
          backgroundColor: palette.surface,
          // Subtle top shadow to separate actions from content
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.02)',
          borderTop: `1px solid ${palette.border}`,
        }}
      >
        <Button
          onClick={onCancel}
          disabled={loading}
          variant="outlined"
          fullWidth={isMobile}
          ref={cancelBtnRef}
          sx={{
            py: 1.2,
            px: 3,
            fontWeight: 600,
            borderRadius: '12px',
            '&:hover': {
              backgroundColor: palette.surfaceMuted,
            }
          }}
        >
          {cancelLabel}
        </Button>
        {secondaryLabel && onSecondary && (
          <Button
            onClick={onSecondary}
            disabled={loading}
            variant="outlined"
            color="primary"
            fullWidth={isMobile}
            sx={{
              py: 1.2,
              px: 3,
              fontWeight: 600,
              borderRadius: '12px',
            }}
          >
            {secondaryLabel}
          </Button>
        )}
        <Button
          onClick={onConfirm}
          disabled={loading}
          variant="contained"
          color={variant === 'danger' ? 'error' : 'primary'}
          fullWidth={isMobile}
          sx={{
            py: 1.2,
            px: 3,
            fontWeight: 600,
            borderRadius: '12px',
            minWidth: '120px',
            boxShadow: `0 4px 12px ${variant === 'danger' ? palette.error : palette.primary}40`,
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: `0 6px 16px ${variant === 'danger' ? palette.error : palette.primary}60`,
            }
          }}
        >
          {loading ? (
            <CircularProgress size={22} color="inherit" thickness={5} />
          ) : (
            confirmLabel
          )}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
