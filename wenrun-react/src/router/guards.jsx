import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../store'
import { homePath } from '../utils/portal'

/** 未登录 → /login */
export function RequireAuth() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Outlet />
}

/** 已登录 → 患者首页 */
export function GuestOnly() {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) {
    return <Navigate to={homePath()} replace />
  }
  return <Outlet />
}
