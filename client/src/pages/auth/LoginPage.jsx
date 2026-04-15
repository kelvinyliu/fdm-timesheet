import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { useAuth } from '../../context/useAuth.js'
import { loginRequest } from '../../api/auth'
import { ROLE_ROUTES } from '../../constants/routes.js'
import { decodeJwtPayload } from '../../utils/jwt.js'
import { palette } from '../../theme.js'

export default function LoginPage() {
  const { login, token, user } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [capsLockOn, setCapsLockOn] = useState(false)

  if (token && user) {
    return <Navigate to={ROLE_ROUTES[user.role] ?? '/'} replace />
  }

  function validateField(field, value) {
    if (!value.trim()) {
      return field === 'email' ? 'Enter your email address.' : 'Enter your password.'
    }

    if (field === 'email' && !/^\S+@\S+\.\S+$/.test(value.trim())) {
      return 'Enter a valid email address.'
    }

    return ''
  }

  function updateField(field, value) {
    if (field === 'email') {
      setEmail(value)
    } else {
      setPassword(value)
    }

    setFieldErrors((prev) => ({
      ...prev,
      [field]: prev[field] ? validateField(field, value) : '',
    }))
  }

  function validateForm() {
    const nextFieldErrors = {
      email: validateField('email', email),
      password: validateField('password', password),
    }

    setFieldErrors(nextFieldErrors)
    return !nextFieldErrors.email && !nextFieldErrors.password
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validateForm()) return

    setError('')
    setLoading(true)

    try {
      const data = await loginRequest(email.trim(), password)
      const tokenPayload = decodeJwtPayload(data.token)

      if (!tokenPayload) {
        throw new Error('Invalid login response.')
      }

      const nextUser = data.user ?? tokenPayload
      const role = nextUser?.role || tokenPayload?.role

      if (!role) {
        throw new Error('Unable to determine user role.')
      }

      login(data.token, nextUser)

      const destination = ROLE_ROUTES[role] ?? '/login'
      navigate(destination, { replace: true })
    } catch (err) {
      setError(
        err.message ||
          'Sign-in failed. Check your email and password, then try again. If you still cannot access the system, reset your password or contact an administrator.'
      )
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
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          width: '45%',
          background: `linear-gradient(135deg, ${palette.sidebarBg} 0%, ${palette.sidebarBgAlt} 60%, ${palette.sidebarBg} 100%)`,
          position: 'relative',
          overflow: 'hidden',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: 6,
        }}
      >
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
                rgba(var(--ui-white-rgb), 0.5) 40px,
                rgba(var(--ui-white-rgb), 0.5) 41px
              ),
              repeating-linear-gradient(
                -45deg,
                transparent,
                transparent 40px,
                rgba(var(--ui-white-rgb), 0.5) 40px,
                rgba(var(--ui-white-rgb), 0.5) 41px
              )
            `,
          }}
        />

        <Box
          sx={{
            position: 'absolute',
            top: '15%',
            right: '-10%',
            width: 300,
            height: 300,
            borderRadius: '50%',
            border: `1px solid ${palette.overlayPrimaryMuted}`,
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
            border: `1px solid ${palette.overlayWhiteMuted}`,
          }}
        />

        <Box sx={{ position: 'relative', textAlign: 'center' }}>
          <Typography
            sx={{
              fontFamily: '"Instrument Serif", Georgia, serif',
              fontSize: '10rem',
              color: palette.textInverse,
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
              background: `linear-gradient(90deg, ${palette.primary}, ${palette.primaryHover})`,
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
              color: palette.textInverseMuted,
            }}
          >
            Timesheet Management
          </Typography>
        </Box>

        <Typography
          sx={{
            position: 'absolute',
            bottom: 40,
            left: 40,
            right: 40,
            fontFamily: '"Outfit", system-ui, sans-serif',
            fontWeight: 500,
            fontSize: '1.1rem',
            color: 'rgba(var(--ui-white-rgb), 0.28)',
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          Track Time | Manage Approvals | Process Payments
        </Typography>
      </Box>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          p: 4,
          backgroundColor: palette.bg,
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 400 }}>
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
                fontSize: '3rem',
                color: palette.textPrimary,
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
                color: palette.textMuted,
                mt: 0.5,
              }}
            >
              Timesheets
            </Typography>
          </Box>

          <Typography
            variant="h1"
            sx={{
              fontFamily: '"Outfit", system-ui, sans-serif',
              color: palette.textPrimary,
              lineHeight: 1.1,
              mb: 0.5,
              fontSize: '2rem',
              fontWeight: 600,
              letterSpacing: '-0.01em',
            }}
          >
            Welcome Back
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
            Sign in with your work email to continue.
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
              onChange={(e) => updateField('email', e.target.value)}
              onBlur={(e) =>
                setFieldErrors((prev) => ({
                  ...prev,
                  email: validateField('email', e.target.value),
                }))
              }
              fullWidth
              required
              autoComplete="email"
              autoCapitalize="none"
              autoFocus
              error={Boolean(fieldErrors.email)}
              helperText={fieldErrors.email || ' '}
              sx={{ mb: 2.5 }}
            />
            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => updateField('password', e.target.value)}
              onBlur={(e) =>
                setFieldErrors((prev) => ({
                  ...prev,
                  password: validateField('password', e.target.value),
                }))
              }
              onKeyDown={(event) => setCapsLockOn(event.getModifierState('CapsLock'))}
              onKeyUp={(event) => setCapsLockOn(event.getModifierState('CapsLock'))}
              fullWidth
              required
              autoComplete="current-password"
              error={Boolean(fieldErrors.password)}
              helperText={fieldErrors.password || (capsLockOn ? 'Caps Lock is on.' : ' ')}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword((prev) => !prev)}
                        onMouseDown={(event) => event.preventDefault()}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ mb: 3.5 }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
              sx={{
                py: 1.6,
                borderRadius: 2,
                backgroundColor: palette.textPrimary,
                color: palette.textInverse,
                fontWeight: 700,
                fontSize: '0.95rem',
                letterSpacing: '0.02em',
                border: `1px solid ${palette.textPrimary}`,
                '&:hover': {
                  backgroundColor: palette.primary,
                  color: palette.primaryContrast,
                  borderColor: palette.primary,
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                },
                '&:active': {
                  transform: 'translateY(0)',
                },
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
