import { useState } from 'react'

/**
 * [HITL] Cursor 风格选择题：接受 / 拒绝 / 追加信息
 */
export default function HitlChoiceBar({ pendingActions = [], disabled, onDecide }) {
  const [mode, setMode] = useState(null) // null | 'append'
  const [appendText, setAppendText] = useState('')

  const action = pendingActions[0] || {}
  const title = action.title || '操作确认'
  const summary = action.summary || ''
  const details = Array.isArray(action.details) ? action.details : []

  const handleAppendSubmit = () => {
    const text = appendText.trim()
    if (!text || disabled) return
    onDecide('append', text)
    setMode(null)
    setAppendText('')
  }

  return (
    <div className="hitl-choice-bar">
      <div className="hitl-choice-bar__header">
        <span className="hitl-choice-bar__dot" />
        <span className="hitl-choice-bar__label">{title}</span>
      </div>

      {summary && (
        <p className="hitl-choice-bar__summary">{summary}</p>
      )}

      {details.length > 0 && (
        <dl className="hitl-choice-bar__details">
          {details.map((row) => (
            <div key={row.label} className="hitl-choice-bar__detail-row">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {mode === 'append' ? (
        <div className="hitl-append-form">
          <textarea
            className="input hitl-append-form__input"
            value={appendText}
            onChange={(e) => setAppendText(e.target.value)}
            placeholder="补充或修改要求，例如：改挂明天的号、换一位医生…"
            rows={2}
            disabled={disabled}
            autoFocus
          />
          <div className="hitl-append-form__actions">
            <button
              type="button"
              className="hitl-choice-btn hitl-choice-btn--append"
              onClick={handleAppendSubmit}
              disabled={disabled || !appendText.trim()}
            >
              提交补充
            </button>
            <button
              type="button"
              className="hitl-choice-btn hitl-choice-btn--ghost"
              onClick={() => { setMode(null); setAppendText('') }}
              disabled={disabled}
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <div className="hitl-choice-bar__actions">
          <button
            type="button"
            className="hitl-choice-btn hitl-choice-btn--accept"
            onClick={() => onDecide('accept')}
            disabled={disabled}
          >
            接受
          </button>
          <button
            type="button"
            className="hitl-choice-btn hitl-choice-btn--reject"
            onClick={() => onDecide('reject')}
            disabled={disabled}
          >
            拒绝
          </button>
          <button
            type="button"
            className="hitl-choice-btn hitl-choice-btn--append"
            onClick={() => setMode('append')}
            disabled={disabled}
          >
            追加信息
          </button>
        </div>
      )}
    </div>
  )
}
