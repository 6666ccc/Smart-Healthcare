import request from '../request'

/** GET /api/registrations — 挂号列表 */
export function listRegistrations(params) {
  return request.get('/api/registrations', { params })
}

/** GET /api/registrations/pending — 待诊挂号列表 */
export function listPendingRegistrations() {
  return request.get('/api/registrations/pending')
}

/** POST /api/registrations — 挂号 { patientId, scheduleId } */
export function createRegistration(data) {
  return request.post('/api/registrations', data)
}

/** POST /api/registrations/{id}/cancel — 取消挂号 */
export function cancelRegistration(id) {
  return request.post(`/api/registrations/${id}/cancel`)
}
