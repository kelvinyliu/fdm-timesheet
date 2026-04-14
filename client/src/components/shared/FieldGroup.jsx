import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { palette } from '../../theme.js'

export default function FieldGroup({
  label,
  htmlFor,
  required,
  helper,
  error,
  children,
  sx,
}) {
  const helperId = htmlFor ? `${htmlFor}-helper` : undefined
  const errorId = htmlFor ? `${htmlFor}-error` : undefined
  const describedBy = [error ? errorId : null, !error && helper ? helperId : null]
    .filter(Boolean)
    .join(' ')

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, ...sx }}>
      {label && (
        <Typography
          component="label"
          htmlFor={htmlFor}
          sx={{
            fontSize: '0.8rem',
            fontWeight: 500,
            color: palette.textSecondary,
            letterSpacing: '0.01em',
          }}
        >
          {label}
          {required && (
            <Box component="span" sx={{ color: palette.error, ml: 0.3 }} aria-hidden>
              *
            </Box>
          )}
        </Typography>
      )}
      <Box sx={{ '& .MuiInputBase-root': { width: '100%' } }}>{children}</Box>
      {error ? (
        <Typography
          id={errorId}
          role="alert"
          sx={{ fontSize: '0.75rem', color: palette.error, mt: 0.25 }}
        >
          {error}
        </Typography>
      ) : helper ? (
        <Typography
          id={helperId}
          sx={{ fontSize: '0.75rem', color: palette.textMuted, mt: 0.25 }}
        >
          {helper}
        </Typography>
      ) : null}
      {/* Expose describedBy for consumers that render raw inputs */}
      <span data-describedby={describedBy} hidden />
    </Box>
  )
}
