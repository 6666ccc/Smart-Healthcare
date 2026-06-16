import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../store'

/**
 * 认证守卫 —— 未登录重定向到 /login
 *
 * 包裹所有需登录才能访问的路由。
 * 注意：不做角色校验；不同门户（admin/doctor/patient）通过导航配置
 * 控制可见菜单项，而非路由级拦截。
 */
export function RequireAuth() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}

/**
 * 访客守卫 —— 已登录重定向到 /home
 *
 * 包裹登录页等仅未登录用户可访问的路由。
 */
export function GuestOnly() {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) {
    return <Navigate to="/home" replace />
  }
  return <Outlet />
}
