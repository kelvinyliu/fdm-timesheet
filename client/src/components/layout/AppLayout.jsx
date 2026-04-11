import { Fragment, useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import AppBar from '@mui/material/AppBar'
import Drawer from '@mui/material/Drawer'
import Toolbar from '@mui/material/Toolbar'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import Tooltip from '@mui/material/Tooltip'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import LogoutIcon from '@mui/icons-material/Logout'
import LockResetIcon from '@mui/icons-material/LockReset'
import MenuIcon from '@mui/icons-material/Menu'
import { Outlet, useLocation } from 'react-router'
import Sidebar from './Sidebar.jsx'
import { useAuth } from '../../context/useAuth.js'
import { useConfirmation } from '../../context/useConfirmation.js'
import {
  useUnsavedChangesController,
  useUnsavedChangesGuard,
} from '../../context/useUnsavedChanges.js'
import { changePassword } from '../../api/auth.js'
import { palette } from '../../theme.js'

const SIDEBAR_WIDTH = 260
const MOBILE_DRAWER_WIDTH = 320

const ROLE_SHORT = {
  CONSULTANT: 'Consultant',
  LINE_MANAGER: 'Manager',
  FINANCE_MANAGER: 'Finance',
  SYSTEM_ADMIN: 'Admin',
}

function getBreadcrumbs(pathname) {
  if (pathname.startsWith('/admin/audit')) return ['Admin', 'Audit Log']
  if (pathname.startsWith('/admin/assignments')) return ['Admin', 'Assignments']
  if (pathname.startsWith('/admin/users')) return ['Admin', 'Users']
  if (/\/timesheets\/[^/]+\/edit/.test(pathname)) return ['Timesheets', 'Edit']
  if (/\/timesheets\/[^/]+\/payment/.test(pathname)) return ['Timesheets', 'Payment']
  if (/\/timesheets\/new/.test(pathname)) return ['Timesheets', 'New']
  if (/\/timesheets\/[^/]+/.test(pathname))
    return pathname.startsWith('/manager')
      ? ['Timesheets', 'Open Timesheet']
      : ['Timesheets', 'Detail']
  if (pathname.includes('/timesheets')) return ['Timesheets']
  return []
}

function BrandLockup({ compact = false }) {
  return (
    <Box
      sx={{
        p: compact ? '18px 20px' : '28px 24px 20px',
        position: 'relative',
        borderBottom: `1px solid ${palette.sidebarScrim}`,
      }}
    >
      <Typography
        sx={{
          fontFamily: '"Instrument Serif", Georgia, serif',
          fontSize: compact ? '2.35rem' : '5rem',
          color: palette.textInverse,
          letterSpacing: '-0.01em',
          lineHeight: 1,
        }}
      >
        FDM
      </Typography>
      <Typography
        sx={{
          fontFamily: '"Outfit", sans-serif',
          fontSize: compact ? '0.62rem' : '0.65rem',
          letterSpacing: compact ? '0.18em' : '0.2em',
          textTransform: 'uppercase',
          color: palette.textInverseMuted,
          mt: 0.5,
        }}
      >
        Timesheets
      </Typography>
    </Box>
  )
}

function UserFooter({ user, onChangePassword, onLogout, mobile = false, pinned = false }) {
  if (mobile) {
    return (
      <Box
        sx={{
          p: 2.5,
          borderTop: `1px solid ${palette.sidebarScrim}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              background: `linear-gradient(135deg, ${palette.primary} 0%, ${palette.primaryHover} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: palette.primaryContrast,
              flexShrink: 0,
            }}
          >
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: '0.9rem',
                fontWeight: 500,
                color: palette.textInverse,
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
                color: palette.textInverseMuted,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {user?.role?.replace(/_/g, ' ')}
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 1,
          }}
        >
          <Button
            variant="outlined"
            startIcon={<LockResetIcon />}
            onClick={onChangePassword}
            sx={{
              color: palette.textInverse,
              borderColor: palette.sidebarScrim,
              backgroundColor: palette.overlayWhiteSoft,
              '&:hover': {
                borderColor: palette.textInverseMuted,
                backgroundColor: palette.overlayWhiteMuted,
              },
            }}
          >
            Password
          </Button>
          <Button
            variant="contained"
            startIcon={<LogoutIcon />}
            onClick={onLogout}
          >
            Sign out
          </Button>
        </Box>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        p: '16px 20px',
        borderTop: `1px solid ${palette.sidebarScrim}`,
        position: pinned ? 'fixed' : 'relative',
        left: pinned ? 0 : 'auto',
        right: pinned ? 'auto' : 'auto',
        bottom: pinned ? 0 : 'auto',
        width: pinned ? SIDEBAR_WIDTH : 'auto',
        zIndex: pinned ? 1201 : 'auto',
        background: pinned
          ? `linear-gradient(180deg, ${palette.sidebarBgAlt} 0%, ${palette.sidebarBg} 100%)`
          : 'transparent',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexShrink: 0,
      }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: '8px',
          background: `linear-gradient(135deg, ${palette.primary} 0%, ${palette.primaryHover} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.75rem',
          fontWeight: 700,
          color: palette.primaryContrast,
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
            color: palette.textInverse,
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
            color: palette.textInverseMuted,
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
          onClick={onChangePassword}
          sx={{
            color: palette.textInverseMuted,
            '&:hover': { color: palette.textInverse, backgroundColor: palette.overlayWhiteSoft },
          }}
        >
          <LockResetIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Sign out">
        <IconButton
          size="small"
          onClick={onLogout}
          sx={{
            color: palette.textInverseMuted,
            '&:hover': { color: palette.primary, backgroundColor: palette.overlayWhiteSoft },
          }}
        >
          <LogoutIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  )
}

export default function AppLayout() {
  const theme = useTheme()
  const location = useLocation()
  const { logout, user } = useAuth()
  const { confirm } = useConfirmation()
  const { runWithGuard } = useUnsavedChangesController()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'))

  const [pwOpen, setPwOpen] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const crumbs = getBreadcrumbs(location.pathname)
  const isPasswordDialogDirty = pwOpen && (
    Boolean(pwForm.current) ||
    Boolean(pwForm.next) ||
    Boolean(pwForm.confirm)
  )

  useUnsavedChangesGuard({
    isDirty: isPasswordDialogDirty,
    title: 'Discard password changes?',
    message: 'You have started editing the password form. Leaving now will discard those values.',
    variant: 'warning',
    discardLabel: 'Discard password changes',
    stayLabel: 'Keep editing',
  })

  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname])

  function closeDialog() {
    setPwOpen(false)
    setPwError('')
    setPwSuccess(false)
    setPwForm({ current: '', next: '', confirm: '' })
  }

  async function attemptCloseDialog() {
    if (!isPasswordDialogDirty || pwLoading) {
      closeDialog()
      return
    }

    const result = await confirm({
      variant: 'warning',
      title: 'Discard password changes?',
      message: 'The password form has unsaved values. Closing it now will discard them.',
      confirmLabel: 'Discard changes',
      cancelLabel: 'Keep editing',
    })

    if (result === 'confirm') {
      closeDialog()
    }
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

  const todayLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const navShellStyles = {
    background: `linear-gradient(180deg, ${palette.sidebarBg} 0%, ${palette.sidebarBgAlt} 100%)`,
    color: palette.textInverse,
    position: 'relative',
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
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {!isMobile && (
        <Box
          component="nav"
          sx={{
            width: SIDEBAR_WIDTH,
            flexShrink: 0,
            display: 'grid',
            gridTemplateRows: 'auto minmax(0, 1fr) auto',
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            overflow: 'hidden',
            zIndex: 1200,
            ...navShellStyles,
          }}
        >
          <BrandLockup />
          <Box
            sx={{
              minHeight: 0,
              overflow: 'auto',
              position: 'relative',
            }}
          >
            <Sidebar />
          </Box>
          <UserFooter
            user={user}
            pinned
            onChangePassword={() => setPwOpen(true)}
            onLogout={() => runWithGuard(logout)}
          />
        </Box>
      )}

      {isMobile && (
        <>
          <AppBar
            position="fixed"
            color="transparent"
            elevation={0}
            sx={{
              display: { xs: 'flex', md: 'none' },
              borderBottom: `1px solid ${palette.border}`,
              backgroundColor: 'rgba(var(--ui-white-rgb), 0.9)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <Toolbar
              sx={{
                minHeight: { xs: 64, sm: 72 },
                px: { xs: 2, sm: 3 },
                gap: 1.5,
              }}
            >
              <IconButton
                edge="start"
                onClick={() => setMobileNavOpen(true)}
                sx={{
                  color: palette.textPrimary,
                  border: `1px solid ${palette.border}`,
                  borderRadius: '10px',
                }}
              >
                <MenuIcon />
              </IconButton>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontFamily: '"Instrument Serif", Georgia, serif',
                    fontSize: '2rem',
                    color: palette.textPrimary,
                    lineHeight: 1,
                  }}
                >
                  FDM
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.6rem',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: palette.textMuted,
                    mt: 0.3,
                  }}
                >
                  Timesheets
                </Typography>
              </Box>

              <Typography
                variant="caption"
                sx={{
                  display: { xs: 'none', sm: 'block' },
                  color: palette.textMuted,
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.68rem',
                  textAlign: 'right',
                }}
              >
                {todayLabel}
              </Typography>

              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '9px',
                  background: `linear-gradient(135deg, ${palette.sidebarBg} 0%, #2d3224 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: palette.textInverse,
                  flexShrink: 0,
                }}
              >
                {user?.name?.[0]?.toUpperCase() ?? '?'}
              </Box>
            </Toolbar>
          </AppBar>

          <Drawer
            open={mobileNavOpen}
            onClose={() => setMobileNavOpen(false)}
            ModalProps={{ keepMounted: true }}
            slotProps={{
              paper: {
                sx: {
                  width: `min(100vw, ${MOBILE_DRAWER_WIDTH}px)`,
                  display: 'grid',
                  gridTemplateRows: 'auto minmax(0, 1fr) auto',
                  minHeight: 0,
                  overflow: 'hidden',
                  backgroundImage: 'none',
                  ...navShellStyles,
                },
              },
            }}
          >
            <BrandLockup compact />
            <Box sx={{ minHeight: 0, overflow: 'auto', position: 'relative' }}>
              <Sidebar onNavigate={() => setMobileNavOpen(false)} />
            </Box>
            <UserFooter
              user={user}
              mobile
              onChangePassword={() => {
                setMobileNavOpen(false)
                setPwOpen(true)
              }}
              onLogout={() => runWithGuard(logout)}
            />
          </Drawer>
        </>
      )}

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          width: { xs: '100%', md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
        }}
      >
        {isMobile && (
          <Toolbar
            sx={{
              minHeight: { xs: 64, sm: 72 },
            }}
          />
        )}

        {/* Top bar */}
        <Box
          sx={{
            px: { md: 3, lg: 4 },
            borderBottom: `1px solid ${palette.border}`,
            backgroundColor: 'rgba(var(--ui-white-rgb), 0.97)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 1px 4px rgba(30,30,30,0.06)',
            position: 'sticky',
            top: 0,
            zIndex: 1100,
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: 56,
            gap: 2,
          }}
        >
          {/* Breadcrumb */}
          <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, overflow: 'hidden' }}>
            {crumbs.map((crumb, i) => (
              <Fragment key={crumb + i}>
                {i > 0 && (
                  <Typography
                    sx={{
                      mx: 1,
                      color: palette.border,
                      fontSize: '0.8rem',
                      userSelect: 'none',
                      lineHeight: 1,
                    }}
                  >
                    /
                  </Typography>
                )}
                <Typography
                  sx={{
                    fontSize: '0.8rem',
                    fontWeight: i === crumbs.length - 1 ? 600 : 400,
                    color: i === crumbs.length - 1 ? palette.textPrimary : palette.textMuted,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {crumb}
                </Typography>
              </Fragment>
            ))}
          </Box>

          {/* Right: date + divider + user pill */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            <Typography
              sx={{
                color: palette.textMuted,
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.7rem',
                whiteSpace: 'nowrap',
              }}
            >
              {todayLabel}
            </Typography>
          </Box>
        </Box>

        {/* Page content */}
        <Box
          className="page-enter"
          sx={{
            flex: 1,
            p: { xs: 2, sm: 3, md: 4 },
            maxWidth: 1200,
            width: '100%',
            mx: 'auto',
          }}
        >
          <Outlet />
        </Box>
      </Box>

      {/* Change Password Dialog */}
      <Dialog
        open={pwOpen}
        onClose={pwLoading ? undefined : () => {
          void attemptCloseDialog()
        }}
        maxWidth="xs"
        fullWidth
        fullScreen={isSmallScreen}
      >
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
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            label="New Password"
            type="password"
            value={pwForm.next}
            onChange={(e) => setPwForm((p) => ({ ...p, next: e.target.value }))}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Confirm New Password"
            type="password"
            value={pwForm.confirm}
            onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            void attemptCloseDialog()
          }} disabled={pwLoading}>
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
