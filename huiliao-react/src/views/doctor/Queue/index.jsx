import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../store'
import { useIsPc } from '../../../hooks'
import { formatVisitSchedule, formatDateTime } from '../../../utils'
import { listPendingRegistrations, startVisit } from '../../../api'
import { Loading, StatusBadge } from '../../../components'
import { REG_STATUS_MAP } from '../../../utils'
import DoctorPcLayout from '../layout/DoctorPcLayout'
import DoctorMobileTabbar from '../layout/DoctorMobileTabbar'
import { PageBack } from '../../shared'
import '../../shared/views.css'

export default function DoctorQueue() {
  const isPc = useIsPc()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [startingId, setStartingId] = useState(null)

  const loadList = useCallback(async () => {
    if (!user?.staffId) {
      setError('当前账号未绑定医护人员档案')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await listPendingRegistrations({ staffId: user.staffId })
      setList(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [user?.staffId])

  useEffect(() => { loadList() }, [loadList])

  const handleStart = async (regId) => {
    setStartingId(regId)
    setError('')
    try {
      const visitId = await startVisit(regId)
      navigate(`/doctor/consultation/${visitId}`)
    } catch (e) {
      setError(e.message || '接诊失败')
      setStartingId(null)
    }
  }

  const content = (
    <div className="page">
      <PageBack onClick={() => navigate('/doctor/home')} label="返回工作台" />

      <div className="flex-between mb-md">
        <h2 style={{ margin: 0 }}>待诊队列</h2>
        <button className="btn btn--ghost btn--sm" onClick={loadList}>刷新</button>
      </div>

      {error && <div className="card" style={{ color: 'var(--c-danger)', marginBottom: 12 }}>{error}</div>}
      {loading ? <Loading /> : list.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--c-sub)', padding: 32 }}>
          暂无待诊患者
        </div>
      ) : (
        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((reg) => (
            <div key={reg.id} className="card">
              <div className="flex-between mb-sm">
                <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{reg.patientName || '患者'}</div>
                <StatusBadge status={reg.status} map={REG_STATUS_MAP} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', marginBottom: 14 }}>
                <Info label="挂号编号" value={reg.regNo} />
                <Info label="科室" value={reg.deptName} />
                <Info label="就诊时段" value={formatVisitSchedule(reg.workDate, reg.timePeriod)} />
                <Info label="挂号时间" value={formatDateTime(reg.regTime)} />
              </div>
              <button
                className="btn btn--primary"
                style={{ width: '100%' }}
                disabled={startingId === reg.id}
                onClick={() => handleStart(reg.id)}
              >
                {startingId === reg.id ? '接诊中…' : '开始接诊'}
              </button>
            </div>
          ))}
        </div>
      )}

      {!isPc && <DoctorMobileTabbar />}
    </div>
  )

  if (isPc) return <DoctorPcLayout>{content}</DoctorPcLayout>
  return content
}

function Info({ label, value }) {
  return (
    <div>
      <div className="text-muted text-sm">{label}</div>
      <div style={{ fontWeight: 500 }}>{value || '—'}</div>
    </div>
  )
}
