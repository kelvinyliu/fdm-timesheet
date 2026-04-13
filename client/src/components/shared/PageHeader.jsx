import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

export default function PageHeader({ title, subtitle, children }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        mb: { xs: 3, md: 4 },
        gap: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', md: 'flex-start' },
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
        }}
      >
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            maxWidth: { md: children ? '45%' : '100%' },
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontFamily: '"Instrument Serif", Georgia, serif',
              fontWeight: 400,
              lineHeight: 1.1,
              fontSize: { xs: '2.2rem', md: '3rem' },
              mb: subtitle ? 0.75 : 0,
            }}
          >
            {title}
          </Typography>

          {subtitle && (
            <Typography
              variant="body1"
              sx={{
                color: 'text.secondary',
                maxWidth: 520,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>

        {children && (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1.5,
              alignItems: 'center',
              justifyContent: { xs: 'stretch', md: 'flex-end' },
              width: { xs: '100%', md: 'auto' },
              maxWidth: { md: '55%' },
              '& > *': {
                width: { xs: '100%', sm: 'auto' },
              },
              '& .MuiButton-root, & .MuiFormControl-root, & .MuiTextField-root': {
                width: { xs: '100%', sm: 'auto' },
              },
            }}
          >
            {children}
          </Box>
        )}
      </Box>
    </Box>
  )
}
