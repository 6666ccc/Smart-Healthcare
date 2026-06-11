import request from '../request'

// —— 收费 /api/charges ——

/** GET /api/charges — 收费列表 */
export function listCharges(params) {
  return request.get('/api/charges', { params })
}

/** GET /api/charges/pending — 待收费列表 */
export function listPendingCharges() {
  return request.get('/api/charges/pending')
}

/** GET /api/charges/{id} — 收费详情 */
export function getCharge(id) {
  return request.get(`/api/charges/${id}`)
}

/** POST /api/charges/from-visit/{visitId} — 根据就诊单生成收费单 */
export function createChargeFromVisit(visitId) {
  return request.post(`/api/charges/from-visit/${visitId}`)
}

/** POST /api/charges/{id}/pay — 支付 { payType, paidAmount } */
export function payCharge(id, data) {
  return request.post(`/api/charges/${id}/pay`, data)
}

// —— 发药 /api/dispense ——

/** POST /api/dispense/{prescriptionId} — 按处方发药 */
export function dispensePrescription(prescriptionId) {
  return request.post(`/api/dispense/${prescriptionId}`)
}
