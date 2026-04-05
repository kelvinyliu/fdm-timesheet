import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

export default function PageHeader({ title, subtitle, children }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        mb: 4,
        gap: 2,
      }}
    >
      <Box>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontFamily: '"Instrument Serif", Georgia, serif',
            fontWeight: 400,
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary', mt: 0.5 }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
      {children && (
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexShrink: 0 }}>
          {children}
        </Box>
      )}
    </Box>
  )
}
