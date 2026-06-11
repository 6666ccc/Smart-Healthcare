import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../store'
import { listSchedules, createSchedule } from '../../../api/modules/schedule'
import { listDepts } from '../../../api/modules/department'
import { listStaff } from '../../../api/modules/staff'
import { getPortalType } from '../../Home/role'
import { PERIOD_MAP } from '../../../utils'
import MobileTabbar from '../../Home/MobileTabbar'
import { IconPlus } from '../../Assistant/icons'
import './index.css'

const emptyForm = { deptId: '', staffId: '', workDate: '', period: 'all', maxPatients: 30 }

export default function ScheduleManageMobile() {
  const { user } = useAuth()
  const portal = getPortalType(user)

  const [schedules, setSchedules] = useState([])
  const [depts, setDepts] = useState([])
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterDept, setFilterDept] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterDept) params.deptId = filterDept
      const [schData, deptData, staffData] = await Promise.allSettled([
        listSchedules(params), listDepts(), listStaff(),
      ])
      if (schData.status === 'fulfilled') setSchedules(Array.isArray(schData.value) ? schData.value : [])
      if (deptData.status === 'fulfilled') setDepts(Array.isArray(deptData.value) ? deptData.value : [])
      if (staffData.status === 'fulfilled') setStaffList(Array.isArray(staffData.value) ? staffData.value : [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [filterDept])

  useEffect(() => { loadData() }, [loadData])

  const filteredStaff = useMemo(() => {
    if (!form.deptId) return staffList
    return staffList.filter((s) => String(s.deptId) === String(form.deptId))
  }, [staffList, form.deptId])

  const handleCreate = async () => {
    setError('')
    if (!form.deptId || !form.staffId || !form.workDate) { setError('请填写科室、医生和工作日期'); return }
    setSubmitting(true)
    try {
      await createSchedule({
        deptId: Number(form.deptId), staffId: Number(form.staffId),
        workDate: form.workDate, period: form.period,
        maxPatients: Number(form.maxPatients) || 30,
      })
      setShowCreate(false); setForm(emptyForm); loadData()
    } catch (err) { setError(err.message || '创建排班失败') }
    finally { setSubmitting(false) }
  }

  const getDeptName = (deptId) => depts.find((x) => String(x.id) === String(deptId))?.name || depts.find((x) => String(x.id) === String(deptId))?.deptName || `科室 #${deptId}`
  const getStaffName = (staffId) => staffList.find((x) => String(x.id) === String(staffId))?.name || staffList.find((x) => String(x.id) === String(staffId))?.realName || `医生 #${staffId}`

  return (
    <div className="sch-page">
      <header className="sch-header">
        <h1>排班管理</h1>
        <button type="button" className="sch-header-add" onClick={() => { setForm(emptyForm); setError(''); setShowCreate(true) }}><IconPlus /></button>
      </header>

      <div className="sch-filter-bar">
        <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
          <option value="">全部科室</option>
          {depts.map((d) => <option key={d.id} value={d.id}>{d.name || d.deptName || `科室 #${d.id}`}</option>)}
        </select>
      </div>

      <main className="sch-main">
        {loading && <p className="sch-empty">加载中…</p>}
        {!loading && schedules.length === 0 && <p className="sch-empty">暂无排班记录</p>}
        {schedules.map((s) => (
          <div key={s.id} className="sch-card">
            <div className="sch-card-body">
              <strong>{getStaffName(s.staffId)}</strong>
              <span>{getDeptName(s.deptId)} · {s.workDate || '—'} · {PERIOD_MAP[s.period] || '全天'}</span>
            </div>
          </div>
        ))}
      </main>

      {showCreate && (
        <div className="sch-overlay" onClick={() => { setShowCreate(false); setError('') }}>
          <div className="sch-sheet" onClick={(e) => e.stopPropagation()}>
            <h2>新增排班</h2>
            {error && <p className="shared-error">{error}</p>}
            <label className="sch-field">
              <span>科室 *</span>
              <select value={form.deptId} onChange={(e) => setForm((f) => ({ ...f, deptId: e.target.value, staffId: '' }))}>
                <option value="">选择科室</option>
                {depts.map((d) => <option key={d.id} value={d.id}>{d.name || d.deptName}</option>)}
              </select>
            </label>
            <label className="sch-field">
              <span>医生 *</span>
              <select value={form.staffId} onChange={(e) => setForm((f) => ({ ...f, staffId: e.target.value }))}>
                <option value="">选择医生</option>
                {filteredStaff.map((s) => <option key={s.id} value={s.id}>{s.name || s.realName}</option>)}
              </select>
            </label>
            <div className="sch-row">
              <label className="sch-field">
                <span>日期 *</span>
                <input type="date" value={form.workDate} onChange={(e) => setForm((f) => ({ ...f, workDate: e.target.value }))} />
              </label>
              <label className="sch-field">
                <span>时段</span>
                <select value={form.period} onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}>
                  <option value="all">全天</option>
                  <option value="am">上午</option>
                  <option value="pm">下午</option>
                </select>
              </label>
            </div>
            <button type="button" className="shared-btn-submit" style={{ width: '100%', marginTop: '.5rem' }} disabled={submitting} onClick={handleCreate}>
              {submitting ? '提交中…' : '确认新增'}
            </button>
          </div>
        </div>
      )}

      <MobileTabbar portal={portal} />
    </div>
  )
}
