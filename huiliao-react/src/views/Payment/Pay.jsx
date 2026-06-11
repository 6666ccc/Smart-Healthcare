import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getCharge, payCharge } from '../../api/modules/payment'
import { PAY_STATUS_MAP, PAY_TYPE_MAP, formatMoney, formatDateTime } from '../../utils'

export default function PaymentPay() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [charge, setCharge] = useState(null)
  const [loading, setLoading] = useState(true)
  const [payForm, setPayForm] = useState({ payType: 1, paidAmount: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getCharge(id)
      setCharge(data)
      const amt = data?.totalAmount ?? data?.amount ?? 0
      setPayForm({ payType: 1, paidAmount: String(amt) })
    } catch { setCharge(null) }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  const handlePay = async () => {
    setError('')
    const amount = Number(payForm.paidAmount)
    if (!amount || amount <= 0) { setError('请输入有效金额'); return }
    setSubmitting(true)
    try {
      await payCharge(id, { payType: payForm.payType, paidAmount: amount })
      load()
    } catch (err) {
      setError(err.message || '支付失败')
    } finally { setSubmitting(false) }
  }

  if (loading) return <p className="shared-empty">加载中…</p>
  if (!charge) return <p className="shared-empty">收费单不存在</p>

  const statusInfo = PAY_STATUS_MAP[charge.payStatus ?? charge.status] ?? { label: '未知', cls: '' }
  const isPaid = (charge.payStatus ?? charge.status) === 1
  const totalAmount = charge.totalAmount ?? charge.amount ?? 0

  return (
    <div className="pay-detail">
      <button type="button" className="pay-detail-back" onClick={() => navigate(-1)}>← 返回</button>
      <h1>收费详情</h1>

      <div className="pay-detail-card">
        <div className="pay-detail-row">
          <span className="pay-detail-label">收费单号</span>
          <span>#{charge.id}</span>
        </div>
        <div className="pay-detail-row">
          <span className="pay-detail-label">患者</span>
          <span>{charge.patientName || `患者 #${charge.patientId}`}</span>
        </div>
        <div className="pay-detail-row">
          <span className="pay-detail-label">就诊编号</span>
          <span>{charge.visitId ? `#${charge.visitId}` : '—'}</span>
        </div>
        <div className="pay-detail-row">
          <span className="pay-detail-label">收费项目</span>
          <span>{charge.items || charge.itemNames || '—'}</span>
        </div>
        <div className="pay-detail-row">
          <span className="pay-detail-label">应收金额</span>
          <span className="pay-detail-amount">{formatMoney(totalAmount)}</span>
        </div>
        <div className="pay-detail-row">
          <span className="pay-detail-label">状态</span>
          <span className={`shared-status shared-status--${statusInfo.cls}`}>{statusInfo.label}</span>
        </div>
        <div className="pay-detail-row">
          <span className="pay-detail-label">创建时间</span>
          <span>{formatDateTime(charge.createTime)}</span>
        </div>
        {charge.payTime && (
          <div className="pay-detail-row">
            <span className="pay-detail-label">支付时间</span>
            <span>{formatDateTime(charge.payTime)}</span>
          </div>
        )}
      </div>

      {!isPaid && (
        <div className="pay-detail-form">
          <h2>确认支付</h2>
          {error && <p className="shared-error">{error}</p>}
          <label className="pay-detail-field">
            <span>支付方式</span>
            <select value={payForm.payType} onChange={(e) => setPayForm((f) => ({ ...f, payType: Number(e.target.value) }))}>
              {Object.entries(PAY_TYPE_MAP).map(([k, v]) => (
                <option key={k} value={Number(k)}>{v}</option>
              ))}
            </select>
          </label>
          <label className="pay-detail-field">
            <span>实收金额</span>
            <input type="number" step="0.01" min="0" value={payForm.paidAmount}
              onChange={(e) => setPayForm((f) => ({ ...f, paidAmount: e.target.value }))} />
          </label>
          <button type="button" className="shared-btn-submit" disabled={submitting} onClick={handlePay}>
            {submitting ? '处理中…' : `确认支付 ${formatMoney(Number(payForm.paidAmount) || 0)}`}
          </button>
        </div>
      )}
    </div>
  )
}
