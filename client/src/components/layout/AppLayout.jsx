import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import Tooltip from '@mui/material/Tooltip'
import LogoutIcon from '@mui/icons-material/Logout'
import LockResetIcon from '@mui/icons-material/LockReset'
import { Outlet } from 'react-router'
import Sidebar from './Sidebar.jsx'
import { useAuth } from '../../context/useAuth.js'
import { changePassword } from '../../api/auth.js'
import { palette } from '../../theme.js'

const SIDEBAR_WIDTH = 260

export default function AppLayout() {
  const { logout, user } = useAuth()

  const [pwOpen, setPwOpen] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)

  function closeDialog() {
    setPwOpen(false)
    setPwError('')
    setPwSuccess(false)
    setPwForm({ current: '', next: '', confirm: '' })
  }

  async function handleChangePassword() {
    setPwError('')
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) {
      setPwError('All fields are required.')
      return
    }
    if (pwForm.next.length < 8) {
      setPwError('New password must be at least 8 characters.')
      return
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwError('New passwords do not match.')
      return
    }
    setPwLoading(true)
    try {
      await changePassword(pwForm.current, pwForm.next)
      setPwSuccess(true)
      setPwForm({ current: '', next: '', confirm: '' })
    } catch (err) {
      setPwError(err.message || 'Failed to change password.')
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Box
        component="nav"
        sx={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          background: `linear-gradient(180deg, ${palette.navy} 0%, #151528 100%)`,
          color: '#E2E2E8',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 1200,
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.02\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            pointerEvents: 'none',
          },
        }}
      >
        {/* Logo area */}
        <Box
          sx={{
            p: '28px 24px 20px',
            position: 'relative',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <Typography
            sx={{
              fontFamily: '"Instrument Serif", Georgia, serif',
              fontSize: '1.5rem',
              color: '#FFFFFF',
              letterSpacing: '-0.01em',
              lineHeight: 1,
            }}
          >
            FDM
          </Typography>
          <Typography
            sx={{
              fontFamily: '"Outfit", sans-serif',
              fontSize: '0.65rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.4)',
              mt: 0.5,
            }}
          >
            Timesheets
          </Typography>
        </Box>

        {/* Nav */}
        <Box sx={{ flex: 1, overflow: 'auto', position: 'relative' }}>
          <Sidebar />
        </Box>

        {/* User footer */}
        <Box
          sx={{
            p: '16px 20px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              background: `linear-gradient(135deg, ${palette.steel} 0%, ${palette.coral} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: '0.8rem',
                fontWeight: 500,
                color: '#E2E2E8',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.name ?? 'User'}
            </Typography>
            <Typography
              sx={{
                fontSize: '0.65rem',
                color: 'rgba(255,255,255,0.35)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {user?.role?.replace(/_/g, ' ')}
            </Typography>
          </Box>
          <Tooltip title="Change password">
            <IconButton
              size="small"
              onClick={() => setPwOpen(true)}
              sx={{
                color: 'rgba(255,255,255,0.4)',
                '&:hover': { color: '#fff', backgroundColor: 'rgba(255,255,255,0.08)' },
              }}
            >
              <LockResetIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Sign out">
            <IconButton
              size="small"
              onClick={logout}
              sx={{
                color: 'rgba(255,255,255,0.4)',
                '&:hover': { color: palette.coral, backgroundColor: 'rgba(238,108,77,0.1)' },
              }}
            >
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          ml: `${SIDEBAR_WIDTH}px`,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Top bar */}
        <Box
          sx={{
            px: 4,
            py: 2,
            borderBottom: `1px solid ${palette.border}`,
            backgroundColor: 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(10px)',
            position: 'sticky',
            top: 0,
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            minHeight: 56,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: palette.textMuted,
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.7rem',
            }}
          >
            {new Date().toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Typography>
        </Box>

        {/* Page content */}
        <Box
          className="page-enter"
          sx={{
            flex: 1,
            p: 4,
            maxWidth: 1200,
            width: '100%',
          }}
        >
          <Outlet />
        </Box>
      </Box>

      {/* Change Password Dialog */}
      <Dialog open={pwOpen} onClose={closeDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          {pwError && (
            <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
              {pwError}
            </Alert>
          )}
          {pwSuccess && (
            <Alert severity="success" sx={{ mb: 2, mt: 1 }}>
              Password changed successfully.
            </Alert>
          )}
          <TextField
            label="Current Password"
            type="password"
            value={pwForm.current}
            onChange={(e) => setPwForm((p) => ({ ...p, current: e.target.value }))}
            fullWidth
            size="small"
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            label="New Password"
            type="password"
            value={pwForm.next}
            onChange={(e) => setPwForm((p) => ({ ...p, next: e.target.value }))}
            fullWidth
            size="small"
            sx={{ mb: 2 }}
          />
          <TextField
            label="Confirm New Password"
            type="password"
            value={pwForm.confirm}
            onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))}
            fullWidth
            size="small"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={pwLoading}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleChangePassword} disabled={pwLoading}>
            {pwLoading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
