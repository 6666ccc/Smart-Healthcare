import request from '../request'

/** GET /api/drug-stocks — 库存列表，lowStockOnly=true 仅低库存 */
export function listDrugStocks(params) {
  return request.get('/api/drug-stocks', { params })
}
