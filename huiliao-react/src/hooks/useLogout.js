import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store'

/**
 * 退出登录：调用后端失效 token，清理本地态并跳转登录页
 */
export function useLogout() {
  const navigate = useNavigate()
  const { logout, loading } = useAuth()

  const handleLogout = useCallback(async () => {
    await logout()
    navigate('/login', { replace: true })
  }, [logout, navigate])

  return { logout: handleLogout, loggingOut: loading }
}
