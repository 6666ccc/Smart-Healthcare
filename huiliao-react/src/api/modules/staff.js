import request from '../request'

/** GET /api/staff — 员工列表 */
export function listStaff(params) {
  return request.get('/api/staff', { params })
}

/** GET /api/staff/{id} — 员工详情 */
export function getStaff(id) {
  return request.get(`/api/staff/${id}`)
}

/** POST /api/staff — 新增员工 */
export function createStaff(data) {
  return request.post('/api/staff', data)
}

/** PUT /api/staff/{id} — 更新员工 */
export function updateStaff(id, data) {
  return request.put(`/api/staff/${id}`, data)
}
