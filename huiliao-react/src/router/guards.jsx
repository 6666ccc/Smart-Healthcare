import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../store'

/** 未登录时拦截，跳转到登录页 */
export function RequireAuth() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}

/** 已登录时访问登录页，自动跳转首页 */
export function GuestOnly() {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) {
    return <Navigate to="/home" replace />
  }
  return <Outlet />
}
