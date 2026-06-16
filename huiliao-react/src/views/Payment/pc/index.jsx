import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../../store'
import { Skeleton } from '../../../components'
import {
  listCharges, listPendingCharges, payCharge, dispensePrescription
} from '../../../api/modules/payment'
import { listPendingDispensePrescriptions } from '../../../api/modules/consultation'
import { getPortalType } from '../../Home/role'
import { PcLayout } from '../../../layouts'
import { formatMoney } from '../../../utils'
import './index.css'

const PAY_STATUS_MAP = {
  0: { label: '待支付', cls: 'pay-status--pending' },
  1: { label: '已支付', cls: 'pay-status--paid' },
  2: { label: '已退款', cls: 'pay-status--refund' },
}

export default function PaymentPc() {
  const { user } = useAuth()
  const portal = getPortalType(user)

  const [charges, setCharges] = useState([])
  const [pendingPrescriptions, setPendingPrescriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pending')
  const [payModal, setPayModal] = useState(null) // { id, totalAmount }
  const [payForm, setPayForm] = useState({ payType: 1, paidAmount: '' })
  const [payError, setPayError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isAdmin = portal === 'admin'

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const chargeReq = tab === 'pending' ? listPendingCharges() : listCharges()
      const results = await Promise.allSettled([
        chargeReq,
        isAdmin ? listPendingDispensePrescriptions() : Promise.resolve([]),
      ])
      if (results[0].status === 'fulfilled') setCharges(Array.isArray(results[0].value) ? results[0].value : [])
      if (results[1].status === 'fulfilled') setPendingPrescriptions(Array.isArray(results[1].value) ? results[1].value : [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [tab, isAdmin])

  useEffect(() => { loadData() }, [loadData])

  const handlePay = async () => {
    setPayError('')
    const amount = Number(payForm.paidAmount)
    if (!amount || amount <= 0) { setPayError('请输入有效金额'); return }
    setSubmitting(true)
    try {
      await payCharge(payModal.id, { payType: payForm.payType, paidAmount: amount })
      setPayModal(null)
      setPayForm({ payType: 1, paidAmount: '' })
      loadData()
    } catch (err) {
      setPayError(err.message || '支付失败')
    } finally { setSubmitting(false) }
  }

  const handleDispense = async (prescriptionId) => {
    if (!window.confirm('确认发药？')) return
    try {
      await dispensePrescription(prescriptionId)
      loadData()
    } catch (err) {
      alert(err.message || '发药失败')
    }
  }

  const openPayModal = (charge) => {
    setPayModal({ id: charge.id, totalAmount: charge.totalAmount || charge.amount || 0 })
    setPayForm({ payType: 1, paidAmount: charge.totalAmount || charge.amount || '' })
    setPayError('')
  }

  return (
    <PcLayout portal={portal} searchPlaceholder="搜索收费单…">
      <div className="pay-pc-toolbar">
        <h1 className="pay-pc-title">收费管理</h1>
        <div className="pay-pc-tabs">
          <button className={`pay-pc-tab${tab === 'pending' ? ' pay-pc-tab--active' : ''}`} onClick={() => setTab('pending')}>待收费</button>
          <button className={`pay-pc-tab${tab === 'all' ? ' pay-pc-tab--active' : ''}`} onClick={() => setTab('all')}>全部</button>
          {isAdmin && (
            <button className={`pay-pc-tab${tab === 'dispense' ? ' pay-pc-tab--active' : ''}`} onClick={() => setTab('dispense')}>待发药</button>
          )}
        </div>
      </div>

      {/* 收费列表 */}
      {tab !== 'dispense' && (
        <>
          {loading && <Skeleton variant="card" count={4} />}
          {!loading && charges.length === 0 && <p className="pay-pc-empty">暂无收费记录</p>}
          <div className="pay-pc-list">
            {charges.map((c) => {
              const info = PAY_STATUS_MAP[c.payStatus ?? c.status] ?? { label: '未知', cls: '' }
              return (
                <div key={c.id} className="pay-pc-card">
                  <div className="pay-pc-card-body">
                    <strong>{c.patientName || `收费单 #${c.id}`}</strong>
                    <span>{c.visitId ? `就诊 #${c.visitId}` : ''} {c.createTime || ''}</span>
                    {c.items && <span className="pay-pc-items">{c.items}</span>}
                  </div>
                  <div className="pay-pc-card-right">
                    <strong>{formatMoney(c.totalAmount || c.amount)}</strong>
                    <span className={`pay-pc-status ${info.cls}`}>{info.label}</span>
                    {(c.payStatus === 0 || c.status === 0) && (
                      <button type="button" className="pay-pc-pay-btn" onClick={() => openPayModal(c)}>支付</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* 待发药列表 */}
      {tab === 'dispense' && (
        <>
          {loading && <Skeleton variant="card" count={4} />}
          {!loading && pendingPrescriptions.length === 0 && <p className="pay-pc-empty">暂无待发药处方</p>}
          <div className="pay-pc-list">
            {pendingPrescriptions.map((p) => (
              <div key={p.id} className="pay-pc-card">
                <div className="pay-pc-card-body">
                  <strong>{p.patientName || `处方 #${p.id}`}</strong>
                  <span>{p.drugNames || p.items || '—'}</span>
                </div>
                <div className="pay-pc-card-right">
                  <button type="button" className="pay-pc-dispense-btn" onClick={() => handleDispense(p.id)}>
                    确认发药
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 支付弹窗 */}
      {payModal && (
        <div className="pay-pc-modal-overlay" onClick={() => setPayModal(null)}>
          <div className="pay-pc-modal" onClick={(e) => e.stopPropagation()}>
            <h2>确认支付</h2>
            <p className="pay-pc-modal-amount">应收：{formatMoney(payModal.totalAmount)}</p>
            {payError && <p className="pay-pc-error">{payError}</p>}
            <label className="pay-pc-field">
              <span>支付方式</span>
              <select value={payForm.payType} onChange={(e) => setPayForm((f) => ({ ...f, payType: Number(e.target.value) }))}>
                <option value={1}>现金</option>
                <option value={2}>微信支付</option>
                <option value={3}>支付宝</option>
                <option value={4}>银行卡</option>
                <option value={5}>医保</option>
              </select>
            </label>
            <label className="pay-pc-field">
              <span>实收金额</span>
              <input type="number" step="0.01" min="0" value={payForm.paidAmount}
                onChange={(e) => setPayForm((f) => ({ ...f, paidAmount: e.target.value }))} />
            </label>
            <div className="pay-pc-modal-actions">
              <button type="button" className="pay-pc-btn-cancel" onClick={() => setPayModal(null)}>取消</button>
              <button type="button" className="pay-pc-btn-submit" disabled={submitting} onClick={handlePay}>
                {submitting ? '处理中…' : '确认支付'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PcLayout>
  )
}
