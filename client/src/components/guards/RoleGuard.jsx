import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../../context/useAuth.js'

export default function RoleGuard({ roles }) {
  const { user } = useAuth()

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/403" replace />
  }

  return <Outlet />
}
