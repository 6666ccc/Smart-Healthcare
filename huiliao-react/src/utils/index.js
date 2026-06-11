/**
 * 时间段问候语
 */
export function formatTime() {
  const h = new Date().getHours()
  if (h < 6) return '凌晨'
  if (h < 12) return '上午'
  if (h < 14) return '中午'
  if (h < 18) return '下午'
  return '晚上'
}

/**
 * 金额格式化 ¥xxx.xx
 */
export function formatMoney(v) {
  if (v == null) return '¥0.00'
  return `¥${Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * ISO 日期格式化 yyyy-MM-dd
 */
export function formatDate(v) {
  if (!v) return ''
  const d = new Date(v)
  if (isNaN(d.getTime())) return String(v)
  return d.toISOString().slice(0, 10)
}

/**
 * 日期时间格式化 yyyy-MM-dd HH:mm
 */
export function formatDateTime(v) {
  if (!v) return ''
  const d = new Date(v)
  if (isNaN(d.getTime())) return String(v)
  const iso = d.toISOString()
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`
}

/** 挂号状态映射 */
export const REG_STATUS_MAP = {
  0: { label: '已挂号', cls: 'pending' },
  1: { label: '已接诊', cls: 'active' },
  2: { label: '已完成', cls: 'done' },
  3: { label: '已取消', cls: 'cancelled' },
}

/** 接诊状态映射 */
export const VISIT_STATUS_MAP = {
  0: { label: '待接诊', cls: '' },
  1: { label: '接诊中', cls: 'active' },
  2: { label: '已完成', cls: 'done' },
}

/** 支付状态映射 */
export const PAY_STATUS_MAP = {
  0: { label: '待支付', cls: 'pending' },
  1: { label: '已支付', cls: 'paid' },
  2: { label: '已退款', cls: 'refund' },
}

/** 开诊状态映射 */
export const DEPT_STATUS_MAP = {
  0: { label: '停诊', cls: 'closed' },
  1: { label: '开诊', cls: 'open' },
}

/** 性别映射 */
export const GENDER_MAP = {
  0: '女',
  1: '男',
  2: '未知',
}

/** 支付方式映射 */
export const PAY_TYPE_MAP = {
  1: '现金',
  2: '微信支付',
  3: '支付宝',
  4: '银行卡',
  5: '医保',
}

/** 排班时段映射 */
export const PERIOD_MAP = {
  'am': '上午',
  'pm': '下午',
  'all': '全天',
}

/**
 * 通用状态标签
 */
export function getStatusLabel(item) {
  if (item == null) return '—'
  if (item.status != null) {
    const map = REG_STATUS_MAP[item.status]
    if (map) return map.label
    return `状态${item.status}`
  }
  return '待处理'
}

/**
 * 截断文本
 */
export function truncate(text, maxLen = 20) {
  if (!text) return ''
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '…'
}
