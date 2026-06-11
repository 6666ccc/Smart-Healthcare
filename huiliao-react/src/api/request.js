import axios from 'axios'

export const TOKEN_KEY = 'huiliao_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

const NO_AUTH_PATHS = ['/api/health', '/api/auth/login']

request.interceptors.request.use((config) => {
  const skipAuth =
    config.skipAuth || NO_AUTH_PATHS.some((path) => config.url?.startsWith(path))

  if (!skipAuth) {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      config.headers['X-Token'] = token
    }
  }

  return config
})

request.interceptors.response.use(
  (response) => {
    const body = response.data

    if (body && typeof body.code === 'number') {
      if (body.code === 200) {
        return body.data
      }
      return Promise.reject(new Error(body.message || '请求失败'))
    }

    return body
  },
  (error) => {
    const message =
      error.response?.data?.message || error.message || '网络异常，请稍后重试'
    return Promise.reject(new Error(message))
  },
)

export default request
