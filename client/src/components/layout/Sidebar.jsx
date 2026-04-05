import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import ButtonBase from '@mui/material/ButtonBase'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import PeopleIcon from '@mui/icons-material/People'
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd'
import HistoryIcon from '@mui/icons-material/History'
import { useNavigate, useLocation } from 'react-router'
import { useAuth } from '../../context/useAuth.js'
import { palette } from '../../theme.js'

const NAV_LINKS = {
  CONSULTANT: [
    { label: 'Timesheets', path: '/consultant/timesheets', icon: AccessTimeIcon },
  ],
  LINE_MANAGER: [
    { label: 'Timesheets', path: '/manager/timesheets', icon: AccessTimeIcon },
  ],
  FINANCE_MANAGER: [
    { label: 'Timesheets', path: '/finance/timesheets', icon: AccessTimeIcon },
  ],
  SYSTEM_ADMIN: [
    { label: 'Users', path: '/admin/users', icon: PeopleIcon },
    { label: 'Assignments', path: '/admin/assignments', icon: AssignmentIndIcon },
    { label: 'Audit Log', path: '/admin/audit', icon: HistoryIcon },
  ],
}

export default function Sidebar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const links = (user && NAV_LINKS[user.role]) || []

  return (
    <Box sx={{ py: 2, px: 1.5 }}>
      <Typography
        sx={{
          fontSize: '0.6rem',
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.3)',
          px: 1.5,
          mb: 1,
        }}
      >
        Navigation
      </Typography>
      {links.map(({ label, path, icon: Icon }) => {
        const isActive = location.pathname.startsWith(path)
        return (
          <ButtonBase
            key={path}
            onClick={() => navigate(path)}
            sx={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: 1.5,
              py: 1.1,
              mb: 0.3,
              borderRadius: '8px',
              textAlign: 'left',
              justifyContent: 'flex-start',
              color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
              backgroundColor: isActive ? 'rgba(61,90,128,0.25)' : 'transparent',
              transition: 'all 0.15s ease',
              position: 'relative',
              overflow: 'hidden',
              '&:hover': {
                backgroundColor: isActive
                  ? 'rgba(61,90,128,0.3)'
                  : 'rgba(255,255,255,0.06)',
                color: '#FFFFFF',
              },
              '&::before': isActive
                ? {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: '20%',
                    bottom: '20%',
                    width: 3,
                    borderRadius: '0 3px 3px 0',
                    backgroundColor: palette.coral,
                  }
                : {},
            }}
          >
            <Icon
              sx={{
                fontSize: '1.15rem',
                opacity: isActive ? 1 : 0.7,
              }}
            />
            <Typography
              sx={{
                fontSize: '0.825rem',
                fontWeight: isActive ? 600 : 400,
                letterSpacing: '0.01em',
              }}
            >
              {label}
            </Typography>
          </ButtonBase>
        )
      })}
    </Box>
  )
}
