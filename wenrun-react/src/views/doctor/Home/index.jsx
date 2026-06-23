import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../store'
import { useIsPc } from '../../../hooks'
import { formatTime, formatDate, formatVisitSchedule } from '../../../utils'
import { listPendingRegistrations, listVisits } from '../../../api'
import { Loading } from '../../../components'
import DoctorPcLayout from '../layout/DoctorPcLayout'
import DoctorMobileTabbar from '../layout/DoctorMobileTabbar'
import '../../shared/views.css'

function StatCard({ label, value, color, index }) {
  return (
    <div className="card view-stat-card" style={{ color, animationDelay: `${index * 80}ms` }}>
      <div style={{ fontSize: '0.78rem', color: 'var(--c-sub)' }}>{label}</div>
      <div className="view-stat-card__value" style={{ color: 'var(--c-text)' }}>{value ?? '—'}</div>
    </div>
  )
}

function DoctorHomeContent({ data, loading, error, user }) {
  const navigate = useNavigate()
  const greeting = formatTime()
  const today = formatDate(new Date())
  const name = user?.realName || user?.username || '医生'

  return (
    <div className="page">
      <div className="view-hero" style={{ marginBottom: 20 }}>
        <h2 className="view-hero__greeting">{greeting}，{name} 医生</h2>
        <p className="view-hero__date">{today}</p>
      </div>

      {error && <div className="card" style={{ color: 'var(--c-danger)', textAlign: 'center' }}>{error}</div>}
      {loading ? <Loading /> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
            <StatCard label="待诊患者" value={data?.pending?.length ?? 0} color="#3d5a5c" index={0} />
            <StatCard label="接诊中" value={data?.inProgress?.length ?? 0} color="#7a9e85" index={1} />
            <StatCard label="今日已完成" value={data?.completedToday ?? 0} color="#c8944a" index={2} />
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="flex-between mb-md">
              <h3 style={{ margin: 0 }}>待诊队列</h3>
              <Link to="/doctor/queue" className="text-sm" style={{ color: 'var(--c-brand)' }}>查看全部 →</Link>
            </div>
            {data?.pending?.length > 0 ? (
              <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.pending.slice(0, 5).map((reg) => (
                  <div key={reg.id} className="flex-between" style={{
                    padding: '12px 14px', background: 'var(--c-bg)', borderRadius: 'var(--radius)',
                    border: '1px solid var(--c-border-light)',
                  }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{reg.patientName || '患者'}</div>
                      <div className="text-sub text-sm">
                        {formatVisitSchedule(reg.workDate, reg.timePeriod)} · {reg.deptName}
                      </div>
                    </div>
                    <button className="btn btn--primary btn--sm" onClick={() => navigate('/doctor/queue')}>
                      接诊
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-sm" style={{ textAlign: 'center', padding: 20 }}>暂无待诊患者</p>
            )}
          </div>

          {data?.inProgress?.length > 0 && (
            <div className="card">
              <h3 style={{ margin: '0 0 12px 0' }}>进行中的接诊</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.inProgress.map((v) => (
                  <div key={v.id} className="flex-between" style={{
                    padding: '12px 14px', background: 'var(--c-bg)', borderRadius: 'var(--radius)',
                  }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{v.patientName}</div>
                      <div className="text-sub text-sm">{v.visitNo}</div>
                    </div>
                    <button
                      className="btn btn--outline btn--sm"
                      onClick={() => navigate(`/doctor/consultation/${v.id}`)}
                    >
                      继续接诊
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function DoctorHome() {
  const isPc = useIsPc()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    if (!user?.staffId) {
      setError('当前账号未绑定医护人员档案，请联系管理员')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const [pending, visits] = await Promise.all([
        listPendingRegistrations({ staffId: user.staffId }).catch(() => []),
        listVisits({ staffId: user.staffId }).catch(() => []),
      ])
      const pendingList = Array.isArray(pending) ? pending : []
      const visitList = Array.isArray(visits) ? visits : []
      const inProgress = visitList.filter((v) => v.status === 1)
      const todayStr = new Date().toISOString().split('T')[0]
      const completedToday = visitList.filter((v) => {
        if (v.status !== 2 || !v.visitTime) return false
        return String(v.visitTime).startsWith(todayStr)
      }).length

      setData({ pending: pendingList, inProgress, completedToday })
    } catch (e) {
      setError(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [user?.staffId])

  useEffect(() => { loadData() }, [loadData])

  const content = <DoctorHomeContent data={data} loading={loading} error={error} user={user} />

  if (isPc) return <DoctorPcLayout>{content}</DoctorPcLayout>
  return (
    <>
      {content}
      <DoctorMobileTabbar />
    </>
  )
}
