import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../store'
import { useIsPc } from '../../hooks'
import { Loading, Empty, StatusBadge } from '../../components'
import { listCharges } from '../../api'
import { PAY_STATUS_MAP, formatDateTime, formatMoney } from '../../utils'
import PcLayout from '../Home/pc/PcLayout'
import MobileTabbar from '../Home/mobile/MobileTabbar'
import { PageHeader } from '../shared'
import '../shared/views.css'

function PaySummary({ pending, paid }) {
  const pendingTotal = pending.reduce((s, c) => s + Number(c.totalAmount || 0), 0)
  return (
    <div className="view-pay-summary">
      <div className="view-pay-summary__item view-pay-summary__item--accent">
        <div className="view-pay-summary__label">待缴费</div>
        <div className="view-pay-summary__value" style={{ color: 'var(--c-accent)' }}>{pending.length}</div>
      </div>
      <div className="view-pay-summary__item">
        <div className="view-pay-summary__label">待缴金额</div>
        <div className="view-pay-summary__value">{formatMoney(pendingTotal)}</div>
      </div>
      <div className="view-pay-summary__item">
        <div className="view-pay-summary__label">已缴费</div>
        <div className="view-pay-summary__value" style={{ color: 'var(--c-success)' }}>{paid.length}</div>
      </div>
    </div>
  )
}

/* ==================== 移动端 ==================== */
function PaymentMobile({ charges, loading, error }) {
  const pending = charges.filter(c => c.payStatus === 0)
  const paid = charges.filter(c => c.payStatus !== 0)

  return (
    <div className="page">
      <PageHeader title="门诊缴费" subtitle="查看待缴费项目和缴费记录" />

      {error && <div className="card mb-md" style={{ color: 'var(--c-danger)', textAlign: 'center' }}>{error}</div>}
      {loading ? <Loading /> : charges.length === 0 ? <Empty text="暂无缴费记录" icon="💰" /> : (
        <>
          <PaySummary pending={pending} paid={paid} />
          <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* 待缴费 */}
          {pending.length > 0 && (
            <div className="card card--accent-top">
              <h3 style={{ margin: '0 0 12px 0', color: 'var(--c-accent)' }}>待缴费 ({pending.length})</h3>
              {pending.map((c) => (
                <div key={c.id} style={{
                  padding: '12px 16px', background: 'var(--c-bg)',
                  borderRadius: 'var(--radius)', marginBottom: 8,
                }}>
                  <div className="flex-between mb-sm">
                    <div style={{ fontWeight: 500 }}>{c.orderNo}</div>
                    <div style={{ fontWeight: 600, color: 'var(--c-accent)', fontSize: '1.1rem' }}>
                      {formatMoney(c.totalAmount)}
                    </div>
                  </div>
                  <div className="text-sub text-sm">创建时间：{formatDateTime(c.createTime)}</div>
                  {c.details?.length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {c.details.map((d) => (
                        <span key={d.id} style={{
                          padding: '2px 8px', background: 'var(--c-card)',
                          borderRadius: '100px', fontSize: '0.75rem', color: 'var(--c-sub)',
                          border: '1px solid var(--c-border-light)',
                        }}>
                          {d.itemName} {formatMoney(d.amount)}
                        </span>
                      ))}
                    </div>
                  )}
                  <Link to={`/payment/${c.id}`} className="btn btn--primary btn--sm" style={{ marginTop: 10 }}>
                    去支付
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* 已缴费 */}
          {paid.length > 0 && (
            <div className="card">
              <h3 style={{ margin: '0 0 12px 0' }}>缴费记录 ({paid.length})</h3>
              {paid.map((c) => (
                <div key={c.id} style={{
                  padding: '12px 16px', background: 'var(--c-bg)',
                  borderRadius: 'var(--radius)', marginBottom: 8,
                }}>
                  <div className="flex-between mb-sm">
                    <div style={{ fontWeight: 500 }}>{c.orderNo}</div>
                    <StatusBadge status={c.payStatus} map={PAY_STATUS_MAP} />
                  </div>
                  <div className="text-sub text-sm">金额：{formatMoney(c.totalAmount)}</div>
                  <div className="text-sub text-sm">时间：{formatDateTime(c.payTime || c.createTime)}</div>
                </div>
              ))}
            </div>
          )}
          </div>
        </>
      )}

      <MobileTabbar />
    </div>
  )
}

/* ==================== PC 端 ==================== */
function PaymentPc({ charges, loading, error }) {
  const pending = charges.filter(c => c.payStatus === 0)
  const paid = charges.filter(c => c.payStatus !== 0)

  return (
    <PcLayout>
      <PageHeader title="门诊缴费" subtitle="查看待缴费项目和缴费记录" />

      {error && <div className="card mb-md" style={{ color: 'var(--c-danger)', textAlign: 'center' }}>{error}</div>}
      {loading ? <Loading /> : charges.length === 0 ? <Empty text="暂无缴费记录" icon="💰" /> : (
        <>
          <PaySummary pending={pending} paid={paid} />
          <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {pending.length > 0 && (
            <div>
              <h2 style={{ margin: '0 0 16px 0', color: 'var(--c-accent)' }}>待缴费 ({pending.length})</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                {pending.map((c) => (
                  <div key={c.id} className="card card--accent-top">
                    <div className="flex-between mb-sm">
                      <div style={{ fontWeight: 600 }}>{c.orderNo}</div>
                      <div style={{ fontWeight: 600, color: 'var(--c-accent)', fontSize: '1.1rem' }}>
                        {formatMoney(c.totalAmount)}
                      </div>
                    </div>
                    <div className="text-sub text-sm mb-sm">{formatDateTime(c.createTime)}</div>
                    {c.details?.length > 0 && (
                      <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {c.details.map((d) => (
                          <span key={d.id} style={{
                            padding: '2px 10px', background: 'var(--c-bg)',
                            borderRadius: '100px', fontSize: '0.75rem', color: 'var(--c-sub)',
                            border: '1px solid var(--c-border-light)',
                          }}>
                            {d.itemName} {formatMoney(d.amount)}
                          </span>
                        ))}
                      </div>
                    )}
                    <Link to={`/payment/${c.id}`} className="btn btn--primary">
                      去支付
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {paid.length > 0 && (
            <div>
              <h2 style={{ margin: '0 0 16px 0' }}>已缴费 ({paid.length})</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {paid.map((c) => (
                  <div key={c.id} className="card">
                    <div className="flex-between mb-sm">
                      <div style={{ fontWeight: 500 }}>{c.orderNo}</div>
                      <StatusBadge status={c.payStatus} map={PAY_STATUS_MAP} />
                    </div>
                    <div className="text-sub text-sm">金额：{formatMoney(c.totalAmount)}</div>
                    <div className="text-sub text-sm">时间：{formatDateTime(c.payTime || c.createTime)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
        </>
      )}
    </PcLayout>
  )
}

/* ==================== 入口 ==================== */
export default function Payment() {
  const isPc = useIsPc()
  const { user } = useAuth()
  const [charges, setCharges] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!user?.patientId) { setLoading(false); return }
    setLoading(true); setError('')
    try {
      const list = await listCharges({ patientId: user.patientId })
      setCharges(Array.isArray(list) ? list : [])
    } catch (e) { setError(e.message || '加载失败') }
    finally { setLoading(false) }
  }, [user?.patientId])

  useEffect(() => { load() }, [load])

  return isPc ? <PaymentPc charges={charges} loading={loading} error={error} />
    : <PaymentMobile charges={charges} loading={loading} error={error} />
}
