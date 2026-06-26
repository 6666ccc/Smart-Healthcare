/**
 * Axios 实例 + 拦截器
 */
import axios from 'axios'

const request = axios.create({
  baseURL: '',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

/* ---------- Token 存取 ---------- */
const ACCESS_TOKEN_KEY = 'wenrun_access_token'
const LEGACY_ACCESS_TOKEN_KEY = 'huiliao_access_token'

export function getToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
    || localStorage.getItem(LEGACY_ACCESS_TOKEN_KEY)
}

export function setTokenBundle({ accessToken }) {
  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY)
  } else {
    clearTokens()
  }
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY)
}

/* ---------- 请求拦截器 ---------- */
const SKIP_AUTH = ['/api/health', '/api/auth/login', '/api/auth/register']

request.interceptors.request.use((config) => {
  const skip = SKIP_AUTH.some((p) => config.url?.includes(p))
  if (skip) return config

  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
    config.headers['X-Token'] = token
  }
  return config
})

/* ---------- 响应拦截器 ---------- */
request.interceptors.response.use(
  (res) => {
    const body = res.data
    if (body && body.code === 200) return body.data
    return Promise.reject(new Error(body?.message || '请求失败'))
  },
  (err) => {
    if (err.response?.status === 401) {
      clearTokens()
      localStorage.removeItem('wenrun_user')
      localStorage.removeItem('huiliao_user')
      window.location.href = '/login'
      return Promise.reject(new Error('登录已过期，请重新登录'))
    }
    if (err.response) {
      const msg = err.response.data?.message || `服务器错误 (${err.response.status})`
      return Promise.reject(new Error(msg))
    }
    if (err.code === 'ECONNABORTED') return Promise.reject(new Error('请求超时'))
    return Promise.reject(new Error('网络异常，请检查网络连接'))
  },
)

export default request
