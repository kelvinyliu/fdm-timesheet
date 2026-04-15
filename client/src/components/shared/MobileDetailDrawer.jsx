import { useId } from 'react'
import SwipeableDrawer from '@mui/material/SwipeableDrawer'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'

export default function MobileDetailDrawer({
  open,
  onClose,
  onOpen, // For SwipeableDrawer
  title,
  subtitle,
  actions, // Action buttons
  data = [], // Array of { label, value, node }
}) {
  const titleId = useId()
  const descriptionId = useId()

  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      onOpen={onOpen ?? (() => {})}
      disableSwipeToOpen
      ModalProps={{
        'aria-labelledby': titleId,
        'aria-describedby': subtitle ? descriptionId : undefined,
      }}
      PaperProps={{
        sx: {
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          pb: 'env(safe-area-inset-bottom)',
          maxHeight: '90vh',
        },
      }}
    >
      {/* Pull tab indicator */}
      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', pt: 1.5, pb: 0.5 }}>
        <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: 'divider' }} />
      </Box>

      {/* Header */}
      <Box sx={{ px: 2.5, pb: 1.5, pt: 0.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ pr: 2 }}>
          <Typography
            id={titleId}
            variant="h6"
            component="h2"
            sx={{ fontWeight: 600, fontSize: '1.25rem', lineHeight: 1.2, mb: 0.25 }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography id={descriptionId} variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <IconButton
          size="small"
          onClick={onClose}
          aria-label={`Close ${title || 'details'}`}
          sx={{ mt: -0.5, mr: -1 }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      <Divider />

      {/* Content */}
      <Box sx={{ px: 2.5, py: 2, overflowY: 'auto' }}>
        <Stack spacing={2}>
          {data.map((item, index) => (
            <Box key={index}>
              <Typography variant="caption" sx={{ color: 'text.muted', textTransform: 'uppercase', letterSpacing: '0.04em', mb: 0.5, display: 'block' }}>
                {item.label}
              </Typography>
              {item.node ? (
                item.node
              ) : (
                <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-word' }}>
                  {item.value || '-'}
                </Typography>
              )}
            </Box>
          ))}
        </Stack>
      </Box>

      {/* Actions */}
      {actions && (
        <Box sx={{ p: 2.5, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          {actions}
        </Box>
      )}
    </SwipeableDrawer>
  )
}
