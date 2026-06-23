import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../store'
import { useIsPc } from '../../hooks'
import { formatTime, formatDate, formatTimePeriod, formatVisitSchedule } from '../../utils'
import { listSchedules, listRegistrations, listCharges } from '../../api'
import PcLayout from './pc/PcLayout'
import MobileTabbar from './mobile/MobileTabbar'
import {
  IconCalendar, IconHospital, IconWallet, IconRecord, IconAI, IconUser, IconHourglass,
} from '../shared'
import '../shared/views.css'

const QUICK_ACTIONS = [
  { icon: IconCalendar, label: '预约挂号', to: '/registration', color: '#3d5a5c' },
  { icon: IconHospital, label: '科室浏览', to: '/department', color: '#3d5a5c' },
  { icon: IconWallet, label: '门诊缴费', to: '/payment', color: '#c8944a' },
  { icon: IconRecord, label: '我的病历', to: '/user', color: '#7a9e85' },
  { icon: IconAI, label: 'AI 助手', to: '/assistant', color: '#5a8590' },
  { icon: IconUser, label: '个人中心', to: '/user', color: '#8c8278' },
]

function QuickAction({ icon: Icon, label, to, color, index }) {
  return (
    <Link
      to={to}
      className="view-quick-item"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="view-quick-item__icon" style={{ background: `${color}12`, color }}>
        <Icon size={22} color={color} />
      </div>
      <span className="view-quick-item__label">{label}</span>
    </Link>
  )
}

function StatCard({ icon: Icon, label, value, color, index }) {
  return (
    <div className="card view-stat-card" style={{ color, animationDelay: `${index * 80}ms` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 'var(--radius)',
          background: `${color}14`, display: 'flex', alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Icon size={22} color={color} />
        </div>
        <div>
          <div style={{ fontSize: '0.78rem', color: 'var(--c-sub)', letterSpacing: '0.02em' }}>{label}</div>
          <div className="view-stat-card__value" style={{ color: 'var(--c-text)' }}>
            {value ?? '—'}
          </div>
        </div>
      </div>
    </div>
  )
}

function HeroBanner({ greeting, name, today }) {
  return (
    <div className="view-hero">
      <h2 className="view-hero__greeting">{greeting}，{name}</h2>
      <p className="view-hero__date">{today}</p>
      <div className="view-hero__tag">
        <span className="view-hero__tag-dot" />
        温润诊所 · 祝您安康
      </div>
    </div>
  )
}

/* ==================== 患者移动端首页 ==================== */
function PatientHomeMobile({ data, loading, error }) {
  const { user } = useAuth()
  const greeting = formatTime()
  const today = formatDate(new Date())
  const name = user?.realName || user?.username || '患者'

  return (
    <div className="page">
      <HeroBanner greeting={greeting} name={name} today={today} />

      <div className="view-quick-grid">
        {QUICK_ACTIONS.map((a, i) => (
          <QuickAction key={a.to + a.label} {...a} index={i} />
        ))}
      </div>

      {error && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--c-danger)', marginBottom: 16 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div className="shared-loading"><div className="shared-loading__spinner" /><span>加载中…</span></div>
      ) : (
        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div className="flex-between mb-sm">
              <h4 style={{ margin: 0 }}>我的挂号</h4>
              <Link to="/registration" className="text-sm" style={{ color: 'var(--c-accent)' }}>
                查看全部 →
              </Link>
            </div>
            {data?.registrations?.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.registrations.slice(0, 3).map((r) => (
                  <div key={r.id} className="view-list-row">
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{r.deptName}</div>
                      <div className="text-sub text-sm">{r.staffName} · {formatVisitSchedule(r.workDate, r.timePeriod)}</div>
                    </div>
                    <span className={`shared-status ${r.status === 1 ? 'shared-status--pending' : r.status === 2 ? 'shared-status--active' : 'shared-status--cancelled'}`}>
                      {r.status === 1 ? '已挂号' : r.status === 2 ? '已就诊' : '已退号'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-sm" style={{ textAlign: 'center', padding: 16 }}>暂无挂号记录</p>
            )}
          </div>

          <div className="card">
            <div className="flex-between mb-sm">
              <h4 style={{ margin: 0 }}>待缴费</h4>
              <Link to="/payment" className="text-sm" style={{ color: 'var(--c-accent)' }}>
                查看全部 →
              </Link>
            </div>
            {data?.pendingCharges?.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.pendingCharges.slice(0, 3).map((c) => (
                  <div key={c.id} className="view-list-row">
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{c.orderNo}</div>
                      <div className="text-sub text-sm">{formatDate(c.createTime)}</div>
                    </div>
                    <span style={{ fontWeight: 600, color: 'var(--c-accent)' }}>
                      ¥{Number(c.totalAmount).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-sm" style={{ textAlign: 'center', padding: 16 }}>暂无待缴费项目</p>
            )}
          </div>

          {data?.schedules?.length > 0 && (
            <div className="card">
              <h4 style={{ margin: '0 0 8px 0' }}>今日可挂号</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.schedules.slice(0, 3).map((s) => (
                  <div key={s.id} className="view-list-row" style={{ padding: '8px 14px' }}>
                    <span style={{ fontSize: '0.9rem' }}>{s.deptName} · {s.staffName}</span>
                    <span className="text-sm text-sub">{formatTimePeriod(s.timePeriod)} · 余号 {s.remainingCount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <MobileTabbar />
    </div>
  )
}

/* ==================== 患者 PC 端首页 ==================== */
function PatientHomePc({ data, loading, error }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const greeting = formatTime()
  const today = formatDate(new Date())
  const name = user?.realName || user?.username || '患者'

  return (
    <PcLayout>
      <div style={{ marginBottom: 28, animation: 'fadeUp var(--dur-slow) var(--ease-enter) both' }}>
        <h1 style={{ marginBottom: 4 }}>{greeting}，{name}</h1>
        <p className="text-sub">{today} · 温润诊所祝您安康</p>
      </div>

      {!loading && !error && (
        <div className="stagger" style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          <StatCard icon={IconCalendar} label="我的挂号" value={data?.registrations?.length ?? 0} color="#3d5a5c" index={0} />
          <StatCard icon={IconHourglass} label="待缴费" value={data?.pendingCharges?.length ?? 0} color="#c8944a" index={1} />
          <StatCard icon={IconHospital} label="今日可挂号科室" value={data?.schedules?.length ?? 0} color="#7a9e85" index={2} />
          <StatCard icon={IconRecord} label="就诊记录" value={data?.visits?.length ?? 0} color="#5a8590" index={3} />
        </div>
      )}

      {error && <div className="card" style={{ color: 'var(--c-danger)', marginBottom: 16 }}>{error}</div>}
      {loading && (
        <div className="shared-loading"><div className="shared-loading__spinner" /><span>加载中…</span></div>
      )}

      {!loading && (
        <div className="stagger" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card">
            <div className="flex-between mb-md">
              <h3 style={{ margin: 0 }}>我的挂号</h3>
              <button className="btn btn--accent btn--sm" onClick={() => navigate('/registration')}>
                预约挂号
              </button>
            </div>
            {data?.registrations?.length ? (
              <div className="view-table-wrap">
                <table className="view-table">
                  <thead>
                    <tr>
                      <th>科室</th><th>医生</th><th>就诊时间</th><th>状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.registrations.slice(0, 5).map((r) => (
                      <tr key={r.id}>
                        <td>{r.deptName}</td>
                        <td>{r.staffName}</td>
                        <td style={{ color: 'var(--c-sub)', fontSize: '0.85rem' }}>{formatVisitSchedule(r.workDate, r.timePeriod)}</td>
                        <td>
                          <span className={`shared-status ${r.status === 1 ? 'shared-status--pending' : r.status === 2 ? 'shared-status--active' : 'shared-status--cancelled'}`}>
                            {r.status === 1 ? '已挂号' : r.status === 2 ? '已就诊' : '已退号'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted text-sm" style={{ textAlign: 'center', padding: 24 }}>暂无挂号记录</p>
            )}
          </div>

          <div className="card">
            <div className="flex-between mb-md">
              <h3 style={{ margin: 0 }}>待缴费</h3>
              <button className="btn btn--outline btn--sm" onClick={() => navigate('/payment')}>全部 →</button>
            </div>
            {data?.pendingCharges?.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.pendingCharges.slice(0, 5).map((c) => (
                  <div key={c.id} className="view-list-row">
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{c.orderNo}</div>
                      <div className="text-sub text-sm">{formatDate(c.createTime)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, color: 'var(--c-accent)' }}>
                        ¥{Number(c.totalAmount).toFixed(2)}
                      </div>
                      <button className="btn btn--primary btn--sm" style={{ marginTop: 4 }}
                        onClick={() => navigate(`/payment/${c.id}`)}>
                        去支付
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-sm" style={{ textAlign: 'center', padding: 24 }}>暂无待缴费项目</p>
            )}
          </div>
        </div>
      )}

      {!loading && data?.schedules?.length > 0 && (
        <div className="card mt-lg" style={{ animation: 'fadeUp var(--dur-slow) var(--ease-enter) both', animationDelay: '400ms' }}>
          <h3 style={{ margin: '0 0 12px 0' }}>今日可挂号</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {data.schedules.map((s) => (
              <div key={s.id} style={{
                padding: '14px 20px', background: 'var(--c-bg)',
                borderRadius: 'var(--radius)', minWidth: 200,
                border: '1px solid var(--c-border-light)',
                transition: 'all var(--dur-fast) var(--ease-soft)',
              }}>
                <div style={{ fontWeight: 500, fontFamily: 'var(--font-serif)' }}>{s.deptName}</div>
                <div className="text-sub text-sm">{s.staffName} · {formatTimePeriod(s.timePeriod)}</div>
                <div className="text-sm" style={{ color: 'var(--c-accent)', marginTop: 6, fontWeight: 500 }}>
                  余号 {s.remainingCount} · ¥{s.registerFee}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PcLayout>
  )
}

/* ==================== 入口 ==================== */
export default function Home() {
  const isPc = useIsPc()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    if (!user?.userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const registrationsPromise = listRegistrations({ userId: user.userId }).catch(() => [])
      const chargesPromise = listCharges({ patientId: user.patientId }).catch(() => [])
      const schedulesPromise = listSchedules({ workDate: new Date().toISOString().split('T')[0] }).catch(() => [])

      const [registrations, allCharges, schedules] = await Promise.all([
        registrationsPromise, chargesPromise, schedulesPromise,
      ])

      const pendingCharges = Array.isArray(allCharges) ? allCharges.filter((c) => c.payStatus === 0) : []

      let visits = []
      if (user.patientId) {
        try {
          const { listVisits } = await import('../../api/modules/consultation')
          visits = await listVisits({}) || []
        } catch { /* ignore */ }
      }

      setData({
        registrations: Array.isArray(registrations) ? registrations : [],
        pendingCharges,
        schedules: Array.isArray(schedules) ? schedules : [],
        visits: Array.isArray(visits) ? visits : [],
      })
    } catch (e) {
      setError(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [user?.patientId])

  useEffect(() => { loadData() }, [loadData])

  if (isPc) return <PatientHomePc data={data} loading={loading} error={error} />
  return <PatientHomeMobile data={data} loading={loading} error={error} />
}
