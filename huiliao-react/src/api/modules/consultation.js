import request from '../request'

// —— 接诊 /api/visits ——

/** GET /api/visits — 接诊列表 */
export function listVisits(params) {
  return request.get('/api/visits', { params })
}

/** GET /api/visits/{id} — 接诊详情 */
export function getVisit(id) {
  return request.get(`/api/visits/${id}`)
}

/** POST /api/visits/start/{registrationId} — 开始接诊 */
export function startVisit(registrationId) {
  return request.post(`/api/visits/start/${registrationId}`)
}

/** PUT /api/visits/{id} — 录入/更新接诊信息 */
export function updateVisit(id, data) {
  return request.put(`/api/visits/${id}`, data)
}

// —— 检查申请 /api/exam-requests ——

/** GET /api/exam-requests — 按就诊单查询，visitId 必填 */
export function listExamRequests(params) {
  return request.get('/api/exam-requests', { params })
}

/** POST /api/exam-requests — 开立检查申请 { visitId, itemId } */
export function createExamRequest(data) {
  return request.post('/api/exam-requests', data)
}

// —— 处方 /api/prescriptions ——

/** GET /api/prescriptions — 按就诊单查询，visitId 必填 */
export function listPrescriptions(params) {
  return request.get('/api/prescriptions', { params })
}

/** GET /api/prescriptions/pending-dispense — 待发药处方列表 */
export function listPendingDispensePrescriptions() {
  return request.get('/api/prescriptions/pending-dispense')
}

/** GET /api/prescriptions/{id} — 处方详情 */
export function getPrescription(id) {
  return request.get(`/api/prescriptions/${id}`)
}

/** POST /api/prescriptions — 开处方 */
export function createPrescription(data) {
  return request.post('/api/prescriptions', data)
}

/** POST /api/prescriptions/{id}/cancel — 作废处方 */
export function cancelPrescription(id) {
  return request.post(`/api/prescriptions/${id}/cancel`)
}
