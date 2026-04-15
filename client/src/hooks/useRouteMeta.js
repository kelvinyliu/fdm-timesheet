import { useLocation } from 'react-router'
import { getRouteMeta } from '../routes/routeMeta.js'

export default function useRouteMeta() {
  const location = useLocation()
  return getRouteMeta(location.pathname)
}
