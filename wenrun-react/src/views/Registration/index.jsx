import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../store'
import { useIsPc } from '../../hooks'
import { Loading, Empty, StatusBadge, ConfirmDialog, DatePicker } from '../../components'
import {
  listRegistrations, createRegistration, cancelRegistration,
  listSchedules, listDepts, listPatients,
} from '../../api'
import {
  REG_STATUS_MAP, formatDateTime, formatMoney, formatTimePeriod,
  formatVisitSchedule, todayISO, isPatientPortal,
} from '../../utils'
import PcLayout from '../Home/pc/PcLayout'
import MobileTabbar from '../Home/mobile/MobileTabbar'
import { PageHeader, IconCalendar } from '../shared'
import '../shared/views.css'
import './registration.css'

const PATIENT_TABS = [
  { key: 'book', label: '预约挂号' },
  { key: 'all', label: '全部挂号记录' },
  { key: 'pending', label: '待就诊' },
]

const STAFF_TABS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待就诊' },
]

function RegistrationTabs({ tab, onChange, patientMode }) {
  const tabs = patientMode ? PATIENT_TABS : STAFF_TABS
  return (
    <div className="view-reg-tabs" style={patientMode ? { flexWrap: 'wrap' } : undefined}>
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          className={`view-reg-tab${tab === t.key ? ' view-reg-tab--active' : ''}`}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

function ScheduleOption({ schedule, selected, onSelect }) {
  const isSelected = selected?.id === schedule.id
  return (
    <div
      className={`view-schedule-option view-reg-schedule-card${isSelected ? ' view-schedule-option--selected' : ''}`}
      onClick={() => onSelect(isSelected ? null : schedule)}
    >
      <div className="view-reg-schedule-card__main">
        <div className="view-reg-schedule-card__dept">{schedule.deptName}</div>
        <div className="view-reg-schedule-card__doctor">{schedule.staffName}</div>
      </div>
      <div className="view-reg-schedule-card__meta">
        <span className="view-reg-schedule-card__period">{formatTimePeriod(schedule.timePeriod)}</span>
        <span className="text-sub text-sm">余号 {schedule.remainingCount}</span>
        <span className="view-reg-schedule-card__fee">{formatMoney(schedule.registerFee)}</span>
      </div>
    </div>
  )
}

/** 挂号表单：患者端内嵌展示，窗口端放入弹窗 */
function RegistrationBookForm({ user, onSuccess, onCancel, showCancel = false }) {
  const patientMode = isPatientPortal(user)
  const [workDate, setWorkDate] = useState(todayISO())
  const [deptId, setDeptId] = useState('')
  const [depts, setDepts] = useState([])
  const [schedules, setSchedules] = useState([])
  const [selectedSchedule, setSelectedSchedule] = useState(null)
  const [patientKeyword, setPatientKeyword] = useState('')
  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [loadingDepts, setLoadingDepts] = useState(false)
  const [loadingSchedules, setLoadingSchedules] = useState(false)
  const [searchingPatient, setSearchingPatient] = useState(false)
  const [booking, setBooking] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (patientMode && user?.patientId) {
      setSelectedPatient({
        id: user.patientId,
        name: user.realName || user.username,
      })
    }
    ;(async () => {
      setLoadingDepts(true)
      try {
        const list = await listDepts({ status: 1 })
        setDepts(Array.isArray(list) ? list : [])
      } catch {
        setDepts([])
      } finally {
        setLoadingDepts(false)
      }
    })()
  }, [patientMode, user?.patientId, user?.realName, user?.username])

  useEffect(() => {
    ;(async () => {
      setLoadingSchedules(true)
      setSelectedSchedule(null)
      try {
        const params = { workDate }
        if (deptId) params.deptId = Number(deptId)
        const list = await listSchedules(params)
        setSchedules(Array.isArray(list) ? list.filter((s) => s.remainingCount > 0) : [])
      } catch {
        setSchedules([])
      } finally {
        setLoadingSchedules(false)
      }
    })()
  }, [workDate, deptId])

  const searchPatients = async () => {
    const kw = patientKeyword.trim()
    if (!kw) {
      setPatients([])
      setSelectedPatient(null)
      return
    }
    setSearchingPatient(true)
    try {
      const list = await listPatients({ name: kw })
      setPatients(Array.isArray(list) ? list : [])
    } catch {
      setPatients([])
    } finally {
      setSearchingPatient(false)
    }
  }

  const handleBook = async () => {
    const patientId = selectedPatient?.id
    if (!patientId) {
      setMsg('请选择患者')
      return
    }
    if (!selectedSchedule) {
      setMsg('请选择排班')
      return
    }
    setBooking(true)
    setMsg('')
    try {
      await createRegistration({ patientId, scheduleId: selectedSchedule.id })
      onSuccess()
    } catch (e) {
      setMsg(e.message || '挂号失败')
    } finally {
      setBooking(false)
    }
  }

  return (
    <div className="view-reg-book-form">
      {!patientMode && (
        <p className="text-sub text-sm" style={{ margin: 0 }}>
          查询患者 → 选择排班 → 确认挂号费
        </p>
      )}

      {patientMode && (
        <div className="view-reg-book-form__patient">
          <span className="view-reg-book-form__patient-label">就诊人</span>
          <span className="view-reg-book-form__patient-name">{selectedPatient?.name || '—'}</span>
          <span className="text-sub text-sm">（本人）</span>
        </div>
      )}

      <div className="view-reg-book-form__filters">
        <div className="view-reg-book-form__field">
          <label className="view-form-label">就诊日期</label>
          <DatePicker
            value={workDate}
            min={todayISO()}
            onChange={setWorkDate}
            allowClear={false}
          />
        </div>

        <div className="view-reg-book-form__field">
          <label className="view-form-label">科室</label>
          <select
            className="view-form-input"
            value={deptId}
            onChange={(e) => setDeptId(e.target.value)}
            disabled={loadingDepts}
          >
            <option value="">全部科室</option>
            {depts.map((d) => (
              <option key={d.id} value={d.id}>{d.deptName}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="view-reg-book-form__section">
        <div className="view-reg-book-form__section-title">选择医生排班</div>
        {loadingSchedules ? <Loading /> : schedules.length === 0 ? (
          <Empty text="该日期暂无可用号源" />
        ) : (
          <div className="view-schedule-list" key={`${workDate}-${deptId}`}>
            {schedules.map((s) => (
              <ScheduleOption key={s.id} schedule={s} selected={selectedSchedule} onSelect={setSelectedSchedule} />
            ))}
          </div>
        )}
      </div>

      {!patientMode && (
        <div className="view-reg-book-form__section">
          <div className="view-reg-book-form__section-title">选择患者</div>
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                type="text"
                className="view-form-input"
                placeholder="输入姓名查询患者"
                value={patientKeyword}
                onChange={(e) => setPatientKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchPatients()}
              />
              <button type="button" className="btn btn--outline" onClick={searchPatients} disabled={searchingPatient}>
                {searchingPatient ? '查询中…' : '查询'}
              </button>
            </div>
            {patients.length > 0 && (
              <div className="view-schedule-list">
                {patients.map((p) => (
                  <div
                    key={p.id}
                    className={`view-schedule-option${selectedPatient?.id === p.id ? ' view-schedule-option--selected' : ''}`}
                    onClick={() => setSelectedPatient(selectedPatient?.id === p.id ? null : p)}
                  >
                    <div style={{ fontWeight: 500 }}>{p.name}</div>
                    <div className="text-sub text-sm">
                      {p.patientNo && `编号 ${p.patientNo}`}
                      {p.phone && ` · ${p.phone}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedSchedule && selectedPatient && (
        <div className="card card--accent-top view-reg-book-form__confirm view-reg-confirm">
          <div className="view-reg-book-form__section-title" style={{ marginBottom: 10 }}>挂号确认</div>
          <div className="view-reg-book-form__confirm-grid">
            <div><span className="text-sub">患者</span> · {selectedPatient.name}</div>
            <div><span className="text-sub">科室</span> · {selectedSchedule.deptName}</div>
            <div><span className="text-sub">医生</span> · {selectedSchedule.staffName}</div>
            <div>
              <span className="text-sub">就诊</span> · {formatVisitSchedule(selectedSchedule.workDate || workDate, selectedSchedule.timePeriod)}
            </div>
            <div className="view-reg-book-form__confirm-fee">
              挂号费 {formatMoney(selectedSchedule.registerFee)}
            </div>
          </div>
        </div>
      )}

      {msg && (
        <div className={`text-sm view-reg-msg${msg.includes('成功') ? '' : ' view-reg-msg--error'}`} style={{ color: msg.includes('成功') ? 'var(--c-success)' : 'var(--c-danger)' }}>
          {msg}
        </div>
      )}

      <div className={`view-reg-book-form__actions${showCancel ? ' shared-dialog__actions' : ''}`}>
        {showCancel && (
          <button type="button" className="btn btn--ghost" onClick={onCancel}>取消</button>
        )}
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleBook}
          disabled={booking || !selectedSchedule || !selectedPatient}
          style={showCancel ? undefined : { width: '100%' }}
        >
          {booking ? '挂号中…' : '确认挂号'}
        </button>
      </div>
    </div>
  )
}

/** 窗口端挂号弹窗 */
function RegistrationBookDialog({ show, onClose, onSuccess, user }) {
  const patientMode = isPatientPortal(user)

  if (!show) return null

  return (
    <div className="shared-dialog-overlay view-reg-overlay" onClick={onClose}>
      <div
        className="shared-dialog view-reg-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 520 }}
      >
        <h3>{patientMode ? '预约挂号' : '窗口挂号'}</h3>
        <RegistrationBookForm
          user={user}
          onSuccess={() => { onSuccess(); onClose() }}
          onCancel={onClose}
          showCancel
        />
      </div>
    </div>
  )
}

function RegistrationRecords({ registrations, onCancel, setCancelState, isPc }) {
  if (registrations.length === 0) {
    return <Empty text="暂无挂号记录" Icon={IconCalendar} />
  }

  if (isPc) {
    return (
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
                <td>{r.registrantUserName || '—'}</td>
                <td><StatusBadge status={r.status} map={REG_STATUS_MAP} /></td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Link to={`/registration/${r.id}`} className="btn btn--outline btn--sm">详情</Link>
                    {r.status === 1 && (
                      <button
                        type="button"
                        className="btn btn--danger btn--sm"
                        onClick={() => setCancelState({ show: true, id: r.id, regNo: r.regNo })}
                      >
                        退号
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} key={registrations.length}>
      {registrations.map((r) => (
        <div key={r.id} className="card view-reg-card">
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
            <Link to={`/registration/${r.id}`} className="btn btn--outline btn--sm">查看详情</Link>
            {r.status === 1 && (
              <button
                type="button"
                className="btn btn--danger btn--sm"
                onClick={() => setCancelState({ show: true, id: r.id, regNo: r.regNo })}
              >
                退号
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function RegistrationView({ isPc, data, loading, error, tab, setTab, msg, user, showBook, setShowBook, onRefresh, onCancel, cancelState, setCancelState, bookFormKey }) {
  const patientMode = isPatientPortal(user)

  const registrations = useMemo(() => {
    const list = data || []
    return tab === 'pending' ? list.filter((r) => r.status === 1) : list
  }, [data, tab])

  const showRecords = !patientMode || tab === 'all' || tab === 'pending'

  const content = (
    <>
      <PageHeader
        title={patientMode ? '预约挂号' : '挂号管理'}
        subtitle={patientMode ? '预约挂号、查看记录与待就诊' : '窗口查询患者、选择排班并办理挂号'}
        action={!patientMode ? (
          <button type="button" className="btn btn--accent" onClick={() => setShowBook(true)}>
            窗口挂号
          </button>
        ) : undefined}
      />

      <RegistrationTabs tab={tab} onChange={setTab} patientMode={patientMode} />

      {msg && (
        <div className="card mb-md" style={{
          color: msg.includes('成功') ? 'var(--c-success)' : 'var(--c-danger)',
          textAlign: 'center',
          animation: 'fadeUp 300ms var(--ease-enter)',
        }}>
          {msg}
        </div>
      )}

      {patientMode && tab === 'book' && (
        <div className="card view-reg-records-enter view-reg-book-panel">
          <RegistrationBookForm
            key={bookFormKey}
            user={user}
            onSuccess={() => onRefresh('挂号成功')}
          />
        </div>
      )}

      {showRecords && (
        <>
          {error && (
            <div className="card mb-md" style={{ color: 'var(--c-danger)', textAlign: isPc ? 'left' : 'center' }}>
              {error}
            </div>
          )}

          {loading ? <Loading /> : (
            <div className="view-reg-records-enter" key={tab}>
              <RegistrationRecords
                registrations={registrations}
                onCancel={onCancel}
                setCancelState={setCancelState}
                isPc={isPc}
              />
            </div>
          )}
        </>
      )}

      {!patientMode && (
        <RegistrationBookDialog
          show={showBook}
          onClose={() => setShowBook(false)}
          onSuccess={() => onRefresh('挂号成功')}
          user={user}
        />
      )}

      <ConfirmDialog
        show={cancelState.show}
        title="退号确认"
        message={`确认退号 ${cancelState.regNo}？号源将归还排班。`}
        loading={cancelState.loading}
        onConfirm={() => onCancel(cancelState.id)}
        onCancel={() => setCancelState({ show: false })}
      />
    </>
  )

  if (isPc) return <PcLayout>{content}</PcLayout>
  return (
    <div className="page">
      {content}
      <MobileTabbar />
    </div>
  )
}

export default function Registration() {
  const isPc = useIsPc()
  const { user } = useAuth()
  const patientMode = isPatientPortal(user)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(!patientMode)
  const [error, setError] = useState('')
  const [tab, setTab] = useState(patientMode ? 'book' : 'all')
  const [showBook, setShowBook] = useState(false)
  const [msg, setMsg] = useState('')
  const [cancelState, setCancelState] = useState({ show: false, id: null, regNo: '', loading: false })
  const [bookFormKey, setBookFormKey] = useState(0)

  const needsRecords = !patientMode || tab === 'all' || tab === 'pending'

  const load = useCallback(async () => {
    if (!user?.userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const list = await listRegistrations({ userId: user.userId })
      setData(Array.isArray(list) ? list : [])
    } catch (e) {
      setError(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [user?.userId])

  useEffect(() => {
    if (needsRecords) load()
  }, [load, needsRecords])

  const handleRefresh = (successMsg) => {
    if (successMsg) {
      setMsg(successMsg)
      setBookFormKey((k) => k + 1)
    }
    if (needsRecords || successMsg) load()
  }

  const handleCancel = async (id) => {
    setCancelState((s) => ({ ...s, loading: true }))
    try {
      await cancelRegistration(id)
      setCancelState({ show: false })
      setMsg('退号成功')
      load()
    } catch (e) {
      setError(e.message || '退号失败')
      setCancelState((s) => ({ ...s, loading: false }))
    }
  }

  return (
    <RegistrationView
      isPc={isPc}
      data={data}
      loading={loading}
      error={error}
      tab={tab}
      setTab={setTab}
      msg={msg}
      user={user}
      showBook={showBook}
      setShowBook={setShowBook}
      onRefresh={handleRefresh}
      onCancel={handleCancel}
      cancelState={cancelState}
      setCancelState={setCancelState}
      bookFormKey={bookFormKey}
    />
  )
}
