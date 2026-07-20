import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loading, StatusBadge } from '../../components'
import { getCharge, payCharge } from '../../api'
import { PAY_STATUS_MAP, PAY_TYPE_MAP, formatDateTime, formatMoney } from '../../utils'
import { useIsPc } from '../../hooks'
import PcLayout from '../Home/pc/PcLayout'
import MobileTabbar from '../Home/mobile/MobileTabbar'
import { PageBack } from '../shared'
import '../shared/views.css'

export default function PaymentPay() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isPc = useIsPc()

  const [charge, setCharge] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paying, setPaying] = useState(false)
  const [payType, setPayType] = useState(2) // 默认微信
  const [msg, setMsg] = useState('')

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const data = await getCharge(Number(id))
        setCharge(data)
      } catch (e) { setError(e.message || '加载失败') }
      finally { setLoading(false) }
    })()
  }, [id])

  const handlePay = async () => {
    setPaying(true); setMsg('')
    try {
      await payCharge(Number(id), { payType, paidAmount: charge.totalAmount })
      setMsg('支付成功！')
      // 刷新数据
      const data = await getCharge(Number(id))
      setCharge(data)
    } catch (e) {
      setMsg(e.message || '支付失败')
    } finally {
      setPaying(false)
    }
  }

  const content = (
    <div className="page">
      <PageBack onClick={() => navigate('/payment')} label="返回缴费列表" />

      {error && <div className="card" style={{ color: 'var(--c-danger)', textAlign: 'center' }}>{error}</div>}
      {loading ? <Loading /> : !charge ? <div className="card" style={{ textAlign: 'center', color: 'var(--c-sub)' }}>收费单不存在</div> : (
        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640 }}>
          {/* 收费信息 */}
          <div className="card">
            <div className="flex-between mb-md">
              <h2 style={{ margin: 0 }}>收费详情</h2>
              <StatusBadge status={charge.payStatus} map={PAY_STATUS_MAP} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
              <div>
                <div className="text-muted text-sm">订单编号</div>
                <div style={{ fontWeight: 500 }}>{charge.orderNo}</div>
              </div>
              <div>
                <div className="text-muted text-sm">患者</div>
                <div style={{ fontWeight: 500 }}>{charge.patientName}</div>
              </div>
              <div>
                <div className="text-muted text-sm">创建时间</div>
                <div style={{ fontWeight: 500 }}>{formatDateTime(charge.createTime)}</div>
              </div>
              <div>
                <div className="text-muted text-sm">支付时间</div>
                <div style={{ fontWeight: 500 }}>{charge.payTime ? formatDateTime(charge.payTime) : '—'}</div>
              </div>
              <div>
                <div className="text-muted text-sm">总金额</div>
                <div style={{ fontWeight: 600, fontSize: '1.3rem', color: 'var(--c-accent)' }}>
                  {formatMoney(charge.totalAmount)}
                </div>
              </div>
              <div>
                <div className="text-muted text-sm">支付方式</div>
                <div style={{ fontWeight: 500 }}>{PAY_TYPE_MAP[charge.payType] || '—'}</div>
              </div>
            </div>
          </div>

          {/* 明细 */}
          <div className="card">
            <h3 style={{ margin: '0 0 12px 0' }}>费用明细</h3>
            {charge.details?.length > 0 ? (
              <div className="view-table-wrap">
                <table className="view-table">
                  <thead>
                    <tr><th>项目</th><th>金额</th></tr>
                  </thead>
                  <tbody>
                    {charge.details.map((d) => (
                      <tr key={d.id}>
                        <td>{d.itemName}</td>
                        <td>{formatMoney(d.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted text-sm" style={{ textAlign: 'center', padding: 16 }}>暂无明细</p>
            )}
            <div className="flex-between mt-md" style={{ padding: '12px 0', borderTop: '2px solid var(--c-border)' }}>
              <div style={{ fontWeight: 600 }}>合计</div>
              <div style={{ fontWeight: 600, fontSize: '1.2rem', color: 'var(--c-accent)' }}>
                {formatMoney(charge.totalAmount)}
              </div>
            </div>
          </div>

          {/* 支付表单 (仅待支付时显示) */}
          {charge.payStatus === 0 && (
            <div className="card card--accent-top">
              <h3 style={{ margin: '0 0 16px 0' }}>选择支付方式</h3>
              <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                {Object.entries(PAY_TYPE_MAP).map(([k, v]) => (
                  <button key={k}
                    type="button"
                    className={`view-pay-method${Number(k) === payType ? ' view-pay-method--active' : ''}`}
                    onClick={() => setPayType(Number(k))}
                  >
                    {v}
                  </button>
                ))}
              </div>
              {msg && (
                <div style={{
                  padding: '8px 14px', borderRadius: 'var(--radius)',
                  background: msg.includes('成功') ? 'var(--c-success-bg)' : 'var(--c-danger-bg)',
                  color: msg.includes('成功') ? 'var(--c-success)' : 'var(--c-danger)',
                  marginBottom: 16, fontSize: '0.9rem',
                }}>
                  {msg}
                </div>
              )}
              <button
                className="btn btn--accent btn--lg"
                onClick={handlePay}
                disabled={paying || msg.includes('成功')}
                style={{ width: '100%' }}
              >
                {paying ? '支付中…' : `确认支付 ${formatMoney(charge.totalAmount)}`}
              </button>
            </div>
          )}
        </div>
      )}

      {!isPc && <MobileTabbar />}
    </div>
  )

  if (isPc) return <PcLayout>{content}</PcLayout>
  return content
}
