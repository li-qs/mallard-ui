import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

export default function ProtectedRoute() {
  const token = useAuthStore((s) => s.token)
  const location = useLocation()

  if (!token) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }
  return <Outlet />
}
