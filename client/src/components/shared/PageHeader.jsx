import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

export default function PageHeader({ title, subtitle, children }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', sm: 'flex-start' },
        flexDirection: { xs: 'column', sm: 'row' },
        mb: { xs: 3, md: 4 },
        gap: { xs: 1.5, sm: 2 },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontFamily: 'Poppins, Georgia, serif',
            fontWeight: 400,
            fontSize: '2.5rem',
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary', mt: 0.5, fontSize: '1.15rem' }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
      {children && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1.5,
            alignItems: { xs: 'stretch', sm: 'center' },
            flexShrink: 0,
            width: { xs: '100%', sm: 'auto' },
            '& > *': {
              width: { xs: '100%', sm: 'auto' },
            },
            '& .MuiButton-root, & .MuiFormControl-root': {
              width: { xs: '100%', sm: 'auto'},
            },
          }}
        >
          {children}
        </Box>
      )}
    </Box>
  )
}
