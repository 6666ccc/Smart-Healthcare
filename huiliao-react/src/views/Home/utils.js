export function formatTime() {
  const h = new Date().getHours()
  if (h < 6) return '凌晨'
  if (h < 12) return '上午'
  if (h < 14) return '中午'
  if (h < 18) return '下午'
  return '晚上'
}

export function formatMoney(v) {
  if (v == null) return '¥0.00'
  return `¥${Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function getStatusLabel(item) {
  if (item.status != null) {
    if (item.status === 0) return '待处理'
    if (item.status === 1) return '进行中'
    if (item.status === 2) return '已完成'
    return String(item.status)
  }
  return '待处理'
}
