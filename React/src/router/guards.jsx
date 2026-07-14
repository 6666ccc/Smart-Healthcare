import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../store'
import { homePath } from '../utils/portal'

/** 未登录 → /login */
export function RequireAuth() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Outlet />
}

/** 已登录 → 对应门户首页 */
export function GuestOnly() {
  const { isAuthenticated, user } = useAuth()
  if (isAuthenticated) {
    return <Navigate to={homePath(user?.portalType)} replace />
  }
  return <Outlet />
}

/** 限制特定门户访问 */
export function RequirePortal({ portal }) {
  const { user } = useAuth()
  const current = user?.portalType || 'patient'
  if (current !== portal) {
    return <Navigate to={homePath(current)} replace />
  }
  return <Outlet />
}
