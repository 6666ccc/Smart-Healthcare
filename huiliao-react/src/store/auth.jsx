import { useCallback, useMemo, useState } from 'react'
import { login as loginApi, logout as logoutApi } from '../api/modules/user'
import { clearToken, getToken, setToken } from '../api/request'
import { AuthContext } from './authContext'

const USER_KEY = 'huiliao_user'

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * 全局登录态：供任意页面通过 useAuth() 读取用户信息与登录/退出方法
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser)
  const [token, setTokenState] = useState(getToken)
  const [loading, setLoading] = useState(false)

  const isAuthenticated = Boolean(token)

  const login = useCallback(async (username, password) => {
    setLoading(true)
    try {
      const data = await loginApi({ username, password })
      const nextToken = data?.token
      if (!nextToken) {
        throw new Error('登录响应缺少 token')
      }
      setToken(nextToken)
      setTokenState(nextToken)
      setUser(data)
      localStorage.setItem(USER_KEY, JSON.stringify(data))
      return data
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    setLoading(true)
    try {
      if (getToken()) {
        await logoutApi()
      }
    } catch {
      // 网络失败也清理本地态，避免卡死在已登录状态
    } finally {
      clearToken()
      localStorage.removeItem(USER_KEY)
      setTokenState(null)
      setUser(null)
      setLoading(false)
    }
  }, [])

  const value = useMemo(
    () => ({ user, token, isAuthenticated, loading, login, logout }),
    [user, token, isAuthenticated, loading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
