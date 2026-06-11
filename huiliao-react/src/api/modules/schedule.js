import request from '../request'

/** GET /api/schedules — 排班列表 */
export function listSchedules(params) {
  return request.get('/api/schedules', { params })
}

/** GET /api/schedules/{id} — 排班详情 */
export function getSchedule(id) {
  return request.get(`/api/schedules/${id}`)
}

/** POST /api/schedules — 新增排班 */
export function createSchedule(data) {
  return request.post('/api/schedules', data)
}

/** PUT /api/schedules/{id} — 更新排班 */
export function updateSchedule(id, data) {
  return request.put(`/api/schedules/${id}`, data)
}
