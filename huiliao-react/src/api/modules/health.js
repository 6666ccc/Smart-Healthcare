import request from '../request'

/** GET /api/health — 服务存活检查 */
export function checkHealth() {
  return request.get('/api/health', { skipAuth: true })
}
