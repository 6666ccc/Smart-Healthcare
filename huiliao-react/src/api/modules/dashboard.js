import request from '../request'

/** GET /api/dashboard — 今日统计摘要 */
export function getDashboard() {
  return request.get('/api/dashboard')
}
