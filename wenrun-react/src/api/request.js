/**
 * Axios 实例 + 拦截器
 * 基址通过 Vite proxy → localhost:8080
 */
import axios from 'axios'
import { fetchTokenByRefresh } from './modules/oauth'

const request = axios.create({
  baseURL: '',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

/* ---------- Token 存取 ---------- */
const TOKEN_KEY = 'huiliao_token'
const ACCESS_TOKEN_KEY = 'huiliao_access_token'
const REFRESH_TOKEN_KEY = 'huiliao_refresh_token'
const EXPIRES_AT_KEY = 'huiliao_token_expires_at'

export function getToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(TOKEN_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function getTokenExpiresAt() {
  const raw = localStorage.getItem(EXPIRES_AT_KEY)
  return raw ? Number(raw) : 0
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(ACCESS_TOKEN_KEY, token)
  } else {
    clearTokens()
  }
}

export function setTokenBundle({ accessToken, refreshToken, expiresIn }) {
  const token = accessToken || null
  if (!token) {
    clearTokens()
    return
  }
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(ACCESS_TOKEN_KEY, token)
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  }
  if (expiresIn) {
    localStorage.setItem(EXPIRES_AT_KEY, String(Date.now() + expiresIn * 1000))
  }
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(EXPIRES_AT_KEY)
}

/* ---------- Refresh 锁 ---------- */
let refreshPromise = null

async function ensureFreshToken() {
  const token = getToken()
  const refreshToken = getRefreshToken()
  const expiresAt = getTokenExpiresAt()

  if (!token || !refreshToken || !expiresAt) {
    return token
  }

  if (expiresAt - Date.now() > 60_000) {
    return token
  }

  if (!refreshPromise) {
    refreshPromise = fetchTokenByRefresh(refreshToken)
      .then((data) => {
        setTokenBundle({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresIn: data.expires_in,
        })
        return data.access_token
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

function attachAuthHeaders(config, token) {
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
    config.headers['X-Token'] = token
  }
  const refreshToken = getRefreshToken()
  if (refreshToken) {
    config.headers['X-Refresh-Token'] = refreshToken
  }
}

/* ---------- 请求拦截器 ---------- */
const SKIP_AUTH = ['/api/health', '/api/auth/login', '/api/auth/register', '/oauth2/token']

request.interceptors.request.use(async (config) => {
  const skip = SKIP_AUTH.some((p) => config.url?.includes(p))
  if (skip) {
    return config
  }

  try {
    const token = await ensureFreshToken()
    attachAuthHeaders(config, token)
  } catch {
    attachAuthHeaders(config, getToken())
  }
  return config
})

/* ---------- 响应拦截器 ---------- */
request.interceptors.response.use(
  (res) => {
    const body = res.data
    if (body && body.code === 200) {
      return body.data
    }
    return Promise.reject(new Error(body?.message || '请求失败'))
  },
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && original && !original._retried) {
      const refreshToken = getRefreshToken()
      if (refreshToken) {
        original._retried = true
        try {
          const data = await fetchTokenByRefresh(refreshToken)
          setTokenBundle({
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresIn: data.expires_in,
          })
          attachAuthHeaders(original, data.access_token)
          return request(original)
        } catch {
          // fall through to logout redirect
        }
      }
      clearTokens()
      localStorage.removeItem('huiliao_user')
      window.location.href = '/login'
      return Promise.reject(new Error('登录已过期，请重新登录'))
    }

    if (err.response) {
      const { status, data } = err.response
      const msg = data?.message || `服务器错误 (${status})`
      return Promise.reject(new Error(msg))
    }
    if (err.code === 'ECONNABORTED') {
      return Promise.reject(new Error('请求超时'))
    }
    return Promise.reject(new Error('网络异常，请检查网络连接'))
  },
)

export default request
