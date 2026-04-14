import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

export default function PageHeader({ title, subtitle, children, hideTitleOnMobile = true }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        mb: { xs: 2.5, md: 3.5 },
        gap: 1.5,
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
            maxWidth: { md: children ? '55%' : '100%' },
            display: { xs: hideTitleOnMobile ? 'none' : 'block', md: 'block' },
          }}
        >
          <Typography
            variant="h1"
            component="h1"
            sx={{
              fontWeight: 600,
              lineHeight: 1.1,
              fontSize: { xs: '1.5rem', md: '2rem' },
              mb: subtitle ? 0.5 : 0,
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </Typography>

          {subtitle && (
            <Typography
              variant="body1"
              sx={{ color: 'text.secondary', maxWidth: 560, fontSize: '0.925rem' }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>

        {subtitle && hideTitleOnMobile && (
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              display: { xs: 'block', md: 'none' },
            }}
          >
            {subtitle}
          </Typography>
        )}

        {children && (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1.25,
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
