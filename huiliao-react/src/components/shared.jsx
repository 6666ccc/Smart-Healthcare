/**
 * 共享 UI 组件：加载中、空状态、确认弹窗、状态标签
 */

export function Loading({ text = '加载中…' }) {
  return <p className="shared-empty">{text}</p>
}

export function Empty({ text = '暂无数据' }) {
  return <p className="shared-empty">{text}</p>
}

/**
 * 确认弹窗：用 window.confirm 的声明式封装
 * 仅在 show=true 时展示按钮，实际确认仍用 confirm()
 */
export function ConfirmDialog({ show, title, message, onConfirm, onCancel, confirmText = '确认', cancelText = '取消', loading = false }) {
  if (!show) return null
  return (
    <div className="shared-overlay" onClick={onCancel}>
      <div className="shared-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {message && <p className="shared-modal-msg">{message}</p>}
        <div className="shared-modal-actions">
          <button type="button" className="shared-btn-cancel" disabled={loading} onClick={onCancel}>{cancelText}</button>
          <button type="button" className="shared-btn-submit" disabled={loading} onClick={onConfirm}>{loading ? '处理中…' : confirmText}</button>
        </div>
      </div>
    </div>
  )
}

/**
 * 状态标签 Badge
 */
export function StatusBadge({ status, map, fallback = '未知' }) {
  const info = map?.[status]
  const label = info?.label ?? fallback
  const cls = info?.cls ?? ''
  return <span className={`shared-status shared-status--${cls}`}>{label}</span>
}
