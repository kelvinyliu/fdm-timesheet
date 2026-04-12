import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import ButtonBase from '@mui/material/ButtonBase'
import Tooltip from '@mui/material/Tooltip'
import DashboardIcon from '@mui/icons-material/Dashboard'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import PeopleIcon from '@mui/icons-material/People'
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd'
import HistoryIcon from '@mui/icons-material/History'
import { useNavigate, useLocation } from 'react-router'
import { useAuth } from '../../context/useAuth.js'
import { palette } from '../../theme.js'

const NAV_LINKS = {
  CONSULTANT: [
    { label: 'Dashboard', path: '/consultant/dashboard', icon: DashboardIcon },
    { label: 'Timesheets', path: '/consultant/timesheets', icon: AccessTimeIcon },
  ],
  LINE_MANAGER: [
    { label: 'Dashboard', path: '/manager/dashboard', icon: DashboardIcon },
    { label: 'Timesheets', path: '/manager/timesheets', icon: AccessTimeIcon },
  ],
  FINANCE_MANAGER: [
    { label: 'Dashboard', path: '/finance/dashboard', icon: DashboardIcon },
    { label: 'Timesheets', path: '/finance/timesheets', icon: AccessTimeIcon },
  ],
  SYSTEM_ADMIN: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: DashboardIcon },
    { label: 'Users', path: '/admin/users', icon: PeopleIcon },
    { label: 'Assignments', path: '/admin/assignments', icon: AssignmentIndIcon },
    { label: 'Audit Log', path: '/admin/audit', icon: HistoryIcon },
  ],
}

export default function Sidebar({ onNavigate, collapsed = false }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const links = (user && NAV_LINKS[user.role]) || []

  return (
    <Box sx={{ py: 2, px: collapsed ? 1 : 1.5 }}>
      {!collapsed && (
        <Typography
          sx={{
            fontSize: '0.6rem',
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: palette.textInverseMuted,
            px: 1.5,
            mb: 1,
          }}
        >
          Navigation
        </Typography>
      )}

      {links.map(({ label, path, icon: Icon }) => {
        const isActive = location.pathname.startsWith(path)

        const navButton = (
          <ButtonBase
            key={path}
            onClick={() => {
              navigate(path)
              onNavigate?.()
            }}
            sx={{
              width: '100%',
              minHeight: collapsed ? 48 : 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: collapsed ? 0 : 1.5,
              px: collapsed ? 0 : 1.5,
              py: 1.1,
              mb: 0.5,
              borderRadius: '10px',
              textAlign: 'left',
              color: isActive ? palette.textInverse : palette.textInverseMuted,
              backgroundColor: isActive ? palette.overlayPrimaryMuted : 'transparent',
              transition: 'all 0.15s ease',
              position: 'relative',
              overflow: 'hidden',
              '&:hover': {
                backgroundColor: isActive
                  ? 'rgba(var(--ui-primary-rgb), 0.24)'
                  : palette.overlayWhiteSoft,
                color: palette.textInverse,
              },
              '&::before': isActive
                ? {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: collapsed ? '22%' : '20%',
                    bottom: collapsed ? '22%' : '20%',
                    width: 3,
                    borderRadius: '0 3px 3px 0',
                    backgroundColor: palette.primary,
                  }
                : {},
            }}
          >
            <Icon
              sx={{
                fontSize: collapsed ? '1.3rem' : '1.15rem',
                opacity: isActive ? 1 : 0.78,
                flexShrink: 0,
              }}
            />

            {!collapsed && (
              <Typography
                sx={{
                  fontSize: '0.825rem',
                  fontWeight: isActive ? 600 : 400,
                  letterSpacing: '0.01em',
                }}
              >
                {label}
              </Typography>
            )}
          </ButtonBase>
        )

        return collapsed ? (
          <Tooltip key={path} title={label} placement="right">
            {navButton}
          </Tooltip>
        ) : (
          navButton
        )
      })}
    </Box>
  )
}