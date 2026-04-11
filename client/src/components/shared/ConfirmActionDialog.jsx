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
  onConfirm,
  onCancel,
  onSecondary,
}) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const variantStyle = VARIANT_STYLES[variant] ?? VARIANT_STYLES.info
  const Icon = variantStyle.icon

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onCancel}
      fullWidth
      maxWidth="sm"
      fullScreen={isMobile}
      slotProps={{
        paper: {
          sx: {
            overflow: 'hidden',
            borderRadius: { xs: 0, sm: '20px' },
            backgroundColor: palette.surface,
            boxShadow: palette.shadowStrong,
            border: `1px solid ${palette.border}`,
            backgroundImage: `linear-gradient(180deg, ${variantStyle.bg} 0px, ${variantStyle.bg} 92px, ${palette.surface} 92px, ${palette.surface} 100%)`,
          },
        },
      }}
    >
      <DialogTitle sx={{ px: { xs: 2.25, sm: 3 }, pt: { xs: 2.25, sm: 3 }, pb: 1.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '16px',
              backgroundColor: variantStyle.accent,
              color: palette.textInverse,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 14px 24px ${variantStyle.accent}22`,
              flexShrink: 0,
            }}
          >
            <Icon fontSize="small" />
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="caption"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                px: 1,
                py: 0.35,
                mb: 1,
                borderRadius: '999px',
                backgroundColor: 'rgba(255,255,255,0.72)',
                border: `1px solid ${variantStyle.accent}33`,
                color: variantStyle.accent,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {variantStyle.pill}
            </Typography>
            <Typography variant="h5" sx={{ color: palette.textPrimary }}>
              {title}
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ px: { xs: 2.25, sm: 3 }, pb: 0 }}>
        <Alert
          icon={false}
          severity="info"
          sx={{
            mb: summaryItems.length > 0 ? 2.5 : 0,
            borderRadius: '14px',
            backgroundColor: palette.surfaceMuted,
            color: palette.textSecondary,
            border: `1px solid ${palette.border}`,
            '& .MuiAlert-message': {
              width: '100%',
            },
          }}
        >
          <Typography variant="body2" sx={{ color: palette.textSecondary }}>
            {message}
          </Typography>
        </Alert>

        {summaryItems.length > 0 && (
          <Box
            sx={{
              borderRadius: '18px',
              border: `1px solid ${palette.border}`,
              backgroundColor: palette.surfaceRaised,
              overflow: 'hidden',
              mb: 1,
            }}
          >
            {summaryItems.map((item, index) => (
              <Box key={item.key}>
                {index > 0 && <Divider />}
                <Box
                  sx={{
                    px: { xs: 2, sm: 2.5 },
                    py: 1.5,
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '150px 1fr' },
                    gap: { xs: 0.5, sm: 2 },
                    alignItems: 'start',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: palette.textMuted,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {item.label}
                  </Typography>
                  <Typography variant="body2" sx={{ color: palette.textPrimary, fontWeight: 500 }}>
                    {item.value}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 2.25, sm: 3 },
          py: { xs: 2, sm: 2.5 },
          gap: 1,
          flexDirection: { xs: 'column-reverse', sm: 'row' },
          alignItems: 'stretch',
          justifyContent: 'flex-end',
          position: { xs: 'sticky', sm: 'static' },
          bottom: 0,
          backgroundColor: palette.surface,
          borderTop: `1px solid ${palette.border}`,
        }}
      >
        <Button
          onClick={onCancel}
          disabled={loading}
          variant="outlined"
          fullWidth={isMobile}
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
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
