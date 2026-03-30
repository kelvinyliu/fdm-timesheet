import { useState } from 'react'
import Box from '@mui/material/Box'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import { Outlet } from 'react-router'
import Sidebar from './Sidebar.jsx'
import { useAuth } from '../../context/useAuth.js'
import { changePassword } from '../../api/auth.js'

const DRAWER_WIDTH = 240

export default function AppLayout() {
  const { logout } = useAuth()

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
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            FDM Timesheets
          </Typography>
          <Button color="inherit" onClick={() => setPwOpen(true)}>
            Change Password
          </Button>
          <Button color="inherit" onClick={logout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar />
        <Sidebar />
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          minHeight: '100vh',
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>

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
            {pwLoading ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
