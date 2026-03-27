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
    >
      <Typography variant="h3" fontWeight={700} color="error">
        403 — Forbidden
      </Typography>
      <Typography variant="body1" color="text.secondary" maxWidth={480}>
        You do not have permission to access this page. Please contact your
        administrator if you believe this is an error.
      </Typography>
      <Button variant="contained" onClick={() => navigate(-1)}>
        Go back
      </Button>
    </Box>
  )
}
