import request from '../request'

/** POST /api/auth/login — 登录 */
export function login(data) {
  return request.post('/api/auth/login', data, { skipAuth: true })
}

/** POST /api/auth/logout — 退出 */
export function logout() {
  return request.post('/api/auth/logout')
}
