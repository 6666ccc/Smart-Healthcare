import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../store'
import { listCharges, listPendingCharges, payCharge, dispensePrescription } from '../../../api/modules/payment'
import { listPendingDispensePrescriptions } from '../../../api/modules/consultation'
import { getPortalType, PORTAL } from '../../Home/role'
import { formatMoney } from '../../Home/utils'
import MobileTabbar from '../../Home/MobileTabbar'
import './index.css'

export default function PaymentMobile() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const portal = getPortalType(user)
  const isAdmin = portal === PORTAL.ADMIN

  const [charges, setCharges] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pending')
  const [payModal, setPayModal] = useState(null)
  const [payForm, setPayForm] = useState({ payType: 1, paidAmount: '' })
  const [payError, setPayError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      if (tab === 'dispense') {
        const data = await listPendingDispensePrescriptions()
        setPrescriptions(Array.isArray(data) ? data : [])
      } else {
        const chargeReq = tab === 'pending' ? listPendingCharges() : listCharges()
        const [cr] = await Promise.allSettled([chargeReq])
        if (cr.status === 'fulfilled') setCharges(Array.isArray(cr.value) ? cr.value : [])
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [tab])

  useEffect(() => { loadData() }, [loadData])

  const handlePay = async () => {
    setPayError('')
    const amount = Number(payForm.paidAmount)
    if (!amount || amount <= 0) { setPayError('请输入有效金额'); return }
    setSubmitting(true)
    try {
      await payCharge(payModal.id, { payType: payForm.payType, paidAmount: amount })
      setPayModal(null)
      loadData()
    } catch (err) { setPayError(err.message || '支付失败') }
    finally { setSubmitting(false) }
  }

  const handleDispense = async (id) => {
    if (!window.confirm('确认发药？')) return
    try { await dispensePrescription(id); loadData() }
    catch (err) { alert(err.message || '发药失败') }
  }

  return (
    <div className="pay-page">
      <header className="pay-header"><h1>收费管理</h1></header>

      <div className="pay-tabs">
        <button className={`pay-tab${tab === 'pending' ? ' pay-tab--active' : ''}`} onClick={() => setTab('pending')}>待收费</button>
        <button className={`pay-tab${tab === 'all' ? ' pay-tab--active' : ''}`} onClick={() => setTab('all')}>全部</button>
        {isAdmin && (
          <button className={`pay-tab${tab === 'dispense' ? ' pay-tab--active' : ''}`} onClick={() => setTab('dispense')}>待发药</button>
        )}
      </div>

      <main className="pay-main">
        {loading && <p className="pay-empty">加载中…</p>}

        {tab !== 'dispense' && !loading && charges.length === 0 && <p className="pay-empty">暂无收费记录</p>}
        {tab !== 'dispense' && charges.map((c) => {
          const paid = (c.payStatus ?? c.status) === 1
          return (
            <div key={c.id} className="pay-card">
              <div className="pay-card-body">
                <strong>{c.patientName || `收费单 #${c.id}`}</strong>
                <span>{c.visitId ? `就诊 #${c.visitId}` : ''} {c.createTime || ''}</span>
              </div>
              <div className="pay-card-right">
                <strong>{formatMoney(c.totalAmount || c.amount)}</strong>
                <span className={`pay-status${paid ? ' pay-status--paid' : ' pay-status--pending'}`}>
                  {paid ? '已支付' : '待支付'}
                </span>
                {!paid && (
                  <button type="button" className="pay-pay-btn"
                    onClick={() => { setPayModal({ id: c.id, totalAmount: c.totalAmount || c.amount || 0 }); setPayForm({ payType: 1, paidAmount: c.totalAmount || c.amount || '' }); setPayError('') }}>
                    支付
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {tab === 'dispense' && !loading && prescriptions.length === 0 && <p className="pay-empty">暂无待发药处方</p>}
        {tab === 'dispense' && prescriptions.map((p) => (
          <div key={p.id} className="pay-card">
            <div className="pay-card-body">
              <strong>{p.patientName || `处方 #${p.id}`}</strong>
              <span>{p.drugNames || p.items || '—'}</span>
            </div>
            <button type="button" className="pay-dispense-btn" onClick={() => handleDispense(p.id)}>发药</button>
          </div>
        ))}
      </main>

      {payModal && (
        <div className="pay-overlay" onClick={() => setPayModal(null)}>
          <div className="pay-sheet" onClick={(e) => e.stopPropagation()}>
            <h2>确认支付</h2>
            <p className="pay-amount">{formatMoney(payModal.totalAmount)}</p>
            {payError && <p className="pay-error">{payError}</p>}
            <label className="pay-field">
              <span>支付方式</span>
              <select value={payForm.payType} onChange={(e) => setPayForm((f) => ({ ...f, payType: Number(e.target.value) }))}>
                <option value={1}>现金</option>
                <option value={2}>微信支付</option>
                <option value={3}>支付宝</option>
                <option value={4}>银行卡</option>
                <option value={5}>医保</option>
              </select>
            </label>
            <label className="pay-field">
              <span>实收金额</span>
              <input type="number" step="0.01" value={payForm.paidAmount}
                onChange={(e) => setPayForm((f) => ({ ...f, paidAmount: e.target.value }))} />
            </label>
            <button type="button" className="pay-submit-btn" disabled={submitting} onClick={handlePay}>
              {submitting ? '处理中…' : '确认支付'}
            </button>
          </div>
        </div>
      )}

      <MobileTabbar portal={portal} />
    </div>
  )
}
