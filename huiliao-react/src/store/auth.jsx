import { useState, useCallback, useMemo } from 'react'
import { AuthContext } from './authContext'
import { login as loginApi, logout as logoutApi } from '../api/modules/user'
import { setToken } from '../api/request'

const USER_KEY = 'huiliao_user'

function loadUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveUser(user) {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(USER_KEY)
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadUser)
  const [loading, setLoading] = useState(false)

  const token = localStorage.getItem('huiliao_token')
  const isAuthenticated = !!token

  const login = useCallback(async (username, password) => {
    setLoading(true)
    try {
      const data = await loginApi({ username, password })
      setToken(data.token)
      const u = {
        userId: data.userId,
        username: data.username,
        realName: data.realName,
        roleCode: data.roleCode,
        roleName: data.roleName,
        portalType: data.portalType,
        patientId: data.patientId,
        staffId: data.staffId,
        roles: data.roles,
      }
      saveUser(u)
      setUser(u)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try { await logoutApi() } catch { /* 即使后端调用失败也清理本地态 */ }
    setToken(null)
    saveUser(null)
    setUser(null)
  }, [])

  const updateUser = useCallback((partial) => {
    const next = { ...user, ...partial }
    saveUser(next)
    setUser(next)
  }, [user])

  const value = useMemo(() => ({
    user,
    token,
    loading,
    isAuthenticated,
    login,
    logout,
    updateUser,
  }), [user, token, loading, isAuthenticated, login, logout, updateUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
