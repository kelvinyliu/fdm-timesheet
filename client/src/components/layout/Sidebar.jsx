import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import { useNavigate, useLocation } from 'react-router'
import { useAuth } from '../../context/useAuth.js'

const NAV_LINKS = {
  CONSULTANT: [
    { label: 'Timesheets', path: '/consultant/timesheets' },
  ],
  LINE_MANAGER: [
    { label: 'Timesheets', path: '/manager/timesheets' },
  ],
  FINANCE_MANAGER: [
    { label: 'Timesheets', path: '/finance/timesheets' },
  ],
  SYSTEM_ADMIN: [
    { label: 'Users', path: '/admin/users' },
    { label: 'Assignments', path: '/admin/assignments' },
    { label: 'Audit Log', path: '/admin/audit' },
  ],
}

export default function Sidebar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const links = (user && NAV_LINKS[user.role]) || []

  return (
    <Box sx={{ width: 240, flexShrink: 0 }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          {user?.role?.replace('_', ' ')}
        </Typography>
      </Box>
      <Divider />
      <List>
        {links.map(({ label, path }) => (
          <ListItemButton
            key={path}
            selected={location.pathname.startsWith(path)}
            onClick={() => navigate(path)}
          >
            <ListItemText primary={label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  )
}
