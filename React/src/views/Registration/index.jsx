/* eslint-disable react-hooks/preserve-manual-memoization, react-hooks/set-state-in-effect -- legacy patient loader is kept behavior-compatible during the UI migration */
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../store'
import { useIsPc } from '../../hooks'
import { Loading, Empty, StatusBadge, ConfirmDialog } from '../../components'
import { listRegistrations, createRegistration, cancelRegistration, listSchedules } from '../../api'
import { REG_STATUS_MAP, formatDateTime, formatMoney, formatTimePeriod, formatVisitSchedule } from '../../utils'
import PcLayout from '../Home/pc/PcLayout'
import MobileTabbar from '../Home/mobile/MobileTabbar'
import { PageHeader } from '../shared'
import '../shared/views.css'

function ScheduleOption({ schedule, selected, onSelect }) {
  const isSelected = selected?.id === schedule.id
  return (
    <div
      className={`view-schedule-option${isSelected ? ' view-schedule-option--selected' : ''}`}
      onClick={() => onSelect(isSelected ? null : schedule)}
    >
      <div style={{ fontWeight: 500 }}>{schedule.deptName} · {schedule.staffName}</div>
      <div className="text-sub text-sm">
        {formatTimePeriod(schedule.timePeriod)} · 余号 {schedule.remainingCount} · 挂号费 ¥{schedule.registerFee}
      </div>
    </div>
  )
}

/* ==================== 移动端 ==================== */
function RegistrationMobile({ data, loading, error, onRefresh, onCancel, cancelState, setCancelState }) {
  const { user } = useAuth()
  const [showBook, setShowBook] = useState(false)
  const [schedules, setSchedules] = useState([])
  const [schedulesLoading, setSchedulesLoading] = useState(false)
  const [booking, setBooking] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState(null)
  const [msg, setMsg] = useState('')

  const loadSchedules = async () => {
    setSchedulesLoading(true)
    try {
      const list = await listSchedules({ workDate: new Date().toISOString().split('T')[0] })
      setSchedules(Array.isArray(list) ? list.filter(s => s.remainingCount > 0) : [])
    } catch { setSchedules([]) }
    finally { setSchedulesLoading(false) }
  }

  const openBook = () => { setShowBook(true); loadSchedules() }

  const handleBook = async () => {
    if (!selectedSchedule || !user?.patientId) {
      setMsg('请选择排班')
      return
    }
    setBooking(true)
    setMsg('')
    try {
      await createRegistration({ patientId: user.patientId, scheduleId: selectedSchedule.id })
      setShowBook(false)
      setSelectedSchedule(null)
      setMsg('挂号成功')
      onRefresh()
    } catch (e) {
      setMsg(e.message || '挂号失败')
    } finally {
      setBooking(false)
    }
  }

  const registrations = data || []

  return (
    <div className="page">
      <PageHeader
        title="预约挂号"
        subtitle="查看记录，预约新的门诊"
        action={<button className="btn btn--accent" onClick={openBook}>预约挂号</button>}
      />

      {msg && (
        <div className="card mb-md" style={{
          color: msg.includes('成功') ? 'var(--c-success)' : 'var(--c-danger)',
          textAlign: 'center', animation: 'fadeUp 300ms var(--ease-enter)',
        }}>
          {msg}
        </div>
      )}

      {error && <div className="card mb-md" style={{ color: 'var(--c-danger)', textAlign: 'center' }}>{error}</div>}
      {loading ? <Loading /> : registrations.length === 0 ? <Empty text="暂无挂号记录" icon="📅" /> : (
        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {registrations.map((r) => (
            <div key={r.id} className="card">
              <div className="flex-between mb-sm">
                <div style={{ fontWeight: 600, fontSize: '1rem' }}>{r.deptName}</div>
                <StatusBadge status={r.status} map={REG_STATUS_MAP} />
              </div>
              <div className="text-sub text-sm">患者：{r.patientName}</div>
              <div className="text-sub text-sm">医生：{r.staffName}</div>
              <div className="text-sub text-sm">就诊时间：{formatVisitSchedule(r.workDate, r.timePeriod)}</div>
              <div className="text-sub text-sm">挂号时间：{formatDateTime(r.regTime)}</div>
              <div className="text-sub text-sm">挂号费：{formatMoney(r.regFee)}</div>
              {r.registrantUserName && (
                <div className="text-sub text-sm">挂号人：{r.registrantUserName}</div>
              )}
              <div className="flex" style={{ gap: 8, marginTop: 12 }}>
                <Link to={`/registration/${r.id}`} className="btn btn--outline btn--sm">
                  查看详情
                </Link>
                {r.status === 1 && (
                  <button className="btn btn--danger btn--sm"
                    onClick={() => setCancelState({ show: true, id: r.id, regNo: r.regNo })}>
                    取消挂号
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 挂号弹窗 */}
      {showBook && (
        <div className="shared-dialog-overlay" onClick={() => setShowBook(false)}>
          <div className="shared-dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <h3>预约挂号</h3>
            <p className="text-sub text-sm">选择今日排班进行挂号</p>
            {schedulesLoading ? <Loading /> : schedules.length === 0 ? <Empty text="今日暂无排班" /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                {schedules.map((s) => (
                  <ScheduleOption key={s.id} schedule={s} selected={selectedSchedule} onSelect={setSelectedSchedule} />
                ))}
              </div>
            )}
            <div className="shared-dialog__actions mt-md">
              <button className="btn btn--ghost" onClick={() => setShowBook(false)}>取消</button>
              <button className="btn btn--primary" onClick={handleBook} disabled={booking || !selectedSchedule}>
                {booking ? '挂号中…' : '确认挂号'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        show={cancelState.show}
        title="取消挂号"
        message={`确认取消挂号单 ${cancelState.regNo}？`}
        loading={cancelState.loading}
        onConfirm={() => onCancel(cancelState.id)}
        onCancel={() => setCancelState({ show: false })}
      />

      <MobileTabbar />
    </div>
  )
}

/* ==================== PC 端 ==================== */
function RegistrationPc({ data, loading, error, onRefresh, onCancel, cancelState, setCancelState }) {
  const { user } = useAuth()
  const [showBook, setShowBook] = useState(false)
  const [schedules, setSchedules] = useState([])
  const [schedulesLoading, setSchedulesLoading] = useState(false)
  const [booking, setBooking] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState(null)
  const [msg, setMsg] = useState('')

  const loadSchedules = async () => {
    setSchedulesLoading(true)
    try {
      const list = await listSchedules({ workDate: new Date().toISOString().split('T')[0] })
      setSchedules(Array.isArray(list) ? list.filter(s => s.remainingCount > 0) : [])
    } catch { setSchedules([]) }
    finally { setSchedulesLoading(false) }
  }

  const openBook = () => { setShowBook(true); loadSchedules() }

  const handleBook = async () => {
    if (!selectedSchedule || !user?.patientId) { setMsg('请选择排班'); return }
    setBooking(true); setMsg('')
    try {
      await createRegistration({ patientId: user.patientId, scheduleId: selectedSchedule.id })
      setShowBook(false); setSelectedSchedule(null); setMsg('挂号成功'); onRefresh()
    } catch (e) { setMsg(e.message || '挂号失败') }
    finally { setBooking(false) }
  }

  const registrations = data || []

  return (
    <PcLayout>
      <PageHeader
        title="预约挂号"
        subtitle="查看挂号记录，预约新的门诊"
        action={<button className="btn btn--accent" onClick={openBook}>预约挂号</button>}
      />

      {msg && (
        <div className="card mb-md" style={{
          color: msg.includes('成功') ? 'var(--c-success)' : 'var(--c-danger)',
          textAlign: 'center', animation: 'fadeUp 300ms var(--ease-enter)',
        }}>{msg}</div>
      )}

      {error && <div className="card mb-md" style={{ color: 'var(--c-danger)' }}>{error}</div>}
      {loading ? <Loading /> : registrations.length === 0 ? <Empty text="暂无挂号记录" icon="📅" /> : (
        <div className="stagger view-table-wrap">
          <table className="view-table">
            <thead>
              <tr>
                <th>挂号编号</th><th>患者</th><th>科室</th><th>医生</th>
                <th>就诊时间</th><th>挂号时间</th><th>挂号费</th><th>挂号人</th><th>状态</th><th>操作</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((r) => (
                <tr key={r.id}>
                  <td>{r.regNo}</td>
                  <td>{r.patientName}</td>
                  <td>{r.deptName}</td>
                  <td>{r.staffName}</td>
                  <td style={{ color: 'var(--c-sub)', fontSize: '0.85rem' }}>{formatVisitSchedule(r.workDate, r.timePeriod)}</td>
                  <td style={{ color: 'var(--c-sub)', fontSize: '0.85rem' }}>{formatDateTime(r.regTime)}</td>
                  <td>{formatMoney(r.regFee)}</td>
                  <td>{r.registrantUserName || '-'}</td>
                  <td><StatusBadge status={r.status} map={REG_STATUS_MAP} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Link to={`/registration/${r.id}`} className="btn btn--outline btn--sm">详情</Link>
                      {r.status === 1 && (
                        <button className="btn btn--danger btn--sm"
                          onClick={() => setCancelState({ show: true, id: r.id, regNo: r.regNo })}>
                          取消
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showBook && (
        <div className="shared-dialog-overlay" onClick={() => setShowBook(false)}>
          <div className="shared-dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, maxHeight: '80vh', overflow: 'auto' }}>
            <h3>预约挂号</h3>
            <p className="text-sub text-sm">选择今日排班进行挂号</p>
            {schedulesLoading ? <Loading /> : schedules.length === 0 ? <Empty text="今日暂无排班" /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {schedules.map((s) => (
                  <ScheduleOption key={s.id} schedule={s} selected={selectedSchedule} onSelect={setSelectedSchedule} />
                ))}
              </div>
            )}
            <div className="shared-dialog__actions mt-md">
              <button className="btn btn--ghost" onClick={() => setShowBook(false)}>取消</button>
              <button className="btn btn--primary" onClick={handleBook} disabled={booking || !selectedSchedule}>
                {booking ? '挂号中…' : '确认挂号'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        show={cancelState.show}
        title="取消挂号"
        message={`确认取消挂号单 ${cancelState.regNo}？`}
        loading={cancelState.loading}
        onConfirm={() => onCancel(cancelState.id)}
        onCancel={() => setCancelState({ show: false })}
      />
    </PcLayout>
  )
}

/* ==================== 入口 ==================== */
export default function Registration() {
  const isPc = useIsPc()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelState, setCancelState] = useState({ show: false, id: null, regNo: '', loading: false })

  const load = useCallback(async () => {
    if (!user?.userId) { setLoading(false); return }
    setLoading(true); setError('')
    try {
      // 传 userId 触发后端 OR 查询：自己的挂号(p.user_id) + 帮别人挂的(registrant_user_id)
      const list = await listRegistrations({ userId: user.userId })
      setData(Array.isArray(list) ? list : [])
    } catch (e) { setError(e.message || '加载失败') }
    finally { setLoading(false) }
  }, [user?.userId])

  useEffect(() => { load() }, [load])

  const handleCancel = async (id) => {
    setCancelState(s => ({ ...s, loading: true }))
    try {
      await cancelRegistration(id)
      setCancelState({ show: false })
      load()
    } catch (e) {
      setError(e.message || '取消失败')
      setCancelState(s => ({ ...s, loading: false }))
    }
  }

  const props = { data, loading, error, onRefresh: load, onCancel: handleCancel, cancelState, setCancelState }
  return isPc ? <RegistrationPc {...props} /> : <RegistrationMobile {...props} />
}
