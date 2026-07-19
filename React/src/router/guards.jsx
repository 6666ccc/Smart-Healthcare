import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../store'
import { homePath } from '../utils/portal'
import { isPatientPortal } from '../features/experience/mode'

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
export function RequirePatient() {
  const { user } = useAuth()
  if (!isPatientPortal(user)) {
    return <UnsupportedPortal />
  }
  return <Outlet />
}

function UnsupportedPortal() {
  const { logout } = useAuth()
  return (
    <main className="portal-notice">
      <p className="portal-notice__eyebrow">WENRUN CARE</p>
      <h1>当前版本仅提供患者端服务</h1>
      <p>请使用患者账号登录，选择 AI 随身诊室或传统自助服务。</p>
      <button type="button" onClick={logout}>退出登录</button>
    </main>
  )
}
