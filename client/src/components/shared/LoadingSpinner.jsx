import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'

export default function LoadingSpinner() {
  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      minHeight="200px"
      gap={2}
    >
      <CircularProgress
        size={32}
        thickness={3}
        sx={{ color: '#3D5A80' }}
      />
      <Typography
        sx={{
          fontSize: '0.7rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#9CA3AF',
          fontWeight: 500,
        }}
      >
        Loading
      </Typography>
    </Box>
  )
}
