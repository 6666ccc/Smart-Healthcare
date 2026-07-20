import { useState, useCallback, useMemo } from 'react'
import { AuthContext } from './authContext'
import { login as loginApi, register as registerApi, logout as logoutApi } from '../api/modules/user'
import { setTokenBundle, clearTokens, getToken } from '../api/request'

const USER_KEY = 'wenrun_user'
const LEGACY_USER_KEY = 'huiliao_user'

function loadUser() {
  try {
    const raw = localStorage.getItem(USER_KEY) || localStorage.getItem(LEGACY_USER_KEY)
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
    localStorage.removeItem(LEGACY_USER_KEY)
  }
}

function applyLoginData(data) {
  setTokenBundle({ accessToken: data.accessToken || data.token })
  const u = {
    userId: data.userId,
    username: data.username,
    realName: data.realName,
    roleCode: data.roleCode,
    roleName: data.roleName,
    portalType: data.portalType || 'patient',
    patientId: data.patientId,
    roles: data.roles,
  }
  saveUser(u)
  return u
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadUser)
  const [loading, setLoading] = useState(false)

  const token = getToken()
  const isAuthenticated = !!token

  const login = useCallback(async (username, password) => {
    setLoading(true)
    try {
      const data = await loginApi({ username, password })
      const u = applyLoginData(data)
      setUser(u)
      return { success: true, user: u }
    } catch (e) {
      return { success: false, error: e.message }
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (form) => {
    setLoading(true)
    try {
      const data = await registerApi(form)
      const u = applyLoginData(data)
      setUser(u)
      return { success: true, user: u }
    } catch (e) {
      return { success: false, error: e.message }
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try { await logoutApi() } catch { /* ignore */ }
    clearTokens()
    saveUser(null)
    setUser(null)
  }, [])

  const updateUser = useCallback((partial) => {
    setUser((prev) => {
      const next = { ...prev, ...partial }
      saveUser(next)
      return next
    })
  }, [])

  const value = useMemo(() => ({
    user, token, loading, isAuthenticated, login, register, logout, updateUser, applyLoginData,
  }), [user, token, loading, isAuthenticated, login, register, logout, updateUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
