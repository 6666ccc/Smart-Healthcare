import request from '../request'

/** GET /api/medical-items — 医疗项目列表 */
export function listMedicalItems(params) {
  return request.get('/api/medical-items', { params })
}

/** GET /api/medical-items/{id} — 医疗项目详情 */
export function getMedicalItem(id) {
  return request.get(`/api/medical-items/${id}`)
}

/** POST /api/medical-items — 新增医疗项目 */
export function createMedicalItem(data) {
  return request.post('/api/medical-items', data)
}

/** PUT /api/medical-items/{id} — 更新医疗项目 */
export function updateMedicalItem(id, data) {
  return request.put(`/api/medical-items/${id}`, data)
}
