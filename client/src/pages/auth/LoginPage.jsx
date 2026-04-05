import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import { useAuth } from '../../context/useAuth.js'
import { loginRequest } from '../../api/auth'
import { ROLE_ROUTES } from '../../constants/routes.js'

export default function LoginPage() {
  const { login, token, user } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (token && user) {
    return <Navigate to={ROLE_ROUTES[user.role] ?? '/'} replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await loginRequest(email, password)
      login(data.token, data.user)
      const destination = ROLE_ROUTES[data.user.role] ?? '/'
      navigate(destination, { replace: true })
    } catch (err) {
      setError(err.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
      }}
    >
      {/* Left panel - decorative */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          width: '45%',
          background: 'linear-gradient(135deg, #1A1A2E 0%, #252540 50%, #1A1A2E 100%)',
          position: 'relative',
          overflow: 'hidden',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: 6,
        }}
      >
        {/* Geometric pattern */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.06,
            background: `
              repeating-linear-gradient(
                45deg,
                transparent,
                transparent 40px,
                rgba(255,255,255,0.5) 40px,
                rgba(255,255,255,0.5) 41px
              ),
              repeating-linear-gradient(
                -45deg,
                transparent,
                transparent 40px,
                rgba(255,255,255,0.5) 40px,
                rgba(255,255,255,0.5) 41px
              )
            `,
          }}
        />

        {/* Decorative circles */}
        <Box
          sx={{
            position: 'absolute',
            top: '15%',
            right: '-10%',
            width: 300,
            height: 300,
            borderRadius: '50%',
            border: '1px solid rgba(61,90,128,0.3)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: '10%',
            left: '-5%',
            width: 200,
            height: 200,
            borderRadius: '50%',
            border: '1px solid rgba(238,108,77,0.2)',
          }}
        />

        {/* Branding */}
        <Box sx={{ position: 'relative', textAlign: 'center' }}>
          <Typography
            sx={{
              fontFamily: '"Instrument Serif", Georgia, serif',
              fontSize: '5rem',
              color: '#FFFFFF',
              lineHeight: 1,
              letterSpacing: '-0.03em',
              mb: 1,
            }}
          >
            FDM
          </Typography>
          <Box
            sx={{
              width: 60,
              height: 3,
              background: 'linear-gradient(90deg, #3D5A80, #EE6C4D)',
              borderRadius: 2,
              mx: 'auto',
              mb: 2,
            }}
          />
          <Typography
            sx={{
              fontFamily: '"Outfit", sans-serif',
              fontSize: '0.75rem',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            Timesheet Management
          </Typography>
        </Box>

        {/* Bottom quote */}
        <Typography
          sx={{
            position: 'absolute',
            bottom: 40,
            left: 40,
            right: 40,
            fontFamily: '"Instrument Serif", Georgia, serif',
            fontStyle: 'italic',
            fontSize: '1.1rem',
            color: 'rgba(255,255,255,0.2)',
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          Track time. Manage approvals. Process payments.
        </Typography>
      </Box>

      {/* Right panel - form */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          p: 4,
          backgroundColor: '#FAFAF7',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          {/* Mobile branding */}
          <Box
            sx={{
              display: { xs: 'block', md: 'none' },
              textAlign: 'center',
              mb: 4,
            }}
          >
            <Typography
              sx={{
                fontFamily: '"Instrument Serif", Georgia, serif',
                fontSize: '2.5rem',
                color: '#1A1A2E',
                lineHeight: 1,
              }}
            >
              FDM
            </Typography>
            <Typography
              sx={{
                fontSize: '0.65rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: '#9CA3AF',
                mt: 0.5,
              }}
            >
              Timesheets
            </Typography>
          </Box>

          <Typography
            variant="h4"
            sx={{
              fontFamily: '"Instrument Serif", Georgia, serif',
              mb: 0.5,
            }}
          >
            Welcome back
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary', mb: 4 }}
          >
            Sign in to your account to continue
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
              autoComplete="email"
              autoFocus
              sx={{ mb: 2.5 }}
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              autoComplete="current-password"
              sx={{ mb: 3.5 }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
              sx={{ py: 1.5 }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
