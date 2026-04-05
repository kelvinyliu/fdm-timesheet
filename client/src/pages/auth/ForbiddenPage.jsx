import { useNavigate } from 'react-router'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'

export default function ForbiddenPage() {
  const navigate = useNavigate()

  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      gap={2}
      textAlign="center"
      px={2}
      sx={{ backgroundColor: '#FAFAF7' }}
    >
      <Typography
        sx={{
          fontFamily: '"Instrument Serif", Georgia, serif',
          fontSize: '6rem',
          fontWeight: 400,
          color: '#C4453C',
          lineHeight: 1,
        }}
      >
        403
      </Typography>
      <Typography
        variant="h5"
        sx={{
          fontFamily: '"Instrument Serif", Georgia, serif',
          color: '#1A1A2E',
          mb: 1,
        }}
      >
        Access Forbidden
      </Typography>
      <Typography variant="body2" color="text.secondary" maxWidth={420}>
        You do not have permission to access this page. Please contact your
        administrator if you believe this is an error.
      </Typography>
      <Button variant="contained" onClick={() => navigate(-1)} sx={{ mt: 1 }}>
        Go back
      </Button>
    </Box>
  )
}
