import request from '../request'

/** GET /api/drugs — 药品列表 */
export function listDrugs(params) {
  return request.get('/api/drugs', { params })
}

/** GET /api/drugs/{id} — 药品详情 */
export function getDrug(id) {
  return request.get(`/api/drugs/${id}`)
}

/** POST /api/drugs — 新增药品 */
export function createDrug(data) {
  return request.post('/api/drugs', data)
}

/** PUT /api/drugs/{id} — 更新药品 */
export function updateDrug(id, data) {
  return request.put(`/api/drugs/${id}`, data)
}
