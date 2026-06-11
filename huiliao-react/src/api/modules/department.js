import request from '../request'

/** GET /api/depts — 科室列表 */
export function listDepts(params) {
  return request.get('/api/depts', { params })
}

/** GET /api/depts/{id} — 科室详情 */
export function getDept(id) {
  return request.get(`/api/depts/${id}`)
}

/** POST /api/depts — 新增科室 */
export function createDept(data) {
  return request.post('/api/depts', data)
}

/** PUT /api/depts/{id} — 更新科室 */
export function updateDept(id, data) {
  return request.put(`/api/depts/${id}`, data)
}
