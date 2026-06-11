import request from '../request'

/** GET /api/patients — 患者列表 */
export function listPatients(params) {
  return request.get('/api/patients', { params })
}

/** GET /api/patients/{id} — 患者详情 */
export function getPatient(id) {
  return request.get(`/api/patients/${id}`)
}

/** POST /api/patients — 患者建档 */
export function createPatient(data) {
  return request.post('/api/patients', data)
}

/** PUT /api/patients/{id} — 更新患者 */
export function updatePatient(id, data) {
  return request.put(`/api/patients/${id}`, data)
}
