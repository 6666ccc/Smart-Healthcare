/**
 * 共享 UI 组件
 */
import { IconEmpty } from '../views/shared'

/* ---------- Loading ---------- */
export function Loading({ text = '加载中…' }) {
  return (
    <div className="shared-loading">
      <div className="shared-loading__spinner" />
      <span className="shared-loading__text">{text}</span>
    </div>
  )
}

/* ---------- Empty ---------- */
export function Empty({ text = '暂无数据', Icon = IconEmpty }) {
  return (
    <div className="shared-empty">
      <span className="shared-empty__icon">
        <Icon size={48} strokeWidth={1.25} />
      </span>
      <span className="shared-empty__text text-sub">{text}</span>
    </div>
  )
}

/* ---------- StatusBadge ---------- */
export function StatusBadge({ status, map, fallback = '未知' }) {
  const info = map?.[status]
  if (!info) return <span className="shared-status shared-status--cancelled">{fallback}</span>
  return <span className={`shared-status ${info.cls}`}>{info.label}</span>
}

/* ---------- ConfirmDialog ---------- */
export function ConfirmDialog({ show, title, message, onConfirm, onCancel, loading }) {
  if (!show) return null
  return (
    <div className="shared-dialog-overlay" onClick={onCancel}>
      <div className="shared-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{title || '确认操作'}</h3>
        <p>{message}</p>
        <div className="shared-dialog__actions">
          <button className="btn btn--ghost" onClick={onCancel} disabled={loading}>
            取消
          </button>
          <button className="btn btn--primary" onClick={onConfirm} disabled={loading}>
            {loading ? '处理中…' : '确认'}
          </button>
        </div>
      </div>
    </div>
  )
}
